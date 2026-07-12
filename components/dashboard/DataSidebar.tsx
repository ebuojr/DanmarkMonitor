'use client'

import { Zap, CloudSun, TrendingUp, Plane } from 'lucide-react'
import { EnergyWidget } from '@/components/widgets/EnergyWidget'
import { WeatherWidget } from '@/components/widgets/WeatherWidget'
import { PriceWidget } from '@/components/widgets/PriceWidget'
import { FlightBoard } from '@/components/widgets/FlightBoard'
import { SectionHeader } from '@/components/ui/section-header'

export function DataSidebar() {
  return (
    <aside className="flex flex-col h-full overflow-hidden border-l border-border shrink-0 w-full lg:w-80">
      <div className="shrink-0 border-b border-border">
        <SectionHeader icon={Zap} label="Energi" />
        <div className="p-3">
          <EnergyWidget />
        </div>
      </div>

      <div className="shrink-0 border-b border-border">
        <SectionHeader icon={TrendingUp} label="Spotpris" />
        <div className="p-3">
          <PriceWidget />
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        <SectionHeader icon={CloudSun} label="Vejr" />
        <div className="flex-1 overflow-y-auto p-3 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          <WeatherWidget />
        </div>
      </div>

      <div className="shrink-0 border-t border-border">
        <SectionHeader icon={Plane} label="København Lufthavn" />
        <div className="p-3">
          <FlightBoard />
        </div>
      </div>
    </aside>
  )
}
