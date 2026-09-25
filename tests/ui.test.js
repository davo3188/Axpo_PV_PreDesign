// The panels of the app (1 · Areas, 0 · Terrain, 2 · Fields, 4 · Output) mounted from app/index.html on a stand-in
// map view (a real Map, no drawing on screen): the code that fills the panels, the layers and the results runs as in
// the app. The page of the app itself needs a real map view: check it in a browser too.
import { loadSdk, getSdk } from '../app/js/sdk.js';
import { loadCatalog } from '../app/js/catalog.js';
import { applyI18n } from '../app/js/i18n.js';
import { store, defaultProject, replaceProject, change } from '../app/js/state.js';
import { loadCountries } from '../app/js/crs.js';
import { initAreas } from '../app/js/areas.js';
import { initTerrain, sampleDtm, gridForSite, useGrid } from '../app/js/terrain/terrain.js';
import { initModulesUi, library } from '../app/js/modules.js';
import { initField, last } from '../app/js/field.js';
import { initOutput, buildGeoJSON } from '../app/js/output.js';
import { initQuick, runQuick } from '../app/js/quick.js';
import { makeLocalFrame } from '../app/js/geo/localframe.js';
import { toGeoJSON, projectPointToWgs84 } from '../app/js/geo/convert.js';

const results = [];
async function test(name, fn) {
  try { const note = await fn(); results.push({ name, ok: true, note: note ?? '' }); }
  catch (e) { console.error(name, e); results.push({ name, ok: false, note: e && e.message || String(e) }); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const text = id => document.getElementById(id).innerText;

await loadSdk();
await loadCatalog();
await loadCountries();
// the side panel and the hidden inputs of the app, in a hidden box
const html = await (await fetch('../app/index.html')).text();
const doc = new DOMParser().parseFromString(html, 'text/html');
const box = document.createElement('div');
box.style.display = 'none';
box.append(doc.getElementById('top'), doc.getElementById('side'), ...doc.querySelectorAll('body > input[type=file]'), doc.getElementById('toast'));
const banner = document.createElement('div'); banner.id = 'banner'; box.append(banner);
const railAreas = document.createElement('span'); railAreas.id = 'railAreas'; box.append(railAreas);
document.body.append(box);
applyI18n(box);

const { Map, SpatialReference } = getSdk();
const view = { map: new Map(), spatialReference: SpatialReference.WebMercator, ui: { add() {} }, goTo: async () => {}, on() { return { remove() {} }; }, when: async () => {} };
library.modules = [];

// a 400 m square site around a point of the terrain fixture (EPSG:32633), in Italy
const [lon, lat] = projectPointToWgs84(32633, [317500, 5063500]);
const f = makeLocalFrame({ lon0: lon, lat0: lat });
const { Polygon } = getSdk();
const sq = new Polygon({ rings: [[[-200, -200], [-200, 200], [200, 200], [200, -200], [-200, -200]]], spatialReference: f.sr });
const p = defaultProject();
p.name = 'UI';
p.features = [{ id: 'g', name: 'gross', category: 'gross', geometry: toGeoJSON(f.toSr(sq, SpatialReference.WGS84)), attrs: {}, source: 'test', sourceCategory: '' }];
store.project = p;

await test('panels start: areas, terrain, modules, fields, output', async () => {
  try { initAreas(view); } catch (e) { throw new Error('areas: ' + e.message); }
  initTerrain(view); initModulesUi(); initField(view); initOutput(); initQuick();
  await wait(600);
  assert(/Italy|RDN2008/.test(document.getElementById('outCrsAlerts').innerText + text('crsBadge')), 'national system proposed');
  assert(document.getElementById('fStruct').value === '3V9', 'standard structure');
  assert(/TOPCon/.test(document.getElementById('fModule').selectedOptions[0].text), 'standard module chosen');
  assert(/29° shading angle/.test(text('fPitchHint')), 'Italian minimum pitch: ' + text('fPitchHint'));
  return text('fPitchHint');
});

// the quick predesign dialog: open it, check what it proposes, run it
async function quickDialog(set = () => {}) {
  document.getElementById('btnQuick').click();
  await wait(100);
  const dlg = document.querySelector('dialog.quick');
  assert(dlg && dlg.open, 'dialog open');
  const form = dlg.querySelector('form');
  set(form);
  const seen = { pitch: form.pitch.value, hint: form.querySelector('[data-hint]').textContent, tech: form.tech.value };
  dlg.querySelector('button[type=submit]').click();
  await wait(1500);
  return seen;
}

await test('quick predesign, fixed: 3V9, Italian minimum pitch, optimised position, in one click', async () => {
  change('field', q => { q.field.structure = '2V13'; q.field.pitch = null; q.field.moduleId = null; });
  const seen = await quickDialog(form => { form.tech.value = 'ground-fixed'; form.dispatchEvent(new Event('change')); });
  assert(seen.pitch === '10.3' && /Italy \(29° shading angle\)/.test(seen.hint), `proposed ${seen.pitch}: ${seen.hint}`);
  const f = store.project.field, r = last.result;
  assert(f.structure === '3V9' && f.tiltDeg === 15 && f.pitch === 10.3, `field ${f.structure} ${f.tiltDeg} ${f.pitch}`);
  assert(r && r.tables > 100 && r.power.wp === 650, `result ${r && r.tables}`);
  assert(store.project.plannedModules.includes(f.moduleId), 'the module is planned for the project');
  assert(!document.querySelector('dialog.quick'), 'dialog closed');
  return `${r.tables} tables, ${r.dcMWp.toFixed(2)} MWp, offsets ${f.rowOffset} / ${f.columnOffset}`;
});

await test('fields: 3V9 at the Italian minimum pitch fills the site', async () => {
  document.querySelector('#fPitchHint button[data-pitch]').click();
  await wait(600);
  const r = last.result;
  assert(r && r.tables > 100, `tables ${r && r.tables}`);
  assert(Math.abs(store.project.field.pitch - 10.3) < 0.01, `pitch ${store.project.field.pitch}`);
  assert(r.power.wp === 650 || r.power.period, 'roadmap power of the period');
  return `${r.tables} tables, ${r.dcMWp.toFixed(2)} MWp at ${r.power.wp} Wp (${r.power.period})`;
});

await test('terrain: DTM loaded, slope map drawn, 3V cut (10 %), tracker kept (15 %)', async () => {
  const file = new File([await (await fetch('./fixtures/it_dtm_plane.tif')).blob()], 'it_dtm_plane.tif');
  const g = gridForSite(10);
  const r = await sampleDtm(file, g.frame, g.def);
  await useGrid({ id: 'ui', lon0: g.frame.lon0, lat0: g.frame.lat0, ...g.def, source: 'dtm', name: file.name, loadedAt: new Date().toISOString(), zmin: 100, zmax: 220, missing: 0 }, r.z, { persist: false });
  await wait(800);
  const slopes = view.map.layers.find(l => l.title === 'Slopes');
  assert(slopes && slopes.graphics.length >= 2, `slope layer graphics: ${slopes && slopes.graphics.length}`);
  assert(/Fixed 3V/.test(text('terRule')), 'rule shown: ' + text('terRule'));
  assert(/over the slope limit/.test(text('warns')), 'field warning: ' + text('warns'));
  assert(!last.result || last.result.tables === 0, 'no table on a 12 % slope for 3V');
  document.getElementById('fTech').value = 'agri-tracker';
  document.getElementById('fTech').dispatchEvent(new Event('change'));
  await wait(600);
  assert(store.project.field.structure === '1V28' && store.project.field.pitch === null, 'tracker standard, pitch left to the farm');
  assert(/agreed with the farm/.test(text('warns') + text('fPitchHint')), 'pitch message');
  document.getElementById('fPitch').value = '6';
  document.getElementById('fPitch').dispatchEvent(new Event('change'));
  await wait(800);
  const t = last.result;
  assert(t && t.tables > 20, `trackers ${t && t.tables}`);
  assert(!/over the slope limit/.test(text('warns')), 'nothing cut for trackers');
  return `${t.tables} trackers 1V28 (${(t.geom.tableLength).toFixed(2)} m), ${t.dcMWp.toFixed(2)} MWp`;
});

await test('quick predesign, tracker: the pitch agreed with the farm is asked, then 1V28 fills the site', async () => {
  let blocked = false;
  const seen = await quickDialog(form => {
    form.tech.value = 'agri-tracker'; form.dispatchEvent(new Event('change'));
    blocked = !form.checkValidity();          // empty pitch: the form does not run
    form.pitch.value = '5.5';
  });
  assert(blocked && seen.pitch === '5.5' && /agreed with the farm/.test(seen.hint) && /5.50 \/ 6.00/.test(seen.hint), seen.hint);
  const f = store.project.field, r = last.result;
  assert(f.structure === '1V28' && f.pitch === 5.5 && f.tracks.tables === 4, `field ${f.structure} ${f.pitch} ${f.tracks.tables}`);
  assert(r && r.tables > 20, `trackers ${r && r.tables}`);
  return `${r.tables} trackers at 5.50 m, ${r.dcMWp.toFixed(2)} MWp`;
});

await test('half tables option and GeoJSON export', async () => {
  const half = document.getElementById('fHalf');
  assert(!half.disabled, 'half tracker defined for 1V28');
  half.checked = true; half.dispatchEvent(new Event('change'));
  await wait(800);
  const r = last.result;
  const fc = buildGeoJSON();
  const tables = fc.features.filter(x => x.properties.category === 'table');
  assert(tables.length === r.tables, 'every table exported');
  assert(tables.every(x => x.properties.wp === r.power.wp), 'power of the period');
  return `${r.halves} halves (1V14) of ${r.tables}`;
});

await test('area summary shows the slope cut and the terrain panel its figures', async () => {
  change('field', q => { q.field.technology = 'ground-fixed'; q.field.structure = '3V9'; q.field.pitch = 10.3; });
  await wait(800);
  assert(/slopes over the limit/.test(text('areaSummary')), 'summary: ' + text('areaSummary'));
  assert(/Over the limit on the grid/.test(text('terCut')), 'terrain panel: ' + text('terCut'));
  assert(/it_dtm_plane.tif/.test(text('terInfo')), 'terrain info');
  replaceProject(defaultProject());
  await wait(400);
  assert(await runQuick({ technology: 'ground-fixed' }) === null, 'no site: the quick predesign says so');
  return text('terCut');
});

const ok = results.filter(r => r.ok).length;
document.getElementById('sum').innerHTML = `<b class="${ok === results.length ? 'ok' : 'err'}">${ok} / ${results.length} passed</b>`;
document.getElementById('out').innerHTML = results.map(r => `<tr><td class="s ${r.ok ? 'ok' : 'err'}">${r.ok ? 'PASS' : 'FAIL'}</td><td>${r.name}<br><code>${String(r.note).replace(/</g, '&lt;')}</code></td></tr>`).join('');
window.__results = results;
