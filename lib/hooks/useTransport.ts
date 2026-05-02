import useSWR from 'swr'
import type { TransportResponse } from '@/lib/types/transport'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useTransport() {
  return useSWR<TransportResponse>('/api/transport', fetcher, {
    refreshInterval: 30 * 1000,
    revalidateOnFocus: false,
    dedupingInterval: 25 * 1000,
  })
}
