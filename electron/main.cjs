const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');
const { SqliteKeyValueStore } = require('./storage.cjs');

let mainWindow = null;
let store = null;

function getDbFilePath() {
  // Persistencia fuera del sandbox del navegador.
  // Documents suele ser más amigable que AppData para respaldos/uso humano.
  const baseDir = path.join(app.getPath('documents'), 'CoopManager');
  return path.join(baseDir, 'coopmanager.db');
}

function isDev() {
  return process.env.COOP_DESKTOP_DEV === '1' || !app.isPackaged;
}

function getDevServerUrl() {
  return process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
}

function getProdIndexPath() {
  // En modo empaquetado, __dirname apunta a <app.asar>/electron/
  // y dist/ está en <app.asar>/dist/
  return path.join(__dirname, '..', 'dist', 'index.html');
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  if (isDev()) {
    await mainWindow.loadURL(getDevServerUrl());
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadFile(getProdIndexPath());
  }
}

function registerIpcHandlers() {
  const dbFilePath = getDbFilePath();
  store = new SqliteKeyValueStore({ dbFilePath });

  ipcMain.handle('storage:getItem', async (_event, key) => {
    return store.getItem(key);
  });

  ipcMain.handle('storage:setItem', async (_event, key, value) => {
    await store.setItem(key, value);
  });

  ipcMain.handle('storage:removeItem', async (_event, key) => {
    await store.removeItem(key);
  });

  ipcMain.handle('storage:clearAll', async () => {
    await store.clearAll();
  });
}

app.whenReady().then(async () => {
  registerIpcHandlers();
  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  try {
    store?.close();
  } catch {
    // ignore
  }
});
