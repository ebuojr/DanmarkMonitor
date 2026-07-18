import type { FlightRoute, RouteAirport } from '@/lib/types/flights'

// adsbdb.com — free, no auth, no batch endpoint. Community-run (no SLA), so
// results are cached hard and lookups are concurrency-limited to be polite.
const ADSBDB_BASE = 'https://api.adsbdb.com/v0/callsign'

const POSITIVE_TTL_MS = 6 * 60 * 60_000
const NEGATIVE_TTL_MS = 15 * 60_000
const MAX_ENTRIES = 1000
const MAX_CONCURRENCY = 6

interface CacheEntry {
  at: number
  route: FlightRoute | null
}

// Callsign key space is upstream-controlled (whatever adsb.lol reports), so
// cap size with oldest-eviction — same convention as the journey route cache.
const cache = new Map<string, CacheEntry>()

interface RawRouteAirport {
  country_iso_name?: string
  iata_code?: string
  icao_code?: string
  latitude?: number
  longitude?: number
  municipality?: string
  name?: string
}

interface RawFlightRouteResponse {
  response?: {
    flightroute?: {
      callsign?: string
      airline?: { name?: string }
      origin?: RawRouteAirport
      destination?: RawRouteAirport
    }
  } | string
}

function toRouteAirport(raw: RawRouteAirport | undefined): RouteAirport | null {
  if (!raw || raw.latitude === undefined || raw.longitude === undefined) return null
  return {
    iata: raw.iata_code ?? '',
    name: raw.name ?? '',
    municipality: raw.municipality ?? '',
    lat: raw.latitude,
    lon: raw.longitude,
    countryIso: raw.country_iso_name ?? '',
  }
}

function pruneAndCap() {
  // Hard size cap: attacker-controlled/high-cardinality callsigns from the
  // live feed could otherwise grow the map unbounded. Evict oldest-inserted.
  while (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) break
    cache.delete(oldest)
  }
}

/**
 * Look up a single callsign's route via adsbdb.com.
 *
 * Returns `null` for both "genuinely unknown callsign" (cached negatively)
 * and "network/upstream failure" (NOT cached, so a transient blip retries
 * on the next poll instead of permanently excluding the aircraft).
 */
function getFresh(key: string): CacheEntry | undefined {
  const hit = cache.get(key)
  if (!hit) return undefined
  const ttl = hit.route === null ? NEGATIVE_TTL_MS : POSITIVE_TTL_MS
  return Date.now() - hit.at < ttl ? hit : undefined
}

export async function lookupRoute(callsign: string): Promise<FlightRoute | null> {
  const key = callsign.trim().toUpperCase()
  if (!key) return null

  const now = Date.now()
  const hit = getFresh(key)
  if (hit) return hit.route

  let json: RawFlightRouteResponse
  try {
    // adsbdb responds with HTTP 404 (not 200) for a genuinely unknown
    // callsign, body `{"response":"unknown callsign"}` — a real, cacheable
    // answer, not a failure. So parse the body regardless of status; only a
    // network/timeout/non-JSON failure falls into the catch below.
    const res = await fetch(`${ADSBDB_BASE}/${encodeURIComponent(key)}`, {
      headers: { 'User-Agent': 'DanmarkMonitor/1.0' },
      signal: AbortSignal.timeout(5000),
    })
    json = (await res.json()) as RawFlightRouteResponse
  } catch {
    // Network/upstream/parse failure — do not negative-cache, let it retry.
    return null
  }

  const flightroute = typeof json.response === 'object' ? json.response?.flightroute : undefined
  const origin = toRouteAirport(flightroute?.origin)
  const destination = toRouteAirport(flightroute?.destination)

  let route: FlightRoute | null = null
  if (flightroute && origin && destination) {
    route = {
      airline: flightroute.airline?.name ?? '',
      origin,
      destination,
    }
  }

  // Genuine resolution (known-unknown or known-route) — safe to cache.
  pruneAndCap()
  cache.set(key, { at: now, route })
  return route
}

/**
 * Resolve routes for many callsigns at once, using the shared cache and a
 * simple concurrency-limited pool (no new deps) since adsbdb has no batch
 * endpoint.
 *
 * Cache hits (positive AND negative) are always served. Cache misses consume
 * `maxNewLookups`; once spent, remaining unknowns are left out of the result
 * map (consumers treat missing as "route unknown") and retry on later polls.
 * Keeps a cold-cache poll bounded instead of firing hundreds of lookups at a
 * community-run upstream in one go.
 */
export async function lookupRoutes(
  callsigns: string[],
  maxNewLookups = Infinity
): Promise<Map<string, FlightRoute | null>> {
  const result = new Map<string, FlightRoute | null>()
  const queue: string[] = []
  let budget = maxNewLookups

  for (const callsign of new Set(callsigns)) {
    const key = callsign.trim().toUpperCase()
    if (!key) {
      result.set(callsign, null)
      continue
    }
    const hit = getFresh(key)
    if (hit) {
      result.set(callsign, hit.route)
      continue
    }
    if (budget > 0) {
      budget--
      queue.push(callsign)
    }
  }

  let i = 0
  async function worker() {
    while (i < queue.length) {
      const idx = i++
      const callsign = queue[idx]
      const route = await lookupRoute(callsign)
      result.set(callsign, route)
    }
  }

  const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, queue.length) }, () => worker())
  await Promise.all(workers)
  return result
}
