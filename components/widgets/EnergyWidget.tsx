'use client'

import { useEnergy } from '@/lib/hooks/useEnergy'
import { cn } from '@/lib/utils'
import { WidgetSkeleton, WidgetError } from '@/components/ui/widget-state'

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
    return <WidgetSkeleton lines={3} />
  }

  if (error || !data?.data) {
    return <WidgetError label={data?.error ?? 'Energidata utilgængelig'} />
  }

  const { production, windOffshore, windOnshore, exchange, co2, renewablesPct } = data.data

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
            <span className="ml-auto tabular-nums text-sm font-medium">{s.value} MW</span>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground pl-3.5">
        Havvind {windOffshore} MW · Landvind {windOnshore} MW
      </p>

      <div className="border-t border-border pt-2 space-y-1">
        <p className="text-xs text-muted-foreground">Udveksling</p>
        {exchange.flows.map((f) => (
          <div key={f.label} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{f.label}</span>
            <span className="tabular-nums font-medium">
              {f.mw >= 0 ? '↓' : '↑'} {Math.abs(f.mw)} MW
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between text-sm pt-0.5">
          <span className="text-muted-foreground">Netto</span>
          <span className="tabular-nums font-semibold">
            {exchange.sum >= 0 ? '+' : ''}
            {exchange.sum} MW
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
        <span className="text-muted-foreground">CO₂ intensitet</span>
        <span className="tabular-nums font-medium">{co2} g/kWh</span>
      </div>

      <p className="text-[10px] text-muted-foreground/60">
        Opdateret {new Date(data.data.updatedAt).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  )
}
