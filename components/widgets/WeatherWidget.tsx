'use client'

import { useWeather } from '@/lib/hooks/useWeather'
import type { WeatherStation } from '@/lib/types/weather'

const MAJOR_CITIES = [
  { name: 'København', lat: 55.676, lon: 12.569 },
  { name: 'Aarhus', lat: 56.162, lon: 10.204 },
  { name: 'Odense', lat: 55.396, lon: 10.388 },
  { name: 'Aalborg', lat: 57.048, lon: 9.917 },
  { name: 'Esbjerg', lat: 55.467, lon: 8.452 },
]

function nearestStation(stations: WeatherStation[], lat: number, lon: number): WeatherStation | null {
  if (stations.length === 0) return null
  return stations.reduce((best, s) => {
    const d = (s.lat - lat) ** 2 + (s.lon - lon) ** 2
    const bd = (best.lat - lat) ** 2 + (best.lon - lon) ** 2
    return d < bd ? s : best
  })
}

export function WeatherWidget() {
  const { data, isLoading } = useWeather()

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="h-3 bg-muted rounded w-1/3" />
            <div className="h-3 bg-muted rounded w-1/5" />
          </div>
        ))}
      </div>
    )
  }

  if (!data?.data || data.error) {
    return <p className="text-xs text-muted-foreground">Vejrdata utilgængelig</p>
  }

  const { stations, warnings } = data.data
  const stationsWithTemp = stations.filter((s) => s.temperature !== undefined)

  const cityTemps = MAJOR_CITIES.map((city) => {
    const station = nearestStation(stationsWithTemp, city.lat, city.lon)
    return { city: city.name, temp: station?.temperature ?? null }
  })

  const avgTemp =
    stationsWithTemp.length > 0
      ? stationsWithTemp.reduce((sum, s) => sum + s.temperature!, 0) / stationsWithTemp.length
      : null

  return (
    <div className="space-y-3">
      {avgTemp !== null && (
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold tabular-nums">{avgTemp.toFixed(1)}°C</span>
          <span className="text-xs text-muted-foreground">{stationsWithTemp.length} stationer</span>
        </div>
      )}

      <div className="space-y-1">
        {cityTemps.map(({ city, temp }) => (
          <div key={city} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{city}</span>
            <span className="font-mono tabular-nums font-medium">
              {temp != null ? `${temp.toFixed(1)}°C` : '–'}
            </span>
          </div>
        ))}
      </div>

      {warnings.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-border">
          {warnings.slice(0, 3).map((w) => (
            <div
              key={w.id}
              className="rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive"
            >
              <span className="font-medium">{w.event}</span>
              {w.area && <span className="text-destructive/70"> — {w.area}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
