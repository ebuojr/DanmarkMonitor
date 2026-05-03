import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useRoadTraffic() {
  return useSWR('/api/roadtraffic', fetcher, { refreshInterval: 60_000 })
}
