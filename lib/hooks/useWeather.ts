import useSWR from 'swr'
import type { WeatherResponse } from '@/lib/types/weather'
import { fetcher } from './fetcher'

export function useWeather() {
  return useSWR<WeatherResponse>('/api/weather', fetcher, {
    refreshInterval: 10 * 60 * 1000,
    revalidateOnFocus: false,
    dedupingInterval: 9 * 60 * 1000,
  })
}
