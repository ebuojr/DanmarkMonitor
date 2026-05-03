'use client'

import { useEffect, useRef, useState } from 'react'
import { Maximize2 } from 'lucide-react'

const STREAMS = [
  { id: 'sb1', label: 'Tårnet', url: 'https://stream.sob.m-dn.net/live/sb1/index.m3u8' },
  { id: 'sb2', label: 'Sprogø', url: 'https://stream.sob.m-dn.net/live/sb2/index.m3u8' },
] as const

type StreamId = (typeof STREAMS)[number]['id']

export function StorebaeltCamera() {
  const [active, setActive] = useState<StreamId>('sb1')
  const [error, setError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hlsRef = useRef<any>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const stream = STREAMS.find((s) => s.id === active)!
    setError(false)

    async function init() {
      // @ts-ignore — hls.js ships its own types but module resolution fails on some build envs
      const Hls = (await import('hls.js')).default

      hlsRef.current?.destroy()
      hlsRef.current = null

      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: false, lowLatencyMode: true })
        hlsRef.current = hls
        hls.loadSource(stream.url)
        hls.attachMedia(video!)
        hls.on(Hls.Events.MANIFEST_PARSED, () => { video!.play().catch(() => {}) })
        hls.on(Hls.Events.ERROR, (_evt, data) => { if (data.fatal) setError(true) })
      } else if (video!.canPlayType('application/vnd.apple.mpegurl')) {
        video!.src = stream.url
        video!.play().catch(() => {})
      } else {
        setError(true)
      }
    }

    init()
    return () => { hlsRef.current?.destroy(); hlsRef.current = null }
  }, [active])

  const enterFullscreen = () => {
    const el = containerRef.current
    if (!el) return
    if (el.requestFullscreen) el.requestFullscreen()
    else if ((el as unknown as { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen)
      (el as unknown as { webkitRequestFullscreen: () => void }).webkitRequestFullscreen()
  }

  return (
    <div className="flex flex-col">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border">
        {STREAMS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`flex-1 py-1 text-[10px] font-medium transition-colors ${
              active === s.id
                ? 'text-foreground border-b-2 border-primary -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Video */}
      <div ref={containerRef} className="group relative bg-black" style={{ aspectRatio: '16/9', maxHeight: 220 }}>
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">
            Stream utilgængelig
          </div>
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
          />
        )}
        {/* Fullscreen overlay — visible on hover */}
        <button
          onClick={enterFullscreen}
          title="Fuld skærm"
          className="absolute bottom-2 right-2 flex items-center justify-center size-7 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
        >
          <Maximize2 size={14} />
        </button>
      </div>
    </div>
  )
}
