import useSWR from 'swr'
import type { AirportBoardResponse } from '@/lib/types/flights'
import { fetcher } from './fetcher'

export function useAirportBoard(direction: 'A' | 'D') {
  return useSWR<AirportBoardResponse>(`/api/airport?direction=${direction}`, fetcher, {
    refreshInterval: 120_000,
    revalidateOnFocus: false,
  })
}
