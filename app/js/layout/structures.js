// Structure notation and table geometry. Pure functions: metres and degrees, no SDK.
//
// Notation "<across><V|H><along>", as in the Design ESQ toolkit: 2V13 = 2 modules in portrait across the
// table (up the slope) and 13 modules along it. V = portrait (module long side up the slope), H = landscape.
// Accepted spellings: "2V13", "2v13", "2V/13", "2 V 13"; P and L are read as V and H.

export function parseNotation(text) {
  const m = /^\s*(\d+)\s*([VHPL])\s*\/?\s*(\d+)\s*$/i.exec(String(text ?? ''));
  if (!m) return null;
  const across = Number(m[1]), along = Number(m[3]);
  if (!(across > 0 && along > 0)) return null;
  let orientation = m[2].toUpperCase();
  if (orientation === 'P') orientation = 'V';
  if (orientation === 'L') orientation = 'H';
  return { across, along, orientation, notation: `${across}${orientation}${along}` };
}

// Table geometry from a structure, a module and the tilt.
// module: { length, width } in metres (long side, short side). extraLength: length added along the table that
// is not modules (the drive / motor gap of a tracker, 1.19 m on the 1V27 of the IT toolkit).
// Returns lengths along the row (tableLength), up the slope (slopeDepth), in plan (planDepth) and the rise
// between low and high edge.
export function tableGeometry({ notation, module, moduleGap = 0.02, tiltDeg = 0, extraLength = 0 }) {
  const s = typeof notation === 'string' ? parseNotation(notation) : notation;
  if (!s) throw new Error(`Unknown structure notation: ${notation}`);
  if (!(module && module.length > 0 && module.width > 0)) throw new Error('Module dimensions missing');
  const alongDim = s.orientation === 'V' ? module.width : module.length;
  const acrossDim = s.orientation === 'V' ? module.length : module.width;
  const tableLength = s.along * alongDim + (s.along - 1) * moduleGap + (extraLength || 0);
  const slopeDepth = s.across * acrossDim + (s.across - 1) * moduleGap;
  const t = tiltDeg * Math.PI / 180;
  return {
    ...s,
    moduleGap,
    tiltDeg,
    extraLength: extraLength || 0,
    tableLength,
    slopeDepth,
    planDepth: slopeDepth * Math.cos(t),
    rise: slopeDepth * Math.sin(t),
    modules: s.across * s.along,
  };
}

// Minimum pitch (row-to-row distance, front edge to front edge) so that the next row is not shaded below
// the given angle: pitch = D cos(t) + D sin(t) / tan(alpha). Toolkit: alpha max 35 deg.
export function minPitch(geom, maxShadingAngleDeg = 35) {
  const a = maxShadingAngleDeg * Math.PI / 180;
  return geom.planDepth + geom.rise / Math.tan(a);
}

// Shading angle produced by a given pitch (the angle of the line from the low edge of a row to the high
// edge of the row in front of it). 90 deg when rows touch.
export function shadingAngleDeg(geom, pitch) {
  const gap = pitch - geom.planDepth;
  return gap > 0 ? Math.atan2(geom.rise, gap) * 180 / Math.PI : 90;
}

// Ground coverage ratio: collector width (slope depth) over pitch.
export function gcr(geom, pitch) {
  return geom.slopeDepth / pitch;
}

// Half table of a structure (half strings): the notation given by the catalog preset (1V28 -> 1V14), or null when
// the toolkit defines none. Same modules across, half as many along.
export function halfNotation(preset) {
  const h = preset && preset.half ? parseNotation(preset.half) : null;
  return h || null;
}
