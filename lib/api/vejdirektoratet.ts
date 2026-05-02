import type { Camera } from '@/lib/types/cameras'

// Vejdirektoratet open data — no auth required
const BASE_URL = 'https://api.vejdirektoratet.dk'

interface VejdirektoratetCamera {
  Id: string
  Name?: string
  Description?: string
  Geometry?: { WKT?: string }
  SnapshotUrl?: string
}

function parseWktPoint(wkt: string): { lat: number; lon: number } | null {
  // POINT (lon lat) or POINT(lon lat)
  const match = wkt.match(/POINT\s*\(([0-9.\-]+)\s+([0-9.\-]+)\)/i)
  if (!match) return null
  return { lon: parseFloat(match[1]), lat: parseFloat(match[2]) }
}

// NOTE: Vejdirektoratet does not expose a public JSON camera API.
// Camera data will be integrated once the correct API endpoint is identified.
// See: https://www.vejdirektoratet.dk/trafikinfo
export async function fetchCameras(): Promise<Camera[]> {
  return []
}
