#!/usr/bin/env node
// MCP-Server für Solarpedia: lässt Claude (Desktop) im Wiki suchen und Artikel lesen.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createRequire } from 'node:module';
const UA = createRequire(import.meta.url)('../app/userarticles.js');
const userDir = process.env.SOLARPEDIA_USER_DIR || path.join(here0(), '..', 'user-articles');
function here0() { return path.dirname(fileURLToPath(import.meta.url)); }

const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(here, '../app/data/articles.js'), 'utf8'), ctx);
const BASE = ctx.window.WIKI;
const baseArticles = BASE.articles;
let docs = BASE.docs, articles = baseArticles, byId = new Map(articles.map(a => [a.id, a])), userBroken = {};

function readUser() {
  if (!fs.existsSync(userDir)) return [];
  return fs.readdirSync(userDir).filter(f => f.endsWith('.md')).map(f => ({ id: f.replace(/\.md$/, ''), md: fs.readFileSync(path.join(userDir, f), 'utf8') }));
}

const dec = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
// HTML (mit Links) -> Markdown; Verweise bleiben als [[artikel-id]] erhalten
const md = h => dec(String(h || '')
  .replace(/<a [^>]*href="#\/a\/([a-z0-9-]+)(?:\/[^"]*)?"[^>]*>(.*?)<\/a>/g, '$2 [[$1]]')
  .replace(/<b>(.*?)<\/b>/g, '**$1**').replace(/<i>(.*?)<\/i>/g, '*$1*').replace(/<sup>(.*?)<\/sup>/g, '^$1').replace(/<[^>]+>/g, ''));

function render(a, section) {
  let out = `# ${a.title}\n_Dossier: ${a.docTitle}${a.ref ? ' (' + a.ref + ')' : ''} · id: ${a.id}_\n\n`;
  let on = !section, found = !section;
  for (const b of a.blocks) {
    if (b.t === 'h') {
      if (section) { on = b.id === section || b.text.toLowerCase().includes(section.toLowerCase()); found = found || on; }
      if (on) out += `\n${'#'.repeat(b.level)} ${b.text}${b.badge || b.tag ? ' (' + (b.badge || b.tag) + ')' : ''}\n`;
      continue;
    }
    if (!on) continue;
    if (b.t === 'p') out += md(b.html) + '\n\n';
    else if (b.t === 'ul') out += b.items.map(i => '- ' + md(i)).join('\n') + '\n\n';
    else if (b.t === 'callout') out += `> **${b.kind}:** ${md(b.html)}\n\n`;
    else if (b.t === 'caption') out += md(b.html) + '\n\n';
    else if (b.t === 'figure') out += `[Abbildung: ${md(b.caption)}]\n\n`;
    else if (b.t === 'strip') out += b.parts.map(md).join(' | ') + '\n\n';
    else if (b.t === 'facts') out += b.cells.map(([l, v]) => `- **${l}:** ${md(v)}`).join('\n') + '\n\n';
    else if (b.t === 'infobox') out += b.pairs.map(([l, v]) => `- **${l}:** ${md(v)}`).join('\n') + '\n\n';
    else if (b.t === 'table') {
      out += `| ${b.head.map(md).join(' | ')} |\n|${b.head.map(() => '---').join('|')}|\n` + b.rows.map(r => `| ${r.map(c => md(c).replace(/\|/g, '/')).join(' | ')} |`).join('\n') + '\n\n';
    }
  }
  if (!found) out += `(Abschnitt „${section}“ nicht gefunden. Verfügbar: ${a.toc.map(t => t.text).join('; ')})\n`;
  if (a.children.length) out += '\n## Unterartikel\n' + a.children.map(id => `- ${byId.get(id).title} [[${id}]]`).join('\n') + '\n';
  return out;
}

// einfache Suche: alle Wörter müssen vorkommen, Titel zählt stärker
const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
const mkIndex = a => {
  const secs = []; let cur = { h: '', anchor: '', text: '' };
  for (const p of a.search) { if (p.h !== undefined) { secs.push(cur); cur = { h: p.text, anchor: p.h, text: '' }; } else cur.text += ' ' + p.text; }
  secs.push(cur);
  return { a, t: fold(a.title), secs: secs.map(s => ({ ...s, n: fold(s.h + ' ' + s.text) })) };
};
const baseIndex = baseArticles.map(mkIndex);
let index = baseIndex;

// bei jedem Aufruf: eigene Artikel neu einlesen
function refresh() {
  const W = { docs: BASE.docs.slice(), articles: baseArticles.slice() };
  userBroken = UA.merge(W, readUser()).broken;
  docs = W.docs; articles = W.articles; byId = new Map(articles.map(a => [a.id, a]));
  index = baseIndex.concat(articles.slice(baseArticles.length).map(mkIndex));
}
refresh();

function search(q, limit) {
  const ts = fold(q).split(/\s+/).filter(Boolean);
  const res = [];
  for (const it of index) {
    const body = it.secs.map(s => s.n).join(' ');
    if (!ts.every(t => it.t.includes(t) || body.includes(t))) continue;
    let score = ts.reduce((n, t) => n + (it.t.includes(t) ? 50 : 0) + Math.min(body.split(t).length - 1, 10), 0);
    let best = it.secs[0], bs = -1;
    for (const s of it.secs) { const sc = ts.filter(t => s.n.includes(t)).length * 10 + ts.reduce((n, t) => n + Math.min(s.n.split(t).length - 1, 5), 0); if (sc > bs) { bs = sc; best = s; } }
    score += bs;
    const pos = Math.max(0, best.n.indexOf(ts[0]) - 80);
    res.push({ it, score, best, snip: (best.h && !best.text ? best.h : best.text).trim().slice(pos, pos + 260) });
  }
  return res.sort((x, y) => y.score - x.score).slice(0, limit);
}

const server = new McpServer({ name: 'solarpedia', version: '1.0.0' });
const text = t => ({ content: [{ type: 'text', text: t }] });

server.tool('search_wiki', 'Volltextsuche in der Solarpedia (Dossiers der Solarrepublik 2234/2235, Solares Rechtsbuch). Liefert Artikel-IDs, Abschnitte und Textauszüge.',
  { query: z.string().describe('Suchbegriffe, z. B. "Sperrzone Gateway"'), limit: z.number().int().min(1).max(25).default(8) },
  async ({ query, limit }) => {
    refresh();
    const r = search(query, limit);
    if (!r.length) return text('Keine Treffer.');
    return text(r.map((x, i) => `${i + 1}. **${x.it.a.title}** — id: \`${x.it.a.id}\`${x.best.anchor ? ` · Abschnitt: ${x.best.h} (\`${x.best.anchor}\`)` : ''}\n   Dossier: ${x.it.a.docTitle}\n   … ${x.snip.replace(/\s+/g, ' ')} …`).join('\n\n'));
  });

server.tool('get_article', 'Liest einen Artikel der Solarpedia vollständig (oder nur einen Abschnitt) als Markdown. Verweise auf andere Artikel stehen als [[artikel-id]].',
  { id: z.string().describe('Artikel-ID aus search_wiki oder list_articles'), section: z.string().optional().describe('Optional: Abschnitts-ID oder Teil der Überschrift') },
  async ({ id, section }) => {
    refresh();
    const a = byId.get(id);
    if (!a) return text(`Artikel "${id}" nicht gefunden. Nutze search_wiki oder list_articles.`);
    return text(render(a, section));
  });

server.tool('list_articles', 'Listet alle Dossiers, oder die Artikel eines Dossiers (doc = Dossier-ID).',
  { doc: z.string().optional().describe('Dossier-ID, z. B. "antriebstechnologien-2234"; weglassen für die Dossier-Übersicht') },
  async ({ doc }) => {
    refresh();
    if (!doc) return text(docs.map(d => `- ${d.title} — id: \`${d.id}\` (${d.ref}, ${d.count} Artikel)`).join('\n'));
    const root = byId.get(doc);
    if (!root) return text(`Dossier "${doc}" nicht gefunden.`);
    return text(articles.filter(a => a.doc === root.doc).map(a => `- ${a.title} — id: \`${a.id}\``).join('\n'));
  });

const GUIDE = `Schreibe in Markdown. Erste Zeile "# Titel" wird automatisch gesetzt (nicht im content wiederholen). Gliederung mit "## Abschnitt" und "### Unterabschnitt". Listen mit "- ", Tabellen mit |Spalte|Spalte| und |---|---|, Hinweisboxen mit "> Text", **fett**, *kursiv*. HYPERLINKS: [[artikel-id]] oder [[Titel eines Artikels]] oder [[artikel-id|Anzeigetext]] oder [[artikel-id#abschnitt-id]]. Bekannte Artikeltitel werden zusätzlich automatisch verlinkt. Prüfe vorher mit search_wiki/get_article, welche Artikel es gibt, und verlinke großzügig auf bestehende Artikel (auch auf andere eigene Artikel). Erfinde keine Fakten über bestehende Dossier-Inhalte.`;

server.tool('write_article', 'Schreibt einen NEUEN eigenen Artikel in die Solarpedia (oder überschreibt einen eigenen Artikel mit gleicher id). ' + GUIDE,
  { title: z.string().min(2).describe('Titel des Artikels'), content: z.string().min(10).describe('Markdown-Inhalt ohne Titelzeile'), category: z.string().optional().describe('Optionale Kategorie, z. B. "Person" oder "Ereignis"'), id: z.string().optional().describe('Optional: id eines bestehenden eigenen Artikels zum Überschreiben') },
  async ({ title, content, category, id }) => {
    refresh();
    const aid = id || 'u-' + UA.slug(title);
    if (!/^[a-z0-9-]+$/.test(aid) || baseArticles.some(a => a.id === aid)) return text(`Ungültige oder bereits vergebene id "${aid}".`);
    fs.mkdirSync(userDir, { recursive: true });
    const md = `# ${title}\n${category ? 'Kategorie: ' + category + '\n' : ''}\n${content.trim()}\n`;
    const existed = fs.existsSync(path.join(userDir, aid + '.md'));
    fs.writeFileSync(path.join(userDir, aid + '.md'), md);
    refresh();
    const broken = userBroken[aid] || [];
    const art = byId.get(aid);
    const outLinks = (art.blocks.map(b => JSON.stringify(b)).join('').match(/#\/a\/([a-z0-9-]+)/g) || []).map(x => x.slice(4)).filter((v, i, a) => a.indexOf(v) === i);
    return text(`${existed ? 'Aktualisiert' : 'Gespeichert'}: "${title}" (id: ${aid}).\nVerlinkt auf ${outLinks.length} Artikel: ${outLinks.join(', ') || '–'}.\n` + (broken.length ? `ACHTUNG, nicht auflösbare Links (als rote Links dargestellt): ${broken.join(', ')}. Korrigiere sie mit write_article (id: ${aid}) oder lege diese Artikel an.\n` : 'Alle Links sind gültig.\n') + 'Die App zeigt den Artikel beim nächsten Fokus des Fensters (oder nach Neustart).');
  });

server.tool('delete_article', 'Löscht einen eigenen Artikel (nur Artikel, die mit write_article angelegt wurden).',
  { id: z.string() },
  async ({ id }) => {
    const f = path.join(userDir, path.basename(id) + '.md');
    if (!fs.existsSync(f)) return text(`Kein eigener Artikel mit der id "${id}".`);
    fs.unlinkSync(f); refresh(); return text(`Gelöscht: ${id}`);
  });

await server.connect(new StdioServerTransport());
