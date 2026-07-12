import useSWR from 'swr'
import type { AirportBoardResponse, AirportCode } from '@/lib/types/flights'
import { fetcher } from './fetcher'

export function useAirportBoard(code: AirportCode, direction: 'A' | 'D') {
  return useSWR<AirportBoardResponse>(`/api/airport?code=${code}&direction=${direction}`, fetcher, {
    refreshInterval: 120_000,
    revalidateOnFocus: false,
  })
}
