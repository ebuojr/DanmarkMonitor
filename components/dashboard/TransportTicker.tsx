'use client'

import { useTransport } from '@/lib/hooks/useTransport'
import { cn } from '@/lib/utils'
import type { DisruptionType } from '@/lib/types/transport'

const TYPE_STYLES: Record<DisruptionType, string> = {
  DELAY: 'text-yellow-400',
  CANCELLATION: 'text-destructive',
  DISRUPTION: 'text-orange-400',
  INFO: 'text-blue-400',
}

const TYPE_ICONS: Record<DisruptionType, string> = {
  DELAY: '⏱',
  CANCELLATION: '✕',
  DISRUPTION: '⚠',
  INFO: 'ℹ',
}

export function TransportTicker() {
  const { data, isLoading } = useTransport()

  const disruptions = data?.data?.disruptions ?? []

  return (
    <div className="flex items-center gap-0 h-full overflow-hidden">
      <div className="shrink-0 flex items-center gap-2 border-r border-border px-3 h-full">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Transport
        </span>
        {!isLoading && disruptions.length > 0 && (
          <span className="flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {disruptions.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-hidden px-3">
        {isLoading ? (
          <div className="h-3 bg-muted rounded animate-pulse w-48" />
        ) : disruptions.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-green-500" />
            {data?.error ? (
              <span className="text-muted-foreground/60">{data.error}</span>
            ) : (
              <span>Ingen aktive forstyrrelser</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-4 text-xs whitespace-nowrap overflow-x-auto scrollbar-none">
            {disruptions.map((d) => (
              <span key={d.id} className="flex items-center gap-1.5 shrink-0">
                <span className={cn('font-bold', TYPE_STYLES[d.type])}>
                  {TYPE_ICONS[d.type]} {d.line}
                </span>
                <span className="text-muted-foreground">{d.message}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
