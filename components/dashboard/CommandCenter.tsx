'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Sun, Moon, Globe, Map, PanelRight, Search } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { NewsTicker } from './NewsTicker'
import type { LayerType, MapStyle, DenmarkMapHandle } from '@/components/map/DenmarkMap'
import type { VehicleType } from '@/lib/types/transport'
import { VEHICLE_TYPE_IDS, ROAD_CATEGORY_IDS } from '@/lib/map/palette'
import { useLocalStorageState, setCodec, enumCodec } from '@/lib/hooks/useLocalStorageState'
import { LayerControls } from '@/components/map/LayerControls'
import { SearchModal } from '@/components/search/SearchModal'
import type { SearchResult } from '@/components/search/useSearchIndex'
import { cn } from '@/lib/utils'

const DenmarkMap = dynamic(() => import('@/components/map/DenmarkMap').then((m) => m.DenmarkMap), {
  ssr: false,
  loading: () => <div className="size-full bg-background" />,
})

type MobileTab = 'map' | 'info'

const ALL_LAYERS: readonly LayerType[] = ['weather', 'energy', 'transport', 'roadtraffic', 'flights']
const DEFAULT_LAYERS: Set<LayerType> = new Set(ALL_LAYERS)

// Persisted user choices — hydration-safe (defaults first paint, storage
// after mount), tolerant of corrupt/stale values. Bump .v1 on breaking
// shape changes.
const LAYERS_CODEC = setCodec(ALL_LAYERS)
const VEHICLE_TYPES_CODEC = setCodec(VEHICLE_TYPE_IDS)
const ROAD_CATEGORIES_CODEC = setCodec(ROAD_CATEGORY_IDS)
const MAP_STYLE_CODEC = enumCodec<MapStyle>(['light', 'dark', 'satellite'])

const MAP_STYLES: { id: MapStyle; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'light',     label: 'Lys',      Icon: Sun   },
  { id: 'dark',      label: 'Mørk',     Icon: Moon  },
  { id: 'satellite', label: 'Satellit', Icon: Globe },
]

export function CommandCenter() {
  const [activeLayers, setActiveLayers] = useLocalStorageState(
    'danmark-monitor.active-layers.v1', DEFAULT_LAYERS, LAYERS_CODEC)
  // Sub-filters within the transport/roadtraffic layers — the map legend's
  // rows toggle these. Default: everything visible.
  const [vehicleTypes, setVehicleTypes] = useLocalStorageState<Set<VehicleType>>(
    'danmark-monitor.vehicle-types.v1', new Set(VEHICLE_TYPE_IDS), VEHICLE_TYPES_CODEC)
  const [roadCategories, setRoadCategories] = useLocalStorageState<Set<string>>(
    'danmark-monitor.road-categories.v1', new Set(ROAD_CATEGORY_IDS), ROAD_CATEGORIES_CODEC)
  // Stored 'light' repaints from the hardcoded dark <html> class one frame
  // after hydration — accepted; a pre-hydration inline script isn't worth it.
  const [mapStyle, setMapStyle] = useLocalStorageState<MapStyle>(
    'danmark-monitor.map-style.v1', 'dark', MAP_STYLE_CODEC)
  const [mobileTab, setMobileTab] = useState<MobileTab>('map')
  const [searchOpen, setSearchOpen] = useState(false)
  const mapHandle = useRef<DenmarkMapHandle>(null)

  useEffect(() => {
    if (mapStyle === 'light') {
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
  }, [setActiveLayers])

  const handleVehicleTypeToggle = useCallback((type: VehicleType) => {
    setVehicleTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }, [setVehicleTypes])
  const handleVehicleTypesReset = useCallback(() => setVehicleTypes(new Set(VEHICLE_TYPE_IDS)), [setVehicleTypes])

  const handleRoadCategoryToggle = useCallback((category: string) => {
    setRoadCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }, [setRoadCategories])
  const handleRoadCategoriesReset = useCallback(() => setRoadCategories(new Set(ROAD_CATEGORY_IDS)), [setRoadCategories])

  // Global ⌘K / Ctrl+K to open the search modal — prevent the browser's own
  // "focus address bar" binding from firing at the same time.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const handleSearchSelect = useCallback((result: SearchResult) => {
    if (result.link) {
      window.open(result.link, '_blank', 'noopener')
    } else if (result.target) {
      mapHandle.current?.focus(result.target)
      setMobileTab('map')
    }
    setSearchOpen(false)
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
          <button
            onClick={() => setSearchOpen(true)}
            title="Søg (⌘K)"
            className="flex items-center gap-2 rounded-md border border-border bg-muted px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/80"
          >
            <Search size={13} />
            <span className="hidden sm:inline">Søg…</span>
            <kbd className="hidden sm:inline-flex items-center rounded border border-border bg-background px-1 py-0.5 text-[10px] font-mono text-muted-foreground/70">
              ⌘K
            </kbd>
          </button>
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
          <span className="hidden sm:block">
            <LiveClock />
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 min-h-0 overflow-hidden">
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
          <DenmarkMap
            ref={mapHandle}
            activeLayers={activeLayers}
            mapStyle={mapStyle}
            vehicleTypes={vehicleTypes}
            roadCategories={roadCategories}
            onVehicleTypeToggle={handleVehicleTypeToggle}
            onVehicleTypesReset={handleVehicleTypesReset}
            onRoadCategoryToggle={handleRoadCategoryToggle}
            onRoadCategoriesReset={handleRoadCategoriesReset}
          />
        </div>

        <div className={cn('h-full', mobileTab === 'info' ? 'flex' : 'hidden', 'lg:flex')}>
          <Sidebar />
        </div>
      </main>

      {/* Mobile tab bar */}
      <nav className="lg:hidden shrink-0 flex border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
        <button
          onClick={() => setMobileTab('map')}
          className={cn('flex flex-1 flex-col items-center justify-center min-h-11 py-2 gap-0.5 text-[10px] font-medium transition-colors', mobileTab === 'map' ? 'text-primary' : 'text-muted-foreground')}
        >
          <Map size={16} />
          Kort
        </button>
        <button
          onClick={() => setMobileTab('info')}
          className={cn('flex flex-1 flex-col items-center justify-center min-h-11 py-2 gap-0.5 text-[10px] font-medium transition-colors', mobileTab === 'info' ? 'text-primary' : 'text-muted-foreground')}
        >
          <PanelRight size={16} />
          Info
        </button>
      </nav>

      <footer className="shrink-0 h-9 border-t border-border bg-background/80 backdrop-blur-sm">
        <NewsTicker />
      </footer>

      {searchOpen && (
        <SearchModal onClose={() => setSearchOpen(false)} onSelect={handleSearchSelect} />
      )}
    </div>
  )
}

function LiveClock() {
  const [time, setTime] = useState<string | null>(null)

  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    queueMicrotask(() => setTime(fmt()))
    const id = setInterval(() => setTime(fmt()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!time) return null
  return <span className="font-mono tabular-nums">{time}</span>
}
