import useSWR from 'swr'
import type { NewsResponse } from '@/lib/types/news'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useNews() {
  return useSWR<NewsResponse>('/api/news', fetcher, {
    refreshInterval: 15 * 60 * 1000,
    revalidateOnFocus: false,
    dedupingInterval: 14 * 60 * 1000,
  })
}
