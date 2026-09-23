// Area categories of step 1 and the automatic classification of imported objects. Pure module (no SDK).
import { geomKind, linearTypeFor } from './state.js';

// geom: geometry kinds accepted; cuts: removed from the buildable area; attrs: per-object attributes
export const CATEGORIES = [
  { id: 'gross', colour: [255, 140, 26], geom: ['polygon'], cuts: false, attrs: [] },
  { id: 'net', colour: [45, 190, 126], geom: ['polygon'], cuts: false, attrs: [] },
  { id: 'exclusion', colour: [229, 72, 77], geom: ['polygon', 'line', 'point'], cuts: true, attrs: ['buffer'] },
  { id: 'linear', colour: [233, 30, 140], geom: ['line'], cuts: true, attrs: ['type', 'buffer'],
    types: ['overhead-power', 'underground-power', 'gas', 'water', 'ditch', 'road', 'railway', 'other'] },
  { id: 'obstacle', colour: [150, 90, 40], geom: ['point', 'polygon', 'line'], cuts: true, attrs: ['type', 'height', 'buffer'],
    types: ['tree', 'pole', 'building', 'other'] },
  { id: 'access', colour: [31, 153, 204], geom: ['point', 'line'], cuts: false, attrs: ['type'],
    types: ['site-access', 'grid-connection'] },
  { id: 'mitigation', colour: [110, 170, 60], geom: ['polygon', 'line'], cuts: true, attrs: ['width'] },
  { id: 'agri', colour: [200, 170, 40], geom: ['polygon', 'line'], cuts: true, attrs: ['width'] },
  { id: 'reference', colour: [123, 138, 153], geom: ['polygon', 'line', 'point'], cuts: false, attrs: [] },
];
export const CATEGORY = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

export function accepts(categoryId, geometry) {
  const c = CATEGORY[categoryId];
  return !!c && c.geom.includes(geomKind(geometry));
}

// Keywords in names, KML folders, layer names (IT, EN, FR, ES, DE, PL)
// Order matters: the first match wins, and the generic "gross" words come last.
const KEYWORDS = [
  ['net', /perimetro netto|\bnet(to|ta|te)?\b|\bnetta\b|neto\b|buildable|surface utile|zone utile|nutzbar/],
  ['access', /access|ingress|entrance|entr[ée]e|acceso|zufahrt|einfahrt|wjazd|\bgate\b|cancell|portail|connection point|punto di connessione|point de raccordement|punto de conexi|netzanschluss|przył[aą]cz|\bpod\b/],
  ['mitigation', /mitigaz|mitigation|siepe|hedge|haie|seto|hecke|żywop|fascia verde|green belt|écran végétal|pantalla vegetal/],
  ['agri', /agricol|agricultural|culture|cultivo|coltiv|pascol|pâtur|pasture|weide|pastwisk|farming/],
  ['obstacle', /\btree|alber|arbre|árbol|arbol|\bbaum|drzew|\bpole\b|\bpalo|poteau|\bmast\b|słup|pylon|traliccio|building|edific|fabbricat|bâtiment|batiment|gebäude|gebaude|budyn|obstacle|ostacol|hindernis|przeszk/],
  ['exclusion', /exclu|vincol|constraint|contrainte|restric|restrizion|ausschluss|wyłącz|wylacz|natura 2000|\bsic\b|\bzps\b|flood|esondaz|inondab|inondation|pendenz|slope|pente|pendiente|hangneig|nachylen|\bdpa\b|buffer|rispetto|servitud|servitù|servitude/],
  ['gross', /\bgross\b|\blord[oa]\b|\bbrut(e|o|a|to)?\b|bruttofl|site boundary|perimetro|lease|\boption\b|emprise|foncier|gesamtfl|\bsite\b|\bsito\b/],
];

// lower case, underscores as spaces (layer names such as "Area_lorda")
const norm = text => String(text || '').toLowerCase().replace(/_/g, ' ');

function keywordCategory(text) {
  const s = norm(text);
  for (const [cat, re] of KEYWORDS) if (re.test(s)) return cat;
  return null;
}

// Obstacle type from text
function obstacleType(text) {
  const s = norm(text);
  if (/tree|alber|arbre|árbol|arbol|baum|drzew|vegetaz|vegetation/.test(s)) return 'tree';
  if (/pole|palo|poteau|mast|słup|pylon|traliccio|pylône|poste/.test(s)) return 'pole';
  if (/building|edific|fabbricat|costruzion|bâtiment|batiment|gebäude|gebaude|budyn|house|casa|maison/.test(s)) return 'building';
  return 'other';
}

// Geoportale (.axpo) drawing categories, from the IT Sites Notes domains
function axpoCategory(cat, kind) {
  const c = String(cat || '').toLowerCase();
  if (!c) return null;
  if (/perimetro netto/.test(c)) return kind === 'polygon' ? { category: 'net' } : null;
  if (/accessi/.test(c)) return { category: 'access', attrs: { type: 'site-access' } };
  if (/alberi|vegetazione/.test(c) && kind !== 'polygon') return { category: 'obstacle', attrs: { type: 'tree' } };
  if (/costruzioni|antropizzazioni|edifici/.test(c) && kind === 'point') return { category: 'obstacle', attrs: { type: 'building' } };
  if (kind === 'line') {
    const lin = linearTypeFor(c);
    if (lin) return { category: 'linear', attrs: { type: lin } };
  }
  if (/vincol|pendenze alte|\bdpa\b|edifici ed aree rilevanti|vegetazione|idrografia|beni interesse|manufatti/.test(c)) return { category: 'exclusion' };
  if (/misurazioni|percorso sopralluogo|rilievo fotografico/.test(c)) return { category: 'reference' };
  return null;
}

// Decide the category of one imported object.
// f: { name, geometry, sourceCategory (axpo category / KML folder / layer), kind (axpo _kind), properties }
// ctx: { type: 'axpo'|'geojson'|'kml'|'shp'|'csv', polygonsInFile }
export function classify(f, ctx = {}) {
  const kind = geomKind(f.geometry);
  const props = f.properties || {};
  // an explicit category written by this app (GeoJSON round trip)
  const explicit = props.category || props.role;
  if (explicit && CATEGORY[explicit] && accepts(explicit, f.geometry)) return { category: explicit, attrs: pickAttrs(props) };
  if (ctx.type === 'axpo') {
    if (f.kind === 'parcel') return { category: 'reference', attrs: {} };
    const a = axpoCategory(f.sourceCategory, kind);
    if (a && accepts(a.category, f.geometry)) return { category: a.category, attrs: a.attrs || {} };
    return { category: 'reference', attrs: {} };
  }
  const text = [f.sourceCategory, f.name].filter(Boolean).join(' ');
  if (kind === 'line') {
    const lin = linearTypeFor(text);
    if (lin) return { category: 'linear', attrs: { type: lin } };
  }
  const height = Number(props.height ?? props.h ?? props.altezza ?? props.hauteur ?? props.altura ?? props.hoehe);
  const kw = keywordCategory(text);
  if (kw && accepts(kw, f.geometry)) {
    const attrs = kw === 'obstacle' ? { type: obstacleType(text) } : kw === 'access' ? { type: /connect|connessione|raccordement|conexi|anschluss|przył|\bpod\b/i.test(text) ? 'grid-connection' : 'site-access' } : {};
    if (kw === 'obstacle' && height > 0) attrs.height = height;
    return { category: kw, attrs };
  }
  // points with a height (e.g. surveyed trees or poles in a CSV) are obstacles
  if (kind === 'point' && height > 0) return { category: 'obstacle', attrs: { type: obstacleType(text), height } };
  // a file with a few polygons and no hint: most likely the site boundary
  if (kind === 'polygon' && (ctx.polygonsInFile || 0) <= 3) return { category: 'gross', attrs: {} };
  return { category: 'reference', attrs: {} };
}

function pickAttrs(props) {
  const a = {};
  for (const k of ['buffer', 'height', 'type', 'width']) if (props[k] !== undefined && props[k] !== null && props[k] !== '') a[k] = props[k];
  return a;
}
