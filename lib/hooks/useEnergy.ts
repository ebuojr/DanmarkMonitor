import useSWR from 'swr'
import type { EnergyResponse } from '@/lib/types/energy'
import { fetcher } from './fetcher'

export function useEnergy() {
  return useSWR<EnergyResponse>('/api/energy', fetcher, {
    refreshInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
    dedupingInterval: 4 * 60 * 1000,
  })
}
