import localforage from 'localforage';

function getDesktopStorage() {
  if (typeof window === 'undefined') return null;
  return window.coopmanagerStorage ?? null;
}

function ensureWebStorageConfigured() {
  // En web: IndexedDB vía localforage.
  // En desktop: se usa SQLite vía preload/IPC, no localforage.
  localforage.config({
    name: 'coopmanager',
    storeName: 'coopmanager_store',
  });
}

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const desktop = getDesktopStorage();
    if (desktop) {
      return await desktop.getItem<T>(key);
    }

    ensureWebStorageConfigured();
    const value = await localforage.getItem<T>(key);
    return value ?? null;
  } catch (e) {
    console.error('storage.getItem error', e);
    return null;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    const desktop = getDesktopStorage();
    if (desktop) {
      await desktop.setItem<T>(key, value);
      return;
    }

    ensureWebStorageConfigured();
    await localforage.setItem<T>(key, value);
  } catch (e) {
    console.error('storage.setItem error', e);
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    const desktop = getDesktopStorage();
    if (desktop) {
      await desktop.removeItem(key);
      return;
    }

    ensureWebStorageConfigured();
    await localforage.removeItem(key);
  } catch (e) {
    console.error('storage.removeItem error', e);
  }
}

export async function clearAll(): Promise<void> {
  try {
    const desktop = getDesktopStorage();
    if (desktop) {
      await desktop.clearAll();
      return;
    }

    ensureWebStorageConfigured();
    await localforage.clear();
  } catch (e) {
    console.error('storage.clear error', e);
  }
}
