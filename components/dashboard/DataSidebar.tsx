'use client'

import { Zap, CloudSun, TrendingUp, Video } from 'lucide-react'
import { EnergyWidget } from '@/components/widgets/EnergyWidget'
import { WeatherWidget } from '@/components/widgets/WeatherWidget'
import { PriceWidget } from '@/components/widgets/PriceWidget'
import { StorebaeltCamera } from '@/components/widgets/StorebaeltCamera'

function SectionHeader({ icon: Icon, label }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
      <Icon size={13} className="text-muted-foreground shrink-0" />
      <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  )
}

export function DataSidebar() {
  return (
    <aside className="flex flex-col h-full overflow-hidden border-l border-border shrink-0 w-80">
      <div className="shrink-0 border-b border-border">
        <SectionHeader icon={Video} label="Storebælt Live" />
        <StorebaeltCamera />
      </div>

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
    </aside>
  )
}
