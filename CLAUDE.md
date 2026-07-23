# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, no-build website for "Amber" real estate: a code-gated login page (`index.html`) that leads to a Leaflet map (`mapa.html`) showing property/country boundaries for Guatemala and El Salvador. No framework, no package.json, no bundler — plain HTML/CSS/JS served as-is.

## Running locally

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html`. There is no build, lint, or test tooling in this repo.

## Architecture

**Flow:** `index.html` (login) → `js/login.js` validates an access code against `data/codigos.json`, sets `localStorage` (`autenticado`, `usuario`), then redirects to `mapa.html`. `mapa.html` loads `js/auth.js` first, which guards the page by checking `localStorage.getItem("autenticado") === "true"` and bounces back to `index.html` otherwise; it also exposes `cerrarSesion()` (logout, called from the inline "Salir" button) which clears `localStorage` and redirects home.

This is client-side-only "auth" — the access codes and gate logic are fully visible/bypassable in the browser. Don't treat this as a real access-control boundary when reasoning about changes.

**Map (`mapa.html`):** Uses Leaflet (via CDN, `unpkg.com/leaflet@1.9.4`) and Font Awesome (via CDN) for icons. Inline `<script>` in the page initializes the map centered on Guatemala City, adds an OSM tile layer, then fetches `data/guatemala.geojson` and `data/el-salvador.geojson` in parallel to draw country boundary overlays and fit the map bounds to them.

**Data files (`data/`):**
- `codigos.json` — list of `{codigo, nombre}` access codes checked by `login.js`.
- `guatemala.geojson`, `el-salvador.geojson` — country boundary polygons drawn on the map.
- `propiedades.json` — property listings (Spanish field names: `Tipo inmueble`, `Titulo`, `Código`, `Pais `, `Municipio`, `Departamento`, `Latitud`/`Longitud`, etc.). Note this is **not currently wired into `mapa.html`** — the map only renders country boundaries today, not individual property markers. If asked to plot properties on the map, this is the data source to consume, and markers/popups would need to be added to the inline script (or a new `js/` file).

**Styling:** `css/styles.css` is the one actually referenced by both HTML pages. There is also a stale, unused `styles.css` at the repo root with older/divergent rules (e.g. different header layout, background colors) — don't edit it by mistake when asked to change page styles; edit `css/styles.css`.

## Data quirks to watch for

`propiedades.json` has inconsistent formatting inherited from a spreadsheet export: numeric fields (`Metros Terreno`, `Varas terreno`, `Latitud`) are often strings with thousands separators (e.g. `"1,341,578.45"`), sometimes `null`, sometimes containing stray characters (e.g. a trailing comma in a latitude value, or `"-"` as a placeholder). `Longitud` is a real JSON number but `Latitud` is usually a string. Any code that consumes this file needs to parse/sanitize these fields rather than assuming clean numeric types.
