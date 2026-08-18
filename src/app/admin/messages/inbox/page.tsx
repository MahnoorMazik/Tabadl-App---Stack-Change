'use client'

import { MessageSquare } from 'lucide-react'
import { AdminPageTemplate } from '@/components/AdminPageTemplate'
import { ChatwootInbox } from '@/components/admin/ChatwootInbox'
import { Module, Action } from '@/lib/rbac'

export default function AdminWhatsAppInboxPage() {
  return (
    <AdminPageTemplate
      title="WhatsApp Inbox"
      description="Reply to WhatsApp conversations from Chatwoot inside the CRM."
      icon={<MessageSquare className="h-5 w-5 text-emerald-600" />}
      requiredPermission={`${Module.MESSAGES}.${Action.VIEW}`}
      showConstruction={false}
      fullWidth
    >
      <ChatwootInbox />
    </AdminPageTemplate>
  )
}
