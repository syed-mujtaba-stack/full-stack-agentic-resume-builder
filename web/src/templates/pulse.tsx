import type { ResumeDocument } from '@arbor/shared'
import { Bullets, Chips, Page, SectionTitle, dateRange, prettyUrl, spacing, visible } from './parts'

/** Dense one-pager — students, career switchers, support & retail roles. */
export function Pulse({ doc }: { doc: ResumeDocument }) {
  const s = spacing(doc)
  const p = doc.profile

  return (
    <Page doc={doc}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: '18pt', fontWeight: 800, color: '#0b1220', lineHeight: 1.05 }}>
            {p.fullName || 'Your Name'}
          </h1>
          <div style={{ fontSize: '10.5pt', color: 'var(--accent)', fontWeight: 600 }}>{p.headline}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 9, color: '#475569', lineHeight: 1.45 }}>
          {[p.email, p.phone, p.location].filter(Boolean).map((x, i) => (
            <div key={i}>{x}</div>
          ))}
          {(p.linkedin || p.website) && <div>{prettyUrl(p.linkedin || p.website)}</div>}
        </div>
      </header>

      <div style={{ height: 3, background: 'var(--accent)', borderRadius: 999 }} />

      {visible(doc, 'summary') && doc.summary && (
        <section>
          <SectionTitle variant="bar">Summary</SectionTitle>
          <p style={{ fontSize: 10, lineHeight: 1.5, color: '#1f2937' }}>{doc.summary}</p>
        </section>
      )}

      {visible(doc, 'skills') && doc.skills.some((g) => g.items.length) && (
        <section>
          <SectionTitle variant="bar">Skills</SectionTitle>
          <div style={{ display: 'grid', gap: 4 }}>
            {doc.skills
              .filter((g) => g.items.length)
              .map((g) => (
                <div key={g.id} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, minWidth: 92, color: '#0b1220' }}>{g.name}</span>
                  <span style={{ fontSize: 10, color: '#334155' }}>{g.items.join(' · ')}</span>
                </div>
              ))}
          </div>
        </section>
      )}

      {visible(doc, 'experience') && doc.experience.length > 0 && (
        <section>
          <SectionTitle variant="bar">Experience</SectionTitle>
          <div style={{ display: 'grid', gap: s.itemGap - 2 }}>
            {doc.experience.map((exp) => (
              <div key={exp.id} className="avoid-break">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <b style={{ fontSize: 10.5, color: '#0b1220' }}>
                    {exp.role}
                    {exp.company && <span style={{ color: 'var(--accent)' }}> · {exp.company}</span>}
                  </b>
                  <span style={{ fontSize: 9, color: '#64748b', whiteSpace: 'nowrap' }}>
                    {dateRange(exp.startDate, exp.endDate, exp.current)}
                  </span>
                </div>
                <Bullets items={exp.bullets} />
              </div>
            ))}
          </div>
        </section>
      )}

      {visible(doc, 'projects') && doc.projects.length > 0 && (
        <section>
          <SectionTitle variant="bar">Projects</SectionTitle>
          <div style={{ display: 'grid', gap: 5 }}>
            {doc.projects.map((pr) => (
              <div key={pr.id}>
                <b style={{ fontSize: 10.5 }}>{pr.name}</b>
                {pr.description && <span style={{ fontSize: 10, color: '#334155' }}> — {pr.description}</span>}
                <Bullets items={pr.bullets} />
                {pr.tech.length > 0 && (
                  <div style={{ marginTop: 3 }}>
                    <Chips items={pr.tech.slice(0, 6)} tone="plain" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {visible(doc, 'education') && doc.education.length > 0 && (
        <section>
          <SectionTitle variant="bar">Education</SectionTitle>
          <div style={{ display: 'grid', gap: 4 }}>
            {doc.education.map((e) => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 10 }}>
                <span>
                  <b>{e.school}</b>
                  {e.degree && ` — ${e.degree}${e.field ? `, ${e.field}` : ''}`}
                </span>
                <span style={{ color: '#64748b', fontSize: 9 }}>{dateRange(e.startDate, e.endDate)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {visible(doc, 'certifications') && doc.certifications.length > 0 && (
        <section>
          <SectionTitle variant="bar">Certifications</SectionTitle>
          <div style={{ fontSize: 10, color: '#334155' }}>
            {doc.certifications.map((c) => `${c.name}${c.issuer ? ` — ${c.issuer}` : ''}${c.date ? ` (${c.date})` : ''}`).join('  ·  ')}
          </div>
        </section>
      )}

      {visible(doc, 'languages') && doc.languages.length > 0 && (
        <section>
          <SectionTitle variant="bar">Languages</SectionTitle>
          <div style={{ fontSize: 10, color: '#334155' }}>
            {doc.languages.map((l) => `${l.name}${l.level ? ` (${l.level})` : ''}`).join('  ·  ')}
          </div>
        </section>
      )}

      {visible(doc, 'awards') && doc.awards.length > 0 && (
        <section>
          <SectionTitle variant="bar">Awards</SectionTitle>
          <Bullets
            items={doc.awards.map((a) => `${a.title}${a.issuer ? ` — ${a.issuer}` : ''}${a.date ? ` (${a.date})` : ''}`)}
          />
        </section>
      )}
    </Page>
  )
}
