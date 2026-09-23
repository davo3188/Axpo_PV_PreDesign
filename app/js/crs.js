// National coordinate systems: used for exports and to read files that carry projected coordinates without a
// declared system. The country comes from generalized outlines (catalog/countries.json, Esri World Countries
// Generalized, ~1 km precision): near a border the user is warned and can change the choice. Where the zone
// follows a region rather than the longitude (German Länder), catalog/regions.json holds those regions.

// zoneOf(lon, lat): the system of one point of the site; the system of the site is the one of its centre
export const NATIONAL = {
  IT: {
    name: 'Italy',
    options: [
      [6707, 'RDN2008 / UTM zone 32N'], [6708, 'RDN2008 / UTM zone 33N'], [6709, 'RDN2008 / UTM zone 34N'],
      [25832, 'ETRS89 / UTM zone 32N'], [25833, 'ETRS89 / UTM zone 33N'],
      [3003, 'Monte Mario / Italy zone 1'], [3004, 'Monte Mario / Italy zone 2'],
      [32632, 'WGS 84 / UTM zone 32N'], [32633, 'WGS 84 / UTM zone 33N'],
    ],
    // zone 32 west of 12° E, 33 east of it; zone 34 is not proposed (Salento is worked in zone 33)
    zoneOf: lon => (lon < 12 ? 6707 : 6708),
  },
  FR: {
    name: 'France',
    options: [[2154, 'RGF93 v1 / Lambert-93'], ...[42, 43, 44, 45, 46, 47, 48, 49, 50].map(z => [3900 + z, `RGF93 v1 / CC${z}`])],
    zoneOf: () => 2154,
  },
  ES: {
    name: 'Spain',
    options: [[25829, 'ETRS89 / UTM zone 29N'], [25830, 'ETRS89 / UTM zone 30N'], [25831, 'ETRS89 / UTM zone 31N'],
      [4083, 'REGCAN95 / UTM zone 28N']],
    // Canary Islands: REGCAN95 / UTM 28N
    zoneOf: lon => (lon < -12 ? 4083 : lon < -6 ? 25829 : lon < 0 ? 25830 : 25831),
  },
  DE: {
    name: 'Germany',
    options: [[25832, 'ETRS89 / UTM zone 32N'], [25833, 'ETRS89 / UTM zone 33N'],
      [31466, 'DHDN / 3-degree Gauss-Kruger zone 2'], [31467, 'DHDN / 3-degree Gauss-Kruger zone 3'],
      [31468, 'DHDN / 3-degree Gauss-Kruger zone 4'], [31469, 'DHDN / 3-degree Gauss-Kruger zone 5']],
    // the UTM zone follows the Land: 33 in Berlin, Brandenburg, Mecklenburg-Vorpommern and Saxony, 32 elsewhere
    // (Bavaria included, even east of 12° E)
    zoneOf: (lon, lat) => regionAt(lon, lat)?.wkid || 25832,
  },
  PL: {
    name: 'Poland',
    options: [[2180, 'ETRF2000-PL / CS92'], [2176, 'ETRF2000-PL / CS2000/15'], [2177, 'ETRF2000-PL / CS2000/18'],
      [2178, 'ETRF2000-PL / CS2000/21'], [2179, 'ETRF2000-PL / CS2000/24']],
    zoneOf: () => 2180,
  },
  CH: {
    name: 'Switzerland',
    options: [[2056, 'CH1903+ / LV95'], [21781, 'CH1903 / LV03']],
    zoneOf: () => 2056,
  },
};

let countries = null, regions = null;
export async function loadCountries() {
  if (countries) return countries;
  const get = async name => {
    const r = await fetch(new URL(`../catalog/${name}`, import.meta.url));
    if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
    return r.json();
  };
  [countries, regions] = await Promise.all([get('countries.json'), get('regions.json').catch(e => { console.warn('[crs]', e); return null; })]);
  return countries;
}
export function setCountries(fc, rg = null) { countries = fc; regions = rg; }   // tests

// Region with its own system containing a WGS84 point: { iso, code, name, wkid } or null
export function regionAt(lon, lat) {
  if (!regions) return null;
  for (const f of regions.features) if (inGeometry([lon, lat], f.geometry)) return f.properties;
  return null;
}

function inRing([x, y], ring) {
  let ins = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < xi + (y - yi) * (xj - xi) / (yj - yi)) ins = !ins;
  }
  return ins;
}
function inGeometry(p, g) {
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  return polys.some(poly => poly.reduce((ins, ring) => (inRing(p, ring) ? !ins : ins), false));
}

// ISO code of the country containing a WGS84 point, or null
export function countryAt(lon, lat) {
  if (!countries) return null;
  for (const f of countries.features) if (inGeometry([lon, lat], f.geometry)) return f.properties.iso;
  return null;
}
export function countryName(iso) {
  if (!iso) return 'unknown';
  if (NATIONAL[iso]) return NATIONAL[iso].name;
  const f = countries?.features.find(x => x.properties.iso === iso);
  return f ? f.properties.name : iso;
}

export function utmZone(lon) { return Math.floor((lon + 180) / 6) + 1; }

export function allOptions() {
  const out = [];
  for (const [iso, n] of Object.entries(NATIONAL)) for (const [wkid, label] of n.options) out.push({ iso, country: n.name, wkid, label });
  return out;
}
export function crsLabel(wkid) {
  if (!wkid) return '—';
  const o = allOptions().find(x => x.wkid === wkid);
  if (o) return o.label;
  if (wkid > 32600 && wkid < 32661) return `WGS 84 / UTM zone ${wkid - 32600}N`;
  if (wkid === 4326) return 'WGS 84 (longitude, latitude)';
  return `EPSG:${wkid}`;
}

// Suggest a system for a site. pts: sample of WGS84 [lon, lat] points of the site (vertices).
// Returns { wkid, iso, alerts: [{ key, vars, level }] } — alert keys are i18n keys, level 'info' or 'warn'.
export function suggestCrs(pts) {
  const alerts = [];
  if (!pts.length) return { wkid: null, iso: null, alerts };
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  for (const [x, y] of pts) { if (x < xmin) xmin = x; if (x > xmax) xmax = x; if (y < ymin) ymin = y; if (y > ymax) ymax = y; }
  const cx = (xmin + xmax) / 2, cy = (ymin + ymax) / 2;
  const iso = countryAt(cx, cy);
  const isos = new Set(pts.map(([x, y]) => countryAt(x, y)).filter(Boolean));
  if (iso) isos.add(iso);
  if (isos.size > 1) alerts.push({ key: 'crs.border', vars: { list: [...isos].map(countryName).join(', ') }, level: 'warn' });
  const nat = iso && NATIONAL[iso];
  let wkid;
  if (nat) {
    wkid = nat.zoneOf(cx, cy);
    const zs = new Set([wkid, ...pts.map(([x, y]) => nat.zoneOf(x, y))]);
    if (zs.size > 1) alerts.push({ key: 'crs.twoZones', vars: { list: [...zs].map(crsLabel).join(' / ') }, level: 'warn' });
    if (iso === 'DE') {
      const rg = regionAt(cx, cy);
      alerts.push({ key: rg ? 'crs.deLand33' : 'crs.deLand32', vars: { land: rg ? rg.name : '' }, level: 'info' });
    }
    if (iso === 'IT' && cx >= 11 && cx < 13) alerts.push({ key: 'crs.itBand', vars: {}, level: 'info' });
    if (iso === 'PL') {
      const cs2000 = cx < 16.5 ? 2176 : cx < 19.5 ? 2177 : cx < 22.5 ? 2178 : 2179;
      alerts.push({ key: 'crs.plCs2000', vars: { label: crsLabel(cs2000), wkid: cs2000 }, level: 'info' });
    }
  } else {
    wkid = 32600 + utmZone(cx);
    alerts.push({ key: 'crs.noProfile', vars: { country: countryName(iso), label: crsLabel(wkid) }, level: 'warn' });
  }
  alerts.unshift({ key: 'crs.auto', vars: { label: crsLabel(wkid), wkid, country: countryName(iso) }, level: 'info' });
  return { wkid, iso, alerts };
}

// Files with projected coordinates and no declared system: which national systems place them in their own
// country? project(wkid, [x, y]) -> [lon, lat] | null is injected (it needs the SDK projection engine).
export function candidatesForProjected(xy, project) {
  const out = [];
  for (const o of allOptions()) {
    let hits = 0;
    for (const p of xy) {
      const ll = project(o.wkid, p);
      if (ll && isFinite(ll[0]) && countryAt(ll[0], ll[1]) === o.iso) hits++;
    }
    if (hits === xy.length && xy.length) out.push(o);
  }
  return out;
}

// Coordinates that cannot be longitude / latitude
export function looksProjected(xy) {
  return xy.some(([x, y]) => Math.abs(x) > 180 || Math.abs(y) > 90);
}
