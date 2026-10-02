# Solarpedia

Desktop-App (Electron) zum Lesen der Dossiers 2234/2235 im Stil von Wikipedia, mit dunklem Theme.

- 334 Artikel aus 18 PDFs (Einzeldossiers, Setting-Zusammenfassung, Solares Rechtsbuch)
- Automatische Querverweise (Hyperlinks) zwischen Artikeln, Paragraphen (§) und Ref-IDs (2234-A7x)
- Volltextsuche mit Schnellvorschlägen (`/` oder `Strg+K`), Hervorhebung der Treffer, Suche auf der Seite (`Strg+F`)
- Inhaltsverzeichnis, Infoboxen, Tabellen, Abbildungen (Klick = Vergrößern), „Verweise auf diesen Artikel“
- Original-PDF per Klick öffnen

## Starten
```
npm install
npm start
```
Installer bauen: `npm run dist` (bzw. `dist:win`, `dist:mac`, `dist:linux`).

## Daten neu erzeugen (optional)
Die fertigen Daten liegen in `app/data/articles.js`. Zum Neuaufbau aus den PDFs
(benötigt `pdftohtml` aus poppler-utils und `pip install pymupdf`):
```
node tools/build-data.mjs <Ordner mit entpacktem ZIP>
```

## Claude-Chat anbinden (MCP)
`mcp/server.mjs` stellt Claude drei Werkzeuge bereit: `search_wiki`, `get_article`, `list_articles`.
Eintrag in Claude Desktop (Einstellungen → Entwickler → Konfiguration bearbeiten), `<PFAD>` = Ordner dieses Projekts:
```json
{ "mcpServers": { "solarpedia": { "command": "node", "args": ["<PFAD>/mcp/server.mjs"] } } }
```

## Eigene Artikel (von Claude schreiben lassen)
Der MCP-Server hat zusätzlich `write_article` und `delete_article`. Die Artikel liegen als Markdown-Dateien in `user-articles/`
(über `SOLARPEDIA_USER_DIR` änderbar), erscheinen in der App unter „Eigene Artikel“ und sind per `[[Titel]]` / `[[artikel-id]]` verlinkbar.
Neu geschriebene Artikel erscheinen, sobald das App-Fenster wieder den Fokus bekommt.

### Bestehende Artikel bearbeiten
`edit_article` (Text ersetzen, Abschnitte anhängen/ersetzen/löschen) und `revert_edits` wirken auf Dossier-Artikel und eigene Artikel.
Die Änderungen liegen als JSON in `user-articles/_edits/`, die Original-PDFs bleiben unberührt. In der App erscheint ein Hinweis „Bearbeitet“.

### Installierte App (`npm run dist:win`) und MCP
Die installierte App liest eigene Artikel aus `<Benutzerordner>\Solarpedia\user-articles`. Damit Claude (MCP) denselben Ordner nutzt, in der
`claude_desktop_config.json` ergänzen: `"env": { "SOLARPEDIA_USER_DIR": "C:\\Users\\NAME\\Solarpedia\\user-articles" }`.

### Mitgelieferte Ergänzungsartikel
Der Ordner `user-articles/` enthält 94 Ergänzungsartikel (Geschichte, Politik, Technik, Gesellschaft, Wirtschaft u. a.) und 15 Bearbeitungen bestehender Dossier-Artikel (`_edits/`).
Beim Start von `npm start` werden sie automatisch geladen. Die Kategorie-Etiketten „Kanon“, „Entwurf“ und „Gerücht“ zeigen den Status; siehe den Artikel „Kanon-Status und Quellenhinweise“.

## Hilfsmittel (Register, Karten, Diagramme)
Im Menü „Hilfsmittel“ (links) oder unter `#/tools`:
- **Glossar** (114 Begriffe mit Quelle), **Register** (Personen, Welten, Firmen, Schiffsklassen, Gesetze, Behörden, Dossiers), **Organigramm** der Regierung,
- **Karten**: Sternkarte, Handelsnetz, Sonnensystem (logarithmisch), TOI-700 d; **Konzernnetz**; **Zeitleiste**; **Diagramme**; **Rechner**; Kategorien/A–Z; Lesezeichen; Qualitätsübersicht.
- In Artikeln: Vorschau beim Überfahren von Links, sortier- und filterbare Tabellen, Verknüpfungsnetz, Merken, Zitieren, Schriftgröße.
- Suche mit Tippfehler-Toleranz, Wortformen, Synonymen, Phrasen in Anführungszeichen und Teiltreffern.

Die Daten dafür erzeugt `node tools/build-tools.mjs` aus den Dossier-Artikeln (`app/data/articles.js`) und den kuratierten Angaben in `tools/curated.mjs`.
Der MCP-Server hat dazu die Werkzeuge `glossary`, `timeline` und `register`.

## Letzte Änderungen
Die Startseite hat den Tab „Letzte Änderungen“ (`#/aenderungen`): neue und bearbeitete eigene Artikel nach Datei-Zeitstempel sowie das Programm-Changelog (`app/changelog.js`).

## Planeten- und Weltenartikel
`node tools/gen-planets.mjs` erzeugt aus den Dossiers je einen Artikel für jeden Planeten, Mond und jede Welt (`user-articles/u-*-planet.md`, `-mond`, `-welt` …) und die „Planeten und Welten – Übersicht“. Die Dateien tragen den Marker „Zusammenstellung aus den Dossiers“; das Skript kann beliebig oft neu laufen.

## Automatisch aktualisieren
Einmalig: `git clone -b claude/gallant-lovelace-x4w4w5 https://github.com/uglyjxn/1 Solarpedia` (Git muss installiert sein), dann im Ordner `npm install`.
Danach genügt ein Doppelklick auf `update.bat` (oder `npm run update`): holt die neueste Version per `git pull` und überträgt neue Artikel in den Ordner `<Benutzerordner>\Solarpedia\user-articles` der installierten App.
