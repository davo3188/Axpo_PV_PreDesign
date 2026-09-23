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
5. **Backup prima di modifiche rischiose** in `backups/` (`<file>_pre-<motivo>_<data>`), come nel progetto AGOL Axpo.
6. **Parte elettrica**: volutamente aperta (l'utente raccoglie le informazioni, ~6 mesi). Non inventarla.
7. **Resa**: lo Yield tool interno esporrà un'API (non ancora disponibile). Fino ad allora kWh/kWp inseriti a mano.

## Stack e struttura

- ArcGIS Maps SDK for JavaScript **4.34** caricato con `$arcgis.import()` (verificato: funziona in 4.34 ed è lo stesso
  meccanismo della 5.x, così la migrazione resta contenuta). Operatori geometrici `geometry/operators/*`, non
  `geometryEngine` (deprecato). Tutto l'accesso all'SDK passa da `app/js/sdk.js`.
- Librerie in ESM da jsDelivr: turf 6.5, xlsx 0.18.5, JSZip 3.10.
- Niente build: moduli ES nativi, più file. Serve un server http (non `file://`).
- `app/` l'applicazione · `app/catalog/` il catalogo del toolkit · `tests/` test del motore nel browser ·
  `docs/` piano, decisioni, estrazione del toolkit · `backups/`.

## Come provarla

- Server locale: voce `pv-predesign` in `.claude/launch.json` (porta 8140, serve la radice del progetto).
  App: `http://localhost:8140/app/` · Test: `http://localhost:8140/tests/`.
- I test del motore di layout (`tests/`) girano nel browser e devono essere tutti verdi prima di un commit.

## Repository

Repository GitHub **privato** (da creare dall'utente: `gh` non è installato). Non committare dati di progetto reali,
né il toolkit (resta nella cartella AGOL Axpo / GED URBADOC).
