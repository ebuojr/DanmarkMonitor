'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import type { GeoJSON } from 'geojson'
import { Wind, X, AlertTriangle } from 'lucide-react'
import { useWeather } from '@/lib/hooks/useWeather'
import { useVehicles } from '@/lib/hooks/useVehicles'
import { useJourney } from '@/lib/hooks/useJourney'
import { useRoadTraffic } from '@/lib/hooks/useRoadTraffic'
import { useFlights } from '@/lib/hooks/useFlights'
import { WIND_TURBINES_GEOJSON } from '@/lib/data/wind-turbines'
import { JourneyPanel } from '@/components/map/JourneyPanel'
import { FlightPanel } from '@/components/map/FlightPanel'
import type { VehicleType } from '@/lib/types/transport'

type TurbineProps = { name: string; capacity_mw: number; turbines: number; year: number }
type RoadProps = { category: string; title: string; header: string; kommune: string; direction: string; beginPeriod: string; endPeriod: string; description: string }

type PopupInfo =
  | ({ kind: 'turbine' } & TurbineProps)
  | { kind: 'vehicle'; jid: string; name: string; type: VehicleType; destination: string }
  | ({ kind: 'road' } & RoadProps)

// One selection at a time — clicking a vehicle or a flight clears the other;
// closing the popup clears this too. This is the extension point future
// programmatic-selection features (e.g. search) will drive.
type Selected = { kind: 'vehicle'; jid: string } | { kind: 'flight'; id: string } | null

// Search (and any future programmatic caller) drives the map through this
// single handle — same PopupInfo/`selected` state the click handlers set, so
// selecting a search result opens exactly what clicking the feature would.
// Vehicle targets carry name/type/destination directly (not just an id)
// because the map's own vehicle data is viewport-scoped (`useVehicles(bbox)`)
// — a focus-time lookup by id would miss anything outside the current view,
// which is the common case right after a search. Flights don't need this:
// `useFlights()` is unscoped, so the flight branch below re-derives live
// aircraft data from it by id, same as the existing click handler does.
export type FocusTarget =
  | { kind: 'vehicle'; jid: string; lon: number; lat: number; name: string; type: VehicleType; destination: string }
  | { kind: 'flight'; id: string; lon: number; lat: number }
  | { kind: 'turbine'; lon: number; lat: number; props: TurbineProps }
  | { kind: 'road'; lon: number; lat: number; props: RoadProps }
  | { kind: 'point'; lon: number; lat: number; zoom?: number }

export interface DenmarkMapHandle {
  focus(target: FocusTarget): void
}

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

export type LayerType = 'weather' | 'energy' | 'transport' | 'roadtraffic' | 'flights'
export type MapStyle  = 'light' | 'dark' | 'satellite'

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

const TYPE_COLOR: Record<string, string> = Object.fromEntries(VEHICLE_TYPES.map(({ type, color }) => [type, color]))

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

// Three base tile sets — light (CartoDB voyager), dark (CartoDB dark_all), satellite (ESRI)
const MAP_BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    'tiles-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
    },
    'tiles-satellite': {
      type: 'raster',
      // ESRI World Imagery — free with attribution, note {y}/{x} path order
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: '© Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, GIS User Community',
    },
    'tiles-light': {
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
    { id: 'base-light',     type: 'raster', source: 'tiles-light',     layout: { visibility: 'none' } },
  ],
}

export const DenmarkMap = forwardRef<DenmarkMapHandle, Props>(function DenmarkMap({ activeLayers, mapStyle }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null)
  const setPopupRef = useRef(setPopupInfo)
  useEffect(() => { setPopupRef.current = setPopupInfo }, [])
  const [selected, setSelected] = useState<Selected>(null)
  const setSelectedRef = useRef(setSelected)
  useEffect(() => { setSelectedRef.current = setSelected }, [])
  const [vehicleBbox, setVehicleBbox] = useState<{ minLon: number; maxLon: number; minLat: number; maxLat: number } | undefined>(undefined)

  const { data: weatherData } = useWeather()
  const { data: vehicleData } = useVehicles(vehicleBbox)
  const { data: roadTrafficData } = useRoadTraffic()
  const { data: journeyData, isLoading: journeyLoading } = useJourney(selected?.kind === 'vehicle' ? selected.jid : null)
  const { data: flightsData } = useFlights()

  // ── Shared selection helpers — click handlers AND focus() (the search
  // modal's entry point) both funnel through these, so selecting a result
  // opens exactly what clicking the feature would. Refs keep these callable
  // from the map's `load` closure (registered once) without stale state.
  const selectVehicle = (jid: string, name: string, type: VehicleType, destination: string) => {
    setPopupRef.current({ kind: 'vehicle', jid, name, type, destination })
    setSelectedRef.current({ kind: 'vehicle', jid })
  }
  const selectFlight = (id: string) => {
    setPopupRef.current(null)
    setSelectedRef.current({ kind: 'flight', id })
  }
  const selectTurbine = (props: TurbineProps) => {
    setPopupRef.current({ kind: 'turbine', ...props })
    setSelectedRef.current(null)
  }
  const selectRoad = (props: RoadProps) => {
    setPopupRef.current({ kind: 'road', ...props })
    setSelectedRef.current(null)
  }

  useImperativeHandle(ref, () => ({
    focus(target) {
      const map = mapRef.current
      if (!map) return
      const flyTo = (lon: number, lat: number, zoom: number) =>
        map.flyTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), zoom), duration: 700, essential: true })

      switch (target.kind) {
        case 'vehicle':
          flyTo(target.lon, target.lat, 13)
          selectVehicle(target.jid, target.name, target.type, target.destination)
          break
        case 'flight':
          flyTo(target.lon, target.lat, 9)
          selectFlight(target.id)
          break
        case 'turbine':
          flyTo(target.lon, target.lat, 10)
          selectTurbine(target.props)
          break
        case 'road':
          flyTo(target.lon, target.lat, 12)
          selectRoad(target.props)
          break
        case 'point':
          map.flyTo({ center: [target.lon, target.lat], zoom: target.zoom ?? 11, duration: 700, essential: true })
          setPopupRef.current(null)
          setSelectedRef.current(null)
          break
      }
    },
  }), [])

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
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.9)',
          'text-halo-width': 2,
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

      // ── Selected journey — route line + stop dots (beneath vehicle dots) ──
      map.addSource('journey-route', { type: 'geojson', data: EMPTY_FC })
      map.addSource('journey-stops', { type: 'geojson', data: EMPTY_FC })

      map.addLayer({
        id: 'journey-route',
        type: 'line',
        source: 'journey-route',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 3.5,
          'line-opacity': 0.85,
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      })

      map.addLayer({
        id: 'journey-stops',
        type: 'circle',
        source: 'journey-stops',
        paint: {
          'circle-radius': 4,
          'circle-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-stroke-color': ['get', 'color'],
        },
      })

      // ── Live vehicles — coloured dots ─────────────────────────────────────
      map.addSource('vehicles', { type: 'geojson', data: EMPTY_FC })

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
      const onLayerClick = (layerId: string, maxZoom: number, handle: (f: maplibregl.MapGeoJSONFeature) => void) => {
        map.on('click', layerId, (e) => {
          const f = map.queryRenderedFeatures(e.point, { layers: [layerId] })[0]
          if (!f || f.geometry.type !== 'Point') return
          const [lon, lat] = f.geometry.coordinates as [number, number]
          const targetZoom = Math.min(maxZoom, map.getZoom() + 2)
          map.flyTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), targetZoom), duration: 450, essential: true })
          handle(f)
        })
        map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = '' })
      }

      onLayerClick('turbine-circles', 8, (f) => {
        const p = f.properties as { name: string; capacity_mw: number; turbines: number; year: number }
        selectTurbine({ name: p.name, capacity_mw: p.capacity_mw, turbines: p.turbines, year: p.year })
      })

      onLayerClick('vehicle-circles', 9, (f) => {
        const p = f.properties as { jid: string; name: string; destination: string; type: VehicleType }
        selectVehicle(p.jid, p.name, p.type, p.destination ?? '')
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
        selectRoad({
          category: p.category ?? '',
          title: p.title ?? '',
          header: p.header ?? '',
          kommune: p.kommune ?? '',
          direction: p.direction ?? '',
          beginPeriod: p.beginPeriod ?? '',
          endPeriod: p.endPeriod ?? '',
          description: p.description ?? '',
        })
      })

      // ── Live aircraft — ADS-B positions over Denmark ──────────────────────
      // The '✈' glyph is not present in the demotiles fontstack (renders as
      // tofu/blank), so this ships as a circle layer — mirrors vehicle-circles.
      map.addSource('flights', { type: 'geojson', data: EMPTY_FC })
      map.addLayer({
        id: 'flight-icons',
        type: 'circle',
        source: 'flights',
        paint: {
          'circle-radius': 4,
          'circle-color': '#f472b6',
          'circle-opacity': 0.82,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': 'rgba(255,255,255,0.35)',
        },
      })

      onLayerClick('flight-icons', 10, (f) => {
        const p = f.properties as { id: string }
        // No popup card for flights — FlightPanel renders instead, driven by
        // `selected` + a live lookup into the flights SWR data (so it always
        // reflects the aircraft's current position/alt/speed, not a stale
        // click-time snapshot).
        selectFlight(p.id ?? '')
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

  // ── Update vehicles ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const vehicles = vehicleData?.data?.vehicles ?? []

    const vehicleGeoJSON: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: vehicles.map((v) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [v.lon, v.lat] },
        properties: { id: v.id, jid: v.jid, name: v.name, type: v.type, destination: v.destination },
      })),
    }

    ;(map.getSource('vehicles') as maplibregl.GeoJSONSource).setData(vehicleGeoJSON)
  }, [mapReady, vehicleData])

  // ── Update selected route (vehicle journey OR flight origin→plane→dest) ────
  // Both branches share the `journey-route` / `journey-stops` sources (they
  // are generic line+points sources) — a single effect owns both so they
  // can never clobber each other.
  const FLIGHT_ROUTE_COLOR = '#f472b6'

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const clearRoute = () => {
      ;(map.getSource('journey-route') as maplibregl.GeoJSONSource).setData(EMPTY_FC)
      ;(map.getSource('journey-stops') as maplibregl.GeoJSONSource).setData(EMPTY_FC)
    }

    if (selected?.kind === 'vehicle') {
      const journey = journeyData?.data?.journey
      const selectedType = popupInfo?.kind === 'vehicle' ? popupInfo.type : 'other'
      const color = TYPE_COLOR[selectedType] ?? '#94a3b8'

      if (!journey) { clearRoute(); return }

      ;(map.getSource('journey-route') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: journey.line },
            properties: { color },
          },
        ],
      })
      ;(map.getSource('journey-stops') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: journey.stops.map((s) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
          properties: { name: s.name, color },
        })),
      })
      return
    }

    if (selected?.kind === 'flight') {
      const aircraft = flightsData?.data?.aircraft.find((a) => a.id === selected.id)
      if (!aircraft) {
        // Landed / out of range / dropped by the Danish filter — clear.
        // Deferred via queueMicrotask (same convention as LiveClock below)
        // since setState synchronously inside an effect body is disallowed.
        clearRoute()
        queueMicrotask(() => setSelected(null))
        return
      }

      ;(map.getSource('journey-route') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [aircraft.origin.lon, aircraft.origin.lat],
                [aircraft.lon, aircraft.lat],
                [aircraft.destination.lon, aircraft.destination.lat],
              ],
            },
            properties: { color: FLIGHT_ROUTE_COLOR },
          },
        ],
      })
      ;(map.getSource('journey-stops') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [aircraft.origin.lon, aircraft.origin.lat] },
            properties: { name: aircraft.origin.name, color: FLIGHT_ROUTE_COLOR },
          },
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [aircraft.destination.lon, aircraft.destination.lat] },
            properties: { name: aircraft.destination.name, color: FLIGHT_ROUTE_COLOR },
          },
        ],
      })
      return
    }

    clearRoute()
  }, [mapReady, selected, journeyData, flightsData, popupInfo])

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

  // ── Update live aircraft ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const aircraft = flightsData?.data?.aircraft ?? []
    ;(map.getSource('flights') as maplibregl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: aircraft.map((a) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [a.lon, a.lat] },
        properties: { id: a.id, callsign: a.callsign, alt: a.alt, speed: a.speed, heading: a.heading },
      })),
    })
  }, [mapReady, flightsData])

  // ── Sync data layer visibility ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const vis = (id: string, show: boolean) => map.setLayoutProperty(id, 'visibility', show ? 'visible' : 'none')
    vis('weather-labels',  activeLayers.has('weather'))
    vis('turbine-circles', activeLayers.has('energy'))
    vis('vehicle-circles', activeLayers.has('transport'))
    // journey-route/journey-stops are shared by vehicle journeys AND flight
    // routes now — visible if either layer that can select something is on.
    vis('journey-route',   activeLayers.has('transport') || activeLayers.has('flights'))
    vis('journey-stops',   activeLayers.has('transport') || activeLayers.has('flights'))
    vis('road-circles',    activeLayers.has('roadtraffic'))
    vis('flight-icons',    activeLayers.has('flights'))
  }, [mapReady, activeLayers])

  // ── Sync base tile layer ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const vis = (id: string, show: boolean) => map.setLayoutProperty(id, 'visibility', show ? 'visible' : 'none')
    vis('base-dark',      mapStyle === 'dark')
    vis('base-satellite', mapStyle === 'satellite')
    vis('base-light',     mapStyle === 'light')
  }, [mapReady, mapStyle])

  const showTransport = activeLayers.has('transport')
  const showEnergy    = activeLayers.has('energy')

  const ROAD_LABEL: Record<string, string> = Object.fromEntries(ROAD_CATEGORIES.map(({ category, label }) => [category, label]))
  const showRoadTraffic = activeLayers.has('roadtraffic')

  const closePopup = () => { setPopupInfo(null); setSelected(null) }
  const selectedFlight = selected?.kind === 'flight'
    ? flightsData?.data?.aircraft.find((a) => a.id === selected.id)
    : undefined

  return (
    <div className="relative size-full overflow-hidden">
      <div ref={containerRef} className="size-full" />

      {/* Info panel — top-left */}
      {popupInfo?.kind === 'vehicle' && (
        <div className="absolute top-3 left-3 z-20">
          <JourneyPanel
            jid={popupInfo.jid}
            name={popupInfo.name}
            type={popupInfo.type}
            destination={popupInfo.destination}
            journey={journeyData?.data?.journey}
            isLoading={journeyLoading}
            onClose={closePopup}
          />
        </div>
      )}

      {selectedFlight && (
        <div className="absolute top-3 left-3 z-20">
          <FlightPanel
            callsign={selectedFlight.callsign}
            airline={selectedFlight.airline}
            origin={selectedFlight.origin}
            destination={selectedFlight.destination}
            alt={selectedFlight.alt}
            speed={selectedFlight.speed}
            onClose={closePopup}
          />
        </div>
      )}

      {popupInfo && popupInfo.kind !== 'vehicle' && (
        <div className="absolute top-3 left-3 z-20 w-64 max-w-[calc(100vw-1.5rem)] rounded-lg bg-background border border-border shadow-lg overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/60 bg-muted/30">
            <div className="flex items-center gap-2">
              {popupInfo.kind === 'turbine' ? (
                <Wind size={13} className="text-green-400 shrink-0" />
              ) : (
                <AlertTriangle size={13} className="text-orange-400 shrink-0" />
              )}
              <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                {popupInfo.kind === 'turbine'
                  ? 'Vindmøllepark'
                  : (ROAD_LABEL[popupInfo.category] ?? 'Trafikhændelse')}
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
            ) : (
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
})
