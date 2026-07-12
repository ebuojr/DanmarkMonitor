import useSWR from 'swr'
import type { PriceResponse } from '@/lib/types/prices'
import { fetcher } from './fetcher'

export function usePrices() {
  return useSWR<PriceResponse>('/api/prices', fetcher, {
    refreshInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
    dedupingInterval: 4 * 60 * 1000,
  })
}
