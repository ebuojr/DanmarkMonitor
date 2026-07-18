import type { BoardFlight } from '@/lib/types/flights'
import { isDelayed } from '@/lib/api/board-time'

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

  const mapFlight = (f: RawFlight): BoardFlight => {
    const otherEnd = direction === 'A' ? f.DepartureAirport : f.ArrivalAirport
    return {
      flightNo: (f.AdministratingFlightCode?.Code ?? '').trim(),
      airline: (f.AdministratingFlightCode?.Airline?.Name ?? '').trim(),
      city: (otherEnd?.Name ?? '').trim(),
      scheduled: f.ScheduledTime,
      expected: f.EstimatedTime || f.ScheduledTime,
      // Normalized comparison, not raw string inequality — an upstream that
      // reformats an identical time must not read as delayed.
      delayed: f.EstimatedTime ? isDelayed(f.ScheduledTime, f.EstimatedTime) : false,
      status: (f.StatusComment || f.Status || '').trim(),
    }
  }

  // Times are bare "HH:MM", so Today and Tomorrow sort within their own day
  // and concatenate in day order — a cross-day sort would float tomorrow's
  // early-morning flights above today's evening ones. Including Tomorrow
  // keeps the board populated near midnight.
  const byScheduled = (a: BoardFlight, b: BoardFlight) => a.scheduled.localeCompare(b.scheduled)
  const today = (json.Today ?? []).map(mapFlight).sort(byScheduled)
  const tomorrow = (json.Tomorrow ?? []).map(mapFlight).sort(byScheduled)
  return [...today, ...tomorrow].slice(0, 40)
}
