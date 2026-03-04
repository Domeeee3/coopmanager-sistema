const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function safeJsonStringify(value) {
  return JSON.stringify(value ?? null);
}

/**
 * Pequeño KV-store sobre SQLite para reemplazar IndexedDB/localforage en modo desktop.
 *
 * Tabla: kv(key TEXT PRIMARY KEY, value TEXT NOT NULL)
 */
class SqliteKeyValueStore {
  /**
   * @param {{ dbFilePath: string }} options
   */
  constructor({ dbFilePath }) {
    this.dbFilePath = dbFilePath;

    ensureDir(path.dirname(dbFilePath));

    this.db = new Database(dbFilePath);
    this.db.pragma('journal_mode = WAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    this.getStmt = this.db.prepare('SELECT value FROM kv WHERE key = ?');
    this.setStmt = this.db.prepare('INSERT INTO kv(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    this.removeStmt = this.db.prepare('DELETE FROM kv WHERE key = ?');
    this.clearStmt = this.db.prepare('DELETE FROM kv');
  }

  /**
   * @template T
   * @param {string} key
   * @returns {Promise<T|null>}
   */
  async getItem(key) {
    const row = this.getStmt.get(key);
    if (!row) return null;
    return safeJsonParse(row.value);
  }

  /**
   * @template T
   * @param {string} key
   * @param {T} value
   * @returns {Promise<void>}
   */
  async setItem(key, value) {
    const json = safeJsonStringify(value);
    this.setStmt.run(key, json);
  }

  /**
   * @param {string} key
   * @returns {Promise<void>}
   */
  async removeItem(key) {
    this.removeStmt.run(key);
  }

  /**
   * @returns {Promise<void>}
   */
  async clearAll() {
    this.clearStmt.run();
  }

  close() {
    try {
      this.db.close();
    } catch {
      // ignore
    }
  }
}

module.exports = {
  SqliteKeyValueStore,
};
