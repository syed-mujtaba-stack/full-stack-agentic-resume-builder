import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { ZodError, type ZodSchema } from 'zod'

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, message: string, code = 'error', details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }

  static badRequest(message = 'Bad request', details?: unknown) {
    return new ApiError(400, message, 'bad_request', details)
  }
  static unauthorized(message = 'You need to sign in') {
    return new ApiError(401, message, 'unauthorized')
  }
  static forbidden(message = 'Not allowed') {
    return new ApiError(403, message, 'forbidden')
  }
  static notFound(message = 'Not found') {
    return new ApiError(404, message, 'not_found')
  }
  static conflict(message = 'Conflict', details?: unknown) {
    return new ApiError(409, message, 'conflict', details)
  }
  static tooMany(message = 'Slow down a little — rate limit hit') {
    return new ApiError(429, message, 'rate_limited')
  }
  static server(message = 'Something went wrong') {
    return new ApiError(500, message, 'server_error')
  }
}

export function asyncHandler<T extends RequestHandler>(fn: T): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export function parseBody<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const flat = result.error.flatten()
    throw ApiError.badRequest('Please check the highlighted fields', {
      formErrors: flat.formErrors,
      fieldErrors: flat.fieldErrors,
    })
  }
  return result.data
}

/** Express 5 types path params as string | string[]. */
export function param(req: Request, name: string): string {
  const value = (req.params as Record<string, string | string[] | undefined>)?.[name]
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 20)}`
}

export function clientIp(req: Request): string | null {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0]!.trim()
  return req.ip ?? req.socket.remoteAddress ?? null
}

export function userAgent(req: Request): string | null {
  const ua = req.headers['user-agent']
  return typeof ua === 'string' ? ua.slice(0, 300) : null
}

export { ZodError }
