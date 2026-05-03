import { NextResponse } from 'next/server'
import type { GeoJSON } from 'geojson'

export const revalidate = 60

const ENDPOINTS: { category: string; url: string }[] = [
  { category: 'roadblocks',                  url: 'https://storage.googleapis.com/trafikkort-data/geojson/25832/current-roadblocks.point.json' },
  { category: 'other-traffic-announcements', url: 'https://storage.googleapis.com/trafikkort-data/geojson/25832/current-other-traffic-announcements.point.json' },
  { category: 'events',                      url: 'https://storage.googleapis.com/trafikkort-data/geojson/25832/current-events.point.json' },
  { category: 'queue',                       url: 'https://storage.googleapis.com/trafikkort-data/geojson/25832/current-queue.point.json' },
  { category: 'ice-snow',                    url: 'https://storage.googleapis.com/trafikkort-data/geojson/25832/current-ice-snow.point.json' },
  { category: 'blocking-roadwork',           url: 'https://storage.googleapis.com/trafikkort-data/geojson/25832/current-blocking-roadwork.point.json' },
  { category: 'roadwork',                    url: 'https://storage.googleapis.com/trafikkort-data/geojson/25832/current-roadwork.point.json' },
  { category: 'winther-road',                url: 'https://storage.googleapis.com/trafikkort-data/geojson/25832/current-winther-road.point.json' },
  { category: 'blocking-events',             url: 'https://storage.googleapis.com/trafikkort-data/geojson/25832/current-blocking-events.point.json' },
]

function utm32nToWgs84(E: number, N: number): [number, number] {
  const a = 6378137.0, f = 1 / 298.257223563
  const b = a * (1 - f)
  const e2 = 1 - (b * b) / (a * a)
  const k0 = 0.9996
  const lon0 = 9 * Math.PI / 180
  const x = E - 500000
  const y = N
  const M = y / k0
  const mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256))
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2))
  const phi1 = mu
    + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu)
    + (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu)
    + (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu)
  const sinPhi1 = Math.sin(phi1)
  const N1 = a / Math.sqrt(1 - e2 * sinPhi1 * sinPhi1)
  const T1 = Math.tan(phi1) ** 2
  const C1 = (e2 / (1 - e2)) * Math.cos(phi1) ** 2
  const R1 = a * (1 - e2) / Math.pow(1 - e2 * sinPhi1 * sinPhi1, 1.5)
  const D = x / (N1 * k0)
  const lat = phi1 - (N1 * Math.tan(phi1) / R1) * (
    D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * e2 / (1 - e2)) * D * D * D * D / 24
  )
  const lon = lon0 + (D - (1 + 2 * T1 + C1) * D * D * D / 6) / Math.cos(phi1)
  return [lon * 180 / Math.PI, lat * 180 / Math.PI]
}

async function fetchCategory(category: string, url: string): Promise<GeoJSON.Feature[]> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const fc = await res.json() as GeoJSON.FeatureCollection
    return fc.features
      .filter((f) => {
        const p = f.properties ?? {}
        return p.visible !== 'false' && p.suspended !== 'true'
      })
      .map((f) => {
        const geom = f.geometry as GeoJSON.Point
        const [E, N] = geom.coordinates
        const [lon, lat] = utm32nToWgs84(E, N)
        return {
          ...f,
          geometry: { type: 'Point' as const, coordinates: [lon, lat] },
          properties: { ...f.properties, category },
        }
      })
  } catch {
    return []
  }
}

export async function GET() {
  const results = await Promise.all(ENDPOINTS.map(({ category, url }) => fetchCategory(category, url)))
  const features = results.flat()

  return NextResponse.json({
    data: { features },
    updatedAt: new Date().toISOString(),
  })
}
