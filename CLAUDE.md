# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A mostly-static website for "Amber" real estate: a code-gated login page (`index.html`) that leads to a Leaflet map (`mapa.html`) showing property/country boundaries for Guatemala and El Salvador, plus an admin page (`info.html`) for managing access codes. The frontend is plain HTML/CSS/JS (no build step, no framework) served by a small Express backend, which also exposes a JSON API backed by SQLite for access codes.

## Running locally

```
npm install
npm start
```

Then open `http://localhost:8000/index.html`. There is no lint or test tooling in this repo. `PORT` env var overrides the default port (8000).

The old `python3 -m http.server 8000` approach still serves the static pages, but login/admin will not work with it since `/api/*` requires the Node server.

## Architecture

**Backend (`server.js`, `db.js`):** Express serves the static files (root directory) and a JSON API:
- `POST /api/login` — validates `{ codigo }` against the `codigos` table, returns `{ codigo, nombre, tipo }` or 404.
- `GET /api/codigos` — lists all codes (with `id`).
- `POST /api/codigos`, `PUT /api/codigos/:id`, `DELETE /api/codigos/:id` — create/update/delete a code. Duplicate `codigo` values are rejected with 409.

Data lives in `data/amber.db` (SQLite, gitignored — it's runtime state, not source). On first run, if the `codigos` table is empty, `db.js` seeds it once from `data/codigos.json`. After that, `data/codigos.json` is no longer read at runtime — it's just the original seed data. There are no admin-API auth checks beyond the existing page gate described below (anyone who can load `info.html`'s JS, or hit the API directly, can read/write codes) — this matches the existing trust model, just extended to the new endpoints.

**Flow:** `index.html` (login) → `js/login.js` POSTs the entered code to `/api/login`; on success it sets `localStorage` (`autenticado`, `usuario`, `tipo`) and redirects to `info.html` (for `tipo === "mantenimiento"`) or `mapa.html` otherwise. `mapa.html`/`info.html` load `js/auth.js` first, which guards the page by checking `localStorage.getItem("autenticado") === "true"` and bounces back to `index.html` otherwise; it also exposes `cerrarSesion()` (logout, called from the inline "Salir" button) which clears `localStorage` and redirects home. `info.html` loads `js/codigos-admin.js`, which fetches/creates/updates/deletes codes via the `/api/codigos` endpoints (`data/codigos.json` is no longer written to at runtime).

This is still client-side-only "auth" — `localStorage` state is fully visible/bypassable in the browser, and the API has no server-side authorization of its own. Don't treat this as a real access-control boundary when reasoning about changes.

**Map (`mapa.html`):** Uses Leaflet (via CDN, `unpkg.com/leaflet@1.9.4`) and Font Awesome (via CDN) for icons. Inline `<script>` in the page initializes the map centered on Guatemala City, adds an OSM tile layer, then fetches `data/guatemala.geojson` and `data/el-salvador.geojson` in parallel to draw country boundary overlays and fit the map bounds to them.

**Data files (`data/`):**
- `codigos.json` — original seed data for access codes; only read once by `db.js` to populate `amber.db` if that table is empty, not read by `login.js` directly anymore.
- `amber.db` — SQLite database (gitignored) holding the live `codigos` table; this is the source of truth for login/admin.
- `guatemala.geojson`, `el-salvador.geojson` — country boundary polygons drawn on the map.
- `propiedades.json` — property listings (Spanish field names: `Tipo inmueble`, `Titulo`, `Código`, `Pais `, `Municipio`, `Departamento`, `Latitud`/`Longitud`, etc.). Note this is **not currently wired into `mapa.html`** — the map only renders country boundaries today, not individual property markers. If asked to plot properties on the map, this is the data source to consume, and markers/popups would need to be added to the inline script (or a new `js/` file).

**Styling:** `css/styles.css` is the one actually referenced by both HTML pages. There is also a stale, unused `styles.css` at the repo root with older/divergent rules (e.g. different header layout, background colors) — don't edit it by mistake when asked to change page styles; edit `css/styles.css`.

## Data quirks to watch for

`propiedades.json` has inconsistent formatting inherited from a spreadsheet export: numeric fields (`Metros Terreno`, `Varas terreno`, `Latitud`) are often strings with thousands separators (e.g. `"1,341,578.45"`), sometimes `null`, sometimes containing stray characters (e.g. a trailing comma in a latitude value, or `"-"` as a placeholder). `Longitud` is a real JSON number but `Latitud` is usually a string. Any code that consumes this file needs to parse/sanitize these fields rather than assuming clean numeric types.
