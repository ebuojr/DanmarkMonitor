'use client'

import { Sun, Moon, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MapStyle } from '@/components/map/DenmarkMap'

const MAP_STYLES: { id: MapStyle; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'light',     label: 'Lys',      Icon: Sun   },
  { id: 'dark',      label: 'Mørk',     Icon: Moon  },
  { id: 'satellite', label: 'Satellit', Icon: Globe },
]

interface Props {
  value: MapStyle
  onChange: (style: MapStyle) => void
  /** Text labels next to the icons (md+ only); icon-only when false. */
  showLabels?: boolean
}

export function MapStyleToggle({ value, onChange, showLabels = false }: Props) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted p-0.5">
      {MAP_STYLES.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          title={label}
          aria-pressed={value === id}
          className={cn(
            'flex items-center justify-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors',
            value === id
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon size={12} />
          {showLabels && <span className="hidden md:inline">{label}</span>}
        </button>
      ))}
    </div>
  )
}
