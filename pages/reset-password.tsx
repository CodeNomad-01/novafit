'use client'

import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import {
  FiAlertCircle,
  FiCheckCircle,
  FiLock,
  FiLogIn,
  FiShield,
} from 'react-icons/fi'
import { AuthLayout } from '@/components/AuthLayout'
import { useAuth } from '@/lib/auth/context'
import { supabase } from '@/lib/supabase/client'

type Phase = 'verifying' | 'ready' | 'invalid' | 'success'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { changePassword, logout } = useAuth()

  const [phase, setPhase] = useState<Phase>('verifying')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Supabase crea una sesión temporal de tipo "recovery" cuando el usuario
  // aterriza desde el email. Nos suscribimos a los eventos de auth: si llega
  // PASSWORD_RECOVERY o ya hay sesión, habilitamos el formulario. Si no,
  // consideramos el enlace inválido/expirado.
  useEffect(() => {
    let cancelled = false

    async function detect() {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      if (data.session) {
        setPhase('ready')
      } else {
        const hasRecoveryHash =
          typeof window !== 'undefined' &&
          (window.location.hash.includes('type=recovery') ||
            window.location.hash.includes('access_token'))
        if (!hasRecoveryHash) setPhase('invalid')
      }
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY' && session) {
        setPhase('ready')
      } else if (session && phase === 'verifying') {
        setPhase('ready')
      }
    })

    detect()

    const fallback = window.setTimeout(() => {
      if (!cancelled && phase === 'verifying') setPhase('invalid')
    }, 6000)

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
      window.clearTimeout(fallback)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== password2) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setSubmitting(true)
    const res = await changePassword(password)
    setSubmitting(false)
    if (!res.ok) {
      setError(res.error ?? 'No se pudo actualizar la contraseña.')
      return
    }
    setPhase('success')
    // Cerramos la sesión de recovery para forzar un login limpio con la
    // nueva contraseña.
    await logout()
  }

  if (phase === 'verifying') {
    return (
      <AuthLayout
        eyebrow="[ RECOVERY PROTOCOL ]"
        title="Verificando enlace"
        subtitle="Confirmando tu identidad con el Sistema..."
      >
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <span className="sl-label">[ HANDSHAKE · SUPABASE ]</span>
          <div className="h-1 w-40 overflow-hidden bg-[var(--sl-border)]">
            <div
              className="h-full w-full animate-pulse bg-[var(--sl-cyan)]"
              style={{ boxShadow: '0 0 12px var(--sl-cyan)' }}
            />
          </div>
        </div>
      </AuthLayout>
    )
  }

  if (phase === 'invalid') {
    return (
      <AuthLayout
        eyebrow="[ RECOVERY PROTOCOL ]"
        title="Enlace no válido"
        subtitle="El enlace de recuperación ha caducado o ya fue utilizado."
        footer={
          <>
            ¿Volvemos a intentarlo?{' '}
            <Link
              href="/forgot-password"
              className="sl-focus font-semibold text-[var(--sl-cyan)] hover:underline"
            >
              Pedir nuevo enlace
            </Link>
          </>
        }
      >
        <div className="space-y-4">
          <div
            role="alert"
            className="sl-corners flex items-start gap-2 border border-[var(--sl-danger)]/45 bg-[rgba(255,94,123,0.08)] p-3 text-sm text-[var(--sl-danger)]"
          >
            <FiAlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden
            />
            <span className="font-semibold">
              No se pudo validar tu sesión de recuperación. Solicita un enlace
              nuevo y haz clic en él desde el mismo dispositivo.
            </span>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href="/forgot-password"
              className="sl-btn sl-btn-primary sl-focus w-full py-3"
            >
              Pedir nuevo enlace
            </Link>
            <Link href="/login" className="sl-btn sl-focus w-full">
              Volver al login
            </Link>
          </div>
        </div>
      </AuthLayout>
    )
  }

  if (phase === 'success') {
    return (
      <AuthLayout
        eyebrow="[ RECOVERY PROTOCOL ]"
        title="Contraseña actualizada"
        subtitle="El Sistema ha registrado tu nueva clave. Inicia sesión para continuar."
      >
        <div className="space-y-5">
          <div
            role="status"
            className="sl-corners flex items-start gap-2 border border-[var(--sl-cyan)]/45 bg-[rgba(92,225,255,0.08)] p-3 text-sm text-[var(--sl-cyan)]"
          >
            <FiCheckCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden
            />
            <span className="font-semibold">
              Credenciales renovadas con éxito. Usa tu nueva contraseña para
              acceder.
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="sl-btn sl-btn-primary sl-focus w-full py-4"
          >
            <FiLogIn className="h-5 w-5" aria-hidden />
            Ir al login
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      eyebrow="[ RECOVERY PROTOCOL ]"
      title="Nueva contraseña"
      subtitle="Define una clave nueva para tu cazador. Mínimo 8 caracteres."
      footer={
        <>
          ¿Cambiaste de idea?{' '}
          <Link
            href="/login"
            className="sl-focus font-semibold text-[var(--sl-cyan)] hover:underline"
          >
            Volver al login
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="new-password" className="sl-field-label">
            Nueva contraseña
          </label>
          <div className="relative">
            <span
              className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--sl-muted)]"
              aria-hidden
            >
              <FiLock className="h-4 w-4" />
            </span>
            <input
              id="new-password"
              name="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              className="sl-input pl-10"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value.slice(0, 128))}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="new-password-2" className="sl-field-label">
            Repetir contraseña
          </label>
          <div className="relative">
            <span
              className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--sl-muted)]"
              aria-hidden
            >
              <FiShield className="h-4 w-4" />
            </span>
            <input
              id="new-password-2"
              name="new-password-2"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              className="sl-input pl-10"
              placeholder="Repite la contraseña"
              value={password2}
              onChange={(e) => setPassword2(e.target.value.slice(0, 128))}
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
          <FiShield className="h-5 w-5" aria-hidden />
          {submitting ? 'Aplicando...' : 'Guardar nueva contraseña'}
        </button>
      </form>
    </AuthLayout>
  )
}
