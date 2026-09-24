// Single entry point to the ArcGIS Maps SDK for JavaScript.
// 4.34 is loaded from the CDN in index.html; modules come through $arcgis.import(), the same mechanism as
// in 5.x, so a later migration only touches this file and the few widget calls.

const MODULES = {
  Map: '@arcgis/core/Map.js',
  MapView: '@arcgis/core/views/MapView.js',
  Graphic: '@arcgis/core/Graphic.js',
  GraphicsLayer: '@arcgis/core/layers/GraphicsLayer.js',
  Point: '@arcgis/core/geometry/Point.js',
  Polyline: '@arcgis/core/geometry/Polyline.js',
  Polygon: '@arcgis/core/geometry/Polygon.js',
  Extent: '@arcgis/core/geometry/Extent.js',
  SpatialReference: '@arcgis/core/geometry/SpatialReference.js',
  SketchViewModel: '@arcgis/core/widgets/Sketch/SketchViewModel.js',
  ScaleBar: '@arcgis/core/widgets/ScaleBar.js',
  BasemapToggle: '@arcgis/core/widgets/BasemapToggle.js',
  reactiveUtils: '@arcgis/core/core/reactiveUtils.js',
  projectOperator: '@arcgis/core/geometry/operators/projectOperator.js',
  unionOperator: '@arcgis/core/geometry/operators/unionOperator.js',
  differenceOperator: '@arcgis/core/geometry/operators/differenceOperator.js',
  bufferOperator: '@arcgis/core/geometry/operators/bufferOperator.js',
  simplifyOperator: '@arcgis/core/geometry/operators/simplifyOperator.js',
  areaOperator: '@arcgis/core/geometry/operators/areaOperator.js',
  geodeticAreaOperator: '@arcgis/core/geometry/operators/geodeticAreaOperator.js',
  geodeticLengthOperator: '@arcgis/core/geometry/operators/geodeticLengthOperator.js',
  centroidOperator: '@arcgis/core/geometry/operators/centroidOperator.js',
};

let sdk = null;

export async function loadSdk() {
  if (sdk) return sdk;
  if (typeof $arcgis === 'undefined' || typeof $arcgis.import !== 'function') {
    throw new Error('ArcGIS Maps SDK not loaded');
  }
  const names = Object.keys(MODULES);
  const mods = await $arcgis.import(names.map(n => MODULES[n]));
  const loaded = Object.fromEntries(names.map((n, i) => [n, mods[i]]));
  await loaded.projectOperator.load();
  for (const op of [loaded.geodeticAreaOperator, loaded.geodeticLengthOperator]) if (typeof op.load === 'function') await op.load();
  sdk = loaded;
  return sdk;
}

export function getSdk() {
  if (!sdk) throw new Error('SDK not loaded yet');
  return sdk;
}
