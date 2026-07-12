import useSWR from 'swr'
import type { FlightsResponse } from '@/lib/types/flights'
import { fetcher } from './fetcher'

export function useFlights() {
  return useSWR<FlightsResponse>('/api/flights', fetcher, {
    refreshInterval: 15_000,
    dedupingInterval: 12_000,
    revalidateOnFocus: false,
  })
}
