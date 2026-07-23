'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VEHICLE_TYPES, ROAD_CATEGORIES } from '@/lib/map/palette'
import type { VehicleType } from '@/lib/types/transport'

interface Props {
  showTransport: boolean
  showRoads: boolean
  showEnergy: boolean
  vehicleTypes: Set<VehicleType>
  roadCategories: Set<string>
  onVehicleTypeToggle: (type: VehicleType) => void
  onVehicleTypesReset: () => void
  onRoadCategoryToggle: (category: string) => void
  onRoadCategoriesReset: () => void
}

// Interactive legend: each row doubles as a per-type filter toggle. The
// legend is the one place every type/category is already listed with its
// exact map color, so filtering lives where the encoding is explained.
export function MapLegend({
  showTransport, showRoads, showEnergy,
  vehicleTypes, roadCategories,
  onVehicleTypeToggle, onVehicleTypesReset,
  onRoadCategoryToggle, onRoadCategoriesReset,
}: Props) {
  if (!showTransport && !showRoads && !showEnergy) return null

  return (
    <div className="absolute bottom-10 left-2 z-10 flex w-44 flex-col gap-2 max-h-[50dvh] overflow-y-auto overscroll-contain">
      {showRoads && (
        <LegendGroup
          title="Veje"
          total={ROAD_CATEGORIES.length}
          active={roadCategories.size}
          onReset={onRoadCategoriesReset}
        >
          {ROAD_CATEGORIES.map(({ category, label, color }) => (
            <FilterRow
              key={category}
              label={label}
              color={color}
              active={roadCategories.has(category)}
              onToggle={() => onRoadCategoryToggle(category)}
            />
          ))}
        </LegendGroup>
      )}

      {showTransport && (
        <LegendGroup
          title="Transport"
          total={VEHICLE_TYPES.length}
          active={vehicleTypes.size}
          onReset={onVehicleTypesReset}
        >
          {VEHICLE_TYPES.map(({ type, label, color, note }) => (
            <FilterRow
              key={type}
              label={label}
              color={color}
              note={note}
              active={vehicleTypes.has(type)}
              onToggle={() => onVehicleTypeToggle(type)}
            />
          ))}
        </LegendGroup>
      )}

      {showEnergy && (
        <LegendGroup title="Energi">
          <div className="flex items-center gap-2 min-h-6 px-1 text-xs">
            <span className="size-2.5 rounded-full bg-green-400 shrink-0 border border-black/20" />
            <span className="text-foreground/80">Vindmølleparker</span>
          </div>
        </LegendGroup>
      )}
    </div>
  )
}

interface GroupProps {
  title: string
  /** Filterable groups pass counts + reset; static groups (Energi) omit them. */
  total?: number
  active?: number
  onReset?: () => void
  children: React.ReactNode
}

function LegendGroup({ title, total, active, onReset, children }: GroupProps) {
  // Map real estate is scarce on phones: groups start collapsed below lg.
  // One-time init is safe — DenmarkMap only renders client-side (ssr: false).
  const [open, setOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  )
  const filtered = total !== undefined && active !== undefined && active < total

  return (
    <div className="rounded-lg bg-background/90 border border-border backdrop-blur-sm">
      <div className="flex items-center">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex flex-1 min-w-0 items-center justify-between gap-2 px-3 min-h-9 lg:min-h-7 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          <span className="truncate">
            {title}
            {filtered && <span className="ml-1.5 normal-case tracking-normal text-muted-foreground/70">{active}/{total}</span>}
          </span>
          <ChevronDown size={13} className={cn('shrink-0 transition-transform', open && 'rotate-180')} />
        </button>
        {filtered && onReset && (
          <button
            onClick={onReset}
            className="shrink-0 px-2 min-h-9 lg:min-h-7 text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Alle
          </button>
        )}
      </div>
      {open && <div className="flex flex-col gap-0.5 px-2 pb-2">{children}</div>}
    </div>
  )
}

function FilterRow({ label, color, note, active, onToggle }: {
  label: string
  color: string
  note?: string
  active: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        'flex w-full items-center gap-2 rounded px-1 min-h-9 lg:min-h-6 text-xs transition-colors hover:bg-muted/60',
        !active && 'opacity-40'
      )}
    >
      <span
        className="size-2.5 rounded-full shrink-0 border"
        // Hollow dot (border-only) marks a filtered-out type.
        style={active ? { backgroundColor: color, borderColor: 'rgba(0,0,0,0.2)' } : { borderColor: color }}
      />
      <span className="min-w-0 text-left text-foreground/80">
        {label}
        {note && <span className="ml-1.5 text-[10px] text-muted-foreground/70">({note})</span>}
      </span>
    </button>
  )
}
