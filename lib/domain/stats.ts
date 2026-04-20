import { formatISO, subDays } from 'date-fns'
import type { WorkoutSession } from '@/lib/domain/types'

const MS_DAY = 86_400_000

export function formatDurationMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

export function sessionVolumeKg(session: WorkoutSession): number {
  let vol = 0
  for (const ex of session.exercises) {
    for (const st of ex.sets) {
      vol += Math.max(0, st.reps) * Math.max(0, st.weight)
    }
  }
  return Math.round(vol * 10) / 10
}

export function sumVolumeLastDays(
  sessions: WorkoutSession[],
  days: number,
  now = Date.now(),
): number {
  const cutoff = now - days * MS_DAY
  let sum = 0
  for (const s of sessions) {
    const end = s.endedAt ?? s.startedAt
    if (end >= cutoff && (s.endedAt || s.startedAt)) {
      sum += sessionVolumeKg(s)
    }
  }
  return Math.round(sum * 10) / 10
}

export function countSessionsLastDays(
  sessions: WorkoutSession[],
  days: number,
  now = Date.now(),
): number {
  const cutoff = now - days * MS_DAY
  let n = 0
  for (const s of sessions) {
    const end = s.endedAt ?? s.startedAt
    if (s.endedAt && end >= cutoff) n += 1
  }
  return n
}

/** Last `days` days volume per calendar day for charts (labels ISO date) */
export function dailyVolumeSeries(
  sessions: WorkoutSession[],
  days: number,
  now = Date.now(),
): { label: string; volume: number }[] {
  const out: { label: string; volume: number }[] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = subDays(now, i)
    const label = formatISO(d, { representation: 'date' })
    out.push({ label, volume: 0 })
  }
  const map = new Map(out.map((o) => [o.label, o]))
  for (const s of sessions) {
    if (!s.endedAt) continue
    const day = formatISO(s.endedAt, { representation: 'date' })
    const bucket = map.get(day)
    if (bucket) bucket.volume += sessionVolumeKg(s)
  }
  for (const o of out) {
    o.volume = Math.round(o.volume * 10) / 10
  }
  return out
}
