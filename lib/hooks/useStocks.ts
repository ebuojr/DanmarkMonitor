import useSWR from 'swr'
import type { StocksResponse } from '@/lib/types/stocks'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useStocks() {
  return useSWR<{ data: StocksResponse | null; error?: string }>('/api/stocks', fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
    dedupingInterval: 55_000,
  })
}
