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

function emptyExercise(): RoutineExercise {
  return {
    id: newId(),
    name: '',
    plannedSets: 3,
    defaultReps: 10,
    defaultWeight: 0,
  }
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
    setExercises((prev) => [...prev, emptyExercise()])
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
        name: e.name.trim(),
        plannedSets: Math.max(1, Math.floor(Number(e.plannedSets)) || 1),
        defaultReps: Math.max(0, Number(e.defaultReps) || 0),
        defaultWeight: Math.max(0, Number(e.defaultWeight) || 0),
      }))
      .filter((e) => e.name.length > 0)
    onSubmit({
      id: initial?.id,
      createdAt: initial?.createdAt,
      name: name.trim(),
      exercises: cleaned,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
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
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Empuje · Pierna · Full body"
          required
          autoComplete="off"
        />
        <p className="mt-2 text-xs text-[var(--sl-text-dim)]">
          Este nombre aparecerá en el HUD al iniciar combate.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <header className="sl-section-head min-w-0">
            <p className="sl-label sl-label-violet">[ OBJETIVOS ]</p>
            <h2 className="sl-title text-lg font-bold tracking-tight text-[var(--sl-text)]">
              Ejercicios de la misión
            </h2>
          </header>
          <button
            type="button"
            onClick={addExercise}
            className="sl-btn sl-btn-violet sl-btn-sm sl-focus w-full shrink-0 sm:w-auto"
          >
            <FiPlus className="h-4 w-4" aria-hidden />
            Añadir objetivo
          </button>
        </div>
        <div className="sl-divider sl-divider-violet" />

        {exercises.map((ex, i) => (
          <div key={ex.id} className="sl-panel sl-pad-sm sl-animate-in">
            <div className="mb-4 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="sl-label sl-label-tight text-[var(--sl-violet)]">
                  [ OBJETIVO {String(i + 1).padStart(2, '0')} ]
                </p>
                <input
                  className="sl-input mt-2 font-semibold"
                  value={ex.name}
                  onChange={(e) => updateExercise(i, { name: e.target.value })}
                  placeholder="Nombre del ejercicio"
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className="sl-field-label">Series</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  className="sl-input sl-stat py-2.5 tabular-nums"
                  value={ex.plannedSets}
                  onChange={(e) =>
                    updateExercise(i, { plannedSets: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className="sl-field-label">Reps base</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="sl-input sl-stat py-2.5 tabular-nums"
                  value={ex.defaultReps}
                  onChange={(e) =>
                    updateExercise(i, { defaultReps: Number(e.target.value) })
                  }
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="sl-field-label">Peso base (kg)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.5"
                  className="sl-input sl-stat py-2.5 tabular-nums"
                  value={ex.defaultWeight}
                  onChange={(e) =>
                    updateExercise(i, { defaultWeight: Number(e.target.value) })
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
