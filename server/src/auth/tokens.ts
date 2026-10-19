import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { env } from '../env'

const encoder = new TextEncoder()

const accessKey = () => encoder.encode(`${env.authSecret}:access`)
const refreshKey = () => encoder.encode(`${env.authSecret}:refresh`)

export type AccessClaims = {
  sub: string
  sid: string
  email: string
  name: string
  plan: string
  role: string
}

export type RefreshClaims = {
  sub: string
  sid: string
  typ: 'refresh'
}

function ttlToSeconds(ttl: string): number {
  const match = /^(\d+)\s*([smhd])$/.exec(ttl.trim())
  if (!match) return 900
  const value = Number(match[1])
  const unit = match[2]
  const mult = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400
  return value * mult
}

export const ACCESS_TTL_SECONDS = ttlToSeconds(env.accessTtl)
export const REFRESH_TTL_SECONDS = ttlToSeconds(env.refreshTtl)

export async function signAccessToken(claims: AccessClaims): Promise<string> {
  return new SignJWT({ ...claims, typ: 'access' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setIssuer('arbor')
    .setAudience('arbor-web')
    .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
    .sign(accessKey())
}

export async function signRefreshToken(claims: RefreshClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setIssuer('arbor')
    .setAudience('arbor-web')
    .setExpirationTime(`${REFRESH_TTL_SECONDS}s`)
    .sign(refreshKey())
}

export async function verifyAccessToken(token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, accessKey(), { issuer: 'arbor', audience: 'arbor-web' })
    return payload as unknown as AccessClaims
  } catch {
    return null
  }
}

export async function verifyRefreshToken(token: string): Promise<RefreshClaims | null> {
  try {
    const { payload } = await jwtVerify(token, refreshKey(), { issuer: 'arbor', audience: 'arbor-web' })
    const p = payload as JWTPayload & Partial<RefreshClaims>
    if (p.typ !== 'refresh' || !p.sub || !p.sid) return null
    return { sub: String(p.sub), sid: String(p.sid), typ: 'refresh' }
  } catch {
    return null
  }
}
