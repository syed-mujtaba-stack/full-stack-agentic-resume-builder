/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  Award,
  Certification,
  CustomSection,
  Education,
  Experience,
  LanguageEntry,
  Project,
  ResumeDocument,
  SectionKey,
  SkillGroup,
} from './types'

let counter = 0

/** Collision-safe, sortable-ish id generator that works in node + browser. */
export function uid(prefix = 'id'): string {
  counter = (counter + 1) % 100000
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 10)
      : Math.random().toString(36).slice(2, 12)
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${rand}`
}

export function slugify(input: string, fallback = 'resume'): string {
  const s = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48)
  return s || fallback
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function titleCase(s: string): string {
  return s
    .split(' ')
    .map((w) => (w.length > 2 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ')
}

/* ------------------------------------------------------------------ */
/* Factories                                                           */
/* ------------------------------------------------------------------ */

export const emptyExperience = (): Experience => ({
  id: uid('exp'),
  company: '',
  role: '',
  location: '',
  startDate: '',
  endDate: '',
  current: false,
  bullets: [],
  tech: [],
})

export const emptyEducation = (): Education => ({
  id: uid('edu'),
  school: '',
  degree: '',
  field: '',
  location: '',
  startDate: '',
  endDate: '',
  gpa: '',
  details: [],
})

export const emptySkillGroup = (name = 'Core Skills'): SkillGroup => ({ id: uid('skl'), name, items: [] })

export const emptyProject = (): Project => ({
  id: uid('prj'),
  name: '',
  role: '',
  link: '',
  startDate: '',
  endDate: '',
  description: '',
  bullets: [],
  tech: [],
})

export const emptyCertification = (): Certification => ({
  id: uid('cert'),
  name: '',
  issuer: '',
  date: '',
  credentialId: '',
  link: '',
})

export const emptyLanguage = (): LanguageEntry => ({ id: uid('lang'), name: '', level: '' })

export const emptyAward = (): Award => ({ id: uid('awd'), title: '', issuer: '', date: '', description: '' })

export const emptyCustomSection = (title = 'Volunteering'): CustomSection => ({ id: uid('cus'), title, items: [] })

export function emptyResumeDocument(): ResumeDocument {
  return {
    profile: {
      fullName: '',
      headline: '',
      email: '',
      phone: '',
      location: '',
      website: '',
      linkedin: '',
      github: '',
      summary: '',
    },
    summary: '',
    experience: [],
    education: [],
    skills: [emptySkillGroup()],
    projects: [],
    certifications: [],
    languages: [],
    awards: [],
    custom: [],
    meta: {
      sectionOrder: [
        'summary',
        'experience',
        'skills',
        'projects',
        'education',
        'certifications',
        'languages',
        'awards',
        'custom',
      ],
      hidden: [],
      accent: '#6366f1',
      fontFamily: 'sans',
      density: 'comfortable',
      fontScale: 1,
      showIcons: true,
      pageFormat: 'a4',
    },
  }
}

/** Deep-merge an unknown JSON blob onto a valid document (defensive hydration). */
export function hydrateResumeDocument(input: unknown): ResumeDocument {
  const base = emptyResumeDocument()
  if (!input || typeof input !== 'object') return base
  const raw = input as Record<string, any>
  const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
  return {
    profile: { ...base.profile, ...(raw.profile ?? {}) },
    summary: typeof raw.summary === 'string' ? raw.summary : '',
    experience: arr<Experience>(raw.experience).map((e) => ({ ...emptyExperience(), ...e, id: e?.id || uid('exp') })),
    education: arr<Education>(raw.education).map((e) => ({ ...emptyEducation(), ...e, id: e?.id || uid('edu') })),
    skills: arr<SkillGroup>(raw.skills).map((s) => ({ ...emptySkillGroup(), ...s, id: s?.id || uid('skl') })),
    projects: arr<Project>(raw.projects).map((p) => ({ ...emptyProject(), ...p, id: p?.id || uid('prj') })),
    certifications: arr<Certification>(raw.certifications).map((c) => ({
      ...emptyCertification(),
      ...c,
      id: c?.id || uid('cert'),
    })),
    languages: arr<LanguageEntry>(raw.languages).map((l) => ({ ...emptyLanguage(), ...l, id: l?.id || uid('lang') })),
    awards: arr<Award>(raw.awards).map((a) => ({ ...emptyAward(), ...a, id: a?.id || uid('awd') })),
    custom: arr<CustomSection>(raw.custom).map((c) => ({ ...emptyCustomSection(), ...c, id: c?.id || uid('cus') })),
    meta: { ...base.meta, ...(raw.meta ?? {}) },
  }
}

/* ------------------------------------------------------------------ */
/* Analytics                                                           */
/* ------------------------------------------------------------------ */

export function documentToPlainText(doc: ResumeDocument): string {
  const lines: string[] = []
  const p = doc.profile
  lines.push(p.fullName, p.headline, p.email, p.phone, p.location, p.website, p.linkedin, p.github, doc.summary)
  for (const e of doc.experience) lines.push(e.role, e.company, e.location, ...e.bullets, ...e.tech)
  for (const e of doc.education) lines.push(e.school, e.degree, e.field, e.gpa, ...e.details)
  for (const g of doc.skills) lines.push(g.name, ...g.items)
  for (const pr of doc.projects) lines.push(pr.name, pr.role, pr.description, ...pr.bullets, ...pr.tech)
  for (const c of doc.certifications) lines.push(c.name, c.issuer)
  for (const l of doc.languages) lines.push(l.name, l.level)
  for (const a of doc.awards) lines.push(a.title, a.issuer, a.description)
  for (const c of doc.custom) lines.push(c.title, ...c.items.flatMap((i) => [i.title, i.subtitle, i.description]))
  return lines.filter(Boolean).join('\n')
}

export function countWords(doc: ResumeDocument): number {
  const text = documentToPlainText(doc)
  if (!text.trim()) return 0
  return text.trim().split(/\s+/).length
}

export function estimatePages(doc: ResumeDocument): number {
  const words = countWords(doc)
  if (words === 0) return 1
  return Math.max(1, Math.round((words / 550) * 10) / 10)
}

export type CompletenessResult = {
  score: number
  checks: { key: string; label: string; ok: boolean; weight: number; hint: string }[]
  missing: string[]
}

export function computeCompleteness(doc: ResumeDocument): CompletenessResult {
  const p = doc.profile
  const checks: CompletenessResult['checks'] = [
    { key: 'name', label: 'Full name', ok: !!p.fullName.trim(), weight: 10, hint: 'Add your full name.' },
    { key: 'headline', label: 'Headline / target role', ok: !!p.headline.trim(), weight: 8, hint: 'Add a role headline, e.g. "Senior Frontend Engineer".' },
    { key: 'email', label: 'Email', ok: /@/.test(p.email), weight: 8, hint: 'Add a professional email address.' },
    { key: 'phone', label: 'Phone', ok: p.phone.trim().length > 5, weight: 5, hint: 'Add a phone number with country code.' },
    { key: 'location', label: 'Location', ok: !!p.location.trim(), weight: 5, hint: 'City, Country — remote-friendly.' },
    { key: 'links', label: 'Portfolio / LinkedIn / GitHub', ok: !!(p.linkedin || p.github || p.website), weight: 6, hint: 'Link LinkedIn, GitHub or a portfolio.' },
    { key: 'summary', label: 'Professional summary', ok: doc.summary.trim().length > 80, weight: 12, hint: 'Write a 3–4 line summary tailored to the role.' },
    { key: 'experience', label: 'At least one role', ok: doc.experience.length > 0, weight: 14, hint: 'Add your most recent role.' },
    { key: 'bullets', label: '3+ quantified bullets per role', ok: doc.experience.some((e) => e.bullets.filter((b) => b.trim()).length >= 3), weight: 14, hint: 'Add 3–5 bullets with numbers.' },
    { key: 'education', label: 'Education', ok: doc.education.length > 0, weight: 8, hint: 'Add your highest qualification.' },
    { key: 'skills', label: 'Skills grouped', ok: doc.skills.some((s) => s.items.length >= 4), weight: 8, hint: 'Add 8–15 role-relevant skills.' },
  ]
  const total = checks.reduce((a, c) => a + c.weight, 0)
  const got = checks.reduce((a, c) => a + (c.ok ? c.weight : 0), 0)
  return {
    score: Math.round((got / total) * 100),
    checks,
    missing: checks.filter((c) => !c.ok).map((c) => c.hint),
  }
}

/* ------------------------------------------------------------------ */
/* Text helpers                                                        */
/* ------------------------------------------------------------------ */

const NOT_A_SKILL = /^\d+\s*\+?\s*(years?|yrs?|yoe|months?|mos?)(\s+(of\s+)?(experience|exp))?$/i

export function splitSkills(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[\n,;•|·]+/)
        .map((s) => s.trim().replace(/^[-*]\s*/, ''))
        .filter((s) => s.length > 1 && s.length < 60 && !NOT_A_SKILL.test(s)),
    ),
  ]
}

/** Very light parser for the "paste your skills" magic box. */
export function parseIntake(raw: string): {
  skills: string[]
  role: string
  years: number | null
  companies: string[]
  education: string[]
} {
  const text = raw || ''
  const roleMatch = text.match(
    /\b(i am|i'm|as an?|role\s*[:\-]|position\s*[:\-]|target\s*[:\-])\s*([a-z0-9 +&/.\-]{3,60})/i,
  )
  const yearsMatch = text.match(/(\d{1,2})\+?\s*(?:years|yrs|yoe)\b/i)
  return {
    skills: splitSkills(text),
    role: roleMatch ? roleMatch[2]!.trim() : '',
    years: yearsMatch ? Number(yearsMatch[1]) : null,
    companies: [...text.matchAll(/(?:at|@)\s+([A-Z][\w&.\- ]{2,40})/g)].map((m) => m[1]!.trim()),
    education: [...text.matchAll(/\b(BS|BA|BSc|MSc|MS|MBA|PhD|B\.Tech|BE|MD)\b[^.\n]{0,60}/g)].map((m) => m[0].trim()),
  }
}

export function formatRange(start: string, end: string, current?: boolean): string {
  const s = start?.trim()
  const e = current ? 'Present' : end?.trim()
  if (s && e) return `${s} — ${e}`
  return s || e || ''
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

export function debounce<T extends (...args: any[]) => void>(fn: T, ms = 400) {
  let t: ReturnType<typeof setTimeout> | undefined
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

export const SECTION_TITLES: Record<SectionKey, string> = {
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  languages: 'Languages',
  awards: 'Awards',
  custom: 'Custom',
}
