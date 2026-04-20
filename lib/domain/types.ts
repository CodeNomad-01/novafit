export interface Profile {
  id: string
  displayName: string
  friendCode: string
}

export interface RoutineExercise {
  id: string
  name: string
  plannedSets: number
  defaultReps: number
  defaultWeight: number
}

export interface Routine {
  id: string
  name: string
  createdAt: number
  exercises: RoutineExercise[]
}

export interface SetLog {
  id: string
  reps: number
  weight: number
}

export interface SessionExerciseLog {
  id: string
  exerciseTemplateId: string | null
  name: string
  sets: SetLog[]
}

export interface WorkoutSession {
  id: string
  routineId: string | null
  routineName: string
  startedAt: number
  endedAt?: number
  exercises: SessionExerciseLog[]
}

export interface FriendStats {
  weeklyVolumeKg: number
  sessionsLast7Days: number
  updatedAt: number
}

export interface Friend {
  /** UUID del profile del amigo en Supabase */
  id: string
  username: string
  displayName: string
  friendCode: string
  avatarColor: string
  stats?: FriendStats
}

export interface PendingFriendship {
  /** id de la fila de friendships */
  id: string
  /** 'incoming' = te la enviaron, 'outgoing' = la enviaste tú */
  direction: 'incoming' | 'outgoing'
  other: {
    id: string
    username: string
    displayName: string
    friendCode: string
    avatarColor: string
  }
  createdAt: number
}

export interface NovaFitState {
  version: 1
  profile: Profile
  routines: Routine[]
  sessions: WorkoutSession[]
  friends: Friend[]
  pending: PendingFriendship[]
  activeSessionId: string | null
}
