'use client'

import { useState } from 'react'
import { useDisruptions } from '@/lib/hooks/useDisruptions'
import type { Disruption } from '@/lib/api/hafas'
import { TYPE_COLOR } from '@/lib/map/palette'
import { WidgetSkeleton, WidgetError } from '@/components/ui/widget-state'

// Sidebar is one scroll column, so cap the visible list; a full disruption
// feed is 50+ bus reroutes and would dominate the panel.
const INITIAL = 5

function DisruptionRow({ d }: { d: Disruption }) {
  const [open, setOpen] = useState(false)
  const color = TYPE_COLOR[d.type] ?? '#94a3b8'
  const period = d.end ? `til ${d.end}` : d.start ? `fra ${d.start}` : null

  return (
    <button
      onClick={() => setOpen((o) => !o)}
      className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/50 transition-colors"
    >
      <span className="mt-1 size-2 shrink-0 rounded-full border border-black/20" style={{ backgroundColor: color }} />
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-medium text-foreground ${open ? '' : 'line-clamp-2'}`}>{d.head}</p>
        {open && d.text && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{d.text}</p>}
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
          {d.company && <span className="uppercase tracking-wide">{d.company}</span>}
          {period && <span>· {period}</span>}
        </div>
      </div>
    </button>
  )
}

export function DisruptionsWidget() {
  const { data, isLoading, error } = useDisruptions()
  const [expanded, setExpanded] = useState(false)

  if (isLoading) {
    return (
      <div className="px-2">
        <WidgetSkeleton lines={4} />
      </div>
    )
  }

  if (error || !data?.data) {
    return (
      <div className="px-2">
        <WidgetError label="Trafikmeldinger utilgængelige" />
      </div>
    )
  }

  const all = data.data.disruptions
  if (!all.length) {
    return <p className="px-3 py-2 text-xs text-muted-foreground">Ingen aktuelle trafikmeldinger</p>
  }

  const shown = expanded ? all : all.slice(0, INITIAL)

  return (
    <div className="space-y-0.5">
      {shown.map((d) => (
        <DisruptionRow key={d.id} d={d} />
      ))}
      {all.length > INITIAL && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full px-2 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? 'Vis færre' : `Vis ${all.length - INITIAL} flere`}
        </button>
      )}
    </div>
  )
}
