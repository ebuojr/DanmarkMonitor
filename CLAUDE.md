# DanmarkMonitor — agent context

Real-time Denmark dashboard: MapLibre map + sidebars, Next.js 16 App Router,
React 19, TypeScript strict, Tailwind v4 (CSS-only config), SWR polling.

## Verify changes
- `npx tsc --noEmit` — typecheck (must pass)
- `npm run lint` — eslint (has 1 known pre-existing error in CommandCenter.tsx; do not add new ones)
- `npm run build` — production build (must pass; Vercel deploys this)
- No test suite yet.

## Architecture map
- `app/api/*/route.ts` — server-side proxies to public Danish APIs; response
  shape is always `{ data, error?, updatedAt }`, HTTP 200 or 500.
- `lib/api/*` — upstream fetch + parse. Vehicles and journeys come from
  Rejseplanen's HAFAS mgate JSON endpoint via `lib/api/hafas.ts` (public web
  `aid`, ver 1.24; `JourneyGeoPos` for live positions, `JourneyDetails` for
  full routes; polyline is standard encoded, precision 5). HIGHEST-RISK CODE
  otherwise: hand-rolled UTM32→WGS84 in `app/api/roadtraffic/route.ts`, regex
  HTML scraping in `wallnot.ts`.
- `lib/hooks/*` — thin SWR polling hooks; shared fetcher in `lib/hooks/fetcher.ts`
  throws on non-2xx.
- `components/map/DenmarkMap.tsx` — all MapLibre sources/layers/popups.
- Times/dates: upstream data is Europe/Copenhagen; never index hourly arrays
  with `getUTCHours()`.

## Conventions
- Conventional commits (`feat:`/`fix:`/`chore:`).
- No API keys, no .env — everything uses public endpoints. Keep it that way
  or document loudly.
- Plans for agent execution live in `plans/` (see `plans/README.md`).
