import { Mail, MapPin, Phone, Globe } from 'lucide-react'
import { BrandGithub as Github, BrandLinkedin as Linkedin } from '../components/ui/BrandIcons'
import type { ResumeDocument, TemplateMeta } from '@arbor/shared'
import { Bullets, Chips, ContactRow, Page, SectionTitle, dateRange, prettyUrl, spacing, visible } from './parts'

const iconProps = { size: 10, strokeWidth: 1.8 }

function contactItems(doc: ResumeDocument, color = '#334155') {
  const p = doc.profile
  const style = { color }
  return [
    { icon: <Mail {...iconProps} style={style} />, text: p.email },
    { icon: <Phone {...iconProps} style={style} />, text: p.phone },
    { icon: <MapPin {...iconProps} style={style} />, text: p.location },
    { icon: <Globe {...iconProps} style={style} />, text: prettyUrl(p.website) },
    { icon: <Linkedin {...iconProps} style={style} />, text: prettyUrl(p.linkedin) },
    { icon: <Github {...iconProps} style={style} />, text: prettyUrl(p.github) },
  ]
}

/* ─────────────────────────────  AURORA  ───────────────────────────── */

export function Aurora({ doc }: { doc: ResumeDocument }) {
  const s = spacing(doc)
  return (
    <Page doc={doc}>
      <header
        style={{
          margin: `-${s.pad}px -${s.pad + 4}px 0`,
          padding: '22px 28px 18px',
          background: 'linear-gradient(115deg, var(--accent), color-mix(in srgb, var(--accent) 45%, #7c3aed))',
          color: '#fff',
        }}
      >
        <h1 style={{ fontSize: '24pt', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          {doc.profile.fullName || 'Your Name'}
        </h1>
        {doc.profile.headline && (
          <p style={{ fontSize: '11.5pt', opacity: 0.92, marginTop: 2, fontWeight: 500 }}>{doc.profile.headline}</p>
        )}
        <div style={{ marginTop: 10 }}>
          <ContactRow items={contactItems(doc, '#ffffff')} />
        </div>
      </header>

      {visible(doc, 'summary') && doc.summary && (
        <section>
          <SectionTitle>Profile</SectionTitle>
          <p style={{ fontSize: 11, lineHeight: 1.62, color: '#1f2937' }}>{doc.summary}</p>
        </section>
      )}

      {visible(doc, 'experience') && doc.experience.length > 0 && (
        <section>
          <SectionTitle>Experience</SectionTitle>
          <div style={{ display: 'grid', gap: s.itemGap + 4 }}>
            {doc.experience.map((exp) => (
              <div key={exp.id} className="avoid-break">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 12, color: '#0f172a' }}>{exp.role}</span>
                    {exp.company && <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 11.5 }}> · {exp.company}</span>}
                  </div>
                  <span style={{ fontSize: 9.5, color: '#64748b', whiteSpace: 'nowrap' }}>
                    {dateRange(exp.startDate, exp.endDate, exp.current)}
                  </span>
                </div>
                {exp.location && <div style={{ fontSize: 9.5, color: '#64748b' }}>{exp.location}</div>}
                <div style={{ marginTop: 4 }}>
                  <Bullets items={exp.bullets} />
                </div>
                {exp.tech.length > 0 && (
                  <div style={{ marginTop: 5 }}>
                    <Chips items={exp.tech} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {visible(doc, 'skills') && doc.skills.some((g) => g.items.length) && (
        <section>
          <SectionTitle>Skills</SectionTitle>
          <div style={{ display: 'grid', gap: 6 }}>
            {doc.skills
              .filter((g) => g.items.length)
              .map((group) => (
                <div key={group.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, minWidth: 108, color: '#0f172a' }}>{group.name}</span>
                  <div style={{ flex: 1 }}>
                    <Chips items={group.items} />
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {visible(doc, 'projects') && doc.projects.length > 0 && (
        <section>
          <SectionTitle>Projects</SectionTitle>
          <div style={{ display: 'grid', gap: s.itemGap }}>
            {doc.projects.map((p) => (
              <div key={p.id} className="avoid-break">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 11.5, color: '#0f172a' }}>
                    {p.name}
                    {p.role && <span style={{ fontWeight: 400, color: '#475569' }}> — {p.role}</span>}
                  </span>
                  <span style={{ fontSize: 9.5, color: '#64748b' }}>{dateRange(p.startDate, p.endDate)}</span>
                </div>
                {p.link && <div style={{ fontSize: 9.5, color: 'var(--accent)' }}>{prettyUrl(p.link)}</div>}
                {p.description && <p style={{ fontSize: 10.5, color: '#334155', lineHeight: 1.5 }}>{p.description}</p>}
                <Bullets items={p.bullets} />
                {p.tech.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <Chips items={p.tech} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {visible(doc, 'education') && doc.education.length > 0 && (
        <section>
          <SectionTitle>Education</SectionTitle>
          <div style={{ display: 'grid', gap: 8 }}>
            {doc.education.map((e) => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 11.5, color: '#0f172a' }}>{e.school}</div>
                  <div style={{ fontSize: 10.5, color: '#334155' }}>
                    {[e.degree, e.field].filter(Boolean).join(', ')}
                    {e.gpa && ` · GPA ${e.gpa}`}
                  </div>
                  {e.details.filter(Boolean).length > 0 && <Bullets items={e.details} marker="none" />}
                </div>
                <span style={{ fontSize: 9.5, color: '#64748b', whiteSpace: 'nowrap' }}>
                  {dateRange(e.startDate, e.endDate)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {visible(doc, 'certifications') && doc.certifications.length > 0 && (
        <section>
          <SectionTitle>Certifications</SectionTitle>
          <div style={{ display: 'grid', gap: 4 }}>
            {doc.certifications.map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 10.5 }}>
                <span style={{ color: '#0f172a' }}>
                  <b>{c.name}</b>
                  {c.issuer && <span style={{ color: '#475569' }}> — {c.issuer}</span>}
                </span>
                <span style={{ color: '#64748b', fontSize: 9.5 }}>{c.date}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {(visible(doc, 'languages') || visible(doc, 'awards')) && (
        <section>
          {visible(doc, 'languages') && doc.languages.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <SectionTitle>Languages</SectionTitle>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 10.5 }}>
                {doc.languages.map((l) => (
                  <span key={l.id}>
                    <b>{l.name}</b> {l.level && <span style={{ color: '#64748b' }}>· {l.level}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
          {visible(doc, 'awards') && doc.awards.length > 0 && (
            <div>
              <SectionTitle>Awards</SectionTitle>
              <Bullets
                items={doc.awards.map((a) => `${a.title}${a.issuer ? ` — ${a.issuer}` : ''}${a.date ? ` (${a.date})` : ''}${a.description ? `: ${a.description}` : ''}`)}
              />
            </div>
          )}
        </section>
      )}

      {visible(doc, 'custom') &&
        doc.custom.map((c) => (
          <section key={c.id}>
            <SectionTitle>{c.title}</SectionTitle>
            <div style={{ display: 'grid', gap: 6 }}>
              {c.items.map((i) => (
                <div key={i.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 11, color: '#0f172a' }}>{i.title}</span>
                    <span style={{ fontSize: 9.5, color: '#64748b' }}>{i.date}</span>
                  </div>
                  {i.subtitle && <div style={{ fontSize: 10, color: '#475569' }}>{i.subtitle}</div>}
                  {i.description && <p style={{ fontSize: 10.5, color: '#334155' }}>{i.description}</p>}
                </div>
              ))}
            </div>
          </section>
        ))}
    </Page>
  )
}

/* ─────────────────────────────  ONYX  ───────────────────────────── */

export function Onyx({ doc }: { doc: ResumeDocument }) {
  const s = spacing(doc)
  const p = doc.profile
  return (
    <Page doc={doc}>
      <header style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 10 }}>
        <h1 style={{ fontSize: '23pt', fontWeight: 700, letterSpacing: '0.02em', color: '#0b1220' }}>
          {p.fullName || 'Your Name'}
        </h1>
        {p.headline && (
          <p style={{ fontSize: '11pt', fontStyle: 'italic', color: '#334155', marginTop: 2 }}>{p.headline}</p>
        )}
        <div style={{ marginTop: 6, fontSize: 9.5, color: '#475569' }}>
          {[p.email, p.phone, p.location, prettyUrl(p.linkedin), prettyUrl(p.website)].filter(Boolean).join('  •  ')}
        </div>
      </header>

      {visible(doc, 'summary') && doc.summary && (
        <section>
          <SectionTitle variant="center">Executive Profile</SectionTitle>
          <p style={{ fontSize: 11, lineHeight: 1.65, color: '#1f2937', textAlign: 'justify' }}>{doc.summary}</p>
        </section>
      )}

      {visible(doc, 'experience') && doc.experience.length > 0 && (
        <section>
          <SectionTitle variant="center">Professional Experience</SectionTitle>
          <div style={{ display: 'grid', gap: s.itemGap + 2 }}>
            {doc.experience.map((exp) => (
              <div key={exp.id} className="avoid-break">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: '#0b1220' }}>{exp.company}</span>
                  <span style={{ fontSize: 9.5, color: '#475569' }}>
                    {dateRange(exp.startDate, exp.endDate, exp.current)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontStyle: 'italic', fontSize: 11, color: '#334155' }}>{exp.role}</span>
                  <span style={{ fontSize: 9.5, color: '#64748b' }}>{exp.location}</span>
                </div>
                <div style={{ marginTop: 4 }}>
                  <Bullets items={exp.bullets} marker="dash" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {visible(doc, 'skills') && doc.skills.some((g) => g.items.length) && (
        <section>
          <SectionTitle variant="center">Core Competencies</SectionTitle>
          <div style={{ display: 'grid', gap: 5 }}>
            {doc.skills
              .filter((g) => g.items.length)
              .map((g) => (
                <div key={g.id} style={{ fontSize: 10.5, lineHeight: 1.5 }}>
                  <b style={{ color: '#0b1220' }}>{g.name}: </b>
                  <span style={{ color: '#334155' }}>{g.items.join(' · ')}</span>
                </div>
              ))}
          </div>
        </section>
      )}

      {visible(doc, 'education') && doc.education.length > 0 && (
        <section>
          <SectionTitle variant="center">Education</SectionTitle>
          <div style={{ display: 'grid', gap: 6 }}>
            {doc.education.map((e) => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 11 }}>
                  <b>{e.degree}</b>
                  {e.field && `, ${e.field}`} — {e.school}
                </span>
                <span style={{ fontSize: 9.5, color: '#475569' }}>{dateRange(e.startDate, e.endDate)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {visible(doc, 'certifications') && doc.certifications.length > 0 && (
        <section>
          <SectionTitle variant="center">Certifications & Licences</SectionTitle>
          <div style={{ fontSize: 10.5, color: '#334155' }}>
            {doc.certifications.map((c) => `${c.name}${c.issuer ? ` (${c.issuer})` : ''}${c.date ? `, ${c.date}` : ''}`).join('  •  ')}
          </div>
        </section>
      )}

      {visible(doc, 'projects') && doc.projects.length > 0 && (
        <section>
          <SectionTitle variant="center">Selected Projects</SectionTitle>
          <div style={{ display: 'grid', gap: 6 }}>
            {doc.projects.map((pr) => (
              <div key={pr.id}>
                <b style={{ fontSize: 11 }}>{pr.name}</b>
                {pr.description && <span style={{ fontSize: 10.5, color: '#334155' }}> — {pr.description}</span>}
                <Bullets items={pr.bullets} marker="dash" />
              </div>
            ))}
          </div>
        </section>
      )}
    </Page>
  )
}

/* ─────────────────────────────  QUANTUM  ───────────────────────────── */

export function Quantum({ doc }: { doc: ResumeDocument }) {
  const s = spacing(doc)
  const p = doc.profile
  return (
    <Page doc={doc}>
      <header style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 10,
            background: 'var(--accent)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontSize: 17,
            fontWeight: 800,
          }}
        >
          {(p.fullName || 'AR')
            .split(' ')
            .map((w) => w[0])
            .slice(0, 2)
            .join('')}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '19pt', fontWeight: 800, color: '#0b1220', letterSpacing: '-0.01em' }}>
            {p.fullName || 'Your Name'}
          </h1>
          <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>{p.headline}</div>
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          fontSize: 9.5,
          color: '#475569',
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
          padding: '6px 0',
        }}
      >
        {[p.email, p.phone, p.location, prettyUrl(p.github), prettyUrl(p.linkedin), prettyUrl(p.website)]
          .filter(Boolean)
          .map((x, i) => (
            <span key={i}>{x}</span>
          ))}
      </div>

      {visible(doc, 'summary') && doc.summary && (
        <section>
          <SectionTitle variant="bar">// summary</SectionTitle>
          <p style={{ fontSize: 10.5, lineHeight: 1.6, color: '#1f2937' }}>{doc.summary}</p>
        </section>
      )}

      {visible(doc, 'skills') && doc.skills.some((g) => g.items.length) && (
        <section>
          <SectionTitle variant="bar">// stack</SectionTitle>
          <div style={{ display: 'grid', gap: 5 }}>
            {doc.skills
              .filter((g) => g.items.length)
              .map((g) => (
                <div key={g.id} style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, minWidth: 96, color: '#0b1220' }}>{g.name}</span>
                  <Chips items={g.items} tone="plain" />
                </div>
              ))}
          </div>
        </section>
      )}

      {visible(doc, 'experience') && doc.experience.length > 0 && (
        <section>
          <SectionTitle variant="bar">// experience</SectionTitle>
          <div style={{ display: 'grid', gap: s.itemGap + 2 }}>
            {doc.experience.map((exp) => (
              <div key={exp.id} className="avoid-break">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0b1220' }}>
                    {exp.role} <span style={{ color: 'var(--accent)' }}>@ {exp.company}</span>
                  </span>
                  <span style={{ fontSize: 9.5, color: '#64748b' }}>
                    {dateRange(exp.startDate, exp.endDate, exp.current)}
                  </span>
                </div>
                <div style={{ marginTop: 3 }}>
                  <Bullets items={exp.bullets} marker="dash" />
                </div>
                {exp.tech.length > 0 && (
                  <div style={{ marginTop: 4, fontSize: 9, color: '#64748b' }}>[ {exp.tech.join(' · ')} ]</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {visible(doc, 'projects') && doc.projects.length > 0 && (
        <section>
          <SectionTitle variant="bar">// projects</SectionTitle>
          <div style={{ display: 'grid', gap: 7 }}>
            {doc.projects.map((pr) => (
              <div key={pr.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0b1220' }}>
                    {pr.name}
                    {pr.link && <span style={{ color: 'var(--accent)', fontWeight: 400 }}> ↗ {prettyUrl(pr.link)}</span>}
                  </span>
                  <span style={{ fontSize: 9, color: '#64748b' }}>{pr.tech.slice(0, 5).join(' · ')}</span>
                </div>
                {pr.description && <p style={{ fontSize: 10, color: '#334155' }}>{pr.description}</p>}
                <Bullets items={pr.bullets} marker="dash" />
              </div>
            ))}
          </div>
        </section>
      )}

      {visible(doc, 'education') && doc.education.length > 0 && (
        <section>
          <SectionTitle variant="bar">// education</SectionTitle>
          <div style={{ display: 'grid', gap: 5 }}>
            {doc.education.map((e) => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 10.5 }}>
                <span>
                  <b>{e.school}</b> — {[e.degree, e.field].filter(Boolean).join(', ')}
                </span>
                <span style={{ color: '#64748b', fontSize: 9.5 }}>{dateRange(e.startDate, e.endDate)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {visible(doc, 'certifications') && doc.certifications.length > 0 && (
        <section>
          <SectionTitle variant="bar">// certifications</SectionTitle>
          <div style={{ fontSize: 10, color: '#334155' }}>
            {doc.certifications.map((c) => `${c.name}${c.issuer ? ` — ${c.issuer}` : ''}`).join('  ·  ')}
          </div>
        </section>
      )}
    </Page>
  )
}

/* ─────────────────────────────  MERIDIAN  ───────────────────────────── */

export function Meridian({ doc }: { doc: ResumeDocument }) {
  const s = spacing(doc)
  const p = doc.profile
  return (
    <Page doc={doc}>
      <header style={{ marginBottom: 4 }}>
        <h1 style={{ fontSize: '20pt', fontWeight: 700, color: '#000' }}>{p.fullName || 'Your Name'}</h1>
        <div style={{ fontSize: 10, color: '#111' }}>{p.headline}</div>
        <div style={{ fontSize: 9.5, color: '#333', marginTop: 2 }}>
          {[p.location, p.phone, p.email, prettyUrl(p.linkedin)].filter(Boolean).join(' | ')}
        </div>
      </header>

      {visible(doc, 'summary') && doc.summary && (
        <section>
          <SectionTitle variant="plain">Summary</SectionTitle>
          <p style={{ fontSize: 10.5, lineHeight: 1.55, color: '#111' }}>{doc.summary}</p>
        </section>
      )}

      {visible(doc, 'experience') && doc.experience.length > 0 && (
        <section>
          <SectionTitle variant="plain">Experience</SectionTitle>
          <div style={{ display: 'grid', gap: s.itemGap }}>
            {doc.experience.map((exp) => (
              <div key={exp.id} className="avoid-break">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <b style={{ fontSize: 11 }}>{exp.company}</b>
                  <span style={{ fontSize: 9.5 }}>{dateRange(exp.startDate, exp.endDate, exp.current)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <i style={{ fontSize: 10.5 }}>{exp.role}</i>
                  <span style={{ fontSize: 9.5 }}>{exp.location}</span>
                </div>
                <div style={{ marginTop: 3 }}>
                  <Bullets items={exp.bullets} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {visible(doc, 'education') && doc.education.length > 0 && (
        <section>
          <SectionTitle variant="plain">Education</SectionTitle>
          <div style={{ display: 'grid', gap: 6 }}>
            {doc.education.map((e) => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 10.5 }}>
                  <b>{e.school}</b>
                  {e.degree && ` — ${e.degree}${e.field ? `, ${e.field}` : ''}`}
                </span>
                <span style={{ fontSize: 9.5 }}>{dateRange(e.startDate, e.endDate)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {visible(doc, 'skills') && doc.skills.some((g) => g.items.length) && (
        <section>
          <SectionTitle variant="plain">Skills</SectionTitle>
          <div style={{ display: 'grid', gap: 4, fontSize: 10.5 }}>
            {doc.skills
              .filter((g) => g.items.length)
              .map((g) => (
                <div key={g.id}>
                  <b>{g.name}: </b>
                  {g.items.join(', ')}
                </div>
              ))}
          </div>
        </section>
      )}

      {visible(doc, 'certifications') && doc.certifications.length > 0 && (
        <section>
          <SectionTitle variant="plain">Certifications</SectionTitle>
          <div style={{ fontSize: 10.5 }}>
            {doc.certifications.map((c) => `${c.name}${c.issuer ? `, ${c.issuer}` : ''}${c.date ? ` (${c.date})` : ''}`).join('; ')}
          </div>
        </section>
      )}

      {visible(doc, 'projects') && doc.projects.length > 0 && (
        <section>
          <SectionTitle variant="plain">Projects</SectionTitle>
          <div style={{ display: 'grid', gap: 5 }}>
            {doc.projects.map((pr) => (
              <div key={pr.id}>
                <b style={{ fontSize: 10.5 }}>{pr.name}</b>
                {pr.description && <span style={{ fontSize: 10.5 }}> — {pr.description}</span>}
                <Bullets items={pr.bullets} />
              </div>
            ))}
          </div>
        </section>
      )}
    </Page>
  )
}

/* ─────────────────────────────  LUMEN (academic CV)  ───────────────────────────── */

export function Lumen({ doc }: { doc: ResumeDocument }) {
  const s = spacing(doc)
  const p = doc.profile
  return (
    <Page doc={doc}>
      <header style={{ textAlign: 'center', marginBottom: 6 }}>
        <h1 style={{ fontSize: '21pt', fontWeight: 700, color: '#111827', letterSpacing: '0.04em' }}>
          {(p.fullName || 'Your Name').toUpperCase()}
        </h1>
        <div style={{ fontSize: 10, color: '#374151', marginTop: 3 }}>
          {[p.headline, p.location].filter(Boolean).join(' · ')}
        </div>
        <div style={{ fontSize: 9.5, color: '#4b5563' }}>
          {[p.email, p.phone, prettyUrl(p.website), prettyUrl(p.linkedin)].filter(Boolean).join('  |  ')}
        </div>
      </header>

      {visible(doc, 'summary') && doc.summary && (
        <section>
          <SectionTitle variant="plain">Research Profile</SectionTitle>
          <p style={{ fontSize: 10.5, lineHeight: 1.65, color: '#1f2937', textAlign: 'justify' }}>{doc.summary}</p>
        </section>
      )}

      {visible(doc, 'education') && doc.education.length > 0 && (
        <section>
          <SectionTitle variant="plain">Education</SectionTitle>
          <div style={{ display: 'grid', gap: 7 }}>
            {doc.education.map((e) => (
              <div key={e.id} style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 9.5, color: '#4b5563', minWidth: 92 }}>
                  {dateRange(e.startDate, e.endDate)}
                </span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#111827' }}>{e.school}</div>
                  <div style={{ fontSize: 10.5, color: '#374151' }}>
                    {[e.degree, e.field].filter(Boolean).join(' in ')}
                    {e.gpa && ` · ${e.gpa}`}
                  </div>
                  <Bullets items={e.details} marker="none" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {visible(doc, 'experience') && doc.experience.length > 0 && (
        <section>
          <SectionTitle variant="plain">Academic & Professional Appointments</SectionTitle>
          <div style={{ display: 'grid', gap: s.itemGap }}>
            {doc.experience.map((exp) => (
              <div key={exp.id} style={{ display: 'flex', gap: 10 }} className="avoid-break">
                <span style={{ fontSize: 9.5, color: '#4b5563', minWidth: 92 }}>
                  {dateRange(exp.startDate, exp.endDate, exp.current)}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#111827' }}>{exp.role}</div>
                  <div style={{ fontSize: 10.5, color: '#374151', fontStyle: 'italic' }}>{exp.company}</div>
                  <Bullets items={exp.bullets} marker="dash" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {visible(doc, 'projects') && doc.projects.length > 0 && (
        <section>
          <SectionTitle variant="plain">Publications & Projects</SectionTitle>
          <ol style={{ paddingLeft: 16, margin: 0, display: 'grid', gap: 5 }}>
            {doc.projects.map((pr) => (
              <li key={pr.id} style={{ fontSize: 10.5, color: '#1f2937', lineHeight: 1.5 }}>
                <b>{pr.name}</b>
                {pr.role && ` — ${pr.role}`}
                {pr.description && `. ${pr.description}`}
                {pr.link && <span style={{ color: 'var(--accent)' }}> {prettyUrl(pr.link)}</span>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {visible(doc, 'skills') && doc.skills.some((g) => g.items.length) && (
        <section>
          <SectionTitle variant="plain">Skills & Methods</SectionTitle>
          <div style={{ display: 'grid', gap: 4, fontSize: 10.5 }}>
            {doc.skills
              .filter((g) => g.items.length)
              .map((g) => (
                <div key={g.id}>
                  <b>{g.name}: </b>
                  {g.items.join(' · ')}
                </div>
              ))}
          </div>
        </section>
      )}

      {visible(doc, 'awards') && doc.awards.length > 0 && (
        <section>
          <SectionTitle variant="plain">Grants & Honors</SectionTitle>
          <div style={{ display: 'grid', gap: 5 }}>
            {doc.awards.map((a) => (
              <div key={a.id} style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 9.5, color: '#4b5563', minWidth: 92 }}>{a.date}</span>
                <span style={{ fontSize: 10.5 }}>
                  <b>{a.title}</b>
                  {a.issuer && `, ${a.issuer}`}
                  {a.description && ` — ${a.description}`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {visible(doc, 'certifications') && doc.certifications.length > 0 && (
        <section>
          <SectionTitle variant="plain">Certifications & Training</SectionTitle>
          <div style={{ fontSize: 10.5, color: '#1f2937' }}>
            {doc.certifications.map((c) => `${c.name}${c.issuer ? ` — ${c.issuer}` : ''}${c.date ? ` (${c.date})` : ''}`).join('; ')}
          </div>
        </section>
      )}
    </Page>
  )
}

export const basicTemplates: Record<string, (p: { doc: ResumeDocument; meta?: TemplateMeta }) => React.ReactElement> = {
  aurora: Aurora,
  onyx: Onyx,
  quantum: Quantum,
  meridian: Meridian,
  lumen: Lumen,
}
