'use client'

import { usePrices } from '@/lib/hooks/usePrices'

export function PriceWidget() {
  const { data, isLoading } = usePrices()

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    )
  }

  const priceData = data?.data

  if (!priceData?.current) {
    return (
      <p className="text-xs text-muted-foreground">
        {data?.error ? 'Prisdata utilgængelig' : 'Ingen aktuelle prisdata'}
      </p>
    )
  }

  const { dk1, dk2, hourDK } = priceData.current
  const hourLabel = hourDK ? new Date(hourDK).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }) : ''

  return (
    <div className="space-y-2">
      {priceData.isStale && (
        <p className="text-[10px] text-amber-500/80">Seneste kendte data</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-muted/50 px-2 py-1.5">
          <div className="text-xs text-muted-foreground mb-0.5">DK1 (Vest)</div>
          <div className="text-sm font-bold tabular-nums">
            {dk1 != null ? `${dk1} øre` : '–'}
          </div>
        </div>
        <div className="rounded-md bg-muted/50 px-2 py-1.5">
          <div className="text-xs text-muted-foreground mb-0.5">DK2 (Øst)</div>
          <div className="text-sm font-bold tabular-nums">
            {dk2 != null ? `${dk2} øre` : '–'}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>per kWh (spotpris)</span>
        {hourLabel && <span>{hourLabel}</span>}
      </div>
    </div>
  )
}
