import type { Aircraft, FlightRoute } from '@/lib/types/flights'
import { lookupRoutes } from '@/lib/api/adsbdb'
import { distanceToSegmentKm } from '@/lib/geo'

// Free public API — no auth required
const ADSB_URL = 'https://api.adsb.lol/v2/lat/56.3/lon/10.5/dist/300'

// Positions older than this (adsb.lol `seen_pos`/`seen`, seconds) are
// dropped — a plane that landed or left coverage otherwise lingers at its
// last-known coordinate for the rest of the feed window.
const MAX_POS_AGE_S = 60
// Cold-cache adsbdb lookups allowed per poll; unresolved callsigns retry on
// later polls until the 6h/15min caches warm up.
const MAX_NEW_LOOKUPS_PER_POLL = 30
// A plane further than this from its route's origin→destination great circle
// is flying a different leg than the typical route (e.g. a repositioned
// callsign) — flagged so the UI can warn instead of presenting stale data
// as fact. En-route weather/ATC deviations stay well under this.
const ROUTE_MISMATCH_KM = 150

function routeMismatch(a: { lat: number; lon: number }, route: FlightRoute): boolean | undefined {
  const { origin, destination } = route
  const coords = [origin.lat, origin.lon, destination.lat, destination.lon]
  // adsbdb airport coords are community data — don't compute on junk.
  if (!coords.every(Number.isFinite)) return undefined
  return distanceToSegmentKm(a, origin, destination) > ROUTE_MISMATCH_KM
}

interface RawAircraft {
  hex: string
  flight?: string
  lat?: number
  lon?: number
  alt_baro?: number | string
  track?: number
  gs?: number
  t?: string
  r?: string
  seen?: number
  seen_pos?: number
}

/**
 * Fetches live ADS-B positions for every airborne aircraft near Denmark,
 * dropping stale positions, then enriches each with adsbdb.com's typical
 * route for its callsign where one resolves. Route is enrichment only —
 * aircraft with unresolved callsigns (military/GA/charter) are kept with
 * `route: null` rather than excluded. Lookups are budgeted per poll
 * (MAX_NEW_LOOKUPS_PER_POLL cold lookups, 6 concurrent); the adsbdb client
 * caches hits 6h (15min for confirmed-unknown), so the fleet resolves fully
 * over a couple of minutes and stays warm.
 */
export async function fetchLiveAircraft(): Promise<Aircraft[]> {
  const res = await fetch(ADSB_URL, {
    next: { revalidate: 15 },
    headers: { 'User-Agent': 'DanmarkMonitor/1.0' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`adsb.lol fetch failed: ${res.status}`)
  const json = await res.json() as { ac?: RawAircraft[] }
  const candidates = (json.ac ?? [])
    .filter((a) => {
      if (!a.lat || !a.lon) return false
      if (a.lat < 54 || a.lat > 58.5 || a.lon < 7 || a.lon > 15.5) return false
      if (a.alt_baro === 'ground' || a.alt_baro === 0) return false
      if ((a.seen_pos ?? a.seen ?? Infinity) > MAX_POS_AGE_S) return false
      return true
    })
    .map((a) => ({
      id: a.hex,
      callsign: (a.flight ?? a.r ?? a.hex).trim(),
      lat: a.lat!, lon: a.lon!,
      alt: typeof a.alt_baro === 'number' ? a.alt_baro : 0,
      heading: a.track ?? 0,
      speed: a.gs ?? 0,
      category: a.t ?? '',
    }))

  const routes = await lookupRoutes(candidates.map((a) => a.callsign), MAX_NEW_LOOKUPS_PER_POLL)

  return candidates.map((a): Aircraft => {
    const route = routes.get(a.callsign) ?? null
    return {
      ...a,
      route,
      routeMismatch: route ? routeMismatch(a, route) : undefined,
    }
  })
}
