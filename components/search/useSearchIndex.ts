'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import type { Feature } from 'geojson'
import { useFlights } from '@/lib/hooks/useFlights'
import { useRoadTraffic } from '@/lib/hooks/useRoadTraffic'
import { useNews } from '@/lib/hooks/useNews'
import { fetcher } from '@/lib/hooks/fetcher'
import { WIND_TURBINES_GEOJSON } from '@/lib/data/wind-turbines'
import { SOLAR_PARKS_GEOJSON } from '@/lib/data/solar-parks'
import type { VehicleResponse } from '@/lib/types/transport'
import type { FocusTarget } from '@/components/map/DenmarkMap'

export type SearchGroup = 'transport' | 'flights' | 'energy' | 'roadtraffic' | 'airports' | 'news'

export const GROUP_LABEL: Record<SearchGroup, string> = {
  transport: 'Transport',
  flights: 'Fly',
  energy: 'Energi',
  roadtraffic: 'Vejhændelser',
  airports: 'Lufthavne',
  news: 'Nyheder',
}

export interface SearchResult {
  group: SearchGroup
  id: string
  primary: string
  secondary?: string
  /** Present for every group except news — drives DenmarkMapHandle.focus(). */
  target?: FocusTarget
  /** Present only for news — opened in a new tab instead of focusing the map. */
  link?: string
}

interface Airport {
  iata: string
  name: string
  lon: number
  lat: number
}

// Sanity-checked against public sources: CPH (Kastrup), BLL (Billund),
// AAR (Aarhus/Tirstrup). No live airport-coordinate feed in this app to
// reuse, so hardcoded per the plan.
const AIRPORTS: Airport[] = [
  { iata: 'CPH', name: 'København Lufthavn (Kastrup)', lon: 12.656, lat: 55.618 },
  { iata: 'BLL', name: 'Billund Lufthavn', lon: 9.152, lat: 55.740 },
  { iata: 'AAR', name: 'Aarhus Lufthavn (Tirstrup)', lon: 10.619, lat: 56.300 },
]

const MAX_PER_GROUP = 8
const MAX_EMPTY_QUERY = 5

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

function matches(query: string, ...fields: (string | undefined)[]): boolean {
  if (!query) return true
  const q = normalize(query)
  return fields.some((f) => f && normalize(f).includes(q))
}

/**
 * Assembles the search corpus from data the client already holds — no new
 * endpoints. Flights/road traffic/news reuse the same SWR hooks (and keys)
 * the map uses, so opening the modal shares their cache — no new polling
 * loop. Vehicles are the one exception: the map's `useVehicles(bbox)` is
 * viewport-scoped, a different SWR key than an unbounded fetch — so this
 * subscribes to the unbounded `/api/transport/vehicles` key directly via SWR
 * (same fetcher, same key shape as `useVehicles(undefined)`) but with
 * `refreshInterval: 0` — a one-shot fetch on mount, no interval of its own.
 * When the map happens to be at a low zoom (also on the unbounded key), this
 * shares that exact subscription/cache for free; otherwise it fetches once
 * and never again while the modal is open.
 */
export function useSearchIndex(query: string) {
  const { data: flightsData } = useFlights()
  const { data: roadTrafficData } = useRoadTraffic()
  const { data: newsData } = useNews()
  const { data: vehiclesData } = useSWR<VehicleResponse>('/api/transport/vehicles', fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })

  return useMemo(() => {
    const groups: Record<SearchGroup, SearchResult[]> = {
      transport: [],
      flights: [],
      energy: [],
      roadtraffic: [],
      airports: [],
      news: [],
    }
    const cap = query ? MAX_PER_GROUP : MAX_EMPTY_QUERY
    const vehicles = vehiclesData?.data?.vehicles ?? []

    for (const v of vehicles) {
      if (groups.transport.length >= cap) break
      if (!matches(query, v.name, v.destination)) continue
      groups.transport.push({
        group: 'transport',
        id: v.jid,
        primary: v.name,
        secondary: v.destination || undefined,
        target: { kind: 'vehicle', jid: v.jid, lon: v.lon, lat: v.lat, name: v.name, type: v.type, destination: v.destination },
      })
    }

    for (const a of flightsData?.data?.aircraft ?? []) {
      if (groups.flights.length >= cap) break
      if (!matches(query, a.callsign, a.route?.airline, a.route?.origin.name, a.route?.origin.iata, a.route?.destination.name, a.route?.destination.iata)) continue
      const routeLabel = a.route && a.route.origin.iata && a.route.destination.iata
        ? `${a.route.origin.iata} → ${a.route.destination.iata}`
        : undefined
      groups.flights.push({
        group: 'flights',
        id: a.id,
        primary: a.callsign || 'Ukendt kaldesignal',
        secondary: [a.route?.airline, routeLabel].filter(Boolean).join(' · ') || undefined,
        target: { kind: 'flight', id: a.id, lon: a.lon, lat: a.lat },
      })
    }

    for (const f of WIND_TURBINES_GEOJSON.features) {
      if (groups.energy.length >= cap) break
      if (f.geometry.type !== 'Point') continue
      const p = f.properties as { name: string; capacity_mw: number; turbines: number; year: number }
      if (!matches(query, p.name)) continue
      const [lon, lat] = f.geometry.coordinates as [number, number]
      groups.energy.push({
        group: 'energy',
        id: p.name,
        primary: p.name,
        secondary: `Vindmøllepark · ${p.capacity_mw} MW · ${p.turbines} møller · ${p.year}`,
        target: { kind: 'turbine', lon, lat, props: p },
      })
    }

    for (const f of SOLAR_PARKS_GEOJSON.features) {
      if (groups.energy.length >= cap) break
      if (f.geometry.type !== 'Point') continue
      const p = f.properties as { name: string; capacity_mw: number; year: number | null }
      if (!matches(query, p.name)) continue
      const [lon, lat] = f.geometry.coordinates as [number, number]
      groups.energy.push({
        group: 'energy',
        id: p.name,
        primary: p.name,
        secondary: `Solcellepark · ${p.capacity_mw} MW${p.year ? ` · ${p.year}` : ''}`,
        target: { kind: 'solar', lon, lat, props: p },
      })
    }

    const roadFeatures = (roadTrafficData?.data?.features ?? []) as Feature[]
    for (const f of roadFeatures) {
      if (groups.roadtraffic.length >= cap) break
      if (f.geometry.type !== 'Point') continue
      const p = (f.properties ?? {}) as { category?: string; title?: string; header?: string; kommune?: string; direction?: string; beginPeriod?: string; endPeriod?: string; description?: string }
      if (!matches(query, p.title, p.header, p.kommune)) continue
      const [lon, lat] = f.geometry.coordinates as [number, number]
      groups.roadtraffic.push({
        group: 'roadtraffic',
        id: `${p.category ?? 'road'}-${lon}-${lat}-${p.title ?? p.header ?? ''}`,
        primary: p.title || p.header || 'Trafikhændelse',
        secondary: p.kommune || undefined,
        target: {
          kind: 'road',
          lon,
          lat,
          props: {
            category: p.category ?? '',
            title: p.title ?? '',
            header: p.header ?? '',
            kommune: p.kommune ?? '',
            direction: p.direction ?? '',
            beginPeriod: p.beginPeriod ?? '',
            endPeriod: p.endPeriod ?? '',
            description: p.description ?? '',
          },
        },
      })
    }

    for (const a of AIRPORTS) {
      if (groups.airports.length >= cap) break
      if (!matches(query, a.name, a.iata)) continue
      groups.airports.push({
        group: 'airports',
        id: a.iata,
        primary: a.name,
        secondary: a.iata,
        target: { kind: 'point', lon: a.lon, lat: a.lat, zoom: 12 },
      })
    }

    for (const article of newsData?.data?.articles ?? []) {
      if (groups.news.length >= cap) break
      if (!matches(query, article.title)) continue
      groups.news.push({
        group: 'news',
        id: article.id,
        primary: article.title,
        secondary: article.source,
        link: article.link,
      })
    }

    return groups
  }, [query, vehiclesData, flightsData, roadTrafficData, newsData])
}
