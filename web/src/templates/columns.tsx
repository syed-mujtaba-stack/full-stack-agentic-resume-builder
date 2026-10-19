import { Mail, MapPin, Phone } from 'lucide-react'
import { BrandGithub as Github, BrandLinkedin as Linkedin } from '../components/ui/BrandIcons'
import type { ResumeDocument } from '@arbor/shared'
import { Bullets, Chips, Page, SectionTitle, dateRange, prettyUrl, spacing, visible } from './parts'

const ic = { size: 9.5, strokeWidth: 1.8 }

/* ─────────────────────────────  NOVA (two column)  ───────────────────────────── */

export function Nova({ doc }: { doc: ResumeDocument }) {
  const s = spacing(doc)
  const p = doc.profile
  return (
    <Page doc={doc}>
      <header style={{ borderBottom: '2px solid var(--accent)', paddingBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '22pt', fontWeight: 800, color: '#0b1220', lineHeight: 1.05 }}>
              {p.fullName || 'Your Name'}
            </h1>
            <div style={{ fontSize: '11pt', color: 'var(--accent)', fontWeight: 600, marginTop: 2 }}>{p.headline}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 9.5, color: '#475569', lineHeight: 1.5 }}>
            {p.email && <div>{p.email}</div>}
            {p.phone && <div>{p.phone}</div>}
            {p.location && <div>{p.location}</div>}
            {(p.linkedin || p.github) && <div>{prettyUrl(p.linkedin || p.github)}</div>}
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1.65fr 1fr', gap: 20, flex: 1 }}>
        {/* main column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: s.gap }}>
          {visible(doc, 'summary') && doc.summary && (
            <section>
              <SectionTitle>Profile</SectionTitle>
              <p style={{ fontSize: 10.5, lineHeight: 1.6, color: '#1f2937' }}>{doc.summary}</p>
            </section>
          )}

          {visible(doc, 'experience') && doc.experience.length > 0 && (
            <section>
              <SectionTitle>Experience</SectionTitle>
              <div style={{ display: 'grid', gap: s.itemGap }}>
                {doc.experience.map((exp) => (
                  <div key={exp.id} className="avoid-break">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                      <b style={{ fontSize: 11.5, color: '#0b1220' }}>{exp.role}</b>
                      <span style={{ fontSize: 9, color: '#64748b', whiteSpace: 'nowrap' }}>
                        {dateRange(exp.startDate, exp.endDate, exp.current)}
                      </span>
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--accent)', fontWeight: 600 }}>{exp.company}</div>
                    <div style={{ marginTop: 3 }}>
                      <Bullets items={exp.bullets} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {visible(doc, 'projects') && doc.projects.length > 0 && (
            <section>
              <SectionTitle>Projects</SectionTitle>
              <div style={{ display: 'grid', gap: 8 }}>
                {doc.projects.map((pr) => (
                  <div key={pr.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <b style={{ fontSize: 11, color: '#0b1220' }}>{pr.name}</b>
                      <span style={{ fontSize: 9, color: '#64748b' }}>{pr.tech.slice(0, 4).join(' · ')}</span>
                    </div>
                    {pr.description && <p style={{ fontSize: 10, color: '#334155' }}>{pr.description}</p>}
                    <Bullets items={pr.bullets} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: s.gap - 2 }}>
          {visible(doc, 'skills') && doc.skills.some((g) => g.items.length) && (
            <section>
              <SectionTitle>Skills</SectionTitle>
              <div style={{ display: 'grid', gap: 8 }}>
                {doc.skills
                  .filter((g) => g.items.length)
                  .map((g) => (
                    <div key={g.id}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: '#0b1220', marginBottom: 3 }}>{g.name}</div>
                      <Chips items={g.items} />
                    </div>
                  ))}
              </div>
            </section>
          )}

          {visible(doc, 'education') && doc.education.length > 0 && (
            <section>
              <SectionTitle>Education</SectionTitle>
              <div style={{ display: 'grid', gap: 7 }}>
                {doc.education.map((e) => (
                  <div key={e.id}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: '#0b1220' }}>{e.school}</div>
                    <div style={{ fontSize: 10, color: '#334155' }}>{[e.degree, e.field].filter(Boolean).join(', ')}</div>
                    <div style={{ fontSize: 9, color: '#64748b' }}>{dateRange(e.startDate, e.endDate)}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {visible(doc, 'certifications') && doc.certifications.length > 0 && (
            <section>
              <SectionTitle>Certifications</SectionTitle>
              <div style={{ display: 'grid', gap: 4, fontSize: 10 }}>
                {doc.certifications.map((c) => (
                  <div key={c.id}>
                    <b>{c.name}</b>
                    {c.issuer && <div style={{ color: '#64748b', fontSize: 9 }}>{c.issuer}</div>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {visible(doc, 'languages') && doc.languages.length > 0 && (
            <section>
              <SectionTitle>Languages</SectionTitle>
              <div style={{ display: 'grid', gap: 3, fontSize: 10 }}>
                {doc.languages.map((l) => (
                  <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                    <span>{l.name}</span>
                    <span style={{ color: '#64748b' }}>{l.level}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </Page>
  )
}

/* ─────────────────────────────  VERTEX (creative)  ───────────────────────────── */

export function Vertex({ doc }: { doc: ResumeDocument }) {
  const s = spacing(doc)
  const p = doc.profile
  const initials = (p.fullName || 'YN')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <Page doc={doc} className="p-0!">
      <div style={{ display: 'grid', gridTemplateColumns: '0.72fr 1.6fr', minHeight: '100%' }}>
        {/* sidebar */}
        <aside
          style={{
            background: 'linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 55%, #0f172a))',
            color: '#fff',
            padding: '26px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 62,
              height: 62,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.7)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 22,
              fontWeight: 800,
              margin: '0 auto',
            }}
          >
            {initials}
          </div>

          <div style={{ fontSize: 10, display: 'grid', gap: 7 }}>
            <div style={{ fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: 9, opacity: 0.85 }}>
              Contact
            </div>
            {p.email && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Mail {...ic} /> <span style={{ wordBreak: 'break-all' }}>{p.email}</span>
              </div>
            )}
            {p.phone && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Phone {...ic} /> {p.phone}
              </div>
            )}
            {p.location && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <MapPin {...ic} /> {p.location}
              </div>
            )}
            {p.linkedin && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Linkedin {...ic} /> <span style={{ wordBreak: 'break-all' }}>{prettyUrl(p.linkedin)}</span>
              </div>
            )}
            {p.github && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Github {...ic} /> <span style={{ wordBreak: 'break-all' }}>{prettyUrl(p.github)}</span>
              </div>
            )}
          </div>

          {visible(doc, 'skills') &&
            doc.skills
              .filter((g) => g.items.length)
              .map((g) => (
                <div key={g.id}>
                  <div
                    style={{
                      fontWeight: 700,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      fontSize: 9,
                      opacity: 0.85,
                      marginBottom: 6,
                    }}
                  >
                    {g.name}
                  </div>
                  <div style={{ display: 'grid', gap: 5 }}>
                    {g.items.slice(0, 10).map((item, i) => (
                      <div key={item + i}>
                        <div style={{ fontSize: 9.5, marginBottom: 2 }}>{item}</div>
                        <div style={{ height: 3, background: 'rgba(255,255,255,0.28)', borderRadius: 999 }}>
                          <div
                            style={{
                              width: `${Math.max(42, 96 - i * 6)}%`,
                              height: '100%',
                              background: '#fff',
                              borderRadius: 999,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

          {visible(doc, 'languages') && doc.languages.length > 0 && (
            <div>
              <div
                style={{
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  fontSize: 9,
                  opacity: 0.85,
                  marginBottom: 6,
                }}
              >
                Languages
              </div>
              <div style={{ display: 'grid', gap: 4, fontSize: 10 }}>
                {doc.languages.map((l) => (
                  <div key={l.id}>
                    {l.name} <span style={{ opacity: 0.75 }}>· {l.level}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* main */}
        <main style={{ padding: '26px 24px', display: 'flex', flexDirection: 'column', gap: s.gap }}>
          <header>
            <h1 style={{ fontSize: '23pt', fontWeight: 800, color: '#0b1220', lineHeight: 1.05 }}>
              {p.fullName || 'Your Name'}
            </h1>
            <div style={{ fontSize: '11pt', color: 'var(--accent)', fontWeight: 600 }}>{p.headline}</div>
          </header>

          {visible(doc, 'summary') && doc.summary && (
            <section>
              <SectionTitle variant="pill">About</SectionTitle>
              <p style={{ fontSize: 10.5, lineHeight: 1.62, color: '#1f2937' }}>{doc.summary}</p>
            </section>
          )}

          {visible(doc, 'experience') && doc.experience.length > 0 && (
            <section>
              <SectionTitle variant="pill">Experience</SectionTitle>
              <div style={{ display: 'grid', gap: s.itemGap, position: 'relative' }}>
                {doc.experience.map((exp) => (
                  <div key={exp.id} className="avoid-break" style={{ paddingLeft: 14, position: 'relative' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 4,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--accent)',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        left: 3.5,
                        top: 12,
                        bottom: -6,
                        width: 1,
                        background: 'color-mix(in srgb, var(--accent) 35%, transparent)',
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <b style={{ fontSize: 11.5, color: '#0b1220' }}>{exp.role}</b>
                      <span style={{ fontSize: 9, color: '#64748b' }}>
                        {dateRange(exp.startDate, exp.endDate, exp.current)}
                      </span>
                    </div>
                    <div style={{ fontSize: 10.5, color: '#475569' }}>
                      {exp.company}
                      {exp.location && ` · ${exp.location}`}
                    </div>
                    <div style={{ marginTop: 3 }}>
                      <Bullets items={exp.bullets} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {visible(doc, 'projects') && doc.projects.length > 0 && (
            <section>
              <SectionTitle variant="pill">Projects</SectionTitle>
              <div style={{ display: 'grid', gap: 7 }}>
                {doc.projects.map((pr) => (
                  <div key={pr.id}>
                    <b style={{ fontSize: 11, color: '#0b1220' }}>{pr.name}</b>
                    {pr.description && <span style={{ fontSize: 10, color: '#334155' }}> — {pr.description}</span>}
                    <Bullets items={pr.bullets} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {visible(doc, 'education') && doc.education.length > 0 && (
            <section>
              <SectionTitle variant="pill">Education</SectionTitle>
              <div style={{ display: 'grid', gap: 6 }}>
                {doc.education.map((e) => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <b style={{ fontSize: 10.5 }}>{e.school}</b>
                      <div style={{ fontSize: 10, color: '#475569' }}>{[e.degree, e.field].filter(Boolean).join(', ')}</div>
                    </div>
                    <span style={{ fontSize: 9, color: '#64748b' }}>{dateRange(e.startDate, e.endDate)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {visible(doc, 'certifications') && doc.certifications.length > 0 && (
            <section>
              <SectionTitle variant="pill">Certifications</SectionTitle>
              <div style={{ display: 'grid', gap: 4, fontSize: 10 }}>
                {doc.certifications.map((c) => (
                  <div key={c.id}>
                    <b>{c.name}</b>
                    {c.issuer && <span style={{ color: '#64748b' }}> — {c.issuer}</span>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </Page>
  )
}

export const columnTemplates = { nova: Nova, vertex: Vertex }
