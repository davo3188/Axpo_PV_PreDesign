# PV Predesign — web app di predesign fotovoltaico (gruppo Axpo / Urbasolar)

App web per il predesign 2D/3D di impianti fotovoltaici **a terra fissi** e **agrivoltaici**, per i team di
Italia, Polonia, Francia, Spagna, Germania e Svizzera. **Indipendente** dal Geoportale AxpoSolar Italia
(`../AGOL Axpo/tools/geoportale_axpo.html`), da cui importa solo i progetti `.axpo`.

## Regole fondamentali

1. **Interfaccia in inglese.** Tutti i testi visibili passano da `app/js/i18n.js` (niente stringhe sparse nel codice).
   Commenti del codice e README in inglese (progetto di gruppo); le conversazioni con l'utente restano in italiano.
2. **Solo il toolkit interno.** Strutture, edifici, recinzioni e regole vengono da `app/catalog/toolkit.json`,
   trascritto dal toolkit della squadra Design ESQ (`../AGOL Axpo/toolkit`). Ogni valore porta la sua fonte; i valori
   non ancora verificati hanno `"verify": true`. Non inventare parametri: se manca, chiederlo.
3. **Moduli gestiti dall'utente**: inseriti a mano o importati dalle roadmap (CSV/XLSX), più la lista dei moduli
   previsti per il progetto. Interfila, modulo (Wp) e tipo di struttura (notazione `nVm` / `nHm`, es. 2V13) si
   scelgono a mano per ogni campo; l'app propone solo i minimi del toolkit e avvisa.
4. **Misure esatte.** Il layout si calcola in una proiezione Trasversa di Mercatore locale centrata sul sito (scala 1):
   metri veri. Mai calcolare distanze in Web Mercator (non è conforme: errori dello 0,15-0,17% a 45°).
   Le riproiezioni le fa sempre l'SDK (`projectOperator`), che applica da solo la trasformazione di datum
   predefinita (Monte Mario, DHDN, CH1903), anche per un WKT; mai proj4/shpjs con il `.prj` (Monte Mario a 168 m).
5. **Backup prima di modifiche rischiose** in `backups/` (`<file>_pre-<motivo>_<data>`), come nel progetto AGOL Axpo.
6. **Parte elettrica**: volutamente aperta (l'utente raccoglie le informazioni, ~6 mesi). Non inventarla.
7. **Resa**: lo Yield tool interno esporrà un'API (non ancora disponibile). Fino ad allora kWh/kWp inseriti a mano.

## Stack e struttura

- ArcGIS Maps SDK for JavaScript **4.34** caricato con `$arcgis.import()` (verificato: funziona in 4.34 ed è lo stesso
  meccanismo della 5.x, così la migrazione resta contenuta). Operatori geometrici `geometry/operators/*`, non
  `geometryEngine` (deprecato). Tutto l'accesso all'SDK passa da `app/js/sdk.js`.
- Librerie in ESM da jsDelivr: turf 6.5, xlsx 0.18.5, JSZip 3.10, @tmcw/togeojson 5.8.1 (KML), shpjs 4.0.4
  (solo lettura grezza di .shp/.dbf).
- Niente build: moduli ES nativi, più file. Serve un server http (non `file://`).
- `app/` l'applicazione (step nel rail: `areas.js` step 1, `field.js` step 2, `output.js` step 4) ·
  `app/catalog/` toolkit, contorni dei paesi, Länder tedeschi in zona 33 · `tests/` test nel browser ·
  `docs/` piano, decisioni, estrazione del toolkit · `scripts/` server locale e generatore dei fixture · `backups/`.
- Stato del progetto: `store.project` (`state.js`), versione 2 con `features[]` per categoria e attributi per
  oggetto; `upgrade()` migra i progetti vecchi. File di progetto `.pvpd` (zip con `project.json`).

## Come provarla

- Server locale: voce `pv-predesign` in `.claude/launch.json` (porta 8140, serve la radice del progetto).
  App: `http://localhost:8140/app/` · Test: `/tests/` (motore), `/tests/sdk.html` (SDK), `/tests/import.html`
  (import, sistemi di riferimento, area netta, round trip). Devono essere tutti verdi prima di un commit.
- Le pagine di test impostano `window.__PVP_TEST__` così non sovrascrivono il progetto salvato dall'app
  (stessa origine, stesso localStorage).
- I fixture di `tests/fixtures` sono sintetici: si rigenerano con `scripts/make_fixtures.py` (Python di ArcGIS Pro,
  arcpy), che scrive anche i valori di riferimento in `expected.json`.
- Nel collaudo non far partire download veri: `showSaveFilePicker`/`showOpenFilePicker` finti **con**
  `createWritable`, e `HTMLAnchorElement.prototype.click` intercettato (un finto handle senza scrittura ha fatto
  scattare il download di ripiego il 2026-09-23).

## Repository

Repository GitHub **privato** (da creare dall'utente: `gh` non è installato). Non committare dati di progetto reali,
né il toolkit (resta nella cartella AGOL Axpo / GED URBADOC): il `.gitignore` esclude progetti, KML/KMZ, zip,
Shapefile, CSV, GeoJSON, raster, DWG/DXF ed Excel, tranne i fixture sintetici di `tests/fixtures`.
