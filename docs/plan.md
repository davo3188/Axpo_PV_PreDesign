# Plan

## Done — milestone 1 (2026-09-23)

- Project set-up, catalog v0.1 from the Design ESQ toolkit (fixed ground-mounted and AgriPV presets, rules,
  stations, fence, gates, fire tanks).
- Row-fill engine with exact containment, crossing tracks, target capacity; tests against a brute-force oracle.
- Local metric frame (true metres), buildable area (union, setback, buffered exclusions).
- App: site drawing and roles, `.axpo` and GeoJSON import, module library with roadmap import, field parameters,
  toolkit minimum pitch, results and warnings, grid optimisation, GeoJSON export, autosave, light/dark theme.

## Done — milestone 2 (2026-09-23)

- Workflow in steps on a left rail (0 Terrain · 1 Areas · 2 Fields · 3 Infrastructure · 4 Output · 4b 3D ·
  Electrical); Terrain, Infrastructure, 3D and Electrical are placeholders that say what will come.
- Areas in nine categories with per-object attributes, drag and drop between categories, drawing and reshaping
  per category, buffers shown on the map, net area given or computed (gross − setback − cuts).
- Imports: KML (nested folders), KMZ, Shapefile zip (several layers, each with its `.prj`), CSV points, GeoJSON
  with a legacy `crs`, `.axpo`; automatic sorting from names in six languages; files dropped on a category.
- Coordinate systems: country detection, national proposal with alerts (borders, two zones, German Länder,
  Italian regions, Polish CS2000), manual choice, dialog for files in metres without a system, datum shifts by the
  SDK projection engine.
- Project files `.pvpd` (save in place, save as, open, Ctrl+S / Ctrl+O); projects of milestone 1 are migrated.
- Tests: import suite (22) with synthetic fixtures built by arcpy and reference areas from ArcGIS.

## Done — milestone 3 (2026-09-25)

- Toolkit archive by country (`docs/toolkit/`): Italy transcribed from the PC Ground Mounting toolkit (PDF and DWG:
  shading angle 29°, trackers 1V, roads, clearances, stations, fence), France from the Design ESQ sheets, the other
  countries listed with what is needed; the group choices of the user. Catalog 0.2 with country sections.
- Group standards: module 2382 × 1134 bifacial with its power roadmap by semester (import of the group roadmap,
  period per project, warning after six months), 3V9, tracker 1V28 with drive gap and corridors every 4 trackers.
- Minimum pitch from the shading angle of the country of the site; optional half tables (half strings).
- Modules written into the project file (no silent replacement on another computer).
- Step 0 · Terrain (optional): Esri World Elevation or GeoTIFF on a grid of the local frame, slope map, slope limits
  of the structure (fixed 3V 10 % N-S / E-W, tracker 1V 15 %) cut from the buildable area; grid in the project file.
- Tests: modules (12), terrain (14), panels on a stand-in view (5), half tables against the oracle; headless runner.

## Next

0. **Open answers** (see `docs/toolkit/group.md`): half table of a 3V9; slope limits of fixed 2V and AgriPV
   fixed; when the NZIA module variant applies; when the perimeter road may be left out; shading angle and roads of
   PL, ES, DE, CH.
1. **Toolkit checks** — read the toolkit DWGs (IT done 2026-09-25, "ALL" for PL/DE, FR) to confirm the values marked `verify`:
   track width and orientation of the transversal tracks, AgriPV minimum pitches and heights, station sizes per kVA.
   Get the "Consignes techniques Pré design centrales au sol" (pitch rules), the road widths and a referent in the
   Design ESQ team.
2. **0 · Terrain** — contour lines imported (to build a terrain where there is no model) and generated (to show
   and export); ASC / XYZ models if the teams use them; terrain in the 3D view and in the shade of obstacles.
3. **3 · Infrastructure** — fence (offset of the buildable area: 6 m to the structures with the perimeter road in
   Italy) with gates from the toolkit, roads with the toolkit widths (IT: 3 m light, 4 m heavy, R12 / R17), delivery and transformer stations placed with the NORMES rules (delivery station at the entrance,
   transformer stations by MWp, fire tank within 50 m of the entrance); room reserved for the electrical part.
4. **2 · Fields** — several fields per site with their own parameters, manual exceptions (remove / lock tables)
   kept across regenerations; obstacle shade (height → shadow on the tables, with the terrain).
5. **4 · Output** — KML / KMZ, Shapefile and DXF in the national system; PDF report for prospection and
   engineering (site, areas, layout, capacity, assumptions, checks still to do); Excel bill of quantities.
6. **4b · 3D** — SceneView with the terrain; tables as merged meshes at their real height and tilt; obstacles
   and their shade.
7. **DWG / DXF import** — reuse the Geoportale DWG reader (layers to categories).
7b. **Import from the portal by site** — sign in to ArcGIS Online and load a site (AREAS COLLECTION area + its
   *IT - Site Features*) by project code, without going through an `.axpo` (Italy first; the layer schema can be
   reused by the other countries' ArcGIS organisations).
8. **Yield API** — when the internal yield tool exposes it.
9. **Pilots** — one real site per country; in Poland compare with an existing HelioScope design, in Spain with a
   RatedPower one.

## Open questions

- Owner of the catalog in the Design ESQ team.
- Road widths and setbacks per country / region (the user will provide them).
- Which DTM formats each country uses.
- Hosting and sign-in (Azure, Entra ID tenant(s) of the group).
- Electrical design scope (after the user's six-month survey).
