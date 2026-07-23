import type maplibregl from 'maplibre-gl'

// Basemap styles. Light and dark are OpenFreeMap VECTOR styles (free, no
// key, no registration — fits the repo's no-API-keys rule): unlike the old
// Carto raster tiles they carry railways and the full road hierarchy, which
// is the point of a transport dashboard. Satellite stays ESRI raster
// imagery. If the OpenFreeMap style JSON can't be fetched (offline, outage)
// we fall back to the previous Carto raster tiles — less detail, but a map.

export type MapStyle = 'light' | 'dark' | 'satellite'

// One glyph endpoint for every style (including satellite/fallbacks) so the
// weather symbol layer always uses the same fontstack. If OpenFreeMap is
// fully down the raster fallback still renders — only text labels drop.
const OFM_GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf'
// Same sprite as the OFM vector styles. The satellite/fallback layers use no
// icons themselves, but during a rapid style flip MapLibre can briefly
// resolve icon refs from the incoming style against the current sprite —
// carrying the sprite everywhere silences "image could not be loaded" noise.
const OFM_SPRITE = 'https://tiles.openfreemap.org/sprites/ofm_f384/ofm'
/** The only fontstack guaranteed present across all OpenFreeMap styles. */
export const MAP_FONT = ['Noto Sans Regular']

const STYLE_URLS: Record<'light' | 'dark', string> = {
  // 'bright' over 'positron': the user-visible reason for vector tiles is
  // road/rail/POI detail, and positron is deliberately minimal.
  light: 'https://tiles.openfreemap.org/styles/bright',
  dark: 'https://tiles.openfreemap.org/styles/dark',
}

// OpenFreeMap's stock dark style is near-monochrome: rails rgb(35,35,35) on
// a rgb(12,12,12) background from z13/z16 only, roads #181818. These
// overrides lift roads/rails/water into legibility while keeping the dark
// aesthetic. Keyed by layer id in the upstream style; unknown ids are
// ignored, so upstream renames degrade to "no override", never a crash.
interface LayerOverride {
  minzoom?: number
  paint?: Record<string, unknown>
  /** Full filter replacement (MapLibre expression). */
  filter?: unknown
}

// Both OFM styles exclude brunnel=tunnel from their `transit` layers — and
// the Copenhagen Metro is almost entirely tunnel, so metro (and letbane
// sections in cuttings) never rendered at all. Replacement filters keep the
// class check but drop the tunnel exclusion. (Tile data carries transit
// geometry from ~z13 — earlier than that there is nothing to draw.)
const TRANSIT_FILTER: unknown = [
  'all',
  ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
  ['==', ['get', 'class'], 'transit'],
]

const DARK_OVERRIDES: Record<string, LayerOverride> = {
  // Land/water separation — stock water is 27,27,29 vs 12,12,12 land.
  water: { paint: { 'fill-color': '#151a22' } },
  // Railways: visible color + hatching, and country-zoom minzoom (rail data
  // exists in the tiles from ~z8) — this is a train-monitoring app.
  railway: { minzoom: 8, paint: { 'line-color': '#565660' } },
  railway_dashline: { minzoom: 8, paint: { 'line-color': '#181820' } },
  railway_minor: { minzoom: 13, paint: { 'line-color': '#565660' } },
  railway_minor_dashline: { minzoom: 13, paint: { 'line-color': '#181820' } },
  // Transit = metro / letbane / tram. Slightly bluer than heavy rail so the
  // two systems read apart at a glance.
  railway_transit: { minzoom: 13, filter: TRANSIT_FILTER, paint: { 'line-color': '#6e6e84' } },
  railway_transit_dashline: { minzoom: 13, filter: TRANSIT_FILTER, paint: { 'line-color': '#181820' } },
  // Road hierarchy: lift each class a step above the background.
  highway_minor: { paint: { 'line-color': '#26262b' } },
  highway_major_inner: { paint: { 'line-color': '#303036' } },
  highway_major_casing: { paint: { 'line-color': 'rgba(88,88,96,0.8)' } },
  highway_major_subtle: { paint: { 'line-color': '#35353b' } },
  highway_motorway_inner: {
    paint: {
      'line-color': [
        'interpolate', ['linear'], ['zoom'],
        5.8, 'hsla(0,0%,85%,0.53)',
        6, '#3a3a44',
      ],
    },
  },
  highway_motorway_subtle: { paint: { 'line-color': '#2e2e36' } },
}

// The bright (light-mode) style needs only the tunnel-unhiding — its stock
// transit paint is already legible on the light background.
const BRIGHT_OVERRIDES: Record<string, LayerOverride> = {
  'railway-transit': { filter: TRANSIT_FILTER },
  'railway-transit-hatching': { filter: TRANSIT_FILTER },
}

function applyOverrides(
  style: maplibregl.StyleSpecification,
  overrides: Record<string, LayerOverride>
): maplibregl.StyleSpecification {
  for (const layer of style.layers) {
    const o = overrides[layer.id]
    if (!o) continue
    if (o.minzoom !== undefined) layer.minzoom = o.minzoom
    if (o.paint) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(layer as any).paint = { ...(layer as any).paint, ...o.paint }
    }
    if (o.filter !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(layer as any).filter = o.filter
    }
  }
  return style
}

const CARTO_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>'

function cartoRasterFallback(variant: 'dark_all' | 'rastertiles/voyager', paint: Record<string, number>): maplibregl.StyleSpecification {
  return {
    version: 8,
    glyphs: OFM_GLYPHS,
    sprite: OFM_SPRITE,
    sources: {
      'tiles-base': {
        type: 'raster',
        tiles: [
          `https://a.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}.png`,
          `https://b.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}.png`,
        ],
        tileSize: 256,
        attribution: CARTO_ATTRIBUTION,
      },
    },
    layers: [{ id: 'base-raster', type: 'raster', source: 'tiles-base', paint }],
  }
}

const FALLBACKS: Record<'light' | 'dark', () => maplibregl.StyleSpecification> = {
  dark: () =>
    cartoRasterFallback('dark_all', {
      'raster-brightness-min': 0.08,
      'raster-brightness-max': 0.95,
      'raster-contrast': 0.25,
      'raster-saturation': -0.1,
    }),
  light: () =>
    cartoRasterFallback('rastertiles/voyager', {
      'raster-contrast': 0.1,
      'raster-brightness-max': 0.95,
    }),
}

const SATELLITE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: OFM_GLYPHS,
  sprite: OFM_SPRITE,
  sources: {
    'tiles-satellite': {
      type: 'raster',
      // ESRI World Imagery — free with attribution, note {y}/{x} path order
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution:
        '© Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, GIS User Community',
    },
  },
  layers: [{ id: 'base-satellite', type: 'raster', source: 'tiles-satellite' }],
}

const cache = new Map<MapStyle, Promise<maplibregl.StyleSpecification>>()

/**
 * Resolve the base style spec for a map style. Vector styles are fetched
 * once and cached; a fetch failure resolves to the raster fallback WITHOUT
 * caching, so the next style switch retries OpenFreeMap.
 */
export function getBaseStyle(style: MapStyle): Promise<maplibregl.StyleSpecification> {
  if (style === 'satellite') return Promise.resolve(SATELLITE_STYLE)
  const cached = cache.get(style)
  if (cached) return cached
  const promise = fetch(STYLE_URLS[style])
    .then((res) => {
      if (!res.ok) throw new Error(`style fetch ${res.status}`)
      return res.json() as Promise<maplibregl.StyleSpecification>
    })
    .then((spec) => applyOverrides(spec, style === 'dark' ? DARK_OVERRIDES : BRIGHT_OVERRIDES))
    .catch((err) => {
      console.warn(`[map] OpenFreeMap ${style} style unavailable, using raster fallback:`, err)
      cache.delete(style)
      return FALLBACKS[style]()
    })
  cache.set(style, promise)
  return promise
}
