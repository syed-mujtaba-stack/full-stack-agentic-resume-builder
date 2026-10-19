import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2, Wand2 } from 'lucide-react'
import type {
  Award,
  Certification,
  CustomSection,
  Education,
  Experience,
  LanguageEntry,
  Project,
  ResumeDocument,
  SkillGroup,
} from '@arbor/shared'
import {
  emptyAward,
  emptyCertification,
  emptyCustomSection,
  emptyEducation,
  emptyExperience,
  emptyLanguage,
  emptyProject,
  emptySkillGroup,
} from '@arbor/shared'
import { Input, Label, Textarea, Button } from '../ui'
import { cn } from '../../lib/utils'
import { useAgent } from '../../store/agent'

type EditorProps = {
  doc: ResumeDocument
  update: (fn: (doc: ResumeDocument) => ResumeDocument) => void
}

/* ─────────────────── shared bits ─────────────────── */

function ItemCard({
  title,
  children,
  onRemove,
  onMoveUp,
  onMoveDown,
  index,
  total,
}: {
  title: string
  children: React.ReactNode
  onRemove: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  index: number
  total: number
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-400">
          <GripVertical className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate font-medium text-slate-300">{title || 'Untitled'}</span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="grid h-6 w-6 place-items-center rounded-md text-slate-500 hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="grid h-6 w-6 place-items-center rounded-md text-slate-500 hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <ArrowDown className="h-3 w-3" />
          </button>
          <button
            onClick={onRemove}
            className="grid h-6 w-6 place-items-center rounded-md text-rose-400/80 hover:bg-rose-500/15 hover:text-rose-300"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list
  const copy = [...list]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item as T)
  return copy
}

/* ─────────────────── profile ─────────────────── */

export function ProfileEditor({ doc, update }: EditorProps) {
  const p = doc.profile
  const set = (key: keyof typeof p, value: string) =>
    update((d) => ({ ...d, profile: { ...d.profile, [key]: value } }))

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <Field label="Full name">
          <Input value={p.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Ada Lovelace" />
        </Field>
      </div>
      <div className="col-span-2">
        <Field label="Headline / target role">
          <Input
            value={p.headline}
            onChange={(e) => set('headline', e.target.value)}
            placeholder="Senior Frontend Engineer"
          />
        </Field>
      </div>
      <Field label="Email">
        <Input value={p.email} onChange={(e) => set('email', e.target.value)} placeholder="ada@example.com" />
      </Field>
      <Field label="Phone">
        <Input value={p.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+92 300 1234567" />
      </Field>
      <Field label="Location">
        <Input value={p.location} onChange={(e) => set('location', e.target.value)} placeholder="Karachi, Pakistan" />
      </Field>
      <Field label="Website">
        <Input value={p.website} onChange={(e) => set('website', e.target.value)} placeholder="ada.dev" />
      </Field>
      <Field label="LinkedIn">
        <Input value={p.linkedin} onChange={(e) => set('linkedin', e.target.value)} placeholder="linkedin.com/in/ada" />
      </Field>
      <Field label="GitHub">
        <Input value={p.github} onChange={(e) => set('github', e.target.value)} placeholder="github.com/ada" />
      </Field>
    </div>
  )
}

/* ─────────────────── summary ─────────────────── */

export function SummaryEditor({ doc, update }: EditorProps) {
  const run = useAgent((s) => s.run)
  const running = useAgent((s) => s.running)
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label className="mb-0">Professional summary</Label>
        <Button
          size="sm"
          variant="outline"
          loading={running}
          icon={<Wand2 className="h-3.5 w-3.5" />}
          onClick={() => run({ kind: 'summary', instructions: 'Rewrite the professional summary for impact.' })}
        >
          Rewrite with AI
        </Button>
      </div>
      <Textarea
        rows={6}
        value={doc.summary}
        onChange={(e) => update((d) => ({ ...d, summary: e.target.value }))}
        placeholder="3–4 lines: who you are, what you ship, the number that proves it."
      />
      <p className="mt-1.5 text-[11px] text-slate-500">
        {doc.summary.trim().split(/\s+/).filter(Boolean).length} words · aim for 45–70
      </p>
    </div>
  )
}

/* ─────────────────── experience ─────────────────── */

export function ExperienceEditor({ doc, update }: EditorProps) {
  const setItem = (id: string, patch: Partial<Experience>) =>
    update((d) => ({ ...d, experience: d.experience.map((e) => (e.id === id ? { ...e, ...patch } : e)) }))

  return (
    <div className="space-y-3">
      {doc.experience.map((exp, i) => (
        <ItemCard
          key={exp.id}
          title={`${exp.role || 'Role'}${exp.company ? ` · ${exp.company}` : ''}`}
          index={i}
          total={doc.experience.length}
          onRemove={() => update((d) => ({ ...d, experience: d.experience.filter((e) => e.id !== exp.id) }))}
          onMoveUp={() => update((d) => ({ ...d, experience: move(d.experience, i, i - 1) }))}
          onMoveDown={() => update((d) => ({ ...d, experience: move(d.experience, i, i + 1) }))}
        >
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Role">
              <Input value={exp.role} onChange={(e) => setItem(exp.id, { role: e.target.value })} />
            </Field>
            <Field label="Company">
              <Input value={exp.company} onChange={(e) => setItem(exp.id, { company: e.target.value })} />
            </Field>
            <Field label="Location">
              <Input value={exp.location} onChange={(e) => setItem(exp.id, { location: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Start">
                <Input
                  value={exp.startDate}
                  onChange={(e) => setItem(exp.id, { startDate: e.target.value })}
                  placeholder="Mar 2023"
                />
              </Field>
              <Field label="End">
                <Input
                  value={exp.current ? '' : exp.endDate}
                  disabled={exp.current}
                  onChange={(e) => setItem(exp.id, { endDate: e.target.value })}
                  placeholder="Present"
                />
              </Field>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                id={`cur-${exp.id}`}
                type="checkbox"
                checked={exp.current}
                onChange={(e) => setItem(exp.id, { current: e.target.checked, endDate: e.target.checked ? '' : exp.endDate })}
                className="h-3.5 w-3.5 accent-indigo-500"
              />
              <label htmlFor={`cur-${exp.id}`} className="text-xs text-slate-400">
                I currently work here
              </label>
            </div>
            <div className="col-span-2">
              <Label>Bullets — one per line, verb first, with numbers</Label>
              <Textarea
                rows={4}
                value={exp.bullets.join('\n')}
                onChange={(e) => setItem(exp.id, { bullets: e.target.value.split('\n') })}
                placeholder={'Shipped X, cutting load time by 42%.\nLed a team of 5 across 3 squads.'}
              />
            </div>
            <div className="col-span-2">
              <Label>Tech used (comma separated)</Label>
              <Input
                value={exp.tech.join(', ')}
                onChange={(e) =>
                  setItem(exp.id, {
                    tech: e.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
          </div>
        </ItemCard>
      ))}

      <Button
        variant="ghost"
        size="sm"
        className="w-full"
        icon={<Plus className="h-4 w-4" />}
        onClick={() => update((d) => ({ ...d, experience: [...d.experience, emptyExperience()] }))}
      >
        Add role
      </Button>
    </div>
  )
}

/* ─────────────────── education ─────────────────── */

export function EducationEditor({ doc, update }: EditorProps) {
  const setItem = (id: string, patch: Partial<Education>) =>
    update((d) => ({ ...d, education: d.education.map((e) => (e.id === id ? { ...e, ...patch } : e)) }))

  return (
    <div className="space-y-3">
      {doc.education.map((edu, i) => (
        <ItemCard
          key={edu.id}
          title={edu.school || 'School'}
          index={i}
          total={doc.education.length}
          onRemove={() => update((d) => ({ ...d, education: d.education.filter((e) => e.id !== edu.id) }))}
          onMoveUp={() => update((d) => ({ ...d, education: move(d.education, i, i - 1) }))}
          onMoveDown={() => update((d) => ({ ...d, education: move(d.education, i, i + 1) }))}
        >
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="School">
              <Input value={edu.school} onChange={(e) => setItem(edu.id, { school: e.target.value })} />
            </Field>
            <Field label="Degree">
              <Input value={edu.degree} onChange={(e) => setItem(edu.id, { degree: e.target.value })} placeholder="BS" />
            </Field>
            <Field label="Field of study">
              <Input value={edu.field} onChange={(e) => setItem(edu.id, { field: e.target.value })} placeholder="Computer Science" />
            </Field>
            <Field label="GPA / grade">
              <Input value={edu.gpa} onChange={(e) => setItem(edu.id, { gpa: e.target.value })} />
            </Field>
            <Field label="Start">
              <Input value={edu.startDate} onChange={(e) => setItem(edu.id, { startDate: e.target.value })} />
            </Field>
            <Field label="End">
              <Input value={edu.endDate} onChange={(e) => setItem(edu.id, { endDate: e.target.value })} />
            </Field>
          </div>
        </ItemCard>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="w-full"
        icon={<Plus className="h-4 w-4" />}
        onClick={() => update((d) => ({ ...d, education: [...d.education, emptyEducation()] }))}
      >
        Add education
      </Button>
    </div>
  )
}

/* ─────────────────── skills ─────────────────── */

export function SkillsEditor({ doc, update }: EditorProps) {
  const setGroup = (id: string, patch: Partial<SkillGroup>) =>
    update((d) => ({ ...d, skills: d.skills.map((g) => (g.id === id ? { ...g, ...patch } : g)) }))

  return (
    <div className="space-y-3">
      {doc.skills.map((group, i) => (
        <ItemCard
          key={group.id}
          title={group.name}
          index={i}
          total={doc.skills.length}
          onRemove={() => update((d) => ({ ...d, skills: d.skills.filter((g) => g.id !== group.id) }))}
          onMoveUp={() => update((d) => ({ ...d, skills: move(d.skills, i, i - 1) }))}
          onMoveDown={() => update((d) => ({ ...d, skills: move(d.skills, i, i + 1) }))}
        >
          <div className="grid gap-2.5">
            <Field label="Group name">
              <Input value={group.name} onChange={(e) => setGroup(group.id, { name: e.target.value })} />
            </Field>
            <Field label="Skills (comma separated)">
              <Textarea
                rows={2}
                value={group.items.join(', ')}
                onChange={(e) =>
                  setGroup(group.id, {
                    items: e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
          </div>
        </ItemCard>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="w-full"
        icon={<Plus className="h-4 w-4" />}
        onClick={() => update((d) => ({ ...d, skills: [...d.skills, emptySkillGroup('New group')] }))}
      >
        Add skill group
      </Button>
    </div>
  )
}

/* ─────────────────── projects ─────────────────── */

export function ProjectsEditor({ doc, update }: EditorProps) {
  const setItem = (id: string, patch: Partial<Project>) =>
    update((d) => ({ ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))

  return (
    <div className="space-y-3">
      {doc.projects.map((pr, i) => (
        <ItemCard
          key={pr.id}
          title={pr.name || 'Project'}
          index={i}
          total={doc.projects.length}
          onRemove={() => update((d) => ({ ...d, projects: d.projects.filter((p) => p.id !== pr.id) }))}
          onMoveUp={() => update((d) => ({ ...d, projects: move(d.projects, i, i - 1) }))}
          onMoveDown={() => update((d) => ({ ...d, projects: move(d.projects, i, i + 1) }))}
        >
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Name">
              <Input value={pr.name} onChange={(e) => setItem(pr.id, { name: e.target.value })} />
            </Field>
            <Field label="Role">
              <Input value={pr.role} onChange={(e) => setItem(pr.id, { role: e.target.value })} />
            </Field>
            <div className="col-span-2">
              <Field label="Link">
                <Input value={pr.link} onChange={(e) => setItem(pr.id, { link: e.target.value })} placeholder="github.com/me/project" />
              </Field>
            </div>
            <Field label="Start">
              <Input value={pr.startDate} onChange={(e) => setItem(pr.id, { startDate: e.target.value })} />
            </Field>
            <Field label="End">
              <Input value={pr.endDate} onChange={(e) => setItem(pr.id, { endDate: e.target.value })} />
            </Field>
            <div className="col-span-2">
              <Field label="Description">
                <Textarea rows={2} value={pr.description} onChange={(e) => setItem(pr.id, { description: e.target.value })} />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Highlights (one per line)">
                <Textarea
                  rows={3}
                  value={pr.bullets.join('\n')}
                  onChange={(e) => setItem(pr.id, { bullets: e.target.value.split('\n') })}
                />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Tech">
                <Input
                  value={pr.tech.join(', ')}
                  onChange={(e) =>
                    setItem(pr.id, {
                      tech: e.target.value
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>
            </div>
          </div>
        </ItemCard>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="w-full"
        icon={<Plus className="h-4 w-4" />}
        onClick={() => update((d) => ({ ...d, projects: [...d.projects, emptyProject()] }))}
      >
        Add project
      </Button>
    </div>
  )
}

/* ─────────────────── extras ─────────────────── */

export function ExtrasEditor({ doc, update }: EditorProps) {
  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>Certifications</SectionLabel>
        <div className="space-y-2">
          {doc.certifications.map((c) => (
            <div key={c.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                value={c.name}
                placeholder="AWS Solutions Architect"
                onChange={(e) =>
                  update((d) => ({
                    ...d,
                    certifications: d.certifications.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)),
                  }))
                }
              />
              <Input
                value={c.issuer}
                placeholder="Amazon"
                onChange={(e) =>
                  update((d) => ({
                    ...d,
                    certifications: d.certifications.map((x) => (x.id === c.id ? { ...x, issuer: e.target.value } : x)),
                  }))
                }
              />
              <button
                onClick={() => update((d) => ({ ...d, certifications: d.certifications.filter((x) => x.id !== c.id) }))}
                className="grid h-9 w-9 place-items-center rounded-lg text-rose-400 hover:bg-rose-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => update((d) => ({ ...d, certifications: [...d.certifications, emptyCertification()] }))}
          >
            Add certification
          </Button>
        </div>
      </div>

      <div>
        <SectionLabel>Languages</SectionLabel>
        <div className="space-y-2">
          {doc.languages.map((l) => (
            <div key={l.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                value={l.name}
                placeholder="English"
                onChange={(e) =>
                  update((d) => ({
                    ...d,
                    languages: d.languages.map((x) => (x.id === l.id ? { ...x, name: e.target.value } : x)),
                  }))
                }
              />
              <Input
                value={l.level}
                placeholder="Fluent"
                onChange={(e) =>
                  update((d) => ({
                    ...d,
                    languages: d.languages.map((x) => (x.id === l.id ? { ...x, level: e.target.value } : x)),
                  }))
                }
              />
              <button
                onClick={() => update((d) => ({ ...d, languages: d.languages.filter((x) => x.id !== l.id) }))}
                className="grid h-9 w-9 place-items-center rounded-lg text-rose-400 hover:bg-rose-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => update((d) => ({ ...d, languages: [...d.languages, emptyLanguage()] }))}
          >
            Add language
          </Button>
        </div>
      </div>

      <div>
        <SectionLabel>Awards</SectionLabel>
        <div className="space-y-2">
          {doc.awards.map((a) => (
            <div key={a.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                value={a.title}
                placeholder="Employee of the Year"
                onChange={(e) =>
                  update((d) => ({ ...d, awards: d.awards.map((x) => (x.id === a.id ? { ...x, title: e.target.value } : x)) }))
                }
              />
              <Input
                value={a.issuer}
                placeholder="Company"
                onChange={(e) =>
                  update((d) => ({ ...d, awards: d.awards.map((x) => (x.id === a.id ? { ...x, issuer: e.target.value } : x)) }))
                }
              />
              <button
                onClick={() => update((d) => ({ ...d, awards: d.awards.filter((x) => x.id !== a.id) }))}
                className="grid h-9 w-9 place-items-center rounded-lg text-rose-400 hover:bg-rose-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => update((d) => ({ ...d, awards: [...d.awards, emptyAward()] }))}
          >
            Add award
          </Button>
        </div>
      </div>

      <div>
        <SectionLabel>Custom sections</SectionLabel>
        <div className="space-y-3">
          {doc.custom.map((section) => (
            <div key={section.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center gap-2">
                <Input
                  value={section.title}
                  onChange={(e) =>
                    update((d) => ({
                      ...d,
                      custom: d.custom.map((s) => (s.id === section.id ? { ...s, title: e.target.value } : s)),
                    }))
                  }
                />
                <button
                  onClick={() => update((d) => ({ ...d, custom: d.custom.filter((s) => s.id !== section.id) }))}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <div key={item.id} className="grid gap-2 rounded-lg bg-black/20 p-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={item.title}
                        placeholder="Title"
                        onChange={(e) => updateItem(section.id, item.id, { title: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <Input
                          value={item.date}
                          placeholder="Date"
                          onChange={(e) => updateItem(section.id, item.id, { date: e.target.value })}
                        />
                        <button
                          onClick={() =>
                            update((d) => ({
                              ...d,
                              custom: d.custom.map((s) =>
                                s.id === section.id ? { ...s, items: s.items.filter((i) => i.id !== item.id) } : s,
                              ),
                            }))
                          }
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-rose-400 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <Textarea
                      rows={2}
                      value={item.description}
                      placeholder="Description"
                      onChange={(e) => updateItem(section.id, item.id, { description: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() =>
                  update((d) => ({
                    ...d,
                    custom: d.custom.map((s) =>
                      s.id === section.id
                        ? { ...s, items: [...s.items, { id: `cus_${Math.random().toString(36).slice(2, 9)}`, title: '', subtitle: '', date: '', description: '' }] }
                        : s,
                    ),
                  }))
                }
              >
                Add entry
              </Button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => update((d) => ({ ...d, custom: [...d.custom, emptyCustomSection('Volunteering')] }))}
          >
            Add section
          </Button>
        </div>
      </div>
    </div>
  )

  function updateItem(
    sectionId: string,
    itemId: string,
    patch: Partial<{ title: string; subtitle: string; date: string; description: string }>,
  ) {
    update((d) => ({
      ...d,
      custom: d.custom.map((s) =>
        s.id === sectionId ? { ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) } : s,
      ),
    }))
  }
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h4 className={cn('mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400')}>{children}</h4>
}

export type { Award, Certification, CustomSection, LanguageEntry }
