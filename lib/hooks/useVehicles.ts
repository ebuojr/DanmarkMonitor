import useSWR from 'swr'
import type { VehicleResponse } from '@/lib/types/transport'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useVehicles() {
  return useSWR<VehicleResponse>('/api/transport/vehicles', fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
    dedupingInterval: 25_000,
  })
}
