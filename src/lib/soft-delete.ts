/**
 * Soft Delete Utility
 *
 * Helper functions for filtering out deleted records in Prisma queries.
 * This ensures that soft-deleted records (isDeleted: true) are excluded
 * from all queries by default when desired.
 */

/**
 * Add soft delete filter to a Prisma where clause.
 * Use this when querying for "active" (non-deleted) records.
 *
 * Example:
 *   const where = addSoftDeleteFilter({ email })
 *   db.user.findMany({ where })
 */
export function addSoftDeleteFilter<T extends { isDeleted?: boolean }>(
  where: T = {} as T
): T & { isDeleted: false } {
  return {
    ...where,
    isDeleted: false,
  }
}

/**
 * Helper to check if a record is deleted
 */
export function isDeleted(record: { isDeleted?: boolean } | null): boolean {
  return record?.isDeleted === true
}

/**
 * Filter out deleted records from an array
 */
export function filterDeleted<T extends { isDeleted?: boolean }>(
  records: T[]
): T[] {
  return records.filter((record) => !record.isDeleted)
}

