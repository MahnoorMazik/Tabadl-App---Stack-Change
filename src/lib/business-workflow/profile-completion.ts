import { db } from '@/lib/db'
import { ProfileCompletionStatus, ProfileDocumentStatus, ProfileRequirementType } from '@prisma/client'

export interface ProfileCompletionResult {
  status: ProfileCompletionStatus
  isComplete: boolean
  completedCount: number
  requiredCount: number
  missingFields: string[]
  requirements: Array<{
    id: string
    code: string
    name: string
    description: string | null
    inputType: ProfileRequirementType
    isRequired: boolean
    status: ProfileDocumentStatus
    documentId: string | null
  }>
}

export async function ensureClientProfileRecords(clientId: string) {
  const requirements = await db.profileDocumentRequirement.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })

  for (const req of requirements) {
    await db.clientProfileDocument.upsert({
      where: { clientId_requirementId: { clientId, requirementId: req.id } },
      update: {},
      create: { clientId, requirementId: req.id, status: ProfileDocumentStatus.MISSING },
    })
  }
}

export async function evaluateProfileCompletion(clientId: string): Promise<ProfileCompletionResult> {
  await ensureClientProfileRecords(clientId)

  const client = await db.client.findUnique({ where: { id: clientId } })
  if (!client) throw new Error('Client not found')

  const submissions = await db.clientProfileDocument.findMany({
    where: { clientId },
    include: { requirement: true },
  })

  const missingFields: string[] = []
  let completedCount = 0
  let requiredCount = 0

  const requirements = submissions.map((sub) => {
    const req = sub.requirement
    if (!req.isRequired) {
      return {
        id: req.id,
        code: req.code,
        name: req.name,
        description: req.description,
        inputType: req.inputType,
        isRequired: req.isRequired,
        status: sub.status,
        documentId: sub.documentId,
      }
    }

    requiredCount++

    let satisfied = false
    if (req.inputType === ProfileRequirementType.CONTACT_FIELD) {
      satisfied = Boolean(client.phone?.trim())
      if (!satisfied) missingFields.push(req.name)
    } else {
      satisfied =
        sub.status === ProfileDocumentStatus.UPLOADED ||
        sub.status === ProfileDocumentStatus.APPROVED
      if (!satisfied) missingFields.push(req.name)
    }

    if (satisfied) completedCount++

    return {
      id: req.id,
      code: req.code,
      name: req.name,
      description: req.description,
      inputType: req.inputType,
      isRequired: req.isRequired,
      status: sub.status,
      documentId: sub.documentId,
    }
  })

  const isComplete = requiredCount > 0 && completedCount >= requiredCount
  const status = isComplete
    ? ProfileCompletionStatus.COMPLETE
    : completedCount > 0
      ? ProfileCompletionStatus.PENDING_REVIEW
      : ProfileCompletionStatus.INCOMPLETE

  if (client.profileCompletionStatus !== status) {
    await db.client.update({
      where: { id: clientId },
      data: {
        profileCompletionStatus: status,
        profileCompletedAt: isComplete ? new Date() : null,
      },
    })
  } else if (isComplete && !client.profileCompletedAt) {
    await db.client.update({
      where: { id: clientId },
      data: { profileCompletedAt: new Date() },
    })
  }

  return {
    status,
    isComplete,
    completedCount,
    requiredCount,
    missingFields,
    requirements,
  }
}

export async function updateClientContactPhone(clientId: string, phone: string) {
  await db.client.update({ where: { id: clientId }, data: { phone } })
  return evaluateProfileCompletion(clientId)
}

export async function submitProfileDocument(
  clientId: string,
  requirementId: string,
  documentId: string
) {
  await db.clientProfileDocument.upsert({
    where: { clientId_requirementId: { clientId, requirementId } },
    update: {
      documentId,
      status: ProfileDocumentStatus.UPLOADED,
      submittedAt: new Date(),
    },
    create: {
      clientId,
      requirementId,
      documentId,
      status: ProfileDocumentStatus.UPLOADED,
      submittedAt: new Date(),
    },
  })

  return evaluateProfileCompletion(clientId)
}
