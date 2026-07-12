import type { BoardFlight } from '@/lib/types/flights'

// Aarhus Airport server-renders a tabbed flight table on this page — no
// documented API. Fragile like wallnot.ts: wrap in try/catch, return [] on
// parse failure (route's catch handles upstream/network failure).
const AAR_URL = 'https://www.aar.dk/flytider/'

// Rows look like:
// <tr> <td>21:10<span> </span></td> <td>London <span>FR713</span></td> <td>Ryanair</td> <td class="text-center">4</td> <td></td> </tr>
// Delayed arrivals carry the new time in the first span, e.g. <span>(11:23)</span>.
const ROW_RE =
  /<tr> <td>(\d{2}:\d{2})<span>([^<]*)<\/span><\/td> <td>([^<]+?) ?<span>([^<]+)<\/span><\/td> <td>([^<]*)<\/td> <td class="text-center">([^<]*)<\/td> <td>([^<]*)<\/td> <\/tr>/g

function parseTable(html: string, sectionId: string): BoardFlight[] {
  const sectionStart = html.indexOf(`id="${sectionId}"`)
  if (sectionStart === -1) return []
  const tbodyStart = html.indexOf('<tbody>', sectionStart)
  const tbodyEnd = html.indexOf('</tbody>', tbodyStart)
  if (tbodyStart === -1 || tbodyEnd === -1) return []
  const tbody = html.slice(tbodyStart, tbodyEnd)

  const flights: BoardFlight[] = []
  const re = new RegExp(ROW_RE.source, ROW_RE.flags)
  let m: RegExpExecArray | null
  while ((m = re.exec(tbody)) !== null) {
    const [, scheduled, delayInfo, city, iata, airline, gate, status] = m
    const delayMatch = delayInfo.match(/(\d{2}:\d{2})/)
    flights.push({
      iata,
      airline: airline.trim(),
      city: city.trim(),
      scheduled,
      expected: delayMatch ? delayMatch[1] : scheduled,
      delayed: Boolean(delayMatch),
      gate: gate || undefined,
      status: status.trim(),
    })
  }
  return flights
}

export async function fetchAarBoard(direction: 'A' | 'D'): Promise<BoardFlight[]> {
  try {
    const res = await fetch(AAR_URL, {
      next: { revalidate: 300 },
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DanmarkMonitor/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`AAR fetch failed: ${res.status}`)
    const html = await res.text()

    const sectionId = direction === 'A' ? 'nav-arrivals' : 'nav-departures'
    const flights = parseTable(html, sectionId)
    if (!flights.length && !html.includes(`id="${sectionId}"`)) {
      console.warn('[aar] table markup not found')
    }
    // Don't re-sort: the page's table spans today + tomorrow with no
    // per-row date, already in chronological scrape order within each day.
    // Sorting by bare "HH:MM" would float tomorrow's early flights above
    // today's later ones.
    return flights.slice(0, 40)
  } catch (error) {
    console.warn('[aar] table markup not found', error)
    return []
  }
}
