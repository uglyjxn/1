// Lädt eigene Artikel und Bearbeitungen (Ordner user-articles), mischt sie in das Wiki und startet dann die App.
(async function () {
  const load = async () => { try { return await window.desktop.userArticles(); } catch { return { articles: [], edits: [] }; } };
  const sig = d => JSON.stringify([d.articles.map(x => [x.id, x.md.length, x.mtime]), d.edits.map(x => [x.id, x.mtime])]);
  const data = window.desktop ? await load() : { articles: [], edits: [] };
  window.__userData = data;
  window.__userSig = sig(data);
  window.__userBroken = window.UserArticles.merge(window.WIKI, data.articles, data.edits).broken;
  const s = document.createElement('script');
  s.src = 'app.js';
  document.body.appendChild(s);
  // Neu laden, sobald das Fenster fokussiert wird und sich etwas geändert hat
  window.addEventListener('focus', async () => { if (window.desktop && sig(await load()) !== window.__userSig) location.reload(); });
})();
