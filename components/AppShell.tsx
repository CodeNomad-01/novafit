'use client'

import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  FiHome,
  FiLogOut,
  FiMap,
  FiPlay,
  FiUser,
  FiUsers,
  FiZap,
} from 'react-icons/fi'
import { useAuth } from '@/lib/auth/context'
import { useNovaFit } from '@/lib/store/context'

const nav = [
  { href: '/', label: 'Sistema', icon: FiHome },
  { href: '/routines', label: 'Misiones', icon: FiMap },
  { href: '/friends', label: 'Aliados', icon: FiUsers },
]

export function AppShell({
  children,
  title,
  subtitle,
  noHeaderTitle = false,
  eyebrow,
}: {
  children: ReactNode
  title?: string
  subtitle?: string
  noHeaderTitle?: boolean
  eyebrow?: string
}) {
  const router = useRouter()
  const { activeSessionId, hydrated } = useNovaFit()
  const { user, loading: authLoading, logout } = useAuth()

  const pathname = router.pathname

  // Guardia: redirigir a /login si no hay usuario
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      const redirect = router.asPath && router.asPath !== '/' ? router.asPath : ''
      router.replace(redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login')
    }
  }, [authLoading, user, router])

  if (authLoading || !user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center sl-app-bg">
        <div className="relative z-10 sl-label">
          [ VERIFICANDO CREDENCIALES... ]
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-10 flex min-h-screen flex-col text-[var(--sl-text)] sl-app-bg">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-[var(--sl-border)] bg-[rgba(3,5,13,0.85)] backdrop-blur-xl">
        <div className="sl-container relative flex items-center justify-between gap-3 py-3">
          <Link
            href="/"
            className="sl-focus flex shrink-0 items-center gap-3 rounded-sm p-1"
          >
            <span
              className="sl-ico"
              style={{
                boxShadow:
                  'inset 0 0 12px rgba(92, 225, 255, 0.25), 0 0 16px rgba(92, 225, 255, 0.35)',
              }}
              aria-hidden
            >
              <FiZap className="h-5 w-5" />
            </span>
            <div className="hidden leading-none sm:block">
              <span className="sl-title block text-[0.95rem] font-bold text-[var(--sl-text)]">
                NOVAFIT · SYSTEM
              </span>
              <span className="sl-label mt-1 block text-[0.6rem]">
                [ Hunter Training ]
              </span>
            </div>
          </Link>

          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Principal"
          >
            {nav.map(({ href, label, icon: Icon }) => {
              const active =
                href === '/' ? pathname === '/' : pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`sl-focus relative flex items-center gap-2 px-4 py-2.5 sl-title text-xs font-bold tracking-[0.18em] transition-colors ${
                    active
                      ? 'text-[var(--sl-cyan)]'
                      : 'text-[var(--sl-text-dim)] hover:text-[var(--sl-cyan)]'
                  }`}
                  style={
                    active
                      ? {
                          background:
                            'linear-gradient(180deg, rgba(92,225,255,0.16), rgba(92,225,255,0.04))',
                          border: '1px solid rgba(92,225,255,0.5)',
                          clipPath:
                            'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                          textShadow: '0 0 10px rgba(92,225,255,0.5)',
                          boxShadow: '0 0 16px rgba(92,225,255,0.2)',
                        }
                      : undefined
                  }
                >
                  <Icon
                    className="h-4 w-4 shrink-0"
                    aria-hidden
                    strokeWidth={active ? 2.5 : 2}
                  />
                  {label}
                </Link>
              )
            })}
          </nav>

          <UserMenu
            displayName={user.displayName}
            username={user.username}
            avatarColor={user.avatarColor}
            onLogout={() => {
              logout()
              router.replace('/login')
            }}
          />
        </div>

        {hydrated && activeSessionId && (
          <Link
            href={`/session/${activeSessionId}`}
            className="relative block overflow-hidden border-t border-[var(--sl-cyan)]/40 bg-[rgba(92,225,255,0.08)] px-4 py-2.5 text-center transition hover:bg-[rgba(92,225,255,0.14)]"
          >
            <span className="sl-label inline-flex items-center gap-2 text-[var(--sl-cyan)]">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--sl-cyan)] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--sl-cyan)] sl-pulse-dot" />
              </span>
              <FiPlay className="h-3.5 w-3.5" aria-hidden />
              [ MISIÓN EN CURSO · VOLVER AL COMBATE ]
            </span>
          </Link>
        )}

        <div className="sl-divider" />
      </header>

      {/* TITLE BLOCK */}
      {!noHeaderTitle && title && (
        <div className="sl-container relative z-10 pb-2 pt-10 sl-animate-in md:pt-12">
          {eyebrow && <p className="sl-label mb-3">{eyebrow}</p>}
          <h1 className="sl-title text-2xl font-bold leading-tight text-[var(--sl-text)] sm:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-[var(--sl-text-dim)]">
              {subtitle}
            </p>
          )}
          <div className="sl-divider mt-6 opacity-60" />
        </div>
      )}

      <main className="nv-mobile-nav-pad sl-container relative z-10 flex-1 pb-10 pt-8 md:pb-14 md:pt-10">
        {children}
      </main>

      {/* BOTTOM NAV (MOBILE) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--sl-cyan)]/30 bg-[rgba(3,5,13,0.95)] backdrop-blur-xl md:hidden"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        aria-label="Principal móvil"
      >
        <div className="sl-divider absolute inset-x-0 top-0 opacity-60" />
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active =
              href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`sl-focus flex min-w-[4rem] flex-1 flex-col items-center gap-1 py-2.5 sl-title text-[0.62rem] font-bold tracking-[0.18em] transition ${
                  active
                    ? 'text-[var(--sl-cyan)]'
                    : 'text-[var(--sl-muted)]'
                }`}
                style={
                  active
                    ? { textShadow: '0 0 10px rgba(92,225,255,0.5)' }
                    : undefined
                }
              >
                <Icon
                  className={`h-5 w-5 transition ${active ? 'scale-110 opacity-100' : 'opacity-75'}`}
                  strokeWidth={active ? 2.6 : 2}
                  aria-hidden
                />
                {label}
              </Link>
            )
          })}
          <Link
            href="/account"
            className={`sl-focus flex min-w-[4rem] flex-1 flex-col items-center gap-1 py-2.5 sl-title text-[0.62rem] font-bold tracking-[0.18em] transition ${
              pathname.startsWith('/account')
                ? 'text-[var(--sl-cyan)]'
                : 'text-[var(--sl-muted)]'
            }`}
          >
            <FiUser
              className={`h-5 w-5 transition ${pathname.startsWith('/account') ? 'scale-110 opacity-100' : 'opacity-75'}`}
              aria-hidden
            />
            Cuenta
          </Link>
        </div>
      </nav>
    </div>
  )
}

function UserMenu({
  displayName,
  username,
  avatarColor,
  onLogout,
}: {
  displayName: string
  username: string
  avatarColor: string
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  const handleClick = useCallback((e: MouseEvent) => {
    if (!ref.current) return
    if (!ref.current.contains(e.target as Node)) setOpen(false)
  }, [])

  useEffect(() => {
    if (!open) return
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, handleClick])

  const initial = displayName.charAt(0).toUpperCase() || '?'

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="sl-focus flex items-center gap-2 rounded-sm p-1 pr-2 transition hover:bg-[rgba(92,225,255,0.06)]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span
          className="sl-title flex h-9 w-9 items-center justify-center border-2 text-sm font-black"
          style={{
            borderColor: avatarColor,
            color: avatarColor,
            background: `radial-gradient(circle at center, ${avatarColor}22, transparent 70%)`,
            boxShadow: `0 0 12px ${avatarColor}55`,
            clipPath:
              'polygon(0 6px, 6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)',
            textShadow: `0 0 8px ${avatarColor}cc`,
          }}
          aria-hidden
        >
          {initial}
        </span>
        <span className="hidden text-left leading-none sm:block">
          <span className="sl-label block text-[0.6rem]">[ HUNTER ]</span>
          <span className="mt-1 block max-w-[8rem] truncate text-xs font-semibold text-[var(--sl-text)]">
            {displayName}
          </span>
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="sl-panel absolute right-0 top-full z-50 mt-2 w-56 p-2 sl-animate-in"
          style={{ boxShadow: '0 0 30px rgba(92, 225, 255, 0.18)' }}
        >
          <div className="border-b border-[var(--sl-border)] px-3 py-3">
            <p className="sl-label text-[0.6rem]">[ SESIÓN ACTIVA ]</p>
            <p className="mt-1 truncate text-sm font-semibold text-[var(--sl-text)]">
              {displayName}
            </p>
            <p className="mt-0.5 truncate text-xs text-[var(--sl-text-dim)]">
              @{username}
            </p>
          </div>
          <Link
            href="/account"
            className="sl-focus mt-1 flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-[var(--sl-text-dim)] transition hover:bg-[rgba(92,225,255,0.08)] hover:text-[var(--sl-cyan)]"
            onClick={() => setOpen(false)}
          >
            <FiUser className="h-4 w-4" aria-hidden />
            Mi cuenta
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
            className="sl-focus mt-1 flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-[var(--sl-danger)] transition hover:bg-[rgba(255,94,123,0.1)]"
          >
            <FiLogOut className="h-4 w-4" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
