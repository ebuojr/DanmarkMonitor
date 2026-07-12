import useSWR from 'swr'
import { fetcher } from './fetcher'
import type { JourneyResponse } from '@/lib/types/transport'

export function useJourney(jid: string | null) {
  return useSWR<JourneyResponse>(
    jid ? `/api/transport/journey?jid=${encodeURIComponent(jid)}` : null,
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: false }
  )
}
