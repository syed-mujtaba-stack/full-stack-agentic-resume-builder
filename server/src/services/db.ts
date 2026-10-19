import { sql, type SQL } from 'drizzle-orm'
import type { DB } from '../db/client'

/** Driver-agnostic raw query (Neon returns rows directly, PGlite wraps them). */
export async function rows<T = Record<string, unknown>>(db: DB, query: SQL): Promise<T[]> {
  const res = (await db.execute(query)) as unknown
  if (Array.isArray(res)) return res as T[]
  if (res && typeof res === 'object' && Array.isArray((res as { rows?: unknown[] }).rows)) {
    return (res as { rows: T[] }).rows
  }
  return []
}

export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}
