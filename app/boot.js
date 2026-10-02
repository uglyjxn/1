// Lädt eigene Artikel (Markdown-Dateien im Ordner user-articles), mischt sie in das Wiki und startet dann die App.
(async function () {
  let list = [];
  try { if (window.desktop && window.desktop.userArticles) list = await window.desktop.userArticles(); } catch { /* ohne Desktop: keine eigenen Artikel */ }
  window.__userSig = JSON.stringify(list.map(x => [x.id, x.md.length, x.mtime]));
  window.__userBroken = window.UserArticles.merge(window.WIKI, list).broken;
  const s = document.createElement('script');
  s.src = 'app.js';
  document.body.appendChild(s);
  // Neu geladen, sobald das Fenster fokussiert wird und sich Artikel geändert haben
  window.addEventListener('focus', async () => {
    try { const l = await window.desktop.userArticles(); if (JSON.stringify(l.map(x => [x.id, x.md.length, x.mtime])) !== window.__userSig) location.reload(); } catch { /* ignorieren */ }
  });
})();
