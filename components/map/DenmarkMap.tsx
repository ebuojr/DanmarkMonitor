'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'

export type LayerType = 'weather' | 'energy' | 'transport' | 'cameras'

interface Props {
  activeLayers: Set<LayerType>
}

const DENMARK_CENTER: [number, number] = [10.5, 56.3]
const DENMARK_ZOOM = 6

const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
}

export function DenmarkMap({ activeLayers }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: DENMARK_CENTER,
      zoom: DENMARK_ZOOM,
      minZoom: 5,
      maxZoom: 16,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right'
    )

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Layer visibility — stub for future layer data integration
  useEffect(() => {
    // Layer toggling will be wired here once data layers are added
    void activeLayers
  }, [activeLayers])

  return (
    <div className="relative size-full overflow-hidden">
      {/* Dark-mode inversion filter for OSM raster tiles */}
      <div
        ref={containerRef}
        className="size-full"
        style={{
          filter: 'invert(93%) hue-rotate(180deg) brightness(92%) contrast(88%) saturate(0.85)',
        }}
      />
    </div>
  )
}
