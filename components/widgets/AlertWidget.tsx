'use client'

import { useAlerts } from '@/lib/hooks/useAlerts'
import { cn } from '@/lib/utils'
import type { AlertSeverity } from '@/lib/types/alerts'

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  severe: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
}

const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  info: 'INFO',
  warning: 'ADVARSEL',
  severe: 'ALVORLIG',
  critical: 'KRITISK',
}

export function AlertWidget() {
  const { data, isLoading } = useAlerts()

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-8 bg-muted rounded" />
      </div>
    )
  }

  const alerts = data?.data?.alerts ?? []

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-muted/30 px-2 py-1.5">
        <span className="size-2 rounded-full bg-green-500" />
        <span className="text-xs text-muted-foreground">Ingen aktive advarsler</span>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {alerts.slice(0, 5).map((alert) => (
        <div
          key={alert.id}
          className={cn(
            'rounded-md border px-2 py-1.5 text-xs space-y-0.5',
            SEVERITY_STYLES[alert.severity]
          )}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="font-bold tracking-wider text-[10px]">
              {SEVERITY_LABELS[alert.severity]}
            </span>
            <span className="text-[10px] opacity-70">{alert.area}</span>
          </div>
          <p className="font-medium leading-tight">{alert.title}</p>
        </div>
      ))}
    </div>
  )
}
