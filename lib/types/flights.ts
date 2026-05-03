export interface Aircraft {
  id: string
  callsign: string
  lat: number
  lon: number
  alt: number
  heading: number
  speed: number
  category: string
}

export interface FlightResponse {
  aircraft: Aircraft[]
  updatedAt: string
}
