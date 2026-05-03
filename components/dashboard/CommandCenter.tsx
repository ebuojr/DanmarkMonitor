'use client'

import { useState, useCallback, useEffect } from 'react'
import { Moon, Globe, Map } from 'lucide-react'
import { AlertsSidebar } from './AlertsSidebar'
import { DataSidebar } from './DataSidebar'
import { NewsTicker } from './NewsTicker'
import { DenmarkMap, type LayerType, type MapStyle } from '@/components/map/DenmarkMap'
import { LayerControls } from '@/components/map/LayerControls'
import { cn } from '@/lib/utils'

const DEFAULT_LAYERS: Set<LayerType> = new Set(['weather', 'energy', 'transport', 'roadtraffic'])

const MAP_STYLES: { id: MapStyle; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'dark',      label: 'Nat',      Icon: Moon  },
  { id: 'satellite', label: 'Satellit', Icon: Globe },
  { id: 'flat',      label: 'Standard', Icon: Map   },
]

export function CommandCenter() {
  const [activeLayers, setActiveLayers] = useState<Set<LayerType>>(DEFAULT_LAYERS)
  const [mapStyle, setMapStyle] = useState<MapStyle>('dark')

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

        <div className="flex items-center gap-3">
          <LayerControls activeLayers={activeLayers} onToggle={handleLayerToggle} />

          {/* Map style toggle */}
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted p-0.5">
            {MAP_STYLES.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setMapStyle(id)}
                title={label}
                className={cn(
                  'flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors',
                  mapStyle === id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon size={12} />
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="hidden md:block">
            {new Date().toLocaleDateString('da-DK', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
          <LiveClock />
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 min-h-0 overflow-hidden">
        <AlertsSidebar />

        <div className="flex-1 min-w-0 relative">
          <DenmarkMap activeLayers={activeLayers} mapStyle={mapStyle} />
        </div>

        <DataSidebar />
      </main>

      <footer className="shrink-0 h-9 border-t border-border bg-background/80 backdrop-blur-sm">
        <NewsTicker />
      </footer>
    </div>
  )
}

function LiveClock() {
  const [time, setTime] = useState<string | null>(null)

  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setTime(fmt())
    const id = setInterval(() => setTime(fmt()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!time) return null
  return <span className="font-mono tabular-nums">{time}</span>
}
