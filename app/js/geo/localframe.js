// Local metric frame: a Transverse Mercator projection centred on the site with scale factor 1.
// Within a few kilometres of the centre the scale error is below 1e-7, so distances and areas computed in it
// are true ground metres. Web Mercator must never be used for measurements (0.15-0.17% error at 45 deg).
import { getSdk } from '../sdk.js';

export function localFrameWkt(lon0, lat0) {
  return 'PROJCS["PV Predesign local TM",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",' +
    'SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],' +
    'PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",0.0],PARAMETER["False_Northing",0.0],' +
    `PARAMETER["Central_Meridian",${lon0}],PARAMETER["Scale_Factor",1.0],PARAMETER["Latitude_Of_Origin",${lat0}],` +
    'UNIT["Meter",1.0]]';
}

// frame = { lon0, lat0 } as stored in the project; returns helpers bound to it.
export function makeLocalFrame({ lon0, lat0 }) {
  const { SpatialReference, projectOperator } = getSdk();
  const sr = new SpatialReference({ wkt: localFrameWkt(lon0, lat0) });
  return {
    lon0, lat0, sr,
    toLocal: g => projectOperator.execute(g, sr),
    toLocalMany: gs => projectOperator.executeMany(gs, sr),
    toSr: (g, target) => projectOperator.execute(g, target),
    toSrMany: (gs, target) => projectOperator.executeMany(gs, target),
  };
}

// Plain rings ([[x, y], ...]) of a local polygon, and back.
export function ringsOf(polygon) {
  return polygon && polygon.rings ? polygon.rings.map(r => r.map(p => [p[0], p[1]])) : [];
}
export function polygonFrom(rings, sr) {
  const { Polygon } = getSdk();
  return new Polygon({ rings, spatialReference: sr });
}
