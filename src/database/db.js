import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'timen.db';
const SCHEMA_VERSION = 3;

const RESET = `
  DROP TABLE IF EXISTS attendance;
  DROP TABLE IF EXISTS locations;
  DROP TABLE IF EXISTS users;
  DROP TABLE IF EXISTS organizations;
`;

const SCHEMA = `
  CREATE TABLE organizations (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE users (
    id TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    must_change_password INTEGER NOT NULL DEFAULT 0,
    workplace TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'manager')),
    active INTEGER NOT NULL DEFAULT 1,
    photo TEXT,
    workplace_latitude REAL,
    workplace_longitude REAL,
    workplace_radius REAL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX idx_users_organization ON users (organization_id);

  CREATE TABLE locations (
    id TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL COLLATE NOCASE,
    created_at TEXT NOT NULL,
    UNIQUE (organization_id, name)
  );

  CREATE TABLE attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    location_id TEXT,
    location_name TEXT,
    UNIQUE (user_id, date, type)
  );

  CREATE INDEX idx_attendance_date ON attendance (date);
`;

let databasePromise = null;

export function getDb() {
  if (!databasePromise) {
    databasePromise = openDatabase().catch((error) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

async function openDatabase() {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await migrate(db);
  return db;
}

async function migrate(db) {
  const { user_version: version } = await db.getFirstAsync('PRAGMA user_version');
  if (version >= SCHEMA_VERSION) return;

  await db.withTransactionAsync(async () => {
    if (version < 2) {
      await db.execAsync(RESET);
      await db.execAsync(SCHEMA);
    } else {
      await db.execAsync('ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0');
    }
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  });
}