export interface RouteAirport {
  iata: string
  name: string
  municipality: string
  lat: number
  lon: number
  countryIso: string
}

export interface FlightRoute {
  airline: string
  origin: RouteAirport
  destination: RouteAirport
}

export interface Aircraft {
  id: string
  callsign: string
  lat: number
  lon: number
  alt: number
  heading: number
  speed: number
  category: string
  airline: string
  origin: RouteAirport
  destination: RouteAirport
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

export type AirportCode = 'CPH' | 'BLL' | 'AAR'

export interface AirportBoardResponse {
  data: {
    flights: BoardFlight[]
    direction: 'A' | 'D'
    airport: AirportCode
    updatedAt: string
  } | null
  error?: string
  updatedAt: string
}
