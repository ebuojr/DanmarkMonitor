'use client'

import { useEffect, useRef } from 'react'
import { Bus, Train, X } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Journey, JourneyStop, VehicleType } from '@/lib/types/transport'
import { TYPE_COLOR } from '@/lib/map/palette'

const VEHICLE_LABEL: Record<VehicleType, string> = {
  ic: 'IC / Lyntog',
  regional: 'Regional',
  stog: 'S-tog',
  metro: 'Metro',
  bus: 'Bus',
  other: 'Transport',
}

interface Props {
  jid: string
  name: string
  type: VehicleType
  destination: string
  journey?: Journey
  isLoading: boolean
  onClose: () => void
}

// ── Progress derivation ───────────────────────────────────────────────────
// Display-only heuristic: compares each stop's dep/arr "HH:MM" (Copenhagen
// wall-clock, from HAFAS) against the current wall-clock minute. Tolerant of
// day-wrap (overnight journeys) via a 12h-away reinterpretation. If this
// misleads for scheduled-only operators, the honest upgrade is projecting
// the live vehicle coordinate onto `journey.line` instead (deferred, see
// plans/012-map-panel-ux.md).
type StopStatus = 'passed' | 'next' | 'upcoming'

function nowMinutesCopenhagen(): number {
  // Use formatToParts rather than parsing a locale-formatted string — da-DK's
  // time separator is "." in some ICU builds ("19.21") and ":" in others, so
  // splitting on ":" silently produced NaN on the former. Numeric parts are
  // separator-independent.
  const parts = new Intl.DateTimeFormat('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Copenhagen',
  }).formatToParts(new Date())
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  return h * 60 + m
}

function parseHHMM(t: string): number | undefined {
  const match = /^(\d{1,2}):(\d{2})$/.exec(t)
  if (!match) return undefined
  return Number(match[1]) * 60 + Number(match[2])
}

// Reinterpret a >12h gap either way as a day-wrap so overnight journeys
// (a stop just after midnight while "now" is late evening, or vice versa)
// don't get classified backwards.
function wrappedDiffMinutes(stopMin: number, nowMin: number): number {
  let diff = stopMin - nowMin
  if (diff > 720) diff -= 1440
  else if (diff < -720) diff += 1440
  return diff
}

function classifyStops(stops: JourneyStop[], nowMin: number): { statuses: StopStatus[]; nextIndex: number } {
  const statuses: StopStatus[] = stops.map((s) => {
    const t = s.dep ?? s.arr
    const stopMin = t ? parseHHMM(t) : undefined
    if (stopMin === undefined) return 'upcoming'
    return wrappedDiffMinutes(stopMin, nowMin) < 0 ? 'passed' : 'upcoming'
  })
  const nextIndex = statuses.findIndex((s) => s !== 'passed')
  if (nextIndex !== -1) statuses[nextIndex] = 'next'
  return { statuses, nextIndex }
}

export function JourneyPanel({ jid, name, type, destination, journey, isLoading, onClose }: Props) {
  const color = TYPE_COLOR[type] ?? TYPE_COLOR.other
  const stops = journey?.stops ?? []
  // Header terminus follows the actual JourneyDetails stop list — the
  // vehicle-feed dirTxt (the `destination` prop) can advertise a terminus
  // beyond the segment this journey actually covers (e.g. "Aarhus H" while
  // the tracked stops end at Fredericia). Prop remains the loading fallback.
  const headerDestination = stops.length > 0 ? stops[stops.length - 1].name : destination

  // Recomputed on every render (cheap — a handful of stops); no need to
  // memoize a "now"-dependent value across renders.
  const { statuses, nextIndex } = classifyStops(stops, nowMinutesCopenhagen())
  // Auto-scroll anchors on the next upcoming stop; when the vehicle is
  // at/past its terminus, anchor on the last stop instead.
  const scrollIndex = nextIndex === -1 ? stops.length - 1 : nextIndex

  const nextStopRef = useRef<HTMLLIElement>(null)
  const scrolledForRef = useRef<string | null>(null)
  useEffect(() => {
    if (isLoading || stops.length === 0) return
    if (scrolledForRef.current === jid) return
    scrolledForRef.current = jid
    nextStopRef.current?.scrollIntoView({ block: 'center' })
  }, [jid, isLoading, stops.length])

  return (
    <Card className="w-72 max-w-[calc(100vw-1.5rem)] shadow-lg gap-0 py-0">
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
          {headerDestination && (
            <span className="text-xs text-muted-foreground truncate">
              → <span className="text-foreground font-medium">{headerDestination}</span>
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
          <ScrollArea className="h-56 max-h-[40vh]">
            <div className="relative pr-2">
              {/* Gutter is w-4 (16px); the line sits at its horizontal
                  center (left-2 = 8px) so dots — rendered centered inside
                  the same gutter — always bisect it, regardless of dot
                  size or border. */}
              <div
                className="absolute left-2 top-3 bottom-3 border-l"
                style={{ borderColor: color, opacity: 0.4 }}
              />
              <ul className="space-y-3">
                {stops.map((stop, i) => {
                  const status = statuses[i]
                  return (
                    <li key={`stop-${i}`} ref={i === scrollIndex ? nextStopRef : undefined} className="flex items-start gap-2 relative">
                      <span className="w-4 shrink-0 flex justify-center pt-0.5">
                        <span
                          className={cn(
                            'relative z-10 size-2.5 rounded-full border border-background shrink-0',
                            status === 'passed' && 'opacity-40',
                          )}
                          style={{
                            backgroundColor: color,
                            boxShadow: status === 'next' ? `0 0 0 3px ${color}4D` : undefined,
                          }}
                        />
                      </span>
                      <div className="flex-1 flex items-baseline justify-between gap-2 min-w-0">
                        <span className={cn('text-xs truncate', status === 'passed' ? 'text-muted-foreground' : 'text-foreground/90')}>
                          {stop.name}
                        </span>
                        <span className="font-mono tabular-nums text-muted-foreground text-xs shrink-0">
                          {stop.dep ?? stop.arr ?? ''}
                          {stop.delayMin !== undefined && stop.delayMin > 0 && (
                            <span className="text-red-400 text-[10px]"> +{stop.delayMin}</span>
                          )}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
