import type { Aircraft } from '@/lib/types/flights'
import { lookupRoutes } from '@/lib/api/adsbdb'

// Free public API — no auth required
const ADSB_URL = 'https://api.adsb.lol/v2/lat/56.3/lon/10.5/dist/300'

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
}

/**
 * Fetches live ADS-B positions, then resolves each aircraft's route via
 * adsbdb.com and keeps only aircraft whose origin or destination is in
 * Denmark. Route-less (unresolved-callsign) aircraft are excluded — ADS-B
 * alone can't prove a Danish connection, so this deliberately drops
 * military/GA traffic with no filed route. Worst case ~80 lookups / 6
 * concurrent is a few seconds on a cold cache; the adsbdb client caches
 * hits for 6h (15min for confirmed-unknown), so subsequent polls are fast.
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

  const routes = await lookupRoutes(candidates.map((a) => a.callsign))

  const aircraft: Aircraft[] = []
  for (const a of candidates) {
    const route = routes.get(a.callsign)
    if (!route) continue
    if (route.origin.countryIso !== 'DK' && route.destination.countryIso !== 'DK') continue
    aircraft.push({ ...a, airline: route.airline, origin: route.origin, destination: route.destination })
  }
  return aircraft
}
