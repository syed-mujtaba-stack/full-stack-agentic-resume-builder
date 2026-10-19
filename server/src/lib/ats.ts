import {
  type AtsReport,
  type JobTarget,
  type ResumeDocument,
  computeCompleteness,
  countWords,
  detectIndustry,
  estimatePages,
  extractJobKeywords,
} from '@arbor/shared'

/**
 * Deterministic ATS / recruiter scoring engine.
 *
 * Runs offline, is fully explainable, and is used both by the UI and by the
 * agent (as the `score_resume` tool) so the model can iterate against a real
 * number instead of guessing.
 */

const QUANTIFIER = /(\d[\d,.]*\s*(%|percent|x|k|m|bn|usd|\$|€|£)?)|(\b\d{2,}\b)|(\b(one|two|three|four|five|six|seven|eight|nine|ten)\b)/i
const PASSIVE = /\b(was|were|been|being)\s+\w+(ed|en)\b/i
const FILLER = /\b(very|really|quite|basically|actually|simply|various|several|many|some|a lot of)\b/i
const BUZZWORDS = /\b(team player|hard.?working|go.?getter|think outside the box|synergy| ninja|guru|rockstar|detail.?oriented person)\b/i

const ACTION_VERBS = new Set(
  ('led built designed delivered improved launched owned streamlined grew reduced automated scaled coordinated managed created drove optimized partnered mentored negotiated architected engineered shipped refactored deployed integrated migrated hardened instrumented forecasted analyzed modelled taught assessed closed sourced expanded implemented maintained resolved authored presented negotiated surveyed audited diagnosed standardized'.split(
    ' ',
  )),
)

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+#.\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function keywordScore(doc: ResumeDocument, job: JobTarget | null | undefined) {
  const text = normalize(
    [
      doc.summary,
      ...doc.experience.flatMap((e) => [e.role, ...e.bullets, ...e.tech]),
      ...doc.skills.flatMap((s) => [s.name, ...s.items]),
      ...doc.projects.flatMap((p) => [p.name, p.description, ...p.bullets, ...p.tech]),
      ...doc.certifications.map((c) => `${c.name} ${c.issuer}`),
    ].join(' '),
  )

  if (job?.jobDescription?.trim() || job?.keywords?.length) {
    const wanted =
      job.keywords?.length && job.keywords.length > 3
        ? job.keywords
        : extractJobKeywords(job.jobDescription ?? '', 35)
    const matched: string[] = []
    const missing: string[] = []
    for (const kw of wanted) {
      const k = normalize(kw)
      if (!k) continue
      const re = new RegExp(`(^|\\s)${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$|\\.|,|/|-)`, 'i')
      if (re.test(text) || (k.includes(' ') && text.includes(k))) matched.push(kw)
      else missing.push(kw)
    }
    const total = matched.length + missing.length || 1
    const score = Math.round((matched.length / total) * 100)
    return { score, matched, missing: missing.slice(0, 20), tailored: true }
  }

  const industry = detectIndustry(`${doc.profile.headline} ${doc.summary} ${doc.skills.flatMap((s) => s.items).join(' ')}`)
  const matched: string[] = []
  const missing: string[] = []
  for (const kw of industry.keywords.slice(0, 30)) {
    const k = normalize(kw)
    const re = new RegExp(`(^|\\s)${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$|\\.|,|/|-)`, 'i')
    if (re.test(text) || (k.includes(' ') && text.includes(k))) matched.push(kw)
    else missing.push(kw)
  }
  // Without a JD we only expect a sensible share of industry keywords to appear.
  const coverage = matched.length / Math.max(8, Math.min(15, industry.keywords.length * 0.4))
  return {
    score: Math.round(Math.min(100, coverage * 100)),
    matched,
    missing: missing.slice(0, 6),
    tailored: false,
  }
}

function impactScore(doc: ResumeDocument) {
  const bullets = doc.experience.flatMap((e) => e.bullets).filter((b) => b && b.trim())
  if (!bullets.length) return { score: 0, stats: { bullets: 0, quantified: 0, verbLed: 0 } }
  let quantified = 0
  let verbLed = 0
  let junk = 0
  for (const b of bullets) {
    if (QUANTIFIER.test(b)) quantified += 1
    const first = b.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? ''
    if (ACTION_VERBS.has(first)) verbLed += 1
    if (PASSIVE.test(b) || BUZZWORDS.test(b)) junk += 1
  }
  const q = quantified / bullets.length
  const v = verbLed / bullets.length
  const penalty = junk / bullets.length
  const score = Math.round(Math.max(0, Math.min(100, (q * 60 + v * 40 - penalty * 25) * 1)))
  return { score, stats: { bullets: bullets.length, quantified, verbLed } }
}

function structureScore(doc: ResumeDocument) {
  let score = 0
  const parts: number[] = []
  const has = (cond: boolean, weight: number) => {
    parts.push(cond ? weight : 0)
  }
  has(!!doc.profile.fullName.trim(), 10)
  has(/\S+@\S+\.\S+/.test(doc.profile.email), 10)
  has(doc.profile.phone.trim().length > 6, 6)
  has(!!doc.profile.location.trim(), 6)
  has(!!doc.profile.headline.trim(), 8)
  has(doc.summary.trim().length > 80 || doc.profile.summary.trim().length > 80, 12)
  has(doc.experience.length > 0, 14)
  has(doc.experience.every((e) => !!e.startDate), 6)
  has(doc.education.length > 0, 8)
  has(doc.skills.some((s) => s.items.length > 3), 10)
  has(!!doc.profile.linkedin || !!doc.profile.github || !!doc.profile.website, 6)
  has(doc.meta.hidden.length === 0 || doc.meta.hidden.length < 4, 4)
  score = parts.reduce((a, b) => a + b, 0)
  return { score: Math.min(100, score) }
}

function readabilityScore(doc: ResumeDocument) {
  const bullets = [...doc.experience.flatMap((e) => e.bullets), ...doc.projects.flatMap((p) => p.bullets)].filter((b) =>
    b?.trim(),
  )
  if (!bullets.length) {
    const summary = doc.summary.trim()
    return { score: summary ? 55 : 0, avgWords: 0 }
  }
  const words = bullets.map((b) => b.trim().split(/\s+/).length)
  const avg = words.reduce((a, b) => a + b, 0) / words.length
  const tooLong = words.filter((w) => w > 32).length / words.length
  const tooShort = words.filter((w) => w < 6).length / words.length
  const filler = bullets.filter((b) => FILLER.test(b)).length / bullets.length
  const passive = bullets.filter((b) => PASSIVE.test(b)).length / bullets.length
  let score = 100
  score -= Math.abs(avg - 20) * 1.6
  score -= tooLong * 45
  score -= tooShort * 25
  score -= filler * 20
  score -= passive * 25
  return { score: Math.round(Math.max(0, Math.min(100, score))), avgWords: Math.round(avg) }
}

function grade(score: number): AtsReport['grade'] {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

export function scoreResume(doc: ResumeDocument, job?: JobTarget | null): AtsReport {
  const kw = keywordScore(doc, job)
  const impact = impactScore(doc)
  const structure = structureScore(doc)
  const readability = readabilityScore(doc)
  const completeness = computeCompleteness(doc)

  const weights = { keywords: 0.28, impact: 0.24, structure: 0.2, readability: 0.13, completeness: 0.15 }
  const raw =
    kw.score * weights.keywords +
    impact.score * weights.impact +
    structure.score * weights.structure +
    readability.score * weights.readability +
    completeness.score * weights.completeness
  const score = Math.round(Math.max(0, Math.min(100, raw)))

  const issues: AtsReport['issues'] = []
  const suggestions: string[] = []

  if (kw.tailored && kw.missing.length > 3) {
    issues.push({
      id: 'keywords-missing',
      severity: kw.missing.length > 8 ? 'critical' : 'warning',
      title: `${kw.missing.length} keywords from the job post are missing`,
      detail: `Add these where they are genuinely true: ${kw.missing.slice(0, 8).join(', ')}.`,
      section: 'skills',
    })
    suggestions.push('Mirror the job post language in your skills and experience bullets.')
  }
  if (!kw.tailored) {
    suggestions.push('Paste a job description to switch keyword scoring on and get a tailored score.')
  }
  if (impact.stats.bullets && impact.stats.quantified / impact.stats.bullets < 0.5) {
    issues.push({
      id: 'quantify',
      severity: 'critical',
      title: 'Most bullets have no numbers',
      detail: `Only ${impact.stats.quantified} of ${impact.stats.bullets} bullets are quantified. Recruiters skim for metrics.`,
      section: 'experience',
    })
    suggestions.push('Add a metric to every bullet: %, count, time saved, revenue, latency, volume.')
  }
  if (impact.stats.bullets && impact.stats.verbLed / impact.stats.bullets < 0.6) {
    issues.push({
      id: 'verbs',
      severity: 'warning',
      title: 'Start bullets with strong verbs',
      detail: 'Open with Led, Shipped, Reduced, Automated — not "Responsible for".',
      section: 'experience',
    })
  }
  if (readability.avgWords > 30) {
    issues.push({
      id: 'long-bullets',
      severity: 'warning',
      title: 'Bullets are too long',
      detail: `Average bullet length is ${readability.avgWords} words. Aim for 14–24.`,
      section: 'experience',
    })
  }
  if (structure.score < 70) {
    issues.push({
      id: 'structure',
      severity: 'critical',
      title: 'Contact or core sections incomplete',
      detail: 'ATS parsers need a clean header and standard section headings.',
      section: 'profile',
    })
  }
  if (estimatePages(doc) > 2.2) {
    issues.push({
      id: 'length',
      severity: 'warning',
      title: 'Resume looks long',
      detail: `Estimated ${estimatePages(doc)} pages. Keep it to 1 page (< 10 yrs) or 2 pages (senior).`,
    })
    suggestions.push('Trim older roles to one line and cut bullets older than 8–10 years.')
  }
  for (const hint of completeness.missing.slice(0, 4)) suggestions.push(hint)

  const passiveBullets = [...doc.experience.flatMap((e) => e.bullets)].filter((b) => PASSIVE.test(b)).length
  if (passiveBullets > 0) {
    issues.push({
      id: 'passive',
      severity: 'tip',
      title: `${passiveBullets} bullet(s) use passive voice`,
      detail: 'Rewrite as "Shipped X" instead of "X was shipped".',
      section: 'experience',
    })
  }

  return {
    score,
    grade: grade(score),
    breakdown: {
      keywords: Math.round(kw.score),
      impact: Math.round(impact.score),
      structure: Math.round(structure.score),
      readability: Math.round(readability.score),
      completeness: completeness.score,
    },
    matchedKeywords: kw.matched,
    missingKeywords: kw.missing,
    issues,
    suggestions: [...new Set(suggestions)],
    wordCount: countWords(doc),
    estimatedPages: estimatePages(doc),
    scannedAt: new Date().toISOString(),
    tailored: kw.tailored,
  }
}

export { extractJobKeywords }
