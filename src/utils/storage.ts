import localforage from 'localforage';

localforage.config({
  name: 'coopmanager',
  storeName: 'coopmanager_store',
});

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const value = await localforage.getItem<T>(key);
    return value ?? null;
  } catch (e) {
    console.error('storage.getItem error', e);
    return null;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await localforage.setItem<T>(key, value);
  } catch (e) {
    console.error('storage.setItem error', e);
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await localforage.removeItem(key);
  } catch (e) {
    console.error('storage.removeItem error', e);
  }
}

export async function clearAll(): Promise<void> {
  try {
    await localforage.clear();
  } catch (e) {
    console.error('storage.clear error', e);
  }
}
