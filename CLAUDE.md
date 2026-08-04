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
- `GET /api/propiedades` — lists all properties (with `id`), from the `propiedades` table. Not auth-gated (mirrors the old world where `data/propiedades.json` was a public static file); the map page itself is still gated client-side by `js/auth.js`.
- `POST /api/propiedades`, `PUT /api/propiedades/:id`, `DELETE /api/propiedades/:id` — create/update/delete a property; requires the `mantenimiento` bearer-token session (`requireMantenimiento`). Duplicate `codigo` values are rejected with 409; `codigo` and `titulo` are required.

Data lives in `data/amber.db` (SQLite, gitignored — it's runtime state, not source). On first run, if the `codigos` table is empty, `db.js` seeds it once from `data/codigos.json`; likewise, if the `propiedades` table is empty, it's seeded once from `data/propiedades.json`. After that, neither JSON file is read at runtime — they're just the original seed data. There are no admin-API auth checks beyond the existing page gate described below (anyone who can load `info.html`'s/`propiedades.html`'s JS, or hit the API directly, can read/write codes/properties) — this matches the existing trust model, just extended to the new endpoints.

**Flow:** `index.html` (login) → `js/login.js` POSTs the entered code to `/api/login`; on success it sets `localStorage` (`autenticado`, `usuario`, `tipo`) and redirects to `info.html` (for `tipo === "mantenimiento"`) or `mapa.html` otherwise. `mapa.html`/`info.html`/`propiedades.html` load `js/auth.js` first, which guards the page by checking `localStorage.getItem("autenticado") === "true"` and bounces back to `index.html` otherwise; it also exposes `cerrarSesion()` (logout, called from the inline "Salir" button) which clears `localStorage` and redirects home. `info.html` loads `js/codigos-admin.js`, which fetches/creates/updates/deletes codes via the `/api/codigos` endpoints. `propiedades.html` (mantenimiento-only, redirects to `mapa.html` otherwise) loads `js/propiedades-admin.js`, which fetches/creates/updates/deletes properties via the `/api/propiedades` endpoints, using a summary table plus a full-field form for create/edit. Neither `data/codigos.json` nor `data/propiedades.json` is written to at runtime.

This is still client-side-only "auth" — `localStorage` state is fully visible/bypassable in the browser, and the API has no server-side authorization of its own. Don't treat this as a real access-control boundary when reasoning about changes.

**Map (`mapa.html`):** Uses Leaflet (via CDN, `unpkg.com/leaflet@1.9.4`) and Font Awesome (via CDN) for icons. Inline `<script>` in the page initializes the map centered on Guatemala City, adds an OSM tile layer, then fetches `data/guatemala.geojson` and `data/el-salvador.geojson` in parallel to draw country boundary overlays and fit the map bounds to them. It also fetches `/api/propiedades` and drops a marker (with popup, image, and optional video/plano/maps links) for each property with a parsable `latitud`/`longitud`.

**Data files (`data/`):**
- `codigos.json` — original seed data for access codes; only read once by `db.js` to populate the `codigos` table in `amber.db` if it's empty.
- `propiedades.json` — original seed data for property listings (Spanish field names: `Tipo inmueble`, `Titulo`, `Código`, `Pais `, `Municipio`, `Departamento`, `Latitud`/`Longitud`, etc.); only read once by `db.js` to populate the `propiedades` table in `amber.db` if it's empty. The `propiedades` table uses plain snake_case English-ish column names instead (`tipo_inmueble`, `titulo`, `codigo`, `giro_negocio`, `pais`, `municipio`, `departamento`, `metros_terreno`, `varas_terreno`, `region`, `latitud`, `longitud`, `plano`, `maps`, `video`) — `mapa.html` and `js/propiedades-admin.js` consume these column names, not the original JSON keys.
- `amber.db` — SQLite database (gitignored) holding the live `codigos` and `propiedades` tables; this is the source of truth for login/admin and for the map's property markers.
- `guatemala.geojson`, `el-salvador.geojson` — country boundary polygons drawn on the map.

**Styling:** `css/styles.css` is the one actually referenced by both HTML pages. There is also a stale, unused `styles.css` at the repo root with older/divergent rules (e.g. different header layout, background colors) — don't edit it by mistake when asked to change page styles; edit `css/styles.css`.

## Data quirks to watch for

`propiedades.json` (the seed file) has inconsistent formatting inherited from a spreadsheet export: numeric fields (`Metros Terreno`, `Varas terreno`, `Latitud`) are often strings with thousands separators (e.g. `"1,341,578.45"`), sometimes `null`, sometimes containing stray characters (e.g. a trailing comma in a latitude value, or `"-"` as a placeholder). `Longitud` is a real JSON number but `Latitud` is usually a string. The seeding step in `db.js` carries these quirks through as-is (`metros_terreno`/`varas_terreno`/`latitud` land in the DB as `TEXT`, `longitud` as `REAL` only if the seed value was already a JSON number) rather than cleaning them — so `mapa.html`'s `parseLatitud`/`parseLongitud` functions still do the parsing/sanitizing at render time. Any new code that consumes `propiedades` rows needs to do the same rather than assuming clean numeric types.
