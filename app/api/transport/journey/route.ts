import { NextResponse } from 'next/server'
import { fetchJourney } from '@/lib/api/hafas'
import type { Journey } from '@/lib/types/transport'

// Per-instance TTL cache, same pattern (and same security requirement — the
// key space is user-controlled) as the vehicles route's cache.
const cache = new Map<string, { at: number; journey: Journey; updatedAt: string }>()
const TTL_MS = 30_000
const PRUNE_AGE_MS = 5 * 60_000
const MAX_ENTRIES = 50

export async function GET(request: Request) {
  const updatedAt = new Date().toISOString()
  const { searchParams } = new URL(request.url)
  const jid = searchParams.get('jid') ?? ''

  if (!jid || jid.length > 512 || !/^\d/.test(jid)) {
    return NextResponse.json(
      { data: null, error: 'Invalid jid', updatedAt },
      { status: 400 }
    )
  }

  const now = Date.now()
  const hit = cache.get(jid)
  if (hit && now - hit.at < TTL_MS) {
    return NextResponse.json({ data: { journey: hit.journey, updatedAt: hit.updatedAt }, updatedAt: hit.updatedAt })
  }

  try {
    const journey = await fetchJourney(jid)
    // Prune stale entries; the jid key space is user-controlled input, so
    // without this the map is a slow memory leak.
    for (const [k, v] of cache) {
      if (now - v.at > PRUNE_AGE_MS) cache.delete(k)
    }
    // Hard size cap: varied attacker-controlled jids could otherwise grow the
    // map arbitrarily within the prune window. Evict oldest-inserted.
    while (cache.size >= MAX_ENTRIES) {
      const oldest = cache.keys().next().value
      if (oldest === undefined) break
      cache.delete(oldest)
    }
    cache.set(jid, { at: now, journey, updatedAt })
    return NextResponse.json({ data: { journey, updatedAt }, updatedAt })
  } catch (error) {
    console.error('[api/transport/journey]', error)
    return NextResponse.json(
      { data: null, error: 'Upstream fetch failed', updatedAt },
      { status: 500 }
    )
  }
}
