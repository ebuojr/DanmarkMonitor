'use client'

import { useWeather } from '@/lib/hooks/useWeather'

export function WeatherWidget() {
  const { data, isLoading } = useWeather()

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    )
  }

  if (!data?.data || data.error) {
    return (
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          {data?.error?.includes('DMI_API_KEY') ? (
            <>
              DMI API-nøgle mangler.{' '}
              <a
                href="https://opendatadocs.dmi.govcloud.dk"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Registrer her
              </a>
            </>
          ) : (
            'Vejrdata utilgængelig'
          )}
        </p>
      </div>
    )
  }

  const { stations, warnings } = data.data

  const stationsWithTemp = stations.filter((s) => s.temperature !== undefined)
  const avgTemp =
    stationsWithTemp.length > 0
      ? stationsWithTemp.reduce((sum, s) => sum + s.temperature!, 0) / stationsWithTemp.length
      : null

  return (
    <div className="space-y-3">
      {avgTemp !== null && (
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold tabular-nums">{avgTemp.toFixed(1)}°C</span>
          <span className="text-xs text-muted-foreground">landsgennemsnit</span>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        {stationsWithTemp.length} aktive stationer
      </div>

      {warnings.length > 0 && (
        <div className="space-y-1">
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
