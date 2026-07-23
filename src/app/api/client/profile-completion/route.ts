import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/rbac-middleware'
import { UserRole } from '@prisma/client'
import {
  evaluateProfileCompletion,
  updateClientContactPhone,
  submitProfileDocument,
} from '@/lib/business-workflow/profile-completion'
import { db } from '@/lib/db'
import { saveUploadedFile } from '@/lib/file-upload'
import { DocumentStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (authResult.user.role !== UserRole.CLIENT) {
    return NextResponse.json({ error: 'Clients only' }, { status: 403 })
  }

  const client = await db.client.findUnique({ where: { userId: authResult.user.userId } })
  if (!client) {
    return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
  }

  const completion = await evaluateProfileCompletion(client.id)

  const selectedPackage = client.servicePackageId
    ? await db.servicePackage.findUnique({
        where: { id: client.servicePackageId },
        include: {
          services: { include: { service: true } },
        },
      })
    : null

  return NextResponse.json({
    client: {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      company: client.company,
      profileCompletionStatus: completion.status,
      profileCompletedAt: client.profileCompletedAt,
      servicePackageId: client.servicePackageId,
    },
    profileCompletion: completion,
    selectedPackage,
  })
}

export async function PUT(request: NextRequest) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (authResult.user.role !== UserRole.CLIENT) {
    return NextResponse.json({ error: 'Clients only' }, { status: 403 })
  }

  const client = await db.client.findUnique({ where: { userId: authResult.user.userId } })
  if (!client) {
    return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
  }

  const body = await request.json()
  const { phone, servicePackageId, company } = body

  const updateData: Record<string, unknown> = {}
  if (phone !== undefined) updateData.phone = phone
  if (company !== undefined) updateData.company = company
  if (servicePackageId !== undefined) updateData.servicePackageId = servicePackageId || null

  if (Object.keys(updateData).length > 0) {
    await db.client.update({ where: { id: client.id }, data: updateData })
  }

  const completion = await evaluateProfileCompletion(client.id)

  return NextResponse.json({ profileCompletion: completion })
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (authResult.user.role !== UserRole.CLIENT) {
    return NextResponse.json({ error: 'Clients only' }, { status: 403 })
  }

  const client = await db.client.findUnique({ where: { userId: authResult.user.userId } })
  if (!client) {
    return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const requirementId = formData.get('requirementId') as string

  if (!file || !requirementId) {
    return NextResponse.json({ error: 'File and requirementId are required' }, { status: 400 })
  }

  const requirement = await db.profileDocumentRequirement.findUnique({
    where: { id: requirementId },
  })
  if (!requirement || requirement.inputType !== 'DOCUMENT') {
    return NextResponse.json({ error: 'Invalid document requirement' }, { status: 400 })
  }

  const saved = await saveUploadedFile(file, 'profile-docs')

  const document = await db.document.create({
    data: {
      filename: saved.filename,
      originalName: file.name,
      path: saved.path,
      size: saved.size,
      mimeType: file.type,
      name: requirement.name,
      description: requirement.description,
      uploadedById: authResult.user.userId,
      clientId: client.id,
      profileRequirementId: requirementId,
      status: DocumentStatus.PENDING,
    },
  })

  const completion = await submitProfileDocument(client.id, requirementId, document.id)

  return NextResponse.json({ document, profileCompletion: completion }, { status: 201 })
}
