// Module library (kept in this browser, shared by all projects) and the modules planned for the project.
// Modules are entered by hand or imported from supplier roadmaps (CSV / Excel).
import { t, fmt } from './i18n.js';
import { store, change, emit, uid } from './state.js';
import { toast } from './ui/toast.js';

const LIB_KEY = 'pvp.modules.v1';
const XLSX_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm';

export const library = { modules: loadLibrary() };

function loadLibrary() {
  try {
    const a = JSON.parse(localStorage.getItem(LIB_KEY) || '[]');
    return Array.isArray(a) ? a.filter(validModule) : [];
  } catch { return []; }
}
function saveLibrary() {
  try { localStorage.setItem(LIB_KEY, JSON.stringify(library.modules)); }
  catch (e) { console.warn('[modules] save failed', e); }
}

export function validModule(m) { return !!m && m.wp > 0 && m.length > 0 && m.width > 0; }
export function moduleById(id) { return library.modules.find(m => m.id === id) || null; }
export function moduleLabel(m) {
  return `${m.manufacturer ? m.manufacturer + ' ' : ''}${m.model || 'Module'} · ${fmt(m.wp)} Wp`;
}

// numbers written as 2382, "2 382", "2,382", "2382 mm" …
export function parseNum(v) {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').trim().replace(/\s/g, '').replace(',', '.');
  const m = /-?\d+(\.\d+)?/.exec(s);
  return m ? Number(m[0]) : NaN;
}
// metres from metres or millimetres (a module side is never over 20 m)
export function toMetres(v) {
  const n = parseNum(v);
  if (!(n > 0)) return NaN;
  return n > 20 ? n / 1000 : n;
}

export function addModule(m) {
  let L = toMetres(m.length), W = toMetres(m.width);
  if (L < W) [L, W] = [W, L];
  const mod = { id: uid(), manufacturer: (m.manufacturer || '').trim(), model: (m.model || '').trim(),
    wp: parseNum(m.wp), length: L, width: W, bifacial: !!m.bifacial, source: m.source || 'manual' };
  if (!validModule(mod)) return null;
  library.modules.push(mod);
  saveLibrary();
  return mod;
}

export function removeModule(id) {
  library.modules = library.modules.filter(m => m.id !== id);
  saveLibrary();
  change('modules', p => {
    p.plannedModules = p.plannedModules.filter(x => x !== id);
    if (p.field.moduleId === id) p.field.moduleId = null;
  });
}

export function setPlanned(id, planned) {
  change('modules', p => {
    const s = new Set(p.plannedModules);
    if (planned) s.add(id); else s.delete(id);
    p.plannedModules = [...s];
  });
}

// ── roadmap import ──
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const COLUMN_PATTERNS = {
  wp: [/\bwp\b/, /\bpmax\b/, /nominal power/, /rated power/, /\bpower\b/, /potenza/, /puissance/, /leistung/, /\bmoc\b/, /\bwatt/],
  length: [/length/, /lunghezza/, /longueur/, /\blange\b/, /laenge/, /\bheight\b/],
  width: [/width/, /larghezza/, /largeur/, /breite/],
  dims: [/dimension/, /\bsize\b/, /formato/, /\bformat\b/, /abmessung/],
  manufacturer: [/manufacturer/, /\bbrand\b/, /\bmaker\b/, /produttore/, /fabricant/, /hersteller/, /supplier/, /fornitore/, /fournisseur/, /vendor/],
  model: [/\bmodel/, /modello/, /modele/, /\bname\b/, /\bnome\b/, /product/, /reference/, /\bref\b/, /\btype\b/, /\bmodule\b/],
  bifacial: [/bifacial/, /bifacc/, /biface/, /bi facial/],
};
const NOT_POWER = /toler|coeff|temp|percent|\bpct\b|\bkwh\b|degrad|voc|isc|vmp|imp/;

export function detectColumns(headers) {
  const col = {};
  const used = new Set();
  for (const key of ['wp', 'length', 'width', 'dims', 'manufacturer', 'bifacial', 'model']) {
    for (const re of COLUMN_PATTERNS[key]) {
      const h = headers.find(h => !used.has(h) && re.test(norm(h)) && !(key === 'wp' && NOT_POWER.test(norm(h))));
      if (h !== undefined) { col[key] = h; used.add(h); break; }
    }
  }
  return col;
}

// rows: arrays of cells (first rows may be titles). Finds the header row, then reads the modules.
export function parseRoadmap(aoa) {
  let h = -1, col = null;
  for (let i = 0; i < Math.min(aoa.length, 30); i++) {
    const headers = aoa[i].map(c => String(c ?? '').trim());
    const c = detectColumns(headers.filter(Boolean));
    if (c.wp && ((c.length && c.width) || c.dims)) { h = i; col = c; break; }
  }
  if (h < 0) return { mods: [], skipped: 0, headers: (aoa[0] || []).map(String).filter(Boolean) };
  const headers = aoa[h].map(c => String(c ?? '').trim());
  const at = (row, name) => name === undefined ? '' : row[headers.indexOf(name)];
  const mods = [];
  let skipped = 0;
  for (const row of aoa.slice(h + 1)) {
    if (!row.some(c => String(c ?? '').trim())) continue;
    let wp = parseNum(at(row, col.wp));
    if (wp > 0 && wp < 10) wp *= 1000;             // kWp
    let L = toMetres(at(row, col.length)), W = toMetres(at(row, col.width));
    if (!(L > 0 && W > 0) && col.dims) {
      const dims = (String(at(row, col.dims)).match(/\d+(?:[.,]\d+)?/g) || []).map(toMetres).filter(x => x > 0.3).sort((a, b) => b - a);
      if (dims.length >= 2) { L = dims[0]; W = dims[1]; }
    }
    if (L < W) [L, W] = [W, L];
    if (!(wp > 0 && L > 0 && W > 0)) { skipped++; continue; }
    const b = norm(at(row, col.bifacial));
    mods.push({
      manufacturer: String(at(row, col.manufacturer) ?? '').trim(),
      model: String(at(row, col.model) ?? '').trim() || `${Math.round(wp)} Wp`,
      wp, length: L, width: W,
      bifacial: /^(y|yes|si|oui|ja|true|1|x|bifacial)/.test(b),
      source: 'roadmap',
    });
  }
  return { mods, skipped, headers: headers.filter(Boolean), col };
}

export async function importRoadmapFile(file) {
  const XLSX = await import(XLSX_URL);
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  let best = null;
  for (const name of wb.SheetNames) {
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: true });
    const res = parseRoadmap(aoa);
    if (!best || res.mods.length > best.mods.length) best = res;
  }
  if (!best || !best.mods.length) {
    toast(t('mod.importNone', { file: file.name, cols: (best?.headers || []).slice(0, 12).join(', ') || '—' }), 'err', 12000);
    return 0;
  }
  const key = m => `${norm(m.manufacturer)}|${norm(m.model)}|${m.wp}`;
  const have = new Set(library.modules.map(key));
  let added = 0;
  for (const m of best.mods) if (!have.has(key(m))) { addModule(m); have.add(key(m)); added++; }
  emit('modules');
  toast(best.skipped ? t('mod.importedSkipped', { n: added, file: file.name, skipped: best.skipped })
    : t('mod.imported', { n: added, file: file.name }), 'ok');
  return added;
}

// ── UI ──
export function initModulesUi() {
  const list = document.getElementById('modList');
  const form = document.getElementById('modForm');
  const input = document.getElementById('fileRoadmap');

  document.getElementById('modAddBtn').onclick = () => { form.hidden = !form.hidden; if (!form.hidden) document.getElementById('mfMan').focus(); };
  document.getElementById('mfCancel').onclick = () => { form.hidden = true; };
  form.onsubmit = e => {
    e.preventDefault();
    const m = addModule({
      manufacturer: document.getElementById('mfMan').value, model: document.getElementById('mfModel').value,
      wp: document.getElementById('mfWp').value, length: document.getElementById('mfLen').value,
      width: document.getElementById('mfWid').value, bifacial: document.getElementById('mfBif').checked,
    });
    if (!m) { toast(t('mod.invalid'), 'err'); return; }
    form.reset(); form.hidden = true;
    setPlanned(m.id, true);   // a module added by hand is meant for this project
  };
  document.getElementById('modImportBtn').onclick = () => input.click();
  input.onchange = async () => {
    const f = input.files && input.files[0]; input.value = '';
    if (!f) return;
    try { await importRoadmapFile(f); }
    catch (e) { console.error(e); toast(t('toast.importFail', { file: f.name, err: e.message || e }), 'err'); }
  };
  list.onchange = e => {
    const cb = e.target.closest('input[type=checkbox][data-id]');
    if (cb) setPlanned(cb.dataset.id, cb.checked);
  };
  list.onclick = e => {
    const x = e.target.closest('button[data-del]');
    if (x) removeModule(x.dataset.del);
  };
  renderModules();
}

export function renderModules() {
  const list = document.getElementById('modList');
  if (!list) return;
  const planned = new Set(store.project.plannedModules);
  const mods = [...library.modules].sort((a, b) => (planned.has(b.id) - planned.has(a.id)) || (a.wp - b.wp));
  list.innerHTML = '';
  for (const m of mods) {
    const row = document.createElement('div');
    row.className = 'it';
    row.innerHTML = `<input type="checkbox" data-id="${m.id}" ${planned.has(m.id) ? 'checked' : ''} title="${t('mod.planned')}" aria-label="${t('mod.planned')}">
      <span class="nm"></span><button class="x" data-del="${m.id}" title="${t('mod.remove')}" aria-label="${t('mod.remove')}">×</button>`;
    const nm = row.querySelector('.nm');
    nm.textContent = moduleLabel(m);
    const sm = document.createElement('small');
    sm.textContent = `${fmt(m.length, 3)} × ${fmt(m.width, 3)} m${m.bifacial ? ' · ' + t('mod.bifacial').toLowerCase() : ''}`;
    nm.appendChild(sm);
    list.appendChild(row);
  }
  const cnt = document.getElementById('modCnt');
  if (cnt) cnt.textContent = planned.size ? `${planned.size} / ${library.modules.length}` : (library.modules.length || '');
}
