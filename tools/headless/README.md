# Headless test runner

Runs every browser test page in headless Chromium (Playwright) and prints the results — also on machines whose
network policy blocks `js.arcgis.com` or `cdn.jsdelivr.net` (e.g. a cloud session): the ArcGIS Maps SDK 4.34 and the
ESM libraries the app loads from CDNs are bundled from npm (`build.mjs`) and served in their place (`page.mjs`).

```
cd tools/headless
npm install          # @arcgis/core 4.34, the libraries, esbuild
npm run build        # bundles into dist/ (rebuild after adding an SDK module to app/js/sdk.js)
npm test             # all pages, or: node run.mjs /tests/terrain.html
```

Playwright comes from a global install (`npm i -g playwright`) or a local one. `VERBOSE=1` prints the note of every
test, not only the failures.

Known limit: a MapView does not start with the npm bundle (its 2D workers do not come up), so the page of the app
itself must be checked in a real browser. `tests/ui.html` mounts the real panels on a stand-in view instead.

`make_terrain_fixture.mjs` writes the synthetic GeoTIFF of the terrain tests (`tests/fixtures/it_dtm_plane.tif`).
