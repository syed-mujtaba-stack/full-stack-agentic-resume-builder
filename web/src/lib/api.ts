const BASE = ((import.meta.env as { VITE_API_URL?: string } | undefined)?.VITE_API_URL as string | undefined) || '/api'

export class ApiRequestError extends Error {
  status: number
  code: string
  details?: unknown
  constructor(message: string, status: number, code = 'error', details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  headers?: Record<string, string>
  skipRefresh?: boolean
}

let refreshing: Promise<boolean> | null = null

async function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'x-arbor-client': '1' },
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        setTimeout(() => {
          refreshing = null
        }, 250)
      })
  }
  return refreshing
}

async function request<T>(path: string, options: Options = {}, retried = false): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: {
      'x-arbor-client': '1',
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  })

  if (res.status === 401 && !options.skipRefresh && !retried && !path.startsWith('/auth/')) {
    const ok = await refreshSession()
    if (ok) return request<T>(path, options, true)
  }

  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!res.ok) {
    const payload = (data ?? {}) as { error?: string; code?: string; details?: unknown }
    throw new ApiRequestError(payload.error || `Request failed (${res.status})`, res.status, payload.code, payload.details)
  }
  return data as T
}

export const api = {
  get: <T>(path: string, opts?: Options) => request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: Options) => request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: Options) => request<T>(path, { ...opts, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, opts?: Options) => request<T>(path, { ...opts, method: 'PUT', body }),
  del: <T>(path: string, body?: unknown, opts?: Options) => request<T>(path, { ...opts, method: 'DELETE', body }),

  /** NDJSON streaming (used by the agent). */
  async stream<T>(
    path: string,
    body: unknown,
    onEvent: (event: T) => void,
    opts: { signal?: AbortSignal } = {},
  ): Promise<void> {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'x-arbor-client': '1' },
      body: JSON.stringify(body),
      signal: opts.signal,
    })
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '')
      let message = `Request failed (${res.status})`
      try {
        message = (JSON.parse(text) as { error?: string }).error || message
      } catch {
        /* ignore */
      }
      throw new ApiRequestError(message, res.status)
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          onEvent(JSON.parse(trimmed) as T)
        } catch {
          /* skip malformed keep-alives */
        }
      }
    }
    if (buffer.trim()) {
      try {
        onEvent(JSON.parse(buffer) as T)
      } catch {
        /* ignore */
      }
    }
  },
}

export const endpoints = {
  health: '/health',
  config: '/config',
  templates: '/templates',
}
