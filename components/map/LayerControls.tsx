'use client'

import { cn } from '@/lib/utils'
import type { LayerType } from './DenmarkMap'

const LAYERS: { id: LayerType; label: string; icon: string }[] = [
  { id: 'weather', label: 'Vejr', icon: '🌤' },
  { id: 'energy', label: 'Energi', icon: '⚡' },
  { id: 'transport', label: 'Transport', icon: '🚆' },
  { id: 'cameras', label: 'Kameraer', icon: '📷' },
]

interface Props {
  activeLayers: Set<LayerType>
  onToggle: (layer: LayerType) => void
}

export function LayerControls({ activeLayers, onToggle }: Props) {
  return (
    <div className="flex items-center gap-1">
      {LAYERS.map(({ id, label, icon }) => {
        const active = activeLayers.has(id)
        return (
          <button
            key={id}
            onClick={() => onToggle(id)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )}
          >
            <span>{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
