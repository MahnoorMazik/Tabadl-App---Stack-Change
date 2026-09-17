export async function getPrefixedEntityPrefix(
  _db: any,
  _entity: string,
): Promise<string | null> {
  // Placeholder implementation for display IDs.
  // If your app supports configurable prefixes, replace this with database-backed resolution.
  return null;
}

export function withSupportDisplayIdField(
  row: { id: number } & Record<string, unknown>,
  prefix: string | null,
) {
  return {
    ...row,
    displayId: `${prefix || "TICKET"}-${String(row.id).padStart(6, "0")}`,
  };
}

export async function resolveSupportTicketIdParam(
  _db: any,
  id: string,
): Promise<number | null> {
  const numericId = Number(id);
  if (!Number.isNaN(numericId) && String(numericId) === id) {
    return numericId;
  }

  const match = /([0-9]+)$/.exec(id);
  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  return Number.isNaN(parsed) ? null : parsed;
}
