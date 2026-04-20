'use client'

import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import {
  FiArrowLeft,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiPlus,
  FiTarget,
  FiX,
} from 'react-icons/fi'
import { AppShell } from '@/components/AppShell'
import { useNovaFit } from '@/lib/store'
import { formatDurationMs } from '@/lib/stats'

export default function SessionPage() {
  const router = useRouter()
  const rawId = router.query.id
  const sessionId = typeof rawId === 'string' ? rawId : ''
  const routeReady = router.isReady
  const {
    hydrated,
    sessions,
    activeSessionId,
    updateSet,
    addSetToExercise,
    finishSession,
    cancelActiveSession,
  } = useNovaFit()

  const [tick, setTick] = useState(0)
  const [openExercise, setOpenExercise] = useState<number | null>(0)

  const session = useMemo(
    () => sessions.find((s) => s.id === sessionId),
    [sessions, sessionId],
  )

  useEffect(() => {
    if (!session || session.endedAt) return undefined
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [session])

  useEffect(() => {
    if (!session?.endedAt && session?.exercises.length) {
      const maxIdx = session.exercises.length - 1
      setOpenExercise((o) => (o === null || o > maxIdx ? 0 : o))
    }
  }, [session])

  if (!routeReady || !hydrated) {
    return (
      <AppShell title="Combate">
        <div className="space-y-4 pt-2">
          <div className="h-48 animate-pulse bg-[var(--sl-panel)]" />
          <div className="h-64 animate-pulse bg-[var(--sl-panel)]" />
        </div>
      </AppShell>
    )
  }

  if (!session) {
    return (
      <AppShell
        eyebrow="[ ERROR ]"
        title="Combate no encontrado"
        subtitle="Esta sesión no existe o fue descartada."
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

  const isDone = Boolean(session.endedAt)
  void tick
  const elapsed = session.endedAt
    ? session.endedAt - session.startedAt
    : Date.now() - session.startedAt

  const totalEx = session.exercises.length
  const currentStep =
    openExercise !== null ? Math.min(openExercise + 1, totalEx) : 1
  const progressPct =
    totalEx > 0 ? Math.round((currentStep / totalEx) * 100) : 100

  function toggleExercise(i: number) {
    setOpenExercise((o) => (o === i ? null : i))
  }

  function handleFinish() {
    if (!session) return
    finishSession(session.id)
    router.push('/')
  }

  function handleCancel() {
    if (!session) return
    if (
      confirm(
        '¿Descartar este combate? Se borrarán los datos de esta sesión.',
      )
    ) {
      cancelActiveSession()
      router.push('/routines')
    }
  }

  const isActive = activeSessionId === session.id && !isDone

  return (
    <AppShell
      eyebrow={isDone ? '[ BATTLE LOG ]' : '[ BATTLE · LIVE ]'}
      title={session.routineName}
      subtitle={
        isDone
          ? 'Combate finalizado. Revisa el resumen y los registros por objetivo.'
          : 'Edita peso y repeticiones en cada serie. Puedes añadir series extra.'
      }
    >
      <div className="space-y-8 pb-28 md:pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={isDone ? '/' : '/routines'}
            className="sl-focus sl-label inline-flex items-center gap-2 text-[var(--sl-text-dim)] hover:text-[var(--sl-cyan)]"
          >
            <FiArrowLeft className="h-4 w-4" aria-hidden />
            {isDone ? 'Sistema' : 'Salir del combate'}
          </Link>
          {!isDone && (
            <div className="hidden items-center gap-2 md:flex">
              <button
                type="button"
                onClick={handleCancel}
                className="sl-btn sl-btn-ghost sl-btn-sm sl-focus"
              >
                <FiX className="h-4 w-4" aria-hidden />
                Descartar
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="sl-btn sl-btn-primary sl-btn-sm sl-focus"
              >
                <FiCheck className="h-4 w-4" aria-hidden />
                Finalizar
              </button>
            </div>
          )}
        </div>

        {/* HUD · CRONÓMETRO */}
        <div className="sl-panel sl-panel-glow sl-pad-lg relative overflow-hidden text-center">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at top, rgba(92,225,255,0.22), transparent 60%)',
            }}
            aria-hidden
          />
          <div className="relative">
            <p className="sl-label mb-4 inline-flex items-center gap-2">
              <FiClock className="h-4 w-4" aria-hidden />
              [ CRONÓMETRO DE COMBATE ]
            </p>
            <p
              className="sl-stat sl-notif font-black tabular-nums text-[var(--sl-cyan)]"
              style={{ fontSize: 'clamp(2.8rem, 10vw, 5.5rem)' }}
              suppressHydrationWarning
            >
              {formatDurationMs(elapsed)}
            </p>
            <div className="mx-auto mt-6 max-w-md">
              {isDone ? (
                <p className="sl-label sl-label-gold">
                  [ COMBATE COMPLETADO · {formatDurationMs(elapsed)} ]
                </p>
              ) : (
                <p className="sl-label text-[var(--sl-text-dim)]">
                  [ BATTLE · IN PROGRESS ]
                </p>
              )}
            </div>

            {/* Barra de progreso de objetivos */}
            {!isDone && (
              <div className="mx-auto mt-6 max-w-md space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="sl-label">
                    Objetivo {currentStep} / {totalEx}
                  </span>
                  <span className="sl-stat text-[var(--sl-cyan)]">
                    {progressPct}%
                  </span>
                </div>
                <div className="sl-bar">
                  <div
                    className="sl-bar-fill"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* OBJETIVOS · SERIES */}
        <div className="space-y-4">
          <header className="sl-section-head">
            <p className="sl-label sl-label-violet">[ OBJECTIVES · SETS ]</p>
          </header>

          {session.exercises.map((ex, ei) => {
            const open = openExercise === ei
            const setCount = ex.sets.length
            return (
              <section
                key={ex.id ?? (ex.exerciseTemplateId ?? '') + ei}
                className="sl-panel overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleExercise(ei)}
                  className="sl-focus flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-[rgba(92,225,255,0.04)] md:pointer-events-none md:cursor-default md:hover:bg-transparent sm:px-5"
                  aria-expanded={open}
                >
                  <span className="sl-ico sl-ico-lg sl-ico-violet sl-stat text-base font-bold">
                    {String(ei + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="sl-label text-[0.6rem]">
                      [ OBJETIVO {String(ei + 1).padStart(2, '0')} /{' '}
                      {String(totalEx).padStart(2, '0')} ]
                    </p>
                    <h3 className="sl-title mt-1 truncate text-base font-bold text-[var(--sl-text)]">
                      {ex.name}
                    </h3>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--sl-text-dim)]">
                      <FiTarget className="h-3 w-3" aria-hidden />
                      {setCount} serie{setCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="shrink-0 text-[var(--sl-text-dim)] md:hidden">
                    {open ? (
                      <FiChevronUp className="h-5 w-5" aria-hidden />
                    ) : (
                      <FiChevronDown className="h-5 w-5" aria-hidden />
                    )}
                  </span>
                </button>

                <div
                  className={`border-t border-[var(--sl-border)] px-4 pb-5 pt-4 sm:px-5 ${
                    open ? 'block' : 'hidden sm:block'
                  }`}
                >
                  {!isDone && (
                    <div className="mb-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => addSetToExercise(session.id, ei)}
                        className="sl-btn sl-btn-violet sl-btn-sm sl-focus"
                      >
                        <FiPlus className="h-4 w-4" aria-hidden />
                        Añadir serie
                      </button>
                    </div>
                  )}

                  {/* Tabla en desktop */}
                  <div className="hidden sm:block">
                    <div className="sl-corners overflow-hidden border border-[var(--sl-border)] bg-[rgba(5,10,24,0.6)]">
                      <table className="w-full table-fixed text-sm">
                        <colgroup>
                          <col style={{ width: '4.5rem' }} />
                          <col />
                          <col />
                        </colgroup>
                        <thead>
                          <tr className="border-b border-[var(--sl-border)] text-left">
                            <th className="sl-label px-4 py-3">Set</th>
                            <th className="sl-label px-3 py-3">Peso · kg</th>
                            <th className="sl-label px-3 py-3 pr-4">Reps</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ex.sets.map((st, si) => (
                            <tr
                              key={st.id}
                              className="border-t border-[var(--sl-border)]/80 transition hover:bg-[rgba(92,225,255,0.04)]"
                            >
                              <td className="sl-stat px-4 py-2.5 text-sm font-bold text-[var(--sl-cyan)]">
                                {String(si + 1).padStart(2, '0')}
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min={0}
                                  step="0.5"
                                  disabled={isDone}
                                  aria-label={`Peso serie ${si + 1}`}
                                  className="sl-input sl-stat py-2.5 text-center font-bold tabular-nums disabled:cursor-not-allowed disabled:opacity-55"
                                  value={st.weight}
                                  onChange={(e) =>
                                    updateSet(session.id, ei, si, {
                                      weight: Number(e.target.value),
                                    })
                                  }
                                />
                              </td>
                              <td className="px-3 py-2 pr-4">
                                <input
                                  type="number"
                                  min={0}
                                  disabled={isDone}
                                  aria-label={`Reps serie ${si + 1}`}
                                  className="sl-input sl-stat py-2.5 text-center font-bold tabular-nums disabled:cursor-not-allowed disabled:opacity-55"
                                  value={st.reps}
                                  onChange={(e) =>
                                    updateSet(session.id, ei, si, {
                                      reps: Number(e.target.value),
                                    })
                                  }
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Tarjetas en móvil */}
                  <ul className="space-y-3 sm:hidden">
                    {ex.sets.map((st, si) => (
                      <li
                        key={st.id}
                        className="sl-corners border border-[var(--sl-border)] bg-[rgba(5,10,24,0.6)] p-4"
                      >
                        <p className="sl-label mb-3 text-center">
                          SET {String(si + 1).padStart(2, '0')}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="sl-label mb-2 block text-[0.6rem]">
                              Peso · kg
                            </label>
                            <input
                              type="number"
                              min={0}
                              step="0.5"
                              disabled={isDone}
                              className="sl-input sl-stat py-3 text-center font-bold tabular-nums disabled:opacity-55"
                              value={st.weight}
                              onChange={(e) =>
                                updateSet(session.id, ei, si, {
                                  weight: Number(e.target.value),
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="sl-label mb-2 block text-[0.6rem]">
                              Reps
                            </label>
                            <input
                              type="number"
                              min={0}
                              disabled={isDone}
                              className="sl-input sl-stat py-3 text-center font-bold tabular-nums disabled:opacity-55"
                              value={st.reps}
                              onChange={(e) =>
                                updateSet(session.id, ei, si, {
                                  reps: Number(e.target.value),
                                })
                              }
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )
          })}
        </div>

        {/* ACCIONES FIJAS MÓVIL */}
        {!isDone && (
          <div className="fixed bottom-[4.25rem] left-0 right-0 z-30 border-t border-[var(--sl-cyan)]/30 bg-[rgba(3,5,13,0.96)] p-4 backdrop-blur-xl md:hidden">
            <div className="sl-divider absolute inset-x-0 top-0" />
            <div className="mx-auto flex max-w-lg flex-col gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="sl-btn sl-btn-ghost sl-focus"
              >
                <FiX className="h-4 w-4" aria-hidden />
                Descartar
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="sl-btn sl-btn-primary sl-focus py-4"
              >
                <FiCheck className="h-5 w-5" aria-hidden />
                Finalizar combate
              </button>
            </div>
          </div>
        )}

        {isDone && (
          <div className="flex justify-center pt-2">
            <Link href="/" className="sl-btn sl-btn-ghost sl-focus">
              Volver al Sistema
            </Link>
          </div>
        )}

        {isActive && (
          <p className="sl-label text-center text-[0.65rem] text-[var(--sl-muted)] md:hidden">
            [ Barra de acciones fijada en pantalla ]
          </p>
        )}
      </div>
    </AppShell>
  )
}
