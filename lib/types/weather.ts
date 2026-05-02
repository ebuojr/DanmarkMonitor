export interface WeatherStation {
  stationId: string
  name: string
  lat: number
  lon: number
  temperature?: number
  humidity?: number
  windSpeed?: number
  windDirection?: number
  pressure?: number
}

export type WarningSeverity = 'minor' | 'moderate' | 'severe' | 'extreme'

export interface WeatherWarning {
  id: string
  severity: WarningSeverity
  event: string
  area: string
  description: string
  onset: string
  expires: string
  polygon?: [number, number][]
}

export interface WeatherData {
  stations: WeatherStation[]
  warnings: WeatherWarning[]
  updatedAt: string
}

export interface WeatherResponse {
  data: WeatherData | null
  error?: string
  stale?: boolean
  updatedAt: string
}
