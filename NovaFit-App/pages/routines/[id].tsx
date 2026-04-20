'use client'

import Link from 'next/link'
import { useRouter } from 'next/router'
import { FiArrowLeft, FiAlertTriangle, FiPlay, FiTrash2 } from 'react-icons/fi'
import { useMemo } from 'react'
import { AppShell } from '@/components/AppShell'
import { RoutineForm } from '@/components/RoutineForm'
import { useNovaFit } from '@/lib/store'

export default function RoutineDetailPage() {
  const router = useRouter()
  const id = typeof router.query.id === 'string' ? router.query.id : ''
  const routeReady = router.isReady
  const {
    hydrated,
    routines,
    upsertRoutine,
    deleteRoutine,
    startSessionFromRoutine,
    activeSessionId,
  } = useNovaFit()

  const routine = useMemo(
    () => routines.find((r) => r.id === id),
    [routines, id],
  )

  if (!routeReady || !hydrated) {
    return (
      <AppShell title="Misión">
        <div className="h-48 animate-pulse bg-[var(--sl-panel)]" />
      </AppShell>
    )
  }

  if (!routine) {
    return (
      <AppShell
        eyebrow="[ ERROR ]"
        title="Misión no encontrada"
        subtitle="Este registro no existe o fue eliminado del tablero."
      >
        <Link
          href="/routines"
          className="sl-btn sl-btn-ghost sl-focus mt-2 inline-flex"
        >
          <FiArrowLeft className="h-4 w-4" aria-hidden />
          Volver al tablero
        </Link>
      </AppShell>
    )
  }

  async function handleStart() {
    if (!routine) return
    if (activeSessionId) {
      router.push(`/session/${activeSessionId}`)
      return
    }
    const sid = await startSessionFromRoutine(routine.id)
    if (sid) router.push(`/session/${sid}`)
  }

  return (
    <AppShell
      eyebrow="[ QUEST DETAILS ]"
      title={routine.name}
      subtitle="Revisa los objetivos, inicia combate con cronómetro o ajusta la plantilla para las próximas sesiones."
    >
      <nav className="mb-6" aria-label="Migas">
        <Link
          href="/routines"
          className="sl-focus sl-label inline-flex items-center gap-2 text-[var(--sl-text-dim)] hover:text-[var(--sl-cyan)]"
        >
          <FiArrowLeft className="h-4 w-4" aria-hidden />
          Tablero
        </Link>
      </nav>

      {/* PANEL DE INICIO DE COMBATE */}
      <div className="sl-panel sl-panel-glow sl-pad-lg relative mb-10 overflow-hidden">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(92,225,255,0.35), transparent 70%)' }}
          aria-hidden
        />
        <div className="relative grid gap-6 lg:grid-cols-[1.4fr_auto] lg:items-center lg:gap-8">
          <header className="sl-section-head max-w-xl">
            <p className="sl-label">[ READY TO FIGHT ]</p>
            <h2 className="sl-title text-xl font-bold text-[var(--sl-text)]">
              {routine.exercises.length} objetivo
              {routine.exercises.length === 1 ? '' : 's'} cargados
            </h2>
            <p>
              Al iniciar, el sistema abrirá el HUD de combate con cronómetro y
              series editables. Podrás añadir más series durante el entrenamiento.
            </p>
            {activeSessionId && (
              <p className="sl-corners mt-4 flex items-start gap-2 border border-[var(--sl-gold)]/45 bg-[rgba(255,215,106,0.08)] p-3 text-sm text-[var(--sl-gold)] sl-label-gold">
                <FiAlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden
                />
                <span className="font-semibold">
                  Ya hay un combate activo. Te llevaremos allí.
                </span>
              </p>
            )}
          </header>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <button
              type="button"
              onClick={handleStart}
              className="sl-btn sl-btn-primary sl-focus min-w-[220px] py-4 text-sm"
            >
              <FiPlay className="h-5 w-5" aria-hidden />
              Iniciar combate
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    `¿Eliminar la misión «${routine.name}»? Esta acción no se puede deshacer.`,
                  )
                ) {
                  deleteRoutine(routine.id)
                  router.push('/routines')
                }
              }}
              className="sl-btn sl-btn-danger sl-btn-sm sl-focus"
            >
              <FiTrash2 className="h-4 w-4" aria-hidden />
              Eliminar
            </button>
          </div>
        </div>
      </div>

      {/* VISTA RÁPIDA */}
      <section className="sl-panel sl-pad-md mb-12">
        <header className="sl-section-head mb-4">
          <p className="sl-label">[ OBJECTIVES · BRIEF ]</p>
        </header>
        <ul className="divide-y divide-[var(--sl-border)]">
          {routine.exercises.map((ex, i) => (
            <li
              key={ex.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className="sl-stat flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--sl-cyan)]/45 bg-[rgba(92,225,255,0.05)] text-xs font-bold text-[var(--sl-cyan)]"
                  aria-hidden
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="truncate font-semibold text-[var(--sl-text)]">
                  {ex.name}
                </span>
              </span>
              <span className="sl-chip">
                {ex.plannedSets}×{ex.defaultReps} · {ex.defaultWeight} kg
              </span>
            </li>
          ))}
        </ul>
      </section>

      <header className="sl-section-head mb-6">
        <p className="sl-label sl-label-violet">[ EDIT · QUEST ]</p>
        <h2 className="sl-title text-xl font-bold text-[var(--sl-text)]">
          Modificar plantilla
        </h2>
        <p>
          Los cambios se aplican a las próximas sesiones iniciadas desde este
          registro.
        </p>
      </header>
      <RoutineForm
        initial={routine}
        submitLabel="Guardar cambios"
        onSubmit={async (r) => {
          await upsertRoutine({ ...r, id: routine.id })
          router.push('/routines')
        }}
      />
    </AppShell>
  )
}
