import useSWR from 'swr'
import type { WeatherResponse } from '@/lib/types/weather'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useWeather() {
  return useSWR<WeatherResponse>('/api/weather', fetcher, {
    refreshInterval: 10 * 60 * 1000,
    revalidateOnFocus: false,
    dedupingInterval: 9 * 60 * 1000,
  })
}
