const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('coopmanagerStorage', {
  getItem: (key) => ipcRenderer.invoke('storage:getItem', key),
  setItem: (key, value) => ipcRenderer.invoke('storage:setItem', key, value),
  removeItem: (key) => ipcRenderer.invoke('storage:removeItem', key),
  clearAll: () => ipcRenderer.invoke('storage:clearAll'),
});
