// Toolkit catalog (app/catalog/toolkit.json). The archive behind it is docs/toolkit/ (one file per country).
// Top-level values hold for every country; country values live under countries.<ISO> and are never borrowed by
// another country: a missing rule is reported as missing.
let catalog = null;

export async function loadCatalog() {
  const r = await fetch(new URL('../catalog/toolkit.json', import.meta.url), { cache: 'no-cache' });
  if (!r.ok) throw new Error(`catalog: HTTP ${r.status}`);
  catalog = await r.json();
  return catalog;
}

export function getCatalog() { return catalog; }
export function setCatalog(c) { catalog = c; }   // tests

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
  const v = walk(catalog?.defaults, path);
  if (v && typeof v === 'object' && 'value' in v) return v.value;
  return v ?? fallback;
}

// A value of one country: { value, source, verify, ... } (a plain value is wrapped), or null when that country
// has no such rule. path is dotted, e.g. 'fixed.maxShadingAngleDeg'.
export function countryValue(iso, path) {
  const v = walk(catalog?.countries?.[iso], path);
  if (v == null) return null;
  return typeof v === 'object' && !Array.isArray(v) && 'value' in v ? v : { value: v };
}
export function countryName(iso) { return catalog?.countries?.[iso]?.name || iso || ''; }

// Standard choice of the group for a technology ({ structure, tiltDeg, azimuthDeg, ... }) or null
export function standardFor(technology) { return catalog?.standards?.[technology] || null; }

// Modules of the catalog (the group's standard module with its power roadmap)
export function catalogModules() { return catalog?.modules || []; }

// Slope limit of a structure: the first rule whose technology and number of modules across match, or null.
// { id, maxNS, maxEW, maxAny (percent), source, text }
export function slopeLimitFor(technology, notation) {
  const across = notation && notation.across;
  return (catalog?.slopeLimits || []).find(r => r.applies.technology === technology && (r.applies.across == null || r.applies.across === across)) || null;
}

function walk(o, path) {
  let v = o;
  for (const k of path.split('.')) v = v?.[k];
  return v;
}
