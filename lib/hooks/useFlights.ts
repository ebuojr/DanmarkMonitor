import useSWR from 'swr'
import type { FlightResponse } from '@/lib/types/flights'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useFlights() {
  return useSWR<{ data: FlightResponse | null; error?: string }>('/api/flights', fetcher, {
    refreshInterval: 15_000,
    revalidateOnFocus: false,
    dedupingInterval: 12_000,
  })
}
