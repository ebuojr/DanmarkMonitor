import type { WeatherStation, WeatherWarning, WarningSeverity } from '@/lib/types/weather'

const BASE_URL = 'https://opendataapi.dmi.dk/v2/metObs'
const DENMARK_BBOX = '7,54,16,58'

interface DmiObservationFeature {
  type: 'Feature'
  id: string
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: {
    stationId: string
    parameterId: string
    observed: string
    value: number
  }
}

// DMI's official Open Data CAP warnings collection requires an API key and
// is unreachable keyless, so warnings come instead from the undocumented
// site API the dmi.dk warnings page itself consumes (no key, returns an
// all-null payload when nothing is active — the common case). Item field
// names verified against DMI's own fixtures. Every field optional; soft-fail
// to "no warnings" like the app's other scraped surfaces.
const WARNINGS_URL = 'https://www.dmi.dk/dmidk_byvejrWS/rest/json/Danmark/DK/WarningOverview'

interface RawWarning {
  warningText?: string | null
  warningTitle?: string | null
  area?: string | null
  category?: string | number | null
  validFromText?: string | null
  validToText?: string | null
  additionalText?: string | null
}

interface RawWarningOverview {
  warnings?: RawWarning[] | null
}

// DMI category 1–4 -> the app's severity scale.
function categoryToSeverity(category: string | number | null | undefined): WarningSeverity {
  const n = typeof category === 'string' ? parseInt(category, 10) : category ?? 0
  if (n >= 4) return 'extreme'
  if (n === 3) return 'severe'
  if (n === 2) return 'moderate'
  return 'minor'
}

export async function fetchWeatherObservations(): Promise<WeatherStation[]> {
  const url = new URL(`${BASE_URL}/collections/observation/items`)
  url.searchParams.set('parameterId', 'temp_dry')
  url.searchParams.set('period', 'latest-hour')
  url.searchParams.set('bbox', DENMARK_BBOX)
  url.searchParams.set('limit', '300')

  const res = await fetch(url.toString(), { next: { revalidate: 600 } })
  if (!res.ok) throw new Error(`DMI obs fetch failed: ${res.status}`)

  const data = await res.json()
  const features: DmiObservationFeature[] = data.features ?? []

  const stationMap = new Map<string, WeatherStation>()
  for (const f of features) {
    const { stationId, value } = f.properties
    const [lon, lat] = f.geometry.coordinates
    if (!stationMap.has(stationId)) {
      stationMap.set(stationId, { stationId, name: stationId, lat, lon })
    }
    stationMap.get(stationId)!.temperature = value
  }

  return Array.from(stationMap.values())
}

export async function fetchWeatherWarnings(): Promise<WeatherWarning[]> {
  try {
    const res = await fetch(WARNINGS_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      next: { revalidate: 120 },
    })
    if (!res.ok) return []
    const data = (await res.json()) as RawWarningOverview
    const list = Array.isArray(data.warnings) ? data.warnings : []
    return list.map((w, i) => ({
      id: `${w.warningText ?? w.warningTitle ?? 'varsel'}-${w.area ?? ''}-${i}`,
      severity: categoryToSeverity(w.category),
      event: (w.warningText || w.warningTitle || 'Vejrvarsel').trim(),
      area: (w.area || '').trim(),
      description: (w.additionalText || '').replace(/\s+/g, ' ').trim(),
      onset: (w.validFromText || '').trim(),
      expires: (w.validToText || '').trim(),
    }))
  } catch {
    // Undocumented feed — network/timeout/shape drift reads as "no warnings".
    console.warn('[dmi] warnings fetch/parse failed — treating as no warnings')
    return []
  }
}
