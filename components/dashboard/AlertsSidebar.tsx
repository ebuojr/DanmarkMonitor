'use client'

import { AlertTriangle, Newspaper, BarChart2 } from 'lucide-react'
import { AlertWidget } from '@/components/widgets/AlertWidget'
import { NewsWidget } from '@/components/widgets/NewsWidget'
import { StocksWidget } from '@/components/widgets/StocksWidget'
import { useAlerts } from '@/lib/hooks/useAlerts'

export function AlertsSidebar() {
  const { data } = useAlerts()
  const alertCount = data?.data?.alerts.length ?? 0

  return (
    <aside className="flex flex-col h-full overflow-hidden border-r border-border shrink-0 w-80">
      {/* Alerts */}
      <div className="shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <AlertTriangle size={13} className="text-muted-foreground" />
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Advarsler
            </span>
          </div>
          {alertCount > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {alertCount}
            </span>
          )}
        </div>
        <div className="p-2">
          <AlertWidget />
        </div>
      </div>

      {/* Stocks */}
      <div className="shrink-0 border-b border-border">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
          <BarChart2 size={13} className="text-muted-foreground" />
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Danske Aktier
          </span>
        </div>
        <StocksWidget />
      </div>

      {/* News */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border/50">
          <Newspaper size={13} className="text-muted-foreground" />
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Nyheder
          </span>
        </div>
        <div className="flex-1 overflow-y-auto py-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          <NewsWidget />
        </div>
      </div>
    </aside>
  )
}
