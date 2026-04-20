'use client'

import { useRouter } from 'next/router'
import { useState } from 'react'
import {
  FiAlertCircle,
  FiCheckCircle,
  FiLogOut,
  FiSave,
  FiShield,
  FiTrash2,
} from 'react-icons/fi'
import { AppShell } from '@/components/AppShell'
import { useAuth } from '@/lib/auth/context'

export default function AccountPage() {
  const router = useRouter()
  const {
    user,
    loading,
    updateProfile,
    changePassword,
    logout,
    deleteAccount,
  } = useAuth()

  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [saveMsg, setSaveMsg] = useState<{
    tone: 'ok' | 'err'
    text: string
  } | null>(null)

  const [next, setNext] = useState('')
  const [next2, setNext2] = useState('')
  const [pwdMsg, setPwdMsg] = useState<{
    tone: 'ok' | 'err'
    text: string
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <AppShell title="Cuenta">
        <div className="h-40 animate-pulse bg-[var(--sl-panel)]" />
      </AppShell>
    )
  }

  if (!user) return null

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    const res = await updateProfile({
      displayName: displayName.trim() || user?.displayName,
    })
    if (!res.ok) {
      setSaveMsg({ tone: 'err', text: res.error ?? 'No se pudo guardar.' })
    } else {
      setSaveMsg({ tone: 'ok', text: 'Perfil actualizado.' })
    }
    setTimeout(() => setSaveMsg(null), 2500)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwdMsg(null)
    if (next.length < 8) {
      setPwdMsg({
        tone: 'err',
        text: 'La contraseña debe tener al menos 8 caracteres.',
      })
      return
    }
    if (next !== next2) {
      setPwdMsg({ tone: 'err', text: 'Las nuevas contraseñas no coinciden.' })
      return
    }
    setSubmitting(true)
    const res = await changePassword(next)
    setSubmitting(false)
    if (!res.ok) {
      setPwdMsg({
        tone: 'err',
        text: res.error ?? 'No se pudo cambiar la contraseña.',
      })
      return
    }
    setNext('')
    setNext2('')
    setPwdMsg({ tone: 'ok', text: 'Contraseña actualizada.' })
    setTimeout(() => setPwdMsg(null), 2500)
  }

  async function handleLogout() {
    await logout()
    router.replace('/login')
  }

  async function handleDelete() {
    if (!user) return
    const confirmed = confirm(
      `¿Eliminar el cazador «${user.displayName}»? Se borrarán sus rutinas y sesiones del Sistema.`,
    )
    if (!confirmed) return
    const res = await deleteAccount()
    if (!res.ok) {
      setSaveMsg({ tone: 'err', text: res.error ?? 'No se pudo eliminar.' })
      return
    }
    router.replace('/register')
  }

  return (
    <AppShell
      eyebrow="[ HUNTER PROFILE ]"
      title="Panel de cuenta"
      subtitle="Configura tu identidad de cazador, cambia la contraseña o finaliza la sesión."
    >
      <div className="sl-stack">
        <section className="sl-panel sl-pad-lg">
          <header className="sl-section-head mb-5">
            <div className="sl-head-row">
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center border-2 text-xl sl-title font-black"
                style={{
                  borderColor: user.avatarColor,
                  color: user.avatarColor,
                  background: `radial-gradient(circle at center, ${user.avatarColor}22, transparent 70%)`,
                  boxShadow: `0 0 20px ${user.avatarColor}55`,
                  clipPath:
                    'polygon(0 10px, 10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)',
                  textShadow: `0 0 12px ${user.avatarColor}cc`,
                }}
                aria-hidden
              >
                {user.displayName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="sl-label">[ IDENTITY ]</p>
                <h2 className="sl-title truncate text-lg font-bold text-[var(--sl-text)]">
                  @{user.username}
                </h2>
                <p className="sl-stat mt-1 truncate text-xs tracking-[0.15em] text-[var(--sl-cyan)]">
                  ID {user.friendCode}
                </p>
              </div>
            </div>
          </header>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label htmlFor="displayName" className="sl-field-label">
                Nombre visible
              </label>
              <input
                id="displayName"
                className="sl-input"
                maxLength={64}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 64))}
                placeholder="Tu nombre de cazador"
              />
            </div>
            <div>
              <span className="sl-field-label">Email</span>
              <p className="sl-input sl-stat flex items-center overflow-hidden text-ellipsis whitespace-nowrap text-sm tracking-wide text-[var(--sl-text-dim)]">
                {user.email ?? '—'}
              </p>
              <p className="mt-1.5 text-[0.7rem] text-[var(--sl-muted)]">
                Para cambiar el email contacta con el administrador.
              </p>
            </div>

            {saveMsg && <Message msg={saveMsg} />}

            <div className="flex justify-end">
              <button
                type="submit"
                className="sl-btn sl-btn-primary sl-btn-sm sl-focus"
              >
                <FiSave className="h-4 w-4" aria-hidden />
                Guardar cambios
              </button>
            </div>
          </form>
        </section>

        <section className="sl-panel sl-pad-lg">
          <header className="sl-section-head mb-5">
            <div className="sl-head-row">
              <span className="sl-ico sl-ico-violet">
                <FiShield className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="sl-label sl-label-violet">[ SECURITY ]</p>
                <h2 className="sl-title text-lg font-bold text-[var(--sl-text)]">
                  Cambiar contraseña
                </h2>
              </div>
            </div>
          </header>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="sl-field-label">Nueva contraseña</label>
                <input
                  type="password"
                  className="sl-input"
                  value={next}
                  onChange={(e) => setNext(e.target.value.slice(0, 128))}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <div>
                <label className="sl-field-label">Repetir nueva</label>
                <input
                  type="password"
                  className="sl-input"
                  value={next2}
                  onChange={(e) => setNext2(e.target.value.slice(0, 128))}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {pwdMsg && <Message msg={pwdMsg} />}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="sl-btn sl-btn-violet sl-btn-sm sl-focus"
              >
                {submitting ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </div>
          </form>
        </section>

        <section className="sl-panel sl-pad-md">
          <header className="sl-section-head mb-5">
            <p className="sl-label">[ SESSION · DANGER ZONE ]</p>
            <h2 className="sl-title text-lg font-bold text-[var(--sl-text)]">
              Gestión de sesión
            </h2>
            <p>
              Puedes cerrar sesión o eliminar definitivamente tu cazador y sus
              datos guardados en este dispositivo.
            </p>
          </header>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleLogout}
              className="sl-btn sl-focus flex-1"
            >
              <FiLogOut className="h-4 w-4" aria-hidden />
              Cerrar sesión
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="sl-btn sl-btn-danger sl-focus flex-1"
            >
              <FiTrash2 className="h-4 w-4" aria-hidden />
              Eliminar cazador
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  )
}

function Message({ msg }: { msg: { tone: 'ok' | 'err'; text: string } }) {
  const ok = msg.tone === 'ok'
  return (
    <div
      role={ok ? 'status' : 'alert'}
      className={`sl-corners flex items-start gap-2 border p-3 text-sm font-semibold ${
        ok
          ? 'border-[var(--sl-cyan)]/45 bg-[rgba(92,225,255,0.08)] text-[var(--sl-cyan)]'
          : 'border-[var(--sl-danger)]/45 bg-[rgba(255,94,123,0.08)] text-[var(--sl-danger)]'
      }`}
    >
      {ok ? (
        <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      )}
      <span>{msg.text}</span>
    </div>
  )
}
