// Field: parameters, parametric generation (area -> rows of tables), map rendering, results and warnings.
import { getSdk } from './sdk.js';
import { store, change, on, saveSoon } from './state.js';
import { t, tn, fmt } from './i18n.js';
import { parseNotation, tableGeometry, minPitch, shadingAngleDeg, gcr } from './layout/structures.js';
import { fillRows, tablesPerBlock } from './layout/rows.js';
import { structurePresets, presetFor, def, rule } from './catalog.js';
import { library, moduleById, moduleLabel } from './modules.js';
import { siteFrame, computeArea } from './areas.js';
import { ringsOf } from './geo/localframe.js';
import { toast } from './ui/toast.js';

const TECH_DEFAULTS = {
  'ground-fixed': { tiltDeg: 15, azimuthDeg: 180, structure: '2V13' },
  'agri-fixed': { tiltDeg: 20, azimuthDeg: 180, structure: '2V9' },
  'agri-tracker': { tiltDeg: 0, azimuthDeg: 90, structure: '2V26' },
};
const TABLE_SYMBOL = { type: 'simple-fill', color: [57, 69, 207, 0.78], outline: { color: [255, 255, 255, 0.55], width: 0.4 } };
const AREA_SYMBOL = { type: 'simple-fill', color: [45, 190, 126, 0.07], outline: { color: [45, 190, 126], width: 1.5, style: 'dash' } };

let view, areaLayer, tableLayer;
export const last = { result: null };
const $ = id => document.getElementById(id);

export function initField(mapView) {
  view = mapView;
  const { GraphicsLayer } = getSdk();
  areaLayer = new GraphicsLayer({ title: 'Buildable area' });
  tableLayer = new GraphicsLayer({ title: 'Tables' });
  view.map.addMany([areaLayer, tableLayer]);

  const set = (fn) => change('field', p => fn(p.field));
  const num = el => (el.value === '' ? null : Number(el.value));
  $('fTech').onchange = () => set(f => {
    f.technology = $('fTech').value;
    Object.assign(f, TECH_DEFAULTS[f.technology] || {});
  });
  $('fStruct').onchange = () => set(f => {
    f.structure = $('fStruct').value.trim();
    const pre = presetFor(f.technology, f.structure);
    if (pre) { if (pre.tiltDeg != null) f.tiltDeg = pre.tiltDeg; if (pre.azimuthDeg != null) f.azimuthDeg = pre.azimuthDeg; }
  });
  $('fStruct').oninput = () => structureHint($('fStruct').value);
  $('fModule').onchange = () => set(f => { f.moduleId = $('fModule').value || null; });
  $('fTilt').onchange = () => set(f => { f.tiltDeg = num($('fTilt')) ?? 0; });
  $('fAz').onchange = () => set(f => { f.azimuthDeg = num($('fAz')) ?? 180; });
  $('fPitch').onchange = () => set(f => { f.pitch = num($('fPitch')); });
  $('fTableGap').onchange = () => set(f => { f.tableGap = Math.max(0, num($('fTableGap')) ?? 0); });
  $('fModGap').onchange = () => set(f => { f.moduleGap = Math.max(0, num($('fModGap')) ?? 0); });
  $('fTracks').onchange = () => set(f => { f.tracks.enabled = $('fTracks').checked; });
  $('fTrackEvery').onchange = () => set(f => { f.tracks.spacing = Math.max(1, num($('fTrackEvery')) ?? 100); });
  $('fTrackWidth').onchange = () => set(f => { f.tracks.width = Math.max(0, num($('fTrackWidth')) ?? 0); });
  $('fTarget').onchange = () => set(f => { f.targetMWp = num($('fTarget')); });
  $('fRowOff').onchange = () => set(f => { f.rowOffset = Math.max(0, num($('fRowOff')) ?? 0); });
  $('fColOff').onchange = () => set(f => { f.columnOffset = Math.max(0, num($('fColOff')) ?? 0); });
  $('fOptimise').onclick = optimise;
  $('fPitchHint').onclick = e => {
    const b = e.target.closest('button[data-pitch]');
    if (b) set(f => { f.pitch = Number(b.dataset.pitch); });
  };
  $('specYield').onchange = () => change('yield', p => { p.specificYield = num($('specYield')); });

  for (const topic of ['site', 'settings', 'field', 'modules', 'project']) on(topic, () => { syncInputs(); schedule(); });
  on('yield', () => renderResults(last.result));
  syncInputs();
  schedule();
}

// ── inputs ──
function syncInputs() {
  const f = store.project.field;
  $('fTech').value = f.technology;
  const dl = $('structPresets');
  dl.innerHTML = structurePresets(f.technology).map(s => `<option value="${s.notation}">${s.label}${s.verify ? ' (to verify)' : ''}</option>`).join('');
  if (document.activeElement !== $('fStruct')) $('fStruct').value = f.structure;
  structureHint(f.structure);
  // modules: planned first
  const planned = new Set(store.project.plannedModules);
  const pl = library.modules.filter(m => planned.has(m.id)), rest = library.modules.filter(m => !planned.has(m.id));
  const opt = m => `<option value="${m.id}">${escapeHtml(moduleLabel(m))}</option>`;
  $('fModule').innerHTML = library.modules.length
    ? (pl.length ? `<optgroup label="${escapeHtml(t('mod.planned'))}">${pl.map(opt).join('')}</optgroup>` : '')
      + (rest.length ? `<optgroup label="${escapeHtml(t('mod.title'))}">${rest.map(opt).join('')}</optgroup>` : '')
    : `<option value="">${escapeHtml(t('field.noModule'))}</option>`;
  if (f.moduleId && moduleById(f.moduleId)) $('fModule').value = f.moduleId;
  else if (library.modules.length) {   // no module chosen yet: take the first planned one
    const first = (pl[0] || rest[0]).id;
    $('fModule').value = first;
    if (f.moduleId !== first) { f.moduleId = first; saveSoon(); }
  }
  const tracker = f.technology === 'agri-tracker';
  $('fTiltBox').style.visibility = tracker ? 'hidden' : '';
  $('fTilt').value = f.tiltDeg;
  $('fAz').value = f.azimuthDeg;
  if (document.activeElement !== $('fPitch')) $('fPitch').value = f.pitch ?? '';
  $('fTableGap').value = f.tableGap;
  $('fModGap').value = f.moduleGap;
  $('fTracks').checked = !!f.tracks.enabled;
  $('fTrackEvery').value = f.tracks.spacing;
  $('fTrackWidth').value = f.tracks.width;
  $('fTarget').value = f.targetMWp ?? '';
  $('fRowOff').value = f.rowOffset;
  $('fColOff').value = f.columnOffset;
  $('specYield').value = store.project.specificYield ?? '';
}

function structureHint(text) {
  const s = parseNotation(text), mod = moduleById(store.project.field.moduleId), el = $('fStructHint');
  if (!s) { el.textContent = t('field.structureBad'); return; }
  if (!mod) { el.textContent = t('field.structureHint'); return; }
  const g = tableGeometry({ notation: s, module: mod, moduleGap: store.project.field.moduleGap, tiltDeg: store.project.field.tiltDeg });
  el.textContent = t('field.structureParsed', { across: s.across, along: s.along, orientation: t('orientation.' + s.orientation),
    modules: g.modules, length: fmt(g.tableLength, 2), depth: fmt(g.planDepth, 2) });
}

// ── generation ──
let timer = 0;
function schedule() { clearTimeout(timer); timer = setTimeout(generate, 120); }

function setup() {
  const p = store.project, f = p.field;
  const warns = [];
  const frame = siteFrame();
  if (!frame) return { warns: [t('warn.noSite')] };
  const area = computeArea(frame);
  if (area.error) return { warns: [t('warn.noSite')] };
  if (area.ignored) warns.push(tn('warn.lineNoBuffer', area.ignored));
  const mod = moduleById(f.moduleId);
  const s = parseNotation(f.structure);
  if (!mod) warns.push(t('warn.noModule'));
  if (!s) warns.push(t('warn.badStructure'));
  if (!(f.pitch > 0)) warns.push(t('warn.noPitch'));
  if (!area.buildable) warns.push(t('warn.noArea'));
  const tracker = f.technology === 'agri-tracker';
  // table geometry is known as soon as structure and module are: the pitch hint needs it even without a pitch
  const hintGeom = mod && s ? tableGeometry({ notation: s, module: mod, moduleGap: f.moduleGap, tiltDeg: tracker ? 0 : f.tiltDeg }) : null;
  const base = { frame, area, warns, mod, s, hintGeom };
  if (!mod || !s || !(f.pitch > 0) || !area.buildable) return base;
  const geom = hintGeom;
  const opt = { azimuthDeg: f.azimuthDeg, tableLength: geom.tableLength, planDepth: geom.planDepth, pitch: f.pitch,
    tableGap: f.tableGap, rowOffset: f.rowOffset, columnOffset: f.columnOffset };
  if (f.tracks.enabled && f.tracks.spacing > 0 && f.tracks.width > 0) {
    opt.blockTables = tablesPerBlock(f.tracks.spacing, geom.tableLength, f.tableGap);
    opt.corridorWidth = f.tracks.width;
  }
  const wpTable = geom.modules * mod.wp;
  if (f.targetMWp > 0) opt.maxTables = Math.ceil(f.targetMWp * 1e6 / wpTable);
  return { ...base, geom, opt, rings: ringsOf(area.buildable), wpTable, tracker };
}

function generate() {
  const { Graphic, Polygon } = getSdk();
  const st = setup();
  areaLayer.removeAll();
  tableLayer.removeAll();
  last.result = null;
  if (st.area && st.area.buildable) {
    areaLayer.add(new Graphic({ geometry: st.frame.toSr(st.area.buildable, view.spatialReference), symbol: AREA_SYMBOL }));
  }
  const f = store.project.field;
  if (!st.geom) {
    renderResults({ area: st.area, warns: st.warns });
    const pre = presetFor(f.technology, f.structure);
    updatePitchHint(st.hintGeom && f.technology === 'ground-fixed' ? minPitch(st.hintGeom, def('fixed.maxShadingAngleDeg', 35)) : null, pre);
    return;
  }
  const t0 = performance.now();
  const res = fillRows(st.rings, st.opt);
  const tFill = performance.now() - t0;
  // tables to the map (rings clockwise, as ArcGIS expects)
  const polys = res.tables.map(tb => new Polygon({ rings: [[tb.corners[0], tb.corners[3], tb.corners[2], tb.corners[1], tb.corners[0]]], spatialReference: st.frame.sr }));
  const inView = polys.length ? st.frame.toSrMany(polys, view.spatialReference) : [];
  tableLayer.addMany(inView.filter(Boolean).map((g, i) => new Graphic({ geometry: g, symbol: TABLE_SYMBOL, attributes: { row: res.tables[i].row, col: res.tables[i].col } })));
  const tDraw = performance.now() - t0 - tFill;

  const tables = res.tables.length, modules = tables * st.geom.modules, dcMWp = tables * st.wpTable / 1e6;
  const siteArea = st.area.siteArea, cover = tables * st.geom.tableLength * st.geom.planDepth / siteArea;
  const warns = [...st.warns];
  const preset = presetFor(f.technology, f.structure);
  const maxAngle = def('fixed.maxShadingAngleDeg', 35);
  let minP = null;
  if (f.technology === 'ground-fixed') {
    minP = minPitch(st.geom, maxAngle);
    if (f.pitch < minP - 0.005) warns.push(t('warn.pitchBelowMin', { pitch: fmt(f.pitch, 2), min: fmt(minP, 2), angle: fmt(shadingAngleDeg(st.geom, f.pitch), 1), max: maxAngle }));
  } else if (preset && preset.minPitch && f.pitch < preset.minPitch - 0.005) {
    warns.push(t('warn.pitchBelowPreset', { pitch: fmt(f.pitch, 2), min: fmt(preset.minPitch, 2), id: preset.id }));
  }
  const cov = rule('agri-max-coverage');
  if (f.technology !== 'ground-fixed' && cov && cover > cov.value + 1e-9) warns.push(t('warn.coverage', { cov: fmt(cover * 100, 1), max: fmt(cov.value * 100, 0) }));
  if (st.opt.maxTables && tables >= st.opt.maxTables) warns.push(t('warn.target', { mwp: fmt(dcMWp, 2) }));
  const verify = [];
  if (preset && preset.verify) verify.push(preset.id);
  if (f.tracks.enabled && def('transversalTrack.width') === f.tracks.width) verify.push('track width');
  if (verify.length) warns.push(t('warn.verify', { items: verify.join(', ') }));

  last.result = { area: st.area, warns, tables, modules, dcMWp, rows: res.rows, gcr: gcr(st.geom, f.pitch),
    shading: f.technology === 'agri-tracker' ? null : shadingAngleDeg(st.geom, f.pitch), siteArea, buildableArea: st.area.buildableArea,
    cover, geom: st.geom, module: st.mod, frame: st.frame, tablesLocal: res.tables, ms: { fill: tFill, draw: tDraw } };
  window.__last = last.result;   // debug hook
  renderResults(last.result);
  updatePitchHint(minP, preset);
}

function updatePitchHint(minP, preset) {
  const el = $('fPitchHint');
  const f = store.project.field;
  let html = '';
  if (minP != null) {
    const v = Math.ceil(minP * 100) / 100;
    html = `${t('field.minPitch', { angle: def('fixed.maxShadingAngleDeg', 35), pitch: fmt(v, 2) })} <button class="linkbtn" data-pitch="${v}">${t('field.useMin')}</button>`;
  } else if (preset && preset.minPitch) {
    html = `${t('field.presetMinPitch', { id: preset.id, pitch: fmt(preset.minPitch, 2) })} <button class="linkbtn" data-pitch="${preset.minPitch}">${t('field.useMin')}</button>`;
  }
  el.innerHTML = html;
}

// ── results ──
function renderResults(r) {
  const k = $('kpis'), w = $('warns');
  if (!r || r.tables === undefined) {
    const a = r && r.area;
    k.innerHTML = a && a.siteArea
      ? kpi('res.siteArea', `${fmt(a.siteArea / 1e4, 2)} ha`) + kpi('res.buildable', `${fmt((a.buildableArea || 0) / 1e4, 2)} ha`)
      : `<div class="hint" style="grid-column:1/-1">${t('res.none')}</div>`;
    w.innerHTML = (r && r.warns || []).map(x => `<div class="warn">${x}</div>`).join('');
    return;
  }
  const y = store.project.specificYield;
  k.innerHTML =
    `<div class="kpi big"><div class="v">${fmt(r.dcMWp, 2)} MWp</div><div class="k">${t('res.dc')} · ${escapeHtml(moduleLabel(r.module))}</div></div>` +
    kpi('res.tables', fmt(r.tables)) + kpi('res.modules', fmt(r.modules)) +
    kpi('res.rows', fmt(r.rows)) + kpi('res.gcr', fmt(r.gcr, 3)) +
    (r.shading != null ? kpi('res.shading', `${fmt(r.shading, 1)}°`) : '') +
    kpi('res.coverage', `${fmt(r.cover * 100, 1)} %`) +
    kpi('res.siteArea', `${fmt(r.siteArea / 1e4, 2)} ha`) + kpi('res.buildable', `${fmt(r.buildableArea / 1e4, 2)} ha`) +
    kpi('res.density', `${fmt(r.dcMWp / (r.siteArea / 1e4), 3)} MWp/ha`) +
    (y > 0 ? kpi('res.energy', `${fmt(r.dcMWp * y, 0)} MWh/yr`) : '');
  w.innerHTML = r.warns.map(x => `<div class="warn">${x}</div>`).join('');
}
const kpi = (key, v) => `<div class="kpi"><div class="v">${v}</div><div class="k">${t(key)}</div></div>`;

// ── optimise the grid position ──
function optimise() {
  const st = setup();
  if (!st.geom) { toast(st.warns[0] || t('res.none'), 'err'); return; }
  const f = store.project.field;
  const step = st.geom.tableLength + f.tableGap;
  const base = fillRows(st.rings, st.opt).tables.length;
  let best = { n: base, row: f.rowOffset, col: f.columnOffset };
  const NR = 12, NC = 12;
  for (let i = 0; i < NR; i++) for (let j = 0; j < NC; j++) {
    const row = +(f.pitch * i / NR).toFixed(3), col = +(step * j / NC).toFixed(3);
    const n = fillRows(st.rings, { ...st.opt, rowOffset: row, columnOffset: col, maxTables: undefined }).tables.length;
    if (n > best.n) best = { n, row, col };
  }
  change('field', p => { p.field.rowOffset = best.row; p.field.columnOffset = best.col; });
  const gain = best.n - base;
  $('fOptHint').textContent = t('field.optimised', { tables: fmt(best.n), gain: gain > 0 ? `+${gain}` : '±0' });
}

function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
