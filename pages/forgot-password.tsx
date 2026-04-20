'use client'

import Link from 'next/link'
import { useState } from 'react'
import { FiAlertCircle, FiArrowLeft, FiCheckCircle, FiMail, FiSend } from 'react-icons/fi'
import { AuthLayout } from '@/components/AuthLayout'
import { useAuth } from '@/lib/auth/context'

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const res = await requestPasswordReset(email)
    setSubmitting(false)
    if (!res.ok) {
      setError(res.error ?? 'No se pudo enviar el correo.')
      return
    }
    setSentTo(email.trim().toLowerCase())
  }

  return (
    <AuthLayout
      eyebrow="[ RECOVERY PROTOCOL ]"
      title="Recupera tu acceso"
      subtitle="Introduce el email de tu cazador y te enviaremos un enlace seguro para restablecer la contraseña."
      footer={
        <>
          ¿Recordaste la clave?{' '}
          <Link
            href="/login"
            className="sl-focus font-semibold text-[var(--sl-cyan)] hover:underline"
          >
            Volver al login
          </Link>
        </>
      }
    >
      {sentTo ? (
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
              Si existe una cuenta con <strong>{sentTo}</strong>, recibirás un
              correo con el enlace de recuperación.
            </span>
          </div>
          <p className="text-xs leading-relaxed text-[var(--sl-text-dim)]">
            Revisa también la carpeta de spam. El enlace caduca a los pocos
            minutos; si no llega, puedes volver a solicitarlo.
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setSentTo(null)
                setError(null)
              }}
              className="sl-btn sl-focus w-full"
            >
              <FiSend className="h-4 w-4" aria-hidden />
              Enviar a otro email
            </button>
            <Link
              href="/login"
              className="sl-btn sl-focus w-full"
            >
              <FiArrowLeft className="h-4 w-4" aria-hidden />
              Volver al login
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="sl-field-label">
              Email del cazador
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
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={254}
                className="sl-input pl-10"
                placeholder="cazador@guild.io"
                value={email}
                onChange={(e) => setEmail(e.target.value.slice(0, 254))}
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
            <FiSend className="h-5 w-5" aria-hidden />
            {submitting ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>

          <p className="text-center text-[0.7rem] leading-relaxed text-[var(--sl-muted)]">
            Recibirás un email con un enlace temporal que te llevará al
            portal de reseteo del Sistema.
          </p>
        </form>
      )}
    </AuthLayout>
  )
}
