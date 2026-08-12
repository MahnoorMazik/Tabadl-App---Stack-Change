import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { seedRBAC, removeOldRoles, assignDefaultRoles } from '@/lib/seed-rbac'
import { seedBusinessWorkflow } from '@/lib/business-workflow/seed'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  await seedRBAC()
  await removeOldRoles()

  // ✅ Ensure admin role has collaborator permissions
  const adminRole = await prisma.role.findUnique({
    where: { name: 'Admin', isDeleted: false },
  })

  // ✅ If admin role exists but doesn't have collaborator permissions, update it
  if (adminRole) {
    const permissions = JSON.parse(adminRole.permissions || '[]')
    const collaboratorPermissions = [
      'collaborators.view',
      'collaborators.create',
      'collaborators.update',
      'collaborators.delete',
      'collaborators.manage'
    ]
    
    let updated = false
    for (const perm of collaboratorPermissions) {
      if (!permissions.includes(perm)) {
        permissions.push(perm)
        updated = true
      }
    }
    
    if (updated) {
      await prisma.role.update({
        where: { id: adminRole.id },
        data: { permissions: JSON.stringify(permissions) }
      })
      console.log('✅ Added collaborator permissions to Admin role')
    }
  }

  const adminPasswordHash = bcrypt.hashSync('admin123', 12)
  
  const existingAdmin = await prisma.user.findFirst({
    where: { email: 'admin@tk.sa', isDeleted: false },
  })

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@tk.sa',
        passwordHash: adminPasswordHash,
        role: 'STAFF',
        staffType: 'ADMIN',
        isActive: true,
        customRoleId: adminRole?.id ?? null,
        tokenVersion: 0,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
      },
    })
    console.log('✅ Admin user created')
  } else {
    console.log('✅ Admin user already exists')
  }

  await assignDefaultRoles()
  await seedBusinessWorkflow()

  const systemLeadStatuses = [
    { name: 'New', color: '#2563eb', type: 'OPEN' as const },
    { name: 'Contacted', color: '#8b5cf6', type: 'OPEN' as const },
    { name: 'Qualified', color: '#f97316', type: 'OPEN' as const },
    { name: 'Converted', color: '#16a34a', type: 'WON' as const },
  ]

  for (const status of systemLeadStatuses) {
    await prisma.leadStatus.upsert({
      where: { name: status.name },
      update: { color: status.color, type: status.type },
      create: { name: status.name, color: status.color, type: status.type },
    })
  }

  const defaultClientGroups = [
    { name: 'Normal', description: 'Standard clients', color: '#6b7280' },
    { name: 'Priority', description: 'Priority clients', color: '#f59e0b' },
    { name: 'Urgent', description: 'Urgent clients', color: '#ef4444' },
  ]

  for (const g of defaultClientGroups) {
    const existing = await prisma.clientGroup.findFirst({
      where: { name: g.name, isDeleted: false },
    })
    if (!existing) {
      await prisma.clientGroup.create({
        data: { name: g.name, description: g.description, color: g.color },
      })
    }
  }

  // ✅ Create test client user
  const clientPasswordHash = bcrypt.hashSync('client123', 12)
  const existingClient = await prisma.user.findFirst({
    where: { email: 'client@tk.sa', isDeleted: false },
  })

  if (!existingClient) {
    const clientUser = await prisma.user.create({
      data: {
        name: 'Client User',
        email: 'client@tk.sa',
        passwordHash: clientPasswordHash,
        role: 'CLIENT',
        isActive: true,
        tokenVersion: 0,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
      },
    })

    await prisma.client.create({
      data: {
        clientNumber: `CL-${Date.now()}`,
        name: 'Client User',
        email: 'client@tk.sa',
        userId: clientUser.id,
        profileCompletionStatus: 'INCOMPLETE',
      },
    })
    console.log('✅ Test client user created')
  } else {
    console.log('✅ Test client user already exists')
  }

  console.log('✅ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })