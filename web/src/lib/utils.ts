import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(iso)
}

export function download(filename: string, content: string, type = 'application/json') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function slugifyFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60) || 'resume'
  )
}

export function countPlaceholders(doc: unknown): number {
  const text = JSON.stringify(doc ?? {})
  const matches = text.match(/\[(?:X|N|x|n|metric[^\]]*|[^\]]{0,24})\]/g)
  return matches?.length ?? 0
}

export function highlightPlaceholders(text: string) {
  return text.replace(/\[[^\]]{1,28}\]/g, (m) => `%%${m}%%`)
}

export function copy(text: string) {
  return navigator.clipboard?.writeText(text) ?? Promise.resolve()
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

export function pick<T>(list: T[], i: number): T {
  return list[((i % list.length) + list.length) % list.length]!
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
