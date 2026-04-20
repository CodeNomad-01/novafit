'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  FiAlertCircle,
  FiBarChart2,
  FiCheck,
  FiCheckCircle,
  FiCopy,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUserPlus,
  FiX,
} from 'react-icons/fi'
import { AppShell } from '@/components/AppShell'
import { ComparisonChart } from '@/components/ComparisonChart'
import { useNovaFit } from '@/lib/store/context'
import { supabase } from '@/lib/supabase/client'
import { dailyVolumeSeries } from '@/lib/domain/stats'

type SearchResult = {
  id: string
  username: string
  displayName: string
  friendCode: string
  avatarColor: string
}

export default function FriendsPage() {
  const {
    hydrated,
    profile,
    setDisplayName,
    friends,
    pending,
    sessions,
    searchProfileByUsername,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    refreshFriendStats,
  } = useNovaFit()

  const [displayNameDraft, setDisplayNameDraft] = useState('')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [searchMsg, setSearchMsg] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(
    null,
  )

  const [friendDaily, setFriendDaily] = useState<number[] | null>(null)

  useEffect(() => {
    setDisplayNameDraft(profile.displayName)
  }, [profile.displayName])

  const completed = useMemo(
    () => sessions.filter((s) => s.endedAt),
    [sessions],
  )

  const primaryFriend = friends[0]

  useEffect(() => {
    if (!primaryFriend) {
      setFriendDaily(null)
      return
    }
    let cancelled = false
    supabase
      .rpc('daily_volume', { for_user: primaryFriend.id, days: 7 })
      .then(({ data }) => {
        if (cancelled || !data) return
        setFriendDaily(data.map((d) => Number(d.volume) || 0))
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryFriend?.id])

  const chartData = useMemo(() => {
    const mine = dailyVolumeSeries(completed, 7)
    const labels = mine.map((d) => {
      const [, m, day] = d.label.split('-')
      return `${day}/${m}`
    })
    return {
      labels,
      mine: mine.map((m) => m.volume),
      friend: friendDaily ?? Array(7).fill(0),
    }
  }, [completed, friendDaily])

  async function copyUsername() {
    try {
      await navigator.clipboard.writeText(`@${profile.friendCode}`)
      showMsg('ok', 'Código de cazador copiado.')
    } catch {
      showMsg('err', 'No se pudo copiar.')
    }
  }

  function showMsg(tone: 'ok' | 'err', text: string) {
    setMsg({ tone, text })
    setTimeout(() => setMsg(null), 3000)
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearchMsg(null)
    setSearchResult(null)
    const q = query.trim().toLowerCase()
    if (q.length < 3) {
      setSearchMsg('Introduce al menos 3 caracteres.')
      return
    }
    setSearching(true)
    const res = await searchProfileByUsername(q)
    setSearching(false)
    if (!res) {
      setSearchMsg('Ningún cazador con ese @usuario.')
      return
    }
    setSearchResult(res)
  }

  async function handleSendRequest() {
    if (!searchResult) return
    const res = await sendFriendRequest(searchResult.id)
    if (res.ok) {
      showMsg('ok', `Invitación enviada a @${searchResult.username}.`)
      setSearchResult(null)
      setQuery('')
    } else {
      showMsg('err', res.error ?? 'No se pudo enviar la invitación.')
    }
  }

  async function handleAccept(id: string, username: string) {
    const res = await acceptFriendRequest(id)
    if (res.ok) showMsg('ok', `Aliado @${username} añadido al gremio.`)
    else showMsg('err', res.error ?? 'No se pudo aceptar.')
  }

  async function handleReject(id: string) {
    const res = await rejectFriendRequest(id)
    if (res.ok) showMsg('ok', 'Invitación descartada.')
    else showMsg('err', res.error ?? 'No se pudo rechazar.')
  }

  if (!hydrated) {
    return (
      <AppShell title="Aliados">
        <div className="h-40 animate-pulse bg-[var(--sl-panel)]" />
      </AppShell>
    )
  }

  const incoming = pending.filter((p) => p.direction === 'incoming')
  const outgoing = pending.filter((p) => p.direction === 'outgoing')

  return (
    <AppShell
      eyebrow="[ GUILD · ALLIES ]"
      title="Gremio de cazadores"
      subtitle="Busca aliados por su @usuario, envíales invitaciones y compara vuestro poder semanal."
    >
      <div className="sl-stack">
        {msg && (
          <div
            role="status"
            className={`sl-corners border px-4 py-3 sl-animate-in ${
              msg.tone === 'ok'
                ? 'border-[var(--sl-cyan)]/45 bg-[rgba(92,225,255,0.08)]'
                : 'border-[var(--sl-danger)]/45 bg-[rgba(255,94,123,0.08)]'
            }`}
            style={
              msg.tone === 'ok'
                ? { boxShadow: '0 0 22px rgba(92,225,255,0.18)' }
                : undefined
            }
          >
            <p
              className={`sl-label ${
                msg.tone === 'err' ? 'text-[var(--sl-danger)]' : ''
              }`}
            >
              [ SYSTEM MESSAGE ]
            </p>
            <p
              className={`mt-1 text-sm font-semibold ${
                msg.tone === 'ok'
                  ? 'text-[var(--sl-cyan)]'
                  : 'text-[var(--sl-danger)]'
              }`}
            >
              {msg.text}
            </p>
          </div>
        )}

        {/* HUNTER CARD */}
        <section className="sl-panel sl-panel-glow sl-pad-lg">
          <header className="sl-section-head">
            <div className="sl-head-row">
              <span className="sl-ico sl-ico-lg">
                <FiShield className="h-6 w-6" />
              </span>
              <div>
                <p className="sl-label">[ HUNTER ID ]</p>
                <h2 className="sl-title text-lg font-bold text-[var(--sl-text)]">
                  Tu tarjeta de cazador
                </h2>
              </div>
            </div>
            <p>
              Dale tu <code>@usuario</code> a quien quieras añadir y dile que te
              busque desde aquí.
            </p>
          </header>

          <div className="sl-divider my-6" />

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="fn" className="sl-label mb-2 block text-[0.65rem]">
                Nombre visible
              </label>
              <input
                id="fn"
                className="sl-input"
                value={displayNameDraft}
                onChange={(e) => setDisplayNameDraft(e.target.value)}
                onBlur={() => {
                  if (displayNameDraft.trim() !== profile.displayName) {
                    setDisplayName(displayNameDraft)
                  }
                }}
                autoComplete="nickname"
              />
            </div>
            <div>
              <span className="sl-label mb-2 block text-[0.65rem]">
                Código de cazador
              </span>
              <div className="flex gap-2">
                <code className="sl-input sl-stat flex flex-1 items-center text-lg font-black tracking-[0.35em] text-[var(--sl-cyan)] sl-notif">
                  {profile.friendCode}
                </code>
                <button
                  type="button"
                  onClick={copyUsername}
                  className="sl-btn sl-btn-ghost sl-btn-sm sl-focus shrink-0 px-4"
                  title="Copiar código"
                  aria-label="Copiar código"
                >
                  <FiCopy className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* BUSCAR + INVITACIONES PENDIENTES */}
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          <section className="sl-panel sl-pad-md flex flex-col">
            <header className="sl-section-head">
              <div className="sl-head-row">
                <span className="sl-ico sl-ico-violet">
                  <FiUserPlus className="h-5 w-5" />
                </span>
                <div>
                  <p className="sl-label sl-label-violet">[ NEW ALLY ]</p>
                  <h2 className="sl-title text-lg font-bold text-[var(--sl-text)]">
                    Buscar aliado
                  </h2>
                </div>
              </div>
              <p>
                Introduce el <code>@usuario</code> exacto del cazador que
                quieres invitar a tu gremio.
              </p>
            </header>

            <div className="sl-divider sl-divider-violet my-5" />

            <form onSubmit={handleSearch} className="flex flex-col gap-3">
              <div>
                <label className="sl-label mb-2 block text-[0.65rem]">
                  Usuario
                </label>
                <div className="relative">
                  <span
                    className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--sl-muted)]"
                    aria-hidden
                  >
                    <FiSearch className="h-4 w-4" />
                  </span>
                  <input
                    className="sl-input pl-10"
                    placeholder="cazador_01"
                    value={query}
                    onChange={(e) => setQuery(e.target.value.toLowerCase())}
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={searching}
                className="sl-btn sl-btn-violet sl-focus"
              >
                {searching ? 'Escaneando...' : 'Escanear sistema'}
              </button>
            </form>

            {searchMsg && (
              <p className="sl-corners mt-4 flex items-center gap-2 border border-[var(--sl-danger)]/45 bg-[rgba(255,94,123,0.08)] p-3 text-xs text-[var(--sl-danger)]">
                <FiAlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                {searchMsg}
              </p>
            )}

            {searchResult && (
              <div className="sl-corners mt-4 border border-[var(--sl-cyan)]/45 bg-[rgba(92,225,255,0.08)] p-4 sl-animate-in">
                <div className="flex items-center gap-3">
                  <span
                    className="sl-title flex h-11 w-11 items-center justify-center border-2 text-base font-black"
                    style={{
                      borderColor: searchResult.avatarColor,
                      color: searchResult.avatarColor,
                      background: `radial-gradient(circle at center, ${searchResult.avatarColor}22, transparent 70%)`,
                      boxShadow: `0 0 12px ${searchResult.avatarColor}55`,
                      clipPath:
                        'polygon(0 6px, 6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)',
                    }}
                    aria-hidden
                  >
                    {searchResult.displayName.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="sl-title truncate font-bold text-[var(--sl-text)]">
                      {searchResult.displayName}
                    </p>
                    <p className="truncate text-xs text-[var(--sl-text-dim)]">
                      @{searchResult.username}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendRequest}
                    className="sl-btn sl-btn-primary sl-btn-sm sl-focus shrink-0"
                  >
                    <FiCheck className="h-4 w-4" aria-hidden />
                    Invitar
                  </button>
                </div>
              </div>
            )}

            <div className="sl-divider my-7" />

            <div>
              <header className="sl-section-head mb-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="sl-label">[ INBOX · INVITACIONES ]</p>
                    <h3 className="sl-title text-sm font-bold text-[var(--sl-text)]">
                      Invitaciones pendientes
                    </h3>
                  </div>
                  {incoming.length > 0 && (
                    <span
                      className="sl-stat flex h-7 min-w-[1.75rem] items-center justify-center border border-[var(--sl-gold)]/50 bg-[rgba(255,215,106,0.1)] px-2 text-xs font-bold text-[var(--sl-gold)]"
                      aria-label={`${incoming.length} pendientes`}
                    >
                      {incoming.length}
                    </span>
                  )}
                </div>
              </header>

              {incoming.length === 0 && outgoing.length === 0 ? (
                <p className="sl-corners border border-dashed border-[var(--sl-border)] bg-[rgba(8,14,30,0.4)] px-4 py-6 text-center text-xs text-[var(--sl-text-dim)]">
                  Sin invitaciones.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {incoming.map((p) => (
                    <li
                      key={p.id}
                      className="sl-corners flex items-center gap-3 border border-[var(--sl-gold)]/35 bg-[rgba(255,215,106,0.06)] p-3"
                    >
                      <span
                        className="sl-title flex h-9 w-9 items-center justify-center border-2 text-sm font-black"
                        style={{
                          borderColor: p.other.avatarColor,
                          color: p.other.avatarColor,
                          background: `radial-gradient(circle at center, ${p.other.avatarColor}22, transparent 70%)`,
                          clipPath:
                            'polygon(0 5px, 5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%)',
                        }}
                        aria-hidden
                      >
                        {p.other.displayName.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="sl-title truncate text-sm font-bold text-[var(--sl-text)]">
                          {p.other.displayName}
                        </p>
                        <p className="truncate text-[0.7rem] text-[var(--sl-text-dim)]">
                          @{p.other.username} · te quiere aliar
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAccept(p.id, p.other.username)}
                        className="sl-focus shrink-0 p-2 text-[var(--sl-cyan)] transition hover:bg-[rgba(92,225,255,0.12)]"
                        title="Aceptar"
                        aria-label="Aceptar"
                      >
                        <FiCheckCircle className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(p.id)}
                        className="sl-focus shrink-0 p-2 text-[var(--sl-danger)] transition hover:bg-[rgba(255,94,123,0.12)]"
                        title="Rechazar"
                        aria-label="Rechazar"
                      >
                        <FiX className="h-5 w-5" />
                      </button>
                    </li>
                  ))}
                  {outgoing.map((p) => (
                    <li
                      key={p.id}
                      className="sl-corners flex items-center gap-3 border border-[var(--sl-border)] bg-[rgba(8,14,30,0.5)] p-3 opacity-80"
                    >
                      <span
                        className="sl-title flex h-9 w-9 items-center justify-center border-2 text-sm font-black"
                        style={{
                          borderColor: p.other.avatarColor,
                          color: p.other.avatarColor,
                          background: `radial-gradient(circle at center, ${p.other.avatarColor}22, transparent 70%)`,
                          clipPath:
                            'polygon(0 5px, 5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%)',
                        }}
                        aria-hidden
                      >
                        {p.other.displayName.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="sl-title truncate text-sm font-bold text-[var(--sl-text)]">
                          {p.other.displayName}
                        </p>
                        <p className="truncate text-[0.7rem] text-[var(--sl-muted)]">
                          @{p.other.username} · esperando respuesta
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleReject(p.id)}
                        className="sl-focus shrink-0 p-2 text-[var(--sl-danger)] transition hover:bg-[rgba(255,94,123,0.12)]"
                        title="Cancelar invitación"
                        aria-label="Cancelar invitación"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="sl-panel sl-pad-md">
            <header className="sl-section-head">
              <div className="flex items-center justify-between gap-3">
                <div className="sl-head-row">
                  <span className="sl-ico">
                    <FiShield className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="sl-label">[ PARTY MEMBERS ]</p>
                    <h2 className="sl-title text-lg font-bold text-[var(--sl-text)]">
                      Miembros del gremio
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={refreshFriendStats}
                  className="sl-focus p-2 text-[var(--sl-text-dim)] transition hover:text-[var(--sl-cyan)]"
                  aria-label="Refrescar estadísticas"
                  title="Refrescar estadísticas"
                >
                  <FiRefreshCw className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="sl-divider my-5" />

            {friends.length === 0 ? (
              <div className="sl-corners border border-dashed border-[var(--sl-border)] bg-[rgba(8,14,30,0.4)] px-4 py-12 text-center">
                <p className="text-sm text-[var(--sl-text-dim)]">
                  El gremio está vacío. Busca a tus amigos por @usuario.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {friends.map((f) => (
                  <li
                    key={f.id}
                    className="sl-corners flex items-start gap-3 border border-[var(--sl-border)] bg-[rgba(8,14,30,0.5)] p-4"
                  >
                    <span
                      className="sl-title flex h-11 w-11 shrink-0 items-center justify-center border-2 text-base font-black"
                      style={{
                        borderColor: f.avatarColor,
                        color: f.avatarColor,
                        background: `radial-gradient(circle at center, ${f.avatarColor}22, transparent 70%)`,
                        boxShadow: `0 0 10px ${f.avatarColor}55`,
                        clipPath:
                          'polygon(0 6px, 6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)',
                      }}
                      aria-hidden
                    >
                      {f.displayName.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="sl-title truncate font-bold text-[var(--sl-text)]">
                        {f.displayName}
                      </p>
                      <p className="truncate text-xs text-[var(--sl-text-dim)]">
                        @{f.username} ·{' '}
                        <span className="sl-stat font-mono tracking-widest text-[var(--sl-cyan)]">
                          {f.friendCode}
                        </span>
                      </p>
                      {f.stats ? (
                        <p className="pt-1 text-xs text-[var(--sl-text-dim)]">
                          <span className="sl-stat text-[var(--sl-text)]">
                            {Math.round(f.stats.weeklyVolumeKg).toLocaleString(
                              'es',
                            )}
                          </span>{' '}
                          kg poder ·{' '}
                          <span className="sl-stat text-[var(--sl-text)]">
                            {f.stats.sessionsLast7Days}
                          </span>{' '}
                          misiones
                        </p>
                      ) : (
                        <p className="sl-label pt-1 text-[var(--sl-muted)]">
                          [ SIN ACTIVIDAD RECIENTE ]
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFriend(f.id)}
                      className="sl-focus shrink-0 p-2 text-[var(--sl-danger)] transition hover:bg-[rgba(255,94,123,0.12)]"
                      aria-label={`Expulsar a ${f.displayName}`}
                      title="Expulsar del gremio"
                    >
                      <FiTrash2 className="h-5 w-5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* GRÁFICA */}
        <section className="sl-panel sl-pad-lg">
          <header className="sl-section-head">
            <div className="sl-head-row">
              <span className="sl-ico">
                <FiBarChart2 className="h-5 w-5" />
              </span>
              <div>
                <p className="sl-label">[ POWER · 7 DÍAS ]</p>
                <h2 className="sl-title text-lg font-bold text-[var(--sl-text)]">
                  Comparativa de poder
                </h2>
              </div>
            </div>
            <p>
              {primaryFriend
                ? `Comparando tu poder con ${primaryFriend.displayName}.`
                : 'Acepta una invitación para activar la comparativa.'}
            </p>
          </header>

          <div className="sl-divider my-6" />

          {primaryFriend ? (
            <ComparisonChart
              labels={chartData.labels}
              myVolumes={chartData.mine}
              friendVolumes={chartData.friend}
            />
          ) : (
            <div className="sl-corners border border-dashed border-[var(--sl-border)] bg-[rgba(8,14,30,0.4)] px-4 py-12 text-center">
              <p className="text-sm text-[var(--sl-text-dim)]">
                Enlaza al menos un aliado para activar la gráfica.
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
