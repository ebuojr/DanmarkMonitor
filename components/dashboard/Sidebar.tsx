'use client'

import { TrainFront, TriangleAlert, Plane, Zap, TrendingUp, BarChart2, Newspaper, CloudSun } from 'lucide-react'
import { DisruptionsWidget } from '@/components/widgets/DisruptionsWidget'
import { WarningsWidget } from '@/components/widgets/WarningsWidget'
import { FlightBoard } from '@/components/widgets/FlightBoard'
import { EnergyWidget } from '@/components/widgets/EnergyWidget'
import { PriceWidget } from '@/components/widgets/PriceWidget'
import { StocksWidget } from '@/components/widgets/StocksWidget'
import { NewsWidget } from '@/components/widgets/NewsWidget'
import { WeatherWidget } from '@/components/widgets/WeatherWidget'
import { SectionHeader } from '@/components/ui/section-header'

// Ordered by live operational usefulness: what's disrupted / dangerous
// right now first, then transport boards, energy, weather, and finally the
// slower-moving ambient feeds (news, stocks).
export function Sidebar() {
  return (
    <aside className="flex flex-col h-full overflow-y-auto overscroll-contain border-l border-border shrink-0 w-full lg:w-96">
      {/* Traffic disruptions */}
      <div className="shrink-0 border-b border-border">
        <SectionHeader icon={TrainFront} label="Trafikmeldinger" />
        <div className="px-1 py-1">
          <DisruptionsWidget />
        </div>
      </div>

      {/* Weather warnings */}
      <div className="shrink-0 border-b border-border">
        <SectionHeader icon={TriangleAlert} label="Varsler" />
        <div className="px-1 py-1">
          <WarningsWidget />
        </div>
      </div>

      {/* Airports */}
      <div className="shrink-0 border-b border-border">
        <SectionHeader icon={Plane} label="Lufthavne" />
        <div className="p-3">
          <FlightBoard />
        </div>
      </div>

      {/* Energy */}
      <div className="shrink-0 border-b border-border">
        <SectionHeader icon={Zap} label="Energi" />
        <div className="p-3">
          <EnergyWidget />
        </div>
      </div>

      {/* Spot price */}
      <div className="shrink-0 border-b border-border">
        <SectionHeader icon={TrendingUp} label="Spotpris" />
        <div className="p-3">
          <PriceWidget />
        </div>
      </div>

      {/* Weather */}
      <div className="shrink-0 border-b border-border">
        <SectionHeader icon={CloudSun} label="Vejr" />
        <div className="p-3">
          <WeatherWidget />
        </div>
      </div>

      {/* News */}
      <div className="shrink-0 border-b border-border">
        <SectionHeader icon={Newspaper} label="Nyheder" />
        {/* px-1 + the rows' own px-2 lines news text up with the p-3 rhythm
            of the other sections while keeping the rows' hover inset. */}
        <div className="px-1 py-1">
          <NewsWidget />
        </div>
      </div>

      {/* Stocks */}
      <div className="shrink-0 border-b border-border">
        <SectionHeader icon={BarChart2} label="Danske Aktier" />
        <StocksWidget />
      </div>
    </aside>
  )
}
