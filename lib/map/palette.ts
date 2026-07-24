import type { VehicleType } from '@/lib/types/transport'

// Single source of truth for map marker colors. The MapLibre match
// expressions are BUILT from these def arrays — a type/category can never be
// missing from the paint expression again (the old hand-written vehicle match
// omitted 'metro', so metro dots silently rendered fallback gray).

export interface VehicleTypeDef {
  type: VehicleType
  label: string
  color: string
  /** Data caveat shown in the legend (e.g. metro has no live positions). */
  note?: string
}

export const VEHICLE_TYPES: VehicleTypeDef[] = [
  { type: 'ic',       label: 'IC / Lyntog', color: '#f59e0b' },
  { type: 'regional', label: 'Regional',    color: '#fb923c' },
  { type: 'stog',     label: 'S-tog',       color: '#60a5fa' },
  // Rejseplanen's JourneyGeoPos feed carries NO positions for the driverless
  // metro (verified live 2026-07-23: central Copenhagen, all product
  // classes, onlyRT:false — 162 journeys, zero M-trains). So this row drives
  // the static metro+letbane NETWORK-LINE overlay (lib/data/metro-lines.ts)
  // instead of a dot filter — see the visibility effect in DenmarkMap. Do not
  // fabricate positions from headways.
  { type: 'metro',    label: 'Metro / Letbane', color: '#a78bfa', note: 'netværkslinjer' },
  { type: 'bus',      label: 'Bus',         color: '#4ade80' },
  { type: 'other',    label: 'Andet',       color: '#94a3b8' },
]

export const VEHICLE_TYPE_IDS: readonly VehicleType[] = VEHICLE_TYPES.map((t) => t.type)

export const TYPE_COLOR: Record<string, string> = Object.fromEntries(
  VEHICLE_TYPES.map(({ type, color }) => [type, color])
)

export interface RoadCategoryDef {
  category: string
  label: string
  color: string
}

export const ROAD_CATEGORIES: RoadCategoryDef[] = [
  { category: 'roadblocks',                  label: 'Vejspærring',      color: '#ef4444' },
  { category: 'blocking-roadwork',           label: 'Blok. vejarbejde', color: '#f43f5e' },
  { category: 'blocking-events',             label: 'Blok. hændelse',   color: '#dc2626' },
  { category: 'roadwork',                    label: 'Vejarbejde',       color: '#fb923c' },
  { category: 'other-traffic-announcements', label: 'Trafikmeddelelse', color: '#f97316' },
  { category: 'events',                      label: 'Hændelse',         color: '#eab308' },
  { category: 'queue',                       label: 'Kødannelse',       color: '#a78bfa' },
  { category: 'ice-snow',                    label: 'Is / sne',         color: '#7dd3fc' },
  { category: 'winther-road',                label: 'Vintervej',        color: '#93c5fd' },
]

export const ROAD_CATEGORY_IDS: readonly string[] = ROAD_CATEGORIES.map((c) => c.category)

// Fallback for feature values not present in the defs (e.g. a road category
// the upstream feed adds without notice).
export const FALLBACK_COLOR = '#94a3b8'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const VEHICLE_COLOR_EXPR: any[] = [
  'match', ['get', 'type'],
  ...VEHICLE_TYPES.flatMap(({ type, color }) => [type, color]),
  FALLBACK_COLOR,
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ROAD_COLOR_EXPR: any[] = [
  'match', ['get', 'category'],
  ...ROAD_CATEGORIES.flatMap(({ category, color }) => [category, color]),
  FALLBACK_COLOR,
]
