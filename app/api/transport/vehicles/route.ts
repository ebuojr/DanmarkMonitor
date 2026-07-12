import { NextResponse } from 'next/server'
import { fetchLiveVehicles } from '@/lib/api/rejseplanen-livemap'
import type { ViewportBbox } from '@/lib/api/rejseplanen-livemap'
import type { Vehicle } from '@/lib/types/transport'

// Per-instance TTL cache: the upstream livemap fetch is a POST with a
// viewport-varying URL, so Next's Data Cache can never dedup it. This
// collapses one user's rapid pans, multi-tab usage, and warm-instance
// concurrency into one upstream hit per bbox per TTL window.
const cache = new Map<string, { at: number; vehicles: Vehicle[]; updatedAt: string }>()
const TTL_MS = 15_000
const PRUNE_AGE_MS = 5 * 60_000
const MAX_ENTRIES = 50

export async function GET(request: Request) {
  const updatedAt = new Date().toISOString()
  const { searchParams } = new URL(request.url)
  const minLon = parseFloat(searchParams.get('minLon') ?? '')
  const maxLon = parseFloat(searchParams.get('maxLon') ?? '')
  const minLat = parseFloat(searchParams.get('minLat') ?? '')
  const maxLat = parseFloat(searchParams.get('maxLat') ?? '')
  const viewport: ViewportBbox | undefined =
    [minLon, maxLon, minLat, maxLat].every(isFinite)
      ? { minLon, maxLon, minLat, maxLat }
      : undefined

  const key = viewport
    ? [viewport.minLon, viewport.maxLon, viewport.minLat, viewport.maxLat]
        .map((v) => v.toFixed(2))
        .join(',')
    : 'dk'

  const now = Date.now()
  const hit = cache.get(key)
  if (hit && now - hit.at < TTL_MS) {
    return NextResponse.json({ data: { vehicles: hit.vehicles, updatedAt: hit.updatedAt }, updatedAt: hit.updatedAt })
  }

  try {
    const vehicles = await fetchLiveVehicles(viewport)
    // Prune stale entries; the bbox key space is user-controlled input,
    // so without this the map is a slow memory leak.
    for (const [k, v] of cache) {
      if (now - v.at > PRUNE_AGE_MS) cache.delete(k)
    }
    // Hard size cap: varied attacker-controlled bboxes could otherwise grow
    // the map arbitrarily within the prune window. Evict oldest-inserted.
    while (cache.size >= MAX_ENTRIES) {
      const oldest = cache.keys().next().value
      if (oldest === undefined) break
      cache.delete(oldest)
    }
    cache.set(key, { at: now, vehicles, updatedAt })
    return NextResponse.json({ data: { vehicles, updatedAt }, updatedAt })
  } catch (error) {
    console.error('[api/transport/vehicles]', error)
    return NextResponse.json(
      { data: null, error: 'Upstream fetch failed', updatedAt },
      { status: 500 }
    )
  }
}
