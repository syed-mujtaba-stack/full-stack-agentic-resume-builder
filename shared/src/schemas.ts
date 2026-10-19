import { z } from 'zod'
import { TEMPLATE_IDS, SENIORITY_LEVELS } from './types'

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

export const id = z.string().min(1).max(64)
export const optionalText = z.string().max(4000).optional().default('')
export const monthYear = z
  .string()
  .max(40)
  .optional()
  .default('')
  .refine(
    (v) => v === '' || /^([A-Za-z]{3,9}\s)?(19|20)\d{2}$|^(present|current|now)$/i.test(v.trim()),
    { message: 'Use e.g. "Mar 2023" or "Present"' },
  )

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

export const experienceSchema = z.object({
  id: id,
  company: z.string().max(160).default(''),
  role: z.string().max(160).default(''),
  location: z.string().max(160).default(''),
  startDate: monthYear,
  endDate: monthYear,
  current: z.boolean().default(false),
  bullets: z.array(z.string().max(600)).max(12).default([]),
  tech: z.array(z.string().max(60)).max(30).default([]),
})

export const educationSchema = z.object({
  id: id,
  school: z.string().max(200).default(''),
  degree: z.string().max(200).default(''),
  field: z.string().max(200).default(''),
  location: z.string().max(160).default(''),
  startDate: monthYear,
  endDate: monthYear,
  gpa: z.string().max(40).default(''),
  details: z.array(z.string().max(600)).max(8).default([]),
})

export const skillGroupSchema = z.object({
  id: id,
  name: z.string().max(80).default('Core Skills'),
  items: z.array(z.string().max(80)).max(60).default([]),
})

export const projectSchema = z.object({
  id: id,
  name: z.string().max(160).default(''),
  role: z.string().max(160).default(''),
  link: z.string().max(300).default(''),
  startDate: monthYear,
  endDate: monthYear,
  description: z.string().max(1200).default(''),
  bullets: z.array(z.string().max(600)).max(10).default([]),
  tech: z.array(z.string().max(60)).max(30).default([]),
})

export const certificationSchema = z.object({
  id: id,
  name: z.string().max(200).default(''),
  issuer: z.string().max(200).default(''),
  date: monthYear,
  credentialId: z.string().max(120).default(''),
  link: z.string().max(300).default(''),
})

export const languageSchema = z.object({
  id: id,
  name: z.string().max(80).default(''),
  level: z.string().max(80).default(''),
})

export const awardSchema = z.object({
  id: id,
  title: z.string().max(200).default(''),
  issuer: z.string().max(200).default(''),
  date: monthYear,
  description: z.string().max(600).default(''),
})

export const customSectionSchema = z.object({
  id: id,
  title: z.string().max(120).default('Custom Section'),
  items: z
    .array(
      z.object({
        id: id,
        title: z.string().max(200).default(''),
        subtitle: z.string().max(200).default(''),
        date: monthYear,
        description: z.string().max(1200).default(''),
      }),
    )
    .max(20)
    .default([]),
})

export const profileSchema = z.object({
  fullName: z.string().max(120).default(''),
  headline: z.string().max(200).default(''),
  email: z.string().max(160).default(''),
  phone: z.string().max(60).default(''),
  location: z.string().max(160).default(''),
  website: z.string().max(300).default(''),
  linkedin: z.string().max(300).default(''),
  github: z.string().max(300).default(''),
  summary: z.string().max(2000).default(''),
})

export const jobTargetSchema = z.object({
  role: z.string().max(160).default(''),
  industry: z.string().max(120).default(''),
  seniority: z.enum(SENIORITY_LEVELS).or(z.string().max(40)).default('mid'),
  company: z.string().max(160).default(''),
  jobDescription: z.string().max(20000).default(''),
  keywords: z.array(z.string().max(80)).max(80).default([]),
})

/* ------------------------------------------------------------------ */
/* ATS                                                                 */
/* ------------------------------------------------------------------ */

export const atsIssueSchema = z.object({
  id: z.string(),
  severity: z.enum(['critical', 'warning', 'tip']),
  title: z.string(),
  detail: z.string(),
  section: z.string().optional(),
})

export const atsReportSchema = z.object({
  score: z.number().min(0).max(100),
  grade: z.enum(['A', 'B', 'C', 'D', 'F']),
  breakdown: z.object({
    keywords: z.number().min(0).max(100),
    impact: z.number().min(0).max(100),
    structure: z.number().min(0).max(100),
    readability: z.number().min(0).max(100),
    completeness: z.number().min(0).max(100),
  }),
  matchedKeywords: z.array(z.string()).default([]),
  missingKeywords: z.array(z.string()).default([]),
  issues: z.array(atsIssueSchema).default([]),
  suggestions: z.array(z.string()).default([]),
  wordCount: z.number().default(0),
  estimatedPages: z.number().default(1),
  scannedAt: z.string().default(''),
  tailored: z.boolean().default(false),
})

/* ------------------------------------------------------------------ */
/* Document                                                            */
/* ------------------------------------------------------------------ */

export const resumeMetaSchema = z.object({
  sectionOrder: z
    .array(
      z.enum([
        'summary',
        'experience',
        'education',
        'skills',
        'projects',
        'certifications',
        'languages',
        'awards',
        'custom',
      ]),
    )
    .default(['summary', 'experience', 'skills', 'projects', 'education', 'certifications', 'languages', 'awards', 'custom']),
  hidden: z.array(z.string()).default([]),
  accent: z.string().max(20).default('#6366f1'),
  fontFamily: z.enum(['sans', 'serif', 'mono']).default('sans'),
  density: z.enum(['compact', 'comfortable', 'spacious']).default('comfortable'),
  fontScale: z.number().min(0.8).max(1.3).default(1),
  showIcons: z.boolean().default(true),
  pageFormat: z.enum(['a4', 'letter']).default('a4'),
})

export const resumeDocumentSchema = z.object({
  profile: profileSchema,
  summary: z.string().max(2000).default(''),
  experience: z.array(experienceSchema).max(30).default([]),
  education: z.array(educationSchema).max(20).default([]),
  skills: z.array(skillGroupSchema).max(15).default([]),
  projects: z.array(projectSchema).max(20).default([]),
  certifications: z.array(certificationSchema).max(30).default([]),
  languages: z.array(languageSchema).max(20).default([]),
  awards: z.array(awardSchema).max(20).default([]),
  custom: z.array(customSectionSchema).max(10).default([]),
  meta: resumeMetaSchema,
})

/* ------------------------------------------------------------------ */
/* Auth payloads                                                       */
/* ------------------------------------------------------------------ */

export const emailSchema = z.string().trim().toLowerCase().email().max(160)
export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[a-zA-Z]/, 'Include at least one letter')
  .regex(/[0-9]/, 'Include at least one number')

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Tell us your name').max(80),
  email: emailSchema,
  password: passwordSchema,
  locale: z.string().max(12).optional().default('en'),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128),
  remember: z.boolean().optional().default(true),
})

export const forgotPasswordSchema = z.object({ email: emailSchema })
export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
})

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  avatarUrl: z.string().max(500).nullable().optional(),
  locale: z.string().max(12).optional(),
})

/* ------------------------------------------------------------------ */
/* Resume payloads                                                     */
/* ------------------------------------------------------------------ */

export const createResumeSchema = z.object({
  title: z.string().trim().min(1).max(120).default('Untitled resume'),
  templateId: z.enum(TEMPLATE_IDS).default('aurora'),
  document: resumeDocumentSchema.optional(),
})

export const updateResumeSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  templateId: z.enum(TEMPLATE_IDS).optional(),
  document: resumeDocumentSchema.partial().optional(),
  jobTarget: jobTargetSchema.partial().nullable().optional(),
  atsReport: atsReportSchema.nullable().optional(),
  isPublic: z.boolean().optional(),
})

export const duplicateResumeSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
})

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ResumeDocumentInput = z.input<typeof resumeDocumentSchema>
export type ResumeDocumentOutput = z.output<typeof resumeDocumentSchema>
