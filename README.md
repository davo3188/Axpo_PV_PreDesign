# PV Predesign

Web app for the **predesign of ground-mounted fixed and agrivoltaic PV plants**, for the Axpo / Urbasolar teams in
Italy, Poland, France, Spain, Germany and Switzerland. It is standalone: it can import projects from the Italian
Geoportale (`.axpo`), but does not depend on it.

Status: **milestone 1** (2026-09-23) — site input, module library, parametric field layout in 2D, key figures,
GeoJSON export. See `docs/plan.md` for what comes next.

## What it does today

1. **Site** — draw the site boundary and exclusions on the map, or import a Geoportale project (`.axpo`) or
   GeoJSON. Every object has a role: *Site*, *Exclusion* or *Reference*. From `.axpo` files, drawings in the
   category *Perimetro Netto* become sites, constraint categories (Vincoli…, Pendenze alte, DPA, Elettrodotto…)
   become exclusions, parcels and the rest are references. A setback from the boundary and a buffer around
   exclusions (needed for lines such as power lines) define the buildable area.
2. **Modules** — a module library kept in the browser: entered by hand or imported from supplier roadmaps
   (CSV / Excel; power, length and width — or a dimensions column — are recognised automatically, also with
   Italian, French and German headers, in mm or m). Modules ticked as *planned* come first in the field.
3. **Field** — technology (ground-mounted fixed, AgriPV fixed, AgriPV single-axis tracker), structure in the
   toolkit notation (`2V13` = 2 modules in portrait across, 13 along), module, tilt, azimuth and **pitch set by the
   user**. The toolkit minimum is suggested (fixed: 35° maximum shading angle; AgriPV presets: minimum pitch).
   Options: gaps, crossing tracks every N metres, target DC capacity, grid position and *Optimise position*.
   The layout is regenerated at every change (parametric).
4. **Results** — DC capacity, tables, modules, rows, GCR, shading angle, ground coverage, site and buildable area,
   density, annual energy from a specific yield typed in (the internal yield tool will provide it through an
   API). Warnings: pitch below the toolkit minimum, AgriPV coverage over 40 %, toolkit values still to be verified.
5. **Export** — GeoJSON (WGS84) with site objects, buildable area and every table with its attributes.

## How it works

- **Toolkit catalog** — `app/catalog/toolkit.json`, transcribed from the Design ESQ toolkit sheets. Each value
  carries its source; values still to be checked on the DWG have `"verify": true` (see `docs/toolkit-extraction.md`).
  Table sizes are not stored: they come from the module, `n × W + (n − 1) × 0.02`, which reproduces every table
  length of the toolkit (2V13 14.98 m, 3V9 10.37 m, 3V18 20.75 m).
- **True metres** — the layout is computed in a Transverse Mercator frame centred on the site with scale factor 1
  (`app/js/geo/localframe.js`): a 100 × 50 m rectangle is 5 000.000 m² on the ellipsoid, and an exported table
  measures 14.982 × 4.621 m. Web Mercator is never used for measuring (it is off by 0.15–0.17 % at 45°).
- **Row-fill engine** — `app/js/layout/rows.js`, pure functions without the SDK. Rows perpendicular to the
  azimuth at the given pitch, tables on a common column grid, optional corridors every N tables. A table is kept
  only if its whole rectangle is inside the buildable area; the test is exact (the strip of each row is cut in
  slabs at every vertex height, where the boundary moves linearly). Checked against a brute-force oracle on 200
  random polygons with holes (71 003 tables, identical). A 1 km site with ~5 500 tables fills in ~5 ms.
- **ArcGIS Maps SDK 4.34** loaded with `$arcgis.import()` (the 5.x mechanism), geometry operators
  (`geometry/operators/*`) for union, difference, buffer and projection. All SDK access goes through `app/js/sdk.js`.

## Run it locally

```
py -3 scripts/serve.py 8140
```

Then open `http://localhost:8140/app/` (app), `http://localhost:8140/tests/` (engine tests) and
`http://localhost:8140/tests/sdk.html` (SDK and local-frame tests). No build step; any static web server works,
but the app must be served over http(s), not opened as a file.

## Project layout

```
app/                  the web app (index.html, css/, js/, catalog/toolkit.json)
  js/layout/          structures (notation, table geometry, pitch rule) and the row-fill engine
  js/geo/             local metric frame, GeoJSON <-> SDK conversion
  js/io/              importers (.axpo, GeoJSON)
tests/                browser tests (engine, SDK) and synthetic fixtures
docs/                 plan, decisions, toolkit extraction notes
scripts/serve.py      local server with caching disabled
```

## Not done yet

3D view and terrain (Esri World Elevation first, then DTM / DSM upload and slope in %), fence, gates, roads and
stations from the toolkit, several fields per site, project save / open, KML / Shapefile / DWG import, report,
yield API, electrical design (deliberately left open). See `docs/plan.md`.
