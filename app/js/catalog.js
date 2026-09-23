// Toolkit catalog (app/catalog/toolkit.json), transcribed from the Design ESQ toolkit.
let catalog = null;

export async function loadCatalog() {
  const r = await fetch(new URL('../catalog/toolkit.json', import.meta.url), { cache: 'no-cache' });
  if (!r.ok) throw new Error(`catalog: HTTP ${r.status}`);
  catalog = await r.json();
  return catalog;
}

export function getCatalog() { return catalog; }

export function structurePresets(technology) {
  return (catalog?.structures || []).filter(s => !technology || s.technology === technology);
}

export function presetFor(technology, notation) {
  const n = String(notation || '').toUpperCase().replace(/[\s/]/g, '');
  return structurePresets(technology).find(s => s.id.toUpperCase() === n || s.notation === n) || null;
}

export function rule(id) { return (catalog?.rules || []).find(r => r.id === id) || null; }

// value of a defaults entry ({ value, ... } or a plain number)
export function def(path, fallback) {
  let v = catalog?.defaults;
  for (const k of path.split('.')) v = v?.[k];
  if (v && typeof v === 'object' && 'value' in v) return v.value;
  return v ?? fallback;
}
