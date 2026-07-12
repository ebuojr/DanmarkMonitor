export interface EnergyProduction {
  wind: number
  solar: number
  bio: number
  thermal: number
  hydro: number
  total: number
}

export interface EnergyExchangeFlow {
  label: string
  mw: number
}

export interface EnergyExchange {
  sum: number
  flows: EnergyExchangeFlow[]
}

export interface EnergyData {
  production: EnergyProduction
  windOffshore: number
  windOnshore: number
  exchange: EnergyExchange
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
