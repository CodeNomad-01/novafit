'use client'

import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { FiAlertCircle, FiLock, FiLogIn, FiMail } from 'react-icons/fi'
import { AuthLayout } from '@/components/AuthLayout'
import { useAuth } from '@/lib/auth/context'

export default function LoginPage() {
  const router = useRouter()
  const { user, loading, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const redirect =
    typeof router.query.redirect === 'string' ? router.query.redirect : '/'

  useEffect(() => {
    if (!loading && user) router.replace(redirect)
  }, [loading, user, redirect, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const res = await login(email, password)
    setSubmitting(false)
    if (!res.ok) {
      setError(res.error ?? 'No se pudo iniciar sesión.')
      return
    }
    router.replace(redirect)
  }

  return (
    <AuthLayout
      eyebrow="[ LOGIN TERMINAL ]"
      title="Accede al Sistema"
      subtitle="Identifícate como cazador para desbloquear tu panel de misiones."
      footer={
        <>
          ¿Aún no tienes cuenta?{' '}
          <Link
            href="/register"
            className="sl-focus font-semibold text-[var(--sl-cyan)] hover:underline"
          >
            Crear cazador
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="sl-field-label">
            Email
          </label>
          <div className="relative">
            <span
              className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--sl-muted)]"
              aria-hidden
            >
              <FiMail className="h-4 w-4" />
            </span>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              className="sl-input pl-10"
              placeholder="cazador@guild.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="sl-field-label">
            Contraseña
          </label>
          <div className="relative">
            <span
              className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--sl-muted)]"
              aria-hidden
            >
              <FiLock className="h-4 w-4" />
            </span>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="sl-input pl-10"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="sl-corners flex items-start gap-2 border border-[var(--sl-danger)]/45 bg-[rgba(255,94,123,0.08)] p-3 text-sm text-[var(--sl-danger)]"
          >
            <FiAlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden
            />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="sl-btn sl-btn-primary sl-focus w-full py-4"
        >
          <FiLogIn className="h-5 w-5" aria-hidden />
          {submitting ? 'Conectando...' : 'Iniciar sesión'}
        </button>
      </form>
    </AuthLayout>
  )
}
