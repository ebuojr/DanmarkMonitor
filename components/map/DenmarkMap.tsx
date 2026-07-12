'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import type { GeoJSON } from 'geojson'
import { Wind, Train, Bus, X, AlertTriangle } from 'lucide-react'
import { useWeather } from '@/lib/hooks/useWeather'
import { useVehicles } from '@/lib/hooks/useVehicles'
import { useRoadTraffic } from '@/lib/hooks/useRoadTraffic'
import { WIND_TURBINES_GEOJSON } from '@/lib/data/wind-turbines'

type PopupInfo =
  | { kind: 'turbine'; name: string; capacity_mw: number; turbines: number; year: number }
  | { kind: 'vehicle'; name: string; type: string; destination: string; nextStop: string; prevStop: string }
  | { kind: 'road'; category: string; title: string; header: string; kommune: string; direction: string; beginPeriod: string; endPeriod: string; description: string }

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ROAD_COLOR_EXPR: any[] = [
  'match', ['get', 'category'],
  'roadblocks',                  '#ef4444',
  'blocking-roadwork',           '#f43f5e',
  'blocking-events',             '#dc2626',
  'roadwork',                    '#fb923c',
  'other-traffic-announcements', '#f97316',
  'events',                      '#eab308',
  'queue',                       '#a78bfa',
  'ice-snow',                    '#7dd3fc',
  'winther-road',                '#93c5fd',
  '#94a3b8',
]

const ROAD_CATEGORIES: { category: string; label: string; color: string }[] = [
  { category: 'roadblocks',                  label: 'Vejspærring',           color: '#ef4444' },
  { category: 'blocking-roadwork',           label: 'Blok. vejarbejde',      color: '#f43f5e' },
  { category: 'blocking-events',             label: 'Blok. hændelse',        color: '#dc2626' },
  { category: 'roadwork',                    label: 'Vejarbejde',            color: '#fb923c' },
  { category: 'other-traffic-announcements', label: 'Trafikmeddelelse',      color: '#f97316' },
  { category: 'events',                      label: 'Hændelse',              color: '#eab308' },
  { category: 'queue',                       label: 'Kødannelse',            color: '#a78bfa' },
  { category: 'ice-snow',                    label: 'Is / sne',              color: '#7dd3fc' },
  { category: 'winther-road',                label: 'Vintervej',             color: '#93c5fd' },
]

export type LayerType = 'weather' | 'energy' | 'transport' | 'roadtraffic'
export type MapStyle  = 'dark' | 'satellite' | 'flat'

interface Props {
  activeLayers: Set<LayerType>
  mapStyle: MapStyle
}

const DENMARK_CENTER: [number, number] = [10.5, 56.3]
const DENMARK_ZOOM = 6
const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

const VEHICLE_TYPES = [
  { type: 'ic',       label: 'IC / Lyntog', color: '#f59e0b' },
  { type: 'regional', label: 'Regional',    color: '#fb923c' },
  { type: 'stog',     label: 'S-tog',       color: '#60a5fa' },
  { type: 'metro',    label: 'Metro',       color: '#a78bfa' },
  { type: 'bus',      label: 'Bus',         color: '#4ade80' },
  { type: 'other',    label: 'Andet',       color: '#94a3b8' },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VEHICLE_COLOR_EXPR: any[] = [
  'match', ['get', 'type'],
  'ic',       '#f59e0b',
  'regional', '#fb923c',
  'stog',     '#60a5fa',
  'metro',    '#a78bfa',
  'bus',      '#4ade80',
  '#94a3b8',
]

function computeBearing(from: [number, number], to: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const [lon1, lat1] = from.map(toRad)
  const [lon2, lat2] = to.map(toRad)
  const dLon = lon2 - lon1
  const x = Math.sin(dLon) * Math.cos(lat2)
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return (Math.atan2(x, y) * (180 / Math.PI) + 360) % 360
}

// Three base tile sets — dark (OSM inverted via CSS), satellite (ESRI), flat (CartoDB light)
const MAP_BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    'tiles-dark': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
    'tiles-satellite': {
      type: 'raster',
      // ESRI World Imagery — free with attribution, note {y}/{x} path order
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: '© Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, GIS User Community',
    },
    'tiles-flat': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    { id: 'base-dark',      type: 'raster', source: 'tiles-dark' },
    { id: 'base-satellite', type: 'raster', source: 'tiles-satellite', layout: { visibility: 'none' } },
    { id: 'base-flat',      type: 'raster', source: 'tiles-flat',      layout: { visibility: 'none' } },
  ],
}

export function DenmarkMap({ activeLayers, mapStyle }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const prevVehiclePositions = useRef<Map<string, [number, number]>>(new Map())
  const [mapReady, setMapReady] = useState(false)
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null)
  const setPopupRef = useRef(setPopupInfo)
  useEffect(() => { setPopupRef.current = setPopupInfo }, [])
  const [vehicleBbox, setVehicleBbox] = useState<{ minLon: number; maxLon: number; minLat: number; maxLat: number } | undefined>(undefined)

  const { data: weatherData } = useWeather()
  const { data: vehicleData } = useVehicles(vehicleBbox)
  const { data: roadTrafficData } = useRoadTraffic()

  // ── Init map once ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_BASE_STYLE,
      center: DENMARK_CENTER,
      zoom: DENMARK_ZOOM,
      minZoom: 5,
      maxZoom: 16,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    map.on('load', () => {
      // ── Weather labels ─────────────────────────────────────────────────────
      map.addSource('weather-stations', { type: 'geojson', data: EMPTY_FC })
      map.addLayer({
        id: 'weather-labels',
        type: 'symbol',
        source: 'weather-stations',
        layout: {
          'text-field': ['concat', ['to-string', ['round', ['get', 'temperature']]], '°'],
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 5, 18, 10, 26],
          'text-anchor': 'center',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': 'rgba(255,255,255,0.8)',
          'text-halo-color': 'rgba(0,0,0,0.65)',
          'text-halo-width': 1.5,
        },
      })

      // ── Wind turbines — simple green dots ─────────────────────────────────
      map.addSource('wind-turbines', { type: 'geojson', data: WIND_TURBINES_GEOJSON })

      map.addLayer({
        id: 'turbine-circles',
        type: 'circle',
        source: 'wind-turbines',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4, 9, 7, 12, 10],
          'circle-color': '#4ade80',
          'circle-opacity': 0.82,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': 'rgba(255,255,255,0.35)',
        },
      })

      // ── Live vehicles — coloured dots + motion trails ─────────────────────
      map.addSource('vehicles', { type: 'geojson', data: EMPTY_FC })
      map.addSource('vehicle-trails', { type: 'geojson', data: EMPTY_FC })

      map.addLayer({
        id: 'vehicle-trails',
        type: 'line',
        source: 'vehicle-trails',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2,
          'line-opacity': 0.45,
          'line-blur': 0.5,
        },
        layout: { 'line-cap': 'round' },
      })

      map.addLayer({
        id: 'vehicle-circles',
        type: 'circle',
        source: 'vehicles',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4, 9, 7, 12, 10],
          'circle-color': VEHICLE_COLOR_EXPR,
          'circle-opacity': 0.82,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': 'rgba(255,255,255,0.35)',
        },
      })

      // ── Click handlers — show React panel instead of MapLibre popup ─────────
      const onLayerClick = (layerId: string, maxZoom: number, getInfo: (f: maplibregl.MapGeoJSONFeature) => PopupInfo) => {
        map.on('click', layerId, (e) => {
          const f = map.queryRenderedFeatures(e.point, { layers: [layerId] })[0]
          if (!f || f.geometry.type !== 'Point') return
          const [lon, lat] = f.geometry.coordinates as [number, number]
          const targetZoom = Math.min(maxZoom, map.getZoom() + 2)
          map.flyTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), targetZoom), duration: 450, essential: true })
          setPopupRef.current(getInfo(f))
        })
        map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = '' })
      }

      onLayerClick('turbine-circles', 8, (f) => {
        const p = f.properties as { name: string; capacity_mw: number; turbines: number; year: number }
        return { kind: 'turbine', name: p.name, capacity_mw: p.capacity_mw, turbines: p.turbines, year: p.year }
      })

      onLayerClick('vehicle-circles', 9, (f) => {
        const p = f.properties as { name: string; destination: string; nextStop: string; prevStop: string; type: string }
        return { kind: 'vehicle', name: p.name, type: p.type, destination: p.destination ?? '', nextStop: p.nextStop ?? '', prevStop: p.prevStop ?? '' }
      })

      // ── Road traffic ──────────────────────────────────────────────────────────
      map.addSource('road-traffic', { type: 'geojson', data: EMPTY_FC })
      map.addLayer({
        id: 'road-circles',
        type: 'circle',
        source: 'road-traffic',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4, 9, 7, 12, 10],
          'circle-color': ROAD_COLOR_EXPR,
          'circle-opacity': 0.82,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': 'rgba(255,255,255,0.35)',
        },
      })

      onLayerClick('road-circles', 9, (f) => {
        const p = f.properties as { category: string; title: string; header: string; kommune: string; direction: string; beginPeriod: string; endPeriod: string; description: string }
        return {
          kind: 'road',
          category: p.category ?? '',
          title: p.title ?? '',
          header: p.header ?? '',
          kommune: p.kommune ?? '',
          direction: p.direction ?? '',
          beginPeriod: p.beginPeriod ?? '',
          endPeriod: p.endPeriod ?? '',
          description: p.description ?? '',
        }
      })

      const updateBbox = () => {
        const zoom = map.getZoom()
        if (zoom >= 10) {
          const b = map.getBounds()
          setVehicleBbox({ minLon: b.getWest(), maxLon: b.getEast(), minLat: b.getSouth(), maxLat: b.getNorth() })
        } else {
          setVehicleBbox(undefined)
        }
      }
      map.on('moveend', updateBbox)
      map.on('zoomend', updateBbox)

      setMapReady(true)
    })

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  // ── Update weather stations ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const stations = weatherData?.data?.stations ?? []
    ;(map.getSource('weather-stations') as maplibregl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: stations
        .filter((s) => s.temperature !== undefined)
        .map((s) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
          properties: { temperature: s.temperature!, stationId: s.stationId },
        })),
    })
  }, [mapReady, weatherData])

  // ── Update vehicles + motion trails ───────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const vehicles = vehicleData?.data?.vehicles ?? []
    const prev = prevVehiclePositions.current
    const typeColor: Record<string, string> = {
      ic: '#f59e0b', regional: '#fb923c', stog: '#60a5fa',
      metro: '#a78bfa', bus: '#4ade80', other: '#94a3b8',
    }

    const trails: GeoJSON.Feature[] = []

    const vehicleGeoJSON: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: vehicles.map((v) => {
        const cur: [number, number] = [v.lon, v.lat]
        const prevPos = prev.get(v.id)
        if (prevPos && Math.abs(cur[0] - prevPos[0]) + Math.abs(cur[1] - prevPos[1]) > 0.0001) {
          trails.push({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [prevPos, cur] },
            properties: { color: typeColor[v.type] ?? '#94a3b8' },
          })
        }
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: cur },
          properties: { id: v.id, name: v.name, type: v.type, destination: v.destination, nextStop: v.nextStop, prevStop: v.prevStop },
        }
      }),
    }

    prevVehiclePositions.current = new Map(vehicles.map((v) => [v.id, [v.lon, v.lat] as [number, number]]))
    ;(map.getSource('vehicles') as maplibregl.GeoJSONSource).setData(vehicleGeoJSON)
    ;(map.getSource('vehicle-trails') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features: trails })
  }, [mapReady, vehicleData])

  // ── Update road traffic ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const features = roadTrafficData?.data?.features ?? []
    ;(map.getSource('road-traffic') as maplibregl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features,
    })
  }, [mapReady, roadTrafficData])

  // ── Sync data layer visibility ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const vis = (id: string, show: boolean) => map.setLayoutProperty(id, 'visibility', show ? 'visible' : 'none')
    vis('weather-labels',  activeLayers.has('weather'))
    vis('turbine-circles', activeLayers.has('energy'))
    vis('vehicle-trails',  activeLayers.has('transport'))
    vis('vehicle-circles', activeLayers.has('transport'))
    vis('road-circles',    activeLayers.has('roadtraffic'))
  }, [mapReady, activeLayers])

  // ── Sync base tile layer ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const vis = (id: string, show: boolean) => map.setLayoutProperty(id, 'visibility', show ? 'visible' : 'none')
    vis('base-dark',      mapStyle === 'dark')
    vis('base-satellite', mapStyle === 'satellite')
    vis('base-flat',      mapStyle === 'flat')
  }, [mapReady, mapStyle])

  const showTransport = activeLayers.has('transport')
  const showEnergy    = activeLayers.has('energy')

  const VEHICLE_LABEL: Record<string, string> = { ic: 'IC / Lyntog', regional: 'Regional', stog: 'S-tog', metro: 'Metro', bus: 'Bus', other: 'Transport' }
  const ROAD_LABEL: Record<string, string> = Object.fromEntries(ROAD_CATEGORIES.map(({ category, label }) => [category, label]))
  const showRoadTraffic = activeLayers.has('roadtraffic')

  return (
    <div className="relative size-full overflow-hidden">
      {/* map-invert class applies CSS filter only in dark mode (inverted OSM) */}
      <div ref={containerRef} className={`size-full${mapStyle === 'dark' ? ' map-invert' : ''}`} />

      {/* Info panel — top-left */}
      {popupInfo && (
        <div className="absolute top-3 left-3 z-20 w-64 rounded-lg bg-background border border-border shadow-lg overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/60 bg-muted/30">
            <div className="flex items-center gap-2">
              {popupInfo.kind === 'turbine' ? (
                <Wind size={13} className="text-green-400 shrink-0" />
              ) : popupInfo.kind === 'road' ? (
                <AlertTriangle size={13} className="text-orange-400 shrink-0" />
              ) : popupInfo.type === 'bus' ? (
                <Bus size={13} className="text-green-400 shrink-0" />
              ) : (
                <Train size={13} className="text-blue-400 shrink-0" />
              )}
              <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                {popupInfo.kind === 'turbine'
                  ? 'Vindmøllepark'
                  : popupInfo.kind === 'road'
                  ? (ROAD_LABEL[popupInfo.category] ?? 'Trafikhændelse')
                  : (VEHICLE_LABEL[popupInfo.type] ?? 'Transport')}
              </span>
            </div>
            <button onClick={() => setPopupInfo(null)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={13} />
            </button>
          </div>

          <div className="px-3 py-2.5 space-y-1.5 text-xs">
            {popupInfo.kind === 'turbine' ? (
              <>
                <p className="text-sm font-semibold text-foreground">{popupInfo.name}</p>
                <p className="text-muted-foreground">{popupInfo.capacity_mw} MW &middot; {popupInfo.turbines} møller &middot; {popupInfo.year}</p>
              </>
            ) : popupInfo.kind === 'road' ? (
              <>
                <p className="text-sm font-semibold text-foreground">{popupInfo.title || popupInfo.header}</p>
                {popupInfo.kommune && <p className="text-muted-foreground">{popupInfo.kommune}</p>}
                {popupInfo.direction && <p className="text-muted-foreground">→ {popupInfo.direction}</p>}
                {(popupInfo.beginPeriod || popupInfo.endPeriod) && (
                  <div className="pt-1.5 border-t border-border/40 space-y-1">
                    {popupInfo.beginPeriod && <p className="text-muted-foreground">Fra: {popupInfo.beginPeriod}</p>}
                    {popupInfo.endPeriod && <p className="text-muted-foreground">Til: {popupInfo.endPeriod}</p>}
                  </div>
                )}
                {popupInfo.description && (
                  <p className="pt-1.5 border-t border-border/40 text-muted-foreground text-xs leading-relaxed">{stripHtml(popupInfo.description)}</p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-foreground">{popupInfo.name}</p>
                {popupInfo.destination && (
                  <p className="text-muted-foreground">→ <span className="text-foreground font-medium">{popupInfo.destination}</span></p>
                )}
                {(popupInfo.prevStop || popupInfo.nextStop) && (
                  <div className="pt-1.5 border-t border-border/40 space-y-1">
                    {popupInfo.prevStop && <p className="text-muted-foreground">Forrige: {popupInfo.prevStop}</p>}
                    {popupInfo.nextStop && <p className="text-foreground font-medium">Næste: {popupInfo.nextStop}</p>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {(showTransport || showEnergy || showRoadTraffic) && (
        <div className="absolute bottom-10 left-2 z-10 flex flex-col gap-2 pointer-events-none">
          {showRoadTraffic && (
            <div className="rounded-lg bg-background border border-border px-3 py-2 backdrop-blur-sm">
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase mb-2">Veje</p>
              <div className="space-y-1">
                {ROAD_CATEGORIES.map(({ category, label, color }) => (
                  <div key={category} className="flex items-center gap-2 text-xs">
                    <span className="size-2.5 rounded-full shrink-0 border border-black/20" style={{ backgroundColor: color }} />
                    <span className="text-foreground/80">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {showTransport && (
            <div className="rounded-lg bg-background border border-border px-3 py-2 backdrop-blur-sm">
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase mb-2">Transport</p>
              <div className="space-y-1">
                {VEHICLE_TYPES.map(({ type, label, color }) => (
                  <div key={type} className="flex items-center gap-2 text-xs">
                    <span className="size-2.5 rounded-full shrink-0 border border-black/20" style={{ backgroundColor: color }} />
                    <span className="text-foreground/80">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showEnergy && (
            <div className="rounded-lg bg-background border border-border px-3 py-2 backdrop-blur-sm">
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase mb-2">Energi</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="size-2.5 rounded-full bg-green-400 shrink-0 border border-black/20" />
                <span className="text-foreground/80">Vindmølleparker</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
