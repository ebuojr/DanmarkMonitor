'use client'

import { EnergyWidget } from '@/components/widgets/EnergyWidget'
import { WeatherWidget } from '@/components/widgets/WeatherWidget'

export function DataSidebar() {
  return (
    <aside className="flex flex-col h-full overflow-hidden border-l border-border w-64 shrink-0">
      {/* Energy section */}
      <div className="shrink-0 border-b border-border">
        <div className="px-3 py-2 border-b border-border/50">
          <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            ⚡ Energi
          </span>
        </div>
        <div className="p-3">
          <EnergyWidget />
        </div>
      </div>

      {/* Weather section */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="px-3 py-2 border-b border-border/50">
          <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            🌤 Vejr
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <WeatherWidget />
        </div>
      </div>
    </aside>
  )
}
