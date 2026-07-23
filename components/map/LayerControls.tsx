'use client'

import { Cloud, Zap, Train, AlertTriangle, Plane } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LayerType } from './DenmarkMap'

const LAYERS: { id: LayerType; label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'weather',     label: 'Vejr',      Icon: Cloud          },
  { id: 'energy',      label: 'Energi',    Icon: Zap            },
  { id: 'transport',   label: 'Transport', Icon: Train          },
  { id: 'roadtraffic', label: 'Veje',      Icon: AlertTriangle  },
  { id: 'flights',     label: 'Fly',       Icon: Plane          },
]

interface Props {
  activeLayers: Set<LayerType>
  onToggle: (layer: LayerType) => void
}

export function LayerControls({ activeLayers, onToggle }: Props) {
  return (
    <div className="flex items-center gap-1">
      {LAYERS.map(({ id, label, Icon }) => {
        const active = activeLayers.has(id)
        return (
          <button
            key={id}
            onClick={() => onToggle(id)}
            aria-pressed={active}
            className={cn(
              // ≥40px touch targets below lg; desktop keeps the dense header fit.
              'flex items-center gap-1.5 rounded-md px-3 min-h-10 lg:min-h-7 lg:px-2.5 text-xs font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
