// Erzeugt die Planeten-, Monde- und Weltenartikel (user-articles/u-*.md) aus den Dossiers.
// Alle Zahlen und Aussagen stammen aus den Dossiers; das Skript ordnet sie nur je Welt neu.
// Aufruf: node tools/gen-planets.mjs   (Marker GENERATED sorgt für Wiederholbarkeit)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UA = path.join(ROOT, 'user-articles');
global.window = {};
await import(path.join(ROOT, 'app/data/articles.js'));
const W = window.WIKI;
const byId = new Map(W.articles.map(a => [a.id, a]));
const GENERATED = 'Zusammenstellung aus den Dossiers (automatisch erzeugt)';

// ---------- Helfer ----------
const strip = h => String(h == null ? '' : h).replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').trim();
const slug = s => fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'x';
const cell = s => strip(s).replace(/\[\[[^\]]*\]\]/g, m => m.replace(/\|/g, '\u0001')).replace(/\|/g, '/').replace(/\u0001/g, '|');
const fileId = title => 'u-' + slug(title);

function art(id) { const a = byId.get(id); if (!a) throw new Error('Artikel fehlt: ' + id); return a; }
// Blöcke eines Abschnitts: ab Überschrift (Text beginnt mit h) bis zur nächsten gleich- oder höherrangigen Überschrift
function sec(id, h) {
  const a = art(id), out = [];
  let on = false, lvl = 0;
  for (const b of a.blocks) {
    if (b.t === 'h') {
      if (on && b.level <= lvl && !/^Anwartschaft/.test(strip(b.text))) break;
      if (on && /^Anwartschaft/.test(strip(b.text))) continue;
      if (!on && strip(b.text).startsWith(h)) { on = true; lvl = b.level; continue; }
    }
    if (on) out.push(b);
  }
  if (!out.length) throw new Error(`Abschnitt fehlt: ${id} / ${h}`);
  return out;
}
const tables = blocks => blocks.filter(b => b.t === 'table');
function tableOf(id, h) { const t = tables(h ? sec(id, h) : art(id).blocks)[0]; if (!t) throw new Error('Tabelle fehlt ' + id + ' ' + h); return t; }
const mdTable = (head, rows) => {
  const n = Math.max(head.length, ...rows.map(r => r.length));
  const pad = r => Array.from({ length: n }, (_, i) => cell(r[i] ?? ''));
  return ['| ' + pad(head).map(c => c || ' ').join(' | ') + ' |', '|' + ' --- |'.repeat(n), ...rows.map(r => '| ' + pad(r).join(' | ') + ' |')].join('\n');
};
const rowsWhere = (t, col, re) => t.rows.filter(r => re.test(strip(r[col] ?? '')));
const tableMdFrom = (t, rows) => mdTable(t.head.map(strip), (rows || t.rows).map(r => r.map(strip)));

const LABELS = /^([A-ZÄÖÜ][^:.]{1,40}):\s+(.*)$/s;
// Blöcke -> Markdown. Absätze mit „Etikett: Text“ werden zu Zwischenüberschriften (Ebene 3).
function blocksMd(blocks, { skipTables = false, h3 = true } = {}) {
  const out = [];
  let plain = -1;
  for (const b of blocks) {
    if (b.t !== 'p') plain = -2;
    if (b.t === 'p') {
      const txt = strip(b.html || b.text);
      if (!txt) continue;
      const m = h3 && txt.match(LABELS);
      if (m && m[1].split(' ').length <= 5 && !/^(Abb|Quelle|Hinweis)/.test(m[1])) { out.push(`### ${m[1]}\n\n${m[2]}`); plain = out.length - 1; }
      else if (plain === out.length - 1 && plain >= 0 && !/[.!?;:)“"”]$/.test(out[plain])) out[plain] += ' ' + txt;
      else { out.push(txt); plain = out.length - 1; }
    } else if (b.t === 'strip') out.push('**Kennzahlen:** ' + b.parts.map(strip).join(' · '));
    else if (b.t === 'facts') out.push(mdTable(['Merkmal', 'Wert'], b.cells.map(c => [c[0], c[1]])));
    else if (b.t === 'table') { if (!skipTables) out.push(tableMdFrom(b)); }
    else if (b.t === 'ul' || b.t === 'ol') out.push(b.items.map(x => '- ' + strip(x)).join('\n'));
    else if (b.t === 'caption') { const t = strip(b.html); if (t) out.push('*' + t.replace(/\*/g, '') + '*'); }
    else if (b.t === 'callout') out.push('> ' + strip(b.html));
    else if (b.t === 'h') out.push(`### ${strip(b.text)}`);
  }
  return out.join('\n\n');
};
const link = (id, text) => `[[${id}|${text}]]`;
const labelOf = a => (a.docTitle && a.docTitle !== a.title && a.kind !== 'doc') ? `${a.title} (${a.docTitle})` : a.title;
const dossierLink = id => link(id, labelOf(art(id)));

// ---------- Textkorpus für „Weitere Erwähnungen“ ----------
const units = [];
const pushUnits = (srcId, srcTitle, text) => {
  for (const s of text.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ„"(])/)) { const t = s.trim(); if (t.length >= 50 && t.length <= 600) units.push({ id: srcId, title: srcTitle, t }); }
};
for (const a of W.articles) {
  for (const b of a.blocks) {
    if (b.t === 'p') pushUnits(a.id, labelOf(a), strip(b.html));
    else if (b.t === 'ul' || b.t === 'ol') b.items.forEach(x => pushUnits(a.id, labelOf(a), strip(x)));
    else if (b.t === 'callout') pushUnits(a.id, labelOf(a), strip(b.html));
  }
}
for (const f of fs.readdirSync(UA)) {
  if (!f.endsWith('.md')) continue;
  const md = fs.readFileSync(path.join(UA, f), 'utf8');
  if (md.includes(GENERATED)) continue;
  const title = (md.match(/^#\s+(.*)$/m) || [, f])[1].trim();
  const id = f.replace(/\.md$/, '');
  for (const ln of md.split('\n')) { if (/^(#|Kategorie:|\|)/.test(ln.trim())) continue; pushUnits(id, title, ln.replace(/^[-*•]\s+/, '').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/\*\*?/g, '')); }
}
function mentions(re, skipIds, cap = 22) {
  const per = new Map(), out = [], seen = new Set();
  for (const u of units) {
    if (skipIds.has(u.id) || !re.test(u.t) || seen.has(u.t)) continue;
    if ((per.get(u.id) || 0) >= 2) continue;
    seen.add(u.t); per.set(u.id, (per.get(u.id) || 0) + 1);
    out.push(u);
    if (out.length >= cap) break;
  }
  return out;
}
const mentionMd = list => list.map(u => `- ${u.t} (${link(u.id, u.title)})`).join('\n');

// ---------- Artikel-Sammler ----------
const written = new Map(); // title -> {id, md}
const used = new Set();
function emit(title, category, parts, { src = [], re, noMentions } = {}) {
  const ids = new Set(src);
  let md = `# ${title}\nKategorie: ${category}\n\n` + parts.filter(Boolean).join('\n\n');
  if (re && !noMentions) {
    const m = mentions(re, ids);
    if (m.length) md += `\n\n## Weitere Erwähnungen in anderen Artikeln\n\n${mentionMd(m)}`;
  }
  if (ids.size) md += `\n\n## Quellen und verwandte Artikel\n\n${[...ids].map(i => `- ${dossierLink(i)}`).join('\n')}`;
  md += `\n\n*${GENERATED}. Alle Angaben stammen aus den genannten Dossiers; Werte, die dort als Setzung gelten, bleiben Setzungen.*\n`;
  const id = fileId(title);
  fs.writeFileSync(path.join(UA, id + '.md'), md);
  written.set(title, { id, md });
}


// ---------- TOI-700 d: Klima und Geographie (Erläuterung und Kartenentwurf) ----------
const TT = createRequire(import.meta.url)(path.join(ROOT, 'app/toi-terrain.js'));
let _toiStats = null;
let _toiGrid = null;
const toiStats = () => { if (!_toiStats) { _toiGrid = TT.build(700); _toiStats = TT.stats(_toiGrid); } return _toiStats; };
const peakIn = (r1, r2) => { toiStats(); let m = -1e9; for (let k = 0; k < _toiGrid.z.length; k++) { const r = _toiGrid.rho[k]; if (_toiGrid.kind[k] && _toiGrid.kind[k] !== 3 && r >= r1 && r < r2 && _toiGrid.z[k] > m) m = _toiGrid.z[k]; } return Math.round(m / 10) * 10; };
const nf = (v, d = 0) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
function climateText() {
  return `TOI-700 d dreht dem Stern immer dieselbe Seite zu. Dadurch ist das Wetter nicht von Tag und Nacht bestimmt, sondern vom **Temperaturgefälle zwischen heißer Sonnenseite und eisiger Schattenseite**. Dieses Gefälle treibt einen riesigen, dauerhaften Luftkreislauf an. Das Band (der Ring um die Dämmerungslinie) liegt genau dort, wo warme und kalte Luft aufeinandertreffen; deshalb regnet es dort so viel. Die Befunde stammen aus dem Hauptbericht vom 24. August 2235; die Erklärung im Einzelnen ist eine Erläuterung der Redaktion auf Grundlage dieser Befunde (Folgerung, kein eigener Messwert).

### Der Kreislauf der Luft
1. **Aufstieg auf der Sonnenseite.** Am Substellarpunkt steht der Stern fast im Zenit, der Boden erreicht bis +45 °C. Die Luft darüber wird heiß und steigt auf.
2. **Höhenwind zur Nacht.** In der Höhe strömt die aufgestiegene Luft zur Schattenseite (Hauptbericht: „in der Höhe zur Nacht“). Dabei kühlt sie ab und verliert den Wasserdampf, den sie noch trägt.
3. **Absinken auf der Schattenseite.** Über dem Eisschild (bis −40 °C) sinkt die kalte, schwere Luft ab.
4. **Bodenwind zur Sonne.** Am Boden fließt die kalte Luft zurück in Richtung Sonne (Hauptbericht: „Winde wehen am Boden zur Sonne“). Auf diesem Weg überquert sie den Eisrand und das Band.
5. **Aufnahme von Wasser im Band.** Das Band besteht zu etwa 68 % aus Wasser (≈ 132 von 193 Mio. km²: drei Randmeere und viele Seen). Die kalte, trockene Bodenluft nimmt über dem Wasser Feuchtigkeit auf und erwärmt sich; sie ist nach dem Weg durch das Band feucht und warm.
6. **Treffpunkt bei 55 bis 65°.** Dort stößt die feuchte Bodenluft auf die heiße, aufsteigende Luft der Sonnenseite und wird gezwungen, mit ihr nach oben zu steigen. In der Höhe kühlt sie stark ab, der Wasserdampf kondensiert, es entsteht der **Wolkenwall**. Wo ein Gebirge am inneren Ringrand liegt (im Kartenentwurf das Schirmgebirge), verstärkt das erzwungene Aufsteigen am Hang den Effekt.
7. **Dauerregen.** Aus dem Wolkenwall fällt am inneren Ring ≈ **1.800 mm Regen im Jahr** (Hauptbericht); das ist fast das Doppelte von Mitteleuropa und fällt nicht in einer Regenzeit, sondern das ganze Jahr, denn der Antrieb (Sonnenseite heiß, Schattenseite kalt) ändert sich nie.

### Folgen für die Landschaft
- **Regenschatten der Sonnenseite.** Die Luft, die nach dem Wolkenwall die Sonnenseite erreicht, hat ihr Wasser schon abgegeben. Dort ist es heiß und trocken (Feuchte 24 % bei der Sonde Zenit-2). Es entstehen Hitzesteppe, Krusten und Salzpfannen, nur Biokrusten und kuppelförmige Wasserfänger überleben.
- **Wälder im Ring.** Der Dauerregen erklärt die dichten Wälder im inneren und mittleren Ring (Schirmwald und Dämmerwald; Feuchte 72 % bei der Sonde Saum-1). Zum äußeren Rand hin nehmen Regen und Wärme ab, die Wälder werden niedrig (Randwald), dann folgen Moose, Flechten und Eisalgen.
- **Wasserkreislauf.** Das Wasser bleibt im Kreislauf: Verdunstung über Meeren und Seen des Bandes, Regen am Wolkenwall, Abfluss in Flüssen zu den Randmeeren. Was die Höhenluft zur Nacht trägt, fällt als Schnee auf den Eisschild und ist dort als Eis gebunden („hier ist das Wasser gebunden“); der Schild fließt zum Rand und schmilzt am Eisrand, dessen Schmelzwasser (Eisalgen, Mikrobenmatten) wieder in die Flüsse des Bandes gelangt.
- **Wärmetransport.** Der Kreislauf bringt neben Wasser auch Wärme in den Ring (Hauptbericht): Deshalb ist das Band mit −5 bis +20 °C bewohnbar, obwohl der Planet auf der einen Seite glüht und auf der anderen gefriert.
- **Jahreszeiten.** Die Bahn ist leicht exzentrisch (e ≈ 0,11): Die Einstrahlung schwankt je Umlauf (37,4 Tage) um ≈ ±22 %, die Dämmerungslinie wandert um ≈ ±7°. Folgerung: Auch der Wolkenwall verlagert sich im Takt des Umlaufs um einige Grad und ist näher am Stern-Perihel stärker (mehr Temperaturgefälle, stärkerer Antrieb). Das erklärt den „Jahreszeiten-Gang“ der Messung von 2231 bis 2233.
- **Wolkenwirbel.** Das 41-Stunden-Signal, das 2231 als Tag missdeutet wurde, stammt von einem Wolkenwirbel, der den Substellarpunkt umkreist (Superrotation der Hochatmosphäre).

### Niederschlag und Temperatur nach Zonen
| Zone | Winkel | Niederschlag | Temperatur | Quelle |
| --- | --- | --- | --- | --- |
| Sonnenseite | 0–55° | Modell: unter 100 mm/Jahr in der Mitte, steigend zum Rand | bis +45 °C (Sonde: +41 °C) | Hauptbericht (Temperatur), Modell (Regen) |
| Wolkenwall, innerer Ring | 55–65° | ≈ 1.800 mm/Jahr | ≈ +20 °C | Hauptbericht |
| Mittlerer Ring | 68–85° | Modell: ≈ 1.200 bis 650 mm/Jahr | ≈ +7 °C (Sonde Saum-1 bei 80°: +7 °C) | Hauptbericht (Temperatur), Modell (Regen) |
| Äußerer Ring | 85–95° | Modell: ≈ 650 bis 420 mm/Jahr | bis −5 °C | Hauptbericht (Temperatur), Modell (Regen) |
| Eisrand | 95–110° | Modell: ≈ 400 bis 170 mm/Jahr (Schnee, Schmelzwasser) | bis −18 °C (Modell) | Modell |
| Schattenseite | ab 110° | Modell: unter 100 mm/Jahr (Schnee) | bis −40 °C (Sonde Nacht-3: −34 °C) | Hauptbericht (Temperatur), Modell (Regen) |

Die Niederschlagswerte außer den 1.800 mm am inneren Ring sind Modellwerte der Bandkarte (Hilfsmittel, Karten, „TOI-700 d: Bandkarte“, Ansicht „Niederschlag“ und Ebene „Zirkulation“).`;
}
function geoText() {
  const s = toiStats(), n = TT.NAMES;
  const row = (a, b, c) => `| ${a} | ${b} | ${c} |`;
  return `Die Dossiers nennen für TOI-700 d Flächen und Winkel, aber keine Koordinaten. Die **Bandkarte** (Hilfsmittel, Karten, „TOI-700 d: Bandkarte“) und die folgende Beschreibung sind ein **Kartenentwurf**: eine deterministische Anordnung von Gelände, Meeren, Gebirgen und Flüssen, die die Flächenangaben des Hauptberichts einhält. Form, Lage, Höhen und Namen sind Setzungen (Arbeitsnamen nach Mitgliedern der Meridian-Expedition) und nicht Dossier-Kanon.

| Größe | Entwurf | Hauptbericht 2235 |
| --- | --- | --- |
${row('Ring (55–95°)', nf(s.ring) + ' Mio. km²', '≈ 193')}
${row('Land im Ring', nf(s.land) + ' Mio. km² (Wald ≈ ' + nf(s.forest) + ', darüber Fels und Gebirge)', '≈ 61, Wälder ≈ 45 (drei Viertel)')}
${row('Wasser im Ring', nf(s.sea + s.lake) + ' Mio. km²', '≈ 132')}
${row('Randmeere', s.seas.map(v => nf(v)).join(', ') + ' Mio. km²', 'je 27 bis 38')}
${row('Seen', nf(s.lake) + ' Mio. km² (Seenplatten und Flussseen)', 'Rest des Wassers')}
${row('Sonnenseite', nf(s.sun) + ' Mio. km², Land ' + nf(s.sunLand) + ', Salzpfannen ' + nf(s.pan), '≈ 123, eisfreies Land ≈ 108')}

### Landschaften des Bandes (Entwurf)
- **Hitzesteppe** (0–55°): flache, trockene Hochebene mit Krusten und Matten; ${nf(s.pan)} Mio. km² Salzpfannen, in denen sich Wasser sammelt und verdunstet. Rinnsale gibt es nur am Rand, wo der Wolkenwall noch Regen bringt.
- **Schirmgebirge** (innerer Ringrand, ≈ 52–63°): eine Gebirgskette am Rand der Regenzone mit Pässen; höchste Gipfel ≈ ${nf(peakIn(50, 64))} m. Sie zwingt die feuchte Luft zusätzlich zum Aufsteigen und gibt dem Schirmwald (Bäume bis 40 m) seinen Regen.
- **Schirmwald** und **Dämmerwald** (55–85°): die großen Waldgebiete auf Land zwischen Gebirge und Meeren, am dichtesten in den drei Landengen zwischen den Randmeeren.
- **Randmeere** (≈ 70–92°): ${n.seas.map((x, i) => x + ' (≈ ' + nf(s.seas[i]) + ' Mio. km²)').join(', ')}; am äußeren Ring, wo das Schmelzwasser des Eisrandes und die Flüsse zusammenlaufen. Im Entwurf liegt der tiefste Meeresboden bei ≈ ${nf(Math.round(s.deep / 10) * 10)} m.
- **Landengen**: drei schmale Landbrücken (bei den Azimuten 92°, 212° und 332°) trennen die Randmeere; sie tragen den Dämmerwald.
- **Randgebirge** (≈ 88–94°): Küstenkette am äußeren Ringrand mit dem Randwald (3 bis 8 m hohe Gehölze), höchste Gipfel ≈ ${nf(peakIn(86, 96))} m; dahinter beginnt der Eisrand.
- **Flüsse**: ${n.rivers.join(', ')} und viele kleinere entwässern den inneren Ring in die Randmeere; im Entwurf nur dort, wo mehr als ≈ 380 mm Regen fallen. Am Eisrand entspringen Schmelzwasserbäche.
- **Eisrand und Eisschild** (ab ≈ 95°): Gletscherzungen, Eisalgen und Mikrobenmatten im Schmelzwasser; der Eisschild ist 40 bis 900 m dick.
- **Orte:** Die Meridian-Basis (≈ 120 Personen) liegt am inneren Ringrand, die Sonde Saum-1 bei ≈ 80° im Wald, Zenit-2 am Substellarpunkt; Nacht-3 (≈ 150°) liegt außerhalb des Kartenausschnitts.

Karten: ${link('u-toi-700-system', 'TOI-700 (System)')}; Hilfsmittel, Karten: „TOI-700 d: Bandkarte“ (Gelände, Höhenkarte, Niederschlag, Temperatur, Vegetation, Höhenprofil), „TOI-700 d: Oberfläche“ (Weltkarte) und „TOI-700 d: Zonen“.`;
}

// ============ Überblickstabelle bewohnter Welten ============
const BW_OV = 'bewohnte-welten-2234-uberblick';
const ovTab = tableOf(BW_OV, null);
const ovRow = name => ovTab.rows.find(r => strip(r[0]) === name);
const KOL = 'bewohnte-welten-2234-kolonisierbare-planeten-im-umkreis-von-75-lichtjahren';
const list75 = tableOf(KOL, null);
const row75 = name => list75.rows.find(r => strip(r[0]) === name);
const SK = 'sternkarte-koloniewelten-2234';
const katalog = tableOf(SK + '-katalog-aller-koloniewelten', null);
const katRow = name => katalog.rows.find(r => strip(r[0]) === name);
const anwart = tableOf(SK + '-wer-will-wohin-anwartschaften', null);
const anwartOf = name => anwart.rows.filter(r => strip(r[1]).split(/,\s*/).some(x => x.replace(/\s*\(Monde\)/, '') === name.replace(/\s*\(Monde\)/, ''))).map(r => strip(r[0]));
const anders = tableOf(SK + '-was-im-setting-anders-ist', null);
const schutz = tableOf(SK + '-planetenschutz-der-koloniewelten', null);
const schutzOf = name => schutz.rows.filter(r => strip(r[1]).includes(name)).map(r => strip(r[0]));
const reich = tableOf(SK + '-reichweite-und-reisezeiten', null);

// ============ Sonnensystem ============
const SS = 'sonnensystem-2234';
const BWS = 'bewohnte-welten-2234-sol-system';
const NZ = SS + '-erde-mond-und-erdorbit';
const AUS = SS + '-das-aussere-sonnensystem';
const GUR = SS + '-asteroidengurtel-und-trojaner-ressourcenstationen';
const INN = SS + '-innere-schattenzone-merkur-und-venus';
const KAND = SS + '-weitere-kolonisationskandidaten';
const zoneTab = tableOf('sperrzonen-sonnensystem-2234-grundlagen-der-sperrzonen', 'Planetare Sperrzone');
const zoneRow = name => zoneTab.rows.find(r => strip(r[1]) === name);
const besTab = tableOf(SS + '-besiedlung-im-uberblick', null);
const transTab = tableOf(SS + '-transport-und-entfernungen', null);
const kandTab = tableOf(KAND, null);
const transfer = tableOf('sperrzonen-sonnensystem-2234-standardtransfer-zur-ftl-freigabe', 'Transferzeiten');

function solRows({ bes, zone, trans, kand, tr }) {
  const rows = [];
  if (bes) { const r = besTab.rows.find(r => strip(r[0]).startsWith(bes)); if (r) besTab.head.forEach((h, i) => rows.push([strip(h), strip(r[i])])); }
  if (zone) { const r = zoneRow(zone); if (r) rows.push(['Masse (Erde = 1)', strip(r[2])], ['Sperrzonenradius', strip(r[3])]); }
  if (trans) { const r = transTab.rows.find(r => strip(r[0]) === trans); if (r) transTab.head.slice(1).forEach((h, i) => rows.push([strip(h), strip(r[i + 1])])); }
  if (tr) { const r = transfer.rows.find(r => strip(r[0]) === tr); if (r) transfer.head.slice(1).forEach((h, i) => rows.push(['Transfer: ' + strip(h), strip(r[i + 1])])); }
  if (kand) { const r = kandTab.rows.find(r => strip(r[0]).startsWith(kand)); if (r) kandTab.head.slice(1).forEach((h, i) => rows.push(['Kandidat: ' + strip(h), strip(r[i + 1])])); }
  return rows;
}
const solFacts = o => mdTable(['Merkmal', 'Wert'], solRows(o));
const steck = (rows, extra = []) => mdTable(['Merkmal', 'Wert'], [...rows, ...extra]);
const bwFactsCells = h => (sec(BWS, h).find(b => b.t === 'facts')?.cells || []).map(c => [c[0], c[1]]);
const bwBody = h => blocksMd(sec(BWS, h).filter(b => b.t !== 'facts' && b.t !== 'strip' && !(b.t === 'p' && /^Status: /.test(strip(b.html || b.text)) && strip(b.html || b.text).length < 60)));
const ovBw = name => { const r = ovRow(name); return r ? `**Dossier-Status:** ${strip(r[1])} · Einwohner ${strip(r[2])} · besiedelt seit ${strip(r[3])} · Schwerkraft ${strip(r[4])}` : ''; };
const bwSec = (h, extra) => blocksMd(sec(BWS, h), extra);

const SOLSRC = [SS, BWS, 'sperrzonen-sonnensystem-2234-grundlagen-der-sperrzonen'];
const solCat = 'Welten · Sol-System';
const hdr = (t, body) => body ? `## ${t}\n\n${body}` : '';

// Erde
emit('Erde (Planet)', solCat, [
  'Die Erde ist der Hauptplanet der Solarrepublik, ihre einzige Welt mit natürlich gewachsener Biosphäre und die Referenz aller Werte in den Dossiers. Etwa 8,4 Milliarden Menschen leben hier; die Regierung der Solarrepublik sitzt auf Luna. Die Erde gliedert sich in zwölf Regionen.',
  hdr('Steckbrief', steck(solRows({ bes: 'Erde', zone: 'Erde', trans: null, tr: 'Erde' }), bwFactsCells('Erde'))),
  hdr('Die Welt im Überblick (Dossier „Bewohnte Welten“)', bwBody('Erde')),
  hdr('Rolle, Infrastruktur und Sperrzone (Dossier „Sonnensystem“)', blocksMd(sec(NZ, 'Erde – der Hauptplanet'))),
  hdr('Zugang zur Erdoberfläche', blocksMd(sec(NZ, 'Zugang zur Erdoberfläche'))),
  `Siehe auch: ${link('u-besitz-an-grund-und-boden-auf-der-erde', 'Besitz an Grund und Boden auf der Erde')}, ${link('u-klima-und-wetter-der-welten', 'Klima und Wetter der Welten')}, ${link('u-himal-plan', 'Himal-Plan')}.`,
], { src: [...SOLSRC, NZ], re: /\bErde\b/, noMentions: true });

// Luna
emit('Luna (Mond)', solCat, [
  'Luna, der Erdmond, ist Regierungssitz der Solarrepublik und der bevorzugte Bauplatz großer Schiffe. Rund 47 Millionen Menschen leben hier seit 2038 unter Regolith, in Lavaröhren und unter Kraterkuppeln.',
  hdr('Steckbrief', steck(solRows({ bes: 'Mond', zone: 'Mond', trans: 'Mond' }), bwFactsCells('Luna'))),
  hdr('Die Welt im Überblick (Dossier „Bewohnte Welten“)', bwBody('Luna')),
  hdr('Status und Ursprung (Dossier „Sonnensystem“)', blocksMd(sec(NZ, 'Erdmond'))),
  `Siehe auch: ${link('u-orte-des-alltags-auf-mond-mars-und-proxima-b', 'Orte des Alltags auf Mond, Mars und Proxima b')}, ${link('u-vertrag-von-shackleton', 'Vertrag von Shackleton')}, ${link('u-fernseite-array', 'Fernseite-Array')}.`,
], { src: [...SOLSRC, NZ], re: /\bLuna\b/ });

// Mars
emit('Mars (Planet)', solCat, [
  'Der Mars (amtlich: Ares) ist mit rund 68 Millionen Einwohnern die größte Kolonie außerhalb von Erde und Luna: dicht besiedelt, aber vollständig unter Druck. Terraforming ist technisch möglich, wurde aber 2168 per Volksentscheid abgelehnt.',
  hdr('Steckbrief', steck(solRows({ bes: 'Mars', zone: 'Mars', trans: 'Mars', tr: 'Mars' }), bwFactsCells('Mars'))),
  hdr('Die Welt im Überblick (Dossier „Bewohnte Welten“)', bwBody('Mars')),
  hdr('Besiedlung und Infrastruktur (Dossier „Sonnensystem“)', blocksMd(sec(SS + '-mars', 'Mars'))),
  `Siehe auch: ${link('u-terraforming-verfahren-und-grenzen', 'Terraforming: Verfahren und Grenzen')}, ${link('u-orte-des-alltags-auf-mond-mars-und-proxima-b', 'Orte des Alltags auf Mond, Mars und Proxima b')}.`,
], { src: [...SOLSRC, SS + '-mars'], re: /\bMars\b/ });

// Venus, Merkur
const innIntro = strip(art(INN).blocks.find(b => b.t === 'p').html);
for (const [name, h, bw, zone, tr, extra] of [
  ['Venus (Planet)', 'Venus', 'Venus', 'Venus', 'Venus', 'Die Venus ist eine Aerostat-Welt: In 52 bis 55 km Höhe schweben die Städte mit rund 7,5 Millionen Einwohnern; die Oberfläche (≈ 460 °C, ≈ 92 bar) wird nur robotisch erkundet. Terraforming ist als Studie ausgearbeitet, aber nicht begonnen.'],
  ['Merkur (Planet)', 'Merkur', 'Merkur', 'Merkur', 'Merkur', 'Der Merkur trägt Polarkolonien in dauerhaft beschatteten Kratern, Kollektorflotten für die ≈ 6,7-fache Sonnenenergie und – im Sonnenorbit – die Antimaterie-Fabriken der Solaren Antimaterie-Werke. Rund 1,6 Millionen Menschen leben hier.'],
]) {
  emit(name, solCat, [
    extra,
    hdr('Steckbrief', steck(solRows({ bes: bw, zone, trans: null, tr }), bwFactsCells(h))),
    hdr('Die Welt im Überblick (Dossier „Bewohnte Welten“)', bwBody(h)),
    hdr('Status und Zugang (Dossier „Sonnensystem“)', `${innIntro}\n\n${blocksMd(sec(INN, h))}`),
    `Siehe auch: ${link('u-randkolonien-venus-und-tau-ceti-f-im-alltag', 'Randkolonien: Venus und Tau Ceti f im Alltag')}, ${link('u-klima-und-wetter-der-welten', 'Klima und Wetter der Welten')}.`,
  ], { src: [...SOLSRC, INN], re: new RegExp('\\b' + h + '\\b') });
}

// Äußeres Sonnensystem
const AUSSEC = {
  Jupiter: 'Jupiter-System', Saturn: 'Saturn-System', Uranus: 'Uranus, Neptun und Triton', Neptun: 'Uranus, Neptun und Triton', Pluto: 'Kuipergürtel und Pluto',
};
const intro = {
  Jupiter: 'Jupiter ist ein Gasriese ohne Oberfläche; besiedelt werden seine Monde (Kallisto, Ganymed) und Orbitalstationen. Das Jupiter-System zählt rund 5,8 Millionen Einwohner, die Sperrzone um Jupiter reicht ≈ 13,7 Mio. km, der Randhafen RH-Jupiter liegt an ihrer Grenze.',
  Saturn: 'Saturn ist ein Gasriese; besiedelt werden Titan, Ringstationen und Schöpfstationen (Deuterium und Helium-3). Das Saturn-System zählt rund 1,6 Millionen Einwohner, die Sperrzone reicht ≈ 9,1 Mio. km, der Randhafen RH-Saturn liegt an ihrer Grenze.',
  Uranus: 'Uranus ist ein Eisriese. In seiner Atmosphäre arbeiten weitgehend automatisierte Schöpfstationen, die Helium-3 und Deuterium gewinnen; Uranus, Neptun und Triton zusammen zählen rund 60.000 Einwohner.',
  Neptun: 'Neptun ist ein Eisriese. In seiner Atmosphäre arbeiten weitgehend automatisierte Schöpfstationen, die Helium-3 und Deuterium gewinnen; Neptun, Uranus und Triton zusammen zählen rund 60.000 Einwohner.',
};
for (const n of ['Jupiter', 'Saturn', 'Uranus', 'Neptun']) {
  const blocks = sec(AUS, AUSSEC[n]);
  emit(n + ' (Planet)', solCat, [
    intro[n],
    hdr('Steckbrief', solFacts({ bes: n === 'Jupiter' ? 'Jupiter' : n === 'Saturn' ? 'Saturn' : 'Uranus', zone: n, trans: n })),
    hdr('Besiedlung und Status (Dossier „Sonnensystem“)', blocksMd(blocks)),
    hdr('Kandidaten und Einordnung', n === 'Jupiter' ? 'Io (unbewohnt) und Europa (Schutzgebiet) werden hier nicht besiedelt; siehe ' + link('u-io-mond', 'Io') + ' und ' + link('u-europa-mond', 'Europa') + '. Als Kolonisationskandidaten sind Gasriesen ausgeschlossen (keine Oberfläche, Strahlung, Schwerkraft); es gibt nur Schöpfstationen.' : 'Als Kolonisationskandidaten sind Gasriesen ausgeschlossen (keine Oberfläche, Strahlung, Schwerkraft); es gibt nur Schöpfstationen. Uranusmonde (Miranda, Titania, Oberon) sind unbesiedelt (Kandidatenpotenzial gering).'),
  ], { src: [...SOLSRC, AUS, KAND], re: new RegExp('\\b' + n + '\\b') });
}
// Pluto
emit('Pluto und Charon', solCat, [
  'Pluto und Charon tragen Forschungsposten (≈ 15.000 Menschen) und dienen als Ausgangspunkte für Oort-Sonden. Im Kuipergürtel arbeiten weitere ≈ 25.000 Menschen.',
  hdr('Steckbrief', solFacts({ bes: 'Kuipergürtel', trans: 'Pluto', kand: 'Pluto' })),
  hdr('Besiedlung und Status (Dossier „Sonnensystem“)', blocksMd(sec(AUS, 'Kuipergürtel und Pluto'))),
], { src: [...SOLSRC, AUS, KAND], re: /\bPluto\b/ });

// Ceres
const gTab = tableOf(GUR, null);
const cerBw = tableOf(BWS, 'Bewohnte Monde').rows.find(x => strip(x[0]).startsWith('Ceres'));
emit('Ceres (Zwergplanet)', solCat, [
  'Ceres ist der Hauptknoten des Asteroidengürtels: Die Occator-Werke (≈ 11 Mio. Einwohner, seit 2119) liegen im Occator-Krater, hier sitzt der Ceres-Freihafen (seit 2208), der bequemste FTL-Ausgangspunkt des Sonnensystems.',
  hdr('Steckbrief', mdTable(['Merkmal', 'Wert'], [
    ...gTab.head.map((h, i) => [strip(h), strip(gTab.rows[0][i])]),
    ['Zonenradius', '≈ 108.000 km'], ['Fluchtgeschwindigkeit', '≈ 0,51 km/s (Fracht kann ohne Raketen verschossen werden)'],
    ...(cerBw ? [['Schwerkraft (Dossier Bewohnte Welten)', strip(cerBw[3])], ['Umwelt und Rolle', strip(cerBw[4])]] : []),
    ...transTab.head.slice(1).map((h, i) => ['Transport: ' + strip(h), strip(transTab.rows.find(r => strip(r[0]) === 'Ceres')[i + 1])]),
  ])),
  hdr('Lage, Rolle und Stationen (Dossier „Sonnensystem“)', blocksMd(art(GUR).blocks)),
  `Siehe auch: ${link('firmenverzeichnis-2234-ceres-kontor', 'Ceres-Kontor')}, ${link('u-occator-werke', 'Occator-Werke')}, ${link('u-ceres-borse-im-alltag', 'Ceres-Börse im Alltag')}, ${link('u-frieden-von-occator', 'Frieden von Occator')}.`,
], { src: [...SOLSRC, GUR, 'firmenverzeichnis-2234-ceres-kontor'], re: /\bCeres\b/ });

// ============ Monde ============
const jupTab = tableOf(AUS, 'Jupiter-System'), satTab = tableOf(AUS, 'Saturn-System');
const bwMoons = tableOf(BWS, 'Bewohnte Monde');
const moonSrc = [...SOLSRC, AUS, KAND];
const moons = [
  { n: 'Io', tab: jupTab, sec: 'Jupiter-System', zone: 'Jupiter', intro: 'Io bleibt unbewohnt: tödliche Strahlung und Vulkanismus erlauben nur automatisierte Anlagen (Schwefel, Gezeitenenergie).' },
  { n: 'Europa', tab: jupTab, sec: 'Jupiter-System', zone: 'Jupiter', intro: 'Europa ist Schutzgebiet der Kategorie A: Ein Ozean unter dem Eis und eine mögliche Biosphäre verbieten die Landung; geforscht wird aus dem Orbit. Seit dem Europa-Zwischenfall 2209 (Schwarzfilm-Sporen auf der Oberfläche) gilt Vollschutz.' },
  { n: 'Ganymed', tab: jupTab, sec: 'Jupiter-System', zone: 'Jupiter', bw: 'Ganymed', intro: 'Ganymed ist mit eigenem Magnetfeld und Eismantel eine Kolonie von rund 2,5 Millionen Einwohnern, mit unterirdischen Tiefbasen und Werften für Außenrouten.' },
  { n: 'Kallisto', tab: jupTab, sec: 'Jupiter-System', zone: 'Jupiter', bw: 'Kallisto', intro: 'Kallisto ist die Hauptsiedlung im Jupiter-System (≈ 2,7 Mio. Einwohner, seit 2131): außerhalb der Hauptstrahlungsgürtel, geologisch ruhig, reich an Eis.' },
  { n: 'Titan', tab: satTab, sec: 'Saturn-System', zone: 'Saturn', bw: 'Titan', intro: 'Titan ist die Kolonie im Saturn-System (≈ 1,4 Mio. Einwohner, seit 2166): Die dichte Atmosphäre schirmt Strahlung ab, die Chemiewerke gewinnen Kohlenwasserstoffe und Stickstoff.' },
  { n: 'Enceladus', tab: satTab, sec: 'Saturn-System', zone: 'Saturn', intro: 'Enceladus ist Schutzgebiet (Kategorie A) mit Orbitalstationen: Ozean und Wasserfontänen werden aus der Ferne erforscht.' },
];
for (const m of moons) {
  const rows = rowsWhere(m.tab, 0, new RegExp('^' + m.n));
  const kand = kandTab.rows.filter(r => strip(r[0]).startsWith(m.n));
  const bwr = m.bw && bwMoons.rows.find(x => strip(x[0]).startsWith(m.bw));
  const fcts = [
    ...(rows[0] ? m.tab.head.map((h, i) => [strip(h), strip(rows[0][i])]) : []),
    ...(bwr ? bwMoons.head.slice(1).map((h, i) => ['Dossier Bewohnte Welten: ' + strip(h), strip(bwr[i + 1])]) : []),
    ...(kand[0] ? kandTab.head.slice(1).map((h, i) => ['Kandidat: ' + strip(h), strip(kand[0][i + 1])]) : []),
  ];
  emit(m.n + ' (Mond)', 'Welten · Monde', [
    m.intro,
    hdr('Steckbrief', mdTable(['Merkmal', 'Wert'], fcts)),
    hdr('Das System (Dossier „Sonnensystem“)', blocksMd(sec(AUS, m.sec))),
    hdr('Einordnung', blocksMd([...sec(BWS, 'Bewohnte Monde').filter(b => b.t === 'caption')])),
    `Siehe auch: ${link('u-sperr-und-schutzgebiete', 'Sperr- und Schutzgebiete')}, ${link('astrobiologie-planetenschutz-2234', 'Astrobiologie und Planetenschutz')}.`,
  ], { src: moonSrc, re: new RegExp('\\b' + m.n + '\\b') });
}
emit('Triton (Mond)', 'Welten · Monde', [
  'Triton, der große Neptunmond, trägt eine Forschungs- und Versorgungsstadt (≈ 20.000 Einwohner) und gilt als Zukunftskandidat und Sprungbrett zum Kuipergürtel.',
  hdr('Steckbrief', mdTable(['Merkmal', 'Wert'], kandTab.head.slice(1).map((h, i) => ['Kandidat: ' + strip(h), strip(kandTab.rows.find(r => strip(r[0]).startsWith('Triton'))[i + 1])]))),
  hdr('Das System (Dossier „Sonnensystem“)', blocksMd(sec(AUS, 'Uranus, Neptun und Triton'))),
], { src: moonSrc, re: /\bTriton\b/ });

// ============ Bewohnte Welten außerhalb des Sonnensystems ============
const NB = 'nachbarsysteme-2234';
const lead = id => { const out = []; for (const b of art(id).blocks) { if (b.t === 'h') break; if (b.t !== 'figure') out.push(b); } return out; };
const WORLDS = [
  { n: 'Proxima b', bw: 'bewohnte-welten-2234-proxima-centauri', sys: NB + '-proxima-centauri', letter: 'b', single: true },
  { n: 'Ross 128 b', bw: 'bewohnte-welten-2234-ross-128', sys: NB + '-ross-128', letter: 'b', single: true },
  { n: 'Teegarden b', bw: 'bewohnte-welten-2234-teegarden', sys: NB + '-teegarden', letter: 'b' },
  { n: 'Teegarden c', bw: 'bewohnte-welten-2234-teegarden', sys: NB + '-teegarden', letter: 'c' },
  { n: 'Gliese 1061 c', bw: 'bewohnte-welten-2234-gliese-1061', sys: NB + '-gliese-1061', letter: 'c' },
  { n: 'Gliese 1061 d', bw: 'bewohnte-welten-2234-gliese-1061', sys: NB + '-gliese-1061', letter: 'd' },
  { n: 'GJ 1002 b', bw: 'bewohnte-welten-2234-gj-1002', sys: NB + '-gj-1002', letter: 'b' },
  { n: 'GJ 1002 c', bw: 'bewohnte-welten-2234-gj-1002', sys: NB + '-gj-1002', letter: 'c' },
  { n: 'Tau Ceti f', bw: 'bewohnte-welten-2234-tau-ceti', sys: NB + '-tau-ceti', letter: 'f', single: true },
  { n: 'Wolf 1061 c', bw: 'bewohnte-welten-2234-wolf-1061-konzessionskolonie', single: true },
  { n: 'Gliese 667 C c', bw: 'bewohnte-welten-2234-gliese-667-c-konzernkolonie', single: true },
  { n: 'TRAPPIST-1 f', bw: 'bewohnte-welten-2234-trappist-1-konzernkolonie', single: true },
  { n: 'LHS 1140 b', bw: 'bewohnte-welten-2234-lhs-1140-konzernkolonie', single: true },
];
const worldCat = 'Welten · Bewohnte Welten';
const wTitle = n => n + ' (Welt)';
const tr1 = (t, n) => { const rows = t.rows.filter(r => strip(r[0]).startsWith(n)); return rows; };

function catalogFacts(name) {
  const r = katRow(name); if (!r) return [];
  const RN = { 'Stufe': 'Koloniewert-Stufe', 'ly': 'Entfernung (ly)', 'Masse': 'Masse laut Katalog (M⊕)', 'g': 'Schwerkraft laut Katalog (g)', 'Einstr.': 'Einstrahlung laut Katalog', 'Flug 100c': 'Flug ab Sol (Windhund, 100c)', 'Zugang': 'Zugang (FTL)', 'Setzung': 'Setzung' };
  const rows = katalog.head.map((h, i) => [RN[strip(h)] || strip(h), strip(r[i])]);
  const r75 = row75(name);
  if (r75) rows.push(['Stern (Spektralklasse)', strip(r75[2])], ['Bemerkung im 75-ly-Katalog', strip(r75[r75.length - 1])]);
  const an = anwartOf(name); if (an.length) rows.push(['Anwartschaft', an.join(', ')]);
  const sc = schutzOf(name.replace(/\s*\(Monde\)/, '')); if (sc.length) rows.push(['Planetenschutz', sc.join('; ')]);
  const ad = anders.rows.find(x => strip(x[0]).startsWith(name.replace(/\s*\(Monde\)/, '')) ); if (ad) rows.push(['Wirklichkeit (2020er)', strip(ad[1])], ['Im Setting', strip(ad[2])]);
  return rows;
}
function reisen(name) {
  const r = katRow(name); if (!r) return '';
  const ly = parseFloat(strip(r[1]).replace(',', '.'));
  const t = d => { if (d < 365) return Math.round(d) + ' Tage'; const y = Math.round(d / 36.525) / 10; return y.toLocaleString('de-DE') + (y === 1 ? ' Jahr' : ' Jahre'); };
  return `Flugzeiten ab Sol (Entfernung ${strip(r[1])} ly): Windhund 100c ≈ ${t(ly * 365.25 / 100)} · Landnahme 40c ≈ ${t(ly * 365.25 / 40)} · Karawane 20c ≈ ${t(ly * 365.25 / 20)} · langsamste Linie 10c ≈ ${t(ly * 365.25 / 10)} (reine FTL-Zeit; Anflug und Abfertigung kommen hinzu). Rückfrage an Luna: ≈ ${t(ly * 365.25 / 100 * 2)} (Windhund hin und zurück).`;
}

for (const w of WORLDS) {
  const ov = ovRow(w.n);
  const sysFilter = (t) => w.single ? t.rows : t.rows.filter(r => strip(r[0]).startsWith(w.n) || strip(r[0]).includes('(' + w.letter + ')'));
  const parts = [];
  const status = strip(ov[1]);
  parts.push(`${w.n} ist eine bewohnte Welt (Dossier-Status: ${status}) mit rund ${strip(ov[2])} Einwohnern, besiedelt seit ${strip(ov[3])}; Schwerkraft ${strip(ov[4])}.`);
  const bwBlocks = sec(w.bw, w.n);
  const facts = bwBlocks.find(b => b.t === 'facts');
  const st = [['Status', status], ['Einwohner', strip(ov[2])], ['Besiedelt seit', strip(ov[3])]];
  parts.push(hdr('Steckbrief', mdTable(['Merkmal', 'Wert'], [...st, ...(facts ? facts.cells.map(c => [c[0], c[1]]) : []), ...catalogFacts(w.n).filter(r => !/^(Welt|Koloniewert-Stufe)$/.test(r[0]))])));
  parts.push(hdr('Umwelt, Besiedlung, Terraforming (Dossier „Bewohnte Welten“)', blocksMd(bwBlocks.filter(b => b.t !== 'facts' && b.t !== 'strip' && !(b.t === 'p' && /^Status: /.test(strip(b.html || b.text)) && strip(b.html || b.text).length < 60)))));
  const srcs = [w.bw, KOL, SK + '-katalog-aller-koloniewelten', BW_OV, 'bewohnte-welten-2234-terraforming-im-uberblick'];
  if (w.sys) {
    srcs.push(w.sys, NB);
    const lt = blocksMd(lead(w.sys).filter(b => b.t === 'p'));
    parts.push(hdr('Das System (Dossier „Nachbarsysteme“)', lt));
    const star = sec(w.sys, 'Stern und Welten');
    const t1 = star.find(b => b.t === 'table');
    parts.push(hdr('Stern und Welten', mdTable(t1.head.map(strip), sysFilter(t1).map(r => r.map(strip))) + '\n\n' + blocksMd(star.filter(b => b.t === 'caption'))));
    const zon = sec(w.sys, 'Zonen und Anflug');
    const zt = zon.find(b => b.t === 'table');
    parts.push(hdr('Zonen und Anflug', blocksMd(zon.filter(b => b.t === 'p')) + '\n\n' + (zt ? mdTable(zt.head.map(strip), sysFilter(zt).map(r => r.map(strip))) : '') + '\n\n' + blocksMd(zon.filter(b => b.t === 'caption'))));
    parts.push(hdr('Sperrschatten-Fenster ab Sol', blocksMd(sec(w.sys, 'Sperrschatten-Fenster'))));
    parts.push(hdr('Reise ab Sol', blocksMd(sec(w.sys, 'Reise ab Sol'))));
    const bes = sec(w.sys, 'Besiedlung und Wirtschaft');
    const bt = bes.find(b => b.t === 'table');
    parts.push(hdr('Siedlungsräume', mdTable(bt.head.map(strip), (w.single ? bt.rows : bt.rows.filter(r => strip(r[0]).includes('(' + w.letter + ')') || /^Summe/.test(strip(r[0])))).map(r => r.map(strip)))));
    parts.push(hdr('Verkehr und Schiffe', blocksMd(sec(w.sys, 'Verkehr und Schiffe'))));
  } else parts.push(hdr('Reise', reisen(w.n)));
  const sib = WORLDS.filter(x => x.sys && x.sys === w.sys && x.n !== w.n).map(x => link(fileId(wTitle(x.n)), x.n));
  parts.push(`Siehe auch: ${[...sib, link('u-klima-und-wetter-der-welten', 'Klima und Wetter der Welten'), link('u-terraforming-verfahren-und-grenzen', 'Terraforming: Verfahren und Grenzen'), link('u-sperr-und-schutzgebiete', 'Sperr- und Schutzgebiete'), link('sternkarte-koloniewelten-2234', 'Sternkarte und Koloniewelten')].join(', ')}.`);
  emit(wTitle(w.n), worldCat, parts, { src: srcs, re: new RegExp('\\b' + w.n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b') });
}

// ============ Koloniewelten (Kandidaten) ============
const K1 = SK + '-k1-terraform-ziele', K3 = SK + '-k3-sonderwelten', K2 = SK + '-k2-kuppelwelten', K4 = SK + '-k4-stutzpunkte';
const stufeName = { K1: 'K1 Terraform-Ziel', K2: 'K2 Kuppelwelt', K3: 'K3 Sonderwelt', K4: 'K4 Stützpunkt' };
const candidates = katalog.rows.filter(r => strip(r[2]) !== 'bes.').map(r => strip(r[0]));
const toi = n => 'toi-700-d-2234' + n;
for (const name of candidates) {
  const st = strip(katRow(name)[2]);
  const bare = name.replace(/\s*\(Monde\)/, '');
  const parts = [];
  const ar = anwartOf(name);
  const isMoons = /Monde/.test(name);
  if (name === 'TOI-700 d') parts.push('TOI-700 d (101,4 ly) ist seit 2235 durch drei Sonden und die Expedition der Meridian erforscht: gebundene Rotation (Sonnenseite, Ring, Schattenseite), im Ring um die Dämmerungslinie atembare Luft (O2 20,3 %, 1,06 bar), Wälder, Seen und kleine Ozeane, einfaches Tierleben fast nur im Wasser. Die Welt ist unbewohnt: Ein Moratorium des Bundes verbietet Landungen bis 2240, nur die Forschungsstation Meridian-Basis (≈ 120 Personen) ist zugelassen. Die frühere Stufe K1 (Terraform-Ziel) gilt nicht mehr; der Planetenschutz-Entwurf sieht Kategorie A für den Ring vor. Der Ceres-Kontor hält über den Fernziel-Fonds ≈ 71 % der Landfläche.');
  else parts.push(`${bare} ist ${isMoons ? 'ein Gasriese mit (im Setting) großen Monden' : 'eine mögliche Koloniewelt'} der Stufe ${stufeName[st]}; ${ar.length ? 'eine Anwartschaft hält ' + ar.join(', ') : 'eine Anwartschaft ist nicht vergeben'}. Besiedelt ist sie 2234 nicht.`);
  parts.push(hdr('Steckbrief', mdTable(['Merkmal', 'Wert'], [['Koloniewert-Stufe', stufeName[st]], ...catalogFacts(name).filter(r => r[0] !== 'Welt' && r[0] !== 'Koloniewert-Stufe')])));
  let src = [SK, SK + '-katalog-aller-koloniewelten', SK + '-wer-will-wohin-anwartschaften', SK + '-der-koloniewert'];
  const kart = st === 'K1' ? K1 : st === 'K3' ? K3 : null;
  if (kart) {
    try { parts.push(hdr('Einschätzung (Dossier „Sternkarte und Koloniewelten“)', blocksMd(sec(kart, name.replace(/ \(Monde\)/, '')), {}))); src.push(kart); } catch (e) { /* Sonderfall */ }
  } else {
    const t = tableOf(st === 'K2' ? K2 : K4, null);
    const r = t.rows.find(x => strip(x[0]) === name);
    if (r) { parts.push(hdr('Eintrag in der Liste (Dossier „Sternkarte und Koloniewelten“)', mdTable(t.head.map(strip), [r.map(strip)]))); src.push(st === 'K2' ? K2 : K4); }
  }
  const r75 = list75.rows.find(x => strip(x[0]) === name);
  if (r75) { src.push(KOL); }
  parts.push(hdr('Reise', reisen(name)));
  if (name === 'TOI-700 d' || name === 'TOI-700 e') {
    src.push(toi(''), toi('-das-system'));
    parts.push(hdr('Das System TOI-700', blocksMd(art(toi('-das-system')).blocks.filter(b => b.t !== 'figure'))));
  }
  if (name === 'TOI-700 d') {
    const T = toi('');
    const blk = (id, h) => blocksMd(h ? sec(id, h) : art(id).blocks);
    src.push(toi('-uberblick'), toi('-hinweise-auf-leben'), toi('-der-bericht-des-teams-hauptbericht-24-august-2235'), toi('-folgen-fur-recht-markt-und-das-ratsel'), toi('-aktualisierter-zeitplan'), toi('-offene-fragen-stand-2235'), toi('-die-messung-fernseite-array-2231-2233'), toi('-die-expedition-der-meridian'), toi('-die-befunde-der-sonden'), toi('-das-sofortprogramm-sonden-per-quantentunnel'), 'solares-rechtsbuch-2234-rahmengesetz-fur-die-welt-toi-700-d-toi-rahmg');
    parts.push(
      hdr('Kurzfassung (Dossier, Stand 2234)', blk(toi('-uberblick'), 'Kurzfassung')),
      hdr('Die Messung am Fernseite-Array 2231–2233', blocksMd(art(toi('-die-messung-fernseite-array-2231-2233')).blocks.filter(b => b.t !== 'figure'))),
      hdr('Hinweise auf Leben', blocksMd(art(toi('-hinweise-auf-leben')).blocks.filter(b => b.t !== 'figure'))),
      hdr('Das Sofortprogramm: Sonden per Quantentunnel', blocksMd(art(toi('-das-sofortprogramm-sonden-per-quantentunnel')).blocks)),
      hdr('Die Befunde der Sonden', blocksMd(art(toi('-die-befunde-der-sonden')).blocks.filter(b => b.t !== 'figure'))),
      hdr('Die Expedition der Meridian', blocksMd(art(toi('-die-expedition-der-meridian')).blocks.filter(b => b.t !== 'figure'))),
      hdr('Der Bericht des Teams (24. August 2235)', blocksMd(art(toi('-der-bericht-des-teams-hauptbericht-24-august-2235')).blocks.filter(b => b.t !== 'figure'))),
      hdr('Folgen für Recht, Markt und das Rätsel', blocksMd(art(toi('-folgen-fur-recht-markt-und-das-ratsel')).blocks)),
      hdr('Aktualisierter Zeitplan', blocksMd(art(toi('-aktualisierter-zeitplan')).blocks)),
      hdr('Offene Fragen (Stand 2235)', blocksMd(art(toi('-offene-fragen-stand-2235')).blocks)),
      hdr('Klima: Warum es über dem Band so viel regnet', climateText()),
      hdr('Geographie des Bandes (Kartenentwurf)', geoText()),
      `Siehe auch: ${link('u-fernlicht-affare', 'Fernlicht-Affäre')}, ${link('u-fernziel-fonds-und-toi-700-d-arbeitshypothese', 'Fernziel-Fonds und TOI-700-d-Arbeitshypothese')}, ${link('u-fernseite-array', 'Fernseite-Array')}, ${link('toi-700-d-2234', 'TOI-700 d (Dossier)')}.`,
    );
  }
  if (/^TOI-700 [de]$/.test(name)) parts.push(`Siehe auch: ${link('u-toi-700-system', 'TOI-700 (System)')} mit Karte (Hilfsmittel, Karten, TOI-700-System); Oberflächenkarte von TOI-700 d: Hilfsmittel, Karten, TOI-700 d: Oberfläche, ${link('u-toi-700-b-welt', 'TOI-700 b')} und ${link('u-toi-700-c-welt', 'TOI-700 c')}.`);
  const title = wTitle(name.replace(/\s*\(Monde\)/, ''));
  emit(isMoons ? bare + ' (Monde)' : title, 'Welten · Koloniewelten (Kandidaten)', parts, { src, re: new RegExp('\\b' + bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b'), noMentions: name === 'TOI-700 d' ? false : false });
}

// ============ Übersicht ============
const idOf = t => written.get(t)?.id;
const L = (title, text) => written.has(title) ? link(idOf(title), text || title.replace(/ \((Planet|Mond|Welt|Zwergplanet)\)$/, '')) : (text || title);
const ovParts = [];
ovParts.push('Diese Übersicht führt alle Planeten, Monde und Welten der Solarrepublik auf: das Sonnensystem, die bewohnten Welten der Nachbarsysteme und Konzernkolonien sowie die möglichen Koloniewelten im Sol-Sektor (200 ly). Jede Welt hat einen eigenen Artikel mit allen Angaben aus den Dossiers.');
ovParts.push('## Sonnensystem\n\n' + mdTable(['Körper', 'Art', 'Einwohner', 'seit', 'Besonderheit'], [
  [L('Erde (Planet)'), 'Planet', '8,4 Mrd.', '–', 'Hauptplanet, atembare Luft'],
  [L('Luna (Mond)'), 'Mond', '47 Mio.', '2038', 'Regierungssitz'],
  [L('Mars (Planet)'), 'Planet', '68 Mio.', '2052 / 2071', 'unter Druck, Terraforming abgelehnt (2168)'],
  [L('Venus (Planet)'), 'Planet', '7,5 Mio.', '2126', 'Aerostat-Städte in 52–55 km Höhe'],
  [L('Merkur (Planet)'), 'Planet', '1,6 Mio.', '2138', 'Polarkolonien, Antimaterie-Fabriken im Orbit'],
  [L('Ceres (Zwergplanet)'), 'Zwergplanet', '11 Mio.', '2119', 'Occator-Werke, Ceres-Freihafen'],
  [L('Jupiter (Planet)'), 'Gasriese', '5,8 Mio. (System)', '2131', 'Monde Kallisto und Ganymed besiedelt'],
  [L('Kallisto (Mond)'), 'Mond', '2,7 Mio.', '2131', 'Hauptsiedlung im Jupiter-System'],
  [L('Ganymed (Mond)'), 'Mond', '2,5 Mio.', '2147', 'eigenes Magnetfeld'],
  [L('Europa (Mond)'), 'Mond', '10 Tsd.', '2159', 'Schutzgebiet Kategorie A'],
  [L('Io (Mond)'), 'Mond', '–', '–', 'unbewohnt'],
  [L('Saturn (Planet)'), 'Gasriese', '1,6 Mio. (System)', '2166', 'Ringeis, Schöpfstationen'],
  [L('Titan (Mond)'), 'Mond', '1,4 Mio.', '2166', 'Chemiewerke'],
  [L('Enceladus (Mond)'), 'Mond', '20 Tsd.', '2181', 'Schutzgebiet Kategorie A'],
  [L('Uranus (Planet)'), 'Eisriese', '60 Tsd. (mit Neptun, Triton)', '2188', 'Schöpfstationen'],
  [L('Neptun (Planet)'), 'Eisriese', '', '2188', 'Schöpfstationen'],
  [L('Triton (Mond)'), 'Mond', '20 Tsd.', '2188', 'Forschungsstadt'],
  [L('Pluto und Charon'), 'Zwergplanet', '15 Tsd.', '2179', 'Ausgangspunkt der Oort-Sonden'],
]));
const bewTab = bw => written.has(bw);
ovParts.push('## Bewohnte Welten der Nachbarsysteme und Konzernkolonien\n\n' + mdTable(['Welt', 'Status', 'Einwohner', 'seit', 'Schwerkraft'], WORLDS.map(w => { const r = ovRow(w.n); return [L(wTitle(w.n), w.n), strip(r[1]), strip(r[2]), strip(r[3]), strip(r[4])]; })));
ovParts.push('Drei Welten haben atembare Luft: Erde, Ross 128 b und – seit der Expedition der Meridian (2235) im Ring um die Dämmerungslinie – TOI-700 d, die als unbewohnt gilt (Moratorium bis 2240). Terraforming-Programme: ' + ['Teegarden c', 'Gliese 1061 d', 'GJ 1002 b', 'Tau Ceti f'].map(n => L(wTitle(n), n)).join(', ') + '; Studien: ' + L('Venus (Planet)', 'Venus') + ', ' + L('Mars (Planet)', 'Mars') + ' (nicht angestrebt).');
for (const st of ['K1', 'K2', 'K3', 'K4']) {
  const rows = katalog.rows.filter(r => strip(r[2]) === st);
  ovParts.push(`## ${stufeName[st]}\n\n` + mdTable(['Welt', 'ly', 'Masse (M⊕)', 'g', 'Einstr.', 'Flug 100c', 'Zugang', 'Setzung', 'Anwartschaft'], rows.map(r => { const n = strip(r[0]); const t = /Monde/.test(n) ? n : wTitle(n); return [L(t, n), strip(r[1]), strip(r[3]), strip(r[4]), strip(r[5]), strip(r[6]), strip(r[7]), strip(r[8]), anwartOf(n).join(', ') || '–']; })));
}
ovParts.push('Der Koloniewert (K1–K4) ordnet die Welten nach der Art, wie Menschen dort leben können; die Stufen sind Setzungen (' + link(SK + '-der-koloniewert', 'Der Koloniewert') + '). Zugang „direkt“ bedeutet: Die Welt liegt außerhalb der Sternzone, es gibt keinen Sperrschatten; „Schatten“ heißt subluminaler Anflug ab der Sternzone.');
ovParts.push(hdr('Terraforming im Überblick', blocksMd(art('bewohnte-welten-2234-terraforming-im-uberblick').blocks.filter(b => b.t === 'p' || b.t === 'table').slice(0, 2))));
ovParts.push('Siehe auch: ' + [SK, 'bewohnte-welten-2234', 'sonnensystem-2234', 'nachbarsysteme-2234', 'sperrzonen-sonnensystem-2234'].map(dossierLink).join(', ') + '.');
{
  const title = 'Planeten und Welten – Übersicht';
  let md = `# ${title}\nKategorie: Welten · Übersicht\n\n` + ovParts.join('\n\n') + `\n\n*${GENERATED}.*\n`;
  fs.writeFileSync(path.join(UA, fileId(title) + '.md'), md);
  written.set(title, { id: fileId(title), md });
}
console.log(`${written.size} Artikel geschrieben`);
