'use client'

import { useState, useCallback, useEffect } from 'react'
import { AlertsSidebar } from './AlertsSidebar'
import { DataSidebar } from './DataSidebar'
import { TransportTicker } from './TransportTicker'
import { DenmarkMap, type LayerType } from '@/components/map/DenmarkMap'
import { LayerControls } from '@/components/map/LayerControls'

const DEFAULT_LAYERS: Set<LayerType> = new Set(['weather', 'transport', 'cameras'])

export function CommandCenter() {
  const [activeLayers, setActiveLayers] = useState<Set<LayerType>>(DEFAULT_LAYERS)

  const handleLayerToggle = useCallback((layer: LayerType) => {
    setActiveLayers((prev) => {
      const next = new Set(prev)
      if (next.has(layer)) next.delete(layer)
      else next.add(layer)
      return next
    })
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between gap-4 border-b border-border px-4 h-11">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-semibold tracking-tight">
              Danmark<span className="text-muted-foreground font-normal">Monitor</span>
            </span>
          </div>
          <span className="hidden sm:block text-[10px] text-muted-foreground/50 border-l border-border pl-3">
            LIVE SITUATIONAL AWARENESS
          </span>
        </div>

        <LayerControls activeLayers={activeLayers} onToggle={handleLayerToggle} />

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="hidden md:block">
            {new Date().toLocaleDateString('da-DK', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
          </span>
          <LiveClock />
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 min-h-0 overflow-hidden">
        <AlertsSidebar />

        {/* Map */}
        <div className="flex-1 min-w-0 relative">
          <DenmarkMap activeLayers={activeLayers} />
        </div>

        <DataSidebar />
      </main>

      {/* Transport ticker */}
      <footer className="shrink-0 h-9 border-t border-border bg-background/80 backdrop-blur-sm">
        <TransportTicker />
      </footer>
    </div>
  )
}

function LiveClock() {
  const fmt = () =>
    new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const [time, setTime] = useState(fmt)

  useEffect(() => {
    const id = setInterval(() => setTime(fmt()), 1000)
    return () => clearInterval(id)
  }, [])

  return <span className="font-mono tabular-nums">{time}</span>
}
