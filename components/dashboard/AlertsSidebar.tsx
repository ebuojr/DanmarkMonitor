'use client'

import { AlertWidget } from '@/components/widgets/AlertWidget'
import { NewsWidget } from '@/components/widgets/NewsWidget'
import { useAlerts } from '@/lib/hooks/useAlerts'

export function AlertsSidebar() {
  const { data } = useAlerts()
  const alertCount = data?.data?.alerts.length ?? 0

  return (
    <aside className="flex flex-col h-full overflow-hidden border-r border-border w-64 shrink-0">
      {/* Alerts section */}
      <div className="shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
          <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Advarsler
          </span>
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

      {/* News section */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="shrink-0 px-3 py-2 border-b border-border/50">
          <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Nyheder
          </span>
        </div>
        <div className="flex-1 overflow-y-auto py-1 scrollbar-thin">
          <NewsWidget />
        </div>
      </div>
    </aside>
  )
}
