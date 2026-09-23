// Site: boundaries, exclusions and reference objects; drawing; buildable area in the local frame.
import { getSdk } from './sdk.js';
import { store, change, on, uid } from './state.js';
import { t, fmt } from './i18n.js';
import { toSdk, toGeoJSON, isPolygonal } from './geo/convert.js';
import { makeLocalFrame } from './geo/localframe.js';

const ROLE_COLOURS = { site: [255, 140, 26], exclusion: [229, 72, 77], reference: [123, 138, 153] };
let view, featLayer, sketchLayer, sketchVM, drawRole = null;

export function initSite(mapView) {
  view = mapView;
  const { GraphicsLayer, SketchViewModel } = getSdk();
  featLayer = new GraphicsLayer({ title: 'Site' });
  sketchLayer = new GraphicsLayer({ title: 'Sketch', listMode: 'hide' });
  view.map.addMany([featLayer, sketchLayer]);
  sketchVM = new SketchViewModel({
    view, layer: sketchLayer, updateOnGraphicClick: false,
    polygonSymbol: { type: 'simple-fill', color: [255, 140, 26, 0.12], outline: { color: [255, 140, 26], width: 2 } },
  });
  try {
    sketchVM.snappingOptions = { enabled: true, selfEnabled: true, featureEnabled: true, featureSources: [{ layer: featLayer, enabled: true }] };
    sketchVM.tooltipOptions = { enabled: true, inputEnabled: true };
    sketchVM.labelOptions = { enabled: true };
  } catch (e) { console.warn('[site] sketch options', e); }
  sketchVM.on('create', e => {
    if (e.state === 'complete') finishDraw(e.graphic);
    else if (e.state === 'cancel') endDraw();
  });

  document.getElementById('drawSite').onclick = () => startDraw('site');
  document.getElementById('drawExcl').onclick = () => startDraw('exclusion');
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawRole) { sketchVM.cancel(); endDraw(); } });

  const list = document.getElementById('featList');
  list.onchange = e => {
    const sel = e.target.closest('select[data-id]');
    if (sel) change('site', p => { const f = p.features.find(x => x.id === sel.dataset.id); if (f) f.role = sel.value; });
  };
  list.onclick = e => {
    const del = e.target.closest('button[data-del]');
    if (del) { change('site', p => { p.features = p.features.filter(x => x.id !== del.dataset.del); }); return; }
    const zoom = e.target.closest('[data-zoom]');
    if (zoom) zoomToFeatures([zoom.dataset.zoom]);
  };

  const setback = document.getElementById('setback'), buf = document.getElementById('exclBuffer');
  const syncInputs = () => { setback.value = store.project.settings.siteSetback; buf.value = store.project.settings.exclusionBuffer; };
  syncInputs();
  setback.onchange = () => change('settings', p => { p.settings.siteSetback = Math.max(0, +setback.value || 0); });
  buf.onchange = () => change('settings', p => { p.settings.exclusionBuffer = Math.max(0, +buf.value || 0); });

  on('site', renderFeatures);
  on('project', () => { syncInputs(); renderFeatures(); });
  renderFeatures();
}

function startDraw(role) {
  if (drawRole === role) { sketchVM.cancel(); endDraw(); return; }
  if (drawRole) sketchVM.cancel();
  drawRole = role;
  sketchVM.create('polygon', { mode: 'click' });
  document.getElementById('drawSite').classList.toggle('active', role === 'site');
  document.getElementById('drawExcl').classList.toggle('active', role === 'exclusion');
  const b = document.getElementById('banner');
  b.innerHTML = t('site.drawBanner'); b.hidden = false;
}
function endDraw() {
  drawRole = null;
  document.getElementById('drawSite').classList.remove('active');
  document.getElementById('drawExcl').classList.remove('active');
  document.getElementById('banner').hidden = true;
}
function finishDraw(graphic) {
  const role = drawRole;
  sketchLayer.remove(graphic);
  const geometry = toGeoJSON(graphic.geometry);
  if (geometry && role) {
    const n = store.project.features.filter(f => f.role === role).length + 1;
    addFeatures([{ name: `${t(role === 'site' ? 'site.drawnSite' : 'site.drawnExcl')} ${n}`, role, geometry, source: 'drawn', category: '' }]);
  }
  endDraw();
}

export function addFeatures(list) {
  change('site', p => { for (const f of list) p.features.push({ id: uid(), ...f }); });
}

function symbolFor(f) {
  const c = ROLE_COLOURS[f.role] || ROLE_COLOURS.reference;
  const g = f.geometry;
  if (isPolygonal(g)) {
    return { type: 'simple-fill', color: [...c, f.role === 'exclusion' ? 0.28 : f.role === 'site' ? 0.06 : 0.04],
      outline: { color: c, width: f.role === 'reference' ? 1 : 2, style: f.role === 'reference' ? 'dash' : 'solid' } };
  }
  if (g.type === 'LineString' || g.type === 'MultiLineString') return { type: 'simple-line', color: c, width: 2.5 };
  return { type: 'simple-marker', color: c, size: 8, outline: { color: [255, 255, 255], width: 1 } };
}

export function renderFeatures() {
  const { Graphic } = getSdk();
  featLayer.removeAll();
  const order = { reference: 0, site: 1, exclusion: 2 };
  const feats = [...store.project.features].sort((a, b) => order[a.role] - order[b.role]);
  featLayer.addMany(feats.map(f => {
    const geometry = toSdk(f.geometry);
    return geometry ? new Graphic({ geometry, symbol: symbolFor(f), attributes: { id: f.id } }) : null;
  }).filter(Boolean));

  const list = document.getElementById('featList');
  list.innerHTML = '';
  for (const f of store.project.features) {
    const row = document.createElement('div');
    row.className = 'it';
    const c = ROLE_COLOURS[f.role] || ROLE_COLOURS.reference;
    row.innerHTML = `<span class="sw" style="background:rgb(${c.join(',')})"></span><span class="nm" data-zoom="${f.id}" title="${t('site.zoom')}" style="cursor:pointer"></span>
      <select data-id="${f.id}" aria-label="Role">${['site', 'exclusion', 'reference'].map(r => `<option value="${r}" ${f.role === r ? 'selected' : ''}>${t('role.' + r)}</option>`).join('')}</select>
      <button class="x" data-del="${f.id}" title="${t('site.remove')}" aria-label="${t('site.remove')}">×</button>`;
    const nm = row.querySelector('.nm');
    nm.textContent = f.name;
    if (f.category && f.category !== f.name) { const s = document.createElement('small'); s.textContent = f.category; nm.appendChild(s); }
    list.appendChild(row);
  }
  const n = store.project.features.filter(f => f.role === 'site').length;
  document.getElementById('siteCnt').textContent = n || '';
}

export function zoomToFeatures(ids) {
  const feats = store.project.features.filter(f => !ids || ids.includes(f.id));
  const geoms = feats.map(f => toSdk(f.geometry)).filter(Boolean);
  if (!geoms.length) return;
  let ext = null;
  for (const g of geoms) {
    const e = g.extent || (g.type === 'point' ? { xmin: g.x, ymin: g.y, xmax: g.x, ymax: g.y } : null);
    if (!e) continue;
    ext = ext ? ext.clone().union(e) : (e.clone ? e.clone() : null);
  }
  if (ext) view.goTo(ext.expand ? ext.expand(1.3) : ext).catch(() => {});
}

// Local frame centred on the site polygons (true metres around the site; north = true north at the centre)
export function siteFrame() {
  const sites = store.project.features.filter(f => f.role === 'site' && isPolygonal(f.geometry));
  if (!sites.length) return null;
  let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;
  for (const f of sites) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const p of polys) for (const r of p) for (const [x, y] of r) {
      if (x < xmin) xmin = x; if (x > xmax) xmax = x; if (y < ymin) ymin = y; if (y > ymax) ymax = y;
    }
  }
  const lon0 = +((xmin + xmax) / 2).toFixed(7), lat0 = +((ymin + ymax) / 2).toFixed(7);
  return makeLocalFrame({ lon0, lat0 });
}

// Buildable area in the local frame: union of the sites, minus the setback, minus the (buffered) exclusions.
export function computeArea(frame) {
  const { unionOperator, differenceOperator, bufferOperator, simplifyOperator, areaOperator } = getSdk();
  const s = store.project.settings;
  const toLocal = f => {
    const g = toSdk(f.geometry);
    const l = g && frame.toLocal(g);
    return l ? simplifyOperator.execute(l) : null;
  };
  const sites = store.project.features.filter(f => f.role === 'site' && isPolygonal(f.geometry)).map(toLocal).filter(Boolean);
  if (!sites.length) return { error: 'noSite' };
  const site = sites.length > 1 ? unionOperator.executeMany(sites) : sites[0];
  const siteArea = areaOperator.execute(site);
  let buildable = s.siteSetback > 0 ? bufferOperator.execute(site, -s.siteSetback) : site;
  let ignored = 0;
  const cuts = [];
  for (const f of store.project.features.filter(f => f.role === 'exclusion')) {
    const l = toLocal(f);
    if (!l) continue;
    if (l.type === 'polygon') cuts.push(s.exclusionBuffer > 0 ? bufferOperator.execute(l, s.exclusionBuffer) : l);
    else if (s.exclusionBuffer > 0) cuts.push(bufferOperator.execute(l, s.exclusionBuffer));
    else ignored++;
  }
  if (buildable && cuts.length) buildable = differenceOperator.execute(buildable, cuts.length > 1 ? unionOperator.executeMany(cuts) : cuts[0]);
  const buildableArea = buildable && buildable.rings && buildable.rings.length ? areaOperator.execute(buildable) : 0;
  return { site, siteArea, buildable: buildableArea > 0 ? buildable : null, buildableArea, ignored };
}
