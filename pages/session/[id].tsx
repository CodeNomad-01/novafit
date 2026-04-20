'use client'

import Link from 'next/link'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiArrowLeft,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiMinus,
  FiPause,
  FiPlay,
  FiPlus,
  FiTarget,
  FiX,
} from 'react-icons/fi'
import { AppShell } from '@/components/AppShell'
import { useNovaFit } from '@/lib/store/context'
import { formatDurationMs } from '@/lib/domain/stats'

const REST_KEY = 'novafit:rest-seconds'
const DEFAULT_REST = 90
const MIN_REST = 10
const MAX_REST = 600

function clampRest(n: number) {
  if (!Number.isFinite(n)) return DEFAULT_REST
  return Math.min(MAX_REST, Math.max(MIN_REST, Math.round(n)))
}

function formatSeconds(total: number) {
  const s = Math.max(0, Math.ceil(total))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export default function SessionPage() {
  const router = useRouter()
  const rawId = router.query.id
  const sessionId = typeof rawId === 'string' ? rawId : ''
  const routeReady = router.isReady
  const {
    hydrated,
    sessions,
    updateSet,
    addSetToExercise,
    toggleSetCompleted,
    finishSession,
    cancelActiveSession,
  } = useNovaFit()

  const [tick, setTick] = useState(0)
  const [openExercise, setOpenExercise] = useState<number | null>(0)
  const [restSeconds, setRestSeconds] = useState<number>(DEFAULT_REST)
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null)
  const lastAlertRef = useRef<number | null>(null)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(REST_KEY)
      if (saved) setRestSeconds(clampRest(Number(saved)))
    } catch {}
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(REST_KEY, String(restSeconds))
    } catch {}
  }, [restSeconds])

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

  const restRemainingMs = restEndsAt !== null ? restEndsAt - Date.now() : 0
  const restActive = restRemainingMs > 0

  useEffect(() => {
    if (!restActive && restEndsAt !== null) {
      if (lastAlertRef.current !== restEndsAt) {
        lastAlertRef.current = restEndsAt
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate([80, 60, 120])
          } catch {}
        }
      }
    }
  }, [restActive, restEndsAt])

  const handleToggleSet = useCallback(
    async (exIdx: number, setIdx: number, currentlyDone: boolean) => {
      const nextDone = !currentlyDone
      await toggleSetCompleted(sessionId, exIdx, setIdx, nextDone)
      if (nextDone) {
        setRestEndsAt(Date.now() + restSeconds * 1000)
      } else {
        setRestEndsAt(null)
      }
    },
    [sessionId, restSeconds, toggleSetCompleted],
  )

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
  const totalSetsPlanned = session.exercises.reduce(
    (acc, ex) => acc + ex.sets.length,
    0,
  )
  const totalSetsDone = session.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0,
  )
  const progressPct =
    totalSetsPlanned > 0
      ? Math.round((totalSetsDone / totalSetsPlanned) * 100)
      : 0

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

  return (
    <AppShell
      eyebrow={isDone ? '[ BATTLE LOG ]' : '[ BATTLE · LIVE ]'}
      title={session.routineName}
      subtitle={
        isDone
          ? 'Combate finalizado. Revisa el resumen y los registros por objetivo.'
          : 'Marca cada serie al terminarla; arrancará el cronómetro de descanso.'
      }
    >
      <div className="space-y-6 pb-52">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={isDone ? '/' : '/routines'}
            className="sl-focus sl-label inline-flex items-center gap-2 text-[var(--sl-text-dim)] hover:text-[var(--sl-cyan)]"
          >
            <FiArrowLeft className="h-4 w-4" aria-hidden />
            {isDone ? 'Sistema' : 'Salir'}
          </Link>
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
            <p className="sl-label sl-label-tight mb-3 inline-flex items-center gap-2">
              <FiClock className="h-4 w-4" aria-hidden />
              [ CRONÓMETRO ]
            </p>
            <p
              className="sl-stat sl-notif font-black tabular-nums text-[var(--sl-cyan)]"
              style={{ fontSize: 'clamp(2.4rem, 13vw, 4.6rem)' }}
              suppressHydrationWarning
            >
              {formatDurationMs(elapsed)}
            </p>
            <div className="mx-auto mt-4">
              {isDone ? (
                <p className="sl-label sl-label-gold sl-label-tight">
                  [ COMBATE COMPLETADO ]
                </p>
              ) : (
                <p className="sl-label sl-label-tight text-[var(--sl-text-dim)]">
                  [ BATTLE · IN PROGRESS ]
                </p>
              )}
            </div>

            {!isDone && (
              <div className="mx-auto mt-5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="sl-label sl-label-tight">
                    Series {totalSetsDone} / {totalSetsPlanned}
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

        {/* CONFIG DESCANSO */}
        {!isDone && (
          <div className="sl-panel sl-pad-md">
            <div className="sl-head-row">
              <span className="sl-ico sl-ico-violet" aria-hidden>
                <FiClock className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="sl-label sl-label-violet sl-label-tight">
                  [ DESCANSO ENTRE SERIES ]
                </p>
                <p className="mt-1 text-xs text-[var(--sl-text-dim)]">
                  Se inicia solo al marcar una serie.
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRestSeconds((v) => clampRest(v - 15))}
                className="sl-btn sl-btn-ghost sl-btn-sm sl-focus !px-3"
                aria-label="Restar 15 segundos"
              >
                <FiMinus className="h-4 w-4" aria-hidden />
              </button>
              <div className="min-w-0 flex-1">
                <input
                  type="number"
                  inputMode="numeric"
                  min={MIN_REST}
                  max={MAX_REST}
                  step={5}
                  className="sl-input sl-stat text-center font-bold tabular-nums"
                  value={restSeconds}
                  onChange={(e) =>
                    setRestSeconds(clampRest(Number(e.target.value)))
                  }
                  aria-label="Segundos de descanso"
                />
                <p className="sl-label sl-label-tight mt-1 text-center text-[var(--sl-muted)]">
                  {formatSeconds(restSeconds)} min
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRestSeconds((v) => clampRest(v + 15))}
                className="sl-btn sl-btn-ghost sl-btn-sm sl-focus !px-3"
                aria-label="Sumar 15 segundos"
              >
                <FiPlus className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        )}

        {/* OBJETIVOS · SERIES */}
        <div className="space-y-4">
          <header className="sl-section-head">
            <p className="sl-label sl-label-violet">[ OBJETIVOS · SERIES ]</p>
          </header>

          {session.exercises.map((ex, ei) => {
            const open = openExercise === ei
            const setCount = ex.sets.length
            const doneCount = ex.sets.filter((s) => s.completed).length
            return (
              <section
                key={ex.id ?? (ex.exerciseTemplateId ?? '') + ei}
                className="sl-panel overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleExercise(ei)}
                  className="sl-focus flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-[rgba(92,225,255,0.04)]"
                  aria-expanded={open}
                >
                  <span className="sl-ico sl-ico-violet sl-stat text-sm font-bold">
                    {String(ei + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="sl-label sl-label-tight">
                      [ OBJETIVO {String(ei + 1).padStart(2, '0')} /{' '}
                      {String(totalEx).padStart(2, '0')} ]
                    </p>
                    <h3 className="sl-title mt-1 truncate text-sm font-bold text-[var(--sl-text)]">
                      {ex.name}
                    </h3>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--sl-text-dim)]">
                      <FiTarget className="h-3 w-3 shrink-0" aria-hidden />
                      {doneCount} / {setCount} serie{setCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="shrink-0 text-[var(--sl-text-dim)]">
                    {open ? (
                      <FiChevronUp className="h-5 w-5" aria-hidden />
                    ) : (
                      <FiChevronDown className="h-5 w-5" aria-hidden />
                    )}
                  </span>
                </button>

                {open && (
                  <div className="border-t border-[var(--sl-border)] px-3 pb-4 pt-3">
                    <ul className="space-y-3">
                      {ex.sets.map((st, si) => {
                        const done = st.completed
                        return (
                          <li
                            key={st.id}
                            className={`sl-corners border p-3 transition ${
                              done
                                ? 'border-[var(--sl-cyan)]/60 bg-[rgba(92,225,255,0.08)]'
                                : 'border-[var(--sl-border)] bg-[rgba(5,10,24,0.6)]'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleToggleSet(ei, si, done)}
                                disabled={isDone}
                                className={`sl-check-btn sl-focus ${done ? 'is-done' : ''}`}
                                aria-pressed={done}
                                aria-label={
                                  done
                                    ? `Desmarcar serie ${si + 1}`
                                    : `Marcar serie ${si + 1} como completada`
                                }
                              >
                                {done ? (
                                  <FiCheck className="h-4 w-4" aria-hidden />
                                ) : (
                                  <span className="sl-stat text-[0.72rem] font-bold">
                                    {si + 1}
                                  </span>
                                )}
                              </button>
                              <p className="sl-label sl-label-tight flex-1">
                                SERIE {String(si + 1).padStart(2, '0')}
                              </p>
                              {done && (
                                <span className="sl-chip">
                                  <FiCheck className="h-3 w-3" aria-hidden />
                                  OK
                                </span>
                              )}
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2.5">
                              <div>
                                <label className="sl-field-label">
                                  Peso · kg
                                </label>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  min={0}
                                  max={1000}
                                  step="0.5"
                                  disabled={isDone}
                                  className="sl-input sl-stat py-3 text-center font-bold tabular-nums disabled:opacity-55"
                                  value={st.weight}
                                  onChange={(e) =>
                                    updateSet(session.id, ei, si, {
                                      weight: Math.min(
                                        1000,
                                        Math.max(0, Number(e.target.value) || 0),
                                      ),
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="sl-field-label">Reps</label>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  max={200}
                                  disabled={isDone}
                                  className="sl-input sl-stat py-3 text-center font-bold tabular-nums disabled:opacity-55"
                                  value={st.reps}
                                  onChange={(e) =>
                                    updateSet(session.id, ei, si, {
                                      reps: Math.min(
                                        200,
                                        Math.max(0, Number(e.target.value) || 0),
                                      ),
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>

                    {!isDone && (
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => addSetToExercise(session.id, ei)}
                          disabled={setCount >= 20}
                          className="sl-btn sl-btn-violet sl-btn-sm sl-focus w-full"
                        >
                          <FiPlus className="h-4 w-4" aria-hidden />
                          {setCount >= 20
                            ? 'Máximo 20 series'
                            : 'Añadir serie extra'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )
          })}
        </div>

        {isDone && (
          <div className="flex justify-center pt-2">
            <Link href="/" className="sl-btn sl-btn-ghost sl-focus">
              Volver al Sistema
            </Link>
          </div>
        )}
      </div>

      {/* HUD FLOTANTE DE DESCANSO */}
      {!isDone && restActive && (
        <RestHud
          endsAt={restEndsAt!}
          onCancel={() => setRestEndsAt(null)}
          onAddTime={(delta) =>
            setRestEndsAt((prev) =>
              prev !== null ? prev + delta * 1000 : prev,
            )
          }
        />
      )}

      {/* ACCIONES FIJAS MÓVIL */}
      {!isDone && (
        <div
          className="fixed left-1/2 z-40 w-full -translate-x-1/2 border-t border-[var(--sl-cyan)]/30 bg-[rgba(3,5,13,0.95)] p-3 backdrop-blur-xl"
          style={{
            maxWidth: 'var(--sl-app-max)',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 4.5rem)',
          }}
        >
          <div className="sl-divider absolute inset-x-0 top-0 opacity-60" />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="sl-btn sl-btn-ghost sl-focus flex-1"
            >
              <FiX className="h-4 w-4" aria-hidden />
              Descartar
            </button>
            <button
              type="button"
              onClick={handleFinish}
              className="sl-btn sl-btn-primary sl-focus flex-1"
            >
              <FiCheck className="h-4 w-4" aria-hidden />
              Finalizar
            </button>
          </div>
        </div>
      )}
    </AppShell>
  )
}

function RestHud({
  endsAt,
  onCancel,
  onAddTime,
}: {
  endsAt: number
  onCancel: () => void
  onAddTime: (deltaSec: number) => void
}) {
  const [, force] = useState(0)
  const [paused, setPaused] = useState(false)
  const pauseTsRef = useRef<number | null>(null)

  useEffect(() => {
    if (paused) return undefined
    const id = window.setInterval(() => force((x) => x + 1), 250)
    return () => clearInterval(id)
  }, [paused])

  const remaining = Math.max(0, endsAt - Date.now())
  const secs = Math.ceil(remaining / 1000)

  const togglePause = () => {
    if (paused && pauseTsRef.current !== null) {
      const delta = Date.now() - pauseTsRef.current
      onAddTime(delta / 1000)
      pauseTsRef.current = null
      setPaused(false)
    } else {
      pauseTsRef.current = Date.now()
      setPaused(true)
    }
  }

  return (
    <div
      className="pointer-events-none fixed left-1/2 z-50 w-full -translate-x-1/2 px-3"
      style={{
        maxWidth: 'var(--sl-app-max)',
        bottom:
          'calc(env(safe-area-inset-bottom, 0px) + 4.5rem + 4.25rem + 0.5rem)',
      }}
    >
      <div className="pointer-events-auto sl-panel sl-panel-glow sl-pad-sm sl-animate-in">
        <div className="flex items-center gap-3">
          <span className="sl-ico sl-ico-violet shrink-0" aria-hidden>
            <FiClock className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="sl-label sl-label-violet sl-label-tight">
              [ DESCANSO ]
            </p>
            <p
              className="sl-stat sl-violet-glow text-2xl font-black tabular-nums text-[var(--sl-violet)]"
              suppressHydrationWarning
            >
              {formatSeconds(secs)}
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => onAddTime(15)}
              className="sl-btn sl-btn-ghost sl-btn-sm sl-focus !px-2.5"
              aria-label="Añadir 15 segundos"
            >
              +15
            </button>
            <button
              type="button"
              onClick={togglePause}
              className="sl-btn sl-btn-violet sl-btn-sm sl-focus !px-2.5"
              aria-label={paused ? 'Reanudar' : 'Pausar'}
            >
              {paused ? (
                <FiPlay className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <FiPause className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="sl-btn sl-btn-ghost sl-btn-sm sl-focus !px-2.5"
              aria-label="Cerrar"
            >
              <FiX className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
