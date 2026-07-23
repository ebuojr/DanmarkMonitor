import type { ReactNode, ComponentType } from 'react'

interface SectionHeaderProps {
  icon: ComponentType<{ size?: number; className?: string }>
  label: string
  action?: ReactNode
}

export function SectionHeader({ icon: Icon, label, action }: SectionHeaderProps) {
  return (
    // Sticky within the sidebar's scroll container — the active section
    // stays labeled while its content scrolls. Solid bg so rows never
    // bleed through.
    <div className="sticky top-0 z-10 bg-background flex items-center gap-2 px-3 py-2 border-b border-border/50">
      <Icon size={13} className="text-muted-foreground shrink-0" />
      <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </span>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  )
}
