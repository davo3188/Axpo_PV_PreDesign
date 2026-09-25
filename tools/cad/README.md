# CAD tools

Development tools to read toolkit drawings; they are not part of the app.

```
cd tools/cad
npm install
node dwg_dump.mjs "path/to/Toolkit.dwg" > dump.txt
```

`dump.txt` lists, area by area of the drawing, every text, every dimension with its **measured** value (and its
label when the label was overridden, e.g. «4 TRACKER MAX.») and the size of every block (e.g. a tracker 1V27 is
2.38 × 32.33 m). Transcribe the values into `docs/toolkit/<country>.md` with their source, then into
`app/catalog/toolkit.json` when the app needs them.

The reader is LibreDWG compiled to WebAssembly (`@mlightcad/libredwg-web`, GPL-3.0), used here as a tool only.
