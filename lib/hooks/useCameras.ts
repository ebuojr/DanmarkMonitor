import useSWR from 'swr'
import type { CamerasResponse } from '@/lib/types/cameras'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useCameras() {
  return useSWR<CamerasResponse>('/api/cameras', fetcher, {
    refreshInterval: 60 * 1000,
    revalidateOnFocus: false,
    dedupingInterval: 55 * 1000,
  })
}
