import { getDb } from "./db";

export function cleanupExpiredPasscodes() {
  const db = getDb();
  const now = Date.now();

  const stmt = db.prepare(`
    DELETE FROM passcodes 
    WHERE expires_at <= ?
  `);

  const result = stmt.run(now);
  stmt.finalize();

  return result.changes;
}