# Plan

## Done — milestone 1 (2026-09-23)

- Project set-up, catalog v0.1 from the Design ESQ toolkit (fixed ground-mounted and AgriPV presets, rules,
  stations, fence, gates, fire tanks).
- Row-fill engine with exact containment, crossing tracks, target capacity; tests against a brute-force oracle.
- Local metric frame (true metres), buildable area (union, setback, buffered exclusions).
- App: site drawing and roles, `.axpo` and GeoJSON import, module library with roadmap import, field parameters,
  toolkit minimum pitch, results and warnings, grid optimisation, GeoJSON export, autosave, light/dark theme.

## Next

1. **Toolkit checks** — read the toolkit DWGs (IT, "ALL" for PL/DE, FR) to confirm the values marked `verify`:
   track width and orientation of the transversal tracks, AgriPV minimum pitches and heights, station sizes per kVA.
   Get the "Consignes techniques Pré design centrales au sol" (pitch rules) and a referent in the Design ESQ team.
2. **Project files** — save / open a project file (zip with the project JSON), recent projects.
3. **Chain, step 2** — fence (offset of the site boundary) with gates from the toolkit, perimeter road, delivery
   and transformer stations placed with the NORMES rules (delivery station at the entrance, transformer stations by
   MWp, fire tank within 50 m of the entrance), several fields per site, manual exceptions (remove / lock tables,
   move a station) kept across regenerations.
4. **3D and terrain** — SceneView with Esri World Elevation; tables as merged meshes with real tilt and heights;
   then DTM / DSM upload (GeoTIFF first; ASC / XYZ to confirm with the teams), slope and aspect maps in %,
   slope classes from the toolkit as exclusions, per-table slope check, obstacles from DSM − DTM.
5. **More imports** — KML / KMZ / Shapefile / DWG (reuse the Geoportale code), international CRS detection
   (PUWG 1992/2000, Lambert-93, ETRS89 UTM 29–33, LV95, Gauss-Krüger).
6. **Report** — PDF / Excel with the key figures, bill of quantities and the layout; DXF with layers for CAD.
7. **Yield API** — when the internal yield tool exposes it.
8. **Pilots** — one real site per country; in Poland compare with an existing HelioScope design, in Spain with a
   RatedPower one.

## Open questions

- Owner of the catalog in the Design ESQ team.
- Which CRS and DTM formats each country uses.
- Hosting and sign-in (Azure, Entra ID tenant(s) of the group).
- Electrical design scope (after the user's six-month survey).
