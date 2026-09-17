// scripts/migrate-env-to-db.ts
import { db } from '../src/lib/db'

async function migrateEnvToDb() {
  console.log('🔄 Starting migration from .env to database...')
  console.log('='.repeat(60))
  
  try {
    // Check if settings already exist
    const existing = await db.emailSettings.findFirst()
    
    if (existing) {
      console.log('✅ Email settings already exist in database.')
      console.log('📊 Current settings:')
      console.log(`   - ID: ${existing.id}`)
      console.log(`   - Host: ${existing.host}`)
      console.log(`   - Port: ${existing.port}`)
      console.log(`   - Username: ${existing.username}`)
      console.log(`   - From Address: ${existing.fromAddress}`)
      console.log(`   - From Name: ${existing.fromName}`)
      console.log(`   - WhatsApp Enabled: ${existing.enableWhatsAppNotifications}`)
      console.log(`   - WhatsApp Phone Number ID: ${existing.whatsappPhoneNumberId || 'Not set'}`)
      console.log('ℹ️  Skipping migration to avoid overwriting.')
      console.log('💡 To re-run migration, delete the existing record in Prisma Studio.')
      return
    }

    console.log('📖 Reading settings from .env file...')
    
    // Read from environment variables
    const settings = {
      mailDriver: 'SMTP',
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      username: process.env.SMTP_USER || 'mahnoormuzaffar2003@gmail.com',
      password: process.env.SMTP_PASSWORD || 'pymw pmrc wicw qobz',
      encryption: process.env.SMTP_PORT === '465' ? 'ssl' : 'tls',
      fromAddress: process.env.SMTP_FROM || 'mahnoormuzaffar2003@gmail.com',
      fromName: process.env.NEXT_PUBLIC_APP_NAME || 'Tabadl Alkon CRM',
      tlsServername: null,
      allowBusinessEmailConfig: true,
      enableNewBusinessEmail: true,
      enableNewSubscriptionEmail: true,
      enableWelcomeEmail: true,
      welcomeEmailSubject: 'Welcome to Tabadl Alkon CRM',
      welcomeEmailBody: '<p>Welcome to Tabadl Alkon CRM</p>',
      contactEmail: null,
      contactPhone: null,
      businessConsultationRecipients: null,
      staffWhatsAppNumbers: null,
      enableWhatsAppNotifications: process.env.WHATSAPP_ENABLED === 'true',
      whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || null,
      whatsappApiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
      whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || null,
      whatsappDocumentUrl: process.env.WHATSAPP_DOCUMENT_URL || null,
    }

    console.log('📝 Settings to be migrated:')
    console.log(`   - SMTP Host: ${settings.host}`)
    console.log(`   - SMTP Port: ${settings.port}`)
    console.log(`   - SMTP Username: ${settings.username}`)
    console.log(`   - From Email: ${settings.fromAddress}`)
    console.log(`   - From Name: ${settings.fromName}`)
    console.log(`   - WhatsApp Enabled: ${settings.enableWhatsAppNotifications}`)
    console.log(`   - WhatsApp Phone Number ID: ${settings.whatsappPhoneNumberId || 'Not set'}`)
    
    console.log('\n💾 Saving to database...')

    // Create settings in database
    const created = await db.emailSettings.create({
      data: settings
    })

    console.log('✅ Email settings migrated from .env to database successfully!')
    console.log('='.repeat(60))
    console.log('📊 Migration Summary:')
    console.log(`   ✅ ID: ${created.id}`)
    console.log(`   ✅ Host: ${created.host}`)
    console.log(`   ✅ Port: ${created.port}`)
    console.log(`   ✅ Username: ${created.username}`)
    console.log(`   ✅ From Address: ${created.fromAddress}`)
    console.log(`   ✅ From Name: ${created.fromName}`)
    console.log(`   ✅ WhatsApp Enabled: ${created.enableWhatsAppNotifications}`)
    console.log(`   ✅ WhatsApp Phone Number ID: ${created.whatsappPhoneNumberId || 'Not set'}`)
    console.log(`   ✅ WhatsApp API Version: ${created.whatsappApiVersion || 'Not set'}`)
    console.log(`   ✅ Created At: ${created.createdAt}`)
    
    console.log('\n📝 Next Steps:')
    console.log('   1. You can now update these settings through the admin UI')
    console.log('   2. The app will read email & WhatsApp config from database')
    console.log('   3. .env variables now act as fallback')
    console.log('   4. Run `npx prisma studio` to view the data')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
      console.error('Stack trace:', error.stack)
    }
  }
}

// Run the migration
migrateEnvToDb()
  .then(() => {
    console.log('\n🏁 Migration script completed.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })