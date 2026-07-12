'use client'

import { useState } from 'react'
import { useAirportBoard } from '@/lib/hooks/useAirportBoard'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

const DIRECTIONS: { id: 'D' | 'A'; label: string }[] = [
  { id: 'D', label: 'Afgange' },
  { id: 'A', label: 'Ankomster' },
]

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
}

export function FlightBoard() {
  const [direction, setDirection] = useState<'A' | 'D'>('D')
  const { data, isLoading } = useAirportBoard(direction)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted p-0.5 w-fit">
        {DIRECTIONS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setDirection(id)}
            className={cn(
              'rounded px-2 py-0.5 text-xs font-medium transition-colors',
              direction === id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
          <div className="h-3 bg-muted rounded w-2/3" />
        </div>
      ) : !data?.data?.flights.length ? (
        <p className="text-xs text-muted-foreground">
          {data?.error ? 'Flydata utilgængelig' : 'Ingen fly i vinduet'}
        </p>
      ) : (
        <ScrollArea className="h-56">
          <ul className="space-y-2 pr-2">
            {data.data.flights.map((f) => (
              <li key={f.iata + f.scheduled} className="flex items-start justify-between gap-2 text-xs">
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
