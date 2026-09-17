export function formatDisplayId(id: number, prefix: string | null): string {
  return `${prefix || "TICKET"}-${String(id).padStart(6, "0")}`;
}
