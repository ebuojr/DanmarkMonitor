'use client'

import { useEnergy } from '@/lib/hooks/useEnergy'
import { cn } from '@/lib/utils'

const SOURCES = [
  { key: 'wind' as const, label: 'Vind', color: 'bg-sky-400' },
  { key: 'solar' as const, label: 'Sol', color: 'bg-yellow-400' },
  { key: 'bio' as const, label: 'Bio', color: 'bg-green-500' },
  { key: 'thermal' as const, label: 'Termisk', color: 'bg-orange-500' },
  { key: 'hydro' as const, label: 'Vand', color: 'bg-blue-500' },
]

export function EnergyWidget() {
  const { data, isLoading, error } = useEnergy()

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-8 bg-muted rounded mt-3" />
      </div>
    )
  }

  if (error || !data?.data) {
    return (
      <p className="text-xs text-muted-foreground">
        {data?.error ?? 'Energidata utilgængelig'}
      </p>
    )
  }

  const { production, co2, renewablesPct } = data.data

  const barSegments = SOURCES.map((s) => ({
    ...s,
    value: production[s.key],
    pct: production.total > 0 ? (production[s.key] / production.total) * 100 : 0,
  }))

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold tabular-nums">{renewablesPct}%</span>
        <span className="text-xs text-muted-foreground">vedvarende</span>
      </div>

      {/* stacked bar */}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted gap-px">
        {barSegments.map((s) =>
          s.pct > 0 ? (
            <div
              key={s.key}
              className={cn('h-full transition-all', s.color)}
              style={{ width: `${s.pct}%` }}
              title={`${s.label}: ${s.value} MW`}
            />
          ) : null
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {barSegments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs">
            <span className={cn('size-2 rounded-full shrink-0', s.color)} />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="ml-auto tabular-nums">{s.value} MW</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
        <span className="text-muted-foreground">CO₂ intensitet</span>
        <span className="tabular-nums font-medium">{co2} g/kWh</span>
      </div>

      <p className="text-[10px] text-muted-foreground/60">
        Opdateret {new Date(data.data.updatedAt).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  )
}
