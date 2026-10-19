import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Navbar } from './components/layout/Navbar'
import { Footer } from './components/layout/Footer'
import { Toaster } from './components/ui'
import { useAuth } from './store/auth'
import { useRealtime } from './store/realtime'
import { useUi } from './store/ui'
import { useBuilder } from './store/builder'
import { getTemplate } from './templates/registry'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Builder from './pages/Builder'
import Templates from './pages/Templates'
import Pricing from './pages/Pricing'
import Settings from './pages/Settings'
import Docs from './pages/Docs'
import PublicResume from './pages/PublicResume'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import NotFound from './pages/NotFound'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const status = useAuth((s) => s.status)
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="grid h-[70vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-aurora-400" />
      </div>
    )
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}

/** Rendered outside the `no-print` shell so the PDF contains only the page. */
function PrintRoot() {
  const printMode = useUi((s) => s.printMode)
  const doc = useBuilder((s) => s.document)
  const templateId = useBuilder((s) => s.templateId)
  const Template = getTemplate(templateId)
  if (!printMode) return null
  return (
    <div id="print-root">
      <Template doc={doc} />
    </div>
  )
}

export default function App() {
  const status = useAuth((s) => s.status)
  const bootstrap = useAuth((s) => s.bootstrap)
  const connect = useRealtime((s) => s.connect)
  const disconnect = useRealtime((s) => s.disconnect)

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  useEffect(() => {
    if (status === 'authenticated') connect()
    else disconnect()
  }, [status, connect, disconnect])

  return (
    <>
      <div className="no-print flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Auth mode="login" />} />
            <Route path="/register" element={<Auth mode="register" />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/r/:slug" element={<PublicResume />} />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/builder/:id"
              element={
                <RequireAuth>
                  <Builder />
                </RequireAuth>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireAuth>
                  <Settings />
                </RequireAuth>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>

      <PrintRoot />
      <Toaster />
    </>
  )
}
