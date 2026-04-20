'use client'

import Link from 'next/link'
import { FiPlus, FiChevronRight, FiTarget } from 'react-icons/fi'
import { AppShell } from '@/components/AppShell'
import { useNovaFit } from '@/lib/store/context'

export default function RoutinesPage() {
  const { hydrated, routines } = useNovaFit()

  return (
    <AppShell
      eyebrow="[ QUEST BOARD ]"
      title="Tablero de misiones"
      subtitle="Define plantillas de entreno. Cada misión contiene objetivos (ejercicios) con series base. Al comenzar, se activa el cronómetro de combate."
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="sl-label">
          [ {routines.length.toString().padStart(2, '0')} MISIONES REGISTRADAS ]
        </p>
        <Link href="/routines/new" className="sl-btn sl-btn-primary sl-focus">
          <FiPlus className="h-4 w-4" aria-hidden />
          Nueva misión
        </Link>
      </div>

      {!hydrated ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse bg-[var(--sl-panel)]" />
          ))}
        </div>
      ) : routines.length === 0 ? (
        <div className="sl-panel sl-corners px-6 py-16 text-center">
          <FiTarget
            className="mx-auto h-12 w-12 text-[var(--sl-cyan)] opacity-80"
            aria-hidden
          />
          <p className="sl-title mt-4 text-lg font-bold text-[var(--sl-text)]">
            Tablero vacío
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--sl-text-dim)]">
            Crea tu primera misión. Define ejercicios, series base y estarás listo para
            combatir.
          </p>
          <Link
            href="/routines/new"
            className="sl-btn sl-btn-primary sl-focus mt-6 inline-flex"
          >
            Registrar misión <FiChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {routines
            .slice()
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((r, i) => (
              <li key={r.id} className="sl-animate-in">
                <Link
                  href={`/routines/${r.id}`}
                  className="sl-focus sl-panel group flex items-center gap-4 px-4 py-4 transition hover:border-[var(--sl-cyan)]/60 hover:bg-[rgba(92,225,255,0.05)] sm:px-5"
                >
                  <span className="sl-ico sl-ico-lg sl-stat text-base font-bold">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="sl-title truncate text-base font-bold text-[var(--sl-text)]">
                      {r.name}
                    </p>
                    <p className="mt-1 text-xs text-[var(--sl-text-dim)]">
                      <span className="sl-label text-[var(--sl-cyan)]">
                        {r.exercises.length} obj.
                      </span>
                      <span className="ml-1">· Pulsa para ver detalles</span>
                    </p>
                  </div>
                  <span className="sl-chip hidden sm:inline-flex">Entrar</span>
                  <FiChevronRight
                    className="h-5 w-5 shrink-0 text-[var(--sl-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--sl-cyan)]"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
        </ul>
      )}
    </AppShell>
  )
}
