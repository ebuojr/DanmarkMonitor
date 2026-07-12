'use client'

import { Bus, Train, X } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import type { Journey, VehicleType } from '@/lib/types/transport'

const VEHICLE_LABEL: Record<VehicleType, string> = {
  ic: 'IC / Lyntog',
  regional: 'Regional',
  stog: 'S-tog',
  metro: 'Metro',
  bus: 'Bus',
  other: 'Transport',
}

const TYPE_COLOR: Record<VehicleType, string> = {
  ic: '#f59e0b',
  regional: '#fb923c',
  stog: '#60a5fa',
  metro: '#a78bfa',
  bus: '#4ade80',
  other: '#94a3b8',
}

interface Props {
  name: string
  type: VehicleType
  destination: string
  journey?: Journey
  isLoading: boolean
  onClose: () => void
}

export function JourneyPanel({ name, type, destination, journey, isLoading, onClose }: Props) {
  const color = TYPE_COLOR[type] ?? TYPE_COLOR.other

  return (
    <Card className="w-72 shadow-lg gap-0 py-0">
      <CardHeader className="px-3 py-2.5 border-b border-border/60 bg-muted/30 rounded-t-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {type === 'bus' ? (
              <Bus size={14} className="text-green-400 shrink-0" />
            ) : (
              <Train size={14} className="text-blue-400 shrink-0" />
            )}
            <span className="text-sm font-semibold text-foreground truncate">{name}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X size={13} />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <Badge variant="secondary">{VEHICLE_LABEL[type] ?? 'Transport'}</Badge>
          {destination && (
            <span className="text-xs text-muted-foreground truncate">
              → <span className="text-foreground font-medium">{destination}</span>
            </span>
          )}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="px-3 py-2.5">
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </div>
        ) : !journey || journey.stops.length === 0 ? (
          <p className="text-xs text-muted-foreground">Rute utilgængelig</p>
        ) : (
          <ScrollArea className="h-56">
            <div className="relative pl-1 pr-2">
              <div
                className="absolute left-[6.5px] top-3 bottom-3 border-l"
                style={{ borderColor: color, opacity: 0.4 }}
              />
              <ul className="space-y-3">
                {journey.stops.map((stop, i) => (
                  <li key={i} className="flex items-start gap-2 relative">
                    <span
                      className="relative z-10 mt-0.5 size-2.5 rounded-full border border-background shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex-1 flex items-baseline justify-between gap-2 min-w-0">
                      <span className="text-xs text-foreground/90 truncate">{stop.name}</span>
                      <span className="font-mono tabular-nums text-muted-foreground text-xs shrink-0">
                        {stop.dep ?? stop.arr ?? ''}
                        {stop.delayMin !== undefined && stop.delayMin > 0 && (
                          <span className="text-red-400 text-[10px]"> +{stop.delayMin}</span>
                        )}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
