import { z } from 'zod'

export const serviceSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional().nullable(),
  categoryId: z.string().min(1, 'Category is required'),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  packageIds: z.array(z.string()).optional(),
})

export const servicePackageSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional().nullable(),
  basePriceSar: z.number().min(0),
  basePriceUsd: z.number().min(0),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  serviceIds: z.array(z.string()).optional(),
})

export const additionalServiceSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional().nullable(),
  priceSar: z.number().min(0),
  priceUsd: z.number().min(0),
  serviceId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
})
