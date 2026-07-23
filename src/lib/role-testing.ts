import { StaffType } from '@prisma/client'

// Map staff types to available menu items for testing/development
export const STAFF_TYPE_MENU_ITEMS: Record<StaffType, string[]> = {
  [StaffType.ADMIN]: [
    'Dashboard', 'Financial', 'Reports', 'Messages', 'Help & Support'
  ],
  [StaffType.CASE_MANAGER]: [
    'Dashboard', 'Documents', 'Applications', 'Reports', 'Help & Support'
  ],
  [StaffType.SALES]: [
    'Dashboard', 'Leads', 'Applications', 'Reports', 'Help & Support'
  ],
  [StaffType.ACCOUNTANT]: [
    'Dashboard', 'Documents', 'Applications', 'Reports', 'Help & Support'
  ],
  // Note: AUDITOR and SUPPORT are not separate StaffType values
  // AUDITOR functionality uses ACCOUNTANT staff type
  // SUPPORT functionality uses CASE_MANAGER staff type
}
