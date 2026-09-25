# Group — choices that hold for every country

Source key: **USER** = stated by the user in the working session of 2026-09-25 · **ROADMAP** = `BDD - Roadmap - prix
prévisionnels matériels APS.xlsm` · **IT-PC** = toolkit PC Ground Mounting IT (see `IT.md`).

## Module

| Item | Value | Source | Status |
|---|---|---|---|
| Module used | TOPCon, 132 cells (M10), **bifacial only** | USER, ROADMAP | confirmed |
| Size | **2382 × 1134 mm** (30 mm frame) | USER, ROADMAP, IT-PC | confirmed |
| Roadmap column | sheet « Roadmap Module- Standard», column **«CS - PPA FR et EU»** (the one with 2382*1134) | USER | confirmed |
| Power update | the roadmap is updated **every six months**; the app warns when the loaded powers are more than six months old | USER | confirmed |

Bifacial power (Wp) by period, column «CS - PPA FR et EU», read on 2026-09-25:

| S2 2024 | S1 2025 | S2 2025 | S1 2026 | S2 2026 | S1 2027 | S2 2027 | S1 2028 | S2 2028 | 2029 |
|---|---|---|---|---|---|---|---|---|---|
| 620 | 625 | 630 | 650 | 650 | 655 | 660 | 665 | 670 | 675 |

- The sheet «Roadmap Module - Critères NZIA» has a variant of the same module at 620 Wp flat (S1 2027–2029):
  **ignored** (USER, 2026-09-25).
- The roadmap also carries prices, ECS (carbon) values and other module families (108 / 96 / 144 cells, CdTe):
  the app does **not** read prices.
- «Roadmap Structure CS - Standard» repeats the powers (S1 2026 650, S2 2026 650, 2027 655) and gives a
  «maximal common string length» of 24 modules for the 2278 mm module (older data, 2023-02-15).

## Standard structures

| Technology | Standard | Source | Status |
|---|---|---|---|
| Ground-mounted fixed | **3V9** (27 modules per structure), tilt **15°**, facing south | USER | confirmed |
| Half strings (half tables) | allowed **only as an option** the designer selects | USER | confirmed |
| 3V9 | **never split**: no half table | USER | confirmed |
| Tracker | **1V28**, single axis north–south, rotation **±55°** | USER | confirmed |
| Tracker pitch | agreed with the farm for each project (no default) | USER | confirmed |
| Tracker half | 1V14 (half of 28 modules) | USER | confirmed |
| Tracker drive gap | 1.19 m, as measured on the 1V27 of the IT drawing | IT-PC, USER | confirmed |

## Slope limits

| Structure | Limit | Source | Status |
|---|---|---|---|
| Fixed 3V | **10 %** north–south and **10 %** east–west | USER | confirmed |
| Tracker 1V | **15 % in every direction** | USER, IT-PC («pendenza impiantabile fino al 15% in tutte le direzioni») | confirmed |
| Fixed 2V | **15 %** («sempre 15%») | USER | confirmed; applied **in every direction** (reading of the app, to confirm) |
| AgriPV fixed (all structures) | **15 %** | USER | confirmed; applied **in every direction** (reading of the app, to confirm) |

## Infrastructure

| Item | Value | Source | Status |
|---|---|---|---|
| Perimeter road | a **template preferred for small plants, up to about 9 MWp**; the app proposes it and the designer decides (with it the fence is 6 m from the structures in Italy, see `IT.md`) | USER | confirmed — a suggestion, never a constraint |
| Transformer stations | about **one every 3 MWp** (common practice: one every 2.5–5 MWp, depending on the transformers) | USER | part of the electrical design, kept open: used only if the designer chooses to place them |

## Open questions

- 15 % of fixed 2V and AgriPV fixed: steepest slope (every direction, as applied) or north–south and east–west
  separately (as for the 3V)?
- Shading angle, roads and stations for PL, ES, DE, CH (see the country files).
