import useSWR from 'swr'
import type { VehicleResponse } from '@/lib/types/transport'
import { fetcher } from './fetcher'

interface Bbox { minLon: number; maxLon: number; minLat: number; maxLat: number }

export function useVehicles(bbox?: Bbox) {
  const params = bbox
    ? `?minLon=${bbox.minLon.toFixed(4)}&maxLon=${bbox.maxLon.toFixed(4)}&minLat=${bbox.minLat.toFixed(4)}&maxLat=${bbox.maxLat.toFixed(4)}`
    : ''
  return useSWR<VehicleResponse>(`/api/transport/vehicles${params}`, fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
    dedupingInterval: 25_000,
  })
}
