const { app, BrowserWindow, Menu, shell, ipcMain, nativeTheme } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

nativeTheme.themeSource = 'dark';

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 820,
    minHeight: 560,
    backgroundColor: '#101418',
    title: 'Solarpedia',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadFile(path.join(__dirname, 'index.html'));

  // Externe Links im Standardbrowser öffnen, nie in der App
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); }
  });
  return win;
}

function userDir() {
  if (process.env.SOLARPEDIA_USER_DIR) return process.env.SOLARPEDIA_USER_DIR;
  return app.isPackaged ? path.join(app.getPath('userData'), 'user-articles') : path.join(__dirname, '..', 'user-articles');
}
ipcMain.handle('user-articles', () => {
  const dir = userDir();
  const out = { articles: [], edits: [] };
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith('.md')) out.articles.push({ id: f.replace(/\.md$/, ''), md: fs.readFileSync(path.join(dir, f), 'utf8'), mtime: fs.statSync(path.join(dir, f)).mtimeMs });
  }
  const ed = path.join(dir, '_edits');
  if (fs.existsSync(ed)) for (const f of fs.readdirSync(ed)) if (f.endsWith('.json')) {
    try { out.edits.push({ id: f.replace(/\.json$/, ''), ops: JSON.parse(fs.readFileSync(path.join(ed, f), 'utf8')), mtime: fs.statSync(path.join(ed, f)).mtimeMs }); } catch { /* defekte Datei ignorieren */ }
  }
  return out;
});

ipcMain.handle('open-pdf', async (_e, name) => {
  const file = path.join(__dirname, 'pdf', path.basename(String(name)));
  if (!fs.existsSync(file)) return 'PDF nicht gefunden';
  return shell.openPath(file);
});

const template = [
  {
    label: 'Datei',
    submenu: [{ role: 'quit', label: 'Beenden' }],
  },
  {
    label: 'Bearbeiten',
    submenu: [
      { role: 'copy', label: 'Kopieren' },
      { role: 'selectAll', label: 'Alles auswählen' },
    ],
  },
  {
    label: 'Ansicht',
    submenu: [
      { role: 'zoomIn', label: 'Vergrößern', accelerator: 'CommandOrControl+Plus' },
      { role: 'zoomOut', label: 'Verkleinern', accelerator: 'CommandOrControl+-' },
      { role: 'resetZoom', label: 'Originalgröße' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: 'Vollbild' },
      { role: 'toggleDevTools', label: 'Entwicklertools' },
    ],
  },
];

app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
