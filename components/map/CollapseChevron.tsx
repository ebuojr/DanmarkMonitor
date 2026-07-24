'use client'

import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// Small shared collapse toggle for the map info panels (JourneyPanel,
// FlightPanel, the turbine/road/solar card). Chevron points down when open,
// flips up when collapsed — the same affordance across all three.
export function CollapseChevron({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-expanded={open}
      aria-label={open ? 'Fold sammen' : 'Fold ud'}
      className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
    >
      <ChevronDown size={14} className={cn('transition-transform', !open && '-rotate-90')} />
    </button>
  )
}
