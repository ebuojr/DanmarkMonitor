import type { BoardFlight } from '@/lib/types/flights'

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

export async function fetchCphBoard(direction: 'A' | 'D'): Promise<BoardFlight[]> {
  const now = Date.now()
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
    .map((f) => ({
      iata: (f.Iata ?? '').trim(),
      airline: (f.Airline ?? '').trim(),
      city: (f.DestinationName ?? f.Destination ?? '').trim(),
      scheduled: f.ScheduledDateTime,
      expected: f.ExpectedDateTime ?? f.ScheduledDateTime,
      delayed: f.Delayed ?? false,
      gate: f.Gate || undefined,
      terminal: f.Terminal || undefined,
      status: (f.Status ?? '').trim(),
    }))
    .sort((a, b) => a.scheduled.localeCompare(b.scheduled))
    .slice(0, 40)
}
