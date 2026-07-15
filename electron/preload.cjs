const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('coopmanagerStorage', {
  getItem: (key) => ipcRenderer.invoke('storage:getItem', key),
  setItem: (key, value) => ipcRenderer.invoke('storage:setItem', key, value),
  removeItem: (key) => ipcRenderer.invoke('storage:removeItem', key),
  clearAll: () => ipcRenderer.invoke('storage:clearAll'),
});

contextBridge.exposeInMainWorld('coopmanagerPhotos', {
  save: (workspaceId, dataUrl) => ipcRenderer.invoke('profile-photo:save', workspaceId, dataUrl),
  remove: (workspaceId, fileName) => ipcRenderer.invoke('profile-photo:remove', workspaceId, fileName),
  clearAll: (workspaceId) => ipcRenderer.invoke('profile-photo:clearAll', workspaceId),
  getUrl: (workspaceId, fileName) => ipcRenderer.invoke('profile-photo:getUrl', workspaceId, fileName),
  migrateLegacy: (workspaceId) => ipcRenderer.invoke('profile-photo:migrateLegacy', workspaceId),
});
