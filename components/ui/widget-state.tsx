export function WidgetSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 bg-muted rounded" style={{ width: i % 2 === 0 ? '75%' : '50%' }} />
      ))}
    </div>
  )
}

export function WidgetError({ label }: { label: string }) {
  return <p className="text-xs text-muted-foreground">{label}</p>
}
