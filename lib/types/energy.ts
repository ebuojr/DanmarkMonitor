export interface EnergyProduction {
  wind: number
  solar: number
  bio: number
  thermal: number
  hydro: number
  total: number
}

export interface EnergyData {
  production: EnergyProduction
  co2: number
  renewablesPct: number
  updatedAt: string
}

export interface EnergyResponse {
  data: EnergyData | null
  error?: string
  stale?: boolean
  updatedAt: string
}
