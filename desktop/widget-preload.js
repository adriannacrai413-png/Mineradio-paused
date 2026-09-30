const { contextBridge, ipcRenderer } = require('electron');

function bind(channel, callback) {
  if (typeof callback !== 'function') return () => {};
  const listener = (_event, payload) => callback(payload || {});
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('widgetBridge', {
  // main -> widget
  onReady: (callback) => bind('mineradio-widget-ready', callback),
  onState: (callback) => bind('mineradio-widget-state', callback),
  onMode: (callback) => bind('mineradio-widget-mode', callback),
  // widget -> main
  sendAction: (action) => ipcRenderer.invoke('mineradio-widget-action', action || {}),
  toggleSize: () => ipcRenderer.invoke('mineradio-widget-toggle-size'),
  requestState: () => ipcRenderer.invoke('mineradio-widget-request-state'),
  close: () => ipcRenderer.invoke('mineradio-widget-set-enabled', false),
});
