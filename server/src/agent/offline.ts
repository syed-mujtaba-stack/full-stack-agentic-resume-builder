import {
  type AgentStep,
  type AtsReport,
  type Experience,
  type IndustryProfile,
  type JobTarget,
  type Project,
  type ResumeDocument,
  type SkillGroup,
  type TemplateId,
  computeCompleteness,
  detectIndustry,
  emptyProject,
  extractJobKeywords,
  INDUSTRY_MAP,
  looksLikeSkill,
  hydrateResumeDocument,
  parseIntake,
  recommendTemplate,
  uid,
} from '@arbor/shared'
import { scoreResume } from '../lib/ats'

/**
 * Nova — the offline agent engine.
 *
 * Deterministic, zero-cost, runs without any API key. It is not a toy: it
 * rewrites bullets with strong verbs, injects metric placeholders, groups
 * skills the way recruiters scan them, mirrors job-post keywords and scores
 * the result with the real ATS engine. When an OpenRouter key is present the
 * LLM agent takes over and Nova becomes the fallback / safety net.
 */

export type OfflineResult = {
  document: ResumeDocument
  steps: AgentStep[]
  messages: string[]
  templateId: TemplateId
  ats: AtsReport
  jobTarget: JobTarget | null
}

type Ctx = {
  industry: IndustryProfile
  role: string
  years: number
  tech: string[]
}

/* ------------------------------------------------------------------ */
/* Bullet engineering                                                  */
/* ------------------------------------------------------------------ */

const VERB_BY_HINT: [RegExp, string][] = [
  [/automat|script|pipeline|ci\/cd|deploy/i, 'Automated'],
  [/led|lead|manage|mentor|coach|own|spearhead/i, 'Led'],
  [/reduc|cut|sav|optimi[sz]|improv|speed|latency|performance|faster/i, 'Reduced'],
  [/designed|design|architect|system|schema|model/i, 'Architected'],
  [/built|build|creat|develop|implement|wrote|wrote|engineer/i, 'Built'],
  [/migrat|upgrade|port(ed)?|moderni/i, 'Migrated'],
  [/launch|ship|releas|deliver/i, 'Shipped'],
  [/grew|grow|increas|scale|expand|acquir/i, 'Scaled'],
  [/analy[sz]|report|forecast|measur|track|dash/i, 'Analyzed'],
  [/collaborat|partner|coordinate|work(ed)? with|align/i, 'Partnered'],
  [/fix|debug|resolv|troubleshoot|incident|bug/i, 'Resolved'],
  [/test|qa|coverage|valid/i, 'Validated'],
  [/research|discovery|interview|survey|usability/i, 'Researched'],
  [/negotiat|clos(ed|e)|sold|sale/i, 'Closed'],
  [/teach|train|educat|onboard/i, 'Trained'],
]

const WEAK_OPEN = /^(worked on|responsible for|responsible to|helped (with|to)?|assisted (with|in)?|involved in|tasked with|duties included|participated in|was in charge of|took part in)\s+/i

const FILLERS = /\b(very|really|quite|basically|actually|simply|just|various|several|numerous|multiple|etc\.?)\b\s*/gi

function pickVerb(text: string, ctx: Ctx): string {
  for (const [re, verb] of VERB_BY_HINT) if (re.test(text)) return verb
  const hash = [...text].reduce((a, c) => a + c.charCodeAt(0), 0)
  return ctx.industry.verbs[hash % ctx.industry.verbs.length] ?? 'Delivered'
}

function tidy(sentence: string): string {
  let s = sentence.replace(/\s+/g, ' ').trim()
  s = s.replace(FILLERS, '')
  s = s.replace(/^(and|also|then|so)\s+/i, '')
  s = s.replace(/\bi\b/g, 'I')
  s = s.charAt(0).toUpperCase() + s.slice(1)
  if (!/[.?!]$/.test(s)) s += '.'
  return s
}

const ACRONYMS: [RegExp, string][] = [
  [/\bapi\b/gi, 'API'],
  [/\bapis\b/gi, 'APIs'],
  [/\bui\b/gi, 'UI'],
  [/\bux\b/gi, 'UX'],
  [/\bsql\b/gi, 'SQL'],
  [/\bhtml\b/gi, 'HTML'],
  [/\bcss\b/gi, 'CSS'],
  [/\bjson\b/gi, 'JSON'],
  [/\baws\b/gi, 'AWS'],
  [/\bgcp\b/gi, 'GCP'],
  [/\bazure\b/gi, 'Azure'],
  [/\bci\/cd\b/gi, 'CI/CD'],
  [/\bkpi\b/gi, 'KPI'],
  [/\bseo\b/gi, 'SEO'],
  [/\bcrm\b/gi, 'CRM'],
  [/\betl\b/gi, 'ETL'],
  [/\bqa\b/gi, 'QA'],
  [/\bnode\.js\b/gi, 'Node.js'],
  [/\bnext\.js\b/gi, 'Next.js'],
  [/\breact\b/gi, 'React'],
  [/\bjavascript\b/gi, 'JavaScript'],
  [/\btypescript\b/gi, 'TypeScript'],
  [/\bgraphql\b/gi, 'GraphQL'],
  [/\bpostgres(ql)?\b/gi, 'PostgreSQL'],
  [/\bkubernetes\b/gi, 'Kubernetes'],
  [/\bdocker\b/gi, 'Docker'],
  [/\bjira\b/gi, 'Jira'],
]

export function fixAcronyms(text: string): string {
  let out = text
  for (const [re, replacement] of ACRONYMS) out = out.replace(re, replacement)
  return out
}

function hasNumber(s: string): boolean {
  return /\d/.test(s)
}

function truncateWords(s: string, max: number): string {
  const words = s.split(' ')
  if (words.length <= max) return s
  const cut = words.slice(0, max).join(' ').replace(/[,;:]$/, '')
  return `${cut}.`
}

export function improveBullet(raw: string, ctx: Ctx): string {
  let s = raw.trim()
  if (!s) return s
  s = s.replace(/^[-•*\d.)\s]+/, '')
  // "Responsible for leading X" -> "Led X"
  s = s.replace(WEAK_OPEN, '')
  const passive = s.match(/^(was|were)\s+(\w+ed)\s+(.+)$/i)
  if (passive) s = `${passive[2]} ${passive[3]}`

  // Verb-first check
  const firstWord = (s.split(/\s+/)[0] ?? '').replace(/[^A-Za-z]/g, '')
  const isVerbLed = ctx.industry.verbs.concat(['Led', 'Built', 'Shipped', 'Owned', 'Delivered', 'Grew', 'Ran', 'Drove']).some(
    (v) => v.toLowerCase() === firstWord.toLowerCase(),
  )
  if (!isVerbLed) {
    // Past-tense verb already? ("Managed ...") keep it, just capitalise.
    if (/^(managed|created|developed|designed|implemented|maintained|supported|coordinated|delivered|improved)\b/i.test(s)) {
      s = s.charAt(0).toUpperCase() + s.slice(1)
    } else {
      const verb = pickVerb(s, ctx)
      let rest = s.charAt(0).toLowerCase() + s.slice(1)
      // "responsible for building dashboards" -> "Built dashboards" (drop the gerund)
      const gerund = rest.match(/^([a-z]{4,}ing)\s+/)
      if (gerund) rest = rest.slice(gerund[0].length)
      s = `${verb} ${rest}`
    }
  }

  s = tidy(s)
  s = fixAcronyms(s)
  s = truncateWords(s, 28)

  if (!hasNumber(s)) {
    const metric = ctx.industry.metrics[0] ?? 'impact'
    s = s.replace(/\.$/, '') + `, delivering a measurable [X]% improvement in ${metric}.`
  }
  return s
}

const BULLET_TEMPLATES: ((c: { role: string; company: string; tech: string; metric: string; verb: string }) => string)[] = [
  (c) => `${c.verb} end-to-end ${c.role.toLowerCase()} work at ${c.company}, shipping features on ${c.tech} used across the product.`,
  (c) => `Partnered with product and design to scope, build and release ${c.tech} initiatives, improving ${c.metric} by [X]%.`,
  (c) => `Owned reliability and quality for ${c.tech} systems — cut defects/escalations by [X]% through reviews and testing.`,
  (c) => `Automated manual workflows around ${c.tech}, saving the team [X] hours per week.`,
  (c) => `Mentored [X] teammates and documented standards adopted across the ${c.role.toLowerCase()} team.`,
]

function generateBullets(exp: Experience, ctx: Ctx, count = 4): string[] {
  const tech = exp.tech.length ? exp.tech.slice(0, 3).join(', ') : ctx.tech.slice(0, 3).join(', ') || 'core systems'
  const company = exp.company?.trim() || 'the team'
  const role = exp.role?.trim() || ctx.role || 'this role'
  return BULLET_TEMPLATES.slice(0, count).map((tpl) =>
    tpl({
      role,
      company,
      tech,
      metric: ctx.industry.metrics[0] ?? 'delivery speed',
      verb: ctx.industry.verbs[0] ?? 'Delivered',
    }),
  )
}

/* ------------------------------------------------------------------ */
/* Skills grouping                                                     */
/* ------------------------------------------------------------------ */

const GROUP_RULES: { name: string; match: RegExp }[] = [
  { name: 'Languages', match: /^(javascript|typescript|python|java|c\+\+|c#|go|golang|rust|ruby|php|swift|kotlin|scala|sql|html|css|dart|r)$/i },
  { name: 'Frontend', match: /react|next\.?js|vue|angular|svelte|tailwind|redux|vite|webpack|framer|three\.?js|gsap|figma|css|html/i },
  { name: 'Backend & APIs', match: /node|express|nest|django|flask|fastapi|spring|rails|graphql|rest|grpc|microservice/i },
  { name: 'Data & Analytics', match: /sql|postgres|mysql|mongo|redis|snowflake|bigquery|spark|airflow|dbt|etl|pandas|tableau|looker|power ?bi|warehouse/i },
  { name: 'Cloud & DevOps', match: /aws|gcp|azure|docker|kubernetes|terraform|ansible|jenkins|github actions|ci\/cd|linux|nginx|serverless|helm|argocd/i },
  { name: 'Security', match: /security|siem|soc|pentest|iam|zero ?trust|iso ?27001|nist|soc ?2|encrypt/i },
  { name: 'Design & Research', match: /figma|design system|prototyp|wireframe|user research|usability|accessib|wcag|brand|typography|motion/i },
  { name: 'Product & Growth', match: /roadmap|prd|discovery|okr|stakeholder|go-to-market|a\/b|analytics|seo|growth|crm|salesforce|hubspot|jira|scrum|agile/i },
  { name: 'Finance', match: /excel|financial model|forecast|budget|p&l|gaap|ifrs|audit|tax|valuation|dcf|sap|oracle/i },
  { name: 'Healthcare', match: /patient|clinical|hipaa|ehr|emr|triage|cpr|bls|aclr?|phlebotom|icd|care plan/i },
  { name: 'Tools & Ways of Working', match: /git|github|gitlab|jira|confluence|notion|slack|linear|agile|scrum|kanban|kanban|leadership|mentor|communicat|collaborat|problem solving|stakeholder/i },
]

export function groupSkills(skills: string[], industry: IndustryProfile): SkillGroup[] {
  const groups = new Map<string, string[]>()
  const known = new Set(industry.keywords.map((k) => k.toLowerCase()))

  for (const raw of skills) {
    const s = raw.trim()
    if (!s) continue
    let placed = false
    for (const rule of GROUP_RULES) {
      if (rule.match.test(s)) {
        const list = groups.get(rule.name) ?? []
        if (!list.some((x) => x.toLowerCase() === s.toLowerCase())) list.push(s)
        groups.set(rule.name, list)
        placed = true
        break
      }
    }
    if (!placed) {
      const isKnown = known.has(s.toLowerCase())
      const name = isKnown ? 'Core Competencies' : 'Additional Skills'
      const list = groups.get(name) ?? []
      if (!list.some((x) => x.toLowerCase() === s.toLowerCase())) list.push(s)
      groups.set(name, list)
    }
  }

  const order = [...GROUP_RULES.map((g) => g.name), 'Core Competencies', 'Additional Skills']
  const result: SkillGroup[] = [...groups.entries()]
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .filter(([, items]) => items.length > 0)
    .map(([name, items]) => ({ id: uid('skl'), name, items: items.slice(0, 24) }))

  return result.length ? result : [{ id: uid('skl'), name: 'Core Skills', items: [] }]
}

/* ------------------------------------------------------------------ */
/* Summary + headline                                                  */
/* ------------------------------------------------------------------ */

export function buildSummary(ctx: Ctx, extra: { tailoredKeywords?: string[] } = {}): string {
  const templates = ctx.industry.summaries
  const tpl = templates[0] ?? '{{role}} with {{years}} of experience delivering results with {{skill}}.'
  const topSkills = ctx.tech.slice(0, 3).join(', ') || ctx.industry.keywords.slice(0, 3).join(', ')
  let summary = tpl
    .replace(/\{\{role\}\}/g, ctx.role ? titleWords(ctx.role) : 'Professional')
    .replace(/\{\{years\}\}/g, ctx.years > 0 ? `${ctx.years}+ years` : 'several years')
    .replace(/\{\{skill\}\}/g, topSkills)
  if (extra.tailoredKeywords?.length) {
    summary += ` Strengths mapped to this role: ${extra.tailoredKeywords.slice(0, 6).join(', ')}.`
  }
  return summary
}

function titleWords(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w.length > 2 && w === w.toLowerCase() ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ')
}

export function buildHeadline(ctx: Ctx, seniority?: string): string {
  const role = ctx.role ? titleWords(ctx.role) : 'Professional'
  const sen = seniority && seniority !== 'mid' ? titleWords(seniority) : ''
  if (!sen) return role
  // Avoid "Senior Senior Engineer" when the role already states the level.
  return new RegExp(`^${sen}\\b`, 'i').test(role) ? role : `${sen} ${role}`
}

/* ------------------------------------------------------------------ */
/* Main entry                                                          */
/* ------------------------------------------------------------------ */

export function runOfflineAgent(
  req: {
    kind: string
    skills?: string
    targetRole?: string
    industry?: string
    seniority?: string
    jobDescription?: string
    yearsExperience?: number
    instructions?: string
    templateId?: string | null
    document?: ResumeDocument | null
  },
  base: ResumeDocument,
): OfflineResult {
  const doc = hydrateResumeDocument(base) as ResumeDocument
  const steps: AgentStep[] = []
  const messages: string[] = []
  const startedAt = Date.now()
  const step = (title: string, detail?: string) => {
    steps.push({ id: uid('step'), index: steps.length, title, detail, state: 'active' })
  }
  const done = () => {
    const s = steps[steps.length - 1]
    if (s) s.state = 'done'
  }

  const intake = parseIntake(req.skills ?? '')
  const roleFromIntake = intake.role
  const role = (req.targetRole || roleFromIntake || doc.profile.headline || '').trim()
  const years = req.yearsExperience ?? intake.years ?? estimateYears(doc)
  const industry = req.industry
    ? detectIndustry(req.industry) && (INDUSTRY_BY_ID(req.industry) ?? detectIndustry(req.industry))
    : detectIndustry(`${role} ${req.skills ?? ''} ${doc.summary} ${doc.skills.flatMap((s) => s.items).join(' ')}`)

  const tech = [...new Set([...intake.skills, ...doc.skills.flatMap((s) => s.items), ...doc.experience.flatMap((e) => e.tech)])]
  const ctx: Ctx = { industry, role, years, tech }

  step('Parse intake', `Extracted ${intake.skills.length} skills and ${years ? `${years} years` : 'unknown tenure'}.`)
  done()
  step('Detect industry', `Matched "${industry.label}" — using its keyword and verb library.`)
  done()

  /* Job targeting -------------------------------------------------- */
  let jobTarget: JobTarget | null = null
  if (req.jobDescription?.trim()) {
    const keywords = extractJobKeywords(req.jobDescription, 35)
    jobTarget = {
      role: role || jobTitleFromJd(req.jobDescription) || '',
      industry: industry.label,
      seniority: (req.seniority as JobTarget['seniority']) ?? 'mid',
      company: '',
      jobDescription: req.jobDescription.slice(0, 20000),
      keywords,
    }
    step('Analyse job description', `Extracted ${keywords.length} target keywords from the posting.`)
    done()
  }

  /* Template -------------------------------------------------------- */
  const templateId = (req.templateId as TemplateId) || recommendTemplate(industry.label, role)
  step('Pick template', `Chose the "${templateId}" layout for ${industry.label.toLowerCase()} roles.`)
  done()

  /* Summary --------------------------------------------------------- */
  const tailoredKeywords = jobTarget?.keywords?.slice(0, 6)
  if (!doc.summary.trim() || jobTarget) {
    doc.summary = buildSummary(ctx, { tailoredKeywords })
    step('Write summary', 'Composed a role-aligned professional summary.')
    done()
  }

  if (role && !doc.profile.headline.trim()) doc.profile.headline = buildHeadline(ctx, req.seniority)

  /* Experience ------------------------------------------------------ */
  let rewritten = 0
  let drafted = 0
  doc.experience = doc.experience.map((exp) => {
    const filled = exp.bullets.filter((b) => b.trim())
    if (filled.length === 0) {
      drafted += 1
      return { ...exp, bullets: generateBullets(exp, ctx, 4) }
    }
    const before = filled.join('|')
    const after = filled.map((b) => improveBullet(b, ctx))
    if (before !== after.join('|')) rewritten += 1
    return { ...exp, bullets: after }
  })

  doc.projects = doc.projects.map((p) => ({
    ...p,
    bullets: p.bullets.filter(Boolean).map((b) => improveBullet(b, ctx)),
  }))

  if (doc.experience.length) {
    step(
      'Engineer bullets',
      rewritten || drafted
        ? `Rewrote ${rewritten} role(s) and drafted bullets for ${drafted} role(s) with metrics placeholders.`
        : 'Bullets already strong — left untouched.',
    )
    done()
  } else {
    messages.push(
      'I did not invent work history — add your roles (company, title, dates) and I will write quantified bullets for each one.',
    )
  }

  /* Skills ---------------------------------------------------------- */
  const flatSkills = [
    ...intake.skills,
    ...doc.skills.flatMap((s) => s.items),
    ...doc.experience.flatMap((e) => e.tech),
  ]
  if (flatSkills.length) {
    doc.skills = groupSkills(flatSkills, industry)
    step('Group skills', `Organised ${flatSkills.length} skills into ${doc.skills.length} recruiter-scannable groups.`)
    done()
  }

  /* Job-description keyword injection -------------------------------- */
  if (jobTarget?.keywords?.length) {
    const existing = new Set(doc.skills.flatMap((s) => s.items).map((s) => s.toLowerCase()))
    const missing = jobTarget.keywords.filter(
      (k) => !existing.has(k.toLowerCase()) && looksLikeSkill(k) && !doc.skills.some((g) => g.name.toLowerCase() === k.toLowerCase()),
    )
    if (missing.length) {
      const target = doc.skills.find((s) => s.name === 'Core Competencies') ?? doc.skills[0]
      if (target) {
        target.items = [...new Set([...target.items, ...missing.slice(0, 12)])]
      } else {
        doc.skills.push({ id: uid('skl'), name: 'Core Competencies', items: missing.slice(0, 12) })
      }
      step('Mirror job keywords', `Wove ${missing.slice(0, 12).length} missing keywords into your skills.`)
      done()
    }
  }

  /* Completeness nudges ---------------------------------------------- */
  const completeness = computeCompleteness(doc)
  if (completeness.score < 70) {
    messages.push(
      `Profile is ${completeness.score}% complete. Next best fixes: ${completeness.missing.slice(0, 3).join(' ')}`,
    )
  }

  /* Projects for skill-only users ------------------------------------ */
  if (doc.experience.length === 0 && doc.projects.length === 0 && intake.skills.length >= 4) {
    const project: Project = {
      ...emptyProject(),
      name: 'Selected Work',
      role: role || 'Project',
      description: '',
      bullets: [
        `Built projects using ${ctx.tech.slice(0, 4).join(', ')} — add links and outcomes so recruiters can verify.`,
      ],
    }
    doc.projects = [project]
  }

  const ats = scoreResume(doc, jobTarget)
  step('ATS scan', `Scored ${ats.score}/100 (${ats.grade}).`)
  ats.issues.slice(0, 3).forEach((i) => messages.push(`${i.title} — ${i.detail}`))
  done()

  const elapsed = Date.now() - startedAt
  steps.push({
    id: uid('step'),
    index: steps.length,
    title: 'Done',
    detail: `Nova finished in ${elapsed}ms with no API call and zero cost.`,
    state: 'done',
  })

  return { document: doc, steps, messages, templateId, ats, jobTarget }
}

function estimateYears(doc: ResumeDocument): number {
  const years = doc.experience
    .map((e) => Number((e.startDate.match(/(19|20)\d{2}/) ?? [])[0] ?? 0))
    .filter((y) => y > 1900)
  if (!years.length) return 0
  const min = Math.min(...years)
  return Math.max(0, new Date().getFullYear() - min)
}

function jobTitleFromJd(jd: string): string {
  const m = jd.match(/^\s*(?:job\s*title|position|role)\s*[:\-]\s*(.{3,60})/im)
  if (m) return m[1]!.trim()
  const first = jd.split('\n').map((l) => l.trim()).find((l) => l.length > 4 && l.length < 80)
  return first ?? ''
}

function INDUSTRY_BY_ID(id: string): IndustryProfile | null {
  return INDUSTRY_MAP[id] ?? null
}

export const __internals = { improveBullet, groupSkills, buildSummary }
