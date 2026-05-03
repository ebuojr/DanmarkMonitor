export interface PricePoint {
  hourDK: string
  dk1: number | null
  dk2: number | null
}

export interface PriceData {
  current: PricePoint | null
  updatedAt: string
  isStale: boolean
}

export interface PriceResponse {
  data: PriceData | null
  error?: string
  updatedAt: string
}
