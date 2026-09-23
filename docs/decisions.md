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
| 2026-09-23 | Workflow in steps on a left rail: 0 Terrain, 1 Areas, 2 Fields, 3 Infrastructure, 4 Output, 4b 3D, Electrical | Defined by the user |
| 2026-09-23 | Areas in categories (gross, net, exclusion, linear infrastructure, obstacle, access, mitigation, agricultural, reference) with per-object buffers instead of global ones | Requested by the user (exclusion / gross / net / obstacles, drag between categories); a power line and a ditch need different buffers |
| 2026-09-23 | Net area: taken as it is when given, otherwise gross − boundary setback; exclusions and obstacles are cut in both cases | Requested by the user; setbacks vary between countries and regions, so the setback is a project value |
| 2026-09-23 | Export coordinate system proposed from the site location with alerts, changeable by hand; measurements stay in the local frame | Requested by the user ("with alerts and information"); the national system only matters for exports |
| 2026-09-23 | Germany: UTM zone by Land (33 in BE, BB, MV, SN; 32 elsewhere, Bavaria included), from `regions.json` | The longitude rule would be wrong for eastern Bavaria and Saxony-Anhalt, western Brandenburg and Mecklenburg |
| 2026-09-23 | Italy: zone 32 west of 12° E, 33 east of it (34 not proposed); alert between 11° and 13° E | Salento is worked in zone 33; regions near 12° E use one zone for their whole territory |
| 2026-09-23 | Shapefiles read raw and converted by the SDK projection engine with their `.prj` (not by shpjs / proj4) | The SDK applies the default datum transformation (Monte Mario 1660, DHDN 1777, CH1903 1753, CH1903+ 1676), also for a WKT; proj4 without TOWGS84 puts a Monte Mario file 168 m off |
| 2026-09-24 | One "site-features" model (AGOL Axpo `schemas/site_features_model.json`) for the Geoportale drawings, the AGOL layer «IT - Site Features» (replaces Sites Notes) and this app; objects that carry its codes are never classified by keywords | Requested by the user: a structured, intuitive chain from drawing to archive to predesign. Sites Notes mixed what an object is with what it means for the design and had no link to the site |
| 2026-09-24 | Gross area from the site of work of a Geoportale project (an AREAS COLLECTION area), from a gross-area drawing, or from any file dropped on the Gross area card | Answer of the user: AREAS COLLECTION, `.axpo` or a KMZ are all valid sources |
| 2026-09-23 | Project files `.pvpd` = zip with `project.json` (room for DTM and other files later); File System Access API with download fallback; autosave in the browser | A single file to share and archive; saves in place like a desktop program |
