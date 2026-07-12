# DanmarkMonitor — agent context

Real-time Denmark dashboard: MapLibre map + sidebars, Next.js 16 App Router,
React 19, TypeScript strict, Tailwind v4 (CSS-only config), SWR polling.

## Verify changes
- `npx tsc --noEmit` — typecheck (must pass)
- `npm run lint` — eslint (no known debt; must exit 0 with zero problems)
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
- Aircraft positions come from adsb.lol (`lib/api/adsb.ts`, public ADS-B
  feed, no auth). Each aircraft's route (origin/destination airport, airline)
  is resolved via adsbdb.com (`lib/api/adsbdb.ts`, free, no auth, no batch
  endpoint — per-callsign lookups only). `/api/flights` keeps only aircraft
  whose route touches Denmark (`origin.countryIso === 'DK' ||
  destination.countryIso === 'DK'`); aircraft whose callsign doesn't resolve
  are excluded by design (ADS-B alone can't prove a Danish connection) — this
  deliberately drops military/GA traffic with no filed route. adsbdb returns
  HTTP 404 (not 200) with `{"response":"unknown callsign"}` for a genuine
  unknown — that's cached negatively (15min TTL); network/timeout failures
  are NOT cached so they retry next poll. Positive lookups cache 6h, capped
  at 1000 entries (oldest-eviction) — community-run upstream, no SLA, so the
  cache exists to be polite as much as for latency. If adsbdb goes down,
  adsb.lol's `/api/0/routeset` POST is an unexplored fallback (returned
  201-empty in an initial probe — shape needs rework). The CPH
  arrivals/departures board comes from Copenhagen Airport's own undocumented
  site API, `GetFlightInfoTable` (`lib/api/cph.ts`) — treat as
  change-without-notice; note its `Destination` field holds the *origin*
  city on arrivals (CPH reuses the field name). `/api/airport` also serves
  **Billund** (`lib/api/bll.ts`) and **Aarhus** (`lib/api/aar.ts`) via the
  `code` query param (`CPH`/`BLL`/`AAR`):
  - Billund: undocumented Umbraco surface-controller JSON,
    `bll.dk/umbraco/surface/FtpData/{Arrival,Departure}FlightsData` — no auth,
    change-without-notice. Times are bare `"HH:MM"` strings (already Danish
    local), not ISO; no gate is exposed in this feed.
  - Aarhus: no API at all — `aar.dk/flytider/` server-renders a tabbed HTML
    table (`#nav-departures`/`#nav-arrivals`) that's regex-scraped, same
    fragility class as `wallnot.ts`. The table covers *two* calendar days
    with no per-row date, so identical flight+time rows can legitimately
    recur (e.g. a daily SK1248 at 12:30 today and tomorrow) — widget list
    keys must not assume `iata+scheduled` is unique. Fails soft: returns `[]`
    and `console.warn`s on markup drift, letting the route's generic catch
    handle real upstream failure separately.
  - Aalborg and Odense/HCA publish no live flight board anywhere (checked
    2026-07-12: homepage, sitemap, and path guesses on aal.dk all came up
    empty, and Odense/HCA has no meaningful scheduled traffic) — don't add
    fake entries for them; if either ever publishes one, follow the
    fetcher-per-airport pattern above.
- Times/dates: upstream data is Europe/Copenhagen; never index hourly arrays
  with `getUTCHours()`.

## Conventions
- Conventional commits (`feat:`/`fix:`/`chore:`).
- No API keys, no .env — everything uses public endpoints. Keep it that way
  or document loudly.
- Plans for agent execution live in `plans/` (see `plans/README.md`).
