@AGENTS.md

# DanmarkMonitor — Project Guide

Real-time Danish situational awareness dashboard. Command-center layout: map center, alerts+news left sidebar, energy+weather+prices right sidebar, news ticker bottom.

## Stack

- **Next.js 16.2.4** App Router + React 19 + TypeScript
- **Tailwind v4** — CSS-only config (`@import "tailwindcss"` in globals.css, no tailwind.config.ts, uses `@theme inline`)
- **shadcn/ui** — Base UI primitives (NOT Radix). Import from `@base-ui/react/...`
- **MapLibre GL JS** — three base tile sets (OSM inverted, ESRI satellite, CartoDB Voyager)
- **SWR** — client-side polling for all data feeds
- **Lucide React** — all icons (no emojis in UI)
- **hls.js** — HLS video streaming for Storebælt live camera

## Key Patterns

### API Routes
All external calls go through Next.js route handlers in `app/api/`. Client never calls upstream APIs directly. Every route returns:
```ts
{ data: T | null, error?: string, updatedAt: string }
```

### Map Layers
`DenmarkMap.tsx` manages all MapLibre sources/layers. Layer visibility synced via `activeLayers: Set<LayerType>`. Adding a new layer requires:
1. Add type to `LayerType` union in `DenmarkMap.tsx`
2. Add source + layer in the `map.on('load')` handler
3. Wire click handler via `onLayerClick()` → sets `popupInfo` React state (no MapLibre popups)
4. Add visibility toggle in the `useEffect([mapReady, activeLayers])`
5. Add button to `LayerControls.tsx`

### Info Panel
Clicking any map feature sets `popupInfo` state which renders a React panel (top-left of map), not a MapLibre popup. Add new cases to the `PopupInfo` union type and the JSX switch in the return.

### Map Styles
Three base raster sources in `MAP_BASE_STYLE`. CSS class `map-invert` on the container applies the CSS invert filter only for the `dark` (OSM) style — satellite and flat show raw colors. Toggle via `mapStyle` prop from `CommandCenter`.

### Coordinate Quirks
- Rejseplanen livemap: coordinates in **millionths of degrees** (÷ 1,000,000), response in **Latin-1** encoding
- Vejdirektoratet road traffic: EPSG:25832 UTM32N meters → reprojected to WGS84 inline in `app/api/roadtraffic/route.ts`

## Data Sources

| Layer | Source | Auth | Refresh |
|-------|--------|------|---------|
| Weather (Vejr) | DMI open data — observations + CAP warnings | None | 10 min |
| Energy (Energi) | Energinet — live production mix | None | 1 min |
| Spot prices (Spotpris) | billigkwh.dk API — DK1/DK2 hourly `spotExMoms` | None | 5 min |
| Transport | Rejseplanen unofficial livemap | None | 30 s |
| Road traffic (Veje) | Vejdirektoratet GeoJSON feeds (9 categories) | None | 60 s |
| News ticker + sidebar | wallnot.dk HTML scrape (multi-source) | None | 10 min |
| Stocks | Yahoo Finance chart API (OMXC25 + 5 majors) | None | on load |
| Storebælt camera | HLS streams (sb1/sb2) | None | live |

## File Map

```
app/
  api/
    weather/route.ts              # DMI observations + warnings
    energy/route.ts               # Energinet production mix
    prices/route.ts               # Elspot DK1/DK2 prices
    transport/vehicles/route.ts   # Rejseplanen livemap vehicles
    alerts/route.ts               # DMI CAP warnings
    news/route.ts                 # wallnot.dk HTML scrape
    roadtraffic/route.ts          # Vejdirektoratet 9-feed merge + UTM→WGS84

components/
  dashboard/
    CommandCenter.tsx             # Root layout, map style toggle, LiveClock
    AlertsSidebar.tsx             # Left: alerts + stocks + news (fixed w-80)
    DataSidebar.tsx               # Right: camera + energy + prices + weather (fixed w-80)
    NewsTicker.tsx                # Bottom: cycling news headline ticker
  map/
    DenmarkMap.tsx                # MapLibre, all layers, info panel, legend
    LayerControls.tsx             # Header toggle buttons
  widgets/
    EnergyWidget.tsx              # Production mix bar + CO₂ intensity
    WeatherWidget.tsx             # 5 major cities + avg temp
    PriceWidget.tsx               # DK1/DK2 spot price in øre/kWh
    StocksWidget.tsx              # OMXC25 + 5 Danish stocks
    AlertWidget.tsx               # DMI active warnings
    NewsWidget.tsx                # Scrollable article list
    StorebaeltCamera.tsx          # HLS video + tab switch + fullscreen overlay

lib/
  api/
    dmi.ts / energinet.ts / prices.ts / wallnot.ts
    rejseplanen-livemap.ts        # Latin-1 decode, coordinate ÷1e6
    rss.ts                        # DR + TV2 RSS parser (legacy, unused)
    stocks.ts                     # Yahoo Finance v8 chart, parallel per-symbol
  data/
    wind-turbines.ts              # Static GeoJSON — 14 major offshore wind farms
  hooks/
    useWeather.ts / useEnergy.ts / usePrices.ts / useVehicles.ts
    useAlerts.ts / useNews.ts / useStocks.ts / useRoadTraffic.ts
  types/
    weather.ts / energy.ts / transport.ts / prices.ts
    alerts.ts / news.ts / stocks.ts / roadtraffic.ts
```

## Map Layers

| Toggle | Layer id | Dot color |
|--------|----------|-----------|
| Vejr | `weather-labels` | text labels (temp °C) |
| Energi | `turbine-circles` | green `#4ade80` |
| Transport | `vehicle-circles` + `vehicle-trails` | amber/orange/blue/purple/green/slate by type |
| Veje | `road-circles` | red→orange→yellow→purple→cyan per category |

## Dev Commands

```bash
npm run dev        # localhost:3000
npx tsc --noEmit   # type check
npm run build      # production build
```
