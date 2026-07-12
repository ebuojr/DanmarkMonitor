import type { Aircraft } from '@/lib/types/flights'

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

export async function fetchLiveAircraft(): Promise<Aircraft[]> {
  const res = await fetch(ADSB_URL, {
    next: { revalidate: 15 },
    headers: { 'User-Agent': 'DanmarkMonitor/1.0' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`adsb.lol fetch failed: ${res.status}`)
  const json = await res.json() as { ac?: RawAircraft[] }
  return (json.ac ?? [])
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
}
