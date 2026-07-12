'use client'

import { useState } from 'react'
import { useAirportBoard } from '@/lib/hooks/useAirportBoard'
import type { AirportCode } from '@/lib/types/flights'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { WidgetSkeleton, WidgetError } from '@/components/ui/widget-state'

const AIRPORTS: { id: AirportCode; label: string }[] = [
  { id: 'CPH', label: 'CPH' },
  { id: 'BLL', label: 'BLL' },
  { id: 'AAR', label: 'AAR' },
]

const DIRECTIONS: { id: 'D' | 'A'; label: string }[] = [
  { id: 'D', label: 'Afgange' },
  { id: 'A', label: 'Ankomster' },
]

// Times come from different upstreams in different shapes: CPH sends ISO
// datetimes, BLL/AAR send bare "HH:MM" strings already in Danish local time.
function formatTime(value: string): string {
  if (!value.includes('T')) return value
  return new Date(value).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
}

function PillGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted p-0.5 w-fit">
      {options.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            'rounded px-2 py-0.5 text-xs font-medium transition-colors',
            value === id
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function FlightBoard() {
  const [airport, setAirport] = useState<AirportCode>('CPH')
  const [direction, setDirection] = useState<'A' | 'D'>('D')
  const { data, isLoading, error } = useAirportBoard(airport, direction)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <PillGroup options={AIRPORTS} value={airport} onChange={setAirport} />
        <PillGroup options={DIRECTIONS} value={direction} onChange={setDirection} />
      </div>

      {isLoading ? (
        <WidgetSkeleton lines={3} />
      ) : error || !data?.data ? (
        <WidgetError label="Flydata utilgængelig" />
      ) : !data.data.flights.length ? (
        <p className="text-xs text-muted-foreground">Ingen fly i vinduet</p>
      ) : (
        <ScrollArea className="h-56">
          <ul className="space-y-2 pr-2">
            {data.data.flights.map((f, i) => (
              <li key={`${f.iata}-${f.scheduled}-${i}`} className="flex items-start justify-between gap-2 text-xs">
                <div className="font-mono tabular-nums shrink-0">
                  {f.delayed ? (
                    <div className="flex items-center gap-1.5">
                      <span className="line-through text-muted-foreground">{formatTime(f.scheduled)}</span>
                      <span className="text-red-400">{formatTime(f.expected)}</span>
                    </div>
                  ) : (
                    <span className="text-foreground">{formatTime(f.expected)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{f.iata}</p>
                  <p className="text-muted-foreground truncate">{f.city}</p>
                </div>
                <div className="text-right text-muted-foreground shrink-0">
                  {f.gate && <p>{f.gate}</p>}
                  <p className="truncate max-w-20">{f.status}</p>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </div>
  )
}
