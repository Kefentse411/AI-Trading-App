import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'database.db');
    db = new Database(dbPath);
    console.log('db loaded: object');
  }
  return db;
}