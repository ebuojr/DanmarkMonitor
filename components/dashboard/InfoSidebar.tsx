'use client'

import { Newspaper, BarChart2 } from 'lucide-react'
import { NewsWidget } from '@/components/widgets/NewsWidget'
import { StocksWidget } from '@/components/widgets/StocksWidget'
import { SectionHeader } from '@/components/ui/section-header'

export function InfoSidebar() {
  return (
    <aside className="flex flex-col h-full overflow-hidden border-r border-border shrink-0 w-full lg:w-80">
      {/* Stocks */}
      <div className="shrink-0 border-b border-border">
        <SectionHeader icon={BarChart2} label="Danske Aktier" />
        <StocksWidget />
      </div>

      {/* News */}
      <div className="flex flex-col flex-1 min-h-0">
        <SectionHeader icon={Newspaper} label="Nyheder" />
        <div className="flex-1 overflow-y-auto py-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          <NewsWidget />
        </div>
      </div>
    </aside>
  )
}
