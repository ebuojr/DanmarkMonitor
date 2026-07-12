import type { Journey, JourneyStop, Vehicle, VehicleType } from '@/lib/types/transport'

// Rejseplanen's modern HAFAS mgate endpoint. Unlike the old livemap feed
// (positional arrays, latin1, index-guessing) this returns typed UTF-8 JSON
// and exposes a `jid` per vehicle that resolves to a full journey (stops,
// realtime delays, route polyline) via JourneyDetails.
const MGATE_URL = 'https://www.rejseplanen.dk/bin/iphone.exe'
// Rejseplanen's public web-client token, extracted from their publicly served
// hafas_webapp_config.js — it ships to every browser visiting rejseplanen.dk
// and is not a secret.
const AID = 'j1sa92pcj72ksh0-web'

// Bounding box covering all of Denmark (WGS84 * 1e6), same convention as the
// old livemap module.
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

interface MgateProdCtx {
  catOutL?: string
}

interface MgateProd {
  name?: string
  nameS?: string
  cls?: number
  prodCtx?: MgateProdCtx
}

interface MgateLoc {
  name?: string
  crd?: { x: number; y: number }
}

interface MgatePoly {
  crdEncYX?: string
}

interface MgateCommon {
  prodL?: MgateProd[]
  locL?: MgateLoc[]
  polyL?: MgatePoly[]
}

interface MgateJny {
  jid?: string
  prodX?: number
  dirTxt?: string
  pos?: { x: number; y: number }
}

interface JourneyGeoPosRes {
  common?: MgateCommon
  jnyL?: MgateJny[]
}

interface MgateStop {
  locX?: number
  idx?: number
  dTimeS?: string
  dTimeR?: string
  aTimeS?: string
  aTimeR?: string
}

interface MgateJourney {
  prodX?: number
  dirTxt?: string
  stopL?: MgateStop[]
  polyG?: { polyXL?: number[] }
}

interface JourneyDetailsRes {
  common?: MgateCommon
  journey?: MgateJourney
}

interface MgateEnvelope {
  err?: string
  svcResL?: { err?: string; res?: unknown }[]
}

async function callMgate(meth: string, req: unknown): Promise<unknown> {
  const res = await fetch(MGATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth: { aid: AID, type: 'AID' },
      client: { id: 'DK', type: 'WEB', name: 'webapp' },
      ver: '1.24',
      lang: 'dan',
      svcReqL: [{ meth, req }],
    }),
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`mgate ${meth} fetch failed: ${res.status}`)

  const json = (await res.json()) as MgateEnvelope
  if (json.err !== 'OK') throw new Error(`mgate ${meth} top-level err: ${json.err}`)
  const svc = json.svcResL?.[0]
  if (!svc || svc.err !== 'OK') throw new Error(`mgate ${meth} svc err: ${svc?.err}`)
  return svc.res
}

// Standard encoded polyline, precision 5 (verified: decodes exactly to a
// journey's first-stop coordinates).
export function decodePolyline(str: string): [number, number][] {
  let idx = 0
  let lat = 0
  let lon = 0
  const out: [number, number][] = []
  while (idx < str.length) {
    let b: number
    let shift = 0
    let result = 0
    do {
      b = str.charCodeAt(idx++) - 63
      result |= (b & 31) << shift
      shift += 5
    } while (b >= 32)
    lat += result & 1 ? ~(result >> 1) : result >> 1
    shift = 0
    result = 0
    do {
      b = str.charCodeAt(idx++) - 63
      result |= (b & 31) << shift
      shift += 5
    } while (b >= 32)
    lon += result & 1 ? ~(result >> 1) : result >> 1
    out.push([lon / 1e5, lat / 1e5])
  }
  return out
}

// Product-class -> vehicle type, sampled live against JourneyGeoPos over all
// Denmark and two Copenhagen-area bboxes (2026-07-12): cls 1/2 = IC/ICL
// (Lyntog), cls 4 = Re/RA (regional), cls 8 = Lokalbane (private regional
// railway), cls 16 = S-tog, cls 32/64/128 = Bus/Bybus/X Bus/Ekspresbus/
// Havnebus. Copenhagen Metro did not appear in the sampled live-position
// feed (its driverless trains may not be position-tracked by this endpoint);
// catOutL/name-prefix fallback below covers it if it ever does.
const CLS_TYPE: Record<number, VehicleType> = {
  1: 'ic',
  2: 'ic',
  4: 'regional',
  8: 'regional',
  16: 'stog',
  32: 'bus',
  64: 'bus',
  128: 'bus',
}

export function classify(prod: MgateProd): VehicleType {
  const cls = prod.cls
  if (cls !== undefined && CLS_TYPE[cls]) return CLS_TYPE[cls]

  const catOutL = (prod.prodCtx?.catOutL ?? '').toLowerCase()
  const name = (prod.name ?? '').trim()
  if (catOutL.includes('metro') || /^m\d/i.test(name)) return 'metro'
  if (catOutL.includes('s-tog') || catOutL.includes('stog')) return 'stog'
  if (catOutL === 'ic' || catOutL === 'icl' || name.startsWith('IC') || name.startsWith('Lyn')) return 'ic'
  if (catOutL.includes('re') || catOutL.includes('lokalbane') || name.startsWith('Re')) return 'regional'
  if (catOutL.includes('bus')) return 'bus'
  return 'other'
}

function toLonLat(pos: { x: number; y: number }): [number, number] {
  return [pos.x / 1_000_000, pos.y / 1_000_000]
}

export async function fetchVehiclePositions(viewport?: ViewportBbox): Promise<Vehicle[]> {
  const bbox = viewport
    ? {
        minx: Math.round(viewport.minLon * 1_000_000),
        maxx: Math.round(viewport.maxLon * 1_000_000),
        miny: Math.round(viewport.minLat * 1_000_000),
        maxy: Math.round(viewport.maxLat * 1_000_000),
      }
    : DENMARK_BBOX

  const res = (await callMgate('JourneyGeoPos', {
    rect: { llCrd: { x: bbox.minx, y: bbox.miny }, urCrd: { x: bbox.maxx, y: bbox.maxy } },
    maxJny: 500,
    onlyRT: false,
    trainPosMode: 'CALC',
    jnyFltrL: [{ type: 'PROD', mode: 'INC', value: 1023 }],
  })) as JourneyGeoPosRes

  const prodL = res.common?.prodL ?? []
  const jnyL = res.jnyL ?? []

  return jnyL
    .filter((jny) => jny.jid && jny.pos)
    .map((jny): Vehicle | null => {
      const prod = jny.prodX !== undefined ? prodL[jny.prodX] : undefined
      if (!prod || !jny.pos || !jny.jid) return null
      const [lon, lat] = toLonLat(jny.pos)
      return {
        id: jny.jid,
        jid: jny.jid,
        name: prod.name ?? '',
        type: classify(prod),
        destination: jny.dirTxt ?? '',
        lon,
        lat,
      }
    })
    .filter((v): v is Vehicle => v !== null)
    .filter((v) => v.lat > 54 && v.lat < 58 && v.lon > 5 && v.lon < 16)
}

// "HHMMSS" (possibly with a day-offset prefix, length 8) -> "HH:MM" from the
// last 6 chars.
function formatTime(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const t = raw.slice(-6)
  if (t.length < 4) return undefined
  return `${t.slice(0, 2)}:${t.slice(2, 4)}`
}

// Whole minutes between realtime and scheduled variants of the same field.
function delayMinutes(realtime: string | undefined, scheduled: string | undefined): number | undefined {
  if (!realtime || !scheduled) return undefined
  const toSeconds = (raw: string) => {
    const t = raw.slice(-6)
    if (t.length < 6) return null
    return Number(t.slice(0, 2)) * 3600 + Number(t.slice(2, 4)) * 60 + Number(t.slice(4, 6))
  }
  const r = toSeconds(realtime)
  const s = toSeconds(scheduled)
  if (r === null || s === null) return undefined
  return Math.round((r - s) / 60)
}

export async function fetchJourney(jid: string): Promise<Journey> {
  const res = (await callMgate('JourneyDetails', { jid, getPolyline: true })) as JourneyDetailsRes

  const journey = res.journey ?? {}
  const common = res.common ?? {}
  const prodL = common.prodL ?? []
  const locL = common.locL ?? []
  const polyL = common.polyL ?? []

  const prod = journey.prodX !== undefined ? prodL[journey.prodX] : undefined
  const stopL = journey.stopL ?? []

  const stops: JourneyStop[] = stopL
    .map((stop): JourneyStop | null => {
      const loc = stop.locX !== undefined ? locL[stop.locX] : undefined
      if (!loc?.crd) return null
      const dep = formatTime(stop.dTimeR ?? stop.dTimeS)
      const arr = formatTime(stop.aTimeR ?? stop.aTimeS)
      const delayMin =
        delayMinutes(stop.dTimeR, stop.dTimeS) ?? delayMinutes(stop.aTimeR, stop.aTimeS) ?? undefined
      return {
        name: loc.name ?? '',
        lon: loc.crd.x / 1_000_000,
        lat: loc.crd.y / 1_000_000,
        arr,
        dep,
        delayMin,
      }
    })
    .filter((s): s is JourneyStop => s !== null)

  const polyIdx = journey.polyG?.polyXL?.[0]
  const enc = polyIdx !== undefined ? polyL[polyIdx]?.crdEncYX : undefined
  const line: [number, number][] = enc
    ? decodePolyline(enc)
    : stops.map((s): [number, number] => [s.lon, s.lat])

  const destination = journey.dirTxt ?? stops[stops.length - 1]?.name ?? ''

  return {
    name: prod?.name ?? '',
    destination,
    stops,
    line,
  }
}
