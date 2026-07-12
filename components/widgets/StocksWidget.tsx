'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useStocks } from '@/lib/hooks/useStocks'
import { WidgetSkeleton, WidgetError } from '@/components/ui/widget-state'

export function StocksWidget() {
  const { data, isLoading, error } = useStocks()
  const stocks = data?.data?.stocks ?? []

  if (isLoading) {
    return (
      <div className="px-3 py-2">
        <WidgetSkeleton lines={4} />
      </div>
    )
  }

  if (error || !data?.data) {
    return (
      <div className="px-3 py-3">
        <WidgetError label="Aktier utilgængelige" />
      </div>
    )
  }

  if (!stocks.length) {
    return (
      <div className="px-3 py-3 text-xs text-muted-foreground">Ingen data tilgængelig</div>
    )
  }

  return (
    <div className="divide-y divide-border/40">
      {stocks.map((s) => {
        const up = s.changePercent > 0
        const down = s.changePercent < 0
        const pct = s.changePercent.toFixed(2)
        const sign = up ? '+' : ''

        return (
          <div key={s.symbol} className="flex items-center justify-between px-3 py-1.5 gap-2">
            <div className="min-w-0">
              <div className="text-xs font-medium text-foreground truncate">{s.name}</div>
              <div className="text-[10px] text-muted-foreground">{s.symbol}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-xs font-mono font-semibold text-foreground">
                {s.price.toLocaleString('da-DK', { maximumFractionDigits: 2 })}
              </div>
              <div
                className={`flex items-center justify-end gap-0.5 text-[10px] font-medium ${
                  up ? 'text-green-400' : down ? 'text-red-400' : 'text-muted-foreground'
                }`}
              >
                {up ? <TrendingUp size={9} /> : down ? <TrendingDown size={9} /> : <Minus size={9} />}
                {sign}{pct}%
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
