# Toolkit archive

The design rules of the group are scattered over many files (toolkit sheets, DWGs, roadmaps, e-mails, answers
given in conversation). This folder collects them **by country**, in one place, so that every value the app uses
can be traced back to where it came from, and so that new information has an obvious place to go.

| File | Holds |
|---|---|
| [`group.md`](group.md) | Choices that hold for every country: standard module, standard structures, slope limits, module roadmap |
| [`IT.md`](IT.md) | Italy — toolkit PC Ground Mounting IT (PDF + DWG, received 2026-09-25) |
| [`FR.md`](FR.md) | France — Design ESQ toolkit sheets (CS, AGRI, NORMES, PC) |
| [`PL.md`](PL.md) · [`ES.md`](ES.md) · [`DE.md`](DE.md) · [`CH.md`](CH.md) | Nothing received yet: what is needed |
| [`sources.md`](sources.md) | Every file received: name, date, what was read from it, where it is kept |

## How a value enters the app

1. Write it in the country file (or `group.md`): value, unit, **source** (file + sheet / panel / page), date received,
   status.
2. Status is one of: **confirmed** (read from a toolkit document or stated by the user), **verify** (read from a
   drawing or an extraction that still needs a check), **open** (question asked, no answer yet).
3. The app reads only `app/catalog/toolkit.json`. A value moves there when the app needs it, with the same source
   and `"verify": true` when its status is *verify*. Country values live under `countries.<ISO>`; values that hold
   everywhere live at the top level (`standards`, `modules`, `slopeLimits`, `defaults`).
4. The app never invents a value that is missing for a country: it says that the toolkit has no rule for it.

Toolkit files themselves are **not** kept in the repository (internal documents, large binaries): `sources.md`
says where they are.

## Reading DWG files

`tools/cad/dwg_dump.mjs` reads a DWG (LibreDWG compiled to WebAssembly) and writes every text and dimension with its
coordinates, grouped by panel, so that the values can be transcribed exactly (dimensions carry their measured
value, not the rounded label). See `tools/cad/README.md`.
