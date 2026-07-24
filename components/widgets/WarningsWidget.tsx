'use client'

import { useState } from 'react'
import { useWeather } from '@/lib/hooks/useWeather'
import type { WeatherWarning, WarningSeverity } from '@/lib/types/weather'
import { WidgetSkeleton, WidgetError } from '@/components/ui/widget-state'

// DMI severity → dot color. Yellow / orange / red match DMI's own scale;
// minor is a calm slate.
const SEVERITY_COLOR: Record<WarningSeverity, string> = {
  minor: '#94a3b8',
  moderate: '#facc15',
  severe: '#fb923c',
  extreme: '#ef4444',
}

function WarningRow({ w }: { w: WeatherWarning }) {
  const [open, setOpen] = useState(false)
  const period = [w.onset, w.expires].filter(Boolean).join(' → ')

  return (
    <button
      onClick={() => setOpen((o) => !o)}
      className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/50 transition-colors"
    >
      <span className="mt-1 size-2 shrink-0 rounded-full border border-black/20" style={{ backgroundColor: SEVERITY_COLOR[w.severity] }} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground">{w.event}</p>
        {w.area && <p className="text-[11px] text-muted-foreground">{w.area}</p>}
        {period && <p className="text-[10px] text-muted-foreground/70">{period}</p>}
        {open && w.description && (
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{w.description}</p>
        )}
      </div>
    </button>
  )
}

export function WarningsWidget() {
  const { data, isLoading, error } = useWeather()

  if (isLoading) {
    return (
      <div className="px-2">
        <WidgetSkeleton lines={2} />
      </div>
    )
  }

  if (error || !data?.data) {
    return (
      <div className="px-2">
        <WidgetError label="Varsler utilgængelige" />
      </div>
    )
  }

  const warnings = data.data.warnings
  if (!warnings.length) {
    return (
      <p className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
        <span className="size-2 rounded-full bg-green-500" />
        Ingen aktuelle varsler
      </p>
    )
  }

  return (
    <div className="space-y-0.5">
      {warnings.map((w) => (
        <WarningRow key={w.id} w={w} />
      ))}
    </div>
  )
}
