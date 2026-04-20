import type { RoutineExercise } from '@/lib/domain/types'

/** Create or update a routine (id optional for create) */
export type RoutineInput = {
  id?: string
  name: string
  exercises: RoutineExercise[]
  createdAt?: number
}
