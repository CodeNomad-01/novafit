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
    <div className="relative flex min-h-screen flex-col sl-app-bg">
      <header className="sl-container relative z-10 flex items-center justify-between gap-2 py-3">
        <Link
          href="/login"
          className="sl-focus flex min-w-0 shrink items-center gap-2 rounded-sm p-1"
        >
          <span
            className="sl-ico shrink-0"
            style={{
              boxShadow:
                'inset 0 0 12px rgba(92, 225, 255, 0.25), 0 0 16px rgba(92, 225, 255, 0.35)',
            }}
            aria-hidden
          >
            <FiZap className="h-4 w-4" />
          </span>
          <span className="min-w-0 leading-none">
            <span className="sl-title block truncate text-[0.85rem] font-bold text-[var(--sl-text)]">
              NOVAFIT · SYSTEM
            </span>
            <span className="sl-label sl-label-tight mt-0.5 block">
              [ Hunter Auth ]
            </span>
          </span>
        </Link>
      </header>

      <main className="sl-container relative z-10 flex flex-1 items-start justify-center py-8">
        <div className="sl-animate-in w-full">
          <div className="mb-6 text-center">
            <p className="sl-label mb-3">{eyebrow}</p>
            <h1 className="sl-title text-2xl font-black leading-tight text-[var(--sl-text)] sl-flicker">
              {title}
            </h1>
            {subtitle && (
              <p className="mx-auto mt-3 max-w-[36ch] text-sm leading-relaxed text-[var(--sl-text-dim)]">
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
