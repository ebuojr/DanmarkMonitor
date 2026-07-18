// Great-circle helpers (aviation formulary). Used to sanity-check adsbdb's
// typical route against an aircraft's live position.

const EARTH_R_KM = 6371

export interface GeoPoint {
  lat: number
  lon: number
}

const toRad = (d: number) => (d * Math.PI) / 180
// asin/acos inputs can drift a hair outside [-1, 1] from float rounding near
// 0/π — clamp or they return NaN.
const clamp1 = (x: number) => Math.min(1, Math.max(-1, x))

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_R_KM * Math.asin(clamp1(Math.sqrt(s)))
}

function bearingRad(from: GeoPoint, to: GeoPoint): number {
  const lat1 = toRad(from.lat)
  const lat2 = toRad(to.lat)
  const dLon = toRad(to.lon - from.lon)
  return Math.atan2(
    Math.sin(dLon) * Math.cos(lat2),
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  )
}

/**
 * Minimum distance (km) from `pt` to the great-circle SEGMENT origin→dest.
 * Cross-track distance where the perpendicular foot lies on the segment;
 * distance to the nearer endpoint when it falls before origin or past dest.
 */
export function distanceToSegmentKm(pt: GeoPoint, origin: GeoPoint, dest: GeoPoint): number {
  const d13 = haversineKm(origin, pt)
  const segLen = haversineKm(origin, dest)
  if (segLen < 1e-6) return d13

  const bearing12 = bearingRad(origin, dest)
  const bearing13 = bearingRad(origin, pt)
  const delta13 = d13 / EARTH_R_KM
  const deltaXt = Math.asin(clamp1(Math.sin(delta13) * Math.sin(bearing13 - bearing12)))
  const deltaAt =
    Math.acos(clamp1(Math.cos(delta13) / Math.max(Math.cos(deltaXt), 1e-12))) *
    Math.sign(Math.cos(bearing13 - bearing12))
  const alongTrackKm = deltaAt * EARTH_R_KM

  if (alongTrackKm < 0) return d13
  if (alongTrackKm > segLen) return haversineKm(dest, pt)
  return Math.abs(deltaXt) * EARTH_R_KM
}
