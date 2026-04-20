'use client'

import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import {
  FiAlertCircle,
  FiLock,
  FiMail,
  FiUser,
  FiUserPlus,
} from 'react-icons/fi'
import { AuthLayout } from '@/components/AuthLayout'
import { useAuth } from '@/lib/auth/context'

export default function RegisterPage() {
  const router = useRouter()
  const { user, loading, register } = useAuth()
  const [form, setForm] = useState({
    username: '',
    displayName: '',
    email: '',
    password: '',
    password2: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) router.replace('/')
  }, [loading, user, router])

  function onChange(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (form.password !== form.password2) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setSubmitting(true)
    const res = await register({
      username: form.username,
      password: form.password,
      displayName: form.displayName,
      email: form.email,
    })
    setSubmitting(false)
    if (!res.ok) {
      setError(res.error ?? 'No se pudo registrar.')
      return
    }
    if (res.user) {
      router.replace('/')
    } else {
      setError(
        'Registro enviado. Revisa tu correo para confirmar y después inicia sesión.',
      )
    }
  }

  return (
    <AuthLayout
      eyebrow="[ NEW HUNTER · REGISTRY ]"
      title="Crea tu cazador"
      subtitle="Un código de cazador único se asignará al completar el registro."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link
            href="/login"
            className="sl-focus font-semibold text-[var(--sl-cyan)] hover:underline"
          >
            Acceder
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="sl-field-label">
            Usuario (identificador)
          </label>
          <div className="relative">
            <span
              className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--sl-muted)]"
              aria-hidden
            >
              <FiUser className="h-4 w-4" />
            </span>
            <input
              id="username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              className="sl-input pl-10"
              placeholder="cazador_01"
              value={form.username}
              onChange={(e) => onChange('username', e.target.value)}
              required
            />
          </div>
          <p className="mt-1.5 text-[0.7rem] text-[var(--sl-muted)]">
            3-24 caracteres · minúsculas, números y guión bajo
          </p>
        </div>

        <div>
          <label htmlFor="displayName" className="sl-field-label">
            Nombre visible
          </label>
          <input
            id="displayName"
            name="displayName"
            autoComplete="nickname"
            className="sl-input"
            placeholder="Ej. Sung Jin-Woo"
            value={form.displayName}
            onChange={(e) => onChange('displayName', e.target.value)}
          />
        </div>

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
              className="sl-input pl-10"
              placeholder="cazador@guild.io"
              value={form.email}
              onChange={(e) => onChange('email', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
                autoComplete="new-password"
                className="sl-input pl-10"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => onChange('password', e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>
          <div>
            <label htmlFor="password2" className="sl-field-label">
              Repetir
            </label>
            <div className="relative">
              <span
                className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--sl-muted)]"
                aria-hidden
              >
                <FiLock className="h-4 w-4" />
              </span>
              <input
                id="password2"
                name="password2"
                type="password"
                autoComplete="new-password"
                className="sl-input pl-10"
                placeholder="••••••••"
                value={form.password2}
                onChange={(e) => onChange('password2', e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>
        </div>

        <p className="sl-corners border border-[var(--sl-border)] bg-[rgba(8,14,30,0.5)] p-3 text-[0.72rem] leading-relaxed text-[var(--sl-text-dim)]">
          Tu cuenta se crea en el{' '}
          <span className="text-[var(--sl-cyan)]">Sistema</span> (Supabase). Usa
          tu email para iniciar sesión; tu <code>@usuario</code> es el que
          usarán tus aliados para encontrarte.
        </p>

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
          <FiUserPlus className="h-5 w-5" aria-hidden />
          {submitting ? 'Registrando...' : 'Registrar cazador'}
        </button>
      </form>
    </AuthLayout>
  )
}
