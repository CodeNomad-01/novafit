import type { RoutineExercise } from './types'

/** Create or update a routine (id optional for create) */
export type RoutineInput = {
  id?: string
  name: string
  exercises: RoutineExercise[]
  createdAt?: number
}
