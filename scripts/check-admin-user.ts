import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function checkAdminUser() {
  console.log('Checking admin user...')
  
  const admin = await prisma.user.findFirst({
    where: { 
      email: 'admin@tk.sa',
      isDeleted: false 
    }
  })

  if (!admin) {
    console.log('❌ Admin user not found! Creating...')
    const passwordHash = await bcrypt.hash('admin123', 12)
    
    await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@tk.sa',
        passwordHash,
        role: 'STAFF',
        staffType: 'ADMIN',
        isActive: true,
      },
    })
    console.log('✅ Admin user created!')
  } else {
    console.log('✅ Admin user found:')
    console.log(`  - Email: ${admin.email}`)
    console.log(`  - Name: ${admin.name}`)
    console.log(`  - Role: ${admin.role}`)
    console.log(`  - Staff Type: ${admin.staffType}`)
    console.log(`  - Is Active: ${admin.isActive}`)
    console.log(`  - Is Deleted: ${admin.isDeleted}`)
    
    // Test password
    const testPassword = 'admin123'
    const isValid = await bcrypt.compare(testPassword, admin.passwordHash)
    console.log(`  - Password 'admin123' matches: ${isValid}`)
    
    if (!isValid) {
      console.log('⚠️  Password hash mismatch! Resetting password...')
      const newHash = await bcrypt.hash('admin123', 12)
      await prisma.user.update({
        where: { id: admin.id },
        data: { passwordHash: newHash }
      })
      console.log('✅ Password reset!')
    }
  }
  
  await prisma.$disconnect()
}

checkAdminUser().catch(console.error)