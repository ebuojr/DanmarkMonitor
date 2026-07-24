import useSWR from 'swr'
import type { Disruption } from '@/lib/api/hafas'
import { fetcher } from './fetcher'

interface DisruptionsResponse {
  data: { disruptions: Disruption[] } | null
  error?: string
  updatedAt: string
}

export function useDisruptions() {
  return useSWR<DisruptionsResponse>('/api/disruptions', fetcher, { refreshInterval: 120_000 })
}
