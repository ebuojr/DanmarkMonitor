export type VehicleType = 'ic' | 'regional' | 'stog' | 'metro' | 'bus' | 'other'

export interface Vehicle {
  id: string
  jid: string
  name: string
  lon: number
  lat: number
  type: VehicleType
  destination: string
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

export interface JourneyStop {
  name: string
  lat: number
  lon: number
  arr?: string
  dep?: string
  delayMin?: number
}

export interface Journey {
  name: string
  destination: string
  stops: JourneyStop[]
  line: [number, number][]
}

export interface JourneyResponse {
  data: { journey: Journey; updatedAt: string } | null
  error?: string
  updatedAt: string
}
