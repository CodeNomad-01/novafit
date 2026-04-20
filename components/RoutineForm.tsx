'use client'

import { useMemo, useState } from 'react'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
import type { RoutineInput } from '@/lib/store/routine-input'
import type { Routine, RoutineExercise } from '@/lib/domain/types'
import { newId } from '@/lib/domain/id'

type Props = {
  initial?: Routine
  onSubmit: (routine: RoutineInput) => void
  submitLabel: string
}

const MAX_NAME = 80
const MAX_EXERCISES = 30
const MAX_PLANNED_SETS = 20
const MAX_REPS = 200
const MAX_WEIGHT = 1000

function emptyExercise(): RoutineExercise {
  return {
    id: newId(),
    name: '',
    plannedSets: 3,
    defaultReps: 10,
    defaultWeight: 0,
  }
}

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = Math.floor(Number(v))
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function clampNumber(v: unknown, min: number, max: number, fallback: number) {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

export function RoutineForm({ initial, onSubmit, submitLabel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [exercises, setExercises] = useState<RoutineExercise[]>(() =>
    initial?.exercises?.length ? initial.exercises : [emptyExercise()],
  )

  const canSubmit = useMemo(
    () =>
      name.trim().length > 0 &&
      exercises.some((e) => e.name.trim().length > 0),
    [name, exercises],
  )

  function updateExercise(i: number, patch: Partial<RoutineExercise>) {
    setExercises((prev) =>
      prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)),
    )
  }

  function addExercise() {
    setExercises((prev) =>
      prev.length >= MAX_EXERCISES ? prev : [...prev, emptyExercise()],
    )
  }

  function removeExercise(i: number) {
    setExercises((prev) => prev.filter((_, idx) => idx !== i))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    const cleaned = exercises
      .map((e) => ({
        ...e,
        name: e.name.trim().slice(0, MAX_NAME),
        plannedSets: clampInt(e.plannedSets, 1, MAX_PLANNED_SETS, 1),
        defaultReps: clampInt(e.defaultReps, 0, MAX_REPS, 0),
        defaultWeight: clampNumber(e.defaultWeight, 0, MAX_WEIGHT, 0),
      }))
      .filter((e) => e.name.length > 0)
      .slice(0, MAX_EXERCISES)
    onSubmit({
      id: initial?.id,
      createdAt: initial?.createdAt,
      name: name.trim().slice(0, MAX_NAME),
      exercises: cleaned,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="sl-panel sl-pad-md">
        <header className="sl-section-head mb-4">
          <p className="sl-label">[ DATOS DE LA MISIÓN ]</p>
        </header>
        <label htmlFor="routine-name" className="sl-field-label">
          Nombre de la misión
        </label>
        <input
          id="routine-name"
          className="sl-input"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, MAX_NAME))}
          placeholder="Ej. Empuje · Pierna"
          required
          maxLength={MAX_NAME}
          autoComplete="off"
        />
        <p className="mt-2 text-xs text-[var(--sl-text-dim)]">
          Máx {MAX_NAME} caracteres · aparecerá en el HUD.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col items-stretch gap-3">
          <header className="sl-section-head min-w-0">
            <p className="sl-label sl-label-violet">[ OBJETIVOS ]</p>
            <h2 className="sl-title text-lg font-bold tracking-tight text-[var(--sl-text)]">
              Ejercicios de la misión
            </h2>
            <p className="mt-1 text-xs text-[var(--sl-text-dim)]">
              {exercises.length} / {MAX_EXERCISES} objetivos
            </p>
          </header>
          <button
            type="button"
            onClick={addExercise}
            disabled={exercises.length >= MAX_EXERCISES}
            className="sl-btn sl-btn-violet sl-btn-sm sl-focus w-full"
          >
            <FiPlus className="h-4 w-4" aria-hidden />
            {exercises.length >= MAX_EXERCISES
              ? 'Máximo alcanzado'
              : 'Añadir objetivo'}
          </button>
        </div>
        <div className="sl-divider sl-divider-violet" />

        {exercises.map((ex, i) => (
          <div key={ex.id} className="sl-panel sl-pad-sm sl-animate-in">
            <div className="mb-4 flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="sl-label sl-label-tight text-[var(--sl-violet)]">
                  [ OBJETIVO {String(i + 1).padStart(2, '0')} ]
                </p>
                <input
                  className="sl-input mt-2 font-semibold"
                  value={ex.name}
                  onChange={(e) =>
                    updateExercise(i, { name: e.target.value.slice(0, MAX_NAME) })
                  }
                  placeholder="Nombre del ejercicio"
                  maxLength={MAX_NAME}
                  aria-label={`Nombre ejercicio ${i + 1}`}
                />
              </div>
              {exercises.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeExercise(i)}
                  className="sl-focus mt-7 shrink-0 p-2 text-[var(--sl-danger)] transition hover:bg-[rgba(255,94,123,0.12)]"
                  aria-label="Quitar objetivo"
                >
                  <FiTrash2 className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="sl-field-label">Series</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_PLANNED_SETS}
                  className="sl-input sl-stat text-center font-bold tabular-nums"
                  value={ex.plannedSets}
                  onChange={(e) =>
                    updateExercise(i, {
                      plannedSets: clampInt(
                        e.target.value,
                        1,
                        MAX_PLANNED_SETS,
                        1,
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
                  max={MAX_REPS}
                  className="sl-input sl-stat text-center font-bold tabular-nums"
                  value={ex.defaultReps}
                  onChange={(e) =>
                    updateExercise(i, {
                      defaultReps: clampInt(e.target.value, 0, MAX_REPS, 0),
                    })
                  }
                />
              </div>
              <div>
                <label className="sl-field-label">Peso</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={MAX_WEIGHT}
                  step="0.5"
                  className="sl-input sl-stat text-center font-bold tabular-nums"
                  value={ex.defaultWeight}
                  onChange={(e) =>
                    updateExercise(i, {
                      defaultWeight: clampNumber(
                        e.target.value,
                        0,
                        MAX_WEIGHT,
                        0,
                      ),
                    })
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </section>

      <button
        type="submit"
        disabled={!canSubmit}
        className="sl-btn sl-btn-primary sl-focus w-full py-4 text-sm"
      >
        {submitLabel}
      </button>
    </form>
  )
}
