import useSWR from 'swr'
import type { EnergyResponse } from '@/lib/types/energy'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useEnergy() {
  return useSWR<EnergyResponse>('/api/energy', fetcher, {
    refreshInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
    dedupingInterval: 4 * 60 * 1000,
  })
}
