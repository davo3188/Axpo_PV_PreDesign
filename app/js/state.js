// Project state, autosave in this browser and a tiny publish/subscribe.
// The project holds parameters and inputs only; the layout is always regenerated from them (parametric).

const PROJECT_KEY = 'pvp.project.v1';
export const PROJECT_FORMAT = 'pv-predesign-project';

export function defaultProject() {
  return {
    format: PROJECT_FORMAT,
    version: 1,
    name: 'Untitled project',
    frame: null,              // { lon0, lat0 }: centre of the local metric frame, fixed with the first site
    features: [],             // { id, name, role: site|exclusion|reference, geometry: GeoJSON WGS84, source, category }
    settings: { siteSetback: 0, exclusionBuffer: 0 },
    plannedModules: [],       // ids from the module library
    field: {
      technology: 'ground-fixed',
      structure: '2V13',
      moduleId: null,
      tiltDeg: 15,
      azimuthDeg: 180,
      pitch: null,
      tableGap: 0.30,
      moduleGap: 0.02,
      tracks: { enabled: false, spacing: 100, width: 4 },
      targetMWp: null,
      rowOffset: 0,
      columnOffset: 0,
    },
    specificYield: null,
  };
}

export const store = { project: loadProject() };

function loadProject() {
  try {
    const p = JSON.parse(localStorage.getItem(PROJECT_KEY) || 'null');
    if (p && p.format === PROJECT_FORMAT) return withDefaults(p);
  } catch (e) { console.warn('[state] autosave unreadable', e); }
  return defaultProject();
}

// fill fields added in later versions
function withDefaults(p) {
  const d = defaultProject();
  return {
    ...d, ...p,
    settings: { ...d.settings, ...(p.settings || {}) },
    field: { ...d.field, ...(p.field || {}), tracks: { ...d.field.tracks, ...((p.field || {}).tracks || {}) } },
  };
}

let saveTimer = 0;
export function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(PROJECT_KEY, JSON.stringify(store.project)); }
    catch (e) { console.warn('[state] autosave failed (browser storage full?)', e); }
  }, 400);
}

export function replaceProject(p) {
  store.project = withDefaults(p);
  saveSoon();
  emit('project');
}

// change(topic, fn): mutate the project, autosave, notify
export function change(topic, fn) {
  fn(store.project);
  saveSoon();
  emit(topic);
}

const listeners = new Map();
export function on(topic, fn) {
  if (!listeners.has(topic)) listeners.set(topic, new Set());
  listeners.get(topic).add(fn);
}
export function emit(topic) {
  for (const t of [topic, '*']) (listeners.get(t) || []).forEach(fn => { try { fn(topic); } catch (e) { console.error(e); } });
}

export const uid = () => Math.random().toString(36).slice(2, 10);
