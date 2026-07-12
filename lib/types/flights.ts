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

export interface FlightsResponse {
  data: { aircraft: Aircraft[]; updatedAt: string } | null
  error?: string
  updatedAt: string
}

export interface BoardFlight {
  iata: string
  airline: string
  city: string
  scheduled: string
  expected: string
  delayed: boolean
  gate?: string
  terminal?: string
  status: string
}

export interface AirportBoardResponse {
  data: { flights: BoardFlight[]; direction: 'A' | 'D'; updatedAt: string } | null
  error?: string
  updatedAt: string
}
