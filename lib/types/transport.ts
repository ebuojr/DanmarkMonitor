export type DisruptionType = 'DELAY' | 'CANCELLATION' | 'DISRUPTION' | 'INFO'

export interface Disruption {
  id: string
  line: string
  type: DisruptionType
  message: string
  affectedLines: string[]
  startTime?: string
  endTime?: string
}

export interface TransportData {
  disruptions: Disruption[]
  updatedAt: string
}

export interface TransportResponse {
  data: TransportData | null
  error?: string
  stale?: boolean
  updatedAt: string
}

export type VehicleType = 'ic' | 'regional' | 'stog' | 'metro' | 'bus' | 'other'

export interface Vehicle {
  id: string
  name: string
  lon: number
  lat: number
  type: VehicleType
  category: number
  destination: string
  nextStop: string
  prevStop: string
  journeyRef: string
  delay?: number
  platform?: string
}

export interface VehicleData {
  vehicles: Vehicle[]
  updatedAt: string
}

export interface VehicleResponse {
  data: VehicleData | null
  error?: string
  updatedAt: string
}
