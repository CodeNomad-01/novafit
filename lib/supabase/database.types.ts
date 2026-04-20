// Tipos mínimos de la base de datos. Si instalas la CLI de Supabase
// (`npx supabase gen types typescript`) puedes reemplazar este archivo con
// los tipos generados automáticamente.

export type ProfileRow = {
  id: string
  username: string
  display_name: string
  friend_code: string
  avatar_color: string
  created_at: string
}

export type RoutineRow = {
  id: string
  user_id: string
  name: string
  created_at: string
}

export type RoutineExerciseRow = {
  id: string
  routine_id: string
  position: number
  name: string
  planned_sets: number
  default_reps: number
  default_weight: number
}

export type SessionRow = {
  id: string
  user_id: string
  routine_id: string | null
  routine_name: string
  started_at: string
  ended_at: string | null
}

export type SessionExerciseRow = {
  id: string
  session_id: string
  position: number
  exercise_template_id: string | null
  name: string
}

export type SetRow = {
  id: string
  session_exercise_id: string
  position: number
  reps: number
  weight: number
  completed: boolean
}

export type FriendshipRow = {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted'
  created_at: string
  responded_at: string | null
}

type Table<Row> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow>
      routines: Table<RoutineRow>
      routine_exercises: Table<RoutineExerciseRow>
      sessions: Table<SessionRow>
      session_exercises: Table<SessionExerciseRow>
      sets: Table<SetRow>
      friendships: Table<FriendshipRow>
    }
    Views: Record<string, never>
    Functions: {
      weekly_stats: {
        Args: { for_user: string }
        Returns: { volume_kg: number; sessions_count: number }[]
      }
      daily_volume: {
        Args: { for_user: string; days?: number }
        Returns: { day: string; volume: number }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
