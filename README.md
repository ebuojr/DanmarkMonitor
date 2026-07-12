# DanmarkMonitor

Real-time situational awareness dashboard for Denmark. Live map with weather, energy, transport, and road traffic — all in one command-center view.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript) ![MapLibre](https://img.shields.io/badge/MapLibre-GL-green)

## What it shows

- **Weather** — Live temperature readings from ~300 DMI stations across Denmark, plus active weather warnings
- **Energy** — Real-time electricity production mix (wind, solar, nuclear imports, fossil) and CO₂ intensity
- **Transport** — Live positions of trains, S-tog, metro, and buses with motion trails and destination info
- **Road traffic** — Live incidents from Vejdirektoratet: roadblocks, roadworks, queue warnings, ice/snow, and more
- **Spot prices** — DK1 (vest) and DK2 (øst) electricity spot prices in øre/kWh via billigkwh.dk
- **Stocks** — OMXC25 index and major Danish equities (Novo Nordisk, Mærsk, DSV, Ørsted, Carlsberg)
- **News** — Cycling headlines from Danish outlets (wallnot.dk) in the bottom bar, full feed in the left sidebar

## Map modes

| Mode | Description |
|------|-------------|
| Nat | Inverted OSM — dark, high contrast |
| Satellit | ESRI World Imagery |
| Standard | CartoDB Voyager — clean and readable |

## Stack

- **Next.js 16** App Router + React 19 + TypeScript
- **MapLibre GL JS** for all map rendering
- **Tailwind v4** CSS-only config
- **SWR** for client-side data polling
- **hls.js** for live video streaming

All external data is fetched server-side through Next.js API routes — no API keys required.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npx tsc --noEmit   # type check
npm run build      # production build
```

## License

MIT
