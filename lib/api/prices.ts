import type { PriceData } from '@/lib/types/prices'

const BASE_URL = 'https://billigkwh.dk/api/Priser/HentPriser'
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; DanmarkMonitor/1.0)' }

interface DayRecord {
  dato: string
  priser: number[]
  spotExMoms: number[]
}

async function fetchBilligKwh(sted: 'DK1' | 'DK2'): Promise<DayRecord[] | null> {
  const res = await fetch(`${BASE_URL}?sted=${sted}&netselskab=n1_c&produkt=norlys_flexel`, {
    next: { revalidate: 300 },
    headers: HEADERS,
  })
  if (!res.ok) return null
  return res.json()
}

function currentOere(records: DayRecord[]): { price: number | null; hourDK: string } {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false,
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const todayPrefix = `${get('year')}-${get('month')}-${get('day')}`
  const hour = Number(get('hour')) % 24 // 'en-CA' with hour12:false can yield "24" at midnight

  const rec = records.find((r) => r.dato.startsWith(todayPrefix)) ?? records[0]
  if (!rec) return { price: null, hourDK: '' }

  const spot = rec.spotExMoms[hour] ?? rec.spotExMoms[rec.spotExMoms.length - 1]
  const price = spot != null ? Math.round(spot * 100) : null
  const hourDK = `${rec.dato.slice(0, 10)}T${String(hour).padStart(2, '0')}:00:00`
  return { price, hourDK }
}

export async function fetchElectricityPrices(): Promise<PriceData> {
  const [dk1Records, dk2Records] = await Promise.all([
    fetchBilligKwh('DK1'),
    fetchBilligKwh('DK2'),
  ])

  if (!dk1Records && !dk2Records) {
    return { current: null, updatedAt: new Date().toISOString(), isStale: true }
  }

  const dk1 = dk1Records ? currentOere(dk1Records) : { price: null, hourDK: '' }
  const dk2 = dk2Records ? currentOere(dk2Records) : { price: null, hourDK: '' }

  return {
    current: {
      hourDK: dk1.hourDK || dk2.hourDK,
      dk1: dk1.price,
      dk2: dk2.price,
    },
    updatedAt: new Date().toISOString(),
    isStale: false,
  }
}
