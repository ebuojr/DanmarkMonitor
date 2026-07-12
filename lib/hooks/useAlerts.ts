import useSWR from 'swr'
import type { AlertsResponse } from '@/lib/types/alerts'
import { fetcher } from './fetcher'

export function useAlerts() {
  return useSWR<AlertsResponse>('/api/alerts', fetcher, {
    refreshInterval: 60 * 1000,
    revalidateOnFocus: false,
    dedupingInterval: 55 * 1000,
  })
}
