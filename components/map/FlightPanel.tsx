'use client'

import { Plane, X } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import type { RouteAirport } from '@/lib/types/flights'

interface Props {
  callsign: string
  airline: string
  origin: RouteAirport
  destination: RouteAirport
  alt: number
  speed: number
  onClose: () => void
}

function airportLabel(a: RouteAirport): string {
  const place = a.municipality || a.name
  return a.iata ? `${place} (${a.iata})` : place
}

export function FlightPanel({ callsign, airline, origin, destination, alt, speed, onClose }: Props) {
  return (
    <Card className="w-72 max-w-[calc(100vw-1.5rem)] shadow-lg gap-0 py-0">
      <CardHeader className="px-3 py-2.5 border-b border-border/60 bg-muted/30 rounded-t-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Plane size={14} className="text-pink-400 shrink-0" />
            <span className="text-sm font-semibold text-foreground truncate">{callsign}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X size={13} />
          </button>
        </div>
        {airline && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="secondary">{airline}</Badge>
          </div>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="px-3 py-2.5 space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="min-w-0 flex-1 text-foreground/90 truncate">{airportLabel(origin)}</span>
          <Plane size={12} className="text-pink-400 shrink-0 rotate-90" />
          <span className="min-w-0 flex-1 text-foreground/90 truncate text-right">{airportLabel(destination)}</span>
        </div>
        <p className="text-muted-foreground text-xs">{Math.round(alt)} ft &middot; {Math.round(speed)} kn</p>
      </CardContent>
    </Card>
  )
}
