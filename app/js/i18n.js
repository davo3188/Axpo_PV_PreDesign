// All user-visible text. English only for now; other languages can be added as further dictionaries.
const EN = {
  'app.subtitle': 'ground-mounted & agrivoltaic',
  'top.import': '⬆ Import…',
  'top.importTitle': 'Import a Geoportale project (.axpo) or GeoJSON',
  'top.export': '⬇ Export GeoJSON',
  'top.exportTitle': 'Export site, buildable area and tables as GeoJSON (WGS84)',
  'top.new': 'New project',
  'top.theme': 'Light / dark theme',
  'top.projName': 'Project name',

  'site.title': 'Site',
  'site.sub': 'Boundaries and exclusions',
  'site.drawSite': '▱ Draw site boundary',
  'site.drawExcl': '⛔ Draw exclusion',
  'site.empty': 'No site yet: draw a boundary or import a .axpo / GeoJSON file.',
  'site.setback': 'Setback from boundary (m)',
  'site.exclBuffer': 'Buffer around exclusions (m)',
  'site.hint': 'Tables are placed only inside the site, minus the setback and the exclusions. Exclusion lines and points need a buffer.',
  'site.zoom': 'Zoom to',
  'site.remove': 'Remove',
  'site.drawBanner': 'Click the vertices, double-click to finish. <kbd>Esc</kbd> to cancel.',
  'site.drawnSite': 'Site boundary',
  'site.drawnExcl': 'Exclusion',
  'role.site': 'Site',
  'role.exclusion': 'Exclusion',
  'role.reference': 'Reference',

  'mod.title': 'Modules',
  'mod.sub': 'Library and modules planned for the project',
  'mod.empty': 'No modules yet: add one or import a roadmap.',
  'mod.add': '＋ Add module',
  'mod.import': '⬆ Import roadmap',
  'mod.importTitle': 'Import a module roadmap (CSV or Excel)',
  'mod.manufacturer': 'Manufacturer',
  'mod.model': 'Model',
  'mod.wp': 'Power (Wp)',
  'mod.length': 'Length',
  'mod.width': 'Width',
  'mod.bifacial': 'Bifacial',
  'mod.save': 'Add to library',
  'mod.cancel': 'Cancel',
  'mod.dimsHint': 'Length and width in metres or millimetres (e.g. 2382 and 1134).',
  'mod.planned': 'Planned for this project',
  'mod.remove': 'Remove from library',
  'mod.invalid': 'Fill in power, length and width.',
  'mod.imported': 'Imported {n} modules from {file}.',
  'mod.importedSkipped': 'Imported {n} modules from {file}; {skipped} rows skipped (no power or no size).',
  'mod.importNone': 'No module found in {file}. Columns read: {cols}. Needed: power (Wp) and length and width (or a dimensions column).',
  'mod.hint': 'Tick the modules planned for this project: they come first in the Field section.',

  'field.title': 'Field',
  'field.sub': 'Structure, module, tilt and pitch',
  'field.tech': 'Technology',
  'tech.ground-fixed': 'Ground-mounted, fixed',
  'tech.agri-fixed': 'AgriPV, fixed',
  'tech.agri-tracker': 'AgriPV, single-axis tracker',
  'field.structure': 'Structure',
  'field.structureHint': 'Modules across, V (portrait) or H (landscape), modules along — e.g. 2V13.',
  'field.structureParsed': '{across} × {along} modules in {orientation}: {modules} per table, {length} × {depth} m.',
  'field.structureBad': 'Write it as modules across, V or H, modules along: e.g. 2V13.',
  'orientation.V': 'portrait',
  'orientation.H': 'landscape',
  'field.module': 'Module',
  'field.noModule': '— add a module in the Modules section —',
  'field.tilt': 'Tilt (°)',
  'field.azimuth': 'Azimuth (°)',
  'field.azimuthHint': '180 = facing south; trackers use 90 (rows north–south).',
  'field.rotation': 'Max rotation (°)',
  'field.pitch': 'Pitch, row to row (m)',
  'field.minPitch': 'Toolkit minimum ({angle}° shading angle): <b>{pitch} m</b>',
  'field.presetMinPitch': 'Toolkit minimum for {id}: <b>{pitch} m</b>',
  'field.useMin': 'Use it',
  'field.tableGap': 'Gap between tables (m)',
  'field.moduleGap': 'Gap between modules (m)',
  'field.tracks': 'Crossing tracks',
  'field.tracksEvery': 'Every (m)',
  'field.tracksWidth': 'Width (m)',
  'field.target': 'Target DC capacity (MWp)',
  'field.optional': 'optional',
  'field.position': 'Grid position',
  'field.rowOffset': 'Row offset (m)',
  'field.colOffset': 'Column offset (m)',
  'field.optimise': '⟳ Optimise position',
  'field.optimised': 'Best position found: {tables} tables ({gain}).',

  'res.title': 'Results',
  'res.sub': 'Capacity and key figures',
  'res.dc': 'DC capacity',
  'res.tables': 'Tables',
  'res.modules': 'Modules',
  'res.rows': 'Rows',
  'res.gcr': 'GCR',
  'res.shading': 'Shading angle',
  'res.siteArea': 'Site area',
  'res.buildable': 'Buildable area',
  'res.coverage': 'Ground coverage',
  'res.density': 'Density',
  'res.energy': 'Annual energy',
  'res.specYield': 'Specific yield (kWh/kWp per year)',
  'res.specYieldHint': 'From the internal yield tool — its API will fill this in.',
  'res.none': 'Draw or import a site, add a module and set the pitch.',

  'warn.noSite': 'No site boundary: draw one or mark an imported polygon as Site.',
  'warn.noModule': 'No module selected.',
  'warn.noPitch': 'Set the pitch.',
  'warn.badStructure': 'The structure is not valid.',
  'warn.noArea': 'Nothing left to build on: check setback and exclusions.',
  'warn.pitchBelowMin': 'Pitch {pitch} m is below the toolkit minimum of {min} m (shading angle {angle}° over {max}°).',
  'warn.pitchBelowPreset': 'Pitch {pitch} m is below the toolkit minimum of {min} m for {id}.',
  'warn.coverage': 'Ground coverage {cov}% is over the AgriPV maximum of {max}%.',
  'warn.lineNoBuffer': '{n} exclusion lines or points are ignored: set a buffer around exclusions.',
  'warn.verify': 'Toolkit values still to be verified are used: {items}.',
  'warn.target': 'Target reached: the fill stopped at {mwp} MWp.',

  'toast.axpo': 'Imported «{name}»: {n} objects ({site} site, {excl} exclusions).',
  'toast.geojson': 'Imported {n} objects from {file}.',
  'toast.importFail': 'Could not read {file}: {err}',
  'toast.exported': 'Exported {n} tables to {file}.',
  'toast.nothingToExport': 'Nothing to export yet.',
  'toast.sdkFail': 'The map could not start: {err}',
  'confirm.new': 'Start a new project? The current one is replaced (export it first if needed).',

  'err.axpoNotProject': 'this is not a Geoportale project',
  'err.noFeatures': 'no geometry found',
  'err.unsupported': 'unsupported file type',
};

export function t(key, vars) {
  let s = EN[key];
  if (s === undefined) { console.warn('[i18n] missing key', key); s = key; }
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  return s;
}

// Fill [data-i18n], [data-i18n-title], [data-i18n-placeholder], [data-i18n-empty] and [data-i18n-aria].
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  root.querySelectorAll('[data-i18n-empty]').forEach(el => { el.dataset.empty = t(el.dataset.i18nEmpty); });
  root.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
}

// Numbers in English format
export const fmt = (v, d = 0) => (v == null || !isFinite(v)) ? '–' : Number(v).toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
