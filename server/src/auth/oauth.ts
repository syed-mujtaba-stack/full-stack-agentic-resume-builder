import { env } from '../env'
import { ApiError } from '../lib/http'

export type OAuthProviderId = 'google' | 'github'

export type OAuthProfile = {
  providerAccountId: string
  email?: string
  name?: string
  avatarUrl?: string
  raw: Record<string, unknown>
}

export function isOAuthEnabled(provider: string): provider is OAuthProviderId {
  if (provider === 'google') return Boolean(env.google.id && env.google.secret)
  if (provider === 'github') return Boolean(env.github.id && env.github.secret)
  return false
}

export function enabledProviders(): OAuthProviderId[] {
  return (['google', 'github'] as OAuthProviderId[]).filter(isOAuthEnabled)
}

function redirectUri(provider: string): string {
  return `${env.apiUrl.replace(/\/$/, '')}/api/auth/oauth/${provider}/callback`
}

export function oauthAuthorizeUrl(provider: OAuthProviderId, state: string): string {
  const uri = redirectUri(provider)
  if (provider === 'google') {
    const params = new URLSearchParams({
      client_id: env.google.id,
      redirect_uri: uri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }
  const params = new URLSearchParams({
    client_id: env.github.id,
    redirect_uri: uri,
    scope: 'user:email',
    state,
  })
  return `https://github.com/login/oauth/authorize?${params.toString()}`
}

export async function exchangeOAuthCode(provider: OAuthProviderId, code: string): Promise<OAuthProfile> {
  if (provider === 'google') {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.google.id,
        client_secret: env.google.secret,
        redirect_uri: redirectUri('google'),
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenRes.ok) throw ApiError.badRequest('Google sign-in failed')
    const token = (await tokenRes.json()) as { access_token?: string }
    const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token ?? ''}` },
    })
    if (!infoRes.ok) throw ApiError.badRequest('Could not read your Google profile')
    const info = (await infoRes.json()) as { sub?: string; email?: string; name?: string; picture?: string }
    return {
      providerAccountId: info.sub ?? '',
      email: info.email,
      name: info.name,
      avatarUrl: info.picture,
      raw: info as Record<string, unknown>,
    }
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      code,
      client_id: env.github.id,
      client_secret: env.github.secret,
      redirect_uri: redirectUri('github'),
    }),
  })
  if (!tokenRes.ok) throw ApiError.badRequest('GitHub sign-in failed')
  const token = (await tokenRes.json()) as { access_token?: string }
  const headers = { Authorization: `Bearer ${token.access_token ?? ''}`, Accept: 'application/vnd.github+json' }
  const userRes = await fetch('https://api.github.com/user', { headers })
  if (!userRes.ok) throw ApiError.badRequest('Could not read your GitHub profile')
  const user = (await userRes.json()) as { id?: number; login?: string; name?: string | null; avatar_url?: string; email?: string | null }
  let email = user.email ?? undefined
  if (!email) {
    const emailRes = await fetch('https://api.github.com/user/emails', { headers })
    if (emailRes.ok) {
      const emails = (await emailRes.json()) as { email?: string; primary?: boolean }[]
      email = emails.find((e) => e.primary)?.email ?? emails[0]?.email
    }
  }
  return {
    providerAccountId: String(user.id ?? user.login ?? ''),
    email,
    name: user.name ?? user.login,
    avatarUrl: user.avatar_url,
    raw: user as Record<string, unknown>,
  }
}
