export type HunterRank = {
  tier: 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS'
  label: string
  color: string
  /** Progreso 0..1 dentro de su rango */
  progress: number
  /** Volumen acumulado para llegar a la siguiente tier */
  remainingToNext: number | null
  /** Volumen acumulado total usado en el cálculo */
  totalVolume: number
}

const TIERS: Array<{
  tier: HunterRank['tier']
  label: string
  color: string
  threshold: number
}> = [
  { tier: 'E', label: 'Cazador · Rango E', color: '#9ca3af', threshold: 0 },
  { tier: 'D', label: 'Cazador · Rango D', color: '#34d399', threshold: 2500 },
  { tier: 'C', label: 'Cazador · Rango C', color: '#22d3ee', threshold: 8000 },
  { tier: 'B', label: 'Cazador · Rango B', color: '#60a5fa', threshold: 18000 },
  { tier: 'A', label: 'Cazador · Rango A', color: '#a78bfa', threshold: 35000 },
  { tier: 'S', label: 'Cazador · Rango S', color: '#f472b6', threshold: 60000 },
  { tier: 'SS', label: 'Cazador · Nacional', color: '#ffd76a', threshold: 100000 },
]

export function computeRank(totalVolume: number): HunterRank {
  let current = TIERS[0]
  let next: typeof TIERS[number] | null = null
  for (let i = 0; i < TIERS.length; i += 1) {
    if (totalVolume >= TIERS[i].threshold) {
      current = TIERS[i]
      next = TIERS[i + 1] ?? null
    }
  }
  let progress = 1
  let remainingToNext: number | null = null
  if (next) {
    const span = next.threshold - current.threshold
    const done = totalVolume - current.threshold
    progress = Math.max(0, Math.min(1, done / span))
    remainingToNext = Math.max(0, next.threshold - totalVolume)
  }
  return {
    tier: current.tier,
    label: current.label,
    color: current.color,
    progress,
    remainingToNext,
    totalVolume,
  }
}
