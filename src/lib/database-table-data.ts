import type { CustomDatabaseEngine } from './database-provider'

const SAFE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/

export interface TableDataResult {
  columns: string[]
  rows: Record<string, unknown>[]
  totalRows: number
}

/** JSON-safe conversion for values raw SQL can return that JSON.stringify chokes on. */
function serializeValue(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (value instanceof Uint8Array) return `<binary: ${value.byteLength} bytes>`
  if (Array.isArray(value)) return value.map(serializeValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serializeValue(v)]))
  }
  return value
}

async function getColumns(client: any, engine: CustomDatabaseEngine, table: string): Promise<string[]> {
  if (engine === 'sqlite') {
    const rows = (await client.$queryRawUnsafe(`PRAGMA table_info("${table}")`)) as { name: string }[]
    return rows.map((r) => r.name)
  }
  const rows = (await client.$queryRawUnsafe(
    'SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position',
    'public',
    table
  )) as { column_name: string }[]
  return rows.map((r) => r.column_name)
}

/** Table name must already be validated against the database's own catalog (see listTables) —
 *  never pass a raw, unchecked value here. */
export async function getTableData(
  client: any,
  engine: CustomDatabaseEngine,
  table: string,
  page: number,
  pageSize: number
): Promise<TableDataResult> {
  if (!SAFE_IDENTIFIER.test(table)) {
    throw new Error('Invalid table name')
  }

  const columns = await getColumns(client, engine, table)

  const countRows = (await client.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`)) as { count: number | bigint }[]
  const totalRows = Number(countRows[0]?.count ?? 0)

  const offset = Math.max(0, (page - 1) * pageSize)
  const rawRows = (await client.$queryRawUnsafe(
    `SELECT * FROM "${table}" LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`
  )) as Record<string, unknown>[]

  const rows = rawRows.map((row) => serializeValue(row) as Record<string, unknown>)

  return { columns, rows, totalRows }
}
