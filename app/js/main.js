// PV Predesign — bootstrap.
import { loadSdk } from './sdk.js';
import { loadCatalog } from './catalog.js';
import { applyI18n, t } from './i18n.js';
import { store, change, replaceProject, defaultProject, on } from './state.js';
import { initSite, addFeatures, zoomToFeatures } from './site.js';
import { initModulesUi, renderModules } from './modules.js';
import { initField, exportGeoJSON } from './field.js';
import { readAnyFile } from './io/importers.js';
import { toast } from './ui/toast.js';

const $ = id => document.getElementById(id);

async function start() {
  applyI18n();
  initTheme();
  let sdk;
  try {
    [sdk] = await Promise.all([loadSdk(), loadCatalog()]);
  } catch (e) {
    console.error(e);
    toast(t('toast.sdkFail', { err: e.message || e }), 'err', 30000);
    return;
  }
  const { Map, MapView, ScaleBar, BasemapToggle } = sdk;
  const view = new MapView({
    container: 'view',
    map: new Map({ basemap: 'hybrid' }),
    center: [10.5, 46.5], zoom: 5,
    constraints: { snapToZoom: false },
  });
  view.ui.add(new ScaleBar({ view, unit: 'metric' }), 'bottom-left');
  view.ui.add(new BasemapToggle({ view, nextBasemap: 'topo-vector' }), 'bottom-right');
  window.__view = view;   // debug hook
  await view.when();

  initSite(view);
  initModulesUi();
  initField(view);
  on('modules', renderModules);
  on('project', renderModules);

  // project name
  const pn = $('projName');
  pn.value = store.project.name;
  pn.onchange = () => change('name', p => { p.name = pn.value.trim() || 'Untitled project'; });
  on('project', () => { pn.value = store.project.name; });

  // import (.axpo, GeoJSON), export, new
  const fileIn = $('fileImport');
  $('btnImport').onclick = () => fileIn.click();
  fileIn.onchange = async () => {
    const files = [...(fileIn.files || [])]; fileIn.value = '';
    for (const f of files) await importFile(f);
    if (files.length) zoomToFeatures();
  };
  $('btnExport').onclick = exportGeoJSON;
  $('btnNew').onclick = () => {
    if (store.project.features.length && !confirm(t('confirm.new'))) return;
    replaceProject(defaultProject());
  };
  // drop files on the map
  const vd = $('view');
  vd.addEventListener('dragover', e => { e.preventDefault(); });
  vd.addEventListener('drop', async e => {
    e.preventDefault();
    const files = [...(e.dataTransfer?.files || [])];
    for (const f of files) await importFile(f);
    if (files.length) zoomToFeatures();
  });

  if (store.project.features.length) zoomToFeatures();
}

async function importFile(file) {
  try {
    const r = await readAnyFile(file);
    addFeatures(r.features);
    if (r.type === 'axpo') {
      if (store.project.name === 'Untitled project' || !store.project.name) change('name', p => { p.name = r.name; });
      const site = r.features.filter(f => f.role === 'site').length, excl = r.features.filter(f => f.role === 'exclusion').length;
      toast(t('toast.axpo', { name: r.name, n: r.features.length, site, excl }), 'ok');
    } else {
      toast(t('toast.geojson', { n: r.features.length, file: file.name }), 'ok');
    }
  } catch (e) {
    console.error(e);
    toast(t('toast.importFail', { file: file.name, err: e.message || e }), 'err', 10000);
  }
}

// light / dark (follows the system unless chosen), also switches the Esri widget theme
function initTheme() {
  const KEY = 'pvp.theme';
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch {}
  const apply = mode => {
    if (mode) document.documentElement.dataset.theme = mode; else delete document.documentElement.dataset.theme;
    const dark = mode ? mode === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    $('esriTheme').href = `https://js.arcgis.com/4.34/esri/themes/${dark ? 'dark' : 'light'}/main.css`;
    $('btnTheme').textContent = dark ? '☀' : '☾';
  };
  apply(saved);
  $('btnTheme').onclick = () => {
    const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    const next = dark ? 'light' : 'dark';
    try { localStorage.setItem(KEY, next); } catch {}
    apply(next);
  };
}

start();
