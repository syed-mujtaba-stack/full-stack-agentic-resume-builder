import type { NextFunction, Request, Response } from 'express'
import { ApiError } from './http'

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export function rateLimit(opts: { windowMs: number; max: number; keyPrefix?: string }) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = `${opts.keyPrefix ?? 'rl'}:${req.ip ?? 'unknown'}:${req.path}`
    const now = Date.now()
    const bucket = buckets.get(key)
    if (!bucket || bucket.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs })
      return next()
    }
    bucket.count += 1
    if (bucket.count > opts.max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
      return next(ApiError.tooMany(`Too many attempts. Try again in ${retryAfter}s.`))
    }
    return next()
  }
}

setInterval(() => {
  const now = Date.now()
  for (const [key, b] of buckets) if (b.resetAt < now) buckets.delete(key)
}, 60_000).unref?.()
