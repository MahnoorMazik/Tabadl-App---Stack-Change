// scripts/check-migration.ts
import { db } from 'src/lib/db'

async function checkMigration() {
  console.log('🔍 Checking email settings migration...')
  console.log('=' .repeat(60))
  
  try {
    const settings = await db.emailSettings.findFirst({
      orderBy: { createdAt: 'desc' }
    })
    
    if (!settings) {
      console.log('❌ No email settings found in database.')
      console.log('💡 Run: npm run migrate:env')
      return
    }
    
    console.log('✅ Email settings found in database!')
    console.log('\n📊 Settings Details:')
    console.log(`   ID: ${settings.id}`)
    console.log(`   Mail Driver: ${settings.mailDriver}`)
    console.log(`   Host: ${settings.host}`)
    console.log(`   Port: ${settings.port}`)
    console.log(`   Username: ${settings.username}`)
    console.log(`   Password: ${settings.password ? '✅ Set' : '❌ Not set'}`)
    console.log(`   Encryption: ${settings.encryption}`)
    console.log(`   From Address: ${settings.fromAddress}`)
    console.log(`   From Name: ${settings.fromName}`)
    console.log(`   TLS Servername: ${settings.tlsServername || 'Not set'}`)
    console.log(`   Contact Email: ${settings.contactEmail || 'Not set'}`)
    console.log(`   Contact Phone: ${settings.contactPhone || 'Not set'}`)
    console.log(`   WhatsApp Enabled: ${settings.enableWhatsAppNotifications}`)
    console.log(`   WhatsApp Phone Number ID: ${settings.whatsappPhoneNumberId || 'Not set'}`)
    console.log(`   WhatsApp API Version: ${settings.whatsappApiVersion || 'Not set'}`)
    console.log(`   Created: ${settings.createdAt}`)
    console.log(`   Updated: ${settings.updatedAt}`)
    
    console.log('\n✅ Migration check completed successfully!')
  } catch (error) {
    console.error('❌ Check failed:', error)
  }
}

checkMigration()