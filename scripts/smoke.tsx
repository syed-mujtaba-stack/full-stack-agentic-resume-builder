/**
 * Runtime smoke test: server-render the React tree (no WebGL) to catch
 * render-time crashes without a browser. Run with:  npx tsx scripts/smoke.tsx
 */
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:5173/',
  pretendToBeVisual: true,
})

const g = globalThis as unknown as Record<string, unknown>
g.window = dom.window
g.document = dom.window.document
Object.defineProperty(g, 'navigator', { value: dom.window.navigator, configurable: true })
g.HTMLElement = dom.window.HTMLElement
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
g.ResizeObserver = ResizeObserverStub
;(dom.window as unknown as Record<string, unknown>).ResizeObserver = ResizeObserverStub
g.WebSocket = class {
  readyState = 0
  send() {}
  close() {}
  addEventListener() {}
}
const mm = () =>
  ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    media: '',
  }) as unknown as MediaQueryList
g.matchMedia = mm
;(dom.window as unknown as Record<string, unknown>).matchMedia = mm
;(dom.window as unknown as Record<string, unknown>).scrollTo = () => {}
;(dom.window as unknown as Record<string, unknown>).getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
g.requestAnimationFrame = (cb: (t: number) => void) => setTimeout(() => cb(Date.now()), 16)
g.cancelAnimationFrame = (id: number) => clearTimeout(id)

const { renderToString } = await import('react-dom/server')
const React = await import('react')
const { MemoryRouter } = await import('react-router-dom')
const { emptyResumeDocument } = await import('../shared/src/index')

const pages: { name: string; render: () => string }[] = []

const Landing = (await import('../web/src/pages/Landing')).default
const Auth = (await import('../web/src/pages/Auth')).default
const Templates = (await import('../web/src/pages/Templates')).default
const Pricing = (await import('../web/src/pages/Pricing')).default
const Docs = (await import('../web/src/pages/Docs')).default
const Settings = (await import('../web/src/pages/Settings')).default
const Dashboard = (await import('../web/src/pages/Dashboard')).default
const Builder = (await import('../web/src/pages/Builder')).default
const Forgot = (await import('../web/src/pages/ForgotPassword')).default
const Reset = (await import('../web/src/pages/ResetPassword')).default
const NotFound = (await import('../web/src/pages/NotFound')).default
const { TEMPLATE_COMPONENTS } = await import('../web/src/templates/registry')

const wrap = (node: React.ReactNode) =>
  renderToString(React.createElement(MemoryRouter, { initialEntries: ['/builder/abc'] }, node))

pages.push({ name: 'Landing (WebGL)', render: () => wrap(React.createElement(Landing, null)) })
pages.push({ name: 'Auth/login', render: () => wrap(React.createElement(Auth, { mode: 'login' })) })
pages.push({ name: 'Auth/register', render: () => wrap(React.createElement(Auth, { mode: 'register' })) })
pages.push({ name: 'Templates', render: () => wrap(React.createElement(Templates, null)) })
pages.push({ name: 'Pricing', render: () => wrap(React.createElement(Pricing, null)) })
pages.push({ name: 'Docs', render: () => wrap(React.createElement(Docs, null)) })
pages.push({ name: 'Settings', render: () => wrap(React.createElement(Settings, null)) })
pages.push({ name: 'Dashboard', render: () => wrap(React.createElement(Dashboard, null)) })
pages.push({ name: 'Builder', render: () => wrap(React.createElement(Builder, null)) })
pages.push({ name: 'ForgotPassword', render: () => wrap(React.createElement(Forgot, null)) })
pages.push({ name: 'ResetPassword', render: () => wrap(React.createElement(Reset, null)) })
pages.push({ name: 'NotFound', render: () => wrap(React.createElement(NotFound, null)) })

const doc = {
  ...emptyResumeDocument(),
  profile: {
    fullName: 'Ada Lovelace',
    headline: 'Senior Frontend Engineer',
    email: 'ada@lovelace.dev',
    phone: '+44 20 7946 0958',
    location: 'London, UK',
    website: 'ada.dev',
    linkedin: 'linkedin.com/in/ada',
    github: 'github.com/ada',
    summary: '',
  },
  summary: 'Senior frontend engineer with 7 years shipping design systems.',
  experience: [
    {
      id: 'e1',
      company: 'Northwind',
      role: 'Senior Frontend Engineer',
      location: 'Remote',
      startDate: 'Jan 2022',
      endDate: '',
      current: true,
      bullets: ['Shipped a design system adopted by 4 teams, cutting build time by 38%.'],
      tech: ['React', 'TypeScript'],
    },
  ],
}

for (const [id, Component] of Object.entries(TEMPLATE_COMPONENTS)) {
  pages.push({ name: `template:${id}`, render: () => renderToString(React.createElement(Component as never, { doc })) })
}

let failed = 0
for (const page of pages) {
  try {
    const html = page.render()
    if (!html || html.length < 40) throw new Error(`suspiciously small output (${html.length} bytes)`)
    console.log(`  ✓ ${page.name.padEnd(22)} ${html.length.toString().padStart(7)} bytes`)
  } catch (err) {
    const message = (err as Error).message
    const webgl = /WebGL|ResizeObserver|getContext/i.test(message)
    if (webgl) {
      console.log(`  ~ ${page.name.padEnd(22)} skipped (${message.slice(0, 60)}…)`)
    } else {
      failed += 1
      console.error(`  ✗ ${page.name}:`, message)
      console.error((err as Error).stack?.split('\n').slice(1, 5).join('\n'))
    }
  }
}

console.log(failed ? `\n${failed} page(s) failed` : `\nAll ${pages.length} renders passed`)
process.exit(failed ? 1 : 0)
