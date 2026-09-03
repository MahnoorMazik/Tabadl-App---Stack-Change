import type { CustomDatabaseEngine } from './database-provider'

export interface TableInfo {
  name: string
  rowCount: number | null
}

const SAFE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/

/** Lists tables and row counts for the app's own schema. Table names come from the database's
 *  own catalog (never user input), but are still validated before being interpolated into SQL. */
export async function listTables(client: any, engine: CustomDatabaseEngine): Promise<TableInfo[]> {
  const names = engine === 'sqlite'
    ? (await client.$queryRawUnsafe(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%' ORDER BY name"
      ) as { name: string }[]).map((row) => row.name)
    : (await client.$queryRawUnsafe(
        "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '\\_prisma%' ORDER BY tablename"
      ) as { tablename: string }[]).map((row) => row.tablename)

  const results: TableInfo[] = []
  for (const name of names) {
    if (!SAFE_IDENTIFIER.test(name)) {
      results.push({ name, rowCount: null })
      continue
    }
    let rowCount: number | null = null
    try {
      const countRows = await client.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${name}"`) as { count: number | bigint }[]
      rowCount = Number(countRows[0]?.count ?? 0)
    } catch {
      rowCount = null
    }
    results.push({ name, rowCount })
  }
  return results
}
