import useSWR from 'swr'
import type { NewsResponse } from '@/lib/types/news'
import { fetcher } from './fetcher'

export function useNews() {
  return useSWR<NewsResponse>('/api/news', fetcher, {
    refreshInterval: 15 * 60 * 1000,
    revalidateOnFocus: false,
    dedupingInterval: 14 * 60 * 1000,
  })
}
