import { Prisma } from '@prisma/client'

export const userListSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  staffType: true,
  phone: true,
  avatar: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  customRole: {
    select: {
      id: true,
      name: true,
      description: true,
    },
  },
  _count: {
    select: {
      assignedApplications: true,
      assignedTasks: true,
      notifications: true,
    },
  },
} satisfies Prisma.UserSelect

export const userDetailSelect = {
  ...userListSelect,
  customRoleId: true,
} satisfies Prisma.UserSelect

export const CORE_ADMIN_EMAIL = 'admin@tk.sa'

export function isCoreAdmin(email: string): boolean {
  return email === CORE_ADMIN_EMAIL
}
