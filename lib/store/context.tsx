'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/lib/auth/context'
import { createDefaultState } from '@/lib/store/default-state'
import { newId } from '@/lib/domain/id'
import { supabase } from '@/lib/supabase/client'
import { countSessionsLastDays, sumVolumeLastDays } from '@/lib/domain/stats'
import type { RoutineInput } from '@/lib/store/routine-input'
import type {
  Friend,
  FriendStats,
  NovaFitState,
  PendingFriendship,
  Routine,
  SessionExerciseLog,
  SetLog,
  WorkoutSession,
} from '@/lib/domain/types'
import type {
  FriendshipRow,
  ProfileRow,
  RoutineExerciseRow,
  RoutineRow,
  SessionExerciseRow,
  SessionRow,
  SetRow,
} from '@/lib/supabase/database.types'

type NovaFitContextValue = {
  hydrated: boolean
  loading: boolean
  error: string | null
  profile: NovaFitState['profile']
  routines: Routine[]
  sessions: WorkoutSession[]
  friends: Friend[]
  pending: PendingFriendship[]
  activeSessionId: string | null
  setDisplayName: (name: string) => Promise<void>
  myStats: FriendStats
  upsertRoutine: (r: RoutineInput) => Promise<string | null>
  deleteRoutine: (id: string) => Promise<void>
  startSessionFromRoutine: (routineId: string) => Promise<string | null>
  updateSet: (
    sessionId: string,
    exerciseIdx: number,
    setIdx: number,
    patch: Partial<{ reps: number; weight: number }>,
  ) => Promise<void>
  addSetToExercise: (sessionId: string, exerciseIdx: number) => Promise<void>
  finishSession: (sessionId: string) => Promise<void>
  cancelActiveSession: () => Promise<void>
  searchProfileByUsername: (q: string) => Promise<{
    id: string
    username: string
    displayName: string
    friendCode: string
    avatarColor: string
  } | null>
  sendFriendRequest: (addresseeId: string) => Promise<{ ok: boolean; error?: string }>
  acceptFriendRequest: (friendshipId: string) => Promise<{ ok: boolean; error?: string }>
  rejectFriendRequest: (friendshipId: string) => Promise<{ ok: boolean; error?: string }>
  removeFriend: (friendshipId: string) => Promise<void>
  refreshFriendStats: () => Promise<void>
}

const NovaFitContext = createContext<NovaFitContextValue | null>(null)

// ------------------- Mappers DB ↔ UI -------------------

type RoutineWithEx = RoutineRow & { routine_exercises: RoutineExerciseRow[] }
type SessionWithEx = SessionRow & {
  session_exercises: (SessionExerciseRow & { sets: SetRow[] })[]
}

function rowToRoutine(r: RoutineWithEx): Routine {
  const exercises = [...(r.routine_exercises ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((ex) => ({
      id: ex.id,
      name: ex.name,
      plannedSets: ex.planned_sets,
      defaultReps: ex.default_reps,
      defaultWeight: Number(ex.default_weight),
    }))
  return {
    id: r.id,
    name: r.name,
    createdAt: Date.parse(r.created_at) || Date.now(),
    exercises,
  }
}

function rowToSession(s: SessionWithEx): WorkoutSession {
  const exercises: SessionExerciseLog[] = [...(s.session_exercises ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((se) => ({
      id: se.id,
      exerciseTemplateId: se.exercise_template_id,
      name: se.name,
      sets: [...(se.sets ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((st) => ({
          id: st.id,
          reps: st.reps,
          weight: Number(st.weight),
        })),
    }))
  return {
    id: s.id,
    routineId: s.routine_id,
    routineName: s.routine_name,
    startedAt: Date.parse(s.started_at) || Date.now(),
    endedAt: s.ended_at ? Date.parse(s.ended_at) : undefined,
    exercises,
  }
}

function routineToSessionExercises(r: Routine): SessionExerciseLog[] {
  return r.exercises.map((ex) => ({
    id: newId(),
    exerciseTemplateId: ex.id,
    name: ex.name,
    sets: Array.from({ length: Math.max(1, ex.plannedSets) }, () => ({
      id: newId(),
      reps: ex.defaultReps,
      weight: ex.defaultWeight,
    })),
  }))
}

// ------------------- Provider -------------------

export function NovaFitProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, updateProfile: authUpdateProfile } =
    useAuth()
  const userId = user?.id ?? null

  const [state, setState] = useState<NovaFitState>(() => createDefaultState())
  const [hydrated, setHydrated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sincroniza profile del AuthContext al state local (para componentes que
  // lean `profile.displayName` o `profile.friendCode` sin tocar auth).
  useEffect(() => {
    if (!user) return
    setState((s) => ({
      ...s,
      profile: {
        id: user.id,
        displayName: user.displayName,
        friendCode: user.friendCode,
      },
    }))
  }, [user])

  // -------------------- Hidratación desde Supabase --------------------
  useEffect(() => {
    if (authLoading) return
    if (!userId) {
      setState(createDefaultState())
      setHydrated(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const [routinesRes, sessionsRes, friendshipsRes] = await Promise.all([
          supabase
            .from('routines')
            .select('*, routine_exercises(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: true }),
          supabase
            .from('sessions')
            .select('*, session_exercises(*, sets(*))')
            .eq('user_id', userId)
            .order('started_at', { ascending: true }),
          supabase
            .from('friendships')
            .select(
              '*, requester:profiles!friendships_requester_id_fkey(*), addressee:profiles!friendships_addressee_id_fkey(*)',
            )
            .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
        ])

        if (routinesRes.error) throw routinesRes.error
        if (sessionsRes.error) throw sessionsRes.error
        if (friendshipsRes.error) throw friendshipsRes.error

        const routines = (routinesRes.data ?? []).map((r) =>
          rowToRoutine(r as unknown as RoutineWithEx),
        )
        const sessions = (sessionsRes.data ?? []).map((s) =>
          rowToSession(s as unknown as SessionWithEx),
        )
        const activeSessionId =
          sessions.find((s) => s.endedAt === undefined)?.id ?? null

        type Joined = FriendshipRow & {
          requester: ProfileRow
          addressee: ProfileRow
        }
        const joined = (friendshipsRes.data ?? []) as unknown as Joined[]
        const friends: Friend[] = []
        const pending: PendingFriendship[] = []
        for (const row of joined) {
          const other = row.requester.id === userId ? row.addressee : row.requester
          if (row.status === 'accepted') {
            friends.push({
              id: other.id,
              username: other.username,
              displayName: other.display_name,
              friendCode: other.friend_code,
              avatarColor: other.avatar_color,
            })
          } else if (row.status === 'pending') {
            pending.push({
              id: row.id,
              direction: row.requester_id === userId ? 'outgoing' : 'incoming',
              other: {
                id: other.id,
                username: other.username,
                displayName: other.display_name,
                friendCode: other.friend_code,
                avatarColor: other.avatar_color,
              },
              createdAt: Date.parse(row.created_at) || Date.now(),
            })
          }
        }

        if (cancelled) return
        setState((prev) => ({
          ...prev,
          profile: {
            id: userId,
            displayName: user?.displayName ?? prev.profile.displayName,
            friendCode: user?.friendCode ?? prev.profile.friendCode,
          },
          routines,
          sessions,
          friends,
          pending,
          activeSessionId,
        }))

        // Traer stats de amigos en paralelo (no bloqueante para UI principal).
        const statsResults = await Promise.all(
          friends.map((f) =>
            supabase.rpc('weekly_stats', { for_user: f.id }).then((r) => ({
              id: f.id,
              stats: r.data?.[0],
            })),
          ),
        )
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            friends: prev.friends.map((f) => {
              const s = statsResults.find((x) => x.id === f.id)?.stats
              if (!s) return f
              return {
                ...f,
                stats: {
                  weeklyVolumeKg: Number(s.volume_kg) || 0,
                  sessionsLast7Days: Number(s.sessions_count) || 0,
                  updatedAt: Date.now(),
                },
              }
            }),
          }))
        }

        setHydrated(true)
      } catch (err) {
        console.error('[store] hidratación falló:', err)
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudieron cargar tus datos.',
          )
          setHydrated(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userId, authLoading, user?.displayName, user?.friendCode, user])

  // -------------------- Helpers --------------------

  const requireUser = useCallback(() => {
    if (!userId) throw new Error('Sesión no iniciada.')
    return userId
  }, [userId])

  // -------------------- Mutaciones: rutinas --------------------

  const upsertRoutine = useCallback(
    async (r: RoutineInput): Promise<string | null> => {
      const uid = requireUser()
      const isUpdate = Boolean(r.id)
      const name = r.name.trim() || 'Sin nombre'
      const exercisesInput = r.exercises.map((e, idx) => ({
        id: e.id ?? newId(),
        position: idx,
        name: e.name.trim() || 'Ejercicio',
        plannedSets: Math.max(1, Math.floor(e.plannedSets) || 1),
        defaultReps: Math.max(0, e.defaultReps),
        defaultWeight: Math.max(0, e.defaultWeight),
      }))

      const snapshot = state
      try {
        let routineId = r.id
        if (isUpdate && r.id) {
          const { error } = await supabase
            .from('routines')
            .update({ name })
            .eq('id', r.id)
          if (error) throw error
          const { error: delErr } = await supabase
            .from('routine_exercises')
            .delete()
            .eq('routine_id', r.id)
          if (delErr) throw delErr
        } else {
          const { data, error } = await supabase
            .from('routines')
            .insert({ user_id: uid, name })
            .select('id, created_at')
            .single()
          if (error) throw error
          routineId = data.id
        }

        if (!routineId) throw new Error('No se pudo crear la rutina.')
        if (exercisesInput.length > 0) {
          const { error: insErr } = await supabase
            .from('routine_exercises')
            .insert(
              exercisesInput.map((e) => ({
                id: e.id,
                routine_id: routineId!,
                position: e.position,
                name: e.name,
                planned_sets: e.plannedSets,
                default_reps: e.defaultReps,
                default_weight: e.defaultWeight,
              })),
            )
          if (insErr) throw insErr
        }

        const routine: Routine = {
          id: routineId,
          name,
          createdAt:
            snapshot.routines.find((x) => x.id === routineId)?.createdAt ??
            r.createdAt ??
            Date.now(),
          exercises: exercisesInput.map((e) => ({
            id: e.id,
            name: e.name,
            plannedSets: e.plannedSets,
            defaultReps: e.defaultReps,
            defaultWeight: e.defaultWeight,
          })),
        }
        setState((s) => {
          const rest = s.routines.filter((x) => x.id !== routineId)
          return { ...s, routines: [...rest, routine] }
        })
        return routineId
      } catch (err) {
        console.error('[store] upsertRoutine:', err)
        setError(err instanceof Error ? err.message : 'No se pudo guardar.')
        return null
      }
    },
    [requireUser, state],
  )

  const deleteRoutine = useCallback(
    async (id: string) => {
      const before = state.routines
      setState((s) => ({ ...s, routines: s.routines.filter((x) => x.id !== id) }))
      const { error } = await supabase.from('routines').delete().eq('id', id)
      if (error) {
        console.error('[store] deleteRoutine:', error)
        setError(error.message)
        setState((s) => ({ ...s, routines: before }))
      }
    },
    [state.routines],
  )

  // -------------------- Mutaciones: sesiones --------------------

  const startSessionFromRoutine = useCallback(
    async (routineId: string): Promise<string | null> => {
      const uid = requireUser()
      const routine = state.routines.find((r) => r.id === routineId)
      if (!routine || routine.exercises.length === 0) return null
      if (state.activeSessionId) return null

      try {
        const { data: sessRow, error: sErr } = await supabase
          .from('sessions')
          .insert({
            user_id: uid,
            routine_id: routine.id,
            routine_name: routine.name,
          })
          .select('*')
          .single()
        if (sErr) throw sErr

        const exercises = routineToSessionExercises(routine)
        const { data: seRows, error: seErr } = await supabase
          .from('session_exercises')
          .insert(
            exercises.map((ex, idx) => ({
              id: ex.id,
              session_id: sessRow.id,
              position: idx,
              exercise_template_id: ex.exerciseTemplateId,
              name: ex.name,
            })),
          )
          .select('*')
        if (seErr) throw seErr

        const allSets: SetRow[] = []
        const setsPayload = exercises.flatMap((ex) =>
          ex.sets.map((st, idx) => ({
            id: st.id,
            session_exercise_id: ex.id,
            position: idx,
            reps: st.reps,
            weight: st.weight,
          })),
        )
        if (setsPayload.length > 0) {
          const { data: setRows, error: stErr } = await supabase
            .from('sets')
            .insert(setsPayload)
            .select('*')
          if (stErr) throw stErr
          allSets.push(...(setRows ?? []))
        }

        const session: WorkoutSession = {
          id: sessRow.id,
          routineId: sessRow.routine_id,
          routineName: sessRow.routine_name,
          startedAt: Date.parse(sessRow.started_at) || Date.now(),
          exercises: (seRows ?? []).map((se) => ({
            id: se.id,
            exerciseTemplateId: se.exercise_template_id,
            name: se.name,
            sets: allSets
              .filter((st) => st.session_exercise_id === se.id)
              .sort((a, b) => a.position - b.position)
              .map((st) => ({ id: st.id, reps: st.reps, weight: Number(st.weight) })),
          })),
        }

        setState((s) => ({
          ...s,
          sessions: [...s.sessions, session],
          activeSessionId: session.id,
        }))
        return session.id
      } catch (err) {
        console.error('[store] startSession:', err)
        setError(err instanceof Error ? err.message : 'No se pudo iniciar.')
        return null
      }
    },
    [requireUser, state.routines, state.activeSessionId],
  )

  const updateSet = useCallback(
    async (
      sessionId: string,
      exerciseIdx: number,
      setIdx: number,
      patch: Partial<{ reps: number; weight: number }>,
    ) => {
      let setId: string | null = null
      let before: SetLog | null = null
      setState((s) => ({
        ...s,
        sessions: s.sessions.map((sess) => {
          if (sess.id !== sessionId) return sess
          const exercises = sess.exercises.map((ex, ei) => {
            if (ei !== exerciseIdx) return ex
            const sets = ex.sets.map((st, si) => {
              if (si !== setIdx) return st
              setId = st.id
              before = st
              return {
                ...st,
                reps: patch.reps !== undefined ? Math.max(0, patch.reps) : st.reps,
                weight:
                  patch.weight !== undefined ? Math.max(0, patch.weight) : st.weight,
              }
            })
            return { ...ex, sets }
          })
          return { ...sess, exercises }
        }),
      }))

      if (!setId) return
      const dbPatch: Partial<SetRow> = {}
      if (patch.reps !== undefined) dbPatch.reps = Math.max(0, patch.reps)
      if (patch.weight !== undefined) dbPatch.weight = Math.max(0, patch.weight)
      const { error } = await supabase.from('sets').update(dbPatch).eq('id', setId)
      if (error) {
        console.error('[store] updateSet:', error)
        setError(error.message)
        if (before) {
          const prev = before as SetLog
          setState((s) => ({
            ...s,
            sessions: s.sessions.map((sess) => {
              if (sess.id !== sessionId) return sess
              return {
                ...sess,
                exercises: sess.exercises.map((ex, ei) => {
                  if (ei !== exerciseIdx) return ex
                  return {
                    ...ex,
                    sets: ex.sets.map((st, si) => (si === setIdx ? prev : st)),
                  }
                }),
              }
            }),
          }))
        }
      }
    },
    [],
  )

  const addSetToExercise = useCallback(
    async (sessionId: string, exerciseIdx: number) => {
      const session = state.sessions.find((x) => x.id === sessionId)
      if (!session) return
      const ex = session.exercises[exerciseIdx]
      if (!ex) return
      const last = ex.sets[ex.sets.length - 1]
      const template = last ?? { id: newId(), reps: 10, weight: 0 }
      const newSet: SetLog = {
        id: newId(),
        reps: template.reps,
        weight: template.weight,
      }
      const position = ex.sets.length
      setState((s) => ({
        ...s,
        sessions: s.sessions.map((sess) => {
          if (sess.id !== sessionId) return sess
          return {
            ...sess,
            exercises: sess.exercises.map((exe, ei) =>
              ei === exerciseIdx ? { ...exe, sets: [...exe.sets, newSet] } : exe,
            ),
          }
        }),
      }))

      const { error } = await supabase.from('sets').insert({
        id: newSet.id,
        session_exercise_id: ex.id,
        position,
        reps: newSet.reps,
        weight: newSet.weight,
      })
      if (error) {
        console.error('[store] addSet:', error)
        setError(error.message)
        setState((s) => ({
          ...s,
          sessions: s.sessions.map((sess) => {
            if (sess.id !== sessionId) return sess
            return {
              ...sess,
              exercises: sess.exercises.map((exe, ei) =>
                ei === exerciseIdx
                  ? { ...exe, sets: exe.sets.filter((x) => x.id !== newSet.id) }
                  : exe,
              ),
            }
          }),
        }))
      }
    },
    [state.sessions],
  )

  const finishSession = useCallback(async (sessionId: string) => {
    const endedIso = new Date().toISOString()
    const ended = Date.parse(endedIso)
    setState((s) => ({
      ...s,
      activeSessionId: s.activeSessionId === sessionId ? null : s.activeSessionId,
      sessions: s.sessions.map((sess) =>
        sess.id === sessionId ? { ...sess, endedAt: ended } : sess,
      ),
    }))
    const { error } = await supabase
      .from('sessions')
      .update({ ended_at: endedIso })
      .eq('id', sessionId)
    if (error) {
      console.error('[store] finishSession:', error)
      setError(error.message)
    }
  }, [])

  const cancelActiveSession = useCallback(async () => {
    const aid = state.activeSessionId
    if (!aid) return
    setState((s) => ({
      ...s,
      activeSessionId: null,
      sessions: s.sessions.filter((x) => x.id !== aid),
    }))
    const { error } = await supabase.from('sessions').delete().eq('id', aid)
    if (error) {
      console.error('[store] cancelSession:', error)
      setError(error.message)
    }
  }, [state.activeSessionId])

  // -------------------- Profile (display name) --------------------

  const setDisplayName = useCallback(
    async (name: string) => {
      const n = name.trim() || 'Atleta'
      setState((s) => ({ ...s, profile: { ...s.profile, displayName: n } }))
      await authUpdateProfile({ displayName: n })
    },
    [authUpdateProfile],
  )

  // -------------------- Amigos --------------------

  const searchProfileByUsername = useCallback(async (q: string) => {
    const needle = q.trim().toLowerCase()
    if (!needle) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', needle)
      .maybeSingle()
    if (error || !data) return null
    return {
      id: data.id,
      username: data.username,
      displayName: data.display_name,
      friendCode: data.friend_code,
      avatarColor: data.avatar_color,
    }
  }, [])

  const sendFriendRequest = useCallback(
    async (addresseeId: string) => {
      const uid = requireUser()
      if (addresseeId === uid) {
        return { ok: false, error: 'No puedes enviarte una invitación a ti mismo.' }
      }
      // Si ya existe una fila en cualquier dirección, sugerir
      const { data: existing } = await supabase
        .from('friendships')
        .select('*')
        .or(
          `and(requester_id.eq.${uid},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${uid})`,
        )
        .maybeSingle()
      if (existing) {
        if (existing.status === 'accepted') {
          return { ok: false, error: 'Ya sois aliados.' }
        }
        return { ok: false, error: 'Ya hay una invitación pendiente.' }
      }
      const { data, error } = await supabase
        .from('friendships')
        .insert({ requester_id: uid, addressee_id: addresseeId })
        .select(
          '*, requester:profiles!friendships_requester_id_fkey(*), addressee:profiles!friendships_addressee_id_fkey(*)',
        )
        .single()
      if (error) return { ok: false, error: error.message }
      const row = data as unknown as FriendshipRow & {
        requester: ProfileRow
        addressee: ProfileRow
      }
      setState((s) => ({
        ...s,
        pending: [
          ...s.pending,
          {
            id: row.id,
            direction: 'outgoing',
            other: {
              id: row.addressee.id,
              username: row.addressee.username,
              displayName: row.addressee.display_name,
              friendCode: row.addressee.friend_code,
              avatarColor: row.addressee.avatar_color,
            },
            createdAt: Date.parse(row.created_at) || Date.now(),
          },
        ],
      }))
      return { ok: true }
    },
    [requireUser],
  )

  const acceptFriendRequest = useCallback(async (friendshipId: string) => {
    const { data, error } = await supabase
      .from('friendships')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', friendshipId)
      .select(
        '*, requester:profiles!friendships_requester_id_fkey(*), addressee:profiles!friendships_addressee_id_fkey(*)',
      )
      .single()
    if (error || !data) {
      return { ok: false, error: error?.message ?? 'No se pudo aceptar.' }
    }
    const row = data as unknown as FriendshipRow & {
      requester: ProfileRow
      addressee: ProfileRow
    }
    setState((s) => {
      const other = row.requester.id === s.profile.id ? row.addressee : row.requester
      return {
        ...s,
        pending: s.pending.filter((p) => p.id !== friendshipId),
        friends: [
          ...s.friends,
          {
            id: other.id,
            username: other.username,
            displayName: other.display_name,
            friendCode: other.friend_code,
            avatarColor: other.avatar_color,
          },
        ],
      }
    })
    // Traer stats tras aceptar
    supabase
      .rpc('weekly_stats', { for_user: row.requester.id === state.profile.id ? row.addressee.id : row.requester.id })
      .then(({ data: sdata }) => {
        const stat = sdata?.[0]
        if (!stat) return
        setState((s) => ({
          ...s,
          friends: s.friends.map((f) => {
            const otherId =
              row.requester.id === s.profile.id ? row.addressee.id : row.requester.id
            if (f.id !== otherId) return f
            return {
              ...f,
              stats: {
                weeklyVolumeKg: Number(stat.volume_kg) || 0,
                sessionsLast7Days: Number(stat.sessions_count) || 0,
                updatedAt: Date.now(),
              },
            }
          }),
        }))
      })
    return { ok: true }
  }, [state.profile.id])

  const rejectFriendRequest = useCallback(async (friendshipId: string) => {
    const before = state.pending
    setState((s) => ({
      ...s,
      pending: s.pending.filter((p) => p.id !== friendshipId),
    }))
    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
    if (error) {
      setState((s) => ({ ...s, pending: before }))
      return { ok: false, error: error.message }
    }
    return { ok: true }
  }, [state.pending])

  const removeFriend = useCallback(async (friendshipOrFriendId: string) => {
    // Acepta tanto el id del profile como el id del friendship.
    // Primero intentamos borrar por profile.id: buscar la fila.
    const uid = userId
    if (!uid) return
    const { data: rows } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id')
      .or(
        `and(requester_id.eq.${uid},addressee_id.eq.${friendshipOrFriendId}),and(requester_id.eq.${friendshipOrFriendId},addressee_id.eq.${uid}),id.eq.${friendshipOrFriendId}`,
      )
    const targetId = rows?.[0]?.id ?? friendshipOrFriendId
    const beforeF = state.friends
    const beforeP = state.pending
    setState((s) => ({
      ...s,
      friends: s.friends.filter((f) => f.id !== friendshipOrFriendId),
      pending: s.pending.filter((p) => p.id !== targetId),
    }))
    const { error } = await supabase.from('friendships').delete().eq('id', targetId)
    if (error) {
      setState((s) => ({ ...s, friends: beforeF, pending: beforeP }))
      console.error('[store] removeFriend:', error)
      setError(error.message)
    }
  }, [state.friends, state.pending, userId])

  const refreshFriendStats = useCallback(async () => {
    const ids = state.friends.map((f) => f.id)
    if (ids.length === 0) return
    const results = await Promise.all(
      ids.map((id) =>
        supabase.rpc('weekly_stats', { for_user: id }).then((r) => ({
          id,
          stats: r.data?.[0],
        })),
      ),
    )
    setState((s) => ({
      ...s,
      friends: s.friends.map((f) => {
        const st = results.find((x) => x.id === f.id)?.stats
        if (!st) return f
        return {
          ...f,
          stats: {
            weeklyVolumeKg: Number(st.volume_kg) || 0,
            sessionsLast7Days: Number(st.sessions_count) || 0,
            updatedAt: Date.now(),
          },
        }
      }),
    }))
  }, [state.friends])

  // -------------------- Derived --------------------

  const completed = useMemo(
    () => state.sessions.filter((x) => x.endedAt),
    [state.sessions],
  )

  const myStats: FriendStats = useMemo(
    () => ({
      weeklyVolumeKg: sumVolumeLastDays(completed, 7),
      sessionsLast7Days: countSessionsLastDays(completed, 7),
      updatedAt: Date.now(),
    }),
    [completed],
  )

  const value = useMemo<NovaFitContextValue>(
    () => ({
      hydrated,
      loading,
      error,
      profile: state.profile,
      routines: state.routines,
      sessions: state.sessions,
      friends: state.friends,
      pending: state.pending,
      activeSessionId: state.activeSessionId,
      setDisplayName,
      myStats,
      upsertRoutine,
      deleteRoutine,
      startSessionFromRoutine,
      updateSet,
      addSetToExercise,
      finishSession,
      cancelActiveSession,
      searchProfileByUsername,
      sendFriendRequest,
      acceptFriendRequest,
      rejectFriendRequest,
      removeFriend,
      refreshFriendStats,
    }),
    [
      hydrated,
      loading,
      error,
      state.profile,
      state.routines,
      state.sessions,
      state.friends,
      state.pending,
      state.activeSessionId,
      setDisplayName,
      myStats,
      upsertRoutine,
      deleteRoutine,
      startSessionFromRoutine,
      updateSet,
      addSetToExercise,
      finishSession,
      cancelActiveSession,
      searchProfileByUsername,
      sendFriendRequest,
      acceptFriendRequest,
      rejectFriendRequest,
      removeFriend,
      refreshFriendStats,
    ],
  )

  return (
    <NovaFitContext.Provider value={value}>{children}</NovaFitContext.Provider>
  )
}

export function useNovaFit(): NovaFitContextValue {
  const ctx = useContext(NovaFitContext)
  if (!ctx) throw new Error('useNovaFit must be used within NovaFitProvider')
  return ctx
}
