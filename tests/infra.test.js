// Step 3 · Infrastructure: fence along the usable land and its clearance band, perimeter road, custom clearance,
// exclusions on the edge and inside, stations and their clearance, stations placed at the access, a country without
// toolkit values. Site: a 400 × 400 m square in Italy (invented place).
import { loadSdk, getSdk } from '../app/js/sdk.js';
import { loadCatalog } from '../app/js/catalog.js';
import { store, defaultProject } from '../app/js/state.js';
import { computeArea, siteFrame, crsState } from '../app/js/areas.js';
import { layoutInfra, addStation, placeAtAccess, suggestedRoad, clearances, nearestOnRings, rectangle, ringArea } from '../app/js/infra.js';
import { makeLocalFrame } from '../app/js/geo/localframe.js';
import { toGeoJSON, projectPointToWgs84 } from '../app/js/geo/convert.js';

const results = [];
async function test(name, fn) {
  try { const note = await fn(); results.push({ name, ok: true, note: note ?? '' }); }
  catch (e) { console.error(name, e); results.push({ name, ok: false, note: e && e.message || String(e) }); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };
const near = (a, b, tol, w) => assert(Math.abs(a - b) <= tol, `${w}: ${a} vs ${b} (tolerance ${tol})`);

await loadSdk();
await loadCatalog();
const [lon, lat] = projectPointToWgs84(32633, [317500, 5063500]);
const F = makeLocalFrame({ lon0: lon, lat0: lat });
const { Polygon, Point, SpatialReference } = getSdk();
const geo = rings => toGeoJSON(F.toSr(new Polygon({ rings, spatialReference: F.sr }), SpatialReference.WGS84));
const sq = (x0, y0, x1, y1) => [[[x0, y0], [x0, y1], [x1, y1], [x1, y0], [x0, y0]]];
const wgs = (x, y) => { const p = F.toSr(new Point({ x, y, spatialReference: F.sr }), SpatialReference.WGS84); return [p.x, p.y]; };
function site(extra = [], infra = {}) {
  const p = defaultProject();
  p.features = [{ id: 'g', name: 'gross', category: 'gross', geometry: geo(sq(-200, -200, 200, 200)), attrs: {}, source: 'test', sourceCategory: '' }, ...extra];
  Object.assign(p.infra, infra);
  store.project = p;
  crsState.iso = 'IT';
  return computeArea(siteFrame());
}
const exclusion = (id, rings) => ({ id, name: id, category: 'exclusion', geometry: geo(rings), attrs: {}, source: 'test', sourceCategory: '' });

await test('plain geometry: nearest point on a ring, rectangles, orientation', () => {
  const r = sq(0, 0, 10, 10)[0];
  const n = nearestOnRings([r], [3, -2]);
  assert(n.point[0] === 3 && n.point[1] === 0 && n.dist === 2, JSON.stringify(n));
  const rc = rectangle([0, 0], 8, 3, 90, 1);
  near(Math.abs(ringArea(rc)), 10 * 5, 1e-9, 'rectangle with margin');
  near(rc[1][0], 2.5, 1e-9, 'turned by 90°');
  assert(suggestedRoad(8.9) === true && suggestedRoad(9.1) === false && suggestedRoad(null) === null, 'road suggestion up to 9 MWp');
});

await test('fence without perimeter road: 4 m band cut in Italy', () => {
  const a = site();
  near(a.buildableArea, 392 * 392, 1, 'buildable');
  const L = layoutInfra(siteFrame(), a.pre);
  near(L.fence.length, 1600, 0.5, 'fence length');
  assert(!L.road && clearances().clearance === 4, 'no road');
  return `${(a.buildableArea / 1e4).toFixed(2)} ha of ${(a.grossArea / 1e4).toFixed(2)}`;
});

await test('perimeter road: 1 + 4 + 1 m, road drawn and measured', () => {
  const a = site([], { perimeterRoad: true });
  near(a.buildableArea, 388 * 388, 1, 'buildable');
  const L = layoutInfra(siteFrame(), a.pre);
  const { areaOperator } = getSdk();
  near(areaOperator.execute(L.road), 398 * 398 - 390 * 390, 1, 'road area: from 1 to 5 m inside the fence');
  near(L.roadLength, 4 * 394, 0.5, 'road centre line');
  return `road ${L.roadLength.toFixed(0)} m`;
});

await test('the designer can override the clearance, and switch the fence off', () => {
  near(site([], { clearance: 10 }).buildableArea, 380 * 380, 1, 'custom 10 m');
  near(site([], { fence: false }).buildableArea, 400 * 400, 1, 'no fence');
});

await test('the fence follows exclusions on the edge and ignores holes inside', () => {
  const edge = site([exclusion('west strip', sq(-200, -200, -150, 200))]);
  near(edge.buildableArea, (350 - 8) * 392, 2, 'edge exclusion moves the fence');
  near(layoutInfra(siteFrame(), edge.pre).fence.length, 1500, 0.5, 'fence length');
  const hole = site([exclusion('pond', sq(-20, -20, 20, 20))]);
  near(hole.buildableArea, 392 * 392 - 40 * 40, 2, 'hole cut once, no fence around it');
  near(layoutInfra(siteFrame(), hole.pre).fence.length, 1600, 0.5, 'fence length');
});

await test('stations: footprint of the Italian toolkit and 3 m kept free around', () => {
  const base = site().buildableArea;
  const [x, y] = wgs(0, 0);
  const s = addStation('CT', x, y, 0);
  assert(s, 'placed');
  const a = computeArea(siteFrame());
  near(base - a.buildableArea, (8.7 + 6) * (3 + 6), 0.5, 'area taken');
  const L = layoutInfra(siteFrame(), a.pre);
  assert(L.stations[0].building.id === 'CT-IT' && L.stations[0].inside, 'CT inside');
  return `${(base - a.buildableArea).toFixed(1)} m²`;
});

await test('delivery and user stations at the site access: on the fence, inside, within 20 m', () => {
  const [x, y] = wgs(30, -230);   // an access just south of the site
  site([{ id: 'acc', name: 'Main access', category: 'access', geometry: { type: 'Point', coordinates: [x, y] }, attrs: { type: 'site-access' }, source: 'test', sourceCategory: '' }]);
  assert(placeAtAccess(), 'placed');
  const a = computeArea(siteFrame());
  const L = layoutInfra(siteFrame(), a.pre);
  const cc = L.stations.find(s => s.kind === 'CC'), cu = L.stations.find(s => s.kind === 'CU');
  assert(cc && cu && cc.inside && cu.inside, 'both inside');
  near(cc.center[1], -200 + 1.5, 0.05, 'delivery station flush with the fence');
  const d = Math.hypot(cc.center[0] - cu.center[0], cc.center[1] - cu.center[1]);
  assert(d <= 20 && !L.notes.length, `distance ${d}`);
  assert(L.gates.length === 1 && Math.abs(L.gates[0].point[1] + 200) < 0.01 && L.gates[0].width === 6, 'gate on the fence, 6 m');
  return `CC–CU ${d.toFixed(1)} m, gate at x ${L.gates[0].point[0].toFixed(1)}`;
});

await test('a country without toolkit values: said, not borrowed', () => {
  const a = site();
  crsState.iso = 'PL';
  const b = computeArea(siteFrame());
  near(b.buildableArea, 400 * 400, 1, 'no clearance');
  assert(b.notes.some(n => /no fence clearance for Poland/.test(n)), 'note');
  assert(addStation('CT', lon, lat) === null, 'no station size for Poland');
  crsState.iso = 'IT';
  store.project = defaultProject();
  return `${(a.buildableArea / 1e4).toFixed(2)} ha in Italy, ${(b.buildableArea / 1e4).toFixed(2)} ha in Poland`;
});

const ok = results.filter(r => r.ok).length;
document.getElementById('sum').innerHTML = `<b class="${ok === results.length ? 'ok' : 'err'}">${ok} / ${results.length} passed</b>`;
document.getElementById('out').innerHTML = results.map(r => `<tr><td class="s ${r.ok ? 'ok' : 'err'}">${r.ok ? 'PASS' : 'FAIL'}</td><td>${r.name}<br><code>${String(r.note).replace(/</g, '&lt;')}</code></td></tr>`).join('');
window.__results = results;
