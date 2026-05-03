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

interface DmiCapFeature {
  type: 'Feature'
  id: string
  properties: {
    identifier: string
    severity: string
    event: string
    areaDesc: string
    description: string
    onset: string
    expires: string
  }
  geometry?: { type: string; coordinates: unknown }
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
    const url = new URL('https://opendataapi.dmi.dk/v2/cap/collections/CAP_DK/items')
    url.searchParams.set('limit', '50')
    const res = await fetch(url.toString(), { next: { revalidate: 120 } })
    if (!res.ok) return []
    const data = await res.json()
    const features: DmiCapFeature[] = data.features ?? []
    return features.map((f) => ({
      id: f.id,
      severity: (f.properties.severity?.toLowerCase() as WarningSeverity) ?? 'minor',
      event: f.properties.event ?? '',
      area: f.properties.areaDesc ?? '',
      description: f.properties.description ?? '',
      onset: f.properties.onset ?? '',
      expires: f.properties.expires ?? '',
    }))
  } catch {
    return []
  }
}
