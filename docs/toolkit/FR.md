# France

Design ESQ toolkit of Urbasolar (French sheets). Until other countries send their own, these are also the values
the app used everywhere; since 2026-09-25 the country-specific ones (shading angle, stations, ground clearance) are
filed under France only.

## Extraction notes (2026-09-23)

Source folder: `AGOL Axpo/toolkit` (not part of this repository). The Design ESQ toolkit (Urbasolar) exists as an
AutoCAD file with tabs (summary, standards, building permit, one tab per technology), the same tabs printed as
PDF (`Toolkit_FR/DESIGN/TOOLKIT_ESQ-*.pdf`), SketchUp prospection toolkits, and older DWG kits for Italy and
"ALL" (Poland / Germany). Text was extracted from the PDFs with `pypdf` (ArcGIS Pro Python); drawings were not
rendered, so values that depend on reading a drawing are marked `verify` in the catalog.

### Checks that pass (formulas reproduce the toolkit)

| Item | Toolkit | Computed | How |
|---|---|---|---|
| 2V13 table length | 14.98 m | 14.982 m | 13 × 1.134 + 12 × 0.02 |
| 3V9 table length | 10.37 m | 10.366 m | 9 × 1.134 + 8 × 0.02 |
| 3V18 table length | 20.75 m | 20.752 m | 18 × 1.134 + 17 × 0.02 |
| 2V plan depth at 15° | 4.62 m | 4.621 m | (2 × 2.382 + 0.02) × cos 15° |
| 3V plan depth at 15° | 6.94 m | 6.941 m | (3 × 2.382 + 2 × 0.02) × cos 15° |
| 3V free gap between rows | 2.66 m | 2.656 m | rise / tan 35° |
| 3V pitch | 9.60 m | 9.597 m | plan depth + free gap |

The 3V6 / 3V12 "Europe PERC" lengths (6.97 / 13.96 m) imply a module 1.145 m wide.

### To verify on the DWG

- Width and orientation of the "piste transversale tous les 100 m (Est/Ouest)": the app uses 4 m and corridors
  across the rows every 100 m.
- AgriPV: which minimum pitch (8.1 / 12 / 13 m) belongs to which shade, heights of shades and aviary,
  tracker 1V length ("31.13" next to 1V26), structure spacing 6 / 9 / 12 m.
- Station sizes per kVA type (C, D, E) and the combined delivery + transformer station.
- Overhead line clearance ("> 3 m si HTB, > 5 m si HTA").
- Module power (Wp) is not in the toolkit: modules come from the library / roadmaps.

### Not transcribed

Floating, rooftop, car-park canopies and greenhouses (out of scope); cameras; inverter racks (electrical design
is left open).

## Values in the catalog (`countries.FR`)

| Item | Value | Source | Status |
|---|---|---|---|
| Shading angle | 35° («angle d'ombrage maximal de 35°») | CS | confirmed |
| Ground clearance | 1.10 m | CS | confirmed |
| Delivery station (PDL) type A | 5.00 × 2.60 m | PC | confirmed |
| Transformer stations (PDT) | 4.20 × 2.60 · 5.00 × 2.60 · 5.30 × 3.00 · 6.50 × 3.00 m | PC | verify |
| Transformer types | C 1250 kVA · D 2000 / 2500 · E 3250 / 4000 · B combined 500–4000 kVA | PC | confirmed |
| Fence | 2.00 m, welded mesh 100/50, galvanised posts | PC | confirmed |
| Gates | 6.00 m or 7.00 m, double swing | PC | confirmed |
| Fire tanks | 60 / 120 m³, horizontal or vertical | PC | confirmed |
| Rules | fire tank within 50 m of the entrance; delivery station at the entrance, flush with the fence; overhead line clearance > 3 m HTB, > 5 m HTA (verify) | NORMES | see catalog |
| AgriPV | coverage at most 40 %; shades 2V9 (cattle 12 m, sheep 12–13 m pitch), 3H8 FNO 8.1 m, aviary 10H; tracker canopies | AGRI | verify |
