'use client'

import { useState } from 'react'
import { AlertTriangle, Plane, X } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { CollapseChevron } from '@/components/map/CollapseChevron'
import type { FlightRoute, RouteAirport } from '@/lib/types/flights'

interface Props {
  callsign: string
  /** Typical route for the callsign (adsbdb) — null when unresolved. */
  route: FlightRoute | null
  /** Plane is far off the typical route's path — data likely stale. */
  routeMismatch?: boolean
  alt: number
  speed: number
  onClose: () => void
}

function airportLabel(a: RouteAirport): string {
  const place = a.municipality || a.name
  return a.iata ? `${place} (${a.iata})` : place
}

export function FlightPanel({ callsign, route, routeMismatch, alt, speed, onClose }: Props) {
  const [open, setOpen] = useState(true)
  return (
    <Card className="w-72 max-w-[calc(100vw-1.5rem)] shadow-lg gap-0 py-0">
      <CardHeader className="px-3 py-2.5 border-b border-border/60 bg-muted/30 rounded-t-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Plane size={14} className="text-pink-400 shrink-0" />
            <span className="text-sm font-semibold text-foreground truncate">{callsign}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <CollapseChevron open={open} onToggle={() => setOpen((o) => !o)} />
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={13} />
            </button>
          </div>
        </div>
        {open && route?.airline && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="secondary">{route.airline}</Badge>
          </div>
        )}
      </CardHeader>

      {open && <Separator />}

      {open && (
      <CardContent className="px-3 py-2.5 flex flex-col gap-2">
        {route && (
          <div className="flex flex-col gap-1">
            {/* adsbdb serves the callsign's usual filed route, not the live
                flight plan — label it as such rather than presenting it as
                authoritative. */}
            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Typisk rute</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="min-w-0 flex-1 text-foreground/90 truncate">{airportLabel(route.origin)}</span>
              <Plane size={12} className="text-pink-400 shrink-0 rotate-90" />
              <span className="min-w-0 flex-1 text-foreground/90 truncate text-right">{airportLabel(route.destination)}</span>
            </div>
            {routeMismatch && (
              <p className="flex items-center gap-1 text-[10px] text-amber-400">
                <AlertTriangle size={11} className="shrink-0" />
                Afviger fra flyets position – ruten er muligvis forældet
              </p>
            )}
          </div>
        )}
        <p className="text-muted-foreground text-xs">{Math.round(alt)} ft &middot; {Math.round(speed)} kn</p>
      </CardContent>
      )}
    </Card>
  )
}
