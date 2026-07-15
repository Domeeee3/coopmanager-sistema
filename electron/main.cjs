const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const { SqliteKeyValueStore } = require('./storage.cjs');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'coopmanager-photo',
    privileges: { secure: true, standard: true, supportFetchAPI: true },
  },
]);

let mainWindow = null;
let store = null;

const PHOTO_FILE_PATTERN = /^[a-f0-9-]+\.(jpg|png|webp)$/;
const WORKSPACE_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const PHOTO_MIME_TYPES = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};
const MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024;

function getAppDataDirectory() {
  return path.join(app.getPath('documents'), 'CoopManager');
}

function getDbFilePath() {
  // Persistencia fuera del sandbox del navegador.
  // Documents suele ser más amigable que AppData para respaldos/uso humano.
  return path.join(getAppDataDirectory(), 'coopmanager.db');
}

function isValidWorkspaceId(workspaceId) {
  return typeof workspaceId === 'string' && WORKSPACE_ID_PATTERN.test(workspaceId);
}

function getLegacyProfilePhotosDirectory() {
  return path.join(getAppDataDirectory(), 'profile-photos');
}

function getProfilePhotosDirectory(workspaceId) {
  if (!isValidWorkspaceId(workspaceId)) return null;
  return path.join(getLegacyProfilePhotosDirectory(), workspaceId);
}

function getProfilePhotoPath(workspaceId, fileName) {
  if (!isValidWorkspaceId(workspaceId) || typeof fileName !== 'string' || !PHOTO_FILE_PATTERN.test(fileName)) {
    return null;
  }

  return path.join(getLegacyProfilePhotosDirectory(), workspaceId, fileName);
}

function getProfilePhotoUrl(workspaceId, fileName) {
  if (!getProfilePhotoPath(workspaceId, fileName)) return null;
  return `coopmanager-photo://${encodeURIComponent(workspaceId)}/${encodeURIComponent(fileName)}`;
}

function migrateLegacyProfilePhotos(workspaceId) {
  if (!isValidWorkspaceId(workspaceId)) throw new Error('El espacio de trabajo no es válido.');

  const legacyDirectory = getLegacyProfilePhotosDirectory();
  if (!fs.existsSync(legacyDirectory)) return;

  const workspaceDirectory = getProfilePhotosDirectory(workspaceId);
  const legacyFiles = fs.readdirSync(legacyDirectory, { withFileTypes: true });

  for (const entry of legacyFiles) {
    if (!entry.isFile() || !PHOTO_FILE_PATTERN.test(entry.name)) continue;

    const legacyPath = path.join(legacyDirectory, entry.name);
    const workspacePath = path.join(workspaceDirectory, entry.name);
    if (fs.existsSync(workspacePath)) continue;

    if (!fs.existsSync(workspaceDirectory)) fs.mkdirSync(workspaceDirectory, { recursive: true });

    try {
      fs.copyFileSync(legacyPath, workspacePath, fs.constants.COPYFILE_EXCL);
    } catch (error) {
      if (error?.code === 'EEXIST') continue;
      throw error;
    }

    fs.unlinkSync(legacyPath);
  }
}

function parseProfilePhoto(dataUrl) {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error('El archivo debe ser una imagen JPG, PNG o WebP.');

  const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
  const content = Buffer.from(match[2], 'base64');
  if (!content.length || content.length > MAX_PROFILE_PHOTO_SIZE) {
    throw new Error('La imagen debe pesar como máximo 5 MB.');
  }

  return { content, extension };
}

function registerProfilePhotoProtocol() {
  protocol.handle('coopmanager-photo', async (request) => {
    let workspaceId;
    let fileName;

    try {
      const url = new URL(request.url);
      if (!/^\/[^/]+$/.test(url.pathname)) {
        return new Response('Foto no válida', { status: 400 });
      }

      workspaceId = decodeURIComponent(url.hostname);
      fileName = decodeURIComponent(url.pathname.slice(1));
    } catch {
      return new Response('Foto no válida', { status: 400 });
    }

    const photoPath = getProfilePhotoPath(workspaceId, fileName);
    if (!photoPath) return new Response('Foto no válida', { status: 400 });
    if (!fs.existsSync(photoPath)) return new Response('Foto no encontrada', { status: 404 });

    const extension = path.extname(fileName).slice(1);
    return new Response(fs.readFileSync(photoPath), {
      headers: { 'content-type': PHOTO_MIME_TYPES[extension] },
    });
  });
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
  } else {
    await mainWindow.loadFile(getProdIndexPath());
  }
}

function registerIpcHandlers() {
  const dbFilePath = getDbFilePath();
  store = new SqliteKeyValueStore({ dbFilePath });

  ipcMain.handle('storage:getItem', async (_event, key) => store.getItem(key));
  ipcMain.handle('storage:setItem', async (_event, key, value) => store.setItem(key, value));
  ipcMain.handle('storage:removeItem', async (_event, key) => store.removeItem(key));
  ipcMain.handle('storage:clearAll', async () => store.clearAll());

  ipcMain.handle('profile-photo:save', async (_event, workspaceId, dataUrl) => {
    if (!isValidWorkspaceId(workspaceId)) throw new Error('El espacio de trabajo no es válido.');
    if (typeof dataUrl !== 'string') throw new Error('La imagen no es válida.');

    const { content, extension } = parseProfilePhoto(dataUrl);
    const directory = getProfilePhotosDirectory(workspaceId);
    if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });

    const fileName = `${crypto.randomUUID()}.${extension}`;
    fs.writeFileSync(path.join(directory, fileName), content, { flag: 'wx' });
    return fileName;
  });

  ipcMain.handle('profile-photo:remove', async (_event, workspaceId, fileName) => {
    const photoPath = getProfilePhotoPath(workspaceId, fileName);
    if (photoPath && fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
  });

  ipcMain.handle('profile-photo:clearAll', async (_event, workspaceId) => {
    const directory = getProfilePhotosDirectory(workspaceId);
    if (!directory) throw new Error('El espacio de trabajo no es válido.');
    fs.rmSync(directory, { recursive: true, force: true });
  });

  ipcMain.handle('profile-photo:getUrl', async (_event, workspaceId, fileName) => {
    const url = getProfilePhotoUrl(workspaceId, fileName);
    if (!url) throw new Error('La foto o el espacio de trabajo no son válidos.');
    return url;
  });

  ipcMain.handle('profile-photo:migrateLegacy', async (_event, workspaceId) => {
    migrateLegacyProfilePhotos(workspaceId);
  });
}

app.whenReady().then(async () => {
  registerProfilePhotoProtocol();
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
