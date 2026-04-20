'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { FiZap } from 'react-icons/fi'

type Props = {
  children: ReactNode
  eyebrow: string
  title: string
  subtitle?: string
  /** Bloque opcional al pie del panel (p. ej. link a login/registro) */
  footer?: ReactNode
}

export function AuthLayout({
  children,
  eyebrow,
  title,
  subtitle,
  footer,
}: Props) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden sl-app-bg">
      <header className="sl-container relative z-10 flex items-center justify-between py-4">
        <Link
          href="/login"
          className="sl-focus flex items-center gap-3 rounded-sm p-1"
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
          <span className="leading-none">
            <span className="sl-title block text-[0.95rem] font-bold text-[var(--sl-text)]">
              NOVAFIT · SYSTEM
            </span>
            <span className="sl-label mt-1 block text-[0.6rem]">
              [ Hunter Auth ]
            </span>
          </span>
        </Link>
        <span className="sl-chip hidden sm:inline-flex">
          Acceso autorizado
        </span>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <div className="sl-animate-in w-full max-w-md">
          <div className="mb-6 text-center">
            <p className="sl-label mb-3">{eyebrow}</p>
            <h1 className="sl-title text-2xl font-black leading-tight text-[var(--sl-text)] sl-flicker sm:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--sl-text-dim)]">
                {subtitle}
              </p>
            )}
          </div>
          <div className="sl-panel sl-panel-glow sl-pad-lg">{children}</div>
          {footer && (
            <div className="mt-5 text-center text-sm text-[var(--sl-text-dim)]">
              {footer}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
