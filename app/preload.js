const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  openPdf: name => ipcRenderer.invoke('open-pdf', name),
  userArticles: () => ipcRenderer.invoke('user-articles'),
});
