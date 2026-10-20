/* TERBiBOARD – eigenständige Neuentwicklung nach dem Vorbild von Weitzboard.
   Copyright (C) 2026 DocTERBi (TERBi Teaching)
   SPDX-License-Identifier: GPL-3.0-only

   Dieses Programm ist freie Software: Sie können es unter den Bedingungen der GNU General Public
   License, Version 3, wie von der Free Software Foundation veröffentlicht, weitergeben und/oder
   verändern. Es wird OHNE JEDE GEWÄHRLEISTUNG bereitgestellt. Details: Datei LICENSE.
   Name und Logo „TERBi Teaching“ (logo.png) sind von der Lizenz ausgenommen.

   Datenmodell: els = Array unveränderlicher Elementobjekte (Z-Reihenfolge).
     Strich: {id, t:'s', pts:[[x,y,p],…], c, w}
     Text:   {id, t:'t', x, y, s, c, txt}
     Bild:   {id, t:'i', x, y, w, h, href}
   Jede Änderung erzeugt neue Objekte bzw. ein neues Array -> Undo = Array-Referenzen. */
(() => {
'use strict';

// ===================================================================== Grundlagen
const NS = 'http://www.w3.org/2000/svg', XH = 'http://www.w3.org/1999/xhtml';
const VERSION = '2026-10-20a';
const COLORS = ['#FFFFFF','#000000','#DDDDDD','#CC6677','#882255','#117733','#88CCEE','#332288','#999933','#DDCC77'];
const TEXT_FONT = 'system-ui,"Segoe UI",Arial,sans-serif';
const $ = id => document.getElementById(id);
const svg = $('board'), cont = $('container');
const r1 = n => Math.round(n * 10) / 10;
const r2 = n => Math.round(n * 100) / 100;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let els = [];                 // Elemente
let W = 1200, H = 800;        // logische Größe der Fläche
let mode = 'draw';            // draw | select | text | erase
let color = '#000000', strokeW = 1.5, fontSize = 28;
let sel = new Set();          // ausgewählte ids
let undoStack = [], redoStack = [];
let dirty = false, fileHandle = null, fileName = null, fingerDraw = false;
let clip = null, pasteCount = 0, lastStrokeId = null, lastPointer = null;
let idc = 0;
// Fensterkennung im Präfix, damit zwei gekoppelte Fenster keine gleichen ids vergeben
const IDP = 'e' + Math.random().toString(36).slice(2, 5);
const nid = () => IDP + (++idc).toString(36);
const IS_MIRROR = location.hash === '#mirror';

// SVG-Ebenen
const gBg = mk('g', { id: 'bg' }), gInk = mk('g', { id: 'ink' }), gTxt = mk('g', { id: 'txt' }), gUi = mk('g', { id: 'ui' });
svg.append(gBg, gInk, gTxt, gUi);

function mk(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function toast(msg, ms = 1800) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), ms);
}
const scale = () => svg.clientWidth / W || 1;
function toLogical(e) {
  const r = svg.getBoundingClientRect(), s = r.width / W;
  return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
}
function viewRect() { // sichtbarer Bereich in logischen Koordinaten
  const s = scale();
  return { x: 0, y: cont.scrollTop / s, w: W, h: cont.clientHeight / s };
}

// ===================================================================== Geometrie
const hwOf = (w, p) => w * (0.35 + 1.3 * p) / 2;   // halbe Strichbreite bei Druck p

function chaikin(p) {
  for (let k = 0; k < 2 && p.length > 2; k++) {
    const q = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      // Ecken nur um höchstens ~1,5 Einheiten abrunden: dichte Handschrift wird glatt,
      // lange Strecken (Rechtecke, Pfeile, importierte Formen) behalten scharfe Ecken
      const t = Math.min(.25, 1.5 / (Math.hypot(b[0] - a[0], b[1] - a[1]) || 1)), u = 1 - t;
      q.push([u*a[0]+t*b[0], u*a[1]+t*b[1], u*a[2]+t*b[2]],
             [t*a[0]+u*b[0], t*a[1]+u*b[1], t*a[2]+u*b[2]]);
    }
    q.push(p[p.length - 1]); p = q;
  }
  return p;
}

// Umriss eines drucksensitiven Strichs als gefüllter Pfad
function outline(pts, w) {
  const f = n => r1(n);
  const first = pts[0];
  const isDot = pts.every(q => Math.abs(q[0] - first[0]) < .3 && Math.abs(q[1] - first[1]) < .3);
  if (isDot) {
    const h = Math.max(hwOf(w, first[2]), .6);
    return `M${f(first[0] - h)} ${f(first[1])}a${f(h)} ${f(h)} 0 1 0 ${f(2*h)} 0a${f(h)} ${f(h)} 0 1 0 ${f(-2*h)} 0Z`;
  }
  const p = chaikin(pts), n = p.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = p[Math.max(i - 1, 0)], b = p[Math.min(i + 1, n - 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len, h = hwOf(w, p[i][2]);
    L.push(f(p[i][0] + nx*h) + ' ' + f(p[i][1] + ny*h));
    R.push(f(p[i][0] - nx*h) + ' ' + f(p[i][1] - ny*h));
  }
  const he = f(hwOf(w, p[n-1][2])), hs = f(hwOf(w, p[0][2]));
  return 'M' + L.join('L') + `A${he} ${he} 0 0 0 ` + R.reverse().join('L') + `A${hs} ${hs} 0 0 0 ` + L[0] + 'Z';
}

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx*dx + dy*dy;
  let t = l2 ? ((px - ax)*dx + (py - ay)*dy) / l2 : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(px - ax - t*dx, py - ay - t*dy);
}

const bboxCache = new WeakMap();
function bbox(el) {
  let b = bboxCache.get(el);
  if (b) return b;
  if (el.t === 's') {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, pm = 0;
    for (const [x, y, p] of el.pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (p > pm) pm = p; }
    const h = hwOf(el.w, pm);
    b = { x: x0 - h, y: y0 - h, w: x1 - x0 + 2*h, h: y1 - y0 + 2*h };
  } else if (el.t === 't') {
    const node = nodes.get(el.id), d = node && node._dim || { w: el.s * Math.max(1, el.txt.length) * .55, h: el.s * 1.25 };
    b = { x: el.x, y: el.y, w: d.w, h: d.h };
    if (!node || !node._dim) return b; // noch nicht gemessen -> nicht cachen
  } else b = { x: el.x, y: el.y, w: el.w, h: el.h };
  bboxCache.set(el, b);
  return b;
}
function unionBox(list) {
  if (!list.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const el of list) { const b = bbox(el); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
function hit(el, x, y, tol) {
  const b = bbox(el);
  if (x < b.x - tol || x > b.x + b.w + tol || y < b.y - tol || y > b.y + b.h + tol) return false;
  if (el.t !== 's') return true;
  const p = el.pts;
  if (p.length === 1) return Math.hypot(x - p[0][0], y - p[0][1]) <= hwOf(el.w, p[0][2]) + tol;
  for (let i = 1; i < p.length; i++)
    if (segDist(x, y, p[i-1][0], p[i-1][1], p[i][0], p[i][1]) <= hwOf(el.w, p[i][2]) + tol) return true;
  return false;
}
function topHit(x, y, tol) { // oberstes Element; Texte liegen über der Zeichnung
  for (let pass = 0; pass < 2; pass++)
    for (let i = els.length - 1; i >= 0; i--) {
      const el = els[i];
      if ((pass === 0) !== (el.t === 't')) continue;
      if (hit(el, x, y, tol)) return el;
    }
  return null;
}

// Affine Abbildung x' = ax + sx*(x-ax) + tx  (Verschieben/Skalieren)
function mapEl(el, f, sGeo) {
  if (el.t === 's') return { ...el, pts: el.pts.map(([x, y, p]) => { const q = f(x, y); return [r1(q[0]), r1(q[1]), p]; }), w: r2(el.w * sGeo) };
  if (el.t === 't') { const q = f(el.x, el.y); const o = { ...el, x: r1(q[0]), y: r1(q[1]), s: r1(Math.max(4, el.s * sGeo)) }; if (el.tw) o.tw = r1(Math.max(20, el.tw * sGeo)); return o; }
  const a = f(el.x, el.y), b = f(el.x + el.w, el.y + el.h);
  return { ...el, x: r1(Math.min(a[0], b[0])), y: r1(Math.min(a[1], b[1])), w: r1(Math.abs(b[0] - a[0])), h: r1(Math.abs(b[1] - a[1])) };
}
function rotateEl(el, cx, cy, cw) {
  const rot = (x, y) => cw ? [cx - (y - cy), cy + (x - cx)] : [cx + (y - cy), cy - (x - cx)];
  if (el.t === 's') return { ...el, pts: el.pts.map(([x, y, p]) => { const q = rot(x, y); return [r1(q[0]), r1(q[1]), p]; }) };
  const b = bbox(el), c = rot(b.x + b.w / 2, b.y + b.h / 2);
  return { ...el, x: r1(c[0] - b.w / 2), y: r1(c[1] - b.h / 2) };
}

// ---- Strich-Werkzeuge H / K / F
function straighten(el) {
  const p = el.pts, a = p[0], b = p[p.length - 1];
  const pm = r2(p.reduce((s, q) => s + q[2], 0) / p.length);
  let A = [a[0], a[1]], B = [b[0], b[1]];
  const ang = Math.abs(Math.atan2(B[1] - A[1], B[0] - A[0]) * 180 / Math.PI);
  const dH = Math.min(ang, 180 - ang), dV = Math.abs(90 - ang);
  const force = p.length === 2;                       // zweites H: auf Achse zwingen
  if (dH < 12 || (force && dH <= dV)) { const y = (A[1] + B[1]) / 2; A[1] = B[1] = y; }
  else if (dV < 12 || force) { const x = (A[0] + B[0]) / 2; A[0] = B[0] = x; }
  return { ...el, pts: [[r1(A[0]), r1(A[1]), pm], [r1(B[0]), r1(B[1]), pm]] };
}
function fitArc(el) {
  const p = el.pts;
  if (p.length < 3) return el;
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0;
  const mx = p.reduce((s, q) => s + q[0], 0) / p.length, my = p.reduce((s, q) => s + q[1], 0) / p.length;
  for (const q of p) {
    const x = q[0] - mx, y = q[1] - my, z = x*x + y*y;
    sx += x; sy += y; sxx += x*x; syy += y*y; sxy += x*y; sxz += x*z; syz += y*z; sz += z;
  }
  const n = p.length;
  // Normalengleichungen für x²+y²+Dx+Ey+F=0
  const M = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]], v = [-sxz, -syz, -sz];
  const det3 = m => m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1]) - m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0]) + m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
  const d = det3(M);
  if (Math.abs(d) < 1e-9) return straighten(el);
  const col = (i) => M.map((row, k) => row.map((x, j) => j === i ? v[k] : x));
  const D = det3(col(0)) / d, E = det3(col(1)) / d, F = det3(col(2)) / d;
  const cx = -D / 2, cy = -E / 2, rr = Math.sqrt(cx*cx + cy*cy - F);
  if (!isFinite(rr) || rr > 1e5) return straighten(el);
  let a0 = Math.atan2(p[0][1] - my - cy, p[0][0] - mx - cx), acc = 0, prev = a0;
  for (let i = 1; i < n; i++) {
    const a = Math.atan2(p[i][1] - my - cy, p[i][0] - mx - cx);
    let da = a - prev; if (da > Math.PI) da -= 2*Math.PI; if (da < -Math.PI) da += 2*Math.PI;
    acc += da; prev = a;
  }
  if (Math.abs(acc) > 2*Math.PI*0.88) acc = Math.sign(acc) * 2 * Math.PI;
  const pm = r2(p.reduce((s, q) => s + q[2], 0) / n);
  const N = Math.max(8, Math.ceil(Math.abs(acc) / (2*Math.PI) * 96));
  const out = [];
  for (let i = 0; i <= N; i++) {
    const a = a0 + acc * i / N;
    out.push([r1(mx + cx + rr*Math.cos(a)), r1(my + cy + rr*Math.sin(a)), pm]);
  }
  return { ...el, pts: out };
}
function flatten(el) {
  const p = el.pts;
  if (p.length < 4) return el;
  return { ...el, pts: p.filter((_, i) => i % 2 === 0 || i === p.length - 1) };
}

// ===================================================================== Text / Formeln
function escHTML(s) { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function texHTML(txt) {
  const PH = '\u0001';
  const src = txt.replace(/\\\$/g, PH);
  const parts = src.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/);
  return parts.map(seg => {
    const restore = s => s.split(PH).join('$');
    const isD = seg.startsWith('$$') && seg.endsWith('$$') && seg.length > 4;
    const isI = !isD && seg.length > 2 && seg[0] === '$' && seg[seg.length - 1] === '$';
    if ((isD || isI) && window.katex) {
      const tex = restore(isD ? seg.slice(2, -2) : seg.slice(1, -1));
      try { return katex.renderToString(tex, { displayMode: isD, output: 'mathml', throwOnError: false, strict: 'ignore' }); }
      catch (e) { return escHTML(seg); }
    }
    return escHTML(restore(seg));
  }).join('');
}

// ===================================================================== Rendering
const nodes = new Map();       // id -> DOM-Knoten

// Textmarker (nur Stärke-Stufe 3): halbtransparent, multipliziert sich mit dem Untergrund
function hlStyle(n) {
  n.setAttribute('fill-opacity', '.45'); n.setAttribute('data-hl', '1');
  n.setAttribute('style', 'mix-blend-mode:multiply');
}
function buildNode(el) {
  let n;
  if (el.t === 's') {
    n = mk('path', { class: 's', d: outline(el.pts, el.w), fill: el.c, 'data-w': el.w,
      'data-pts': el.pts.map(q => q[0] + ',' + q[1] + ',' + q[2]).join(' ') });
    if (el.hl) hlStyle(n);
  } else if (el.t === 'i') {
    n = mk('image', { class: 'i', x: el.x, y: el.y, width: el.w, height: el.h, preserveAspectRatio: 'none', href: el.href });
  } else {
    n = mk('foreignObject', { class: 't', x: el.x, y: el.y, width: 10, height: 10, 'data-s': el.s, 'data-c': el.c, 'data-txt': el.txt });
    const div = document.createElementNS(XH, 'div');
    div.setAttribute('class', 'wbt');
    // feste Breite (tw): Text wird umbrochen; sonst so breit wie die längste Zeile
    const wrap = el.tw ? `white-space:pre-wrap;overflow-wrap:break-word;width:${el.tw}px;` : 'white-space:pre;';
    div.setAttribute('style', `display:inline-block;${wrap}line-height:1.25;font-family:${TEXT_FONT};font-size:${el.s}px;color:${el.c}`);
    if (el.tw) n.setAttribute('data-tw', el.tw);
    div.innerHTML = texHTML(el.txt);
    n.appendChild(div);
  }
  n._el = el;
  return n;
}
function measureText(n) {
  const div = n.firstChild;
  n.setAttribute('width', W * 4); n.setAttribute('height', H * 4);
  const w = Math.ceil(div.offsetWidth || 10) + 2, h = Math.ceil(div.offsetHeight || 10) + 1;
  n.setAttribute('width', w); n.setAttribute('height', h);
  n._dim = { w, h };
}

function render() {
  const live = new Set();
  for (const el of els) {
    live.add(el.id);
    const old = nodes.get(el.id);
    if (old && old._el === el) continue;
    const n = buildNode(el);
    const layer = el.t === 't' ? gTxt : gInk;
    if (old) old.replaceWith(n); else layer.appendChild(n);
    nodes.set(el.id, n);
    if (el.t === 't') { measureText(n); bboxCache.delete(el); }
  }
  for (const [id, n] of nodes) if (!live.has(id)) { n.remove(); nodes.delete(id); }
  // Reihenfolge prüfen
  for (const [layer, isT] of [[gInk, false], [gTxt, true]]) {
    const want = els.filter(e => (e.t === 't') === isT).map(e => nodes.get(e.id));
    const have = layer.children;
    let ok = have.length === want.length;
    for (let i = 0; ok && i < want.length; i++) if (have[i] !== want[i]) ok = false;
    if (!ok) for (const n of want) layer.appendChild(n);
  }
  if (editing) { const n = nodes.get(editing.id); if (n) n.style.visibility = 'hidden'; }
  drawUi();
}

// ---- Schreibgitter (nur Anzeige: wird weder gedruckt noch gespeichert)
const GRIDS = ['off', 'lines', 'squares'];
const GRID_LABEL = { off: 'Gitter: aus', lines: 'Gitter: Linien', squares: 'Gitter: Karos' };
let grid = 'off';
try { grid = GRIDS.includes(localStorage.getItem('wb2.grid')) ? localStorage.getItem('wb2.grid') : 'off'; } catch (e) {}
function drawGrid() {
  gBg.textContent = '';
  if (grid === 'off') return;
  const defs = mk('defs', null, gBg);
  const st = { stroke: '#b9c7dd', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke', fill: 'none' };
  if (grid === 'lines') {
    const d = 40, pat = mk('pattern', { id: 'wbgrid', width: W, height: d, patternUnits: 'userSpaceOnUse' }, defs);
    mk('line', { x1: 0, x2: W, y1: d - .5, y2: d - .5, ...st }, pat);
  } else {
    const d = 25, pat = mk('pattern', { id: 'wbgrid', width: d, height: d, patternUnits: 'userSpaceOnUse' }, defs);
    mk('path', { d: `M${d} 0V${d}M0 ${d}H${d}`, ...st, stroke: '#cfd8e6' }, pat);
  }
  mk('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#wbgrid)' }, gBg);
}
function cycleGrid() {
  grid = GRIDS[(GRIDS.indexOf(grid) + 1) % GRIDS.length];
  try { localStorage.setItem('wb2.grid', grid); } catch (e) {}
  drawGrid(); syncPanel(); toast(GRID_LABEL[grid], 900);
}

// ---- Druckseiten: Format, echte Umbrüche, seitenweiser Druck
// Druckbarer Bereich A4 mit 10 mm Rand: 190 x 277 mm
let pageFmt = 'portrait';
try { if (localStorage.getItem('wb2.fmt') === 'landscape') pageFmt = 'landscape'; } catch (e) {}
const FMT_LABEL = { portrait: 'Format: Hoch', landscape: 'Format: Quer' };
function pageH() { return W * (pageFmt === 'landscape' ? 190 / 277 : 277 / 190) * 0.995; }
function setPageStyle() {
  let st = $('pageStyle');
  if (!st) { st = document.createElement('style'); st.id = 'pageStyle'; document.head.appendChild(st); }
  st.textContent = `@page{size:A4 ${pageFmt};margin:10mm}`;
}
function toggleFormat() {
  if (editing) commitEdit();
  const before = snapshot();
  pageFmt = pageFmt === 'portrait' ? 'landscape' : 'portrait';
  try { localStorage.setItem('wb2.fmt', pageFmt); } catch (e) {}
  setPageStyle(); breakCache = null; syncPanel();
  const r = els.length ? arrangeCompute() : null;
  commitChange(before);                                  // ein Undo-Schritt für Format + Anordnung
  if (r && r.moved) { applyArrange(r); toast(FMT_LABEL[pageFmt] + ' – für den Druck neu angeordnet (Z: rückgängig)', 2600); }
  else { drawUi(); toast(FMT_LABEL[pageFmt], 1200); }
}

// ---- Für Druck anordnen: Inhalt in waagerechte Blöcke zerlegen; Blöcke, die über einen
// Umbruch ragen, an den nächsten Seitenanfang schieben (alles darunter rückt mit).
// Blöcke bis 150 % Seitenhöhe werden auf Seitenhöhe verkleinert; feste Umbrüche wandern mit.
function arrangeCompute() {
  const ph = pageH();
  const list = els.map(e => ({ e, b: bbox(e) })).sort((a, c) => a.b.y - c.b.y);
  const clusters = [];
  for (const it of list) {
    const cur = clusters[clusters.length - 1];
    if (cur && it.b.y <= cur.y1 + 1) { cur.items.push(it.e); cur.y1 = Math.max(cur.y1, it.b.y + it.b.h); cur.x0 = Math.min(cur.x0, it.b.x); }
    else clusters.push({ items: [it.e], y0: it.b.y, y1: it.b.y + it.b.h, x0: it.b.x });
  }
  const events = [...clusters.map(c => ({ c, y: c.y0, k: 1 })), ...mb.map(m => ({ m, y: m, k: 0 }))].sort((a, c) => a.y - c.y || a.k - c.k);
  let pageStart = 0, offset = 0, lastBottom = 0, moved = false;
  const map = new Map(), newMb = [];
  for (const ev of events) {
    if (ev.k === 0) {
      const ny = Math.max(ev.m + offset, lastBottom + 2);
      while (ny > pageStart + ph) pageStart += ph;
      pageStart = ny; newMb.push(r1(ny));
      if (Math.abs(ny - ev.m) > .5) moved = true;
      continue;
    }
    const c = ev.c, h = c.y1 - c.y0;
    const s = (h > ph * 0.98 && h <= ph * 1.5) ? ph * 0.98 / h : 1, hh = h * s;
    let top = Math.max(c.y0 + offset, lastBottom);
    while (top >= pageStart + ph) pageStart += ph;
    if (top + hh > pageStart + ph && hh <= ph) {
      if (lastBottom <= pageStart + 1) top = pageStart + 2;   // Seite ist noch leer: an ihren Anfang hochziehen
      else { pageStart += ph; top = pageStart + 2; }          // sonst auf die nächste Seite
    }
    if (s !== 1 || Math.abs(top - c.y0) > .5) {
      moved = true;
      const f = (x, y) => [c.x0 + s * (x - c.x0), top + s * (y - c.y0)];
      for (const e of c.items) map.set(e.id, mapEl(e, f, s));
    }
    offset = top + hh - c.y1; lastBottom = top + hh;
  }
  const newH = Math.max(Math.ceil(H + Math.max(0, offset)), Math.ceil(lastBottom + 40));
  return { els: map.size ? replaceEls(map) : els, H: newH, mb: newMb, moved };
}
function applyArrange(r) {
  els = r.els; mb = r.mb; breakCache = null;
  if (r.H !== H) { H = r.H; applySize(); }
  pruneSel(); render();
}
function arrangeForPrint() {
  if (editing) commitEdit();
  if (!els.length) return toast('Nichts anzuordnen');
  const r = arrangeCompute();
  if (!r.moved) return toast('Schon druckfertig – kein Umbruch schneidet etwas', 1800);
  commitChange(snapshot()); applyArrange(r);
  toast('Für den Druck angeordnet (Z: rückgängig)', 2000);
}
// ---- feste Seitenumbrüche
let mb = [];
function toggleManualBreak(y) {
  const tol = 10 / scale(), hitI = mb.findIndex(m => Math.abs(m - y) < tol);
  commitChange(snapshot());
  mb = hitI >= 0 ? mb.filter((_, i) => i !== hitI) : [...mb, r1(y)].sort((a, c) => a - c);
  breakCache = null; drawUi();
  toast(hitI >= 0 ? 'Fester Umbruch entfernt' : 'Fester Umbruch gesetzt', 900);
}
// Umbrüche: ideal nach einer vollen Seite; liegt dort ein Element, rückt der Umbruch nach oben
// an den oberen Rand dieses Elements (höchstens bis zur halben Seite), sonst harter Schnitt.
let breakCache = null;
function pageBreaks() {
  const key = els.length + '|' + H + '|' + W + '|' + pageFmt;
  if (breakCache && breakCache.els === els && breakCache.mb === mb && breakCache.key === key) return breakCache.b;
  const ph = pageH(), boxes = els.map(bbox), b = [];
  const crosses = c => boxes.some(q => q.y + 1 < c && q.y + q.h - 1 > c);
  const forced = mb.filter(m => m > 1 && m < H - 1);
  b.forced = new Set();
  let y = 0;
  for (;;) {
    const f = forced.find(m => m > y + 1);
    if (f !== undefined && f <= y + ph) { b.push(f); b.forced.add(f); y = f; continue; }
    if (y + ph >= H - 1) break;
    const ideal = y + ph, lo = y + ph * 0.5;
    let cut = ideal;
    if (crosses(ideal)) {
      const cands = boxes.map(q => q.y - 3).filter(c => c > lo && c < ideal).sort((a, c) => c - a);
      const ok = cands.find(c => !crosses(c));
      if (ok !== undefined) cut = ok;
    }
    b.push(cut); y = cut;
  }
  breakCache = { els, mb, key, b };
  return b;
}
function buildPrint() {
  if (editing) commitEdit();
  const area = $('printArea'); area.textContent = '';
  const box = unionBox(els), end = box ? box.y + box.h + 2 : 1;
  const cuts = [0, ...pageBreaks().filter(c => c < end), Math.max(end, 1)];
  const ph = pageH();
  for (let i = 0; i < cuts.length - 1; i++) {
    const y0 = cuts[i], y1 = cuts[i + 1];
    const pg = document.createElement('div'); pg.className = 'pp';
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', `0 ${y0} ${W} ${ph}`);           // immer volle Seitenhöhe -> gleicher Maßstab
    s.setAttribute('preserveAspectRatio', 'xMidYMin meet');
    const defs = mk('defs', null, s), cp = mk('clipPath', { id: 'pc' + i }, defs);
    mk('rect', { x: 0, y: y0, width: W, height: y1 - y0 }, cp);
    const g = mk('g', { 'clip-path': `url(#pc${i})` }, s);
    for (const layer of [gInk, gTxt]) for (const n of layer.children) {
      const q = n._el && bbox(n._el);
      if (q && q.y < y1 && q.y + q.h > y0) { const c = n.cloneNode(true); c.style.visibility = ''; g.appendChild(c); }
    }
    pg.appendChild(s); area.appendChild(pg);
  }
}
window.addEventListener('beforeprint', buildPrint);
window.addEventListener('afterprint', () => { $('printArea').textContent = ''; });

function applySize() {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.height = (H * scale()) + 'px';
  drawGrid();
  drawUi();
  if (editing) placeEditor();
}

// ---- Auswahl-Overlay
let uiRubber = null;
function handleSize() { return 9 / scale(); }
function selList() { return els.filter(e => sel.has(e.id)); }
function drawUi() {
  scheduleSync(); syncSelGroup();
  gUi.textContent = '';
  const pb = pageBreaks();
  pb.forEach((y, i) => {
    const fx = pb.forced.has(y);
    mk('line', { class: 'page-line' + (fx ? ' forced' : ''), x1: 0, x2: W, y1: y, y2: y }, gUi);
    const t = mk('text', { class: 'page-label' + (fx ? ' forced' : ''), x: W - 6, y: y + 14 / scale(), 'text-anchor': 'end', 'font-size': 11 / scale() }, gUi);
    t.textContent = 'Seite ' + (i + 2) + (fx ? ' · fester Umbruch' : '');
  });
  if (uiRubber) mk('rect', { class: 'sel-rubber', ...uiRubber }, gUi);
  const b = unionBox(selList());
  if (!b || mode !== 'select') return;
  const pad = 4 / scale();
  const B = { x: b.x - pad, y: b.y - pad, w: b.w + 2*pad, h: b.h + 2*pad };
  mk('rect', { class: 'sel-box', x: B.x, y: B.y, width: B.w, height: B.h }, gUi);
  const hs = handleSize();
  handlePts(B).forEach(([x, y], i) => {
    if (i % 2 === 0) mk('rect', { class: 'handle', x: x - hs/2, y: y - hs/2, width: hs, height: hs, 'data-h': i }, gUi);
    else mk('circle', { class: 'handle free', cx: x, cy: y, r: hs / 2, 'data-h': i }, gUi);
  });
}
function handlePts(B) {
  const { x, y, w, h } = B;
  return [[x, y], [x + w/2, y], [x + w, y], [x + w, y + h/2], [x + w, y + h], [x + w/2, y + h], [x, y + h], [x, y + h/2]];
}

// ===================================================================== Änderungen / Undo
function snapshot() { return { els, H, mb, fmt: pageFmt }; }
function commitChange(before) {
  undoStack.push(before); if (undoStack.length > 300) undoStack.shift();
  redoStack = []; setDirty(true);
}
function change(newEls, newH) {
  commitChange(snapshot());
  els = newEls; if (newH !== undefined && newH !== H) { H = newH; applySize(); }
  pruneSel(); render();
}
function restore(s) {
  els = s.els; mb = s.mb || []; breakCache = null;
  if (s.fmt && s.fmt !== pageFmt) { pageFmt = s.fmt; setPageStyle(); syncPanel(); try { localStorage.setItem('wb2.fmt', pageFmt); } catch (e) {} }
  if (s.H !== H) { H = s.H; applySize(); } else drawUi();
  pruneSel(); render(); setDirty(true);
}
function undo() { if (editing) commitEdit(); if (!undoStack.length) return toast('Nichts rückgängig zu machen'); redoStack.push(snapshot()); restore(undoStack.pop()); }
function redo() { if (!redoStack.length) return toast('Nichts zu wiederholen'); undoStack.push(snapshot()); restore(redoStack.pop()); }
function pruneSel() { const ids = new Set(els.map(e => e.id)); for (const id of [...sel]) if (!ids.has(id)) sel.delete(id); }
function setDirty(v) { dirty = v; document.title = (v ? '• ' : '') + (fileName ? fileName.replace(/\.svg$/i, '') + ' – ' : '') + 'TERBiBOARD' + (IS_MIRROR ? ' (2. Fenster)' : ''); }
function replaceEls(map) { return els.map(e => map.has(e.id) ? map.get(e.id) : e); }

// Ziel für H/K/F/R/L: Auswahl, sonst letzter Strich
function targets(strokesOnly) {
  let list = selList();
  if (!list.length) {
    const last = els.find(e => e.id === lastStrokeId) || [...els].reverse().find(e => e.t === 's');
    list = last ? [last] : [];
  }
  return strokesOnly ? list.filter(e => e.t === 's') : list;
}
function applyStrokeOp(fn, name) {
  const list = targets(true);
  if (!list.length) return toast('Kein Strich vorhanden');
  const m = new Map(list.map(e => [e.id, fn(e)]));
  change(replaceEls(m));
}
function rotate(cw) {
  const list = targets(false);
  if (!list.length) return;
  const b = unionBox(list), cx = b.x + b.w/2, cy = b.y + b.h/2;
  change(replaceEls(new Map(list.map(e => [e.id, rotateEl(e, cx, cy, cw)]))));
}
function setColor(c) {
  color = c; syncPanel();
  if (editing) { editing.c = c; ta.style.color = c; sendEditPreview(); return; }
  const list = selList().filter(e => e.t !== 'i');
  if (list.length && mode === 'select') change(replaceEls(new Map(list.map(e => [e.id, { ...e, c }]))));
}
function bigger(f, which) { // which: 'stroke' | 'text' | undefined(auto)
  const list = selList().filter(e => e.t !== 'i');
  if (list.length && mode === 'select' && !which) {
    change(replaceEls(new Map(list.map(e => [e.id, e.t === 's' ? { ...e, w: r2(clamp(e.w * f, .3, 80)) } : { ...e, s: r1(clamp(e.s * f, 4, 400)) }]))));
    return;
  }
  if (which === 'text' || (!which && mode === 'text')) {
    fontSize = Math.round(clamp(fontSize * f, 8, 200));
    if (editing) { editing.s = fontSize; placeEditor(); }
  } else { strokeW = r1(clamp(strokeW * f, .5, 40)); hlMode = false; }
  syncPanel(); toast(`Strich ${strokeW} · Schrift ${fontSize}`, 900);
}
function deleteSel() {
  if (sel.size) { const ids = new Set(sel); sel.clear(); change(els.filter(e => !ids.has(e.id))); }
  else if (els.length) change(els.slice(0, -1));
}
function selectAll() { setMode('select'); sel = new Set(els.map(e => e.id)); drawUi(); }

// ---- Zwischenablage (intern)
function copySel(cut) {
  const list = selList();
  if (!list.length) return toast('Nichts ausgewählt');
  clip = list; pasteCount = 0;
  if (cut) { const ids = new Set(sel); sel.clear(); change(els.filter(e => !ids.has(e.id))); }
  toast(cut ? 'Ausgeschnitten' : 'Kopiert', 900);
}
function pasteInternal() {
  if (!clip || !clip.length) return toast('Zwischenablage leer');
  pasteCount++;
  const b = unionBox(clip), v = viewRect();
  // in den sichtbaren Bereich holen, wenn das Original nicht sichtbar ist
  let dx = 20 * pasteCount, dy = 20 * pasteCount;
  if (b.y + dy < v.y || b.y + dy > v.y + v.h - 20) dy = v.y + 40 * pasteCount - b.y;
  const add = clip.map(e => ({ ...mapEl(e, (x, y) => [x + dx, y + dy], 1), id: nid() }));
  insertAndSelect(add);
}
function insertAndSelect(add) {
  const bottom = Math.max(...add.map(e => { const b = bbox(e); return b.y + b.h; }));
  change([...els, ...add], bottom + 40 > H ? Math.ceil(bottom + 80) : undefined);
  setMode('select'); sel = new Set(add.map(e => e.id)); render();
}

// ===================================================================== Textfelder bearbeiten
let editing = null;            // {id, x, y, s, c, isNew, orig}
const ta = document.createElement('textarea');
ta.className = 'wbedit'; ta.spellcheck = false; ta.setAttribute('wrap', 'off');

function startEdit(el, x, y, tw) {
  if (editing) commitEdit();
  sel.clear();
  editing = el ? { id: el.id, x: el.x, y: el.y, s: el.s, c: el.c, tw: el.tw || 0, isNew: false, orig: el }
               : { id: nid(), x: r1(x), y: r1(y), s: fontSize, c: color, tw: tw ? r1(tw) : 0, isNew: true, orig: null };
  ta.setAttribute('wrap', editing.tw ? 'soft' : 'off');
  ta.style.whiteSpace = editing.tw ? 'pre-wrap' : 'pre';
  ta.style.overflowWrap = editing.tw ? 'break-word' : 'normal';
  ta.value = el ? el.txt : '';
  const n = nodes.get(editing.id); if (n) n.style.visibility = 'hidden';
  cont.appendChild(ta);
  placeEditor();
  ta.focus({ preventScroll: true });
  drawUi();
}
function placeEditor() {
  if (!editing) return;
  const s = scale();
  Object.assign(ta.style, { left: editing.x * s - 3 + 'px', top: editing.y * s - 1 + 'px', fontSize: editing.s + 'px',
    color: editing.c, transform: `scale(${s})` });
  autosize();
}
function autosize() {
  ta.style.height = '0px';
  if (editing.tw) ta.style.width = (editing.tw + 4) + 'px';      // feste Breite, Text bricht um
  else { ta.style.width = '0px'; ta.style.width = (ta.scrollWidth + editing.s) + 'px'; }
  ta.style.height = (ta.scrollHeight + 2) + 'px';
  sendEditPreview();
}
// ---- Live-Text fürs zweite Fenster: beim Tippen wird nur eine kleine Vorschau-Nachricht geschickt
let previewTimer = 0, previewLast = 0;
function sendEditPreview() {
  if (!peer || !editing || previewTimer) return;
  const wait = Math.max(0, 100 - (performance.now() - previewLast));   // höchstens ~10 Nachrichten/s
  previewTimer = setTimeout(() => {
    previewTimer = 0; previewLast = performance.now();
    if (!editing) return;
    const e = editing;
    post({ type: 'editPreview', id: e.id, x: e.x, y: e.y, s: e.s, c: e.c, tw: e.tw || 0, txt: ta.value });
  }, wait);
}
const previews = new Map();               // Empfänger: id -> {node, done, timer}
function showPreview(m) {
  let p = previews.get(m.id);
  if (m.done) {                            // fertig: Vorschau weg, sobald das echte Element da ist (spätestens nach 1,5 s)
    if (p) { p.done = true; clearTimeout(p.timer); p.timer = setTimeout(() => dropPreview(m.id), 1500); }
    return;
  }
  const el = { id: m.id, t: 't', x: m.x, y: m.y, s: m.s, c: m.c, txt: m.txt || ' ' };
  if (m.tw) el.tw = m.tw;
  const n = buildNode(el); n.classList.add('preview'); n._el = null;
  if (p) p.node.replaceWith(n); else { gTxt.appendChild(n); p = {}; previews.set(m.id, p); }
  p.node = n; p.done = false; clearTimeout(p.timer);
  p.timer = setTimeout(() => dropPreview(m.id), 30000);   // Sicherheitsnetz, falls das andere Fenster weg ist
  measureText(n);
  const orig = nodes.get(m.id); if (orig) orig.style.visibility = 'hidden';
}
function dropPreview(id) {
  const p = previews.get(id); if (!p) return;
  clearTimeout(p.timer); p.node.remove(); previews.delete(id);
  const orig = nodes.get(id); if (orig && !(editing && editing.id === id)) orig.style.visibility = '';
}
function commitEdit() {
  if (!editing) return;
  const ed = editing; editing = null;
  clearTimeout(previewTimer); previewTimer = 0;
  post({ type: 'editPreview', id: ed.id, done: true });
  const txt = ta.value.replace(/\s+$/, '');
  ta.remove();
  const n = nodes.get(ed.id); if (n) n.style.visibility = '';
  if (ed.isNew) {
    if (txt) { const t = { id: ed.id, t: 't', x: ed.x, y: ed.y, s: ed.s, c: ed.c, txt }; if (ed.tw) t.tw = ed.tw; change([...els, t]); }
  } else if (!txt) change(els.filter(e => e.id !== ed.id));
  else if (txt !== ed.orig.txt || ed.c !== ed.orig.c || ed.s !== ed.orig.s)
    change(replaceEls(new Map([[ed.id, { ...ed.orig, txt, c: ed.c, s: ed.s }]])));
  else render();
  const b = els.find(e => e.id === ed.id);
  if (b) { const bb = bbox(b); if (bb.y + bb.h + 40 > H) { H = Math.ceil(bb.y + bb.h + 120); applySize(); } }
}
ta.addEventListener('input', autosize);
ta.addEventListener('keydown', e => {
  if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); commitEdit(); }
  e.stopPropagation();
});
ta.addEventListener('blur', () => setTimeout(() => { if (editing && document.activeElement !== ta) commitEdit(); }, 0));
ta.addEventListener('pointerdown', e => e.stopPropagation());

function textAt() { // Einfügeposition für Text/Bilder: letzte Zeigerposition, sonst oben links im Sichtbereich
  const v = viewRect();
  const p = (lastPointer && lastPointer.y > v.y && lastPointer.y < v.y + v.h - 20) ? { ...lastPointer } : { x: 40, y: v.y + 40 };
  // nicht auf vorhandene Texte/Bilder legen: unterhalb ausweichen
  for (let k = 0; k < 50; k++) {
    const o = els.find(e => e.t !== 's' && (() => { const b = bbox(e); return p.x >= b.x - 10 && p.x <= b.x + b.w && p.y >= b.y - 10 && p.y <= b.y + b.h; })());
    if (!o) break;
    const b = bbox(o); p.y = b.y + b.h + 12;
  }
  return p;
}
function insertText(txt, at) {
  txt = txt.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').replace(/\s+$/, '');
  if (!txt) return;
  const p = at || textAt();
  insertAndSelect([{ id: nid(), t: 't', x: r1(p.x), y: r1(p.y), s: fontSize, c: color, txt }]);
}

// ===================================================================== Bilder
function readAsDataURL(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}
// v9.0: Rasterbilder werden beim Einfügen auf Wunsch verkleinert und passend kodiert
// (Bilder mit Transparenz -> PNG, sonst die kleinere Fassung aus JPEG und PNG). Nie größer als das Original.
const IMG_TIERS = [['orig', 'Original', 0], ['large', 'Groß', 1920], ['medium', 'Mittel', 1280], ['small', 'Klein', 800]];
const IMGQ_LABEL = { ask: 'Bildgröße: fragen', orig: 'Bildgröße: Original', large: 'Bildgröße: groß', medium: 'Bildgröße: mittel', small: 'Bildgröße: klein' };
const IMGQ_CYCLE = ['ask', 'medium', 'large', 'small', 'orig'];
const IMG_JPEG_Q = .82;
const isRasterHref = h => /^data:image\/(png|jpe?g|webp|bmp)/i.test(h);
const fmtSize = n => n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
const nextFrame = () => new Promise(r => setTimeout(r, 0));
const imgDims = b => [b.naturalWidth || b.width, b.naturalHeight || b.height];
let imgPref = 'ask', imgLast = 'medium', imgDlgDone = null;
try { const v = localStorage.getItem('wb2.imgq'); if (IMGQ_LABEL[v]) imgPref = v; } catch (e) {}
function setImgPref(k) { imgPref = k; try { localStorage.setItem('wb2.imgq', k); } catch (e) {} syncPanel(); }
function cycleImgPref() {
  setImgPref(IMGQ_CYCLE[(IMGQ_CYCLE.indexOf(imgPref) + 1) % IMGQ_CYCLE.length]);
  toast(IMGQ_LABEL[imgPref] + (imgPref === 'ask' ? ' (Abfrage beim Einfügen)' : ' – gilt für alle neu eingefügten Bilder'), 2000);
}
async function decodeImage(src) {               // src: Blob/File oder data-URL
  const blob = typeof src === 'string' ? await (await fetch(src)).blob() : src;
  if (window.createImageBitmap) { try { return await createImageBitmap(blob); } catch (e) { /* Ersatzweg */ } }
  const url = URL.createObjectURL(blob), img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return img;
}
function recodeImage(bmp, maxPx) {              // -> { href, w, h }
  const [w0, h0] = imgDims(bmp), f = maxPx ? Math.min(1, maxPx / Math.max(w0, h0)) : 1;
  const w = Math.max(1, Math.round(w0 * f)), h = Math.max(1, Math.round(h0 * f));
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, w, h);
  const png = cv.toDataURL('image/png'), d = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 255) return { href: png, w, h };   // Transparenz -> PNG
  const jpg = cv.toDataURL('image/jpeg', IMG_JPEG_Q);
  return { href: jpg.length < png.length ? jpg : png, w, h };
}
async function imageTier(bmp, orig, key) {
  const t = IMG_TIERS.find(x => x[0] === key) || IMG_TIERS[2];
  if (!t[2]) return { href: orig };
  await nextFrame();
  try { const r = recodeImage(bmp, t[2]); return r.href.length < orig.length ? r : { href: orig }; }
  catch (err) { return { href: orig }; }
}
function askImageSize(bmp, orig) {             // Dialog „Bild einfügen – Größe“; liefert {href} oder null (abgebrochen)
  if (imgDlgDone) imgDlgDone(null);
  return new Promise(resolve => {
    const [w0, h0] = imgDims(bmp), big = Math.max(w0, h0), tiers = [], seen = new Set();
    for (const [k, lab, max] of IMG_TIERS) {   // Stufen oberhalb der Originalgröße zu einer zusammenfassen
      const px = max ? Math.min(max, big) : big;
      if (max) { if (seen.has(px)) continue; seen.add(px); }
      tiers.push([k, lab, px]);
    }
    let pick = tiers.some(t => t[0] === imgLast) ? imgLast : tiers[Math.min(1, tiers.length - 1)][0], finished = false;
    const box = $('imgOpts'), res = {}; let chain = Promise.resolve();
    box.textContent = '';
    const mark = () => box.querySelectorAll('.imgopt').forEach(b => b.classList.toggle('on', b.dataset.k === pick));
    const finish = r => { if (finished) return; finished = true; imgDlgDone = null; $('dlgImg').classList.remove('open'); resolve(r); };
    const go = async () => {
      if (finished) return;
      const k = pick; imgLast = k;
      if ($('imgRemember').checked) setImgPref(k);
      $('imgGo').disabled = true; $('imgGo').textContent = 'Berechne …';
      const r = await res[k];
      $('imgGo').disabled = false; $('imgGo').textContent = 'Einfügen';
      finish(r);
    };
    for (const [k, lab, px] of tiers) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'imgopt'; b.dataset.k = k;
      const ph = Math.max(1, Math.round(px * Math.min(w0, h0) / big));
      const dim = w0 >= h0 ? `${px} × ${ph} px` : `${ph} × ${px} px`;
      b.innerHTML = `<b>${lab}</b><span>${dim}${k !== 'orig' && px === big ? ' · nur Format' : ''}</span><span class="sz">${k === 'orig' ? fmtSize(orig.length) : '…'}</span>`;
      b.addEventListener('click', () => { pick = k; mark(); });
      b.addEventListener('dblclick', () => { pick = k; mark(); go(); });
      box.appendChild(b);
      res[k] = chain = chain.then(() => finished && k !== pick ? { href: orig } : imageTier(bmp, orig, k)).then(r => {
        if (k !== 'orig') b.querySelector('.sz').textContent = r.href === orig ? fmtSize(orig.length) + ' (= Original)'
          : `${fmtSize(r.href.length)} (−${Math.round(100 - r.href.length / orig.length * 100)} %)`;
        return r;
      });
    }
    mark();
    $('imgInfo').textContent = `Originalbild: ${w0} × ${h0} px · ${fmtSize(orig.length)} in der Datei`;
    $('imgRemember').checked = false;
    $('imgGo').onclick = go; $('imgCancel').onclick = () => finish(null);
    imgDlgDone = finish;
    openDialog('dlgImg'); setTimeout(() => $('imgGo').focus(), 0);
  });
}
new MutationObserver(() => { if (imgDlgDone && !$('dlgImg').classList.contains('open')) imgDlgDone(null); })
  .observe($('dlgImg'), { attributes: true, attributeFilter: ['class'] });

async function insertImageFile(file) {
  const orig = await readAsDataURL(file);
  let href = orig, dims;
  if (isRasterHref(orig)) {
    const bmp = await decodeImage(file);
    dims = imgDims(bmp);
    let r;
    if (Math.max(...dims) <= 800 && orig.length < 200 * 1024) {     // kleines Bild: nicht fragen, nur Format prüfen
      await nextFrame();
      try { const c = recodeImage(bmp, 0); r = c.href.length < orig.length * .9 ? c : { href: orig }; } catch (err) { r = { href: orig }; }
    } else if (imgPref !== 'ask') {
      toast('Bild wird verkleinert …', 20000);
      r = await imageTier(bmp, orig, imgPref);
      toast(r.href === orig ? 'Bild eingefügt' : `Bild verkleinert: ${fmtSize(orig.length)} → ${fmtSize(r.href.length)}`, 2200);
    } else r = await askImageSize(bmp, orig);
    if (!r) return;                                                  // Dialog abgebrochen
    href = r.href;
  } else {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = href; });
    dims = [img.naturalWidth, img.naturalHeight];
  }
  const v = viewRect();
  let w = dims[0] || 300, h = dims[1] || 200;                        // Anzeigegröße wie beim Original
  const f = Math.min(1, (W * .6) / w, (v.h * .7) / h); w *= f; h *= f;
  const p = textAt();
  insertAndSelect([{ id: nid(), t: 'i', x: r1(clamp(p.x, 0, W - w)), y: r1(p.y), w: r1(w), h: r1(h), href }]);
}
// v9.0: alle Bilder auf ihre angezeigte Größe herunterrechnen (×2 für scharfen Druck/Beamer); rückgängig machbar
async function optimizeImages() {
  if (editing) commitEdit();
  const list = els.filter(e => e.t === 'i' && isRasterHref(e.href));
  if (!list.length) return toast('Keine Bilder im TERBiBOARD');
  const groups = new Map();                     // gleiches Bild nur einmal rechnen (größte Anzeige zählt)
  for (const e of list) groups.set(e.href, Math.max(groups.get(e.href) || 0, Math.max(400, Math.ceil(Math.max(e.w, e.h) * 2))));
  const repl = new Map(); let before = 0, after = 0, k = 0;
  for (const [href, target] of groups) {
    toast(`Prüfe Bild ${++k} von ${groups.size} …`, 60000);
    before += href.length; let out = href;
    try {
      const bmp = await decodeImage(href), big = Math.max(...imgDims(bmp));
      if (big > target * 1.1 || /^data:image\/png/i.test(href)) {
        await nextFrame();
        const r = recodeImage(bmp, Math.min(target, big));
        if (r.href.length < href.length * .85) out = r.href;
      }
    } catch (err) { /* Bild unverändert lassen */ }
    after += out.length; if (out !== href) repl.set(href, out);
  }
  if (!repl.size) return toast('Die Bilder sind bereits passend verkleinert', 2500);
  toast('', 1);
  if (!confirm(`${repl.size} von ${groups.size} Bild(ern) verkleinern?\n\nBilder insgesamt: ${fmtSize(before)} → ${fmtSize(after)}\n\n`
    + 'Die Bilder werden auf ihre angezeigte Größe heruntergerechnet (doppelte Auflösung für scharfen Druck). '
    + 'Mit Z lässt sich das rückgängig machen, solange das Board offen ist.')) return;
  change(els.map(e => e.t === 'i' && repl.has(e.href) ? { ...e, href: repl.get(e.href) } : e));
  toast(`Bilder verkleinert: ${fmtSize(before)} → ${fmtSize(after)}`, 2500);
}

// ===================================================================== Zeiger
let drag = null;               // laufende Aktion
let penActive = false;

svg.addEventListener('pointerdown', e => {
  if (e.button === 2) return;
  const P = toLogical(e); lastPointer = P;
  if (e.pointerType === 'touch' && (penActive || drag)) return;            // Handballen ignorieren
  if (e.pointerType === 'pen') penActive = true;
  if (editing) { commitEdit(); if (mode !== 'text') return; }
  closeDialogs(true);
  if (e.pointerType === 'touch' && !fingerDraw && mode !== 'text') {   // im Text-Werkzeug zieht auch der Finger ein Textfeld auf
    drag = { kind: 'scroll', id: e.pointerId, y0: e.clientY, s0: cont.scrollTop };
    svg.setPointerCapture(e.pointerId); return;
  }
  e.preventDefault();
  svg.setPointerCapture(e.pointerId);
  const tol = 6 / scale();
  const eraser = (e.buttons & 32) || e.button === 5;
  // Linienradierer (D, Stift-Radiertaste): nur Striche · Objektradierer (Shift+D): nur Texte/Bilder/PDF-Seiten
  if (eraser || mode === 'erase' || mode === 'erase2') {
    const only = (mode === 'erase2' && !eraser) ? (el => el.t !== 's') : (el => el.t === 's');
    drag = { kind: 'erase', id: e.pointerId, before: snapshot(), changed: false, only }; eraseAt(P, tol); return;
  }

  if (mode === 'draw') {
    if (sel.size) { sel.clear(); drawUi(); }
    const p = hlMode ? .5 : pressureOf(e);
    const node = mk('path', { fill: color }, gInk);
    if (hlMode) hlStyle(node);
    // Live-Zeichnen: fertige Abschnitte werden „eingefroren“, nur das Ende wird pro Bildschirmbild neu berechnet
    drag = { kind: 'draw', id: e.pointerId, pts: [[r1(P.x), r1(P.y), p]], node, c: color, w: strokeW, hl: hlMode, frozen: [], start: 0, pred: [], raf: 0 };
    node.setAttribute('d', outline(drag.pts, strokeW));
    return;
  }
  if (mode === 'pbreak') { toggleManualBreak(P.y); drag = null; return; }
  if (mode === 'text') {
    const t = topHit(P.x, P.y, tol);
    if (t && t.t === 't') { startEdit(t); return; }
    // Klick = Textfeld mit freier Breite; Ziehen = Textfeld mit fester Breite (Umbruch)
    drag = { kind: 'textbox', id: e.pointerId, P0: P };
    return;
  }
  // Auswahl
  const hEl = e.target.closest && e.target.closest('.handle');
  const b = unionBox(selList());
  if (hEl && b) {
    const pad = 4 / scale(), B = { x: b.x - pad, y: b.y - pad, w: b.w + 2*pad, h: b.h + 2*pad };
    const i = +hEl.getAttribute('data-h'), hp = handlePts(B);
    const only = selList();
    if (only.length === 1 && only[0].t === 't' && (i === 3 || i === 7)) {   // Seitengriff am Textfeld: Breite ändern
      drag = { kind: 'twidth', id: e.pointerId, i, el0: only[0], w0: bbox(only[0]).w, before: snapshot() };
      return;
    }
    drag = { kind: 'scale', id: e.pointerId, i, A: hp[(i + 4) % 8], C: hp[i], orig: selList(), before: snapshot() };
    return;
  }
  const t = topHit(P.x, P.y, tol);
  if (t && e.shiftKey) { sel.has(t.id) ? sel.delete(t.id) : sel.add(t.id); drawUi(); return; }
  const inBox = b && P.x >= b.x - tol && P.x <= b.x + b.w + tol && P.y >= b.y - tol && P.y <= b.y + b.h + tol;
  if (t && !sel.has(t.id) && !inBox) { sel = new Set([t.id]); drawUi(); }
  if (t || inBox) { drag = { kind: 'move', id: e.pointerId, P0: P, orig: selList(), before: snapshot(), moved: false }; return; }
  sel = e.shiftKey ? sel : new Set();
  drag = { kind: 'rubber', id: e.pointerId, P0: P, keep: new Set(sel) };
  drawUi();
});

// Kein Stiftdruck: alle Stifte zeichnen in gleichmäßiger Breite (Wunsch v8.4)
function pressureOf(e) { return .5; }

svg.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) { if (!drag) lastPointer = toLogical(e); return; }
  e.preventDefault();
  if (drag.kind === 'scroll') { cont.scrollTop = drag.s0 - (e.clientY - drag.y0); return; }
  const P = toLogical(e);
  switch (drag.kind) {
    case 'draw': {
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      const minD = .9 / scale();                       // ca. 1 Bildschirmpixel Mindestabstand
      for (const ev of (evs.length ? evs : [e])) {
        const q = toLogical(ev), last = drag.pts[drag.pts.length - 1];
        if (Math.hypot(q.x - last[0], q.y - last[1]) < minD) continue;
        drag.pts.push([r1(q.x), r1(q.y), drag.hl ? .5 : pressureOf(ev)]);   // Textmarker: gleichmäßige Breite   // schon hier gerundet = exakt die gespeicherte Form
      }
      // vorhergesagte Punkte (nur Anzeige) verringern die gefühlte Verzögerung
      drag.pred = (e.getPredictedEvents ? e.getPredictedEvents() : []).slice(0, 2).map(ev => { const q = toLogical(ev); return [q.x, q.y, pressureOf(ev)]; });
      if (!drag.raf) drag.raf = requestAnimationFrame(() => liveStroke(drag));
      break;
    }
    case 'erase': eraseAt(P, 6 / scale()); break;
    case 'move': {
      const dx = P.x - drag.P0.x, dy = P.y - drag.P0.y;
      if (!drag.moved && Math.hypot(dx, dy) * scale() < 3) return;
      drag.moved = true;
      const m = new Map(drag.orig.map(el => [el.id, mapEl(el, (x, y) => [x + dx, y + dy], 1)]));
      els = replaceEls(m); render();
      break;
    }
    case 'scale': {
      const { A, C, i } = drag;
      let sx = 1, sy = 1;
      if (i % 2 === 0) {
        const vx = C[0] - A[0], vy = C[1] - A[1];
        sx = sy = Math.max(.05, ((P.x - A[0]) * vx + (P.y - A[1]) * vy) / (vx*vx + vy*vy || 1));
      } else if (i === 1 || i === 5) sy = (P.y - A[1]) / ((C[1] - A[1]) || 1);
      else sx = (P.x - A[0]) / ((C[0] - A[0]) || 1);
      if (Math.abs(sx) < .02) sx = .02 * Math.sign(sx || 1);
      if (Math.abs(sy) < .02) sy = .02 * Math.sign(sy || 1);
      const geo = Math.sqrt(Math.abs(sx * sy));
      const f = (x, y) => [A[0] + sx * (x - A[0]), A[1] + sy * (y - A[1])];
      els = replaceEls(new Map(drag.orig.map(el => [el.id, mapEl(el, f, geo)]))); render();
      break;
    }
    case 'textbox': {
      const x = Math.min(P.x, drag.P0.x), w = Math.abs(P.x - drag.P0.x), fh = fontSize * 1.25;
      uiRubber = w * scale() > 8 ? { x, y: drag.P0.y - fh * .62, width: w, height: fh * 2 } : null;
      drawUi();
      break;
    }
    case 'twidth': {
      const el = drag.el0, right = el.x + drag.w0;
      const o = drag.i === 3 ? { ...el, tw: r1(Math.max(30, P.x - el.x)) }
                             : { ...el, x: r1(Math.min(P.x, right - 30)), tw: r1(right - Math.min(P.x, right - 30)) };
      els = replaceEls(new Map([[el.id, o]])); render();
      break;
    }
    case 'rubber': {
      const x = Math.min(P.x, drag.P0.x), y = Math.min(P.y, drag.P0.y), w = Math.abs(P.x - drag.P0.x), h = Math.abs(P.y - drag.P0.y);
      uiRubber = { x, y, width: w, height: h };
      sel = new Set(drag.keep);
      for (const el of els) {
        const b = bbox(el);
        const inside = b.x >= x && b.y >= y && b.x + b.w <= x + w && b.y + b.h <= y + h;
        const touches = el.t === 's'
          ? el.pts.some(q => q[0] >= x && q[0] <= x + w && q[1] >= y && q[1] <= y + h)
          : !(b.x > x + w || b.x + b.w < x || b.y > y + h || b.y + b.h < y);
        if (inside || touches) sel.add(el.id);
      }
      drawUi();
      break;
    }
  }
});

function endDrag(e) {
  if (!drag || e.pointerId !== drag.id) return;
  if (e.pointerType === 'pen') penActive = false;
  const d = drag; drag = null;
  switch (d.kind) {
    case 'draw': {
      cancelAnimationFrame(d.raf);
      d.node.remove(); d.frozen.forEach(n => n.remove());
      const pts = d.pts.map(q => [q[0], q[1], r2(q[2])]);   // keine Nachbearbeitung: Form bleibt wie gezeichnet
      const el = { id: nid(), t: 's', pts, c: d.c, w: d.w };
      if (d.hl) el.hl = 1;
      lastStrokeId = el.id;
      const bottom = Math.max(...pts.map(q => q[1]));
      change([...els, el], bottom > H - 60 ? Math.ceil(H + cont.clientHeight / scale() * .5) : undefined);
      break;
    }
    case 'erase': if (d.changed) commitChange(d.before); break;
    case 'move': case 'scale':
      if (d.kind === 'scale' || d.moved) {
        commitChange(d.before);
        const b = unionBox(selList()); if (b && b.y + b.h + 40 > H) { H = Math.ceil(b.y + b.h + 120); applySize(); }
      }
      break;
    case 'rubber': uiRubber = null; drawUi(); break;
    case 'textbox': {
      uiRubber = null;
      const P = toLogical(e), w = Math.abs(P.x - d.P0.x);
      const y = d.P0.y - fontSize * .62;
      if (w * scale() > 8) startEdit(null, Math.min(P.x, d.P0.x), y, w);
      else startEdit(null, d.P0.x, y);
      break;
    }
    case 'twidth': commitChange(d.before); break;
  }
}
svg.addEventListener('pointerup', endDrag);
svg.addEventListener('pointercancel', endDrag);
svg.addEventListener('dblclick', e => {
  if (mode !== 'select') return;
  const P = toLogical(e), t = topHit(P.x, P.y, 6 / scale());
  if (t && t.t === 't') startEdit(t);
});
svg.addEventListener('contextmenu', e => e.preventDefault());

const CHUNK = 48;
function liveStroke(d) {
  d.raf = 0;
  if (drag !== d) return;
  // lange Striche: vorderen Teil als festen Pfad ablegen, damit pro Bild nur das Ende neu berechnet wird
  while (!d.hl && d.pts.length - d.start > CHUNK + 16) {   // Textmarker nicht stückeln (Überlappungen würden dunkler)
    const seg = d.pts.slice(d.start, d.start + CHUNK + 1);
    const n = mk('path', { fill: d.c, d: outline(seg, d.w) });
    gInk.insertBefore(n, d.node); d.frozen.push(n);
    d.start += CHUNK;
  }
  const tail = d.pts.slice(d.start);
  d.node.setAttribute('d', outline(d.pred.length ? tail.concat(d.pred) : tail, d.w));
}
function simplify(pts) { // Punkte mit minimalem Abstand, Endpunkt bleibt
  if (pts.length < 3) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = out[out.length - 1], q = pts[i];
    if (Math.hypot(q[0] - a[0], q[1] - a[1]) >= 1.2) out.push(q);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function eraseAt(P, tol) {
  let h = null;
  for (let i = els.length - 1; i >= 0 && !h; i--) if (drag.only(els[i]) && hit(els[i], P.x, P.y, tol)) h = els[i];
  if (!h) return;
  els = els.filter(e => e !== h); sel.delete(h.id); drag.changed = true; setDirty(true); render();
}

// ===================================================================== Modus & Panel
function setMode(m) {
  if (editing && m !== 'text') commitEdit();
  mode = m;
  document.body.className = document.body.className.replace(/\bmode-\w+/g, '').trim() + ' mode-' + m;
  if (m !== 'select') sel.clear();
  drawUi(); syncPanel();
}

const ACTIONS = {
  draw: () => setMode('draw'), select: () => setMode('select'), text: () => setMode('text'), erase: () => setMode('erase'), erase2: () => setMode('erase2'),
  toggle: () => setMode(mode === 'draw' ? 'select' : 'draw'),
  undo, redo, del: deleteSel, all: selectAll,
  copy: () => copySel(false), cut: () => copySel(true), paste: pasteFromSystemOrInternal,
  straight: () => applyStrokeOp(straighten), arc: () => applyStrokeOp(fitArc), flat: () => applyStrokeOp(flatten),
  rotR: () => rotate(true), rotL: () => rotate(false),
  thicker: () => bigger(1.25, 'stroke'), thinner: () => bigger(.8, 'stroke'),
  fontUp: () => bigger(1.15, 'text'), fontDown: () => bigger(1 / 1.15, 'text'),
  selUp: () => bigger(1.15), selDown: () => bigger(1 / 1.15),
  extend: () => change(els, Math.ceil(H + cont.clientHeight / scale() * .5)),
  clip: clipPage,
  image: () => $('imgInput').click(), imgq: cycleImgPref, optimg: optimizeImages,
  grid: cycleGrid, fmt: toggleFormat, arrange: arrangeForPrint, pbreak: () => setMode(mode === 'pbreak' ? 'draw' : 'pbreak'), pdf: () => $('pdfInput').click(),
  print: doPrint,
  newb: newBoard, open: openFile, save: () => save(false), saveAs: () => save(true), compact: exportCompact, svgcode: showSvgCode,
  backups: showBackups, backupNow: () => { backup(true); },
  finger: () => { fingerDraw = !fingerDraw; syncPanel(); toast(fingerDraw ? 'Finger zeichnet' : 'Finger scrollt'); },
  mirror: openMirror, follow: () => {             // Scrollen koppeln: gilt immer für beide Fenster gemeinsam
    followView = !followView; syncPanel(); post({ type: 'follow', on: followView });
    toast(followView ? 'Scrollen gekoppelt – beide Fenster zeigen dieselbe Stelle' : 'Scrollen unabhängig', 1500);
    if (followView) sendView();
  },
  calc: () => openDialog('dlgCalc'), help: () => toggleDialog('dlgHelp'),
};
// ---- Panel-Aufbau: Kopf (Logo, Speichern/Öffnen) · Werkzeug-Kacheln · Farbe/Stärke/Schrift ·
//      Rückgängig-Zeile · aufklappbare Gruppen (Zustand wird gemerkt)
const TOOLS = [['draw', '✎', 'Stift'], ['select', '⬚', 'Auswahl'], ['text', 'T', 'Text'],
               ['erase', '⌫', 'Linien­radierer'], ['erase2', '⊠', 'Objekt­radierer']];
const HL_W = 9;                                     // Textmarker: 50 % breiter als die frühere Stufe 3 (6)
const WIDTHS = [[1.5, 'fein'], [3, 'mittel'], [HL_W, 'Textmarker']];
const GROUPS = [
  ['sel', 'Auswahl bearbeiten', [['copy', '⧉', 'Kopieren'], ['cut', '✂', 'Ausschneiden'], ['all', '▣', 'Alles auswählen'],
      ['straight', '╱', 'Gerade'], ['arc', '◠', 'Kreisbogen'], ['flat', '〰', 'Glätten'],
      ['rotR', '↻', 'Drehen rechts'], ['rotL', '↺', 'Drehen links'], ['selUp', '⤢', 'Größer'], ['selDown', '⤡', 'Kleiner']]],
  ['ins', 'Einfügen', [['paste', '📋', 'Aus Zwischenablage'], ['image', '🖼', 'Bild'], ['pdf', '📄', 'PDF-Seiten'],
      ['imgq', '⚖', 'Bildgröße: fragen'], ['optimg', '🗜', 'Bilder verkleinern']]],
  ['page', 'Seite & Druck', [['grid', '▦', 'Gitter: aus'], ['fmt', '▯', 'Format: Hoch'], ['extend', '⇣', 'Verlängern'], ['clip', '⇡', 'Auf Inhalt kürzen'],
      ['arrange', '⇅', 'Für Druck anordnen'], ['pbreak', '⤓', 'Fester Umbruch'], ['print', '⎙', 'Drucken / PDF']]],
  ['file', 'Datei', [['newb', '✦', 'Neu'], ['saveAs', '⇲', 'Speichern unter'], ['compact', '⇩', 'Export klein'], ['svgcode', '&lt;/&gt;', 'SVG-Code'],
      ['backups', '🕘', 'Backups'], ['backupNow', '⟳', 'Backup jetzt']]],
  ['extra', 'Extras', [['mirror', '⧉', 'Zweites Fenster'], ['follow', '⇵', 'Scrollen koppeln'], ['finger', '☝', 'Finger zeichnet'],
      ['calc', '∑', 'Rechner'], ['help', '?', 'Hilfe']]],
];
const KEYHINT = { draw: 'Leertaste', select: 'Leertaste', text: 'T', erase: 'D', erase2: 'Shift+D', undo: 'Z', redo: 'Y', del: 'Rücktaste', copy: 'C', cut: 'X',
  paste: 'Strg+V', all: 'Strg+A', straight: 'H', arc: 'K', mirror: 'F', rotR: 'R', rotL: 'L', thicker: '+', thinner: '−', extend: 'E',
  clip: 'Strg+E', image: 'P', grid: 'G', pdf: 'I', arrange: 'A', pbreak: 'U', print: 'Strg+P', open: 'O', save: 'S', saveAs: 'Shift+S', backups: 'B',
  backupNow: 'Strg+B', calc: 'J', help: 'F1', fontUp: 'Schrift größer', fontDown: 'Schrift kleiner' };

let hlMode = false;                        // Stufe 3 = Textmarker
function setWidth(v) {                     // feste Stärke; wirkt bei Auswahl auch auf die gewählten Striche
  strokeW = v; hlMode = v === HL_W;
  const list = selList().filter(e => e.t === 's');
  if (list.length && mode === 'select') change(replaceEls(new Map(list.map(e => {
    const o = { ...e, w: v }; if (hlMode) o.hl = 1; else delete o.hl; return [e.id, o];
  }))));
  syncPanel();
}
function mkBtn(act, ico, lab, cls) {
  const b = document.createElement('button');
  b.className = cls || 'btn'; b.dataset.act = act;
  b.title = lab.replace(/­/g, '') + (KEYHINT[act] && KEYHINT[act] !== lab ? ` (${KEYHINT[act]})` : '');
  b.innerHTML = `<span class="ico">${ico}</span><span class="lab">${lab}</span>`;
  b.addEventListener('pointerdown', e => e.preventDefault());   // Fokus (z. B. Textfeld) behalten
  b.addEventListener('click', () => ACTIONS[act]());
  return b;
}
let autoOpenedSel = false;
function buildPanel() {
  // Kopf: Speichern / Öffnen
  const hb = $('headBtns');
  hb.prepend(mkBtn('save', '💾', 'Speichern', 'hbtn'), mkBtn('open', '📂', 'Öffnen', 'hbtn'));
  // Werkzeuge
  const tl = $('tools');
  for (const [act, ico, lab] of TOOLS) tl.appendChild(mkBtn(act, ico, lab, 'tile'));
  // Farben
  const cbox = $('colors');
  COLORS.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'sw'; b.style.background = c; b.title = `Farbe ${i}`; b.dataset.c = c;
    b.addEventListener('pointerdown', e => e.preventDefault());
    b.addEventListener('click', () => setColor(c));
    cbox.appendChild(b);
  });
  // Stärken
  const wb = $('widths');
  for (const [v, lab] of WIDTHS) {
    const b = document.createElement('button');
    b.className = 'wbtn'; b.dataset.w = v;
    if (v === HL_W) {
      b.classList.add('hl'); b.title = 'Textmarker: dick und halbtransparent, Schrift darunter bleibt lesbar';
      b.innerHTML = '<span class="dot hlbar"></span>';
    } else {
      b.title = `Strichstärke ${lab} (${String(v).replace('.', ',')}) · feiner einstellen mit + / −`;
      b.innerHTML = `<span class="dot" style="width:${3 + v * 2}px;height:${3 + v * 2}px"></span>`;
    }
    b.addEventListener('pointerdown', e => e.preventDefault());
    b.addEventListener('click', () => setWidth(v));
    wb.appendChild(b);
  }
  // Schrift
  const fr = $('fontRow');
  fr.append(mkBtn('fontDown', 'A⁻', 'Schrift kleiner', 'mini'), Object.assign(document.createElement('span'), { id: 'fontVal', className: 'fval' }),
            mkBtn('fontUp', 'A⁺', 'Schrift größer', 'mini'));
  // Rückgängig-Zeile
  const q = $('quick');
  q.append(mkBtn('undo', '↶', 'Rückgängig', 'mini'), mkBtn('redo', '↷', 'Wiederholen', 'mini'), mkBtn('del', '🗑', 'Löschen', 'mini'));
  // Gruppen
  let openState = {};
  try { openState = JSON.parse(localStorage.getItem('wb2.groups') || '{}'); } catch (e) {}
  const g = $('groups');
  for (const [key, title, items] of GROUPS) {
    const d = document.createElement('details'); d.className = 'grp'; d.id = 'grp-' + key;
    if (openState[key]) d.open = true;
    const sm = document.createElement('summary'); sm.textContent = title; d.appendChild(sm);
    const body = document.createElement('div'); body.className = 'grp-body';
    for (const [act, ico, lab] of items) body.appendChild(mkBtn(act, ico, lab));
    d.appendChild(body);
    sm.addEventListener('pointerdown', e => e.preventDefault());
    d.addEventListener('toggle', () => {
      if (key === 'sel') autoOpenedSel = false;     // von Hand bedient: nicht mehr automatisch schließen
      const st = {}; document.querySelectorAll('details.grp').forEach(x => { st[x.id.slice(4)] = x.open; });
      try { localStorage.setItem('wb2.groups', JSON.stringify(st)); } catch (e) {}
    });
    g.appendChild(d);
  }
  $('collapse').addEventListener('click', () => {
    document.body.classList.toggle('collapsed');
    $('collapse').textContent = document.body.classList.contains('collapsed') ? '›' : '‹';
    try { localStorage.setItem('wb2.collapsed', document.body.classList.contains('collapsed') ? '1' : ''); } catch (e) {}
    requestAnimationFrame(applySize);
  });
  try { if (localStorage.getItem('wb2.collapsed')) { document.body.classList.add('collapsed'); $('collapse').textContent = '›'; } } catch (e) {}
}
// „Auswahl bearbeiten“ öffnet sich automatisch, sobald etwas ausgewählt ist
function syncSelGroup() {
  const d = $('grp-sel'); if (!d) return;
  const has = sel.size > 0 && mode === 'select';
  if (has && !d.open) { d.open = true; setTimeout(() => { autoOpenedSel = true; }, 0); }
  else if (!has && d.open && autoOpenedSel) { d.open = false; setTimeout(() => { autoOpenedSel = false; }, 0); }
}
function syncPanel() {
  document.querySelectorAll('[data-act]').forEach(b => {
    const a = b.dataset.act;
    b.classList.toggle('active', a === mode || (a === 'finger' && fingerDraw) || (a === 'follow' && followView) || (a === 'mirror' && !!peer));
  });
  document.querySelectorAll('.sw').forEach(b => b.classList.toggle('active', b.dataset.c.toLowerCase() === color.toLowerCase()));
  document.querySelectorAll('.wbtn').forEach(b => {
    b.classList.toggle('active', +b.dataset.w === strokeW && (+b.dataset.w !== HL_W || hlMode));
    b.querySelector('.dot').style.background = color.toLowerCase() === '#ffffff' ? '#bbb' : color;
  });
  const gb = document.querySelector('[data-act=grid]');
  if (gb) { gb.querySelector('.lab').textContent = GRID_LABEL[grid]; gb.classList.toggle('active', grid !== 'off'); }
  const ib = document.querySelector('[data-act=imgq]');
  if (ib) { ib.querySelector('.lab').textContent = IMGQ_LABEL[imgPref]; ib.classList.toggle('active', imgPref !== 'ask'); }
  const fb = document.querySelector('[data-act=fmt]');
  if (fb) { fb.querySelector('.lab').textContent = FMT_LABEL[pageFmt]; fb.querySelector('.ico').textContent = pageFmt === 'landscape' ? '▭' : '▯'; }
  const fv = $('fontVal'); if (fv) fv.textContent = fontSize;
  const wl = $('wline'); if (wl) wl.textContent = WIDTHS.some(w => w[0] === strokeW) ? '' : `Stärke ${String(strokeW).replace('.', ',')}`;
}

// ===================================================================== Tastatur
function isTyping(e) { const t = e.target; return t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.isContentEditable); }
document.addEventListener('keydown', e => {
  if (isTyping(e)) {
    if (e.key === 'Escape') { closeDialogs(); e.preventDefault(); }
    return;
  }
  const k = e.key, ctrl = e.ctrlKey || e.metaKey, lk = k.length === 1 ? k.toLowerCase() : k;
  const v = cont.clientHeight;
  let handled = true;
  if (ctrl) {
    switch (lk) {
      case 'z': e.shiftKey ? redo() : undo(); break;
      case 'y': redo(); break;
      case 's': save(e.shiftKey); break;
      case 'o': openFile(); break;
      case 'p': doPrint(); break;
      case 'e': clipPage(); break;
      case 'b': backup(true); break;
      case 'a': selectAll(); break;
      case 'c': copySel(false); break;
      case 'x': copySel(true); break;
      case 'v': handled = false; break;               // -> paste-Ereignis
      default: handled = false;
    }
  } else if (/^[0-9]$/.test(k)) setColor(COLORS[+k]);
  else switch (lk) {
    case ' ': ACTIONS.toggle(); break;
    case 't': setMode('text'); break;
    case 'd': case 'D': { const m = e.shiftKey ? 'erase2' : 'erase'; setMode(mode === m ? 'draw' : m); break; }
    case 'z': undo(); break;
    case 'y': redo(); break;
    case 's': save(e.shiftKey); break;
    case 'o': openFile(); break;
    case 'c': copySel(false); break;
    case 'x': copySel(true); break;
    case 'v': pasteInternal(); break;
    case 'Backspace': case 'Delete': deleteSel(); break;
    case 'e': ACTIONS.extend(); break;
    case 'p': $('imgInput').click(); break;
    case 'g': cycleGrid(); break;
    case 'a': arrangeForPrint(); break;
    case 'u': ACTIONS.pbreak(); break;
    case 'i': $('pdfInput').click(); break;
    case 'h': ACTIONS.straight(); break;
    case 'k': ACTIONS.arc(); break;
    case 'f': openMirror(); break;            // F = zweites Fenster (Glätten nur noch über das Menü)
    case 'r': rotate(true); break;
    case 'l': rotate(false); break;
    case '+': bigger(1.25); break;
    case '-': bigger(.8); break;
    case 'j': toggleDialog('dlgCalc'); break;
    case 'b': toggleDialog('dlgBackup', showBackups); break;
    case 'q': quit(); break;
    case 'F1': toggleDialog('dlgHelp'); break;
    case 'Escape': if (!closeDialogs()) { sel.clear(); drawUi(); } break;
    case 'PageDown': cont.scrollTop += v * .9; break;
    case 'PageUp': cont.scrollTop -= v * .9; break;
    case 'Home': cont.scrollTop = 0; break;
    case 'End': cont.scrollTop = cont.scrollHeight; break;
    case 'ArrowUp': case 'ArrowDown': case 'ArrowLeft': case 'ArrowRight': {
      const dx = k === 'ArrowLeft' ? -1 : k === 'ArrowRight' ? 1 : 0, dy = k === 'ArrowUp' ? -1 : k === 'ArrowDown' ? 1 : 0;
      if (sel.size && mode === 'select') {
        const st = e.shiftKey ? 1 : 8;
        change(replaceEls(new Map(selList().map(el => [el.id, mapEl(el, (x, y) => [x + dx*st, y + dy*st], 1)]))));
      } else cont.scrollTop += dy * v * .1;
      break;
    }
    default: handled = false;
  }
  if (handled) e.preventDefault();
});

// Einfügen aus der System-Zwischenablage (Strg+V)
document.addEventListener('paste', async e => {
  if (isTyping(e)) return;
  e.preventDefault();
  const dt = e.clipboardData;
  if (dt) {
    for (const it of dt.items) if (it.kind === 'file' && it.type.startsWith('image/')) { await insertImageFile(it.getAsFile()); return; }
    const txt = dt.getData('text/plain');
    if (txt && txt.trim()) { insertText(txt); return; }
  }
  pasteInternal();
});
async function pasteFromSystemOrInternal() { // Panel-Button: versucht die System-Zwischenablage
  try {
    if (navigator.clipboard && navigator.clipboard.read) {
      const items = await navigator.clipboard.read();
      for (const it of items) {
        const im = it.types.find(t => t.startsWith('image/'));
        if (im) { const b = await it.getType(im); await insertImageFile(new File([b], 'clip', { type: im })); return; }
      }
      for (const it of items) if (it.types.includes('text/plain')) {
        const txt = await (await it.getType('text/plain')).text();
        if (txt.trim()) { insertText(txt); return; }
      }
    }
  } catch (err) { /* keine Berechtigung -> intern */ }
  pasteInternal();
}

// ===================================================================== Seite / Drucken / Beenden
function clipPage() {
  const b = unionBox(els), vmin = Math.ceil(cont.clientHeight / scale());
  change(els, Math.max(vmin, b ? Math.ceil(b.y + b.h + 40) : 0));
}
function doPrint() { if (editing) commitEdit(); sel.clear(); drawUi(); setTimeout(() => window.print(), 50); }  // Seiten baut 'beforeprint'
function quit() {
  if (dirty && !confirm('Ungespeicherte Änderungen verwerfen und beenden?')) return;
  dirty = false; window.close();
  setTimeout(() => toast('Bitte den Tab bzw. das Fenster selbst schließen'), 200);
}
function newBoard() {
  if (dirty && !confirm('Ungespeicherte Änderungen verwerfen und neues TERBiBOARD beginnen?')) return;
  if (editing) commitEdit();
  backup(false);
  els = []; mb = []; breakCache = null; sel.clear(); undoStack = []; redoStack = []; fileHandle = null; fileName = null;
  freshSize();
  cont.scrollTop = 0; applySize(); render(); setDirty(false);
}
function freshSize() {
  W = Math.max(320, Math.round(cont.clientWidth));
  H = Math.ceil(cont.clientHeight * W / cont.clientWidth * 1.5);
}

// ===================================================================== Speichern / Laden
// v9.0: Ein mehrfach verwendetes Bild steht nur einmal in der Datei (<symbol> in <defs>, Verwendungen als <use>)
function dedupeImages(c) {
  const imgs = [...c.querySelectorAll('#ink > image')], count = new Map(), ids = new Map();
  for (const n of imgs) { const h = n.getAttribute('href'); count.set(h, (count.get(h) || 0) + 1); }
  let defs = null;
  for (const n of imgs) {
    const h = n.getAttribute('href'); if (count.get(h) < 2) continue;
    if (!ids.has(h)) {
      if (!defs) { defs = mk('defs'); c.insertBefore(defs, c.firstChild); }
      const id = 'im' + ids.size; ids.set(h, id);
      const s = mk('symbol', { id, viewBox: '0 0 1 1', preserveAspectRatio: 'none' }, defs);
      mk('image', { width: 1, height: 1, preserveAspectRatio: 'none', href: h }, s);
    }
    const u = mk('use', { href: '#' + ids.get(h) });
    for (const a of ['class', 'x', 'y', 'width', 'height']) if (n.hasAttribute(a)) u.setAttribute(a, n.getAttribute(a));
    n.replaceWith(u);
  }
}
function sharedImageHref(root, ref) {           // href des Bildes, auf das ein <use href="#…"> zeigt
  const t = root.querySelector(`[id="${ref.slice(1).replace(/["\\]/g, '')}"]`);
  const im = t && (t.localName === 'image' ? t : t.querySelector('image'));
  return im ? (im.getAttribute('href') || im.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || '') : '';
}
function serialize(compact) {
  if (editing) commitEdit();
  const c = svg.cloneNode(true);
  c.querySelector('#ui').remove(); c.querySelector('#bg').remove();
  c.querySelectorAll('.preview').forEach(n => n.remove());   // Live-Vorschau aus dem anderen Fenster nie speichern
  c.removeAttribute('style'); c.removeAttribute('id');
  c.setAttribute('width', W); c.setAttribute('height', H); c.setAttribute('viewBox', `0 0 ${W} ${H}`);
  c.querySelectorAll('[style]').forEach(n => { if (n.namespaceURI === NS) n.removeAttribute('style'); });
  dedupeImages(c);
  if (!compact) {
    c.setAttribute('data-wb2', VERSION); c.setAttribute('data-fmt', pageFmt);
    if (mb.length) c.setAttribute('data-breaks', mb.join(','));
    const bg = mk('rect', { width: '100%', height: '100%', fill: '#fff', class: 'bg' });
    c.insertBefore(bg, c.firstChild);
  } else {
    const cls = new Map(); let css = '';
    c.querySelectorAll('[data-pts],[data-w],[data-txt],[data-s],[data-c],[data-tw],[data-hl]').forEach(n => {
      ['data-pts', 'data-w', 'data-txt', 'data-s', 'data-c', 'data-tw', 'data-hl'].forEach(a => n.removeAttribute(a));
    });
    c.querySelectorAll('path.s').forEach(n => {
      const f = n.getAttribute('fill');
      if (!cls.has(f)) { const k = 'c' + cls.size; cls.set(f, k); css += `.${k}{fill:${f}}`; }
      n.removeAttribute('fill'); n.setAttribute('class', cls.get(f));
    });
    c.querySelectorAll('.t,.i').forEach(n => n.removeAttribute('class'));
    c.querySelectorAll('g[id]').forEach(g => g.removeAttribute('id'));
    if (css) { const st = mk('style'); st.textContent = css; c.insertBefore(st, c.firstChild); }
    const bg = mk('rect', { width: '100%', height: '100%', fill: '#fff' });
    c.insertBefore(bg, c.firstChild);
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(c);
}

function parseBoard(text) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.nodeName !== 'svg' || doc.querySelector('parsererror')) throw new Error('Keine gültige SVG-Datei');
  if (!root.hasAttribute('data-wb2')) return null;              // fremde SVG
  const vb = (root.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  const w = vb[2] || +root.getAttribute('width') || 1200, h = vb[3] || +root.getAttribute('height') || 800;
  const out = [];
  const num = (n, a, d = 0) => { const v = parseFloat(n.getAttribute(a)); return isFinite(v) ? v : d; };
  const shared = new Map();
  for (const n of root.querySelectorAll('#ink > *, #txt > *')) {
    const cl = n.getAttribute('class');
    if (cl === 's') {
      const pts = (n.getAttribute('data-pts') || '').trim().split(/\s+/).map(s => s.split(',').map(Number)).filter(q => q.length === 3 && q.every(isFinite));
      if (pts.length) { const st = { id: nid(), t: 's', pts, c: n.getAttribute('fill') || '#000000', w: num(n, 'data-w', 3) };
        if (n.getAttribute('data-hl') === '1') st.hl = 1; out.push(st); }
    } else if (cl === 'i') {
      let href = n.getAttribute('href') || n.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || '';
      if (href[0] === '#') { if (!shared.has(href)) shared.set(href, sharedImageHref(root, href)); href = shared.get(href); }
      if (/^data:image\//.test(href)) out.push({ id: nid(), t: 'i', x: num(n, 'x'), y: num(n, 'y'), w: num(n, 'width', 100), h: num(n, 'height', 100), href });
    } else if (cl === 't') {
      const t = { id: nid(), t: 't', x: num(n, 'x'), y: num(n, 'y'), s: num(n, 'data-s', 28), c: n.getAttribute('data-c') || '#000000', txt: n.getAttribute('data-txt') || '' };
      const tw = num(n, 'data-tw', 0); if (tw > 0) t.tw = tw;
      out.push(t);
    }
  }
  const breaks = (root.getAttribute('data-breaks') || '').split(',').map(Number).filter(v => isFinite(v) && v > 0);
  return { els: out, W: w, H: h, fmt: root.getAttribute('data-fmt'), breaks };
}

// ---- Fremde SVG (z. B. von Claude erzeugte Tafelbilder) als echte Board-Elemente übernehmen:
// Linien/Pfade/Formen -> Striche, <text> -> Textfelder (mit $…$-Formeln), eingebettete Bilder -> Bilder.
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let md = 0, mi = -1;
    for (let i = a + 1; i < b; i++) {
      const d = segDist(pts[i][0], pts[i][1], pts[a][0], pts[a][1], pts[b][0], pts[b][1]);
      if (d > md) { md = d; mi = i; }
    }
    if (md > eps) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function cssColor(c, fallback) {
  if (!c || c === 'none' || c.startsWith('url')) return null;
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const v = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
    if (v.length > 3 && v[3] === 0) return null;
    return '#' + v.slice(0, 3).map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
  }
  return c || fallback;
}
function importVectorSVG(text, name) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const src = doc.documentElement;
  if (!src || src.nodeName !== 'svg' || doc.querySelector('parsererror')) return false;
  // Sicherheit: aktive Inhalte entfernen, bevor die SVG zum Vermessen in die Seite kommt
  src.querySelectorAll('script,foreignObject,iframe,audio,video,animate,set,animateTransform,animateMotion').forEach(n => n.remove());
  src.querySelectorAll('*').forEach(n => { for (const a of [...n.attributes]) if (/^on/i.test(a.name)) n.removeAttribute(a.name); });
  const vb = (src.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  const vw = vb.length === 4 && vb[2] > 0 ? vb[2] : parseFloat(src.getAttribute('width')) || 800;
  const vh = vb.length === 4 && vb[3] > 0 ? vb[3] : parseFloat(src.getAttribute('height')) || 600;
  const vx = vb.length === 4 ? vb[0] : 0, vy = vb.length === 4 ? vb[1] : 0;
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-99999px;top:0;opacity:0;pointer-events:none';
  const tmp = document.importNode(src, true);
  tmp.setAttribute('width', vw); tmp.setAttribute('height', vh); tmp.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
  host.appendChild(tmp); document.body.appendChild(host);
  try {
    const empty = !els.length;
    const fit = empty ? (W - 40) / vw : Math.min(1, (W * .9) / vw);
    const v = viewRect();
    const ox = empty ? 20 : Math.max(10, (W - vw * fit) / 2), oy = empty ? 20 : (textAt().y);
    const rootInv = tmp.getScreenCTM().inverse();
    const toBoard = (el, x, y) => {      // Elementkoordinaten -> Board
      const m = rootInv.multiply(el.getScreenCTM());
      const px = m.a * x + m.c * y + m.e - vx, py = m.b * x + m.d * y + m.f - vy;
      return [ox + px * fit, oy + py * fit];
    };
    const scaleOf = el => { const m = rootInv.multiply(el.getScreenCTM()); return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) * fit; };
    const skip = el => el.closest('defs,clipPath,mask,marker,pattern,symbol') ||
      getComputedStyle(el).display === 'none' || getComputedStyle(el).visibility === 'hidden';
    const out = [];
    for (const el of tmp.querySelectorAll('path,line,polyline,polygon,rect,circle,ellipse')) {
      if (skip(el)) continue;
      const cs = getComputedStyle(el);
      let c = cssColor(cs.stroke), w = parseFloat(cs.strokeWidth) || 1;
      if (!c || w <= 0) { c = cssColor(cs.fill); w = 1; }          // nur Fläche: Umriss übernehmen
      if (!c || (c.toLowerCase() === '#ffffff' && !cssColor(cs.stroke))) continue;   // weiße Hintergrundflächen weglassen
      const sc = scaleOf(el), sw = r2(Math.max(.4, w * sc));
      const tag = el.tagName.toLowerCase();
      let runs = [];
      const P = (x, y) => toBoard(el, x, y);
      const num = a => parseFloat(el.getAttribute(a)) || 0;
      if (tag === 'line') runs = [[P(num('x1'), num('y1')), P(num('x2'), num('y2'))]];
      else if (tag === 'polyline' || tag === 'polygon') {
        const q = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
        const r = []; for (let i = 0; i + 1 < q.length; i += 2) r.push(P(q[i], q[i + 1]));
        if (tag === 'polygon' && r.length) r.push(r[0]);
        runs = [r];
      } else if (tag === 'rect' && !num('rx') && !num('ry')) {
        const x = num('x'), y = num('y'), rw = num('width'), rh = num('height');
        runs = [[P(x, y), P(x + rw, y), P(x + rw, y + rh), P(x, y + rh), P(x, y)]];
      } else {
        const len = el.getTotalLength ? el.getTotalLength() : 0;
        if (!len) continue;
        const n = Math.min(6000, Math.max(8, Math.ceil(len / (0.75 / Math.max(sc, .05)))));
        const step = len / n;
        let cur = [], prev = null;
        for (let i = 0; i <= n; i++) {
          const p = el.getPointAtLength(i * step);
          if (prev && Math.hypot(p.x - prev.x, p.y - prev.y) > step * 2.5) { if (cur.length) runs.push(cur); cur = []; }  // neuer Teilpfad (M)
          cur.push(P(p.x, p.y)); prev = p;
        }
        if (cur.length) runs.push(cur);
      }
      for (const r of runs) {
        const pts = rdp(r, .25).map(q => [r1(q[0]), r1(q[1]), .5]);
        if (pts.length) out.push({ id: nid(), t: 's', pts, c, w: sw });
      }
    }
    for (const el of tmp.querySelectorAll('image')) {
      if (skip(el)) continue;
      const href = el.getAttribute('href') || el.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || '';
      if (!/^data:image\/(png|jpe?g|gif|webp)/.test(href)) continue;
      const b = el.getBBox(), a = toBoard(el, b.x, b.y), z = toBoard(el, b.x + b.width, b.y + b.height);
      out.push({ id: nid(), t: 'i', x: r1(Math.min(a[0], z[0])), y: r1(Math.min(a[1], z[1])), w: r1(Math.abs(z[0] - a[0])), h: r1(Math.abs(z[1] - a[1])), href });
    }
    for (const el of tmp.querySelectorAll('use')) {           // v9.0: mehrfach verwendete Bilder (z. B. aus „Export klein“)
      if (skip(el)) continue;
      const ref = el.getAttribute('href') || el.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || '';
      if (ref[0] !== '#') continue;
      const href = sharedImageHref(tmp, ref);
      if (!/^data:image\/(png|jpe?g|gif|webp)/.test(href)) continue;
      const b = el.getBBox(), a = toBoard(el, b.x, b.y), z = toBoard(el, b.x + b.width, b.y + b.height);
      out.push({ id: nid(), t: 'i', x: r1(Math.min(a[0], z[0])), y: r1(Math.min(a[1], z[1])), w: r1(Math.abs(z[0] - a[0])), h: r1(Math.abs(z[1] - a[1])), href });
    }
    for (const el of tmp.querySelectorAll('text')) {
      if (skip(el)) continue;
      const tsp = [...el.querySelectorAll('tspan')].filter(t => t.hasAttribute('x') || t.hasAttribute('dy') || t.hasAttribute('y'));
      const txt = (tsp.length > 1 ? tsp.map(t => t.textContent.trim()) : [el.textContent.trim()]).join('\n');
      if (!txt) continue;
      const cs = getComputedStyle(el), b = el.getBBox(), a = toBoard(el, b.x, b.y);
      const size = r1(Math.max(6, parseFloat(cs.fontSize) * scaleOf(el)));
      out.push({ id: nid(), t: 't', x: r1(a[0]), y: r1(a[1]), s: size, c: cssColor(cs.fill, '#000000') || '#000000', txt });
    }
    if (!out.length) return false;
    // Texte nach oben in der Ebene; Höhe der Fläche anpassen
    const bottom = oy + vh * fit;
    if (editing) commitEdit();
    if (empty) {
      commitChange(snapshot());
      els = out; sel.clear(); H = Math.max(H, Math.ceil(bottom + 40)); fileName = null; fileHandle = null;
      cont.scrollTop = 0; applySize(); render(); setDirty(true);
      toast(`Tafelbild übernommen: ${out.length} Elemente (bearbeitbar)`, 2500);
    } else {
      insertAndSelect(out);
      toast(`SVG als ${out.length} bearbeitbare Elemente eingefügt`, 2500);
    }
    return true;
  } finally { host.remove(); }
}

function loadText(text, name, handle) {
  let b;
  try { b = parseBoard(text); } catch (err) { return toast(err.message); }
  if (!b) { // fremde SVG -> in bearbeitbare Striche/Texte umwandeln
    try { if (importVectorSVG(text, name)) return; } catch (err) { console.warn(err); }
    const href = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(text)));
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth || 400, h = img.naturalHeight || 300; const f = Math.min(1, W * .6 / w); w *= f; h *= f;
      const p = textAt(); insertAndSelect([{ id: nid(), t: 'i', x: r1(p.x), y: r1(p.y), w: r1(w), h: r1(h), href }]);
      toast('Fremde SVG als Bild eingefügt');
    };
    img.src = href; return;
  }
  if (editing) commitEdit();
  commitChange(snapshot());
  els = b.els; W = b.W; H = b.H; sel.clear(); mb = b.breaks || []; breakCache = null;
  if (b.fmt === 'portrait' || b.fmt === 'landscape') { pageFmt = b.fmt; setPageStyle(); syncPanel(); }
  fileName = name || null; fileHandle = handle || null;
  cont.scrollTop = 0; applySize(); render(); setDirty(false);
  toast('Geladen: ' + (name || 'Backup'));
}

const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`; };
function download(data, name) {
  const url = URL.createObjectURL(new Blob([data], { type: 'image/svg+xml' }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const kb = n => (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';

async function save(as) {
  const data = serialize(false);
  const suggested = fileName || `terbiboard_${stamp()}.svg`;
  if (window.showSaveFilePicker) {
    try {
      if (!fileHandle || as) fileHandle = await showSaveFilePicker({ suggestedName: suggested, types: [{ description: 'TERBiBOARD (SVG)', accept: { 'image/svg+xml': ['.svg'] } }] });
      const w = await fileHandle.createWritable(); await w.write(data); await w.close();
      fileName = fileHandle.name; setDirty(false); toast(`Gespeichert: ${fileName} (${kb(data.length)})`); return;
    } catch (err) { if (err.name === 'AbortError') return; fileHandle = null; }
  }
  download(data, suggested); fileName = suggested; setDirty(false); toast(`Heruntergeladen: ${suggested} (${kb(data.length)})`);
}
function exportCompact() {
  sel.clear(); drawUi();
  const data = serialize(true), name = (fileName || `terbiboard_${stamp()}.svg`).replace(/\.svg$/i, '') + '_klein.svg';
  download(data, name);
  toast(`Export klein: ${kb(new Blob([data]).size)} (nicht weiterbearbeitbar)`, 3000);
}
async function openFile() {
  if (dirty && !confirm('Ungespeicherte Änderungen verwerfen und Datei öffnen?')) return;
  if (window.showOpenFilePicker) {
    try {
      const [h] = await showOpenFilePicker({ types: [{ description: 'TERBiBOARD (SVG)', accept: { 'image/svg+xml': ['.svg'] } }] });
      const f = await h.getFile(); loadText(await f.text(), f.name, h); return;
    } catch (err) { if (err.name === 'AbortError') return; }
  }
  $('svgInput').click();
}
$('svgInput').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (f) loadText(await f.text(), f.name, null); });
$('imgInput').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (f) insertImageFile(f).catch(() => toast('Bild konnte nicht geladen werden')); });

// Drag & Drop von Dateien
cont.addEventListener('dragover', e => e.preventDefault());
cont.addEventListener('drop', async e => {
  e.preventDefault();
  const f = e.dataTransfer.files[0];
  if (f) {
    if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') { openPdf(f); return; }
    if (/\.svg$/i.test(f.name)) loadText(await f.text(), f.name, null);
    else if (f.type.startsWith('image/')) { lastPointer = toLogical(e); insertImageFile(f); }
    return;
  }
  const txt = e.dataTransfer.getData('text/plain'); if (txt) insertText(txt, toLogical(e));
});

// ===================================================================== Backups
const BK = 'wb2.backups';
let lastBackupSig = '';
function readBackups() { try { return JSON.parse(localStorage.getItem(BK) || '[]'); } catch (e) { return []; } }
function backup(manual) {
  if (IS_MIRROR) { if (manual) toast('Backups legt das Hauptfenster an'); return; }
  if (!els.length) { if (manual) toast('Leeres TERBiBOARD – kein Backup nötig'); return; }
  const data = serialize(false), sig = data.length + ':' + data.slice(-200);
  if (!manual && sig === lastBackupSig) return;
  let list = readBackups(); list.unshift({ t: Date.now(), name: fileName, svg: data }); list = list.slice(0, 12);
  while (list.length) {
    try { localStorage.setItem(BK, JSON.stringify(list)); lastBackupSig = sig; if (manual) toast('Backup angelegt'); return; }
    catch (e) { list.pop(); }
  }
  if (manual) toast('Backup fehlgeschlagen (Speicher voll)');
}
function showBackups() {
  const box = $('backupList'); box.textContent = '';
  const list = readBackups();
  if (!list.length) box.textContent = 'Noch keine Backups vorhanden.';
  list.forEach(b => {
    const btn = document.createElement('button'), d = new Date(b.t);
    btn.textContent = d.toLocaleDateString('de-DE') + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + (b.name ? ' · ' + b.name : '') + ' · ' + kb(b.svg.length);
    btn.addEventListener('click', () => { closeDialogs(); loadText(b.svg, b.name, null); setDirty(true); });
    box.appendChild(btn);
  });
  openDialog('dlgBackup');
}
setInterval(() => backup(false), 120000);
document.addEventListener('visibilitychange', () => { if (document.hidden && dirty) backup(false); });
window.addEventListener('beforeunload', e => { post({ type: 'bye' }); if (IS_MIRROR) return; if (dirty) { backup(false); e.preventDefault(); e.returnValue = ''; } });

// ===================================================================== Dialoge & Rechner
function openDialog(id) { const d = $(id); d.classList.add('open'); if (id === 'dlgCalc') setTimeout(() => $('calcIn').focus(), 0); }
function toggleDialog(id, opener) { const d = $(id); if (d.classList.contains('open')) d.classList.remove('open'); else (opener || (() => openDialog(id)))(); }
function closeDialogs(onlyHelp) {
  let any = false;
  document.querySelectorAll('.dlg.open').forEach(d => { if (!onlyHelp || d.id !== 'dlgCalc') { d.classList.remove('open'); any = true; } });
  return any;
}
document.querySelectorAll('.dlg').forEach(d => {
  d.querySelector('.x').addEventListener('click', () => d.classList.remove('open'));
  const head = d.querySelector('.dlg-head');
  head.addEventListener('pointerdown', e => {
    if (e.target.closest('.x')) return;
    const r = d.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
    head.setPointerCapture(e.pointerId);
    const mv = ev => { d.style.left = (ev.clientX - ox) + 'px'; d.style.top = (ev.clientY - oy) + 'px'; d.style.transform = 'none'; };
    const up = () => { head.removeEventListener('pointermove', mv); head.removeEventListener('pointerup', up); };
    head.addEventListener('pointermove', mv); head.addEventListener('pointerup', up);
  });
});
let calcResult = null;
function runCalc() {
  const code = $('calcIn').value, out = $('calcOut');
  try {
    // eslint-disable-next-line no-new-func
    const v = Function('__c', 'with (Math) { return eval(__c); }')(code);
    calcResult = typeof v === 'number' ? String(+v.toPrecision(12)) : (typeof v === 'object' ? JSON.stringify(v) : String(v));
    out.textContent = calcResult; out.style.color = '';
  } catch (err) { calcResult = null; out.textContent = err.message; out.style.color = '#b00'; }
}
$('calcRun').addEventListener('click', runCalc);
$('calcInsert').addEventListener('click', () => { if (calcResult === null) runCalc(); if (calcResult !== null) insertText(calcResult); });
$('calcIn').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); runCalc(); } });

// ---- SVG-Code anzeigen (v8.8): derselbe Inhalt wie „Export klein“ bzw. „Speichern“, als Text zum Kopieren
const SVG_SHOW_MAX = 1.5e6;                      // längere Codes nur gekürzt anzeigen – „Kopieren“ liefert immer alles
let svgCodeFull = false, svgCodeText = '';
function showSvgCode() {
  sel.clear(); drawUi();
  svgCodeText = serialize(!svgCodeFull);
  const ta = $('svgCodeOut'), size = new Blob([svgCodeText]).size;
  ta.value = svgCodeText.length > SVG_SHOW_MAX
    ? svgCodeText.slice(0, SVG_SHOW_MAX) + '\n\n… (Anzeige gekürzt – „Kopieren“ übernimmt den vollständigen Code)'
    : svgCodeText;
  const pics = (svgCodeText.match(/<image\b/g) || []).length, uses = (svgCodeText.match(/<use\b/g) || []).length;
  $('svgCodeInfo').textContent = `${kb(size)} · ` + (svgCodeFull ? 'vollständig, in TERBiBOARD wieder bearbeitbar' : 'klein, ohne Bearbeitungsdaten')
    + (pics ? ` · enthält ${pics} eingebettete(s) Bild(er)/PDF-Seite(n) als Base64` : '')
    + (uses ? ` (${uses} weitere Verwendung(en) mehrfach eingefügter Bilder, nur einmal gespeichert)` : '');
  document.querySelectorAll('#svgCodeMode button').forEach(b => b.classList.toggle('on', (b.dataset.full === '1') === svgCodeFull));
  openDialog('dlgSvg');
  ta.scrollTop = 0; ta.scrollLeft = 0;
}
async function copySvgCode() {
  const sz = kb(new Blob([svgCodeText]).size);
  try { await navigator.clipboard.writeText(svgCodeText); toast(`SVG-Code kopiert (${sz})`); return; } catch (err) { /* Ersatzweg */ }
  const t = document.createElement('textarea');
  t.value = svgCodeText; t.style.cssText = 'position:fixed;left:-9999px;top:0';
  document.body.appendChild(t); t.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
  t.remove();
  toast(ok ? `SVG-Code kopiert (${sz})` : 'Kopieren nicht möglich – Code im Feld markieren (Strg+A) und mit Strg+C kopieren', 3000);
}
document.querySelectorAll('#svgCodeMode button').forEach(b => b.addEventListener('click', () => { svgCodeFull = b.dataset.full === '1'; showSvgCode(); }));
$('svgCodeCopy').addEventListener('click', copySvgCode);

// ===================================================================== PDF-Import
let pdfDoc = null, pdfSel = new Set(), pdfToken = 0;
// v9.0: Qualität der importierten Seiten – [max. Pixelbreite, Faktor zur Anzeigebreite, JPEG-Qualität]; „Hoch“ = bisheriges Verhalten
const PDF_Q = { high: [1800, 2.5, .85], medium: [1300, 1.8, .8], small: [900, 1.25, .72] };
let pdfQ = 'medium';
try { const v = localStorage.getItem('wb2.pdfq'); if (PDF_Q[v]) pdfQ = v; } catch (e) {}
function pdfQSync() { document.querySelectorAll('#pdfQ button').forEach(b => b.classList.toggle('on', b.dataset.q === pdfQ)); }
document.querySelectorAll('#pdfQ button').forEach(b => b.addEventListener('click', () => {
  pdfQ = b.dataset.q; try { localStorage.setItem('wb2.pdfq', pdfQ); } catch (e) {} pdfQSync();
}));
pdfQSync();
function loadScript(src) {
  return new Promise((res, rej) => {
    const el = document.createElement('script'); el.src = src; el.onload = res;
    el.onerror = () => rej(new Error(src + ' konnte nicht geladen werden')); document.head.appendChild(el);
  });
}
async function pdfLib() {
  if (!window.pdfjsLib) await loadScript('pdf.min.js');
  // Bei file:// sind Web-Worker gesperrt -> Worker-Code im Hauptthread bereitstellen
  if (location.protocol === 'file:' && !window.pdfjsWorker) await loadScript('pdf.worker.min.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';
  return pdfjsLib;
}
function pdfSync() {
  document.querySelectorAll('#pdfThumbs .thumb').forEach(t => t.classList.toggle('on', pdfSel.has(+t.dataset.n)));
  $('pdfCount').textContent = `${pdfSel.size} von ${pdfDoc ? pdfDoc.numPages : 0} gewählt`;
}
function parseRange(str, max) {
  const out = new Set();
  for (const part of str.split(/[,;\s]+/)) {
    const m = part.match(/^(\d+)(?:-(\d*))?$/); if (!m) continue;
    const a = +m[1], b = m[2] === undefined ? a : (m[2] === '' ? max : +m[2]);
    for (let i = Math.max(1, Math.min(a, b)); i <= Math.min(max, Math.max(a, b)); i++) out.add(i);
  }
  return out;
}
async function openPdf(file) {
  let lib;
  try { lib = await pdfLib(); } catch (err) { return toast('PDF-Bibliothek fehlt: ' + err.message, 4000); }
  try { pdfDoc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise; }
  catch (err) { return toast('PDF konnte nicht gelesen werden', 3000); }
  const n = pdfDoc.numPages, token = ++pdfToken;
  pdfSel = new Set(Array.from({ length: n }, (_, i) => i + 1));
  $('pdfTitle').textContent = `PDF-Seiten importieren – ${file.name} (${n} S.)`;
  $('pdfRange').value = '';
  const box = $('pdfThumbs'); box.textContent = '';
  const cvs = [];
  for (let i = 1; i <= n; i++) {
    const t = document.createElement('div'); t.className = 'thumb'; t.dataset.n = i;
    const cv = document.createElement('canvas'); cv.width = 10; cv.height = 14; cvs.push(cv);
    t.append(cv, 'Seite ' + i);
    t.addEventListener('click', () => { pdfSel.has(i) ? pdfSel.delete(i) : pdfSel.add(i); pdfSync(); });
    box.appendChild(t);
  }
  pdfSync(); openDialog('dlgPdf');
  for (let i = 1; i <= n; i++) {           // Vorschaubilder nacheinander
    if (token !== pdfToken || !$('dlgPdf').classList.contains('open')) return;
    try {
      const page = await pdfDoc.getPage(i), v1 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: 220 / v1.width });
      const cv = cvs[i - 1]; cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
      await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
    } catch (err) { /* Vorschau überspringen */ }
  }
}
async function importPdfPages() {
  const pages = [...pdfSel].sort((a, b) => a - b);
  if (!pdfDoc || !pages.length) return toast('Keine Seite ausgewählt');
  if (editing) commitEdit();
  $('dlgPdf').classList.remove('open'); pdfToken++;
  const gap = 20, add = [], ph = pageH(), [qMax, qF, qJ] = PDF_Q[pdfQ];
  let bytes = 0;
  const cb = unionBox(els);
  // tatsächliche Seitenanfänge (inkl. verschobener Umbrüche), nach unten fortgesetzt
  const starts = [0, ...pageBreaks()];
  const pageOf = yy => { while (starts[starts.length - 1] + ph <= yy) starts.push(starts[starts.length - 1] + ph);
    let i = starts.length - 1; while (starts[i] > yy) i--; return [starts[i], starts[i + 1] !== undefined ? starts[i + 1] : starts[i] + ph]; };
  let y = cb ? cb.y + cb.h + gap : 0;
  if (pageFmt === 'landscape' && cb) { const [a, e] = pageOf(cb.y + cb.h); y = e; }   // Querformat: neue Druckseite
  for (const [k, n] of pages.entries()) {
    toast(`Importiere Seite ${n} (${k + 1}/${pages.length}) …`, 60000);
    const page = await pdfDoc.getPage(n), v1 = page.getViewport({ scale: 1 });
    const ratio = v1.height / v1.width;
    // linke Hälfte; im Querformat zusätzlich auf eine Druckseitenhöhe begrenzt
    const w = pageFmt === 'landscape' ? Math.min(W / 2, (ph - 4) / ratio) : W / 2, h = w * ratio;
    // Seite nie über einen Umbruch legen: sonst an den nächsten Seitenanfang
    { const [a, e] = pageOf(y); if (h < ph && y + h > e) y = e; }
    const vp = page.getViewport({ scale: Math.min(qMax, Math.round(w * qF)) / v1.width });
    const cv = document.createElement('canvas'); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    ctx.strokeStyle = '#b0b0b0'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, cv.width - 2, cv.height - 2);
    // Textseiten werden als PNG oft deutlich kleiner als als JPEG (und schärfer) – die kleinere Fassung gewinnt
    const jpg = cv.toDataURL('image/jpeg', qJ), png = cv.toDataURL('image/png'), href = png.length < jpg.length ? png : jpg;
    add.push({ id: nid(), t: 'i', x: 0, y: r1(y + (pageFmt === 'landscape' ? 2 : 0)), w: r1(w), h: r1(h), href });
    bytes += href.length;
    y = pageFmt === 'landscape' ? pageOf(y)[1] : y + h + gap;
  }
  const last = add[add.length - 1];
  // Fläche bis zum Ende der letzten Druckseite verlängern
  change([...els, ...add], Math.max(H, Math.ceil(pageOf(last.y + last.h - 1)[1])));
  sel.clear(); drawUi();
  cont.scrollTop = add[0].y * scale() - 10;
  toast(`${pages.length} Seite${pages.length > 1 ? 'n' : ''} importiert (${fmtSize(bytes)})`, 2500);
}
$('pdfInput').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) openPdf(f); });
$('pdfAll').addEventListener('click', () => { pdfSel = new Set(Array.from({ length: pdfDoc ? pdfDoc.numPages : 0 }, (_, i) => i + 1)); pdfSync(); });
$('pdfNone').addEventListener('click', () => { pdfSel.clear(); pdfSync(); });
$('pdfRange').addEventListener('input', e => { if (pdfDoc && e.target.value.trim()) { pdfSel = parseRange(e.target.value, pdfDoc.numPages); pdfSync(); } });
$('pdfRange').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); importPdfPages(); } });
$('pdfGo').addEventListener('click', importPdfPages);

// ===================================================================== Zweites Fenster (Live-Spiegelung)
// Kopplung per postMessage (funktioniert auch bei file://). Elemente sind unveränderlich:
// gesendet werden nur neue/geänderte Objekte plus die Reihenfolge der ids.
let peer = null, awaitingFull = false, followView = IS_MIRROR, applyingRemote = false;   // 2. Fenster folgt von Anfang an
let suppressScroll = 0;                    // verhindert Ping-Pong beim gegenseitigen Scrollen
let knownByPeer = new WeakSet(), lastSent = {}, syncTimer = 0, viewRaf = 0;
function post(msg) {
  if (!peer) return;
  if (peer.closed) { peer = null; syncPanel(); toast('Verbindung zum anderen Fenster getrennt', 2000); return; }
  try { peer.postMessage({ tb: 1, ...msg }, '*'); } catch (e) { /* Fenster weg */ }
}
function scheduleSync() {
  if (!peer || applyingRemote || awaitingFull) return;
  if (lastSent.els === els && lastSent.H === H && lastSent.mb === mb && lastSent.fmt === pageFmt && lastSent.W === W) return;
  clearTimeout(syncTimer); syncTimer = setTimeout(() => sendState(false), 30);
}
function sendState(full) {
  const add = full ? els : els.filter(e => !knownByPeer.has(e));
  add.forEach(e => knownByPeer.add(e));
  post({ type: 'state', full, order: els.map(e => e.id), add, W, H, mb, fmt: pageFmt, fileName });
  lastSent = { els, H, mb, fmt: pageFmt, W };
}
function sendView() { post({ type: 'view', y: cont.scrollTop / scale() }); }
function applyRemote(m) {
  const map = new Map(els.map(e => [e.id, e]));
  for (const e of m.add) { map.set(e.id, e); knownByPeer.add(e); }
  const newEls = m.order.map(id => map.get(id)).filter(Boolean);
  if (m.full) { undoStack = []; redoStack = []; } else { undoStack.push(snapshot()); redoStack = []; }   // gemeinsamer Verlauf
  applyingRemote = true;
  els = newEls; mb = m.mb || []; breakCache = null;
  if (m.fmt && m.fmt !== pageFmt) { pageFmt = m.fmt; setPageStyle(); }
  if (m.fileName !== undefined) fileName = m.fileName;
  if (m.W !== W || m.H !== H) { W = m.W; H = m.H; applySize(); }
  pruneSel(); render(); syncPanel();
  lastSent = { els, H, mb, fmt: pageFmt, W };
  applyingRemote = false;
  for (const [id, p] of previews) if (p.done) dropPreview(id);
  if (m.full) { awaitingFull = false; setDirty(false); if (!IS_MIRROR) {} } else setDirty(true);
}
window.addEventListener('message', e => {
  const m = e.data;
  if (!m || m.tb !== 1) return;
  if (m.type === 'hello') {                       // ein (neues) zweites Fenster meldet sich
    peer = e.source; knownByPeer = new WeakSet(); awaitingFull = false; followView = true;
    sendState(true); sendView(); post({ type: 'follow', on: true }); syncPanel(); toast('Zweites Fenster verbunden', 1500); return;
  }
  if (e.source !== peer) return;
  if (m.type === 'state') applyRemote(m);
  else if (m.type === 'view') {
    if (followView) {
      const target = m.y * scale();
      if (Math.abs(cont.scrollTop - target) > 1) { suppressScroll = performance.now() + 150; cont.scrollTop = target; }
    }
  }
  else if (m.type === 'follow') { followView = !!m.on; syncPanel(); }
  else if (m.type === 'needView') sendView();
  else if (m.type === 'editPreview') showPreview(m);
  else if (m.type === 'bye') { peer = null; syncPanel(); toast('Anderes Fenster wurde geschlossen', 2000); }
});
cont.addEventListener('scroll', () => {
  if (!peer || viewRaf || !followView) return;
  if (performance.now() < suppressScroll) return;   // dieses Scrollen kam vom anderen Fenster -> nicht zurückschicken
  viewRaf = requestAnimationFrame(() => { viewRaf = 0; sendView(); });
});
setInterval(() => { if (peer && peer.closed) { peer = null; syncPanel(); toast('Verbindung zum anderen Fenster getrennt', 2000); } }, 1500);
function openMirror() {
  if (IS_MIRROR) return toast('Das ist bereits das zweite Fenster');
  if (peer && !peer.closed) { peer.focus(); return toast('Zweites Fenster ist schon offen'); }
  if (editing) commitEdit();
  const w = window.open(location.href.split('#')[0] + '#mirror', 'terbiboard_mirror', 'popup,width=1200,height=800');
  if (!w) toast('Popup blockiert – bitte für diese Seite erlauben', 3000);
  else toast('Fenster auf das zweite Display ziehen, dann F11 für Vollbild', 3500);
}

// ===================================================================== Start
window.addEventListener('resize', () => requestAnimationFrame(applySize));
if ('ResizeObserver' in window) new ResizeObserver(() => applySize()).observe(cont);

function init() {
  buildPanel(); setPageStyle();
  try { if (innerWidth < 700 && localStorage.getItem('wb2.collapsed') === null) { document.body.classList.add('collapsed'); $('collapse').textContent = '›'; } } catch (e) {}
  freshSize();
  setMode('draw'); applySize(); render(); setDirty(false);
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol))
    navigator.serviceWorker.register('sw.js').catch(() => {});
  if (IS_MIRROR && window.opener) { peer = window.opener; awaitingFull = true; post({ type: 'hello' }); syncPanel(); }
  else try { if (!localStorage.getItem('wb2.seen')) { localStorage.setItem('wb2.seen', '1'); openDialog('dlgHelp'); } } catch (e) {}
}
init();
// für Tests/Debugging
window.WB2 = { get els() { return els; }, get H() { return H; }, get W() { return W; }, serialize, loadText, insertText, setMode, ACTIONS };
})();
