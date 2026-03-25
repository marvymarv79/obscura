# CLAUDE.md — marvymarv.xyz
## Project Overview
Multi-tool personal web app at marvymarv.xyz.
Stack: Vite + React, React Router, Tailwind, Clerk auth, Neon (PostgreSQL), Vercel serverless functions.
**Tools:**
- `/` — Hub landing page
- `/obscura` — Sky forecast + target recommendations + session planning
- `/apertura` — Gear inventory + imaging train builder + NINA export
- `/mensura` — Session planner
- `/vigilia` — Preparedness inventory tracker
- `/itinera` — Trip planner (planned)
**Repo:** github.com/marvymarv79/obscura
**Live:** marvymarv.xyz / obscura-pi.vercel.app
---
## Workflow
This project is built by passing prompts to Claude Code. Claude Code implements changes, commits, and deploys via Vercel CI. Regression testing is run via a Cowork skill after significant changes.
**Before writing any code:**
- Read the file you are about to change. Do not rewrite from memory.
- If a file is longer than 100 lines, read it in full before touching it.
- Do not refactor working code while implementing an unrelated feature.
**Before marking any task complete:**
- Run `npm run build` — it must pass with 0 errors and 0 warnings.
- Check the browser console for errors after deploying.
- Verify the specific thing you changed actually works end-to-end.
---
## Architecture
### Frontend
- React + Vite, deployed as SPA on Vercel
- All routes are client-side via React Router
- `src/main.jsx` is the entry point
- Tool components: `App.jsx` (Obscura), `Apertura.jsx`, `Mensura.jsx`, `Vigilia.jsx`, `Hub.jsx`
- Shared components in `src/components/`
- Auth via `@clerk/clerk-react`
### Backend
- Vercel serverless functions in `api/`
- All API routes use raw `neon` SQL via `@neondatabase/serverless` — do NOT use Drizzle ORM in API routes
- Auth wrapper: `api/_utils/auth.js` — every route that touches user data must use `withAuth`
- `src/db/index.js` and `src/db/schema.js` are legacy files — do not import them from any frontend file
### Database
Single Neon PostgreSQL database. Two table namespaces — do not mix them:
| Namespace | Used by | Notes |
|---|---|---|
| (no prefix) | Obscura + Mensura | `targets`, `watchlist`, `plans`, `plan_targets`, `journal_entries`, `locations` |
| `apt_*` | Apertura | `apt_cameras`, `apt_optics`, `apt_filters`, etc. |
| `vig_*` | Vigilia | `vig_locations`, `vig_firearms`, `vig_suppressors`, `vig_ammo`, `vig_vehicles`, `vig_inventory` |
Key table history — do not use old names:
- `imaging_plans` was renamed to `plans` in Sprint 6 — always use `plans`
- `imaging_plan_targets` was renamed to `plan_targets` in Sprint 6 — always use `plan_targets`
Migration/setup endpoints must be:
- Protected by `X-Setup-Key` header matched against `DB_SETUP_KEY` env var
- Idempotent: use `CREATE TABLE IF NOT EXISTS` and `INSERT ... ON CONFLICT DO NOTHING`
### Cron Jobs
Configured in `vercel.json`. Cron-protected endpoints use `Authorization: Bearer ${CRON_SECRET}`.
| Path | Schedule | Purpose |
|---|---|---|
| `/api/cron/watchlist-alert` | Daily 3pm UTC | Watchlist target alerts |
| `/api/vigilia/digest` | Monday 9am UTC | Weekly below-threshold digest email |
| `/api/vigilia/stale-check` | Daily 10am UTC | Reminder if inventory not updated in 30+ days |
---
## Recurring Bugs — Check Every Task
These have caused silent failures repeatedly. Verify all of them before closing any task.
### 1. `e.stopPropagation()` on nested buttons
Every button onClick inside a clickable parent MUST call `e.stopPropagation()` as its first line. This has broken things 5+ times.
```js
// CORRECT
<button onClick={(e) => { e.stopPropagation(); handleDelete(id) }}>Delete</button>
```
### 2. POST not DELETE
Vercel's SPA rewrite rule intercepts DELETE requests on dynamic routes and returns index.html instead of hitting the serverless function. Always use POST with a dedicated endpoint.
```js
// CORRECT — POST to /api/plans/delete with body { id }
// WRONG — DELETE /api/plans/:id
```
### 3. `position: absolute` not `position: fixed`
`position: fixed` collapses iframe height in this app's layout. Always use `position: absolute` for overlays and modals.
### 4. Non-JSON error responses
All fetch calls must handle HTML error responses (Vercel 500 pages, etc.).
```js
const res = await fetch(url, options)
if (!res.ok) {
  const text = await res.text()
  throw new Error(`API error ${res.status}: ${text}`)
}
const data = await res.json()
```
### 5. `window.confirm()` is suppressed
Never use `window.confirm()` for confirmations. Use an inline "Delete?" / "Cancel" button pattern instead.
### 6. UTC offset — apply once, in one place
UTC offset comes from `UTCMinuteOffset` in the Astrospheric API response. Negate it when passing to `formatTime()`. Never modify the Date object itself before passing to `formatTime()`. Apply the offset exactly once — double application has caused incorrect times.
### 7. Snapshot key naming — always camelCase
When writing JSON snapshot data to the database, use camelCase keys to match what the frontend expects. Do not use snake_case in snapshot objects.
```js
// CORRECT
{ imagingWindow: { durationMinutes: 120 }, filterSequence: [...], scoreComponents: {...} }
// WRONG
{ imaging_window: { duration_minutes: 120 }, filter_sequence: [...] }
```
### 8. Server-only packages must not enter the frontend bundle
`drizzle-orm`, `@neondatabase/serverless`, and similar server-only packages must never be imported from files under `src/`. If they appear in `dependencies`, ensure `vite.config.js` excludes them:
```js
optimizeDeps: { exclude: ['drizzle-orm', '@neondatabase/serverless'] },
build: { rollupOptions: { external: ['drizzle-orm', '@neondatabase/serverless'] } }
```
### 9. `const` declarations and temporal dead zones
Do not reference a `const` before it is declared. Vite's minifier renames variables, making these errors cryptic (e.g., `Cannot access 'ua' before initialization`). Always declare before use.
### 10. useApi hook for authenticated calls
All calls to `withAuth`-protected routes must use `get()`/`post()` from the `useApi()` hook — never bare `fetch()`. Bare fetch does not attach the Clerk Bearer token and will return 401.
```js
// CORRECT
const { get, post } = useApi()
const data = await get('/api/mensura/plans')
// WRONG
const res = await fetch('/api/mensura/plans')
```
### 11. Dynamic route workaround
Vercel's SPA rewrite catches `/api/path/UUID` before the serverless function, returning index.html instead of JSON. Use query params instead of path segments for any route that takes an ID.
```js
// CORRECT
GET /api/mensura/plans/detail?id=UUID
// WRONG
GET /api/mensura/plans/:id
```
---
## Design System
Tokens are in `src/tokens.css`. Always use CSS variables — never hardcode colors or spacing that exists as a token.
**Colors:**
- Background: `#13171f` (base), `#191d26` (cards), `#1d2230` (card hover)
- Text: `#f0d0b0` (primary/warm cream), `#a09080` (secondary), `#5a4a40` (muted)
- Borders: `rgba(240,208,176,0.07)` (default), `rgba(232,99,10,0.35)` (accent)
- Green: `#10b95a` | Ember: `#e8630a` | Crimson: `#cc2936` | Violet: `#7c3aed`
**Tool accent colors:**
- Obscura → ember `#e8630a`
- Apertura → crimson `#cc2936`
- Mensura → violet `#7c3aed`
- Vigilia → teal `#0d9488`
- Itinera → sky `#0ea5e9`
**Typography:** Warm cream (`#f0d0b0`) for primary text — not stark white. 24-hour time throughout. Maximize screen real estate — avoid excessive padding and whitespace.
---
## Auth
Clerk handles all auth. Every API route that reads or writes user data must use the `withAuth` wrapper from `api/_utils/auth.js`. Do not create unprotected routes that expose user data.
---
## Code Quality
Before closing any task:
- [ ] No unused imports
- [ ] No `console.log` left in (use `console.error` only for actual errors)
- [ ] All async functions have try/catch
- [ ] New UI components handle loading and error states
- [ ] All buttons inside clickable parents have `e.stopPropagation()`
- [ ] All fetch calls handle non-JSON error responses
- [ ] No `position: fixed` for overlays
- [ ] No server-only packages imported in `src/`
- [ ] Snapshot objects use camelCase keys
- [ ] `npm run build` passes with 0 errors and 0 warnings
---
## PR Conventions
- Branch naming: `sprint-N/feature-name`
- Commit message format: `Sprint N: short description`
- PR body must include:
  1. What changed
  2. Any setup steps required post-merge (e.g., run migration endpoints)
  3. A "Judgment calls" section for decisions not explicitly in the prompt
---
## What NOT to Do
- Do not use TypeScript or migrate `.jsx` to `.tsx` without explicit instruction
- Do not refactor working components while implementing an unrelated feature
- Do not install new dependencies without noting them in the PR body
- Do not touch `src/db/schema.js` or `src/db/index.js` — these are legacy files
- Do not use Drizzle ORM in API routes — use raw `neon` SQL
- Do not use `window.confirm()` anywhere
- Do not use `position: fixed` for overlays
- Do not use DELETE HTTP method for API routes
- Do not use dynamic path segments for API routes that take an ID — use query params
- Do not import server-only packages into frontend files under `src/`
---
## Keeping This File Current
When you complete a task, review whether anything you encountered should be added to this file. Specifically, update CLAUDE.md if you:
- Hit a bug pattern not already listed in "Recurring Bugs" — add it with a code example
- Discovered a constraint about the stack, Vercel, Clerk, or Neon that isn't documented here
- Made a judgment call that should become a standing rule
- Added a new tool, table, or API route that belongs in the architecture section
- Found that an existing rule was incomplete or misleading — correct it
When updating this file, follow these rules:
- Add to existing sections rather than creating new top-level sections unless truly necessary
- Keep examples concise — one correct and one wrong example per rule is enough
- Do not remove existing rules unless they are factually wrong
- Commit the CLAUDE.md update in the same PR as the work that prompted it, with a note in the PR body describing what was added and why
