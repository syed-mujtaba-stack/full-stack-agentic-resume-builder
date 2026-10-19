import type { SessionRow, UserRow } from './db/schema'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserRow
      sessionId?: string
      rawAccessToken?: string | null
      requestId?: string
    }
  }
}

export type AuthedRequest = {
  user: UserRow
  sessionId: string
} & { session?: SessionRow }

export {}
