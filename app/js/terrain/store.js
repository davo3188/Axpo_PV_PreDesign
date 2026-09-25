// The terrain grid of the open project: kept in memory, in this browser (IndexedDB: too large for the autosave in
// localStorage) and in the project file (terrain/grid.f32, written by io/projectfile.js). The project itself holds
// only the description of the grid (project.terrain.grid: id, frame, cell, size, source).
const DB_NAME = globalThis.__PVP_TEST__ ? 'pvp-test' : 'pvp';
const STORE = 'terrain';

export const terrainData = { meta: null, z: null };

export function setTerrainData(meta, z) {
  terrainData.meta = meta || null;
  terrainData.z = meta && z ? z : null;
}

function db() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no IndexedDB')); return; }
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode), s = t.objectStore(STORE);
    let out;
    Promise.resolve(fn(s)).then(v => { out = v; });
    t.oncomplete = () => { d.close(); resolve(out); };
    t.onerror = () => { d.close(); reject(t.error); };
  });
}

// keeps one grid only: the one of the project being worked on
export async function saveLocal(meta, z) {
  try { await tx('readwrite', s => { s.clear(); s.put({ id: meta.id, meta, z: z.buffer.slice(0) }); }); return true; }
  catch (e) { console.warn('[terrain] not kept in this browser', e); return false; }
}
export async function loadLocal(id) {
  try {
    const rec = await tx('readonly', s => new Promise(res => { const r = s.get(id); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); }));
    return rec ? new Float32Array(rec.z) : null;
  } catch (e) { console.warn('[terrain] browser storage unreadable', e); return null; }
}
export async function clearLocal() {
  try { await tx('readwrite', s => { s.clear(); }); } catch {}
}
