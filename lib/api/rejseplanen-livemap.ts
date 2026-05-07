import type { Vehicle, VehicleType } from '@/lib/types/transport'

// Unofficial internal API used by webapp.rejseplanen.dk/livemap
// Coordinates are in millionths of degrees (divide by 1,000,000)
const LIVEMAP_URL = 'https://webapp.rejseplanen.dk/bin/query.exe/mny'

// Bounding box covering all of Denmark (in millionths of degrees)
const DENMARK_BBOX = {
  minx: 3262939,
  maxx: 17325439,
  miny: 54175296,
  maxy: 58162010,
}

export interface ViewportBbox {
  minLon: number
  maxLon: number
  minLat: number
  maxLat: number
}

// All vehicle category codes (trains + buses + metro)
const CATS = '151,152,153,154,165,001,015,057,003,004,007,017,029,047,065,006,002,016,097,098,025,030,031,005'

type RawVehicle = [
  string,   // [0] name
  number,   // [1] x (lon * 1e6)
  number,   // [2] y (lat * 1e6)
  string,   // [3] journeyRef
  string,   // [4] delay string
  number,   // [5] category code
  string,   // [6] unknown
  string,   // [7] next stop
  unknown,  // [8] trajectory
  string,   // [9] destination
  string,   // [10] unknown
  string,   // [11] previous stop
  ...unknown[]
]

function classifyVehicle(name: string, category: number): VehicleType {
  const n = name.trim()
  if (category === 16) return 'stog'
  if (n.startsWith('IC') || n.startsWith('Lyntog') || n.startsWith('Lyn')) return 'ic'
  if (n.startsWith('Re') || n.startsWith('Reg')) return 'regional'
  if (n.startsWith('M') && n.length <= 3) return 'metro'
  if (/^\d/.test(n) || n.startsWith('Bus') || category >= 100) return 'bus'
  if (n.length <= 2 && /^[A-Z]$/.test(n)) return 'stog'
  return 'other'
}

export async function fetchLiveVehicles(viewport?: ViewportBbox): Promise<Vehicle[]> {
  const BBOX = viewport
    ? {
        minx: Math.round(viewport.minLon * 1_000_000),
        maxx: Math.round(viewport.maxLon * 1_000_000),
        miny: Math.round(viewport.minLat * 1_000_000),
        maxy: Math.round(viewport.maxLat * 1_000_000),
      }
    : DENMARK_BBOX
  const now = new Date()
  const ts = now.toISOString().slice(0, 10).replace(/-/g, '').slice(2) // YYMMDD → actually YYYYMMDD
  const tsFormatted = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

  const params = new URLSearchParams({
    look_minx: String(BBOX.minx),
    look_maxx: String(BBOX.maxx),
    look_miny: String(BBOX.miny),
    look_maxy: String(BBOX.maxy),
    tpl: 'trains2json3',
    look_json: 'yes',
    performLocating: '1',
    look_requesttime: timeStr,
    look_nv: `get_ageofreport|yes|get_rtmsgstatus|yes|zugposmode|0|interval|30000|intervalstep|5000|get_nstop|yes|get_pstop|yes|tplmode|trains2json3|cats|${CATS}`,
    interval: '30000',
    intervalstep: '5000',
    ts: tsFormatted,
  })

  const res = await fetch(`${LIVEMAP_URL}?${params.toString()}`, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })

  if (!res.ok) throw new Error(`Rejseplanen livemap fetch failed: ${res.status}`)

  // API returns Latin-1 encoded text; decode before JSON parsing
  const buffer = await res.arrayBuffer()
  const text = new TextDecoder('latin1').decode(buffer)
  const raw: RawVehicle[][] = JSON.parse(text)
  const entries: RawVehicle[] = raw?.[0] ?? []

  return entries
    .filter((v) => Array.isArray(v) && v.length >= 10)
    .map((v, i) => {
      const name = String(v[0]).trim()
      const lon = v[1] / 1_000_000
      const lat = v[2] / 1_000_000
      const journeyRef = String(v[3])
      const delayRaw = String(v[4] ?? '').trim()
      const delay = delayRaw !== '' && !isNaN(Number(delayRaw)) ? parseInt(delayRaw, 10) : undefined
      const category = Number(v[5]) || 0
      const platform = String(v[6] ?? '').trim() || undefined
      const nextStop = String(v[7] ?? '').trim()
      const destination = String(v[9] ?? '').trim()
      const prevStop = String(v[11] ?? '').trim()

      return {
        id: journeyRef || `v-${i}`,
        name,
        lon,
        lat,
        type: classifyVehicle(name, category),
        category,
        destination,
        nextStop,
        prevStop,
        journeyRef,
        delay,
        platform,
      }
    })
    .filter((v) => v.lat > 54 && v.lat < 58 && v.lon > 5 && v.lon < 16)
}
