# Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-09-23 | Standalone app for the group (IT, PL, FR, ES, DE, CH); imports Geoportale `.axpo` files but does not depend on the Geoportale, AGOL login or the Italian cadastre | Other countries have no GIS portal; Poland uses HelioScope, Spain evaluated RatedPower |
| 2026-09-23 | Only the internal toolkit (Design ESQ) — structures, stations, fences, rules — through a versioned catalog | Requested by the user; keeps designs consistent with company standards |
| 2026-09-23 | Modules are user-managed: typed in or imported from supplier roadmaps, plus a list of modules planned for the project | Requested by the user |
| 2026-09-23 | Pitch, module power (module choice) and structure type (`nVm` / `nHm`) are set by hand for each field; the tool only suggests toolkit minimums and warns | Requested by the user |
| 2026-09-23 | Scope: ground-mounted fixed and agrivoltaics. Floating, rooftop, car-park canopies and greenhouses stay out | Requested by the user |
| 2026-09-23 | English user interface, all strings in `app/js/i18n.js` | Group-wide tool |
| 2026-09-23 | Terrain: Esri World Elevation first, then single DTM / DSM upload; slopes in % | Requested by the user; ArcGIS is available in IT, PL, ES, FR, DE |
| 2026-09-23 | Electrical design left open (~6 months) | The user is gathering requirements |
| 2026-09-23 | Yield: typed-in specific yield until the internal yield tool exposes its API | API not available yet |
| 2026-09-23 | Parametric: the project stores inputs and parameters, the layout is regenerated; manual edits will be kept as exceptions | Agreed with the user |
| 2026-09-23 | Separate project, several files, no shared library with the Geoportale for now (useful parts copied once) | The Geoportale stays a single file; two apps with different users should not be released together. Revisit if copies diverge |
| 2026-09-23 | ArcGIS Maps SDK 4.34 through `$arcgis.import()`, geometry operators instead of `geometryEngine` | Same loading mechanism as 5.x (verified working in 4.34): a later migration stays small |
| 2026-09-23 | Layout computed in a local Transverse Mercator frame (scale 1) centred on the site | True metres; verified 5 000.000 m² for 100 × 50 m. Web Mercator is 0.15–0.17 % off at 45° |
| 2026-09-23 | Setbacks and exclusion buffers use round joins (planar buffer in the local frame) | Exactly "at least X m from the boundary" |
