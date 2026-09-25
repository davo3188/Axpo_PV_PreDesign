// Step 3 · Infrastructure: fence, perimeter road, gates, internal roads (from the corridors of 2 · Fields) and
// stations. Values come from the country of the site (catalog countries.<ISO>: clearances, roads, buildings, gates);
// every value is a default the designer can change, and a missing country value is reported, never borrowed.
//
// The fence runs along the outline of the land the plant can use (the base area minus the objects of 1 · Areas,
// holes ignored). The band between the fence and the structures (with a perimeter road: fence → road → structures)
// is cut from the buildable area, and so is every station with its clearance.
import { getSdk } from './sdk.js';
import { store, change, on, uid } from './state.js';
import { t, fmt } from './i18n.js';
import { countryValue, countryName, getCatalog, standardFor } from './catalog.js';
import { siteFrame, extraCuts, crsState, computeArea } from './areas.js';
import { last } from './field.js';
import { toast } from './ui/toast.js';

const KINDS = { CC: 'delivery-station', CU: 'user-station', CT: 'transformer-station' };
const STATION_COLOUR = { CC: [31, 153, 204], CU: [110, 170, 60], CT: [233, 120, 30] };
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let view = null, layer = null, placing = null, clickHandle = null;

// ── plain geometry in the local frame (no SDK) ──
export function ringArea(r) { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += r[j][0] * r[i][1] - r[i][0] * r[j][1]; return s / 2; }
export function ringLength(r) { let s = 0; for (let i = 1; i < r.length; i++) s += Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]); return s; }
export function pointInRing([x, y], r) {
  let ins = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if ((yi > y) !== (yj > y) && x < xi + (y - yi) * (xj - xi) / (yj - yi)) ins = !ins;
  }
  return ins;
}
// Nearest point of a set of rings: { point, dir (unit vector of the segment), ring, dist }
export function nearestOnRings(rings, [px, py]) {
  let best = null;
  rings.forEach((r, k) => {
    for (let i = 1; i < r.length; i++) {
      const [ax, ay] = r[i - 1], [bx, by] = r[i];
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      if (!l2) continue;
      const s = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
      const q = [ax + s * dx, ay + s * dy], d = Math.hypot(px - q[0], py - q[1]);
      if (!best || d < best.dist) { const l = Math.sqrt(l2); best = { point: q, dir: [dx / l, dy / l], ring: k, dist: d }; }
    }
  });
  return best;
}
// Corners of a rectangle of length L (along the angle rotDeg) and width W centred on c, grown by m on every side
export function rectangle([cx, cy], L, W, rotDeg, m = 0) {
  const a = rotDeg * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
  const hl = L / 2 + m, hw = W / 2 + m;
  return [[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw], [-hl, -hw]].map(([s, q]) => [cx + s * ux + q * vx, cy + s * uy + q * vy]);
}

// ── values of the country of the site ──
const val = path => (crsState.iso ? countryValue(crsState.iso, path) : null);
export function building(kind) {
  const list = (crsState.iso && getCatalog()?.countries?.[crsState.iso]?.buildings) || [];
  return list.find(b => b.kind === KINDS[kind]) || null;
}
// Clearances in force: { clearance (fence → structures), roadGap (fence → road), roadWidth, source, missing }
export function clearances(P = store.project) {
  const road = !!P.infra.perimeterRoad;
  const tk = val(road ? 'clearances.fenceToStructuresWithPerimeterRoad' : 'clearances.fenceToStructuresWithoutRoad');
  const roadGap = val('clearances.fenceToPerimeterRoad')?.value ?? null;
  const roadWidth = val('clearances.perimeterRoadWidth')?.value ?? val('roads.heavy.width')?.value ?? null;
  const custom = P.infra.clearance;
  return { clearance: custom != null ? custom : tk?.value ?? null, source: custom != null ? 'custom' : tk ? 'toolkit' : null,
    toolkit: tk?.value ?? null, roadGap, roadWidth, road };
}
export function stationClearance() { return val('clearances.stationClearance')?.value ?? 0; }
export function gateWidth() { const g = (crsState.iso && getCatalog()?.countries?.[crsState.iso]?.gates) || []; return g[0]?.width ?? null; }
export function suggestedRoad(mwp) {
  const s = standardFor('perimeterRoad');
  return s && mwp > 0 ? mwp <= s.suggestedUpToMWp : null;
}

// ── geometry of the infrastructure in the frame of the site ──
// fence: polygon of the outer rings of the usable land (pre), with its line and length
function fenceOf(pre) {
  const { Polygon } = getSdk();
  const rings = (pre?.rings || []).filter(r => ringArea(r) < 0 && Math.abs(ringArea(r)) > 50);   // outer rings are clockwise
  if (!rings.length) return null;
  return { polygon: new Polygon({ rings, spatialReference: pre.spatialReference }), rings, length: rings.reduce((s, r) => s + ringLength(r), 0) };
}
function shrink(poly, d) { const g = d > 0 ? getSdk().bufferOperator.execute(poly, -d) : poly; return g && g.rings && g.rings.length ? g : null; }
function minus(a, b) { return a && b ? getSdk().differenceOperator.execute(a, b) : a; }
function perimeterOf(g) { return (g?.rings || []).reduce((s, r) => s + ringLength(r), 0); }

// Everything computed for a frame and the usable land: { fence, band, road, roadLength, stations: [{…, footprint, cut}], gates }
export function layoutInfra(frame, pre) {
  const P = store.project, I = P.infra, out = { fence: null, band: null, road: null, roadLength: 0, stations: [], gates: [], notes: [] };
  if (!pre || !I.fence) return out;
  const f = fenceOf(pre);
  if (!f) return out;
  out.fence = f;
  const c = clearances(P);
  if (c.clearance == null) out.notes.push(t('infra.noClearance', { country: countryName(crsState.iso) || '—' }));
  if (c.clearance > 0) out.band = minus(f.polygon, shrink(f.polygon, c.clearance));
  if (c.road && c.roadGap != null && c.roadWidth > 0) {
    out.road = minus(shrink(f.polygon, c.roadGap), shrink(f.polygon, c.roadGap + c.roadWidth));
    out.roadLength = perimeterOf(shrink(f.polygon, c.roadGap + c.roadWidth / 2));
  }
  // gates at the site accesses, on the fence
  const { Point, Polygon, SpatialReference } = getSdk();
  const toLocal = (lon, lat) => { const p = frame.toLocal(new Point({ x: lon, y: lat, spatialReference: SpatialReference.WGS84 })); return p ? [p.x, p.y] : null; };
  for (const a of P.features.filter(x => x.category === 'access' && x.attrs?.type !== 'grid-connection')) {
    const c0 = a.geometry.type === 'Point' ? a.geometry.coordinates : a.geometry.type === 'LineString' ? a.geometry.coordinates[0] : null;
    const p = c0 && toLocal(c0[0], c0[1]);
    const n = p && nearestOnRings(f.rings, p);
    if (n) out.gates.push({ id: a.id, name: a.name, point: n.point, dir: n.dir, dist: n.dist, width: gateWidth() });
  }
  // stations: footprint and the area kept free around it
  const sc = stationClearance();
  for (const s of I.stations) {
    const b = building(s.kind), p = toLocal(s.lon, s.lat);
    if (!b || !p) continue;
    const footprint = new Polygon({ rings: [rectangle(p, b.length, b.width, s.rot || 0)], spatialReference: frame.sr });
    const cut = new Polygon({ rings: [rectangle(p, b.length, b.width, s.rot || 0, sc)], spatialReference: frame.sr });
    const inside = f.rings.some(r => pointInRing(p, r));
    out.stations.push({ ...s, center: p, building: b, footprint, cut, inside });
  }
  const cc = out.stations.find(s => s.kind === 'CC');
  for (const s of out.stations) {
    if (!s.inside) out.notes.push(t('infra.stationOutside', { kind: t('infra.kind.' + s.kind) }));
    if (s.kind === 'CU' && cc) {
      const max = s.building.maxDistanceToDelivery;
      const d = Math.hypot(s.center[0] - cc.center[0], s.center[1] - cc.center[1]);
      if (max && d > max) out.notes.push(t('infra.cuFar', { d: fmt(d, 0), max }));
    }
  }
  return out;
}

// Cuts for the buildable area (areas.js): the fence band and the stations
extraCuts.push((frame, ctx) => {
  if (!ctx) return null;
  const L = layoutInfra(frame, ctx.pre);
  const out = L.notes.map(note => ({ note }));
  if (L.band) out.push({ geometry: L.band, kind: 'fence', label: t('infra.fenceBand') });
  for (const s of L.stations) out.push({ geometry: s.cut, kind: 'station', label: t('infra.kind.' + s.kind) });
  return out;
});

// ── stations ──
export function addStation(kind, lon, lat, rot = null) {
  if (!building(kind)) { toast(t('infra.noBuilding', { kind: t('infra.kind.' + kind), country: countryName(crsState.iso) || '—' }), 'err'); return null; }
  const s = { id: uid(), kind, lon, lat, rot: rot ?? rowAngle() };
  change('infra', p => { p.infra.stations.push(s); });
  return s;
}
// long side of the stations along the rows by default
function rowAngle() {
  const A = store.project.field.azimuthDeg ?? 180;
  return Math.atan2(Math.sin(A * Math.PI / 180), -Math.cos(A * Math.PI / 180)) * 180 / Math.PI;
}
// Delivery station at the site access, flush with the fence, and the user station next to it (toolkit: at the
// entrance; user station within 20 m of the delivery station)
export function placeAtAccess() {
  const frame = siteFrame();
  const a = frame && store.project.features.find(x => x.category === 'access' && x.attrs?.type !== 'grid-connection' && x.geometry.type === 'Point');
  if (!a) { toast(t('infra.noAccess'), 'err'); return false; }
  const { Point, SpatialReference, projectOperator } = getSdk();
  const pre = currentPre(frame);
  const f = pre && fenceOf(pre);
  const bcc = building('CC'), bcu = building('CU');
  if (!f || !bcc) { toast(t('infra.noBuilding', { kind: t('infra.kind.CC'), country: countryName(crsState.iso) || '—' }), 'err'); return false; }
  const p0 = frame.toLocal(new Point({ x: a.geometry.coordinates[0], y: a.geometry.coordinates[1], spatialReference: SpatialReference.WGS84 }));
  const n = nearestOnRings(f.rings, [p0.x, p0.y]);
  let nx = -n.dir[1], ny = n.dir[0];
  if (!f.rings.some(r => pointInRing([n.point[0] + nx, n.point[1] + ny], r))) { nx = -nx; ny = -ny; }
  const rot = Math.atan2(n.dir[1], n.dir[0]) * 180 / Math.PI;
  const toWgs = ([x, y]) => { const q = projectOperator.execute(new Point({ x, y, spatialReference: frame.sr }), SpatialReference.WGS84); return [q.x, q.y]; };
  const cc = [n.point[0] + nx * bcc.width / 2, n.point[1] + ny * bcc.width / 2];
  const list = [{ id: uid(), kind: 'CC', lon: toWgs(cc)[0], lat: toWgs(cc)[1], rot }];
  if (bcu) {
    const step = bcc.length / 2 + stationClearance() + bcu.length / 2;
    let cu = [cc[0] + n.dir[0] * step, cc[1] + n.dir[1] * step];
    if (!f.rings.some(r => pointInRing(cu, r))) cu = [cc[0] - n.dir[0] * step, cc[1] - n.dir[1] * step];
    const w = toWgs(cu);
    list.push({ id: uid(), kind: 'CU', lon: w[0], lat: w[1], rot });
  }
  change('infra', p => { p.infra.stations = p.infra.stations.filter(s => s.kind !== 'CC' && s.kind !== 'CU').concat(list); });
  return true;
}
function currentPre(frame) {
  const r = computeArea(frame);
  return r && !r.error ? r.pre : null;
}

// ── map ──
function draw(frame, L) {
  if (!layer) return;
  const { Graphic, projectOperator } = getSdk();
  layer.removeAll();
  if (!frame) return;
  const to = g => projectOperator.execute(g, view.spatialReference);
  const out = [];
  const { Polyline, Point } = getSdk();
  if (L.road) out.push(new Graphic({ geometry: to(L.road), symbol: { type: 'simple-fill', color: [150, 150, 150, 0.55], outline: { color: [120, 120, 120, 0.8], width: 0.5 } } }));
  for (const r of last.result?.roads || []) out.push(new Graphic({ geometry: to(r), symbol: { type: 'simple-fill', color: [150, 150, 150, 0.45], outline: { color: [120, 120, 120, 0.7], width: 0.5 } } }));
  if (L.fence) out.push(new Graphic({ geometry: to(new Polyline({ paths: L.fence.rings, spatialReference: frame.sr })),
    symbol: { type: 'simple-line', color: [60, 60, 60], width: 2, style: 'short-dash-dot' } }));
  for (const s of L.stations) {
    const c = STATION_COLOUR[s.kind];
    out.push(new Graphic({ geometry: to(s.cut), symbol: { type: 'simple-fill', color: [...c, 0.1], outline: { color: [...c, 0.8], width: 1, style: 'dash' } } }));
    out.push(new Graphic({ geometry: to(s.footprint), symbol: { type: 'simple-fill', color: [...c, 0.85], outline: { color: [255, 255, 255], width: 1 } } }));
  }
  for (const g of L.gates) out.push(new Graphic({ geometry: to(new Point({ x: g.point[0], y: g.point[1], spatialReference: frame.sr })),
    symbol: { type: 'simple-marker', style: 'square', size: 11, color: [30, 30, 30], outline: { color: [255, 255, 255], width: 1.5 } } }));
  layer.addMany(out.filter(g => g.geometry));
}

// ── panel ──
function render() {
  if (!$('infFence')) return;
  const P = store.project, I = P.infra, frame = siteFrame();
  const pre = frame ? currentPre(frame) : null;
  const L = frame ? layoutInfra(frame, pre) : { stations: [], gates: [], notes: [] };
  const c = clearances(P), country = countryName(crsState.iso) || '—';
  const r = last.result;
  $('infFence').checked = !!I.fence;
  $('infClear').value = I.clearance ?? '';
  $('infClear').placeholder = c.toolkit != null ? `${fmt(c.toolkit, 1)} (${t('infra.toolkit')})` : '';
  $('infClearHint').textContent = c.toolkit != null
    ? t(c.road ? 'infra.clearWithRoad' : 'infra.clearNoRoad', { m: fmt(c.toolkit, 1), country })
    : t('infra.noClearance', { country });
  $('infFenceInfo').innerHTML = L.fence ? `<div class="kpis">${kpi(`${fmt(L.fence.length, 0)} m`, t('infra.fenceLength'))}${kpi(`${fmt(c.clearance ?? 0, 1)} m`, t('infra.fenceClear'))}</div>` : `<div class="hint">${esc(t('infra.noSite'))}</div>`;
  // perimeter road and its suggestion
  $('infRoad').checked = !!I.perimeterRoad;
  const sug = suggestedRoad(r?.dcMWp), std = standardFor('perimeterRoad');
  let html = L.road ? `<div class="hint">${esc(t('infra.roadInfo', { len: fmt(L.roadLength, 0), w: fmt(c.roadWidth, 1), gap: fmt(c.roadGap, 1) }))}</div>` : '';
  if (sug != null) {
    const same = sug === !!I.perimeterRoad;
    html += `<div class="${same ? 'hint' : 'warn'}">${esc(t(sug ? 'infra.roadSugOn' : 'infra.roadSugOff', { mwp: fmt(r.dcMWp, 2), max: std.suggestedUpToMWp }))}
      ${same ? '' : ` <button type="button" class="linkbtn" id="infRoadApply">${esc(t('infra.apply'))}</button>`}</div>`;
  } else html += `<div class="hint">${esc(t('infra.roadSugNone', { max: std?.suggestedUpToMWp ?? 9 }))}</div>`;
  if (I.perimeterRoad && (c.roadGap == null || !(c.roadWidth > 0))) html += `<div class="warn">${esc(t('infra.noRoadValues', { country }))}</div>`;
  $('infRoadInfo').innerHTML = html;
  const ap = $('infRoadApply');
  if (ap) ap.onclick = () => change('infra', p => { p.infra.perimeterRoad = sug; });
  // internal roads
  const roads = r?.roads || [];
  $('infRoads').innerHTML = roads.length
    ? `<div class="hint">${esc(t('infra.roadsInfo', { n: roads.length, len: fmt(r.roadsLength, 0), w: fmt(P.field.tracks.width, 1) }))}</div>`
    : `<div class="hint">${esc(t('infra.roadsNone'))}</div>`;
  // gates
  $('infGates').innerHTML = L.gates.length
    ? L.gates.map(g => `<div class="hint">${esc(t('infra.gate', { name: g.name, w: g.width != null ? fmt(g.width, 1) + ' m' : '—', d: fmt(g.dist, 0) }))}</div>`).join('')
    : `<div class="hint">${esc(t('infra.gatesNone'))}</div>`;
  // stations
  $('infStations').innerHTML = '';
  for (const s of L.stations) {
    const row = document.createElement('div');
    row.className = 'it';
    row.innerHTML = `<span class="sw" style="background:rgb(${STATION_COLOUR[s.kind].join(',')})"></span><span class="nm"></span>
      <button type="button" class="x" data-rot="${s.id}" title="${esc(t('infra.rotate'))}" aria-label="${esc(t('infra.rotate'))}">⟳</button>
      <button type="button" class="x" data-del="${s.id}" title="${esc(t('areas.remove'))}" aria-label="${esc(t('areas.remove'))}">×</button>`;
    const nm = row.querySelector('.nm');
    nm.textContent = t('infra.kind.' + s.kind);
    const sm = document.createElement('small');
    sm.textContent = `${fmt(s.building.length, 2)} × ${fmt(s.building.width, 2)} m · ${s.building.id}${s.inside ? '' : ' · ' + t('infra.outside')}`;
    nm.appendChild(sm);
    $('infStations').appendChild(row);
  }
  const nCT = L.stations.filter(s => s.kind === 'CT').length;
  const per = getCatalog()?.countries?.[crsState.iso]?.stationRules?.find(x => x.id === 'transformer-stations-per-mwp')?.value ?? 3;
  $('infStationsHint').textContent = [
    r?.dcMWp > 0 ? t('infra.ctHint', { n: Math.ceil(r.dcMWp / per), per, mwp: fmt(r.dcMWp, 1), placed: nCT }) : '',
    building('CT') ? t('infra.stationClear', { m: fmt(stationClearance(), 1) }) : t('infra.noBuilding', { kind: t('infra.kind.CT'), country }),
  ].filter(Boolean).join(' ');
  for (const k of ['CC', 'CU', 'CT']) $('inf' + k).disabled = !building(k);
  draw(frame, L);
}
const kpi = (v, k) => `<div class="kpi"><div class="v">${v}</div><div class="k">${esc(k)}</div></div>`;

function startPlacing(kind) {
  placing = placing === kind ? null : kind;
  document.querySelectorAll('#side [data-place]').forEach(b => b.classList.toggle('active', b.dataset.place === placing));
  const b = $('banner');
  if (b) { if (placing) { b.innerHTML = t('infra.placeBanner', { kind: esc(t('infra.kind.' + kind)) }); b.hidden = false; } else b.hidden = true; }
}

export function initInfra(mapView) {
  view = mapView;
  const { GraphicsLayer } = getSdk();
  layer = new GraphicsLayer({ title: 'Infrastructure', listMode: 'hide' });
  view.map.add(layer);
  $('infFence').onchange = () => change('infra', p => { p.infra.fence = $('infFence').checked; });
  $('infClear').onchange = () => change('infra', p => { const v = $('infClear').value; p.infra.clearance = v === '' ? null : Math.max(0, Number(v) || 0); });
  $('infRoad').onchange = () => change('infra', p => { p.infra.perimeterRoad = $('infRoad').checked; });
  for (const k of ['CC', 'CU', 'CT']) { $('inf' + k).dataset.place = k; $('inf' + k).onclick = () => startPlacing(k); }
  $('infAtAccess').onclick = () => placeAtAccess();
  $('infStations').onclick = e => {
    const d = e.target.closest('[data-del]'), r = e.target.closest('[data-rot]');
    if (d) change('infra', p => { p.infra.stations = p.infra.stations.filter(s => s.id !== d.dataset.del); });
    if (r) change('infra', p => { const s = p.infra.stations.find(x => x.id === r.dataset.rot); if (s) s.rot = ((s.rot || 0) + 90) % 360; });
  };
  clickHandle = view.on('click', e => {
    if (!placing || !e.mapPoint) return;
    e.stopPropagation?.();
    const { projectOperator, SpatialReference } = getSdk();
    const q = projectOperator.execute(e.mapPoint, SpatialReference.WGS84);
    addStation(placing, q.x, q.y);
    if (placing !== 'CT') startPlacing(placing);   // one delivery / user station; transformer stations until Esc
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && placing) startPlacing(placing); });
  for (const topic of ['infra', 'site', 'settings', 'project', 'crs', 'layout', 'terrain']) on(topic, () => renderSoon());
  render();
}
let tm = 0;
function renderSoon() { clearTimeout(tm); tm = setTimeout(render, 60); }
export function renderInfraNow() { clearTimeout(tm); render(); }
