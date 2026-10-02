// Wandelt die Dossier-PDFs in strukturierte Artikel (app/data/articles.js) um.
//   node tools/build-data.mjs <Ordner mit PDFs>
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parsePdf } from './parse.mjs';

const SRC = path.resolve(process.argv[2] || 'source');
const OUT = path.resolve('app');
fs.mkdirSync(path.join(OUT, 'data'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'assets/fig'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'pdf'), { recursive: true });

// ---------- Hilfsfunktionen ----------
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const stripTags = h => h.replace(/<[^>]+>/g, '');
const unesc = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const slug = s => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'x';
const lum = c => { const n = parseInt(c.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };
const HEAD_COLORS = new Set(['#0b1f3a', '#14213d', '#14284b', '#1b7f8c', '#0e7c86', '#0f766e']);
const BULLET = /^[•▪●◦]\s*/;

// ---------- Dokumente ----------
const files = [];
for (const f of fs.readdirSync(SRC)) if (/Setting_|Solares_Rechtsbuch/.test(f) && f.endsWith('.pdf')) files.push(path.join(SRC, f));
const ed = path.join(SRC, 'Einzeldossiers');
if (fs.existsSync(ed)) for (const f of fs.readdirSync(ed).sort()) if (f.endsWith('.pdf')) files.push(path.join(ed, f));

const docs = files.map(file => ({ file, pages: parsePdf(file), base: path.basename(file) }));

// Vokabular aus Fließtext (zum Reparieren von mitten im Wort umgebrochenen Tabellenzellen)
const vocab = new Set();
for (const d of docs) for (const p of d.pages) for (const i of p.items)
  for (const w of i.text.split(/\s+/)) vocab.add(w.replace(/^[„"(]+|[.,;:!?)“"]+$/g, ''));

// ---------- Zeilen bilden ----------
function chrome(p, it) {
  if (p.n > 1 && it.top < 62) return true;
  if (it.top > p.h - 90) return true;
  return false;
}

function mkLines(page, figs = []) {
  const inFig = i => figs.some(f => { const cx = i.left + i.width / 2, cy = i.top + i.height / 2; return cx >= f.x0 * 1.5 - 4 && cx <= f.x1 * 1.5 + 4 && cy >= f.y0 * 1.5 - 4 && cy <= f.y1 * 1.5 + 4; });
  const items = page.items.filter(i => !chrome(page, i) && !inFig(i)).sort((a, b) => a.top - b.top || a.left - b.left);
  const lines = [];
  for (const it of items) {
    const L = lines[lines.length - 1];
    if (L && Math.abs(it.top - L.top) <= 3) { L.items.push(it); L.bottom = Math.max(L.bottom, it.top + it.height); }
    else lines.push({ page: page.n, top: it.top, bottom: it.top + it.height, items: [it] });
  }
  for (const f of figs) lines.push({ page: page.n, top: f.y0 * 1.5, bottom: f.y1 * 1.5, fig: f, items: [], size: 0, left: f.x0 * 1.5 });
  lines.sort((a, b) => a.top - b.top);
  for (const L of lines) {
    if (L.items.length > 1) {
      const big = L.items.filter(i => i.size >= 13), small = L.items.filter(i => i.size <= 10.5 && i.bold && /^[A-ZÄÖÜ\- ]+$/.test(i.text.trim()));
      if (big.length && small.length && big.length + small.length === L.items.length) { L.badge = small.map(i => i.text.trim()).join(' '); L.items = big; }
    }
  }
  for (const L of lines) { if (L.fig) continue; L.items.sort((a, b) => a.left - b.left); L.size = Math.max(...L.items.map(i => i.size)); L.left = L.items[0].left; }
  return lines;
}

// Fragmente einer Zeile zu HTML zusammenfügen
function joinFrags(items) {
  let html = '', prevEnd = null, prevHtml = '', prevIt = null;
  for (const it of items) {
    let h = it.html.replace(/<(?!\/?[bi]>)[^>]*>/g, '');
    if (prevIt && it.size <= prevIt.size - 2 && /^[-−+]?[0-9]{1,3}$/.test(it.text.trim()) && it.left - prevEnd <= 3) h = '<sup>' + h + '</sup>';
    if (html && prevEnd !== null) {
      const gap = it.left - prevEnd;
      const sp = !/\s$/.test(stripTags(prevHtml)) && !/^\s/.test(stripTags(h)) && gap > it.size * 0.12;
      if (sp) html += ' ';
    }
    html += h; prevEnd = it.left + it.width; prevHtml = h; if (!/^<sup>/.test(h)) prevIt = it;
  }
  return html.replace(/<b>(\s*)<\/b>|<i>(\s*)<\/i>/g, '$1$2').replace(/<\/b>(\s*)<b>/g, '$1').replace(/<\/i>(\s*)<i>/g, '$1').replace(/\s+/g, ' ').trim();
}
const lineText = L => unesc(stripTags(joinFrags(L.items)));

// Fragmente in "Spalten-Lücken" gruppieren
function segments(L) {
  const segs = [];
  for (const it of L.items) {
    const s = segs[segs.length - 1];
    if (s && it.left - (s.right) <= Math.max(14, it.size * 1.1)) { s.items.push(it); s.right = it.left + it.width; }
    else segs.push({ items: [it], left: it.left, right: it.left + it.width });
  }
  return segs;
}

// ---------- Tabellen ----------
function cellHtml(items) {
  items = [...items].sort((a, b) => a.top - b.top || a.left - b.left);
  const rows = [];
  for (const it of items) {
    const r = rows[rows.length - 1];
    if (r && Math.abs(it.top - r.top) <= 3) r.items.push(it); else rows.push({ top: it.top, items: [it] });
  }
  let out = '';
  for (const r of rows) {
    const h = joinFrags(r.items.sort((a, b) => a.left - b.left));
    if (!out) { out = h; continue; }
    const pw = unesc(stripTags(out)).split(/\s+/).pop(), nw = unesc(stripTags(h)).split(/\s+/)[0];
    const clean = w => w.replace(/^[„"(]+|[.,;:!?)“"]+$/g, '');
    if (nw && /^\p{Ll}/u.test(nw) && ((vocab.has(clean(pw + nw)) && (!vocab.has(clean(pw)) || clean(nw).length <= 2)) || (/^<b>/.test(out) && /^<b>/.test(h) && !/\s/.test(clean(nw))))) out = out.replace(/<\/([bi])>$/, '') + h.replace(/^<([bi])>/, '');
    else out += ' ' + h;
  }
  return out.replace(/<\/b>\s*<b>/g, ' ').trim();
}

function clusterLefts(items, tol = 6) {
  const xs = [...new Set(items.map(i => i.left))].sort((a, b) => a - b);
  const cols = [];
  for (const x of xs) { if (cols.length && x - cols[cols.length - 1] <= tol) continue; cols.push(x); }
  return cols;
}

function splitAtCols(items, cols) {
  const out = [];
  for (const it of items) {
    let cur = it, done = false;
    while (!done) {
      done = true;
      const nextCol = cols.find(c => c > cur.left + 8 && c < cur.left + cur.width - 6);
      if (nextCol && !/<[^>]+>/.test(cur.html.replace(/<\/?[bi]>/g, '')) && /\s/.test(cur.text)) {
        const t = cur.text, idx = Math.round(((nextCol - cur.left) / cur.width) * t.length);
        let best = -1;
        for (let d = 0; d <= 4; d++) { if (t[idx + d] === ' ') { best = idx + d; break; } if (t[idx - d] === ' ') { best = idx - d; break; } }
        if (best > 0) {
          const l = { ...cur, text: t.slice(0, best), html: cur.html.slice(0, cur.html.indexOf(t.slice(0, best)) + best), width: nextCol - cur.left - 4 };
          const r = { ...cur, text: t.slice(best + 1), html: t.slice(best + 1).replace(/&/g, '&amp;'), left: nextCol, width: cur.left + cur.width - nextCol };
          l.html = esc(l.text); out.push(l); cur = r; done = false; continue;
        }
      }
    }
    out.push(cur);
  }
  return out;
}

function buildTable(headItems, bodyItems) {
  const cols = clusterLefts(headItems); const head0 = [];
  const bl = bodyItems.length ? Math.min(...bodyItems.map(i => i.left)) : cols[0];
  if (bl < cols[0] - 6) { cols.unshift(bl); head0.push(''); }
  bodyItems = splitAtCols(bodyItems, cols);
  const colOf = it => { let c = 0; for (let k = 0; k < cols.length; k++) if (it.left >= cols[k] - 6) c = k; return c; };
  const head = cols.map((_, k) => cellHtml(headItems.filter(i => colOf(i) === k)));
  const tops = [...new Set(bodyItems.map(i => i.top))].sort((a, b) => a - b);
  const size = Math.max(...bodyItems.map(i => i.size), 12);
  const starts = [];
  tops.forEach((t, k) => { if (k === 0 || t - tops[k - 1] > size * 1.7) starts.push(t); });
  const rowOf = it => { let r = 0; for (let k = 0; k < starts.length; k++) if (it.top >= starts[k] - 4) r = k; return r; };
  const rows = starts.map(() => cols.map(() => []));
  for (const it of bodyItems) rows[rowOf(it)][colOf(it)].push(it);
  return { t: 'table', head, rows: rows.map(r => r.map(cellHtml)) };
}

// ---------- Block-Aufbau je Dokument ----------
function headingLevel(L, firstPageMax) {
  const its = L.items;
  if (!its.every(i => i.bold)) return 0;
  const col = its[0].color, size = L.size;
  if (col === '#ffffff') return 0;
  if (size >= 36) return 1;
  if (size >= 27 && size < 36) return size === firstPageMax ? 'title' : 2;
  if (size >= 19) return 2;
  if (size >= 16) return 3;
  if (size >= 13 && HEAD_COLORS.has(col) && its.length === 1) return 4;
  return 0;
}

function buildDoc(doc, figs) {
  const blocks = [];
  const meta = { title: '', subtitle: '', ref: '' };
  const page1 = doc.pages[0];
  const refm = doc.pages.map(p => p.items.map(i => i.text).join(' ')).join(' ').match(/Ref-ID:\s*(2234-[A-Z0-9]+)/);
  if (refm) meta.ref = refm[1];
  const firstMax = Math.max(...page1.items.filter(i => i.top > 60 && !(chrome(page1, i))).map(i => i.size));
  let skipToc = false, partLabel = '';
  let pending = null; // aktueller Absatz
  const flush = () => { if (pending) { blocks.push(pending); pending = null; } };

  for (const page of doc.pages) {
    const lines = mkLines(page, figs.filter(f => f.page === page.n));
    let k = 0, prevBottom = 62, inCover = page.n === 1;
    const push = (b, L) => { flush(); b.page = page.n; blocks.push(b); prevBottom = (L && L.bottom) || prevBottom; };
    while (k < lines.length) {
      const L = lines[k];
      if (L.fig) {
        let cap = '', j = k + 1;
        const C = lines[j];
        if (C && !C.fig && C.items[0] && C.items[0].italic && /^(Abb\.|Tab\.)/.test(lineText(C)) && C.top - L.bottom < 70) {
          cap = joinFrags(C.items); j++;
          while (j < lines.length && !lines[j].fig && lines[j].items.every(i => i.italic) && lines[j].top - lines[j - 1].top < 22) { cap += ' ' + joinFrags(lines[j].items); j++; }
        }
        push({ t: 'figure', img: L.fig.file, ar: L.fig.ar, caption: cap }, L); k = j; continue;
      }
      const first = L.items[0];
      const text = lineText(L);

      // Titel (Seite 1)
      if (page.n === 1 && L.size === firstMax && L.items.every(i => i.bold) && !meta.titleDone) {
        meta.title += (meta.title ? ' ' : '') + text; prevBottom = L.bottom;
        const nx = lines[k + 1];
        if (!(nx && nx.size === firstMax)) meta.titleDone = true;
        k++; continue;
      }
      if (page.n === 1 && meta.titleDone && !meta.subDone && L.top < 260 && L.size <= 20 && first.top < 200 && (lum(first.color) > 150 || first.color === '#0e7c86' || L.size === 20)) {
        meta.subtitle += (meta.subtitle ? ' · ' : '') + text; prevBottom = L.bottom; k++;
        const nx = lines[k]; if (!(nx && nx.top - L.bottom < 12 && nx.size === L.size)) meta.subDone = true; continue;
      }
      if (page.n === 1 && !meta.titleDone) { k++; continue; } // Deckblatt-Kram vor dem Titel
      // Deckblatt des Rechtsbuchs: alles überspringen
      if (page.n === 1 && firstMax >= 50) { k++; continue; }

      // Inhaltsverzeichnis überspringen
      if (/^Inhaltsverzeichnis$/.test(text)) { skipToc = true; k++; continue; }
      const hl = headingLevel(L, firstMax);
      if (skipToc) { if (hl && hl !== 'title' && hl <= 2 && !/Inhaltsverzeichnis/.test(text)) skipToc = false; else { k++; continue; } }

      // Band-Überschrift (weiß auf dunkel, groß) – z. B. Schiffsklassen-Karten
      if (first.color === '#ffffff' && first.bold && L.size >= 15) {
        const segs = segments(L);
        const title = joinFrags(segs[0].items);
        const tag = segs[1] ? joinFrags(segs[1].items) : '';
        push({ t: 'h', level: 3, text: unesc(stripTags(title)).replace(/\s*\|\s*/g, ' – '), tag: unesc(stripTags(tag)) }, L);
        k++; continue;
      }

      // Tabelle (weiße Kopfzeile)
      if (first.color === '#ffffff' && first.bold) {
        const headItems = []; let j = k; let lastTop = L.top;
        while (j < lines.length && lines[j].items.length && lines[j].items.every(i => i.color === '#ffffff' && i.bold) && lines[j].top - lastTop <= 26) { headItems.push(...lines[j].items); lastTop = lines[j].top; j++; }
        const hsize = Math.max(...headItems.map(i => i.size));
        const leftMin = Math.min(...headItems.map(i => i.left));
        const body = []; let bottom = lastTop;
        while (j < lines.length) {
          const M = lines[j];
          if (M.fig || M.items.some(i => i.size > hsize + 0.5 || i.italic || i.left < 60) ) break;
          if (M.top - bottom > 60) break;
          body.push(...M.items); bottom = M.bottom; j++;
        }
        const tbl = buildTable(headItems, body);
        const prev = blocks[blocks.length - 1];
        if (prev && prev.t === 'table' && prev.page === page.n - 1 && JSON.stringify(prev.head) === JSON.stringify(tbl.head) && headItems[0].top < 120 && !pending) {
          prev.rows.push(...tbl.rows); prevBottom = bottom;
        } else push({ ...tbl }, { bottom });
        k = j; continue;
      }

      // Kennwert-Raster: [Bezeichner, Wert, Bezeichner, Wert] je Zeile
      if (L.items.length >= 4 && L.items[0].bold && !L.items[1].bold && L.items[2].bold && !L.items[3].bold && L.size <= 13 && L.size >= 11.5 && L.items[0].color !== '#ffffff') {
        const cols = L.items.slice(0, 4).map(i => i.left); let j = k;
        const inCols = M => M.items.length > 0 && M.items.every(i => cols.some(c => Math.abs(c - i.left) <= 4));
        while (j < lines.length && inCols(lines[j]) && (j === k || lines[j].top - lines[j - 1].top <= 32)) j++;
        const rowsL = []; for (let m = k; m < j; m++) { const r = rowsL[rowsL.length - 1]; if (r && lines[m].top - r.last <= 20) { r.lines.push(lines[m]); r.last = lines[m].top; } else rowsL.push({ lines: [lines[m]], last: lines[m].top }); }
        const cells = [];
        for (const r of rowsL) for (let pr = 0; pr < 2; pr++) {
          const grab = c => r.lines.flatMap(M => M.items.filter(i => Math.abs(i.left - cols[c]) <= 4));
          const lab = cellHtml(grab(pr * 2)).replace(/<\/?b>/g, ''), val = cellHtml(grab(pr * 2 + 1));
          if (lab || val) cells.push([unesc(stripTags(lab)), val]);
        }
        push({ t: 'facts', cells }, lines[j - 1]); k = j; continue;
      }

      // Info-Box: Bezeichner/Wert-Raster (Label-Zeile fett + Werte darunter)
      if (L.items.every(i => i.bold && i.size <= 13 && i.size >= 11.5 && !HEAD_COLORS.has(i.color) && i.color !== '#ffffff') && L.size <= 13 && !hl) {
        const labels = L.items.map(i => i.left);
        const nx = lines[k + 1];
        if (nx && nx.items.length && nx.items.every(i => !i.bold && labels.some(x => Math.abs(x - i.left) <= 4)) && nx.top - L.top < 26) {
          const pairs = []; let j = k;
          while (j < lines.length) {
            const A = lines[j], B = lines[j + 1];
            if (!(A.items.length && A.items.every(i => i.bold && i.size <= 13 && i.color !== '#ffffff') && B && B.items.length && B.items.every(i => !i.bold && A.items.some(x => Math.abs(x.left - i.left) <= 4)) && B.top - A.top < 26)) break;
            let m = j + 2; const vals = new Map();
            for (const a of A.items) vals.set(a.left, []);
            const add = (X) => { for (const i of X.items) { const a = A.items.find(x => Math.abs(x.left - i.left) <= 4); if (a) vals.get(a.left).push(i); } };
            add(B);
            while (m < lines.length && lines[m].items.length && lines[m].top - lines[m - 1].top < 20 && lines[m].items.every(i => !i.bold && A.items.some(x => Math.abs(x.left - i.left) <= 4))) { add(lines[m]); m++; }
            for (const a of A.items) pairs.push([unesc(stripTags(joinFrags([a]))), cellHtml(vals.get(a.left))]);
            j = m;
          }
          push({ t: 'infobox', pairs }, lines[j - 1]); k = j; continue;
        }
        // Links/Rechts-Paare ("Länge · Masse | 64 m …")
      }
      if (L.items.length >= 2 && L.items[0].bold && L.size <= 13 && L.items[0].color !== '#ffffff' && !L.items[1].bold && L.items[1].left - (L.items[0].left + L.items[0].width) > 8 && !HEAD_COLORS.has('x')) {
        const left = L.items[0].left, vleft = L.items[1].left; const pairs = []; let j = k;
        while (j < lines.length) {
          const A = lines[j];
          const isPair = A.items.length >= 2 && A.items[0].bold && Math.abs(A.items[0].left - left) <= 4 && Math.abs(A.items[1].left - vleft) <= 4;
          const isCont = A.items.length === 1 && !A.items[0].bold && Math.abs(A.items[0].left - vleft) <= 4 && pairs.length && A.top - lines[j - 1].top < 20;
          if (isPair) pairs.push([unesc(stripTags(joinFrags([A.items[0]]))), joinFrags(A.items.slice(1))]);
          else if (isCont) pairs[pairs.length - 1][1] = cellHtml([{ ...A.items[0] }, ...[]].length ? [{ top: 0, left: 0, width: 0, size: 12, html: pairs[pairs.length - 1][1] }, { top: 20, left: 0, width: 0, size: 12, html: A.items[0].html }] : []);
          else break;
          j++;
        }
        if (pairs.length >= 2) { push({ t: 'infobox', pairs, narrow: true }, lines[j - 1]); k = j; continue; }
      }

      // Überschriften
      if (hl && hl !== 'title' && /=/.test(text) && hl >= 2) { push({ t: 'p', html: joinFrags(L.items), formula: true }, L); k++; continue; }
      if (hl && hl !== 'title') {
        let txt = text, j = k + 1;
        while (j < lines.length && lines[j].size === L.size && lines[j].items.every(i => i.bold) && lines[j].top - lines[j - 1].top < L.size * 1.6) { txt += ' ' + lineText(lines[j]); j++; }
        if (hl === 4 && /^TEIL [IVX]+$/i.test(txt)) { partLabel = 'Teil ' + txt.slice(5).toUpperCase(); k = j; continue; }
        const lvl = hl;
        push({ t: 'h', badge: L.badge || '', level: lvl, text: (lvl === 1 && partLabel ? partLabel + ' – ' : '') + txt }, lines[j - 1]); if (lvl === 1) partLabel = '';
        k = j; continue;
      }

      // Kategorie-Tag (kleine farbige Versalien)
      if (L.items.length === 1 && first.bold && first.size <= 12 && /^[A-ZÄÖÜ0-9 &\-–·\/]{5,}$/.test(text) && HEAD_COLORS.has(first.color) && lines[k + 1] && lines[k + 1].size >= 16) {
        const nx = lines[k + 1];
        // Tag der Folgeüberschrift – nicht für Rechtsbuch-Callouts (diese haben Fließtext danach)
        push({ t: 'tag', text }, L); k++; continue;
      }
      // Callout (Rechtsbuch): kleine Versalienzeile + Text
      if (L.items.length === 1 && first.bold && first.size <= 10.5 && /^[A-ZÄÖÜ0-9 &\-–·\/]{4,}$/.test(text)) {
        const body = []; let j = k + 1; let prevB = L.bottom; const left = lines[j] ? lines[j].left : 0;
        while (j < lines.length && lines[j].size <= 12.5 && lines[j].size >= 11.5 && lines[j].left >= left - 4 && lines[j].top - prevB < 12 && !lines[j].items.some(i => i.bold && i.size <= 10.5)) {
          body.push(joinFrags(lines[j].items)); prevB = lines[j].bottom; j++;
        }
        const lastB = blocks[blocks.length - 1];
        if (!body.length && !pending && lastB && lastB.t === 'h' && lastB.level >= 3 && L.top - prevBottom < 14) { lastB.badge = text; prevBottom = L.bottom; k = j; continue; }
        push({ t: 'callout', kind: text, color: first.color, html: body.join(' ') }, lines[j - 1]);
        k = j; continue;
      }

      // Bildunterschrift ohne Bild (z. B. Tabellenunterschrift) / Fußnote
      if (first.italic && L.items.every(i => i.italic)) {
        let cap = joinFrags(L.items), j = k + 1;
        while (j < lines.length && !lines[j].fig && lines[j].items.length && lines[j].items.every(i => i.italic) && lines[j].top - lines[j - 1].top < 22) { cap += ' ' + joinFrags(lines[j].items); j++; }
        const gapUp = L.top - prevBottom; 
        const blk = { t: 'caption', html: cap };
        if (/^Abb\./.test(text) && gapUp > 110) { blk.t = 'figure'; blk.caption = cap; blk.crop = { page: page.n, y0: (prevBottom + 8) / 1.5, y1: (L.top - 3) / 1.5 }; delete blk.html; }
        push(blk, lines[j - 1]);
        k = j; continue;
      }

      // Strip: mehrere Segmente in einer Zeile, nicht Fließtext
      const segs = segments(L);
      if (segs.length >= 2 && L.size <= 14 && segs.every(s => joinFrags(s.items).length < 90)) {
        const parts = segs.map(s => joinFrags(s.items)); let j = k + 1;
        while (j < lines.length && !lines[j].fig && lines[j].top - lines[j - 1].top <= 24 && lines[j].items.length && lines[j].items.every(i => !i.bold && segs.some(sg => Math.abs(sg.left - i.left) <= 8)) && segments(lines[j]).length <= segs.length && L.size - lines[j].size < 2) {
          for (const sg of segments(lines[j])) { const idx = segs.findIndex(x => Math.abs(x.left - sg.left) <= 8); if (idx >= 0) parts[idx] += ' ' + joinFrags(sg.items); }
          j++;
        }
        push({ t: 'strip', parts }, lines[j - 1]); k = j; continue;
      }

      // Listen und Absätze
      const html = joinFrags(L.items);
      const isBullet = BULLET.test(text);
      const startsPara = /^\(\d{1,2}[a-z]?\)\s|^\d{1,2}\.\s/.test(text) && !isBullet;
      const prev = pending;
      const sameFlow = prev && Math.abs(prev.size - L.size) <= 2.5 && prev.page === page.n && L.top - prev.lastTop <= Math.max(prev.size, L.size) * 1.62 && !isBullet && !startsPara && Math.abs(L.left - prev.lastLeft) <= 44;
      if (sameFlow) {
        prev.html += (prev.html.endsWith('-') && false ? '' : ' ') + html; prev.lastTop = L.top; prev.lastLeft = L.left; prevBottom = L.bottom; k++; continue;
      }
      flush();
      // Fortsetzung über Seitengrenze
      const last = blocks[blocks.length - 1];
      if (!isBullet && !startsPara && last && (last.t === 'p' || last.t === 'li') && last.page === page.n - 1 && Math.abs(last.size - L.size) <= 2.5 && L.top < 130 && !/[.!?:;)“"]$/.test(stripTags(last.html).trim())) {
        last.html += ' ' + html; last.page = page.n; pending = last; blocks.pop(); pending.lastTop = L.top; pending.lastLeft = L.left; prevBottom = L.bottom; k++; continue;
      }
      pending = { t: isBullet ? 'li' : 'p', html: isBullet ? html.replace(BULLET, '').replace(/^<b>•\s*<\/b>/, '') : html, size: L.size, page: page.n, lastTop: L.top, lastLeft: L.left, mode: 'text' };
      if (isBullet) pending.html = html.replace(/^(<[bi]>)?[•▪●◦·]\s*/, '$1');
      prevBottom = L.bottom; k++;
    }
    flush();
  }
  flush();
  // Aufräumen
  for (const b of blocks) { delete b.size; delete b.lastTop; delete b.lastLeft; delete b.mode; }
  for (let q = 0; q < blocks.length - 1; q++) {
    const f = blocks[q], n = blocks[q + 1];
    if (f.t === 'figure' && !f.caption && n.t === 'infobox') { n.img = f.img; blocks.splice(q, 1); q--; }
  }
  // Umgebrochene Kopfzeilen (Status: …) wieder zusammenführen
  for (let q = 1; q < blocks.length; q++) {
    const b = blocks[q], a = blocks[q - 1];
    if (b.t === 'strip' && a.t === 'p' && a.html.length < 80 && /^[^<]*<b>/.test(a.html + '') === false && /^\p{Ll}/u.test(stripTags(b.parts[0])) ) { b.parts[0] = a.html + ' ' + b.parts[0]; blocks.splice(q - 1, 1); q--; }
  }
  // Listen gruppieren
  const out = [];
  for (const b of blocks) {
    if (b.t === 'li') { const l = out[out.length - 1]; if (l && l.t === 'ul') l.items.push(b.html); else out.push({ t: 'ul', items: [b.html], page: b.page }); }
    else out.push(b);
  }
  return { meta, blocks: out };
}

// ---------- Artikel zusammensetzen ----------
const articles = [];
const docInfos = [];
const usedIds = new Set();
const uid = base => { let id = base, k = 2; while (usedIds.has(id)) id = base + '-' + k++; usedIds.add(id); return id; };

docs.forEach((doc, di) => {
  const dslug = slug(doc.base.replace(/_?(20\d\d|Dossier|v\d+)/g, ' ').replace(/\.pdf$/, '')) || 'doc' + di;
  const figs = JSON.parse(execFileSync('python3', [path.join(path.dirname(new URL(import.meta.url).pathname), 'figures.py'), doc.file, path.join(OUT, 'assets/fig'), dslug]).toString());
  const built = buildDoc(doc, figs);
  const crops = built.blocks.filter(b => b.crop);
  if (crops.length) {
    const r = JSON.parse(execFileSync('python3', [path.join(path.dirname(new URL(import.meta.url).pathname), 'figures.py'), '--crop', doc.file, path.join(OUT, 'assets/fig'), dslug], { input: JSON.stringify(crops.map(c => c.crop)) }).toString());
    crops.forEach((c, i) => { c.img = r[i]; delete c.crop; });
  }
  if (/Rechtsbuch/.test(doc.base)) { built.meta.title = 'Solares Rechtsbuch'; built.meta.subtitle = 'Justizministerium | Gesetzbuch | Das Rechtssystem der vereinten Menschheit unter Sol · Stand: Jahr 2234'; built.meta.ref = 'Rechtsbuch'; }
  const title = built.meta.title || doc.base.replace(/\.pdf$/, '').replace(/_/g, ' ');
  const kindPart = built.blocks.some(b => b.t === 'h' && b.level === 1);
  const root = { id: uid(dslug), title, kind: 'doc', doc: dslug, docTitle: title, ref: built.meta.ref, subtitle: built.meta.subtitle, pdf: doc.base, blocks: [], children: [] };
  articles.push(root);
  docInfos.push({ id: root.id, title, subtitle: built.meta.subtitle, ref: built.meta.ref, pdf: doc.base, pages: doc.pages.length });
  let cur = root, part = null, lawAbbr = null, lawArt = null;
  for (const b of built.blocks) {
    if (b.t === 'h' && b.level === 1) {
      part = { id: uid(dslug + '-' + slug(b.text)), title: b.text, kind: 'part', doc: dslug, docTitle: title, ref: built.meta.ref, pdf: doc.base, parent: root.id, blocks: [], children: [], page: b.page };
      articles.push(part); root.children.push(part.id); cur = part; lawAbbr = null; lawArt = null; continue;
    }
    if (b.t === 'h' && b.level === 2) {
      const sizeNote = b.text;
      const m = sizeNote.match(/\(([A-Za-zÄÖÜ]{3,10})\)\s*$/);
      let atitle = b.text;
      const isLaw = !!m && /Gesetz|ordnung|buch/i.test(b.text);
      if (isLaw) lawAbbr = m[1]; else if (lawAbbr && !/^Teil /.test(b.text) && (/^(Abschnitt|Buch|Allgemeiner|Besonderer)/.test(b.text))) atitle = `${lawAbbr}: ${b.text}`;
      let parent = part || root; if (!isLaw && lawArt && atitle.startsWith(lawAbbr + ': ')) parent = lawArt;
      const tagB = cur.blocks[cur.blocks.length - 1]; let category = ''; if (tagB && tagB.t === 'tag') { category = tagB.text; cur.blocks.pop(); }
      const a = { category, id: uid(dslug + '-' + slug(atitle)), title: atitle, kind: 'article', doc: dslug, docTitle: title, ref: built.meta.ref, pdf: doc.base, parent: parent.id, blocks: [], children: [], page: b.page, law: isLaw ? m[1] : lawAbbr };
      articles.push(a); parent.children.push(a.id); cur = a; if (isLaw) lawArt = a; else if (!atitle.startsWith((lawAbbr||'#') + ': ')) lawArt = null; continue;
    }
    cur.blocks.push(b);
  }
});

// ---------- Anker + Inhaltsverzeichnis ----------
for (const a of articles) {
  const seen = new Set(); a.toc = [];
  for (const b of a.blocks) if (b.t === 'h') {
    let id = slug(b.text.replace(/^§\s*/, 'p')); if (!id || seen.has(id)) id += '-' + (seen.size + 1); seen.add(id); b.id = id;
    a.toc.push({ id, level: b.level, text: b.text });
  }
}

// ---------- Link-Index ----------
const clean = t => t.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
const targets = new Map(); // alias(lower) -> [{article, anchor, rank, doc}]
const GENERIC = new Set(['fracht', 'personen', 'geschäft', 'unternehmen', 'setzung', 'monde', 'auswanderer', 'bundesunternehmen', 'reedereien', 'sekundärsektor', 'primärsektor', 'tertiärsektor', 'territorien', 'regionen', 'provinzen', 'grundlagen', 'ergebnis', 'ergebnisse', 'befunde', 'zeitleiste', 'überblick', 'status', 'daten', 'preise', 'tarife', 'kosten', 'risiken', 'schiffe', 'handel', 'energie', 'wasser', 'nahrung', 'bau', 'stationen', 'bauweise', 'umwelt', 'leben', 'zugang', 'besiedlung', 'terraforming', 'ausblick', 'alltag', 'ursprung', 'konzerne', 'firmen']);
const addTarget = (alias, art, anchor, rank, cs = false) => {
  alias = alias.trim(); if (GENERIC.has(alias.toLowerCase())) return; if (alias.length < 3 || /^(Teil|Buch|Abschnitt|Status|Überblick|Ursprung|Ausblick|Alltag|Kennwerte|Quellen|Einführung|Fazit|Geschichte|Wirtschaft|Recht|Staat)\b/i.test(alias) && alias.length < 9) return;
  const k = alias.toLowerCase(); const arr = targets.get(k) || []; arr.push({ article: art.id, anchor, rank, doc: art.doc, alias, cs }); targets.set(k, arr);
};
const aliasesOf = t => {
  const out = new Set(); const base = clean(t); out.add(base);
  for (const part of base.split(/\s+[–|]\s+|:\s+/)) out.add(part.trim());
  const paren = [...t.matchAll(/\(([^)]+)\)/g)].map(m => m[1].replace(/^amtlich:\s*/, '').trim());
  for (const p of paren) if (p.length >= 3 && p.length < 30 && !/\d{3}/.test(p)) out.add(p);
  for (const o of [...out]) { const s = o.replace(/\s+(AG|GmbH|eG|SE|Gruppe|Stiftung)$/, ''); if (s.length >= 3) out.add(s); const dash = o.match(/^(.+?)-Klasse$/); if (dash) out.add(dash[1]); }
  return [...out].filter(x => x.length >= 3 && x.length < 60);
};
for (const a of articles) {
  if (a.kind !== 'doc') for (const al of aliasesOf(a.title.replace(/^[A-Za-zÄÖÜ]{3,10}: /, ''))) addTarget(al, a, '', 0);
  if (a.kind === 'doc') addTarget(a.title, a, '', 0);
  for (const t of a.toc) if (t.level >= 3 && !/^§/.test(t.text)) for (const al of aliasesOf(t.text)) addTarget(al, a, t.id, t.level - 1);
}
// Paragraphen-Verweise: Ref-IDs
const refMap = new Map(); for (const a of articles) if (a.kind === 'doc' && a.ref) refMap.set(a.ref, a.id);
// §-Anker je Gesetz
const lawArticles = new Map(); // abbr -> [article ids]
const paraTargets = new Map(); // abbr|n -> {article, anchor}
for (const a of articles) {
  if (!a.law) continue;
  for (const t of a.toc) { const m = t.text.match(/^§\s*(\d+[a-z]?)\b/); if (m) paraTargets.set(a.law + '|' + m[1], { article: a.id, anchor: t.id }); }
  const lt = lawArticles.get(a.law) || []; lt.push(a); lawArticles.set(a.law, lt);
}
for (const [abbr, arr] of lawArticles) addTarget(abbr, arr[0], '', 0, true);

// Alias-Regex
const aliasList = [...targets.keys()].sort((a, b) => b.length - a.length);
const re = new RegExp('(?<![\\p{L}\\p{N}-])(' + aliasList.map(s => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')).join('|') + ')(?:s|es|n|en|e)?(?![\\p{L}\\p{N}])', 'giu');
const reRef = /\b2234-A\d+\b/g;
const rePara = /§§?\s*(\d+[a-z]?)(?:\s*(?:Abs\.\s*\d+|S\.\s*\d+|Nr\.\s*\d+)\s*)*(?:\s+([A-Z][A-Za-zÄÖÜäöü-]{2,14}))?/g;

function pick(alias, art) {
  const arr = targets.get(alias.toLowerCase()); if (!arr) return null;
  const cands = arr.filter(t => !(t.article === art.id && !t.anchor) && (!t.cs || t.alias === alias));
  if (!cands.length) return null;
  cands.sort((x, y) => (x.doc === art.doc ? 0 : 1) - (y.doc === art.doc ? 0 : 1) || x.rank - y.rank);
  return cands[0];
}

function linkHtml(html, art, used) {
  if (!html) return html;
  return html.split(/(<[^>]+>)/).map(seg => {
    if (seg.startsWith('<')) return seg;
    let s = seg;
    // §-Verweise
    s = s.replace(rePara, (m, n, abbr) => {
      const law = abbr && lawArticles.has(abbr) ? abbr : art.law; const t = law && paraTargets.get(law + '|' + n);
      if (!t || (t.article === art.id && false)) return m;
      return `<a class="wl" href="#/a/${t.article}/${t.anchor}">${m}</a>`;
    });
    if (s !== seg) return s.replace(/(<a [^>]*>.*?<\/a>)|([^<]+)/g, (m, a, txt) => a ? a : linkPlain(txt, art, used));
    return linkPlain(s, art, used);
  }).join('');
}
function linkPlain(s, art, used) {
  s = s.replace(reRef, m => refMap.has(m) && refMap.get(m) !== art.id ? `<a class="wl" href="#/a/${refMap.get(m)}">${m}</a>` : m);
  s = s.replace(/(?<![\p{L}\p{N}-])A(7[1-9]|8[0-6])(?![\p{L}\p{N}])/gu, (m, n) => refMap.has('2234-A' + n) && refMap.get('2234-A' + n) !== art.id ? `<a class="wl" href="#/a/${refMap.get('2234-A' + n)}">${m}</a>` : m);
  // nicht in bereits erzeugte Links hinein
  return s.split(/(<a [^>]*>.*?<\/a>)/).map(part => {
    if (part.startsWith('<a ')) return part;
    return part.replace(re, (m, alias) => {
      const key = alias.toLowerCase(); if (used.has(key)) return m;
      const t = pick(alias, art); if (!t) return m;
      used.add(key);
      return `<a class="wl" href="#/a/${t.article}${t.anchor ? '/' + t.anchor : ''}">${m}</a>`;
    });
  }).join('');
}

for (const a of articles) {
  let used = new Set();
  for (const b of a.blocks) {
    if (b.t === 'h' && b.level === 3) used = new Set();
    const U = () => used;
    if (b.t === 'p') b.html = linkHtml(b.html, a, U());
    else if (b.t === 'ul') b.items = b.items.map(x => linkHtml(x, a, U()));
    else if (b.t === 'callout') b.html = linkHtml(b.html, a, U());
    else if (b.t === 'figure') b.caption = linkHtml(b.caption, a, U());
    else if (b.t === 'table') { b.rows = b.rows.map(r => r.map(c => linkHtml(c, a, U()))); }
    else if (b.t === 'infobox') b.pairs = b.pairs.map(([l, v]) => [l, linkHtml(v, a, U())]);
    else if (b.t === 'strip') b.parts = b.parts.map(x => linkHtml(x, a, U()));
  }
}

// ---------- Suchtext ----------
for (const a of articles) {
  const parts = [];
  for (const b of a.blocks) {
    if (b.t === 'h') parts.push({ h: b.id, text: b.text });
    else if (b.t === 'p' || b.t === 'callout') parts.push({ text: unesc(stripTags(b.html)) });
    else if (b.t === 'ul') parts.push({ text: b.items.map(x => unesc(stripTags(x))).join(' • ') });
    else if (b.t === 'table') parts.push({ text: [b.head.map(c => unesc(stripTags(c))).join(' | '), ...b.rows.map(r => r.map(c => unesc(stripTags(c))).join(' | '))].join(' \n ') });
    else if (b.t === 'infobox') parts.push({ text: b.pairs.map(([l, v]) => l + ': ' + unesc(stripTags(v))).join('; ') });
    else if (b.t === 'figure') parts.push({ text: unesc(stripTags(b.caption)) });
    else if (b.t === 'strip') parts.push({ text: b.parts.map(x => unesc(stripTags(x))).join(' · ') });
  }
  a.search = parts;
}

// Seitenzahlen etc. bereinigen
for (const a of articles) for (const b of a.blocks) delete b.page;

const refNo = d => /^2234-A(\d+)/.test(d.ref) ? +RegExp.$1 : d.ref === 'Rechtsbuch' ? 999 : 0;
docInfos.sort((a, b) => refNo(a) - refNo(b));
for (const d of docInfos) {
  const root = articles.find(a => a.id === d.id);
  const firstP = root.blocks.find(b => b.t === 'p') || (articles.find(a => a.parent === d.id || root.children.includes(a.id)) || { blocks: [] }).blocks.find(b => b.t === 'p');
  let t = firstP ? unesc(stripTags(firstP.html)) : '';
  if (t.length > 230) t = t.slice(0, 230).replace(/\s+\S*$/, '') + ' …';
  d.desc = t; d.count = articles.filter(a => a.doc === root.doc).length;
}
fs.writeFileSync(path.join(OUT, 'data/articles.js'), 'window.WIKI=' + JSON.stringify({ docs: docInfos, articles }) + ';\n');
// PDFs mitliefern
for (const d of docs) fs.copyFileSync(d.file, path.join(OUT, 'pdf', d.base));
const stat = articles.map(a => `${a.kind.padEnd(7)} ${a.id.padEnd(50)} ${String(a.blocks.length).padStart(4)} blocks  ${a.title}`);
console.log(stat.join('\n'));
console.log(articles.length, 'Artikel');
