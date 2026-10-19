/**
 * Industry knowledge base.
 *
 * Powers three things:
 *  1. the offline "Nova" agent engine (works with no API key),
 *  2. the `industry_keywords` tool the LLM agent can call,
 *  3. ATS keyword matching / gap analysis.
 */

export type IndustryProfile = {
  id: string
  label: string
  /** Hard skills recruiters' parsers look for. */
  keywords: string[]
  /** Soft/transferable signals. */
  soft: string[]
  /** Strong verbs that fit this domain. */
  verbs: string[]
  /** Metric ideas used to quantify impact. */
  metrics: string[]
  /** Summary formulas ({{role}} {{years}} {{skill}} placeholders). */
  summaries: string[]
}

export const INDUSTRY_PROFILES: IndustryProfile[] = [
  {
    id: 'software',
    label: 'Software Engineering',
    keywords: [
      'typescript','javascript','react','next.js','node.js','python','go','rust','java','c#','graphql','rest api',
      'microservices','docker','kubernetes','aws','gcp','azure','ci/cd','terraform','postgresql','redis','kafka',
      'unit testing','system design','code review','agile','scrum','git','observability','performance optimization',
    ],
    soft: ['cross-functional collaboration', 'mentoring', 'technical leadership', 'ownership', 'documentation'],
    verbs: ['Architected', 'Engineered', 'Shipped', 'Refactored', 'Optimized', 'Automated', 'Deployed', 'Debugged', 'Integrated', 'Scaled'],
    metrics: ['p95 latency', 'requests per second', 'deployment frequency', 'test coverage', 'incident count', 'cost per month'],
    summaries: [
      '{{role}} with {{years}} of experience building and scaling production {{skill}} systems, shipping features used by millions and mentoring engineers along the way.',
      'Product-minded {{role}} specialised in {{skill}}, with {{years}} of experience turning ambiguous problems into reliable, observable software.',
    ],
  },
  {
    id: 'data',
    label: 'Data & Analytics',
    keywords: [
      'sql','python','pandas','dbt','snowflake','bigquery','spark','airflow','etl','elt','data modeling','data warehouse',
      'looker','tableau','power bi','experimentation','a/b testing','statistics','forecasting','machine learning','feature engineering',
    ],
    soft: ['stakeholder communication', 'data storytelling', 'prioritisation'],
    verbs: ['Modelled', 'Forecasted', 'Automated', 'Instrumented', 'Analyzed', 'Validated', 'Delivered', 'Partnered'],
    metrics: ['forecast accuracy', 'reporting hours saved', 'data freshness', 'model lift', 'dashboard adoption'],
    summaries: [
      '{{role}} with {{years}} of experience turning messy data into decisions — from warehouse modelling to executive-ready insights.',
      'Analytics-driven {{role}} who has shipped {{skill}} pipelines and experimentation frameworks adopted across the business.',
    ],
  },
  {
    id: 'design',
    label: 'Product Design',
    keywords: [
      'figma','design systems','wireframing','prototyping','user research','usability testing','information architecture',
      'interaction design','accessibility','wcag','visual design','design tokens','journey mapping','a/b testing','motion design',
    ],
    soft: ['craft', 'empathy', 'facilitation', 'cross-functional partnership'],
    verbs: ['Designed', 'Prototyped', 'Validated', 'Shipped', 'Systematised', 'Facilitated', 'Redesigned', 'Researched'],
    metrics: ['task success rate', 'time on task', 'conversion lift', 'design system adoption', 'NPS'],
    summaries: [
      '{{role}} with {{years}} of experience shipping end-to-end product design — research, systems and pixel-level craft.',
      'Design-led {{role}} who pairs {{skill}} craft with measurable outcomes and tight engineering collaboration.',
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing & Growth',
    keywords: [
      'seo','sem','content strategy','growth loops','lifecycle marketing','email marketing','paid acquisition','google ads',
      'meta ads','hubspot','ga4','conversion rate optimisation','brand positioning','social media','influencer marketing','copywriting',
    ],
    soft: ['storytelling', 'experimentation mindset', 'cross-team influence'],
    verbs: ['Launched', 'Grew', 'Optimised', 'Repositioned', 'Scaled', 'Ran', 'Owned', 'Drove'],
    metrics: ['CAC', 'ROAS', 'MRR', 'conversion rate', 'organic traffic', 'pipeline generated', 'retention'],
    summaries: [
      'Growth-focused {{role}} with {{years}} of experience compounding acquisition through {{skill}} and relentless experimentation.',
      '{{role}} who blends creative storytelling with a {{skill}} numbers backbone — from first touch to retained revenue.',
    ],
  },
  {
    id: 'product',
    label: 'Product Management',
    keywords: [
      'roadmap','discovery','prd','user stories','prioritisation','okrs','stakeholder management','go-to-market','product analytics',
      'customer interviews','agile','scrum','jira','a/b testing','platform strategy','competitive analysis',
    ],
    soft: ['influence without authority', 'clarity', 'customer obsession', 'decision making'],
    verbs: ['Defined', 'Prioritised', 'Launched', 'Aligned', 'Shipped', 'Validated', 'Owned', 'Drove'],
    metrics: ['activation', 'retention', 'revenue impact', 'cycle time', 'adoption', 'NPS'],
    summaries: [
      '{{role}} with {{years}} of experience turning customer insight into shipped outcomes across {{skill}} platforms.',
      'Outcome-obsessed {{role}} who has led discovery-to-launch for products used by large user bases, owning roadmap and {{skill}} metrics.',
    ],
  },
  {
    id: 'finance',
    label: 'Finance & Accounting',
    keywords: [
      'financial modeling','forecasting','budgeting','p&l','variance analysis','gaap','ifrs','excel','powerpoint','sql',
      'valuation','dcf','capital markets','audit','tax','reconciliation','sap','oracle','treasury','risk management',
    ],
    soft: ['accuracy', 'stakeholder reporting', 'discretion', 'deadline discipline'],
    verbs: ['Built', 'Forecasted', 'Reconciled', 'Analyzed', 'Reduced', 'Managed', 'Reported', 'Advised'],
    metrics: ['cost saved', 'close time reduced', 'forecast accuracy', 'working capital', 'margin improvement'],
    summaries: [
      '{{role}} with {{years}} of experience across reporting, forecasting and {{skill}} for high-growth organisations.',
      'Detail-driven {{role}} who has tightened close cycles, built {{skill}} models and advised senior leadership on capital decisions.',
    ],
  },
  {
    id: 'healthcare',
    label: 'Healthcare & Life Sciences',
    keywords: [
      'patient care','clinical documentation','hipaa','ehr','emr','triage','care coordination','cpr','bls','acl','phlebotomy',
      'medication administration','infection control','care plans','interdisciplinary teams','icd-10','quality improvement',
    ],
    soft: ['empathy', 'composure under pressure', 'patient advocacy', 'attention to detail'],
    verbs: ['Delivered', 'Coordinated', 'Assessed', 'Documented', 'Educated', 'Improved', 'Monitored', 'Advocated'],
    metrics: ['patients per shift', 'readmission rate', 'satisfaction scores', 'chart accuracy', 'wait time'],
    summaries: [
      'Compassionate {{role}} with {{years}} of experience delivering high-quality patient care in fast-paced clinical settings.',
      'Licensed {{role}} known for {{skill}}, calm decision-making and measurable improvements in patient outcomes.',
    ],
  },
  {
    id: 'sales',
    label: 'Sales & Business Development',
    keywords: [
      'pipeline','outbound','inbound','crm','salesforce','hubspot','quota attainment','discovery','negotiation','forecasting',
      'account management','enterprise sales','saas','cold outreach','territory planning','churn reduction',
    ],
    soft: ['resilience', 'active listening', 'relationship building'],
    verbs: ['Closed', 'Sourced', 'Grew', 'Negotiated', 'Expanded', 'Exceeded', 'Built', 'Owned'],
    metrics: ['quota attainment', 'ARR closed', 'pipeline generated', 'win rate', 'average deal size', 'sales cycle'],
    summaries: [
      'Quota-crushing {{role}} with {{years}} of experience closing {{skill}} deals across mid-market and enterprise accounts.',
      'Relationship-first {{role}} who has generated consistent pipeline and exceeded targets through consultative selling.',
    ],
  },
  {
    id: 'operations',
    label: 'Operations & Supply Chain',
    keywords: [
      'process improvement','lean','six sigma','supply chain','inventory management','logistics','s&op','vendor management',
      'procurement','kpi reporting','sla','capacity planning','erp','continuous improvement','cost reduction',
    ],
    soft: ['problem solving', 'cross-functional coordination', 'calm under pressure'],
    verbs: ['Streamlined', 'Reduced', 'Coordinated', 'Negotiated', 'Implemented', 'Improved', 'Managed', 'Forecasted'],
    metrics: ['cost avoided', 'on-time delivery', 'cycle time', 'inventory turns', 'defect rate', 'throughput'],
    summaries: [
      '{{role}} with {{years}} of experience removing bottlenecks and scaling {{skill}} operations end to end.',
      'Process-driven {{role}} who has cut costs and lifted service levels across complex, multi-site operations.',
    ],
  },
  {
    id: 'education',
    label: 'Education & Training',
    keywords: [
      'curriculum design','lesson planning','differentiated instruction','classroom management','assessment','lms','canvas',
      'student outcomes','iep','literacy','stem','mentoring','parent communication','professional development',
    ],
    soft: ['patience', 'communication', 'adaptability', 'mentorship'],
    verbs: ['Taught', 'Designed', 'Assessed', 'Mentored', 'Improved', 'Led', 'Coached', 'Developed'],
    metrics: ['test score growth', 'graduation rate', 'attendance', 'student engagement', 'cohort size'],
    summaries: [
      'Dedicated {{role}} with {{years}} of experience raising outcomes through {{skill}} and data-informed instruction.',
      'Student-centred {{role}} who designs inclusive curricula and partners with families to lift achievement.',
    ],
  },
  {
    id: 'security',
    label: 'Cybersecurity',
    keywords: [
      'siem','soc','threat hunting','incident response','penetration testing','iam','zero trust','nist','iso 27001','soc 2',
      'vulnerability management','edr','firewalls','cloud security','cryptography','phishing simulation','forensics',
    ],
    soft: ['vigilance', 'clear incident communication', 'risk framing'],
    verbs: ['Hardened', 'Investigated', 'Detected', 'Remediated', 'Audited', 'Automated', 'Assessed', 'Contained'],
    metrics: ['mean time to detect', 'mean time to respond', 'vuln remediation time', 'findings closed', 'audit pass rate'],
    summaries: [
      '{{role}} with {{years}} of experience defending cloud and on-prem estates through {{skill}} and detection engineering.',
      'Security-focused {{role}} who has cut response times and led {{skill}} programmes across regulated environments.',
    ],
  },
  {
    id: 'devops',
    label: 'DevOps & Platform',
    keywords: [
      'kubernetes','docker','terraform','ansible','aws','gcp','azure','github actions','jenkins','argocd','prometheus','grafana',
      'observability','sre','incident management','on-call','cost optimisation','self-service platform','gitops',
    ],
    soft: ['automation mindset', 'blameless postmortems', 'enablement'],
    verbs: ['Automated', 'Migrated', 'Hardened', 'Scaled', 'Instrumented', 'Cut', 'Standardised', 'Delivered'],
    metrics: ['deploy frequency', 'MTTR', 'change failure rate', 'infra cost', 'uptime', 'lead time'],
    summaries: [
      '{{role}} with {{years}} of experience building reliable, self-service platforms on {{skill}} with measurable delivery gains.',
      'Platform-minded {{role}} who has automated delivery pipelines and lifted reliability across large {{skill}} estates.',
    ],
  },
  {
    id: 'general',
    label: 'General / Career Switch',
    keywords: [
      'communication','project coordination','stakeholder management','problem solving','time management','customer service',
      'team collaboration','reporting','process improvement','microsoft office','google workspace','leadership',
    ],
    soft: ['reliability', 'initiative', 'adaptability', 'ownership'],
    verbs: ['Led', 'Built', 'Improved', 'Coordinated', 'Delivered', 'Managed', 'Supported', 'Streamlined'],
    metrics: ['time saved', 'satisfaction', 'throughput', 'accuracy', 'revenue supported'],
    summaries: [
      'Adaptable {{role}} with {{years}} of experience delivering results through {{skill}} and strong stakeholder partnership.',
      'Outcome-focused {{role}} who learns fast, owns problems end to end and lifts the team around them.',
    ],
  },
]

export const INDUSTRY_MAP: Record<string, IndustryProfile> = INDUSTRY_PROFILES.reduce(
  (acc, p) => {
    acc[p.id] = p
    return acc
  },
  {} as Record<string, IndustryProfile>,
)

export const GENERIC_VERBS = [
  'Led','Built','Designed','Delivered','Improved','Launched','Owned','Streamlined','Grew','Reduced','Automated','Scaled',
  'Coordinated','Managed','Created','Drove','Optimised','Partnered','Mentored','Negotiated',
]

/** Weak openings we actively rewrite. */
export const WEAK_OPENERS = [
  'worked on','responsible for','helped with','was in charge of','duties included','assisted with','involved in',
  'tasked with','worked with','participated in','responsible to',
]

export function detectIndustry(text = ''): IndustryProfile {
  const hay = text.toLowerCase()
  let best = INDUSTRY_MAP['general']!
  let bestScore = 0
  for (const p of INDUSTRY_PROFILES) {
    if (p.id === 'general') continue
    let score = 0
    for (const k of p.keywords) {
      if (k.length > 3 && hay.includes(k)) score += 1
    }
    if (p.label.toLowerCase().split(/[\s&]+/).some((w) => w.length > 4 && hay.includes(w))) score += 2
    if (score > bestScore) {
      bestScore = score
      best = p
    }
  }
  return best
}

/** Extract likely keywords from a raw job description. */
const JD_STOPWORDS = new Set(
  ('the a an and or but if then than that this these those with without for to from by of in on at as is are was were be been being ' +
    'you your our we us they their he she it its will would can could should must have has had do does did not no yes ' +
    'who whom which what when where why how all any both each few more most other some such only own same so too very ' +
    'about into over under again further once here there also per via using use used include includes including etc ' +
    'team teams work working works role roles position company job year years experience experiences strong ability ' +
    'new across within while during may might able looking join joining help helping ideal candidate plus bonus nice ' +
    'build building built create creating develop developing make making ensure ensuring deliver delivering drive driving ' +
    'need needs require required requires requirement requirements must responsibility responsibilities day days ' +
    'good great excellent opportunity apply application benefits offer salary remote hybrid office full part time ' +
    'youre were well like just know want come coming grow growing hire hiring success successful passion passionate ' +
    'squad squads colleague colleagues report reporting reports manager management lead leading leader senior junior ' +
    'company companies culture environment values value mission vision product products service services customer customers')
    .split(' '),
)

export function extractJobKeywords(jd: string, limit = 40): string[] {
  const words = new Map<string, number>()
  const cleaned = jd
    .toLowerCase()
    .replace(/[^a-z0-9+.#\-\s/]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  for (const raw of cleaned) {
    let t = raw.replace(/^[-/.]+|[-/.]+$/g, '')
    if (t.length < 3 || t.length > 24) continue
    if (/^\d+$/.test(t)) continue
    if (JD_STOPWORDS.has(t)) continue
    // drop simple plurals when the singular is already known
    if (t.endsWith('s') && words.has(t.slice(0, -1))) t = t.slice(0, -1)
    words.set(t, (words.get(t) ?? 0) + 1)
  }

  // Known multi-word skills stay intact ("machine learning", "node.js", …)
  const phrases: string[] = []
  for (const p of INDUSTRY_PROFILES) {
    for (const k of p.keywords) {
      if (k.includes(' ') || k.includes('.') || k.includes('#') || k.includes('+')) {
        const re = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')
        if (re.test(jd) && !phrases.includes(k)) phrases.push(k)
      }
    }
  }

  const knownSingles = new Set(
    INDUSTRY_PROFILES.flatMap((p) => p.keywords).filter((k) => !k.includes(' ')).map((k) => k.toLowerCase()),
  )
  const techish = (w: string) => /[+#./-]/.test(w) || /(js|ts|sql|db|api|ui|ux|ml|ai|ops)$/.test(w)

  const ranked = [...words.entries()]
    .filter(([w, count]) => knownSingles.has(w) || techish(w) || count >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .filter((w) => !phrases.some((p) => p.toLowerCase() === w))

  return [...new Set([...phrases, ...ranked])].slice(0, limit)
}

/** True when a keyword looks like a real skill rather than prose. */
export function looksLikeSkill(keyword: string): boolean {
  const k = keyword.trim().toLowerCase()
  if (k.length < 2 || k.length > 30) return false
  if (JD_STOPWORDS.has(k)) return false
  if (/[.,;:!?]$/.test(k)) return false
  if (/^\d/.test(k)) return false
  const known = INDUSTRY_PROFILES.some((p) => p.keywords.some((kw) => kw.toLowerCase() === k))
  const techish = /[+#./-]/.test(k) || /(js|ts|sql|db|api|ui|ux|ml|ai|ops)$/.test(k)
  return known || techish
}
