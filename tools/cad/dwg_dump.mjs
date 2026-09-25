// Dumps the texts, dimensions and block sizes of a DWG, grouped by area of the drawing, so that toolkit values
// can be transcribed exactly (a dimension carries its measured value, not only its rounded label).
// Usage: node dwg_dump.mjs <file.dwg> [cell size in drawing units, default 80] > dump.txt
// Reads with LibreDWG compiled to WebAssembly (@mlightcad/libredwg-web, GPL-3.0: a development tool only).
import fs from 'node:fs';
import path from 'node:path';
import { Dwg_File_Type, LibreDwg } from '@mlightcad/libredwg-web';

const [file, cellArg] = process.argv.slice(2);
if (!file) { console.error('usage: node dwg_dump.mjs <file.dwg> [cell]'); process.exit(1); }
const CELL = Number(cellArg) || 80;
const here = path.dirname(new URL(import.meta.url).pathname);
const lib = await LibreDwg.create(path.join(here, 'node_modules/@mlightcad/libredwg-web/wasm/'));
const dwg = lib.dwg_read_data(fs.readFileSync(file), Dwg_File_Type.DWG);
if (!dwg) { console.error('cannot read', file); process.exit(1); }
const db = lib.convert(dwg);
lib.dwg_free(dwg);

const clean = t => String(t || '').replace(/\\[A-Za-z][^;\\]*;|[{}]|\\P|\\L|\\l|\\~/g, ' ').replace(/\s+/g, ' ').trim();
const f2 = v => (Math.round(v * 100) / 100).toFixed(2);
const blocks = new Map(db.tables.BLOCK_RECORD.entries.map(b => [b.name, b]));
const model = db.entities.filter(e => !e.ownerBlockRecordSoftId || e.ownerBlockRecordSoftId === db.entities[0].ownerBlockRecordSoftId);

// extents of an INSERT (one level of nesting is enough for toolkit symbols)
function extent(ins) {
  const b = blocks.get(ins.name); if (!b) return null;
  const pts = [];
  const a = ins.rotation || 0, c = Math.cos(a), s = Math.sin(a), bp = b.basePoint, ip = ins.insertionPoint;
  const T = (x, y) => { x = (x - bp.x) * (ins.xScale || 1); y = (y - bp.y) * (ins.yScale || 1); return [ip.x + x * c - y * s, ip.y + x * s + y * c]; };
  for (const e of b.entities || []) {
    if (e.type === 'LWPOLYLINE') for (const v of e.vertices) pts.push(T(v.x, v.y));
    else if (e.type === 'LINE') { pts.push(T(e.startPoint.x, e.startPoint.y)); pts.push(T(e.endPoint.x, e.endPoint.y)); }
  }
  if (!pts.length) return null;
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), x: Math.min(...xs), y: Math.min(...ys) };
}

const cells = new Map();
const put = (x, y, line) => { const k = `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`; if (!cells.has(k)) cells.set(k, []); cells.get(k).push([y, x, line]); };
for (const e of model) {
  if (e.type === 'MTEXT' || e.type === 'TEXT') {
    const p = e.insertionPoint || e.startPoint; const t = clean(e.text?.text ?? e.text);
    if (p && t) put(p.x, p.y, `text  "${t}"`);
  } else if (e.type === 'DIMENSION') {
    const p = e.textPoint || e.definitionPoint; const label = clean((e.text || '<>').replace('<>', f2(e.measurement)));
    put(p.x, p.y, `dim   ${f2(e.measurement)}${label !== f2(e.measurement) ? `  label "${label}"` : ''}`);
  } else if (e.type === 'INSERT') {
    const x = extent(e); if (x && x.w * x.h > 0) put(x.x, x.y, `block ${e.name} (${e.layer})  ${f2(x.w)} × ${f2(x.h)}`);
  }
}
console.log(`# ${path.basename(file)} — ${db.entities.length} entities, cells of ${CELL} drawing units\n`);
for (const k of [...cells.keys()].sort((a, b) => { const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number); return by - ay || ax - bx; })) {
  const [cx, cy] = k.split(',').map(Number);
  console.log(`## area x ${cx * CELL}…${(cx + 1) * CELL}, y ${cy * CELL}…${(cy + 1) * CELL}`);
  const seen = new Map();
  for (const [, , line] of cells.get(k).sort((a, b) => b[0] - a[0] || a[1] - b[1])) seen.set(line, (seen.get(line) || 0) + 1);
  for (const [line, n] of seen) console.log(`  ${line}${n > 1 ? `  ×${n}` : ''}`);
  console.log('');
}
