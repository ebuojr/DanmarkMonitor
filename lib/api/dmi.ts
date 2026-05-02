import type { WeatherStation, WeatherWarning, WarningSeverity } from '@/lib/types/weather'

const BASE_URL = 'https://dmigw.govcloud.dk/v2'

function getApiKey(): string {
  const key = process.env.DMI_API_KEY
  if (!key) throw new Error('DMI_API_KEY environment variable not set')
  return key
}

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
  const key = getApiKey()

  // Fetch latest temperature observations grouped by station
  const url = new URL(`${BASE_URL}/metObs/collections/observation/items`)
  url.searchParams.set('api-key', key)
  url.searchParams.set('parameterId', 'temp_dry')
  url.searchParams.set('period', 'latest-hour')
  url.searchParams.set('limit', '200')

  const res = await fetch(url.toString(), { next: { revalidate: 300 } })
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
    const station = stationMap.get(stationId)!
    station.temperature = value
  }

  return Array.from(stationMap.values())
}

export async function fetchWeatherWarnings(): Promise<WeatherWarning[]> {
  const key = getApiKey()

  const url = new URL(`${BASE_URL}/cap/collections/CAP_DK/items`)
  url.searchParams.set('api-key', key)
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
}
