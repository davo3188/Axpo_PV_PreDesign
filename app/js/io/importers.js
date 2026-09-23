// Imports: Geoportale projects (.axpo) and GeoJSON. Each object gets a role: site, exclusion or reference.
import { t } from '../i18n.js';
import { isPolygonal } from '../geo/convert.js';

const JSZIP_URL = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm';

// Geoportale drawing categories (from the IT Sites Notes domains) that mean "do not build here"
const EXCLUSION_CATEGORIES = /vincol|pendenze alte|\bdpa\b|edifici|vegetazione|idrografia|elettrodotto|gasdott|acquedott|ferrovia|viabilit|beni interesse|costruzioni|manufatti|alberi/i;
const SITE_CATEGORIES = /perimetro netto/i;

export function roleForAxpo(attrs, geometry) {
  const cat = String(attrs.categoria || '');
  if (SITE_CATEGORIES.test(cat) && isPolygonal(geometry)) return 'site';
  if (EXCLUSION_CATEGORIES.test(cat)) return 'exclusion';
  return 'reference';
}

export async function readAxpo(file) {
  const JSZip = (await import(JSZIP_URL)).default;
  let zip;
  try { zip = await JSZip.loadAsync(file); } catch { throw new Error(t('err.axpoNotProject')); }
  const pj = zip.file('progetto.json');
  if (!pj) throw new Error(t('err.axpoNotProject'));
  const st = JSON.parse(await pj.async('text'));
  if (!st || st.formato !== 'geoportale-axpo-progetto') throw new Error(t('err.axpoNotProject'));
  const features = [];
  for (const rec of st.toolGeoms || []) {
    const a = rec.a || {}, g = rec.g;
    if (!g) continue;
    const name = a.nome || a.categoria || ({ drawing: 'Drawing', buffer: 'Buffer', import: 'Imported' })[a._kind] || 'Object';
    features.push({ name: String(name), category: a.categoria || '', kind: a._kind || '', geometry: g, role: roleForAxpo(a, g), source: 'axpo' });
  }
  for (const p of st.parcels || []) {
    if (!p.geometry) continue;
    const name = `Parcel ${p.comune || ''} ${p.foglio ?? ''}/${p.particella ?? ''}`.replace(/\s+/g, ' ').trim();
    features.push({ name, category: 'parcel', kind: 'parcel', geometry: p.geometry, role: 'reference', source: 'axpo' });
  }
  if (!features.length) throw new Error(t('err.noFeatures'));
  return { name: st.nome || file.name.replace(/\.axpo$/i, ''), features };
}

export async function readGeoJSON(file) {
  const gj = JSON.parse(await file.text());
  const feats = gj.type === 'FeatureCollection' ? gj.features : gj.type === 'Feature' ? [gj] : [{ type: 'Feature', geometry: gj, properties: {} }];
  const features = [];
  for (const f of feats) {
    if (!f || !f.geometry) continue;
    const p = f.properties || {};
    const name = p.name || p.nome || p.Name || p.NAME || p.title || p.id || 'Object';
    const role = p.role && ['site', 'exclusion', 'reference'].includes(p.role) ? p.role : (isPolygonal(f.geometry) ? 'site' : 'reference');
    features.push({ name: String(name), category: p.categoria || p.category || '', kind: 'geojson', geometry: f.geometry, role, source: 'geojson' });
  }
  if (!features.length) throw new Error(t('err.noFeatures'));
  return { name: file.name.replace(/\.(geo)?json$/i, ''), features };
}

export async function readAnyFile(file) {
  const n = file.name.toLowerCase();
  if (n.endsWith('.axpo')) return { type: 'axpo', ...(await readAxpo(file)) };
  if (n.endsWith('.geojson') || n.endsWith('.json')) return { type: 'geojson', ...(await readGeoJSON(file)) };
  throw new Error(t('err.unsupported'));
}
