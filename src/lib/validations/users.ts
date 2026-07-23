import { z } from 'zod'
import { UserRole, StaffType } from '@prisma/client'

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(128),
  email: z.string().email('Invalid email'),
  role: z.nativeEnum(UserRole).default(UserRole.STAFF),
  staffType: z.nativeEnum(StaffType).optional().nullable(),
  customRoleId: z.string().optional().nullable(),
  phone: z.string().max(32).optional().nullable(),
})

export const updateUserSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  email: z.string().email().optional(),
  staffType: z.nativeEnum(StaffType).optional().nullable(),
  customRoleId: z.string().optional().nullable(),
  phone: z.string().max(32).optional().nullable(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional().nullable(),
  role: z.nativeEnum(UserRole).optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
