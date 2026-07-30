import { db } from '@/lib/db'
import { mapFormField } from '@/lib/validations/forms'

export async function getClientForUser(userId: string) {
  return db.client.findFirst({
    where: { userId, isDeleted: false },
    select: { id: true, name: true, email: true },
  })
}

/**
 * Resolve the client record for wizard-application APIs.
 * Prefers an existing Client profile; auto-creates one for CLIENT-role users
 * who somehow lack a profile (so start/list never fail spuriously).
 */
export async function ensureClientAccess(user: {
  userId: string
  role: string
  email: string
  name?: string | null
}): Promise<
  | { client: { id: string; name: string; email: string } }
  | { error: string; status: number }
> {
  const existing = await getClientForUser(user.userId)
  if (existing) {
    return { client: existing }
  }

  const role = String(user.role || '').toUpperCase()
  if (role !== 'CLIENT') {
    return {
      error: `Client access required. You are signed in as ${role || 'unknown'} — please log out and sign in with a client account (/login).`,
      status: 403,
    }
  }

  // CLIENT without profile — create a minimal profile so applications work
  const clientNumber = `CL-${Date.now().toString(36).toUpperCase()}`
  const created = await db.client.create({
    data: {
      clientNumber,
      name: user.name || user.email.split('@')[0] || 'Client',
      email: user.email,
      userId: user.userId,
    },
    select: { id: true, name: true, email: true },
  })

  return { client: created }
}

export function generateWizardApplicationNumber() {
  const stamp = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `WA-${stamp}-${rand}`
}

const applicationInclude = {
  client: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      clientNumber: true,
      user: { select: { id: true, name: true, email: true } },
    },
  },
  wizard: {
    select: {
      id: true,
      name: true,
      areaOfInterest: true,
      isActive: true,
      steps: {
        orderBy: { sortOrder: 'asc' as const },
        include: {
          formTemplate: {
            select: {
              id: true,
              name: true,
              description: true,
              fields: {
                orderBy: { sortOrder: 'asc' as const },
                include: { field: true },
              },
            },
          },
        },
      },
    },
  },
  assignedTo: {
    select: { id: true, name: true, email: true },
  },
  answers: true,
  stepReviews: true,
} as const

export async function getWizardApplicationDetail(id: string) {
  return db.wizardApplication.findFirst({
    where: { id, isDeleted: false },
    include: applicationInclude,
  })
}

export async function mapWizardApplicationDetail(
  app: NonNullable<Awaited<ReturnType<typeof getWizardApplicationDetail>>>
) {
  const reviewByStepId = new Map(
    app.stepReviews.map((r) => [r.wizardStepId, r])
  )

  const steps = app.wizard.steps.map((step, index) => {
    const stepAnswers = app.answers.filter((a) => a.wizardStepId === step.id)
    const review = reviewByStepId.get(step.id)
    const answersByField: Record<string, { value: string | null; fileUrl: string | null }> = {}
    for (const answer of stepAnswers) {
      answersByField[answer.fieldId] = {
        value: answer.value,
        fileUrl: answer.fileUrl,
      }
    }

    return {
      id: step.id,
      sortOrder: step.sortOrder,
      paymentRequired: step.paymentRequired,
      approvalRequired: step.approvalRequired,
      approvalStatus: review?.status ?? null,
      rejectionNote: review?.rejectionNote ?? null,
      index,
      formTemplateId: step.formTemplateId,
      formName: step.formTemplate.name,
      formDescription: step.formTemplate.description,
      sourceWizardName: app.wizard.name,
      fields: step.formTemplate.fields.map((tf) => ({
        id: tf.id,
        fieldId: tf.fieldId,
        sortOrder: tf.sortOrder,
        isRequired: tf.isRequired,
        labelOverride: tf.labelOverride,
        label: tf.labelOverride || tf.field.label,
        type: tf.field.type,
        options: mapFormField(tf.field).options,
        helpText: tf.field.helpText,
        placeholder: tf.field.placeholder,
        answer: answersByField[tf.fieldId] ?? { value: null, fileUrl: null },
      })),
    }
  })

  const answeredStepIds = new Set(
    app.answers.filter((a) => a.value || a.fileUrl).map((a) => a.wizardStepId)
  )

  return {
    id: app.id,
    applicationNumber: app.applicationNumber,
    status: app.status,
    areaOfInterest: app.areaOfInterest,
    currentStepIndex: app.currentStepIndex,
    submittedAt: app.submittedAt,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    adminNotes: app.adminNotes,
    client: app.client,
    assignedTo: app.assignedTo,
    wizard: {
      id: app.wizard.id,
      name: app.wizard.name,
      areaOfInterest: app.wizard.areaOfInterest,
      isActive: app.wizard.isActive,
    },
    steps,
    progress: {
      totalSteps: steps.length,
      completedSteps: steps.filter((s) => answeredStepIds.has(s.id)).length,
      currentStepIndex: app.currentStepIndex,
    },
  }
}

export async function upsertStepAnswers(params: {
  applicationId: string
  wizardStepId: string
  answers: Array<{ fieldId: string; value?: string | null; fileUrl?: string | null }>
  updatedById: string
  currentStepIndex?: number
}) {
  const { applicationId, wizardStepId, answers, updatedById, currentStepIndex } = params

  await db.$transaction(async (tx) => {
    for (const answer of answers) {
      await tx.wizardApplicationAnswer.upsert({
        where: {
          applicationId_wizardStepId_fieldId: {
            applicationId,
            wizardStepId,
            fieldId: answer.fieldId,
          },
        },
        create: {
          applicationId,
          wizardStepId,
          fieldId: answer.fieldId,
          value: answer.value ?? null,
          fileUrl: answer.fileUrl ?? null,
          updatedById,
        },
        update: {
          value: answer.value ?? null,
          fileUrl: answer.fileUrl ?? null,
          updatedById,
        },
      })
    }

    if (typeof currentStepIndex === 'number') {
      await tx.wizardApplication.update({
        where: { id: applicationId },
        data: { currentStepIndex },
      })
    } else {
      await tx.wizardApplication.update({
        where: { id: applicationId },
        data: { updatedAt: new Date() },
      })
    }
  })
}
