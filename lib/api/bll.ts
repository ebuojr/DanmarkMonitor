import type { BoardFlight } from '@/lib/types/flights'

// Billund's own site — undocumented Umbraco surface controller, no auth.
// Treat as change-without-notice, same as CPH.
const BLL_ARRIVALS_URL = 'https://www.bll.dk/umbraco/surface/FtpData/ArrivalFlightsData'
const BLL_DEPARTURES_URL = 'https://www.bll.dk/umbraco/surface/FtpData/DepartureFlightsData'

interface RawAirport {
  Code: string | null
  Name: string
}

interface RawFlightCode {
  Code: string
  Airline: { Code: string; Name: string }
}

interface RawFlight {
  DepartureAirport: RawAirport
  ArrivalAirport: RawAirport
  AdministratingFlightCode: RawFlightCode
  ScheduledTime: string
  EstimatedTime: string | null
  Status: string | null
  StatusComment: string | null
}

interface RawBoard {
  Yesterday: RawFlight[]
  Today: RawFlight[]
  Tomorrow: RawFlight[]
}

export async function fetchBllBoard(direction: 'A' | 'D'): Promise<BoardFlight[]> {
  const url = direction === 'A' ? BLL_ARRIVALS_URL : BLL_DEPARTURES_URL

  const res = await fetch(url, {
    next: { revalidate: 120 },
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DanmarkMonitor/1.0)' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`BLL fetch failed: ${res.status}`)
  const json = await res.json() as RawBoard

  return (json.Today ?? [])
    .map((f) => {
      const otherEnd = direction === 'A' ? f.DepartureAirport : f.ArrivalAirport
      return {
        iata: (f.AdministratingFlightCode?.Code ?? '').trim(),
        airline: (f.AdministratingFlightCode?.Airline?.Name ?? '').trim(),
        city: (otherEnd?.Name ?? '').trim(),
        scheduled: f.ScheduledTime,
        expected: f.EstimatedTime || f.ScheduledTime,
        delayed: Boolean(f.EstimatedTime) && f.EstimatedTime !== f.ScheduledTime,
        status: (f.StatusComment || f.Status || '').trim(),
      }
    })
    .sort((a, b) => a.scheduled.localeCompare(b.scheduled))
    .slice(0, 40)
}
