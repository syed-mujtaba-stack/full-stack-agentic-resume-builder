import type { TemplateId, TemplateMeta } from './types'

/**
 * The template catalogue. Every template is a React component in
 * `web/src/templates/<id>.tsx` registered in `web/src/templates/registry.ts`.
 * Adding one = drop a component + an entry here (metadata is shared with the
 * API so the agent can recommend templates).
 */
export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'aurora',
    name: 'Aurora',
    tagline: 'Vivid gradient header with a clean single column body.',
    layout: 'single',
    bestFor: ['software', 'product', 'design', 'marketing', 'data'],
    accent: '#6366f1',
    font: 'sans',
    atsSafe: true,
    swatch: ['#6366f1', '#a855f7'],
    badge: 'Most popular',
  },
  {
    id: 'onyx',
    name: 'Onyx',
    tagline: 'Executive serif layout for leadership and finance.',
    layout: 'single',
    bestFor: ['finance', 'consulting', 'legal', 'executive', 'operations'],
    accent: '#111827',
    font: 'serif',
    atsSafe: true,
    swatch: ['#111827', '#6b7280'],
    badge: 'Executive',
  },
  {
    id: 'nova',
    name: 'Nova',
    tagline: 'Two column split with a skills rail for fast scanning.',
    layout: 'split',
    bestFor: ['software', 'data', 'engineering', 'devops'],
    accent: '#0ea5e9',
    font: 'sans',
    atsSafe: false,
    swatch: ['#0ea5e9', '#22d3ee'],
  },
  {
    id: 'quantum',
    name: 'Quantum',
    tagline: 'Monospace tech minimal — built for engineers.',
    layout: 'single',
    bestFor: ['software', 'devops', 'security', 'data', 'qa'],
    accent: '#22c55e',
    font: 'mono',
    atsSafe: true,
    swatch: ['#22c55e', '#064e3b'],
    badge: 'ATS max',
  },
  {
    id: 'meridian',
    name: 'Meridian',
    tagline: 'Classic, parser-perfect chronological resume.',
    layout: 'single',
    bestFor: ['healthcare', 'education', 'government', 'admin', 'legal'],
    accent: '#334155',
    font: 'serif',
    atsSafe: true,
    swatch: ['#334155', '#94a3b8'],
    badge: 'Safest for ATS',
  },
  {
    id: 'vertex',
    name: 'Vertex',
    tagline: 'Creative sidebar with timeline and skill meters.',
    layout: 'split',
    bestFor: ['design', 'marketing', 'media', 'content', 'brand'],
    accent: '#f43f5e',
    font: 'sans',
    atsSafe: false,
    swatch: ['#f43f5e', '#fb7185'],
    badge: 'Creative',
  },
  {
    id: 'lumen',
    name: 'Lumen',
    tagline: 'Academic CV with publications, grants and teaching.',
    layout: 'single',
    bestFor: ['academia', 'research', 'science', 'medicine', 'phd'],
    accent: '#7c3aed',
    font: 'serif',
    atsSafe: true,
    swatch: ['#7c3aed', '#c4b5fd'],
    badge: 'Academic CV',
  },
  {
    id: 'pulse',
    name: 'Pulse',
    tagline: 'Dense one-pager for students and career switchers.',
    layout: 'compact',
    bestFor: ['student', 'entry', 'intern', 'support', 'retail'],
    accent: '#f59e0b',
    font: 'sans',
    atsSafe: true,
    swatch: ['#f59e0b', '#fcd34d'],
    badge: 'One page',
  },
]

export const TEMPLATE_MAP: Record<TemplateId, TemplateMeta> = TEMPLATES.reduce(
  (acc, t) => {
    acc[t.id] = t
    return acc
  },
  {} as Record<TemplateId, TemplateMeta>,
)

export const defaultTemplateId: TemplateId = 'aurora'

/** Agent helper: choose the best template id for an industry/role string. */
export function recommendTemplate(industry = '', role = ''): TemplateId {
  const hay = `${industry} ${role}`.toLowerCase()
  let best: { id: TemplateId; score: number } = { id: defaultTemplateId, score: 0 }
  for (const t of TEMPLATES) {
    const score = t.bestFor.reduce((acc, key) => (hay.includes(key) ? acc + 1 : acc), 0)
    if (score > best.score) best = { id: t.id, score }
  }
  return best.id
}
