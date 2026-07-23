import { NextResponse } from 'next/server'
import { withPermission } from '@/lib/rbac-middleware'
import { Module, Action, type Permission } from '@/lib/rbac'
import { seedBusinessWorkflow } from '@/lib/business-workflow/seed'

export const POST = withPermission(
  [`${Module.SERVICES}.${Action.MANAGE}` as Permission]
)(async () => {
  try {
    await seedBusinessWorkflow()
    return NextResponse.json({ success: true, message: 'Business workflow catalog seeded' })
  } catch (error) {
    console.error('[Seed Business Workflow]', error)
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 })
  }
})
