import type { BoardFlight } from '@/lib/types/flights'
import { isDelayed } from '@/lib/api/board-time'

// CPH's own site API — undocumented, unofficial. Treat as change-without-notice.
const CPH_URL = 'https://www.cph.dk/api/FlightInformation/GetFlightInfoTable'

interface RawFlight {
  ExpectedDateTime?: string
  ScheduledDateTime: string
  Delayed?: boolean
  Airline?: string
  Destination?: string
  DestinationName?: string
  Iata: string
  Gate?: string
  Terminal?: string
  Status?: string
}

// Quantize the query window so the URL is stable across the fetch-cache
// lifetime — Next's Data Cache keys on the full URL, so millisecond-precision
// timestamps would guarantee a cache miss (and a CPH hit) on every request.
const WINDOW_STEP_MS = 10 * 60 * 1000

export async function fetchCphBoard(direction: 'A' | 'D'): Promise<BoardFlight[]> {
  const now = Math.floor(Date.now() / WINDOW_STEP_MS) * WINDOW_STEP_MS
  const startDateTime = new Date(now - 60 * 60 * 1000).toISOString()
  const endDateTime = new Date(now + 6 * 60 * 60 * 1000).toISOString()

  const url = new URL(CPH_URL)
  url.searchParams.set('direction', direction)
  url.searchParams.set('userQuery', '*:*')
  url.searchParams.set('startDateTime', startDateTime)
  url.searchParams.set('endDateTime', endDateTime)
  url.searchParams.set('language', 'da')

  const res = await fetch(url.toString(), {
    next: { revalidate: 120 },
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`CPH fetch failed: ${res.status}`)
  const json = await res.json() as RawFlight[]

  return json
    .map((f) => {
      const scheduled = f.ScheduledDateTime
      const expected = f.ExpectedDateTime ?? f.ScheduledDateTime
      return {
        flightNo: (f.Iata ?? '').trim(),
        airline: (f.Airline ?? '').trim(),
        city: (f.DestinationName ?? f.Destination ?? '').trim(),
        scheduled,
        expected,
        // Upstream's Delayed flag is authoritative when set; the normalized
        // time comparison catches rows where the flag lags the times.
        delayed: (f.Delayed ?? false) || isDelayed(scheduled, expected),
        gate: f.Gate || undefined,
        terminal: f.Terminal || undefined,
        status: (f.Status ?? '').trim(),
      }
    })
    .sort((a, b) => a.scheduled.localeCompare(b.scheduled))
    .slice(0, 40)
}
