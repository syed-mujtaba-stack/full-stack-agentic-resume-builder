import { env } from '../env'

/**
 * Minimal, dependency-free OpenRouter client (OpenAI-compatible).
 * Supports streaming + tool/function calling with manual delta accumulation.
 */

export type Role = 'system' | 'user' | 'assistant' | 'tool'

export type ChatMessage = {
  role: Role
  content: string | null
  name?: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

export type ToolCall = {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export type ToolSpec = {
  type: 'function'
  function: { name: string; description: string; parameters: Record<string, unknown> }
}

export type Usage = { promptTokens: number; completionTokens: number; costUsd: number | null }

export type StreamEvent =
  | { type: 'token'; text: string }
  | { type: 'tool_calls'; calls: ToolCall[]; text: string }
  | { type: 'done'; message: ChatMessage; finishReason: string | null; usage: Usage | null }
  | { type: 'error'; message: string }

export function openRouterConfigured(): boolean {
  return Boolean(env.openrouterApiKey)
}

function headers() {
  return {
    Authorization: `Bearer ${env.openrouterApiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': env.appUrl,
    'X-Title': env.appName,
  }
}

export class OpenRouterError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request(body: Record<string, unknown>, signal?: AbortSignal): Promise<Response> {
  return fetch(`${env.openrouterBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
    signal,
  })
}

async function readError(res: Response): Promise<string> {
  try {
    const text = await res.text()
    try {
      const json = JSON.parse(text)
      return json?.error?.message ?? json?.message ?? text
    } catch {
      return text.slice(0, 500)
    }
  } catch {
    return `OpenRouter responded ${res.status}`
  }
}

/* ------------------------------------------------------------------ */
/* Non-streaming (used for the deterministic tool phase)               */
/* ------------------------------------------------------------------ */

export async function complete(opts: {
  model?: string
  messages: ChatMessage[]
  tools?: ToolSpec[]
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}): Promise<{ message: ChatMessage; usage: Usage | null; model: string }> {
  const res = await request(
    {
      model: opts.model || env.openrouterModel,
      messages: opts.messages,
      tools: opts.tools,
      tool_choice: opts.toolChoice ?? (opts.tools ? 'auto' : undefined),
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 3000,
      stream: false,
    },
    opts.signal,
  )
  if (!res.ok) throw new OpenRouterError(res.status, await readError(res))
  const json = (await res.json()) as {
    choices: { message: ChatMessage; finish_reason: string | null }[]
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_cost?: number }
    model?: string
  }
  const choice = json.choices?.[0]
  return {
    message: choice?.message ?? { role: 'assistant', content: '' },
    usage: {
      promptTokens: json.usage?.prompt_tokens ?? 0,
      completionTokens: json.usage?.completion_tokens ?? 0,
      costUsd: json.usage?.total_cost ?? null,
    },
    model: json.model ?? opts.model ?? env.openrouterModel,
  }
}

/* ------------------------------------------------------------------ */
/* Streaming                                                           */
/* ------------------------------------------------------------------ */

export async function* stream(opts: {
  model?: string
  messages: ChatMessage[]
  tools?: ToolSpec[]
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}): AsyncGenerator<StreamEvent> {
  const body: Record<string, unknown> = {
    model: opts.model || env.openrouterModel,
    messages: opts.messages,
    tools: opts.tools,
    tool_choice: opts.toolChoice ?? (opts.tools ? 'auto' : undefined),
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 3000,
    stream: true,
    stream_options: { include_usage: true },
  }

  const res = await request(body, opts.signal)
  if (!res.ok || !res.body) {
    throw new OpenRouterError(res.status, await readError(res))
  }

  const reader = (res.body as unknown as ReadableStream<Uint8Array>).getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  const toolAcc = new Map<number, ToolCall>()
  let finishReason: string | null = null
  let usage: Usage | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line || !line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') continue
      let chunk: any
      try {
        chunk = JSON.parse(payload)
      } catch {
        continue
      }
      if (chunk?.error) {
        yield { type: 'error', message: chunk.error?.message ?? 'OpenRouter error' }
        continue
      }
      if (chunk?.usage) {
        usage = {
          promptTokens: chunk.usage.prompt_tokens ?? 0,
          completionTokens: chunk.usage.completion_tokens ?? 0,
          costUsd: chunk.usage.total_cost ?? null,
        }
      }
      const delta = chunk?.choices?.[0]?.delta
      const reason = chunk?.choices?.[0]?.finish_reason
      if (reason) finishReason = reason
      if (!delta) continue

      if (typeof delta.content === 'string' && delta.content.length) {
        text += delta.content
        yield { type: 'token', text: delta.content }
      }

      if (Array.isArray(delta.tool_calls)) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0
          const existing = toolAcc.get(idx) ?? {
            id: tc.id ?? '',
            type: 'function',
            function: { name: '', arguments: '' },
          }
          if (tc.id) existing.id = tc.id
          if (tc.function?.name) existing.function.name += tc.function.name
          if (tc.function?.arguments) existing.function.arguments += tc.function.arguments
          toolAcc.set(idx, existing)
        }
      }
    }
  }

  const calls = [...toolAcc.entries()].sort((a, b) => a[0] - b[0]).map(([, c]) => c)
  if (calls.length) yield { type: 'tool_calls', calls, text }

  yield {
    type: 'done',
    message: {
      role: 'assistant',
      content: text || null,
      tool_calls: calls.length ? calls : undefined,
    },
    finishReason,
    usage,
  }
}

/* ------------------------------------------------------------------ */
/* Model catalogue (drives the in-app model picker)                    */
/* ------------------------------------------------------------------ */

export const SUGGESTED_MODELS = [
  { id: 'openrouter/auto', label: 'OpenRouter Auto', note: 'Router picks the best available model' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', note: 'Best writing quality' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini', note: 'Fast and cheap' },
  { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash', note: 'Great price/performance' },
  { id: 'meta-llama/3.3-70b-instruct', label: 'Llama 3.3 70B', note: 'Strong open-weight model' },
  { id: 'deepseek/deepseek-chat-v3-0324', label: 'DeepSeek V3', note: 'Very cheap, very capable' },
]

export async function listModels(): Promise<{ id: string; label: string; note?: string }[]> {
  if (!openRouterConfigured()) return SUGGESTED_MODELS
  try {
    const res = await fetch(`${env.openrouterBaseUrl}/models`, { headers: headers() })
    if (!res.ok) return SUGGESTED_MODELS
    const json = (await res.json()) as { data?: { id: string; name?: string; context_length?: number; pricing?: { prompt?: string; completion?: string } }[] }
    const data = json.data ?? []
    const ranked = SUGGESTED_MODELS.filter((m) => data.some((d) => d.id === m.id))
    const rest = data
      .filter((d) => !SUGGESTED_MODELS.some((m) => m.id === d.id))
      .slice(0, 60)
      .map((d) => ({ id: d.id, label: d.name ?? d.id, note: d.context_length ? `${Math.round(d.context_length / 1000)}k ctx` : undefined }))
    return [...ranked, ...rest]
  } catch {
    return SUGGESTED_MODELS
  }
}
