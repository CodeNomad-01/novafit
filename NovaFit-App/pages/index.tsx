'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  FiActivity,
  FiArrowRight,
  FiAward,
  FiChevronRight,
  FiClock,
  FiMap,
  FiPlay,
  FiTrendingUp,
  FiUsers,
  FiZap,
} from 'react-icons/fi'
import { AppShell } from '@/components/AppShell'
import { greetingForNow } from '@/lib/greeting'
import { computeRank } from '@/lib/rank'
import { useNovaFit } from '@/lib/store'
import { sessionVolumeKg } from '@/lib/stats'

export default function Home() {
  const {
    hydrated,
    profile,
    routines,
    sessions,
    friends,
    myStats,
    activeSessionId,
  } = useNovaFit()

  const completed = sessions
    .filter((s) => s.endedAt)
    .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))
  const last = completed[0]

  if (!hydrated) {
    return (
      <AppShell noHeaderTitle>
        <div className="sl-stack">
          <div className="h-56 animate-pulse bg-[var(--sl-panel)]" />
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse bg-[var(--sl-panel)]" />
            ))}
          </div>
        </div>
      </AppShell>
    )
  }

  const totalVolume = completed.reduce((acc, s) => acc + sessionVolumeKg(s), 0)
  const rank = computeRank(totalVolume)
  const greeting = greetingForNow()
  const hunterName =
    profile.displayName && profile.displayName !== 'Atleta'
      ? profile.displayName
      : 'Cazador'

  return (
    <AppShell noHeaderTitle>
      <div className="sl-stack sl-animate-in">
        {/* PANEL DEL SISTEMA */}
        <section>
          <header className="sl-section-head mb-4">
            <p className="sl-label flex items-center gap-2">
              <span className="inline-block h-2 w-2 bg-[var(--sl-cyan)] sl-pulse-dot" />
              [ STATUS WINDOW ]
            </p>
          </header>

          <div className="sl-panel sl-panel-glow sl-pad-lg relative">
            <div className="relative z-10 grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:gap-10">
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="sl-label sl-label-violet">
                    [ {greeting.toUpperCase()} ]
                  </p>
                  <h1 className="sl-title text-3xl font-black leading-[1.1] text-[var(--sl-text)] sl-flicker sm:text-4xl md:text-5xl">
                    BIENVENIDO,
                    <br />
                    <span className="sl-notif">{hunterName.toUpperCase()}</span>
                  </h1>
                  <p className="max-w-[52ch] text-[15px] leading-relaxed text-[var(--sl-text-dim)]">
                    Has entrado en tu{' '}
                    <span className="text-[var(--sl-cyan)]">Sistema</span>.
                    Completa misiones, acumula poder y sube de rango como
                    verdadero cazador.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/routines/new"
                    className="sl-btn sl-btn-primary sl-focus"
                  >
                    <FiZap className="h-4 w-4" aria-hidden />
                    Nueva misión
                  </Link>
                  <Link href="/routines" className="sl-btn sl-focus">
                    <FiMap className="h-4 w-4" aria-hidden />
                    Ir a misiones
                  </Link>
                </div>

                {activeSessionId && (
                  <Link
                    href={`/session/${activeSessionId}`}
                    className="sl-focus relative flex items-center gap-3 border border-[var(--sl-cyan)]/50 bg-[rgba(92,225,255,0.1)] p-3.5 sl-cut-sm transition hover:bg-[rgba(92,225,255,0.16)]"
                    style={{ boxShadow: '0 0 24px rgba(92,225,255,0.2)' }}
                  >
                    <span className="sl-ico sl-ico-lg">
                      <FiPlay className="h-6 w-6" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="sl-label block text-[var(--sl-cyan)]">
                        [ COMBATE ACTIVO ]
                      </span>
                      <span className="mt-1 block truncate text-sm font-semibold text-[var(--sl-text)]">
                        Continuar misión en curso
                      </span>
                    </span>
                    <FiChevronRight className="h-5 w-5 shrink-0 text-[var(--sl-cyan)]" />
                  </Link>
                )}
              </div>

              {/* Panel de rango */}
              <div className="sl-panel sl-pad-md relative overflow-hidden border-[var(--sl-cyan)]/40 bg-[rgba(8,14,30,0.7)]">
                <div
                  className="pointer-events-none absolute inset-0 opacity-50"
                  style={{
                    background:
                      'radial-gradient(circle at 50% 0%, rgba(92,225,255,0.18), transparent 60%)',
                  }}
                />
                <div className="relative">
                  <p className="sl-label">[ HUNTER RANK ]</p>
                  <div className="mt-5 flex items-center gap-5">
                    <div
                      className="relative flex h-24 w-24 shrink-0 items-center justify-center border-2"
                      style={{
                        borderColor: rank.color,
                        clipPath:
                          'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
                        background: `radial-gradient(circle at center, ${rank.color}22, transparent 70%)`,
                        boxShadow: `0 0 24px ${rank.color}55, inset 0 0 18px ${rank.color}33`,
                      }}
                      aria-hidden
                    >
                      <span
                        className="sl-title text-4xl font-black"
                        style={{
                          color: rank.color,
                          textShadow: `0 0 14px ${rank.color}cc`,
                        }}
                      >
                        {rank.tier}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <p
                        className="sl-title text-sm font-bold"
                        style={{
                          color: rank.color,
                          textShadow: `0 0 10px ${rank.color}88`,
                        }}
                      >
                        {rank.label}
                      </p>
                      <p className="text-xs text-[var(--sl-text-dim)]">
                        Poder total:{' '}
                        <span className="sl-stat text-[var(--sl-text)]">
                          {Math.round(totalVolume).toLocaleString('es')} kg
                        </span>
                      </p>
                      <div className="sl-bar">
                        <div
                          className="sl-bar-fill"
                          style={{
                            width: `${Math.round(rank.progress * 100)}%`,
                          }}
                        />
                      </div>
                      {rank.remainingToNext !== null ? (
                        <p className="text-[0.7rem] tracking-wider text-[var(--sl-text-dim)]">
                          +
                          <span className="sl-stat text-[var(--sl-cyan)]">
                            {rank.remainingToNext.toLocaleString('es')} kg
                          </span>{' '}
                          para el siguiente rango
                        </p>
                      ) : (
                        <p className="sl-label-gold text-[0.7rem] tracking-wider">
                          [ RANGO MÁXIMO ALCANZADO ]
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section>
          <header className="sl-section-head mb-4">
            <p className="sl-label">[ WEEKLY STATS · 7 DÍAS ]</p>
          </header>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={<FiTrendingUp className="h-5 w-5" />}
              labelText="Poder semanal"
              value={`${myStats.weeklyVolumeKg.toLocaleString('es')}`}
              unit="kg"
              tone="cyan"
              hint="Suma peso × repeticiones"
            />
            <StatCard
              icon={<FiClock className="h-5 w-5" />}
              labelText="Misiones"
              value={String(myStats.sessionsLast7Days)}
              unit="completadas"
              tone="violet"
              hint="Sesiones finalizadas"
            />
            <StatCard
              icon={<FiUsers className="h-5 w-5" />}
              labelText="Aliados"
              value={String(friends.length)}
              unit="en guild"
              tone="gold"
              cta={{ href: '/friends', label: 'Gremio' }}
            />
          </div>
        </section>

        {/* MISIONES + ÚLTIMO COMBATE */}
        <section className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="sl-panel sl-pad-md flex flex-col">
            <header className="sl-section-head flex items-start justify-between gap-3">
              <div>
                <p className="sl-label">[ QUEST BOARD ]</p>
                <h2 className="sl-title text-lg font-bold text-[var(--sl-text)]">
                  Misiones guardadas
                </h2>
                <p>
                  {routines.length === 0
                    ? 'El tablero está vacío. Registra tu primera misión.'
                    : `${routines.length} misión${routines.length === 1 ? '' : 'es'} disponible${routines.length === 1 ? '' : 's'}`}
                </p>
              </div>
              <Link
                href="/routines/new"
                className="sl-focus sl-label shrink-0 text-[var(--sl-cyan)] hover:text-[var(--sl-cyan)]"
              >
                + Nueva
              </Link>
            </header>

            <div className="sl-divider my-5" />

            {routines.length === 0 ? (
              <div className="sl-corners flex flex-col items-center border border-dashed border-[var(--sl-border)] bg-[rgba(8,14,30,0.4)] px-4 py-10 text-center">
                <FiActivity
                  className="h-10 w-10 text-[var(--sl-muted)]"
                  aria-hidden
                />
                <p className="mt-3 text-sm text-[var(--sl-text-dim)]">
                  Sin misiones registradas
                </p>
                <Link
                  href="/routines/new"
                  className="sl-btn sl-btn-primary sl-btn-sm sl-focus mt-5"
                >
                  Crear primera misión
                </Link>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {routines.slice(0, 5).map((r, i) => (
                  <li key={r.id}>
                    <Link
                      href={`/routines/${r.id}`}
                      className="sl-focus group flex items-center gap-3 border border-[var(--sl-border)] bg-[rgba(8,14,30,0.5)] px-4 py-3.5 transition hover:border-[var(--sl-cyan)]/60 hover:bg-[rgba(92,225,255,0.06)]"
                    >
                      <span
                        className="sl-stat flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--sl-cyan)]/50 bg-[rgba(92,225,255,0.05)] text-xs font-bold text-[var(--sl-cyan)]"
                        aria-hidden
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[var(--sl-text)]">
                          {r.name}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--sl-muted)]">
                          {r.exercises.length} objetivo
                          {r.exercises.length === 1 ? '' : 's'}
                        </p>
                      </span>
                      <FiChevronRight
                        className="h-5 w-5 shrink-0 text-[var(--sl-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--sl-cyan)]"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {routines.length > 0 && (
              <Link
                href="/routines"
                className="sl-focus sl-label mt-5 inline-flex items-center gap-1.5 text-[var(--sl-cyan)]"
              >
                Ver tablero completo{' '}
                <FiArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            )}
          </div>

          <div className="sl-panel sl-pad-md flex flex-col">
            <header className="sl-section-head">
              <p className="sl-label">[ LAST BATTLE ]</p>
              <h2 className="sl-title text-lg font-bold text-[var(--sl-text)]">
                Último combate
              </h2>
            </header>

            <div className="sl-divider my-5" />

            {!last ? (
              <div className="sl-corners flex flex-1 flex-col items-center justify-center border border-dashed border-[var(--sl-border)] bg-[rgba(8,14,30,0.4)] px-4 py-12 text-center">
                <FiAward
                  className="h-10 w-10 text-[var(--sl-muted)]"
                  aria-hidden
                />
                <p className="mt-3 text-sm text-[var(--sl-text-dim)]">
                  Aún no hay combates registrados.
                </p>
                <Link
                  href="/routines"
                  className="sl-btn sl-btn-ghost sl-btn-sm sl-focus mt-5"
                >
                  Iniciar misión
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                <div
                  className="sl-corners relative overflow-hidden border border-[var(--sl-cyan)]/40 bg-[rgba(92,225,255,0.06)] p-5"
                  style={{ boxShadow: '0 0 24px rgba(92,225,255,0.12)' }}
                >
                  <p className="sl-title text-sm font-bold text-[var(--sl-text)]">
                    {last.routineName}
                  </p>
                  <p className="mt-1 text-xs text-[var(--sl-text-dim)]">
                    {formatDistanceToNow(last.endedAt ?? last.startedAt, {
                      addSuffix: true,
                      locale: es,
                    })}
                  </p>
                  <p className="sl-stat sl-notif mt-5 text-4xl font-black leading-none">
                    {sessionVolumeKg(last).toLocaleString('es')}
                    <span className="ml-2 text-base font-semibold text-[var(--sl-text-dim)]">
                      kg poder
                    </span>
                  </p>
                </div>
                <Link
                  href="/routines"
                  className="sl-focus sl-label inline-flex items-center gap-1.5 text-[var(--sl-cyan)]"
                >
                  Repetir misión{' '}
                  <FiArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  )
}

function StatCard({
  icon,
  labelText,
  value,
  unit,
  tone,
  hint,
  cta,
}: {
  icon: React.ReactNode
  labelText: string
  value: string
  unit: string
  tone: 'cyan' | 'violet' | 'gold'
  hint?: string
  cta?: { href: string; label: string }
}) {
  const toneStyles: Record<typeof tone, { color: string; soft: string; border: string }> = {
    cyan: {
      color: 'var(--sl-cyan)',
      soft: 'rgba(92,225,255,0.1)',
      border: 'rgba(92,225,255,0.45)',
    },
    violet: {
      color: 'var(--sl-violet)',
      soft: 'rgba(168,123,255,0.1)',
      border: 'rgba(168,123,255,0.45)',
    },
    gold: {
      color: 'var(--sl-gold)',
      soft: 'rgba(255,215,106,0.1)',
      border: 'rgba(255,215,106,0.45)',
    },
  }
  const s = toneStyles[tone]

  return (
    <div className="sl-panel sl-pad-md flex flex-col">
      <div className="sl-head-row">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center border"
          style={{
            color: s.color,
            background: s.soft,
            borderColor: s.border,
            clipPath:
              'polygon(0 6px, 6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)',
            boxShadow: `0 0 16px ${s.color}33`,
          }}
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className="sl-label text-[0.65rem]"
            style={{ color: s.color, textShadow: `0 0 10px ${s.color}55` }}
          >
            {labelText}
          </p>
          <p className="sl-stat mt-1.5 text-2xl font-black leading-none text-[var(--sl-text)]">
            {value}{' '}
            <span className="ml-0.5 text-sm font-semibold text-[var(--sl-text-dim)]">
              {unit}
            </span>
          </p>
        </div>
      </div>
      {hint && (
        <p className="mt-4 text-[0.75rem] leading-relaxed text-[var(--sl-muted)]">
          {hint}
        </p>
      )}
      {cta && (
        <Link
          href={cta.href}
          className="sl-focus sl-label mt-auto inline-flex items-center gap-1 pt-4 text-[var(--sl-cyan)]"
        >
          {cta.label} <FiChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  )
}
