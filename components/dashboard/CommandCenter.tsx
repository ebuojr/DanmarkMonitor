'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Moon, Globe, Map, Bell, BarChart2 as BarChart2Icon } from 'lucide-react'
import { AlertsSidebar } from './AlertsSidebar'
import { DataSidebar } from './DataSidebar'
import { NewsTicker } from './NewsTicker'
import type { LayerType, MapStyle } from '@/components/map/DenmarkMap'
import { LayerControls } from '@/components/map/LayerControls'
import { cn } from '@/lib/utils'

const DenmarkMap = dynamic(() => import('@/components/map/DenmarkMap').then((m) => m.DenmarkMap), {
  ssr: false,
  loading: () => <div className="size-full bg-background" />,
})

type MobileTab = 'map' | 'left' | 'right'

const DEFAULT_LAYERS: Set<LayerType> = new Set(['weather', 'energy', 'transport', 'roadtraffic'])

const MAP_STYLES: { id: MapStyle; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'dark',      label: 'Nat',      Icon: Moon  },
  { id: 'satellite', label: 'Satellit', Icon: Globe },
  { id: 'flat',      label: 'Standard', Icon: Map   },
]

export function CommandCenter() {
  const [activeLayers, setActiveLayers] = useState<Set<LayerType>>(DEFAULT_LAYERS)
  const [mapStyle, setMapStyle] = useState<MapStyle>('dark')
  const [mobileTab, setMobileTab] = useState<MobileTab>('map')

  useEffect(() => {
    if (mapStyle === 'flat') {
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
    }
  }, [mapStyle])

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
          <a
            href="https://github.com/ebuojr/DanmarkMonitor"
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub"
            className="text-foreground/70 hover:text-foreground transition-colors"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.184 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.026 2.747-1.026.546 1.378.202 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.2 22 16.447 22 12.021 22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
          <div className="hidden lg:flex">
            <LayerControls activeLayers={activeLayers} onToggle={handleLayerToggle} />
          </div>

          {/* Map style toggle */}
          <div className="hidden sm:flex items-center gap-0.5 rounded-md border border-border bg-muted p-0.5">
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

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="hidden md:block">
            {new Date().toLocaleDateString('da-DK', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
          <LiveClock />
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 min-h-0 overflow-hidden">
        <div className={cn('h-full', mobileTab === 'left' ? 'flex' : 'hidden', 'lg:flex')}>
          <AlertsSidebar />
        </div>

        <div className={cn('flex-1 min-w-0 relative flex-col', mobileTab === 'map' ? 'flex' : 'hidden', 'lg:flex')}>
          {/* Mobile-only map controls bar */}
          <div className="lg:hidden shrink-0 flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border bg-background/90 backdrop-blur-sm">
            <LayerControls activeLayers={activeLayers} onToggle={handleLayerToggle} />
            <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted p-0.5">
              {MAP_STYLES.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setMapStyle(id)}
                  title={label}
                  className={cn(
                    'flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors',
                    mapStyle === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon size={12} />
                </button>
              ))}
            </div>
          </div>
          <DenmarkMap activeLayers={activeLayers} mapStyle={mapStyle} />
        </div>

        <div className={cn('h-full', mobileTab === 'right' ? 'flex' : 'hidden', 'lg:flex')}>
          <DataSidebar />
        </div>
      </main>

      {/* Mobile tab bar */}
      <nav className="lg:hidden shrink-0 flex border-t border-border bg-background">
        <button
          onClick={() => setMobileTab('left')}
          className={cn('flex flex-1 flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors', mobileTab === 'left' ? 'text-foreground' : 'text-muted-foreground')}
        >
          <Bell size={16} />
          Advarsler
        </button>
        <button
          onClick={() => setMobileTab('map')}
          className={cn('flex flex-1 flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors', mobileTab === 'map' ? 'text-foreground' : 'text-muted-foreground')}
        >
          <Map size={16} />
          Kort
        </button>
        <button
          onClick={() => setMobileTab('right')}
          className={cn('flex flex-1 flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors', mobileTab === 'right' ? 'text-foreground' : 'text-muted-foreground')}
        >
          <BarChart2Icon size={16} />
          Data
        </button>
      </nav>

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
