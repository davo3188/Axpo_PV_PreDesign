// GeoJSON (WGS84) <-> ArcGIS SDK geometries.
import { getSdk } from '../sdk.js';

export function isPolygonal(g) { return !!g && (g.type === 'Polygon' || g.type === 'MultiPolygon'); }
export function isLinear(g) { return !!g && (g.type === 'LineString' || g.type === 'MultiLineString'); }
export function isPuntual(g) { return !!g && (g.type === 'Point' || g.type === 'MultiPoint'); }

// GeoJSON geometry -> SDK geometry in WGS84 (null for unsupported types)
export function toSdk(g) {
  const { Polygon, Polyline, Point, SpatialReference } = getSdk();
  const sr = SpatialReference.WGS84;
  if (!g) return null;
  const xy = c => [c[0], c[1]];
  switch (g.type) {
    case 'Polygon': return new Polygon({ rings: g.coordinates.map(r => r.map(xy)), spatialReference: sr });
    case 'MultiPolygon': return new Polygon({ rings: g.coordinates.flatMap(p => p.map(r => r.map(xy))), spatialReference: sr });
    case 'LineString': return new Polyline({ paths: [g.coordinates.map(xy)], spatialReference: sr });
    case 'MultiLineString': return new Polyline({ paths: g.coordinates.map(l => l.map(xy)), spatialReference: sr });
    case 'Point': return new Point({ x: g.coordinates[0], y: g.coordinates[1], spatialReference: sr });
    case 'MultiPoint': return g.coordinates.length ? new Point({ x: g.coordinates[0][0], y: g.coordinates[0][1], spatialReference: sr }) : null;
    default: return null;
  }
}

// SDK geometry (any SR) -> GeoJSON geometry in WGS84
export function toGeoJSON(geom) {
  const { projectOperator, SpatialReference } = getSdk();
  if (!geom) return null;
  const g = geom.spatialReference && geom.spatialReference.isWGS84 ? geom : projectOperator.execute(geom, SpatialReference.WGS84);
  if (!g) return null;
  const r6 = c => [+c[0].toFixed(9), +c[1].toFixed(9)];
  if (g.type === 'polygon') {
    // group rings into polygons: a ring is a hole of the smallest ring that contains it (even-odd nesting)
    const rings = g.rings.map(r => r.map(r6));
    const polys = nestRings(rings);
    return polys.length === 1 ? { type: 'Polygon', coordinates: polys[0] } : { type: 'MultiPolygon', coordinates: polys };
  }
  if (g.type === 'polyline') return g.paths.length === 1 ? { type: 'LineString', coordinates: g.paths[0].map(r6) } : { type: 'MultiLineString', coordinates: g.paths.map(p => p.map(r6)) };
  if (g.type === 'point') return { type: 'Point', coordinates: [g.x, g.y] };
  return null;
}

function ringArea(r) { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += r[j][0] * r[i][1] - r[i][0] * r[j][1]; return s / 2; }
function pointIn([x, y], r) {
  let ins = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if ((yi > y) !== (yj > y) && x < xi + (y - yi) * (xj - xi) / (yj - yi)) ins = !ins;
  }
  return ins;
}
// RFC 7946: exterior rings counter-clockwise, holes clockwise
function nestRings(rings) {
  const info = rings.map((r, i) => ({ r, i, a: Math.abs(ringArea(r)) })).sort((p, q) => q.a - p.a);
  const depth = new Map(), parent = new Map();
  for (const cur of info) {
    let par = null;
    for (const cand of info) {
      if (cand === cur || cand.a <= cur.a) continue;
      if (pointIn(cur.r[0], cand.r) && (!par || cand.a < par.a)) par = cand;
    }
    parent.set(cur, par);
    depth.set(cur, par ? depth.get(par) + 1 : 0);
  }
  const polys = [];
  const index = new Map();
  for (const cur of info) {
    const d = depth.get(cur);
    const ccw = ringArea(cur.r) > 0;
    if (d % 2 === 0) {
      index.set(cur, polys.length);
      polys.push([ccw ? cur.r : [...cur.r].reverse()]);
    } else {
      polys[index.get(parent.get(cur))].push(ccw ? [...cur.r].reverse() : cur.r);
    }
  }
  return polys;
}
