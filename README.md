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
