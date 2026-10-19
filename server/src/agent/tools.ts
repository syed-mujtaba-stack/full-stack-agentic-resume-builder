import {
  type AtsReport,
  type JobTarget,
  type ResumeDocument,
  type TemplateId,
  INDUSTRY_MAP,
  INDUSTRY_PROFILES,
  TEMPLATES,
  detectIndustry,
  extractJobKeywords,
  hydrateResumeDocument,
  recommendTemplate,
} from '@arbor/shared'
import { scoreResume } from '../lib/ats'
import type { ToolSpec } from './openrouter'
import { improveBullet } from './offline'

export type Draft = {
  document: ResumeDocument
  templateId: TemplateId
  jobTarget: JobTarget | null
  notes: string[]
  changed: boolean
}

export const TOOL_SPECS: ToolSpec[] = [
  {
    type: 'function',
    function: {
      name: 'inspect_resume',
      description: 'Read the current resume draft (condensed). Call this first.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'industry_keywords',
      description:
        'Return the recruiter keyword, action-verb and metric library for an industry. Use it before writing bullets or skills.',
      parameters: {
        type: 'object',
        properties: { industry: { type: 'string', description: 'Industry id or free text, e.g. "software"' } },
        required: ['industry'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_profile',
      description: 'Update contact details and the professional headline at the top of the resume.',
      parameters: {
        type: 'object',
        properties: {
          fullName: { type: 'string' },
          headline: { type: 'string', description: 'Target-role headline, e.g. "Senior Frontend Engineer"' },
          email: { type: 'string' },
          phone: { type: 'string' },
          location: { type: 'string', description: 'City, Country' },
          website: { type: 'string' },
          linkedin: { type: 'string' },
          github: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_summary',
      description:
        'Write the professional summary: 3–4 lines, no buzzwords, mirrors the target role and includes the strongest quantified proof.',
      parameters: {
        type: 'object',
        properties: { summary: { type: 'string' } },
        required: ['summary'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'replace_experience',
      description:
        'Replace ALL experience entries. Each entry needs company, role, location, startDate, endDate, current, bullets (3–5, verb-first, quantified, ≤ 24 words), tech.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                company: { type: 'string' },
                role: { type: 'string' },
                location: { type: 'string' },
                startDate: { type: 'string' },
                endDate: { type: 'string' },
                current: { type: 'boolean' },
                bullets: { type: 'array', items: { type: 'string' } },
                tech: { type: 'array', items: { type: 'string' } },
              },
              required: ['company', 'role', 'bullets'],
            },
          },
        },
        required: ['items'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'replace_education',
      description: 'Replace ALL education entries.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                school: { type: 'string' },
                degree: { type: 'string' },
                field: { type: 'string' },
                location: { type: 'string' },
                startDate: { type: 'string' },
                endDate: { type: 'string' },
                gpa: { type: 'string' },
                details: { type: 'array', items: { type: 'string' } },
              },
              required: ['school'],
            },
          },
        },
        required: ['items'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'replace_skills',
      description:
        'Replace ALL skill groups. 3–5 groups with recruiter-scannable names (Languages, Frontend, Cloud & DevOps, …).',
      parameters: {
        type: 'object',
        properties: {
          groups: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, items: { type: 'array', items: { type: 'string' } } },
              required: ['name', 'items'],
            },
          },
        },
        required: ['groups'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'replace_projects',
      description: 'Replace ALL projects. Include links and measurable outcomes where possible.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                role: { type: 'string' },
                link: { type: 'string' },
                startDate: { type: 'string' },
                endDate: { type: 'string' },
                description: { type: 'string' },
                bullets: { type: 'array', items: { type: 'string' } },
                tech: { type: 'array', items: { type: 'string' } },
              },
              required: ['name'],
            },
          },
        },
        required: ['items'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'replace_certifications',
      description: 'Replace ALL certifications.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                issuer: { type: 'string' },
                date: { type: 'string' },
                credentialId: { type: 'string' },
                link: { type: 'string' },
              },
              required: ['name'],
            },
          },
        },
        required: ['items'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rewrite_bullets',
      description:
        'Run bullets through the deterministic impact engine: strong verb first, passive→active, filler removed, ≤ 28 words, metric placeholder [X]% when no number exists.',
      parameters: {
        type: 'object',
        properties: { bullets: { type: 'array', items: { type: 'string' } } },
        required: ['bullets'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'score_resume',
      description: 'Score the current draft with the ATS engine and return the report so you can iterate.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'recommend_template',
      description: 'Pick the best visual template for a role/industry.',
      parameters: {
        type: 'object',
        properties: { industry: { type: 'string' }, role: { type: 'string' } },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'finalize',
      description: 'Finish the run and write a short note explaining what changed.',
      parameters: {
        type: 'object',
        properties: { notes: { type: 'array', items: { type: 'string' } } },
        required: ['notes'],
        additionalProperties: false,
      },
    },
  },
]

/* ------------------------------------------------------------------ */
/* Executor                                                            */
/* ------------------------------------------------------------------ */

export type ToolResult = { ok: boolean; label: string; data: unknown }

export function condenseDocument(doc: ResumeDocument) {
  return {
    profile: doc.profile,
    summary: doc.summary,
    experience: doc.experience.map((e) => ({
      company: e.company,
      role: e.role,
      dates: `${e.startDate} - ${e.current ? 'Present' : e.endDate}`,
      bullets: e.bullets,
      tech: e.tech,
    })),
    education: doc.education.map((e) => `${e.degree} ${e.field} — ${e.school} (${e.startDate} - ${e.endDate})`),
    skills: doc.skills.map((s) => ({ name: s.name, items: s.items })),
    projects: doc.projects.map((p) => ({ name: p.name, bullets: p.bullets, tech: p.tech, link: p.link })),
    certifications: doc.certifications.map((c) => `${c.name} — ${c.issuer}`),
    languages: doc.languages,
    awards: doc.awards,
    custom: doc.custom,
    template: doc.meta,
  }
}

export function executeTool(name: string, args: Record<string, unknown>, draft: Draft): ToolResult {
  const doc = draft.document
  switch (name) {
    case 'inspect_resume':
      return { ok: true, label: 'Read the current draft', data: condenseDocument(doc) }

    case 'industry_keywords': {
      const raw = String(args.industry ?? '')
      const profile = INDUSTRY_MAP[raw] ?? detectIndustry(raw)
      return {
        ok: true,
        label: `Loaded ${profile.label} keyword library`,
        data: {
          id: profile.id,
          label: profile.label,
          keywords: profile.keywords.slice(0, 40),
          verbs: profile.verbs,
          metrics: profile.metrics,
          availableIndustries: INDUSTRY_PROFILES.map((p) => p.id),
        },
      }
    }

    case 'set_profile': {
      const allowed = ['fullName', 'headline', 'email', 'phone', 'location', 'website', 'linkedin', 'github'] as const
      for (const key of allowed) {
        const v = args[key]
        if (typeof v === 'string') doc.profile[key] = v.slice(0, 300)
      }
      draft.changed = true
      return { ok: true, label: 'Updated the header', data: doc.profile }
    }

    case 'write_summary': {
      doc.summary = String(args.summary ?? '').slice(0, 1500)
      draft.changed = true
      return { ok: true, label: 'Rewrote the professional summary', data: { length: doc.summary.length } }
    }

    case 'replace_experience': {
      const items = Array.isArray(args.items) ? (args.items as Record<string, unknown>[]) : []
      doc.experience = items.slice(0, 20).map((it) => ({
        id: String(it.id ?? `exp_${Math.random().toString(36).slice(2, 10)}`),
        company: String(it.company ?? ''),
        role: String(it.role ?? ''),
        location: String(it.location ?? ''),
        startDate: String(it.startDate ?? ''),
        endDate: String(it.endDate ?? ''),
        current: Boolean(it.current),
        bullets: Array.isArray(it.bullets) ? (it.bullets as string[]).map((b) => String(b).slice(0, 500)).slice(0, 8) : [],
        tech: Array.isArray(it.tech) ? (it.tech as string[]).map((t) => String(t).slice(0, 60)).slice(0, 20) : [],
      }))
      draft.changed = true
      return { ok: true, label: `Wrote ${doc.experience.length} role(s)`, data: { roles: doc.experience.length } }
    }

    case 'replace_education': {
      const items = Array.isArray(args.items) ? (args.items as Record<string, unknown>[]) : []
      doc.education = items.slice(0, 12).map((it) => ({
        id: String(it.id ?? `edu_${Math.random().toString(36).slice(2, 10)}`),
        school: String(it.school ?? ''),
        degree: String(it.degree ?? ''),
        field: String(it.field ?? ''),
        location: String(it.location ?? ''),
        startDate: String(it.startDate ?? ''),
        endDate: String(it.endDate ?? ''),
        gpa: String(it.gpa ?? ''),
        details: Array.isArray(it.details) ? (it.details as string[]).map((d) => String(d).slice(0, 400)).slice(0, 6) : [],
      }))
      draft.changed = true
      return { ok: true, label: `Wrote ${doc.education.length} education entr(ies)`, data: { count: doc.education.length } }
    }

    case 'replace_skills': {
      const groups = Array.isArray(args.groups) ? (args.groups as Record<string, unknown>[]) : []
      doc.skills = groups.slice(0, 8).map((g) => ({
        id: String(g.id ?? `skl_${Math.random().toString(36).slice(2, 10)}`),
        name: String(g.name ?? 'Skills'),
        items: Array.isArray(g.items) ? (g.items as string[]).map((i) => String(i).slice(0, 60)).slice(0, 30) : [],
      }))
      draft.changed = true
      return { ok: true, label: `Grouped skills into ${doc.skills.length} section(s)`, data: doc.skills.map((s) => s.name) }
    }

    case 'replace_projects': {
      const items = Array.isArray(args.items) ? (args.items as Record<string, unknown>[]) : []
      doc.projects = items.slice(0, 12).map((it) => ({
        id: String(it.id ?? `prj_${Math.random().toString(36).slice(2, 10)}`),
        name: String(it.name ?? ''),
        role: String(it.role ?? ''),
        link: String(it.link ?? ''),
        startDate: String(it.startDate ?? ''),
        endDate: String(it.endDate ?? ''),
        description: String(it.description ?? '').slice(0, 800),
        bullets: Array.isArray(it.bullets) ? (it.bullets as string[]).map((b) => String(b).slice(0, 500)).slice(0, 8) : [],
        tech: Array.isArray(it.tech) ? (it.tech as string[]).map((t) => String(t).slice(0, 60)).slice(0, 20) : [],
      }))
      draft.changed = true
      return { ok: true, label: `Wrote ${doc.projects.length} project(s)`, data: { count: doc.projects.length } }
    }

    case 'replace_certifications': {
      const items = Array.isArray(args.items) ? (args.items as Record<string, unknown>[]) : []
      doc.certifications = items.slice(0, 20).map((it) => ({
        id: String(it.id ?? `cert_${Math.random().toString(36).slice(2, 10)}`),
        name: String(it.name ?? ''),
        issuer: String(it.issuer ?? ''),
        date: String(it.date ?? ''),
        credentialId: String(it.credentialId ?? ''),
        link: String(it.link ?? ''),
      }))
      draft.changed = true
      return { ok: true, label: `Wrote ${doc.certifications.length} certification(s)`, data: { count: doc.certifications.length } }
    }

    case 'rewrite_bullets': {
      const bullets = Array.isArray(args.bullets) ? (args.bullets as string[]) : []
      const industry = detectIndustry(`${doc.profile.headline} ${doc.summary} ${doc.skills.flatMap((s) => s.items).join(' ')}`)
      const improved = bullets.map((b) =>
        improveBullet(String(b), {
          industry,
          role: doc.profile.headline,
          years: 0,
          tech: doc.skills.flatMap((s) => s.items),
        }),
      )
      return { ok: true, label: `Polished ${improved.length} bullet(s)`, data: improved }
    }

    case 'score_resume': {
      const report: AtsReport = scoreResume(doc, draft.jobTarget)
      return {
        ok: true,
        label: `ATS score ${report.score}/100`,
        data: {
          score: report.score,
          grade: report.grade,
          breakdown: report.breakdown,
          missingKeywords: report.missingKeywords.slice(0, 20),
          issues: report.issues.map((i) => `${i.severity}: ${i.title} — ${i.detail}`),
          suggestions: report.suggestions.slice(0, 8),
        },
      }
    }

    case 'recommend_template': {
      const id = recommendTemplate(String(args.industry ?? ''), String(args.role ?? ''))
      draft.templateId = id
      const meta = TEMPLATES.find((t) => t.id === id)
      return { ok: true, label: `Template → ${meta?.name ?? id}`, data: { id, name: meta?.name, atsSafe: meta?.atsSafe } }
    }

    case 'finalize': {
      const notes = Array.isArray(args.notes) ? (args.notes as unknown[]).map((n) => String(n)) : []
      draft.notes = notes
      return { ok: true, label: 'Finished', data: { notes } }
    }

    default:
      return { ok: false, label: `Unknown tool ${name}`, data: null }
  }
}

export function makeDraft(document: ResumeDocument, templateId: TemplateId, jobTarget: JobTarget | null): Draft {
  return {
    document: hydrateResumeDocument(document) as ResumeDocument,
    templateId,
    jobTarget,
    notes: [],
    changed: false,
  }
}

export { scoreResume, extractJobKeywords }
