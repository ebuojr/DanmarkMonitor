'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import type { GeoJSON } from 'geojson'
import { Wind, Sun, X, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useWeather } from '@/lib/hooks/useWeather'
import { useVehicles } from '@/lib/hooks/useVehicles'
import { useJourney } from '@/lib/hooks/useJourney'
import { useRoadTraffic } from '@/lib/hooks/useRoadTraffic'
import { useFlights } from '@/lib/hooks/useFlights'
import { WIND_TURBINES_GEOJSON } from '@/lib/data/wind-turbines'
import { METRO_LINES_GEOJSON } from '@/lib/data/metro-lines'
import { SOLAR_PARKS_GEOJSON } from '@/lib/data/solar-parks'
import { JourneyPanel } from '@/components/map/JourneyPanel'
import { FlightPanel } from '@/components/map/FlightPanel'
import { MapLegend } from '@/components/map/MapLegend'
import { createSourceAnimator, type SourceAnimator } from '@/lib/map/animateSource'
import { getBaseStyle, MAP_FONT, type MapStyle } from '@/lib/map/baseStyles'

export type { MapStyle } from '@/lib/map/baseStyles'
import type { VehicleType } from '@/lib/types/transport'
import { VEHICLE_TYPES, TYPE_COLOR, VEHICLE_COLOR_EXPR, ROAD_CATEGORIES, ROAD_COLOR_EXPR } from '@/lib/map/palette'

type TurbineProps = { name: string; capacity_mw: number; turbines: number; year: number }
type SolarProps = { name: string; capacity_mw: number; year: number | null }
type RoadProps = { category: string; title: string; header: string; kommune: string; direction: string; beginPeriod: string; endPeriod: string; description: string }

type PopupInfo =
  | ({ kind: 'turbine' } & TurbineProps)
  | ({ kind: 'solar' } & SolarProps)
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
  | { kind: 'solar'; lon: number; lat: number; props: SolarProps }
  | { kind: 'road'; lon: number; lat: number; props: RoadProps }
  | { kind: 'point'; lon: number; lat: number; zoom?: number }

export interface DenmarkMapHandle {
  focus(target: FocusTarget): void
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export type LayerType = 'weather' | 'energy' | 'transport' | 'roadtraffic' | 'flights'

interface Props {
  activeLayers: Set<LayerType>
  mapStyle: MapStyle
  vehicleTypes: Set<VehicleType>
  roadCategories: Set<string>
  onVehicleTypeToggle: (type: VehicleType) => void
  onVehicleTypesReset: () => void
  onRoadCategoryToggle: (category: string) => void
  onRoadCategoriesReset: () => void
}

const DENMARK_CENTER: [number, number] = [10.5, 56.3]
const DENMARK_ZOOM = 6
const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

// Shared base paint values for the four dimmable circle/label layers — the
// selection-emphasis effect restores these exact constants on deselect
// instead of a second hardcoded copy that could drift from the layer defs.
const BASE_CIRCLE_OPACITY = 0.82
// Subtle focus effect: unselected markers stay clearly legible — the selected
// feature pops via full opacity + radius bump, not by blacking out the rest.
const DIMMED_OPACITY = 0.55
const DIMMED_TEXT_OPACITY = 0.6
// Zoom-interpolated radius shared by turbine/vehicle/road circles.
const RADIUS_STOPS: [zoom: number, radius: number][] = [[5, 4], [9, 7], [12, 10]]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CIRCLE_RADIUS_EXPR: any[] = ['interpolate', ['linear'], ['zoom'], ...RADIUS_STOPS.flat()]
const FLIGHT_RADIUS = 4
// Marker colors shared by their map layer, info-card icon and legend swatch.
const TURBINE_COLOR = '#4ade80'
const SOLAR_COLOR = '#facc15'

// MapLibre requires a zoom ("interpolate"/"step") subexpression to be the
// TOP-LEVEL expression — it can't be nested inside `case`/`+`/etc, even
// once. So the selected-feature radius bump can't wrap CIRCLE_RADIUS_EXPR;
// it has to rebuild the same interpolate with a per-stop `case` as the
// bumped/unbumped value, using RADIUS_STOPS as the single source of truth
// so it can never drift from CIRCLE_RADIUS_EXPR's own stops.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bumpedRadiusExpr(matchExpr: any[], bump: number): any[] {
  return [
    'interpolate', ['linear'], ['zoom'],
    ...RADIUS_STOPS.flatMap(([zoom, radius]) => [zoom, ['case', matchExpr, radius + bump, radius]]),
  ]
}

// Base styles live in lib/map/baseStyles.ts — OpenFreeMap vector for
// light/dark (railways + the road hierarchy the old Carto rasters lacked),
// ESRI raster for satellite, Carto raster as offline fallback. Switching
// styles replaces the WHOLE style (map.setStyle), which wipes our data
// sources/layers — addDataLayers() re-adds them on every style.load.

export const DenmarkMap = forwardRef<DenmarkMapHandle, Props>(function DenmarkMap({
  activeLayers, mapStyle,
  vehicleTypes, roadCategories,
  onVehicleTypeToggle, onVehicleTypesReset,
  onRoadCategoryToggle, onRoadCategoriesReset,
}, ref) {
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
  // "already fitBounds-ed for this selection" guard — keyed by kind+id so
  // switching selections (or reselecting after a deselect) fits again, but
  // data polls for the SAME selection don't re-fit.
  const fittedKeyRef = useRef<string | null>(null)
  // Position tweening between polls — created in the map's load handler
  // (after their sources exist), disposed before map.remove().
  const vehicleAnimRef = useRef<SourceAnimator | null>(null)
  const flightAnimRef = useRef<SourceAnimator | null>(null)

  const { data: weatherData } = useWeather()
  const { data: vehicleData } = useVehicles(vehicleBbox)
  const { data: roadTrafficData } = useRoadTraffic()
  const { data: journeyData, isLoading: journeyLoading } = useJourney(selected?.kind === 'vehicle' ? selected.jid : null)
  const { data: flightsData } = useFlights()

  // Latest filter sets + enable callbacks, reachable from the map's `load`
  // closure and the selection helpers below without stale captures.
  const vehicleTypesRef = useRef(vehicleTypes)
  vehicleTypesRef.current = vehicleTypes
  const roadCategoriesRef = useRef(roadCategories)
  roadCategoriesRef.current = roadCategories
  const onVehicleTypeToggleRef = useRef(onVehicleTypeToggle)
  onVehicleTypeToggleRef.current = onVehicleTypeToggle
  const onRoadCategoryToggleRef = useRef(onRoadCategoryToggle)
  onRoadCategoryToggleRef.current = onRoadCategoryToggle

  // ── Shared selection helpers — click handlers AND focus() (the search
  // modal's entry point) both funnel through these, so selecting a result
  // opens exactly what clicking the feature would. Refs keep these callable
  // from the map's `load` closure (registered once) without stale state.
  // Selecting a feature whose type/category is filtered out (only reachable
  // via search focus — hidden dots can't be clicked) re-enables that filter,
  // otherwise the cleanup effect would instantly close the fresh selection.
  const selectVehicle = (jid: string, name: string, type: VehicleType, destination: string) => {
    if (!vehicleTypesRef.current.has(type)) onVehicleTypeToggleRef.current(type)
    setPopupRef.current({ kind: 'vehicle', jid, name, type, destination })
    setSelectedRef.current({ kind: 'vehicle', jid })
  }
  const selectFlight = (id: string) => {
    setPopupRef.current(null)
    setSelectedRef.current({ kind: 'flight', id })
  }
  const selectSolar = (props: SolarProps) => {
    setPopupRef.current({ kind: 'solar', ...props })
    setSelectedRef.current(null)
  }
  const selectTurbine = (props: TurbineProps) => {
    setPopupRef.current({ kind: 'turbine', ...props })
    setSelectedRef.current(null)
  }
  const selectRoad = (props: RoadProps) => {
    if (!roadCategoriesRef.current.has(props.category)) onRoadCategoryToggleRef.current(props.category)
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
        case 'solar':
          flyTo(target.lon, target.lat, 10)
          selectSolar(target.props)
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

  // Style tracking for setStyle-based switching. mapStyleRef carries the
  // prop into the once-only init effect; appliedStyleRef prevents the
  // switch effect from re-applying the style the map was created with.
  const mapStyleRef = useRef(mapStyle)
  mapStyleRef.current = mapStyle
  const appliedStyleRef = useRef<MapStyle | null>(null)
  // Bumped after a style switch re-adds the data layers — every effect that
  // writes source data / layer state depends on it, so filters, visibility,
  // selection emphasis and feature data all re-apply to the fresh layers.
  const [styleEpoch, setStyleEpoch] = useState(0)

  // All app data sources/layers. Called on first load AND after every
  // map.setStyle (a style swap wipes user-added sources/layers). Event
  // handlers are NOT registered here — map.on(...) survives setStyle.
  // Guarded so overlapping style.load events can't double-add.
  const addDataLayers = (map: maplibregl.Map) => {
    if (map.getSource('weather-stations')) return

    // ── Weather labels ──────────────────────────────────────────────────────
    map.addSource('weather-stations', { type: 'geojson', data: EMPTY_FC })
    map.addLayer({
      id: 'weather-labels',
      type: 'symbol',
      source: 'weather-stations',
      layout: {
        'text-field': ['concat', ['to-string', ['round', ['get', 'temperature']]], '°'],
        'text-font': MAP_FONT,
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

    // ── Wind turbines — simple green dots ───────────────────────────────────
    map.addSource('wind-turbines', { type: 'geojson', data: WIND_TURBINES_GEOJSON })
    map.addLayer({
      id: 'turbine-circles',
      type: 'circle',
      source: 'wind-turbines',
      paint: {
        'circle-radius': CIRCLE_RADIUS_EXPR,
        'circle-color': TURBINE_COLOR,
        'circle-opacity': BASE_CIRCLE_OPACITY,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': 'rgba(255,255,255,0.35)',
      },
    })

    // ── Solar parks — amber dots, sibling of turbines under the energy layer ─
    map.addSource('solar-parks', { type: 'geojson', data: SOLAR_PARKS_GEOJSON })
    map.addLayer({
      id: 'solar-circles',
      type: 'circle',
      source: 'solar-parks',
      paint: {
        'circle-radius': CIRCLE_RADIUS_EXPR,
        'circle-color': SOLAR_COLOR,
        'circle-opacity': BASE_CIRCLE_OPACITY,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': 'rgba(255,255,255,0.35)',
      },
    })

    // ── Metro & letbane network — static line overlay ───────────────────────
    // The vector basemap only carries transit geometry from ~z11 and never at
    // country zoom, and Rejseplanen has NO live metro positions — so the
    // driverless metro (and letbane) is drawn from a baked OSM dataset as its
    // own always-on lines, visible at every zoom like the bus dots. A dark
    // casing lifts the colored line off the dark tiles.
    map.addSource('metro-lines', { type: 'geojson', data: METRO_LINES_GEOJSON })
    map.addLayer({
      id: 'metro-lines-casing',
      type: 'line',
      source: 'metro-lines',
      paint: {
        'line-color': '#000000',
        'line-opacity': 0.5,
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 2.5, 11, 4, 16, 8],
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    })
    map.addLayer({
      id: 'metro-lines',
      type: 'line',
      source: 'metro-lines',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1.5, 11, 2.5, 16, 5],
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    })

    // ── Selected journey — route line + stop dots (beneath vehicle dots) ────
    map.addSource('journey-route', { type: 'geojson', data: EMPTY_FC })
    map.addSource('journey-stops', { type: 'geojson', data: EMPTY_FC })

    // Dark casing under the route line — gives it definition on the light
    // and satellite tiles; blends invisibly into the dark tiles.
    map.addLayer({
      id: 'journey-route-casing',
      type: 'line',
      source: 'journey-route',
      paint: {
        'line-color': '#000000',
        'line-width': 7,
        'line-opacity': ['case', ['==', ['get', 'phase'], 'ahead'], 0.18, 0.35],
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    })
    map.addLayer({
      id: 'journey-route',
      type: 'line',
      source: 'journey-route',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 4,
        // Traveled portion (or the whole flight's origin->plane leg) full
        // opacity; the portion ahead dims — set on features via `phase`.
        // Flight routes flagged `mismatch` (typical route implausible for
        // the live position) render at half strength; vehicle features
        // carry no `mismatch` property, which evaluates false here.
        'line-opacity': [
          '*',
          ['case', ['==', ['get', 'phase'], 'ahead'], 0.55, 0.9],
          ['case', ['==', ['get', 'mismatch'], true], 0.5, 1],
        ],
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

    // ── Live vehicles — coloured dots ───────────────────────────────────────
    map.addSource('vehicles', { type: 'geojson', data: EMPTY_FC })
    // Tween duration slightly under the 30s poll interval so every glide
    // completes despite SWR timing jitter. Animators are created once —
    // they survive style switches (getSource is resolved per frame).
    if (!vehicleAnimRef.current) {
      vehicleAnimRef.current = createSourceAnimator(map, 'vehicles', { durationMs: 25_000 })
    }
    map.addLayer({
      id: 'vehicle-circles',
      type: 'circle',
      source: 'vehicles',
      paint: {
        'circle-radius': CIRCLE_RADIUS_EXPR,
        'circle-color': VEHICLE_COLOR_EXPR,
        'circle-opacity': BASE_CIRCLE_OPACITY,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': 'rgba(255,255,255,0.35)',
      },
    })

    // ── Road traffic ────────────────────────────────────────────────────────
    map.addSource('road-traffic', { type: 'geojson', data: EMPTY_FC })
    map.addLayer({
      id: 'road-circles',
      type: 'circle',
      source: 'road-traffic',
      paint: {
        'circle-radius': CIRCLE_RADIUS_EXPR,
        'circle-color': ROAD_COLOR_EXPR,
        'circle-opacity': BASE_CIRCLE_OPACITY,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': 'rgba(255,255,255,0.35)',
      },
    })

    // ── Live aircraft — ADS-B positions over Denmark ────────────────────────
    // The '✈' glyph is not present in the fontstack (renders as tofu), so
    // this ships as a circle layer — mirrors vehicle-circles.
    map.addSource('flights', { type: 'geojson', data: EMPTY_FC })
    // 15s flight poll → 12s tween, same jitter margin as vehicles.
    if (!flightAnimRef.current) {
      flightAnimRef.current = createSourceAnimator(map, 'flights', { durationMs: 12_000 })
    }
    map.addLayer({
      id: 'flight-icons',
      type: 'circle',
      source: 'flights',
      paint: {
        'circle-radius': FLIGHT_RADIUS,
        'circle-color': '#f472b6',
        'circle-opacity': BASE_CIRCLE_OPACITY,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': 'rgba(255,255,255,0.35)',
      },
    })
  }

  // ── Init map once ──────────────────────────────────────────────────────────
  // Async: the vector base style JSON is fetched (or falls back to raster)
  // before the map is constructed — MapLibre then needs no second style
  // pass on mount.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false

    ;(async () => {
    const style = await getBaseStyle(mapStyleRef.current)
    if (cancelled || !containerRef.current || mapRef.current) return
    appliedStyleRef.current = mapStyleRef.current

    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      center: DENMARK_CENTER,
      zoom: DENMARK_ZOOM,
      minZoom: 5,
      maxZoom: 16,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    // Registered before 'load' — style/tile errors can fire pre-load. Having
    // ANY 'error' listener suppresses MapLibre's default console.error, so
    // transient tile fetch failures (flaky Esri satellite endpoint) drop to
    // debug while everything else still surfaces loudly.
    map.on('error', (e) => {
      const err = e.error
      const isTileNoise =
        err instanceof maplibregl.AJAXError ||
        /failed to fetch|networkerror|load failed|timeout|abort/i.test(err?.message ?? '')
      if (isTileNoise) console.debug('[map] tile/network error:', err?.message ?? err)
      else console.error('[map]', err)
    })

    // Sprite images resolve async after the first tiles render — MapLibre
    // warns per missing icon in that window. A registered handler downgrades
    // this to debug; the icons appear once the sprite arrives.
    map.on('styleimagemissing', (e) => console.debug('[map] style image pending:', e.id))

    map.on('load', () => {
      addDataLayers(map)

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

      onLayerClick('solar-circles', 9, (f) => {
        const p = f.properties as { name: string; capacity_mw: number; year: number | null }
        selectSolar({ name: p.name, capacity_mw: p.capacity_mw, year: p.year ?? null })
      })

      onLayerClick('vehicle-circles', 9, (f) => {
        const p = f.properties as { jid: string; name: string; destination: string; type: VehicleType }
        selectVehicle(p.jid, p.name, p.type, p.destination ?? '')
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

      onLayerClick('flight-icons', 10, (f) => {
        const p = f.properties as { id: string }
        // No popup card for flights — FlightPanel renders instead, driven by
        // `selected` + a live lookup into the flights SWR data (so it always
        // reflects the aircraft's current position/alt/speed, not a stale
        // click-time snapshot).
        selectFlight(p.id ?? '')
      })

      // Click-away deselect: a plain (non-layer) click handler fires on every
      // click alongside the per-layer ones above; when the click hit no
      // interactive feature, clear the selection and any open card. Order vs
      // the layer handlers is irrelevant — this is a no-op on feature hits.
      // Layer ids are filtered to the ones currently present: during a style
      // switch there is a brief window with no data layers, and
      // queryRenderedFeatures throws on unknown ids.
      map.on('click', (e) => {
        const layers = ['turbine-circles', 'solar-circles', 'vehicle-circles', 'road-circles', 'flight-icons']
          .filter((id) => map.getLayer(id) !== undefined)
        const hits = layers.length === 0 ? [] : map.queryRenderedFeatures(e.point, { layers })
        if (hits.length === 0) {
          setPopupRef.current(null)
          setSelectedRef.current(null)
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
    // Dev-only escape hatch: driving the map from browser-automation
    // tooling (screenshots, QA scripts) needs a handle — MapLibre exposes
    // no global. Compiled out of production builds.
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).__danmarkMap = map
    }
    })()

    return () => {
      cancelled = true
      vehicleAnimRef.current?.dispose()
      vehicleAnimRef.current = null
      flightAnimRef.current?.dispose()
      flightAnimRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  // ── Switch base style ──────────────────────────────────────────────────────
  // map.setStyle replaces everything, so after the new style loads the data
  // layers are re-added and styleEpoch re-runs every state-applying effect.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    if (appliedStyleRef.current === mapStyle) return
    appliedStyleRef.current = mapStyle
    let cancelled = false
    ;(async () => {
      const style = await getBaseStyle(mapStyle)
      if (cancelled || mapRef.current !== map) return
      // diff: false is load-bearing. With diffing (the default), a
      // successful diff between two similar styles applies the delta —
      // which REMOVES our data layers — and never fires 'style.load', so
      // addDataLayers below would never run. A full swap always fires it.
      map.setStyle(style, { diff: false })
      map.once('style.load', () => {
        if (mapRef.current !== map) return
        addDataLayers(map)
        setStyleEpoch((e) => e + 1)
      })
    })()
    return () => { cancelled = true }
  }, [mapReady, mapStyle])

  // ── Update weather stations ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const stations = weatherData?.data?.stations ?? []
    ;(map.getSource('weather-stations') as maplibregl.GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: stations
        .filter((s) => s.temperature !== undefined)
        .map((s) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
          properties: { temperature: s.temperature!, stationId: s.stationId },
        })),
    })
  }, [mapReady, styleEpoch, weatherData])

  // ── Update vehicles — fed through the animator, not setData directly, so
  // dots glide to the fresh positions instead of teleporting each poll.
  // Keyed by jid: matches selection identity, so the emphasis paint
  // expressions keep matching mid-tween.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const vehicles = vehicleData?.data?.vehicles ?? []
    vehicleAnimRef.current?.update(
      vehicles.map((v) => ({
        id: v.jid,
        lon: v.lon,
        lat: v.lat,
        properties: { id: v.id, jid: v.jid, name: v.name, type: v.type, destination: v.destination },
      }))
    )
  }, [mapReady, styleEpoch, vehicleData])

  // ── Fitted-key reset on deselect ───────────────────────────────────────────
  // The camera deliberately stays where it is when a selection closes (no
  // jump-back); only the "already fitted" guard resets, so reselecting the
  // same vehicle/flight after a close re-fits its route.
  useEffect(() => {
    if (selected === null) fittedKeyRef.current = null
  }, [selected])

  // ── Selection emphasis — dim everything else while something is selected ──
  // The selected vehicle/flight's own layer keeps it at full opacity (+2px
  // radius) while dimming its siblings via a case-expression; every other
  // layer (turbines, roads, weather labels) dims uniformly. Deselecting
  // restores the shared base constants — MapLibre has no "reset paint prop".
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    if (!map.getLayer('vehicle-circles')) return

    if (selected !== null) {
      map.setPaintProperty('turbine-circles', 'circle-opacity', DIMMED_OPACITY)
      map.setPaintProperty('solar-circles', 'circle-opacity', DIMMED_OPACITY)
      map.setPaintProperty('road-circles', 'circle-opacity', DIMMED_OPACITY)
      map.setPaintProperty('weather-labels', 'text-opacity', DIMMED_TEXT_OPACITY)

      const vehicleJid = selected.kind === 'vehicle' ? selected.jid : ''
      map.setPaintProperty('vehicle-circles', 'circle-opacity', [
        'case', ['==', ['get', 'jid'], vehicleJid], 1, DIMMED_OPACITY,
      ])
      map.setPaintProperty(
        'vehicle-circles', 'circle-radius',
        bumpedRadiusExpr(['==', ['get', 'jid'], vehicleJid], 2)
      )

      const flightId = selected.kind === 'flight' ? selected.id : ''
      map.setPaintProperty('flight-icons', 'circle-opacity', [
        'case', ['==', ['get', 'id'], flightId], 1, DIMMED_OPACITY,
      ])
      map.setPaintProperty('flight-icons', 'circle-radius', [
        'case', ['==', ['get', 'id'], flightId], FLIGHT_RADIUS + 2, FLIGHT_RADIUS,
      ])
    } else {
      map.setPaintProperty('turbine-circles', 'circle-opacity', BASE_CIRCLE_OPACITY)
      map.setPaintProperty('solar-circles', 'circle-opacity', BASE_CIRCLE_OPACITY)
      map.setPaintProperty('road-circles', 'circle-opacity', BASE_CIRCLE_OPACITY)
      map.setPaintProperty('weather-labels', 'text-opacity', 1)
      map.setPaintProperty('vehicle-circles', 'circle-opacity', BASE_CIRCLE_OPACITY)
      map.setPaintProperty('vehicle-circles', 'circle-radius', CIRCLE_RADIUS_EXPR)
      map.setPaintProperty('flight-icons', 'circle-opacity', BASE_CIRCLE_OPACITY)
      map.setPaintProperty('flight-icons', 'circle-radius', FLIGHT_RADIUS)
    }
  }, [mapReady, styleEpoch, selected])

  // ── Update selected route (vehicle journey OR flight origin→plane→dest) ────
  // Both branches share the `journey-route` / `journey-stops` sources (they
  // are generic line+points sources) — a single effect owns both so they
  // can never clobber each other. Each also fits the full route into view
  // ONCE per selection (guarded by `fittedKeyRef`, keyed by kind+id) and
  // splits the line into a traveled (`phase:'reached'`, full opacity) and
  // ahead (`phase:'ahead'`, dimmed) portion.
  const FLIGHT_ROUTE_COLOR = '#f472b6'

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const clearRoute = () => {
      ;(map.getSource('journey-route') as maplibregl.GeoJSONSource | undefined)?.setData(EMPTY_FC)
      ;(map.getSource('journey-stops') as maplibregl.GeoJSONSource | undefined)?.setData(EMPTY_FC)
    }

    // Fits the given coordinates into the visible map area, panel-aware —
    // only called once per selection (see call sites' fittedKeyRef guard).
    const fitToRoute = (coords: [number, number][]) => {
      if (coords.length === 0) return
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds()
      )
      const isMobile = window.innerWidth < 1024
      map.fitBounds(bounds, {
        padding: isMobile
          ? { top: 96, bottom: 200, left: 32, right: 32 }
          : { top: 96, bottom: 96, left: 336, right: 48 },
        maxZoom: 11,
        duration: 700,
      })
    }

    if (selected?.kind === 'vehicle') {
      const journey = journeyData?.data?.journey
      const selectedType = popupInfo?.kind === 'vehicle' ? popupInfo.type : 'other'
      const color = TYPE_COLOR[selectedType] ?? '#94a3b8'

      if (!journey) { clearRoute(); return }

      const selKey = `vehicle:${selected.jid}`

      // Nearest-vertex split at the vehicle's live position (bbox-scoped
      // `vehicleData`, so it may not include this vehicle — falls back to
      // drawing the whole line as "ahead" when unavailable).
      const vehicle = vehicleData?.data?.vehicles.find((v) => v.jid === selected.jid)
      let splitIndex = -1
      if (vehicle) {
        let bestDist = Infinity
        journey.line.forEach(([lon, lat], i) => {
          const dLon = lon - vehicle.lon
          const dLat = lat - vehicle.lat
          const d = dLon * dLon + dLat * dLat
          if (d < bestDist) { bestDist = d; splitIndex = i }
        })
      }

      const routeFeatures: GeoJSON.Feature[] = []
      if (splitIndex === -1) {
        if (journey.line.length >= 2) {
          routeFeatures.push({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: journey.line },
            properties: { color, phase: 'ahead' },
          })
        }
      } else {
        const reached = journey.line.slice(0, splitIndex + 1)
        const ahead = journey.line.slice(splitIndex)
        if (reached.length >= 2) {
          routeFeatures.push({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: reached },
            properties: { color, phase: 'reached' },
          })
        }
        if (ahead.length >= 2) {
          routeFeatures.push({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: ahead },
            properties: { color, phase: 'ahead' },
          })
        }
      }

      ;(map.getSource('journey-route') as maplibregl.GeoJSONSource | undefined)?.setData({
        type: 'FeatureCollection',
        features: routeFeatures,
      })
      ;(map.getSource('journey-stops') as maplibregl.GeoJSONSource | undefined)?.setData({
        type: 'FeatureCollection',
        features: journey.stops.map((s) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
          properties: { name: s.name, color },
        })),
      })

      if (fittedKeyRef.current !== selKey) {
        fitToRoute(journey.line)
        fittedKeyRef.current = selKey
      }
      return
    }

    if (selected?.kind === 'flight') {
      const aircraft = flightsData?.data?.aircraft.find((a) => a.id === selected.id)
      if (!aircraft) {
        // Landed / left coverage / stale position dropped — clear.
        // Deferred via queueMicrotask (same convention as LiveClock below)
        // since setState synchronously inside an effect body is disallowed.
        clearRoute()
        queueMicrotask(() => setSelected(null))
        return
      }

      if (!aircraft.route) {
        // Callsign unresolved (or lookup budget still pending) — the plane
        // stays selected, there is just no route to draw. fittedKeyRef is
        // intentionally NOT set here: if a later poll resolves the route,
        // it draws AND fits once at that point.
        clearRoute()
        return
      }
      const { origin, destination } = aircraft.route

      const selKey = `flight:${selected.id}`

      ;(map.getSource('journey-route') as maplibregl.GeoJSONSource | undefined)?.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [origin.lon, origin.lat],
                [aircraft.lon, aircraft.lat],
              ],
            },
            properties: { color: FLIGHT_ROUTE_COLOR, phase: 'reached', mismatch: aircraft.routeMismatch === true },
          },
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [aircraft.lon, aircraft.lat],
                [destination.lon, destination.lat],
              ],
            },
            properties: { color: FLIGHT_ROUTE_COLOR, phase: 'ahead', mismatch: aircraft.routeMismatch === true },
          },
        ],
      })
      ;(map.getSource('journey-stops') as maplibregl.GeoJSONSource | undefined)?.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [origin.lon, origin.lat] },
            properties: { name: origin.name, color: FLIGHT_ROUTE_COLOR },
          },
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [destination.lon, destination.lat] },
            properties: { name: destination.name, color: FLIGHT_ROUTE_COLOR },
          },
        ],
      })

      if (fittedKeyRef.current !== selKey) {
        fitToRoute([
          [origin.lon, origin.lat],
          [aircraft.lon, aircraft.lat],
          [destination.lon, destination.lat],
        ])
        fittedKeyRef.current = selKey
      }
      return
    }

    clearRoute()
  }, [mapReady, styleEpoch, selected, journeyData, flightsData, popupInfo, vehicleData])

  // ── Update road traffic ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const features = roadTrafficData?.data?.features ?? []
    ;(map.getSource('road-traffic') as maplibregl.GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features,
    })
  }, [mapReady, styleEpoch, roadTrafficData])

  // ── Update live aircraft — same animator treatment as vehicles ────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const aircraft = flightsData?.data?.aircraft ?? []
    flightAnimRef.current?.update(
      aircraft.map((a) => ({
        id: a.id,
        lon: a.lon,
        lat: a.lat,
        properties: { id: a.id, callsign: a.callsign, alt: a.alt, speed: a.speed, heading: a.heading },
      }))
    )
  }, [mapReady, styleEpoch, flightsData])

  // ── Sync data layer visibility ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    // Data layers are briefly absent while a style switch loads; the epoch
    // bump re-runs this once they're back.
    if (!map.getLayer('vehicle-circles')) return
    const vis = (id: string, show: boolean) => map.setLayoutProperty(id, 'visibility', show ? 'visible' : 'none')
    vis('weather-labels',  activeLayers.has('weather'))
    vis('turbine-circles', activeLayers.has('energy'))
    vis('solar-circles',   activeLayers.has('energy'))
    vis('vehicle-circles', activeLayers.has('transport'))
    // journey-route/journey-stops are shared by vehicle journeys AND flight
    // routes now — visible if either layer that can select something is on.
    vis('journey-route-casing', activeLayers.has('transport') || activeLayers.has('flights'))
    vis('journey-route',   activeLayers.has('transport') || activeLayers.has('flights'))
    vis('journey-stops',   activeLayers.has('transport') || activeLayers.has('flights'))
    vis('road-circles',    activeLayers.has('roadtraffic'))
    vis('flight-icons',    activeLayers.has('flights'))
    // Metro/letbane lines: on with the Transport layer, and the "Metro"
    // legend row toggles them (metro has no live dots, so that row drives
    // the network overlay instead of a filter that would match nothing).
    const showMetro = activeLayers.has('transport') && vehicleTypes.has('metro')
    vis('metro-lines-casing', showMetro)
    vis('metro-lines', showMetro)
  }, [mapReady, styleEpoch, activeLayers, vehicleTypes])

  // ── Per-type sub-filters ───────────────────────────────────────────────────
  // These effects OWN setFilter on their layers (selection emphasis is
  // paint-based, so there is no conflict today). If a selection filter is
  // ever introduced it must compose here as ['all', typeFilter,
  // selectionFilter] — never call setFilter on these layers elsewhere.
  // All-selected maps to `null` deliberately: features with values unknown
  // to the palette (upstream drift) still render in fallback gray; any
  // subset filter hides them.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    if (!map.getLayer('vehicle-circles')) return
    map.setFilter(
      'vehicle-circles',
      vehicleTypes.size === VEHICLE_TYPES.length
        ? null
        : (['in', ['get', 'type'], ['literal', [...vehicleTypes]]] as unknown as maplibregl.FilterSpecification)
    )
    map.setFilter(
      'road-circles',
      roadCategories.size === ROAD_CATEGORIES.length
        ? null
        : (['in', ['get', 'category'], ['literal', [...roadCategories]]] as unknown as maplibregl.FilterSpecification)
    )
  }, [mapReady, styleEpoch, vehicleTypes, roadCategories])

  // ── Toggling a layer off also clears its active selection/card ─────────────
  // Hiding the dots but leaving the panel + route + dim active reads as a bug;
  // the existing route/emphasis effects handle the cleanup once state clears.
  // Same rule for sub-filters: filtering out the selected feature's type or
  // category closes its panel too.
  useEffect(() => {
    if (selected?.kind === 'vehicle' && !activeLayers.has('transport')) {
      setSelected(null)
      setPopupInfo(null)
    }
    if (selected?.kind === 'flight' && !activeLayers.has('flights')) setSelected(null)
    if (popupInfo?.kind === 'vehicle' && (!activeLayers.has('transport') || !vehicleTypes.has(popupInfo.type))) {
      setSelected((s) => (s?.kind === 'vehicle' ? null : s))
      setPopupInfo(null)
    }
    if (popupInfo?.kind === 'turbine' && !activeLayers.has('energy')) setPopupInfo(null)
    if (popupInfo?.kind === 'solar' && !activeLayers.has('energy')) setPopupInfo(null)
    if (popupInfo?.kind === 'road' && (!activeLayers.has('roadtraffic') || !roadCategories.has(popupInfo.category))) setPopupInfo(null)
  }, [activeLayers, selected, popupInfo, vehicleTypes, roadCategories])

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
            route={selectedFlight.route}
            routeMismatch={selectedFlight.routeMismatch === true}
            alt={selectedFlight.alt}
            speed={selectedFlight.speed}
            onClose={closePopup}
          />
        </div>
      )}

      {popupInfo && popupInfo.kind !== 'vehicle' && (
        <div className="absolute top-3 left-3 z-20">
          <Card className="w-72 max-w-[calc(100vw-1.5rem)] shadow-lg gap-0 py-0">
            <CardHeader className="px-3 py-2.5 border-b border-border/60 bg-muted/30 rounded-t-xl">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {popupInfo.kind === 'turbine' ? (
                    <Wind size={14} className="shrink-0" style={{ color: TURBINE_COLOR }} />
                  ) : popupInfo.kind === 'solar' ? (
                    <Sun size={14} className="shrink-0" style={{ color: SOLAR_COLOR }} />
                  ) : (
                    <AlertTriangle size={14} className="text-orange-400 shrink-0" />
                  )}
                  <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase truncate">
                    {popupInfo.kind === 'turbine'
                      ? 'Vindmøllepark'
                      : popupInfo.kind === 'solar'
                        ? 'Solcellepark'
                        : (ROAD_LABEL[popupInfo.category] ?? 'Trafikhændelse')}
                  </span>
                </div>
                <button onClick={() => setPopupInfo(null)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                  <X size={13} />
                </button>
              </div>
            </CardHeader>

            <Separator />

            <CardContent className="px-3 py-2.5 flex flex-col gap-1.5 text-xs">
              {popupInfo.kind === 'turbine' ? (
                <>
                  <p className="text-sm font-semibold text-foreground">{popupInfo.name}</p>
                  <p className="text-muted-foreground">{popupInfo.capacity_mw} MW &middot; {popupInfo.turbines} møller &middot; {popupInfo.year}</p>
                </>
              ) : popupInfo.kind === 'solar' ? (
                <>
                  <p className="text-sm font-semibold text-foreground">{popupInfo.name}</p>
                  <p className="text-muted-foreground">{popupInfo.capacity_mw} MW{popupInfo.year ? ` · ${popupInfo.year}` : ''}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-foreground">{popupInfo.title || popupInfo.header}</p>
                  {popupInfo.kommune && <p className="text-muted-foreground">{popupInfo.kommune}</p>}
                  {popupInfo.direction && <p className="text-muted-foreground">→ {popupInfo.direction}</p>}
                  {(popupInfo.beginPeriod || popupInfo.endPeriod) && (
                    <div className="pt-1.5 border-t border-border/40 flex flex-col gap-1">
                      {popupInfo.beginPeriod && <p className="text-muted-foreground">Fra: {popupInfo.beginPeriod}</p>}
                      {popupInfo.endPeriod && <p className="text-muted-foreground">Til: {popupInfo.endPeriod}</p>}
                    </div>
                  )}
                  {popupInfo.description && (
                    <p className="pt-1.5 border-t border-border/40 text-muted-foreground leading-relaxed">{stripHtml(popupInfo.description)}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <MapLegend
        showTransport={showTransport}
        showRoads={showRoadTraffic}
        showEnergy={showEnergy}
        vehicleTypes={vehicleTypes}
        roadCategories={roadCategories}
        onVehicleTypeToggle={onVehicleTypeToggle}
        onVehicleTypesReset={onVehicleTypesReset}
        onRoadCategoryToggle={onRoadCategoryToggle}
        onRoadCategoriesReset={onRoadCategoriesReset}
      />
    </div>
  )
})
