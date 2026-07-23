'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Train, Plane, Wind, AlertTriangle, MapPin, Newspaper, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSearchIndex, GROUP_LABEL, type SearchGroup, type SearchResult } from './useSearchIndex'

const GROUP_ICON: Record<SearchGroup, React.ComponentType<{ size?: number; className?: string }>> = {
  transport: Train,
  flights: Plane,
  energy: Wind,
  roadtraffic: AlertTriangle,
  airports: MapPin,
  news: Newspaper,
}

const GROUP_ORDER: SearchGroup[] = ['transport', 'flights', 'energy', 'roadtraffic', 'airports', 'news']

interface Props {
  onClose: () => void
  onSelect: (result: SearchResult) => void
}

export function SearchModal({ onClose, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const groups = useSearchIndex(query)

  const flat = useMemo(
    () => GROUP_ORDER.flatMap((g) => groups[g]),
    [groups]
  )

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (flat.length) setActiveIndex((i) => (i + 1) % flat.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (flat.length) setActiveIndex((i) => (i - 1 + flat.length) % flat.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const result = flat[activeIndex]
      if (result) onSelect(result)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[10dvh] px-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg w-[calc(100vw-2rem)] max-h-[min(76dvh,42rem)] flex-col rounded-xl border border-border bg-background shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3.5 py-1.5">
          <Search size={18} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Søg efter tog, bus, fly, vindmøllepark, vej, lufthavn, nyhed…"
            className="w-full min-h-12 bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-1.5 pb-2">
            {flat.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Ingen resultater
              </p>
            )}

            {flat.map((result, idx) => {
              const showHeader = idx === 0 || flat[idx - 1].group !== result.group
              const Icon = GROUP_ICON[result.group]
              const active = idx === activeIndex
              return (
                <div key={`${result.group}-${result.id}`}>
                  {showHeader && (
                    <p className="px-2.5 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                      {GROUP_LABEL[result.group]}
                    </p>
                  )}
                  <button
                    ref={active ? (el) => el?.scrollIntoView({ block: 'nearest' }) : undefined}
                    onClick={() => onSelect(result)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                      active ? 'bg-muted' : 'hover:bg-muted/60'
                    )}
                  >
                    <Icon size={14} className="text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">{result.primary}</p>
                      {result.secondary && (
                        <p className="truncate text-xs text-muted-foreground">{result.secondary}</p>
                      )}
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="hidden sm:flex shrink-0 items-center gap-3 border-t border-border px-3.5 py-1.5 text-[10px] text-muted-foreground">
          <span><kbd className="rounded border border-border px-1 py-0.5">↑↓</kbd> naviger</span>
          <span><kbd className="rounded border border-border px-1 py-0.5">Enter</kbd> vælg</span>
          <span><kbd className="rounded border border-border px-1 py-0.5">Esc</kbd> luk</span>
        </div>
      </div>
    </div>
  )
}
