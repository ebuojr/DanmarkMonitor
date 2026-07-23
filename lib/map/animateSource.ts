import type maplibregl from 'maplibre-gl'
import type { GeoJSON } from 'geojson'

// Tweens a GeoJSON point source between poll snapshots so markers glide
// instead of teleporting every refresh. Feed each fresh snapshot through
// `update()`; the animator lerps every known feature from its currently
// rendered position to the new target and writes the source via setData at
// most `maxFps` times per second. Linear easing on purpose — vehicles move
// at roughly constant speed, and ease-in-out reads as stop-start.
//
// Truth-to-truth interpolation only: no dead-reckoning from heading/speed
// (available for aircraft), because extrapolation overshoots turns and
// would need a second correction pass. If prediction is ever wanted, it
// slots into `update()` as an adjusted `to` target.

export interface AnimatedPoint {
  id: string
  lon: number
  lat: number
  /** Written through to the feature every frame — latest snapshot wins. */
  properties: Record<string, unknown>
}

export interface SourceAnimator {
  /**
   * Feed a fresh poll snapshot. Existing ids tween from their currently
   * rendered position to the new target over durationMs; new ids appear
   * instantly at their target; ids missing from the snapshot drop instantly.
   */
  update(points: AnimatedPoint[]): void
  /** Cancel the rAF loop, snap to final positions, remove listeners. */
  dispose(): void
}

interface Tween {
  from: [number, number]
  to: [number, number]
  properties: Record<string, unknown>
}

export function createSourceAnimator(
  map: maplibregl.Map,
  sourceId: string,
  opts: { durationMs: number; maxFps?: number }
): SourceAnimator {
  const { durationMs } = opts
  const minFrameMs = 1000 / (opts.maxFps ?? 30)

  // Last coordinates actually written to the source, per feature id — the
  // `from` of the next tween, so a poll arriving mid-tween never snaps.
  const rendered = new Map<string, [number, number]>()
  let tweens = new Map<string, Tween>()
  let startTime = 0
  let lastWrite = 0
  let rafId: number | null = null
  let disposed = false

  const writeFrame = (t: number) => {
    const features: GeoJSON.Feature[] = []
    for (const [id, tw] of tweens) {
      const lon = tw.from[0] + (tw.to[0] - tw.from[0]) * t
      const lat = tw.from[1] + (tw.to[1] - tw.from[1]) * t
      rendered.set(id, [lon, lat])
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: tw.properties,
      })
    }
    // Optional-chained: the source can be gone during map teardown.
    const source = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined
    source?.setData({ type: 'FeatureCollection', features })
  }

  const frame = () => {
    rafId = null
    const now = performance.now()
    const t = Math.min(1, (now - startTime) / durationMs)
    if (t >= 1) {
      // Final frame always writes, then the loop stops — no idle rAF
      // burning between polls.
      writeFrame(1)
      return
    }
    if (now - lastWrite >= minFrameMs) {
      lastWrite = now
      writeFrame(t)
    }
    rafId = requestAnimationFrame(frame)
  }

  const snapToTargets = () => {
    if (tweens.size === 0) return
    writeFrame(1)
  }

  const onVisibilityChange = () => {
    if (document.hidden) {
      // No point animating a hidden tab — snap so the return view starts
      // from truth instead of a frozen mid-tween frame.
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = null
      snapToTargets()
    }
    // On return: nothing to do — the next update() restarts the loop.
  }
  document.addEventListener('visibilitychange', onVisibilityChange)

  return {
    update(points) {
      if (disposed) return
      const next = new Map<string, Tween>()
      for (const p of points) {
        const to: [number, number] = [p.lon, p.lat]
        // Known id: tween from wherever it is currently drawn.
        // New id: appear at the target instantly (from === to).
        const from = rendered.get(p.id) ?? to
        next.set(p.id, { from, to, properties: p.properties })
      }
      // Ids absent from the snapshot drop instantly: `rendered` keeps only
      // surviving features so a re-appearing id (bbox pan churn) is treated
      // as new rather than tweened across the map.
      for (const id of rendered.keys()) {
        if (!next.has(id)) rendered.delete(id)
      }
      tweens = next
      startTime = performance.now()
      lastWrite = 0
      if (rafId === null && !document.hidden) rafId = requestAnimationFrame(frame)
      else if (document.hidden) snapToTargets()
    },
    dispose() {
      disposed = true
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = null
      document.removeEventListener('visibilitychange', onVisibilityChange)
    },
  }
}
