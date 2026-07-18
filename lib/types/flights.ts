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
  /**
   * adsbdb's typical route for the callsign — enrichment only, null when the
   * callsign is unresolved (military/GA/charter) or the lookup budget for the
   * current poll is spent. May differ from the live filed plan.
   */
  route: FlightRoute | null
  /**
   * True when the aircraft is well off (>~150 km) the route's
   * origin→destination great circle — the typical-route data is likely stale
   * for this leg. Only set when `route` is non-null.
   */
  routeMismatch?: boolean
}

export interface FlightsResponse {
  data: { aircraft: Aircraft[]; updatedAt: string } | null
  error?: string
  updatedAt: string
}

export interface BoardFlight {
  /** Flight number, e.g. "SK932" — not an airport IATA code. */
  flightNo: string
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
