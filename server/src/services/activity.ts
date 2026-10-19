import { sql } from 'drizzle-orm'
import { newId } from '../lib/http'
import { getDb } from '../db/client'
import { activities } from '../db/schema'
import type { ActivityItem } from '@arbor/shared'
import { hub } from '../realtime/hub'

export type ActivityType = ActivityItem['type']

export async function logActivity(
  userId: string,
  type: ActivityType,
  message: string,
  meta: Record<string, unknown> | null = null,
): Promise<ActivityItem> {
  const { db } = await getDb()
  const id = newId('act')
  const [row] = await db
    .insert(activities)
    .values({ id, userId, type, message, meta })
    .returning()
  const item: ActivityItem = {
    id: row?.id ?? id,
    type,
    message,
    meta,
    createdAt: (row?.createdAt ?? new Date()).toISOString(),
  }
  hub.broadcastToUser(userId, { type: 'activity', item })
  return item
}

export async function recentActivity(userId: string, limit = 25): Promise<ActivityItem[]> {
  const { db } = await getDb()
  const result = await db
    .select()
    .from(activities)
    .where(sql`${activities.userId} = ${userId}`)
    .orderBy(sql`${activities.createdAt} desc`)
    .limit(limit)
  return result.map((r) => ({
    id: r.id,
    type: r.type as ActivityItem['type'],
    message: r.message,
    meta: r.meta ?? null,
    createdAt: r.createdAt.toISOString(),
  }))
}
