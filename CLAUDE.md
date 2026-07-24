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
  `aid`, ver 1.24; `JourneyGeoPos` for live positions — issued as TWO
  parallel PROD-filtered requests, rail (31) + road (992), merged by jid,
  because a single all-products request saturates its `maxJny` cap with
  Copenhagen buses and starves out the sparse country-wide trains;
  `JourneyDetails` for full routes; polyline is standard encoded, precision
  5). `fetchDisruptions()` in the same file uses HAFAS `HimSearch` for
  service messages (Trafikmeldinger widget, `/api/disruptions`). HIGHEST-RISK
  CODE otherwise: hand-rolled UTM32→WGS84 in `app/api/roadtraffic/route.ts`,
  regex HTML scraping in `wallnot.ts`.
- Static map datasets live in `lib/data/*` as hand-baked GeoJSON literals
  (source comment at top): `wind-turbines.ts`, `solar-parks.ts` (both Point,
  Energi layer, baked from OSM Overpass `power=plant`), and `metro-lines.ts`
  (MultiLineString — Copenhagen Metro M1-M4 + Aarhus/Odense letbane from OSM
  route relations). The metro overlay exists because the vector basemap only
  carries transit geometry from ~z11 and Rejseplanen has NO live metro
  positions (driverless) — verified — so metro is drawn as its own always-on
  line layers (`metro-lines`/`metro-lines-casing`) at every zoom, toggled by
  the "Metro / Letbane" legend row.
- DMI weather warnings (Varsler): DMI's official Open Data CAP collection
  needs a key and fails keyless, so `fetchWeatherWarnings()` in
  `lib/api/dmi.ts` scrapes the undocumented site API
  `dmi.dk/dmidk_byvejrWS/rest/json/Danmark/DK/WarningOverview` (no key;
  all-null payload when nothing active). Warnings ride the existing
  `/api/weather` envelope; `WarningsWidget` reuses `useWeather` (no separate
  route). Change-without-notice, soft-fails to no-warnings.
- `lib/hooks/*` — thin SWR polling hooks; shared fetcher in `lib/hooks/fetcher.ts`
  throws on non-2xx.
- `components/map/DenmarkMap.tsx` — all MapLibre sources/layers/popups.
  Basemaps (`lib/map/baseStyles.ts`): OpenFreeMap VECTOR styles for
  light (`bright`) and dark (`dark` + legibility overrides on the near-black
  stock rail/road/water paint) — free, no key; ESRI raster for satellite;
  Carto raster as offline fallback if the OFM style JSON fetch fails.
  Style switching is `map.setStyle()` — that WIPES app sources/layers, so
  `addDataLayers()` re-adds them on every `style.load` and a `styleEpoch`
  state bump re-runs all state-applying effects (data, visibility, filters,
  selection emphasis). Event handlers registered via `map.on(...)` survive
  setStyle and are registered once at init.
- Aircraft positions come from adsb.lol (`lib/api/adsb.ts`, public ADS-B
  feed, no auth). `/api/flights` serves EVERY airborne aircraft in the
  Denmark bbox whose position is fresh (`seen_pos`/`seen` ≤ 60s — stale
  landed planes are dropped). Each aircraft's route (origin/destination
  airport, airline) is *optional enrichment* resolved via adsbdb.com
  (`lib/api/adsbdb.ts`, free, no auth, no batch endpoint — per-callsign
  lookups only): `Aircraft.route` is `FlightRoute | null`, null for
  unresolved callsigns (military/GA/charter). adsbdb serves the callsign's
  *typical* route, not the live filed plan — the UI labels it "Typisk rute",
  and `Aircraft.routeMismatch` flags planes >150 km off the route's great
  circle (`lib/geo.ts` cross-track check) so the UI can warn instead of
  presenting a stale leg (e.g. a BLL→FRA flight whose callsign maps to
  BUD→FRA) as fact.
  Cold-cache lookups are budgeted (30/poll, `MAX_NEW_LOOKUPS_PER_POLL` in
  adsb.ts) so a fleet of unknowns resolves gradually. adsbdb returns
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
    keys must not assume `flightNo+scheduled` is unique. Fails soft: returns `[]`
    and `console.warn`s on markup drift, letting the route's generic catch
    handle real upstream failure separately.
  - Aalborg and Odense/HCA publish no live flight board anywhere (checked
    2026-07-12: homepage, sitemap, and path guesses on aal.dk all came up
    empty, and Odense/HCA has no meaningful scheduled traffic) — don't add
    fake entries for them; if either ever publishes one, follow the
    fetcher-per-airport pattern above.
- Times/dates: upstream data is Europe/Copenhagen; never index hourly arrays
  with `getUTCHours()`.
- Global search (`⌘K`/`Ctrl+K`, `components/search/*`) runs client-side over
  data the app already holds — `useSearchIndex.ts` assembles the corpus
  (vehicles/flights/turbines/road traffic/airports/news) and `SearchModal.tsx`
  renders it; selecting a result drives `DenmarkMap`'s imperative
  `DenmarkMapHandle.focus()` (exposed via `forwardRef`/`useImperativeHandle`),
  which reuses the same click-handler selection logic so a search result
  opens exactly what clicking the feature on the map would.

## Conventions
- Conventional commits (`feat:`/`fix:`/`chore:`).
- No API keys, no .env — everything uses public endpoints. Keep it that way
  or document loudly.
- Plans for agent execution live in `plans/` (see `plans/README.md`).
