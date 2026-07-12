import useSWR from 'swr'
import type { Feature } from 'geojson'
import { fetcher } from './fetcher'

interface RoadTrafficResponse {
  data: { features: Feature[] } | null
  updatedAt: string
}

export function useRoadTraffic() {
  return useSWR<RoadTrafficResponse>('/api/roadtraffic', fetcher, { refreshInterval: 60_000 })
}
