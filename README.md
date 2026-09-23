# PV Predesign

Web app for the **predesign of ground-mounted fixed and agrivoltaic PV plants**, for the Axpo / Urbasolar teams in
Italy, Poland, France, Spain, Germany and Switzerland. It is standalone: it can import projects from the Italian
Geoportale (`.axpo`), but does not depend on it. The predesign is for prospection: it screens sites without
loading Engineering with embryonic projects, and later gives Engineering a useful starting point (they will still
rely on the topographic survey).

Status: **milestone 2** (2026-09-23) — workflow in steps, areas by category with imports from six formats,
national coordinate systems, project files. See `docs/plan.md` for what comes next.

## The workflow

The left rail holds the steps; clicking the active step again folds the panel away to give the map more room.

| Step | Today |
|---|---|
| **0 · Terrain** | Placeholder: Esri World Elevation by default; DTM / DSM upload, contour lines and slopes come next |
| **1 · Areas** | Import or draw the areas, sorted into categories (below); net area given or computed |
| **2 · Fields** | Modules, structure, tilt, azimuth, pitch, parametric layout and results (milestone 1) |
| **3 · Infrastructure** | Placeholder: fence and gates, roads (widths from the toolkit), cabins, room for the electrical part |
| **4 · Output** | Coordinate system for exports, GeoJSON export; KML, Shapefile, DXF and the report come next |
| **4b · 3D** | Placeholder |
| **Electrical** | Kept open on purpose |

The top bar has **New / Open / Save / Save as** (project files `.pvpd`, a zip holding `project.json`; Ctrl+S,
Ctrl+Shift+S, Ctrl+O), **Import**, and a badge with the coordinate system of the exports.

### 1 · Areas

- **Categories** — Gross area, Net area, Exclusion zones, Linear infrastructure (power lines, pipelines, ditches,
  roads, railways), Obstacles (trees, poles, buildings, with height for their shade), Access & grid connection,
  Mitigation (hedges, green screens), Agricultural zones, Reference (parcels and anything shown but not used).
- **Per-object attributes** — buffer (exclusions, lines, obstacles), type, height, width (strips drawn as lines).
  Buffers are drawn on the map as they are cut.
- **Moving objects** — drag them from one category to another (or use the *Move to* menu); a category refuses
  geometry it cannot take (a polygon is not a power line).
- **Import** — GeoJSON, KML, KMZ, Shapefile (.zip, several layers), CSV points (x/y or lon/lat, with name, type,
  height; semicolons and decimal commas accepted) and Geoportale projects (`.axpo`). Files dropped on the map are
  sorted automatically from folder, layer and object names in six languages (e.g. *Superficie bruta*,
  *Zona inundable*, *Ligne HTA 20 kV*, *Árboles*, *Accesos*); files dropped on a category go into it when their
  geometry fits. DWG / DXF import comes later.
- **From the Geoportale** — categories, types and attributes use one shared model ("site-features", AGOL Axpo
  `schemas/site_features_model.json`), also used by the AGOL layer *IT - Site Features*. Drawings saved with it
  keep their category, type, buffer, height, width and voltage exactly; the site of work of an `.axpo` (an area of
  AREAS COLLECTION) becomes the gross area; older drawings with the Sites Notes categories are mapped by a fixed
  table (e.g. *DPA* → exclusion · DPA corridor), keywords only for anything else.
- **Drawing** — polygon, line or points in any category (points are placed one after the other until Esc), reshape
  with the ✎ button, rename with a double click.
- **Net area** — used as it is when given (e.g. *Perimetro Netto* from the Geoportale); otherwise computed as gross
  area minus a boundary setback (setbacks change between countries and regions). In both cases exclusions,
  linear infrastructure, obstacles, mitigation and agricultural zones are cut out with their own buffers. The panel
  shows gross area, setback, exclusions and the buildable area in hectares.

### Coordinate systems

- **Proposed from the site location**: the country comes from generalized outlines (`app/catalog/countries.json`),
  then the national rule — Italy RDN2008 / UTM 32N west of 12° E and 33N east of it; France Lambert-93; Spain
  ETRS89 / UTM 29–31 by longitude, REGCAN95 / UTM 28N in the Canaries; Germany ETRS89 / UTM 33N in Berlin,
  Brandenburg, Mecklenburg-Vorpommern and Saxony and 32N elsewhere, Bavaria included (`app/catalog/regions.json`);
  Poland CS92 (with a note on the CS2000 zone of the cadastre); Switzerland LV95; elsewhere WGS 84 / UTM.
  Alerts near borders, across zones and where regions use one zone for their whole territory. The system can be
  changed by hand in 4 · Output.
- **Files in metres without a system** (a Shapefile without `.prj`, a CSV in easting / northing): a dialog lists the
  national systems that put every object inside their own country (e.g. RDN2008, ETRS89 and WGS 84 UTM 32N for
  a site near Cremona), or takes any EPSG code.
- **Datum shifts** — Shapefiles are read raw and converted by the SDK projection engine with their `.prj`, which
  applies the default datum transformation: a Monte Mario (Gauss-Boaga) file lands where ArcGIS puts it, whereas
  proj4 without TOWGS84 parameters would put it 168 m away (measured on the test fixture). Same for DHDN and
  CH1903 files.

## How it works

- **Toolkit catalog** — `app/catalog/toolkit.json`, transcribed from the Design ESQ toolkit sheets. Each value
  carries its source; values still to be checked on the DWG have `"verify": true` (see `docs/toolkit-extraction.md`).
  Table sizes are not stored: they come from the module, `n × W + (n − 1) × 0.02`, which reproduces every table
  length of the toolkit (2V13 14.98 m, 3V9 10.37 m, 3V18 20.75 m).
- **True metres** — areas and the layout are computed in a Transverse Mercator frame centred on the site with
  scale factor 1 (`app/js/geo/localframe.js`): a 100 × 50 m rectangle is 5 000.000 m² on the ellipsoid, and a
  400 × 250 m Lambert-93 rectangle (100 000 m² on the grid) measures 100 172.46 m², exactly the geodesic area
  given by ArcGIS. Web Mercator is never used for measuring (it is off by 0.15–0.17 % at 45°).
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

Then open `http://localhost:8140/app/`. Tests, all in the browser:

- `http://localhost:8140/tests/` — layout engine (12)
- `http://localhost:8140/tests/sdk.html` — SDK and local frame (5)
- `http://localhost:8140/tests/import.html` — classification, v1 → v2 migration, countries and proposed systems,
  every national EPSG code, the import fixtures against the ArcGIS reference areas, net area, project and GeoJSON
  round trips (22)

No build step; any static web server works, but the app must be served over http(s), not opened as a file.
The fixtures in `tests/fixtures` are synthetic and rebuilt with `scripts/make_fixtures.py` (ArcGIS Pro Python,
arcpy), which also writes the reference values in `expected.json`.

## Project layout

```
app/                  the web app (index.html, css/, js/)
  catalog/            toolkit.json, countries.json (outlines), regions.json (German zone-33 Länder)
  js/areas.js         step 1: categories, import, drawing, net area
  js/categories.js    categories and automatic sorting (pure)
  js/crs.js           national systems, country detection, proposals and alerts (pure)
  js/field.js         step 2: parametric layout and results
  js/output.js        step 4: coordinate system for exports, export
  js/layout/          structures (notation, table geometry, pitch rule) and the row-fill engine
  js/geo/             local metric frame, GeoJSON <-> SDK conversion and reprojection
  js/io/              importers, project files
  js/ui/              rail, coordinate system dialog, toasts
tests/                browser tests and synthetic fixtures
docs/                 plan, decisions, toolkit extraction notes
scripts/              serve.py (local server without cache), make_fixtures.py
```

## Not done yet

Terrain (Esri World Elevation sampling, DTM / DSM upload, slopes in %, contour lines), fence, gates, roads and
stations from the toolkit, 3D, several fields per site, exports in the national system (KML / Shapefile / DXF),
report, DWG / DXF import, yield API, electrical design (deliberately left open). See `docs/plan.md`.
