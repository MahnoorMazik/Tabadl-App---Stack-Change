import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { seedRBAC, removeOldRoles, assignDefaultRoles } from '@/lib/seed-rbac'
import { seedBusinessWorkflow } from '@/lib/business-workflow/seed'
const prisma = new PrismaClient()
async function main() {
  console.log('🌱 Seeding database...')
  await seedRBAC()
  await removeOldRoles()
  const adminRole = await prisma.role.findUnique({
    where: { name: 'Admin', isDeleted: false },
  })
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
      },
    })
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