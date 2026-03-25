# marvymarv.xyz

Personal multi-tool hub for astrophotography and preparedness.
Built on React/Vite, deployed to Vercel, backed by Neon PostgreSQL, auth via Clerk.

Live at [marvymarv.xyz](https://marvymarv.xyz)

---

## Tools

| Tool | Route | Accent | Status |
|------|-------|--------|--------|
| Obscura | `/obscura` | Ember `#e8630a` | Live |
| Apertura | `/apertura` | Crimson `#cc2936` | Live |
| Mensura | `/mensura` | Violet `#7c3aed` | Live |
| Vigilia | `/vigilia` | Teal `#0d9488` | Planned |
| Itinera | `/itinera` | Sky `#0ea5e9` | Planned |

---

## Obscura

Astrophotography session planning and logging.

**Tabs:**
- **Tonight** — location search, Astropheric forecast strip (81-hour, hourly cloud/transparency/seeing), night scoring algorithm (0–100, color-coded)
- **Watchlist** — saved targets with per-target alert toggles, multi-night planning stepper (1–7 nights), 30-day visibility calendar
- **Targets** — OpenNGC catalog (2,665+ objects), text search, filter-type pills (All / Narrowband / Broadband / LRGB), detail panel with DSS thumbnail, score breakdown, altitude chart SVG, filter sequence table, exposure summary
- **Plans** — read-only upcoming sessions pulled from Mensura (next 3 draft plans), links to `/mensura`
- **Journal** — session log entries with date, location, target notes; sortable by date

---

## Apertura

Gear inventory and imaging train management.

**Categories:** Cameras, Optics, Filters, Filter Wheels, Mounts, Focusers, Accessories

**Features:**
- Per-category gear inventory with CSV import
- Imaging Train Wizard (Telescope → Camera → Filter Wheel → Filters → Focuser)
- NINA profile JSON export per imaging train

---

## Mensura

Session planning workspace with filter sequence computation and snapshot storage.

**Layout:** Two-panel — plans sidebar (left) + plan workspace (right)

**Plan workspace features:**
- Inline-editable plan name, date picker, location search, forecast score badge
- Catalog browser modal to add targets (reuses Obscura catalog component)
- Per-target cards: DSS thumbnail, score breakdown (2×2 grid), altitude chart SVG, filter sequence table, exposure summary, HDR warning, imaging train selector, editable window times
- Overlap detection across target windows with inline warnings
- Night summary (total imaging time, target count, overlap count)
- Save plan → immutable snapshot stored in `plan_targets.snapshot` (camelCase keys)
- Mark Complete → journal prompt modal → creates linked journal entry in Obscura
- Bidirectional plan ↔ journal links (plan_id on journal_entries, journal_entry_id on plans)

**Deferred:**
- Mark Complete / journal integration flow (scoped, not yet built)
- Drag-to-reorder target cards

---

## Vigilia *(planned — Sprint 7)*

Emergency preparedness inventory and monitoring.

**Tabs:** Dashboard | Arms | Vehicles | General | Locations

**Arms sub-tabs:** Firearms | Suppressors | Ammo

**Planned features:**
- Firearms and suppressor inventory (make, model, caliber, location — no serial numbers)
- Ammo tracking by caliber, brand, type (subsonic/supersonic/standard), quantity, location
- Vehicle inventory (name, type, year, make, model)
- General inventory with expiration dates, quantity thresholds, location tagging
- Locations table seeded with: Home, Ranch, Truck, Landcruiser, Nomad
- Dashboard: food/water days remaining, expiring items, below-threshold items, per-location summary
- Weekly digest email (Monday 9am UTC) via Resend for below-threshold items
- Daily stale check email (10am UTC) if no data updated in 30+ days
- CSV import

**Deferred to Sprint 8:** nested vehicle inventories, aggregate consumables table (ammo by caliber, food/water by location and category)

---

## Architecture
```
marvymarv.xyz/
├── src/
│   ├── main.jsx          # React Router config, all routes
│   ├── Hub.jsx           # Landing page, tool cards
│   ├── App.jsx           # Obscura (all 5 tabs)
│   ├── Apertura.jsx
│   ├── Mensura.jsx
│   ├── tools.js          # Tool registry (name, route, accent, status)
│   └── db/
│       └── schema.js     # Legacy Drizzle schema (not used by API routes)
├── api/
│   ├── obscura/          # Targets, forecast, watchlist, journal
│   ├── mensura/          # Plans, plan-targets, snapshots, journal linking
│   ├── apertura/         # Gear inventory, imaging trains, NINA export
│   └── plans.js          # Legacy — "Add to Tonight's Plan" (Obscura)
├── public/
├── vite.config.js        # Excludes drizzle-orm + @neondatabase/serverless from frontend bundle
└── CLAUDE.md             # Coding conventions for this repo
```

**Stack:**
- Frontend: React 18, Vite, Tailwind CSS
- Routing: React Router v6
- Auth: Clerk (all API routes protected, userId from Clerk session)
- Database: Neon PostgreSQL (raw SQL via `@neondatabase/serverless` in API routes only)
- Serverless functions: Vercel API routes (`/api/**`)
- Email: Resend (Vigilia digest — Sprint 7)
- Forecast: Astropheric API
- Star catalogs: OpenNGC (2,665+ objects), Aladin DSS thumbnails

---

## Database Schema

### targets
OpenNGC catalog. Seeded, not user-editable.
```sql
id, name, common_name, type, ra, dec, magnitude, size_major, size_minor,
constellation, messier_number, ngc_number
```

### watchlist_targets
```sql
id UUID PK, user_id TEXT, target_id → targets, alert_enabled BOOL,
nights_planned INT, created_at
```

### journal_entries
```sql
id UUID PK, user_id TEXT, entry_date DATE, location_name TEXT,
latitude NUMERIC, longitude NUMERIC, notes TEXT,
target_ids INT[], forecast_score INT, plan_id UUID, created_at
```

### plans
```sql
id UUID PK, user_id TEXT, name TEXT, plan_date DATE,
location_name TEXT, latitude NUMERIC, longitude NUMERIC,
forecast_score INT, utc_offset_minutes INT,
status TEXT DEFAULT 'draft',  -- 'draft' | 'complete'
completed_at TIMESTAMPTZ, journal_entry_id UUID,
snapshot JSONB, created_at, updated_at
```

### plan_targets
```sql
id UUID PK, plan_id → plans, target_id → targets,
position INT, window_start TIME, window_end TIME,
imaging_train_id UUID,
snapshot JSONB,  -- camelCase keys, see conventions below
created_at
```

### Apertura tables
`cameras`, `optics`, `filters`, `filter_wheels`, `mounts`, `focusers`, `accessories`, `imaging_trains`
All scoped by `user_id`.

### Vigilia tables *(Sprint 7)*
`vig_locations`, `vig_firearms`, `vig_suppressors`, `vig_ammo`,
`vig_vehicles`, `vig_general_inventory`

---

## Coding Conventions

Documented in full in `CLAUDE.md`. Key rules:

- `e.stopPropagation()` is the **first line** of every nested button `onClick`
- **POST** not DELETE for all API routes
- `position:absolute` not `position:fixed` for overlays
- All fetch calls handle non-JSON error responses (read as text before throwing)
- Snapshot JSON always uses **camelCase keys**
- `plan_targets.snapshot` shape: `{ targetId, targetName, score, scoreBreakdown: { altitude, moon, window, fovMatch }, windowStart, windowEnd, transitTime, filterSequence: [{ filter, start, end, subs, subLength, totalMinutes }], exposureSummary: { totalMinutes, perFilter }, needsHDR, altitudePoints }`
- No `const` referenced before its declaration (Vite minifier renames to single chars)
- Server-only packages (`drizzle-orm`, `@neondatabase/serverless`) excluded from Vite frontend bundle via `vite.config.js`
- Dynamic API routes use **query params** not path segments (Vercel SPA rewrite conflict)
- `useApi` hook (`get`/`post`) for all authenticated API calls — never bare `fetch()`
- No `window.confirm()` — inline confirmation pattern only (button turns red, second click confirms)
- UTC offset applied once, in `formatTime()` only — never mutate the Date object

---

## Sprint History

| Sprint | Description |
|--------|-------------|
| 1–2 | Obscura core: Tonight tab, Astropheric forecast integration, target scoring engine |
| 3 | Obscura: Targets tab, OpenNGC catalog, search + filter, detail panel, DSS thumbnails |
| 4 | Obscura: Watchlist tab, visibility calendar, alert toggles |
| 5 | Obscura: Journal tab, Plans tab (legacy — replaced in Sprint 6) |
| 6 | Mensura: full session planner, snapshot storage, plan-target engine; Apertura: gear inventory, imaging train wizard, NINA export; Hub updated |
| 7 | Vigilia: preparedness inventory *(in progress)* |
| 8 | Vigilia: consumables dashboard, nested vehicle inventories *(deferred)* |

---

## Setup

### Environment variables
```
DATABASE_URL=         # Neon connection string
CLERK_SECRET_KEY=     # Clerk backend secret
VITE_CLERK_PUBLISHABLE_KEY=  # Clerk frontend key
ASTROPHERIC_API_KEY=  # Forecast data
RESEND_API_KEY=       # Email (Vigilia — Sprint 7)
```

### Database setup
Each tool has a setup endpoint protected by `X-Setup-Key` header:
```
POST /api/mensura/setup
X-Setup-Key: apertura-setup-2026
```

### Local development
```bash
npm install
npm run dev
```

### Deploy
Vercel. Push to `main` triggers deploy.
Feature branches: `sprint-N/description`
