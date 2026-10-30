import { getDb } from "./db";

export type RateLimitAction =
  | "passcode_request"
  | "verify_attempt"
  | "login_attempt"
  | "magic_link_request";

interface RateLimitRule {
  maxAttempts: number;
  windowSeconds: number;
  blockMinutes: number;
}

const RULES: Record<RateLimitAction, RateLimitRule> = {
  passcode_request: { maxAttempts: 5, windowSeconds: 3600, blockMinutes: 60 },
  verify_attempt: { maxAttempts: 5, windowSeconds: 600, blockMinutes: 30 },
  login_attempt: { maxAttempts: 10, windowSeconds: 3600, blockMinutes: 60 },
  magic_link_request: { maxAttempts: 5, windowSeconds: 3600, blockMinutes: 60 },
};

let tablesReady = false;
function ensureTables() {
  if (tablesReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS rate_limit_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rla_identifier_action
      ON rate_limit_attempts(identifier, action);

    CREATE TABLE IF NOT EXISTS blocked_entities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      reason TEXT NOT NULL,
      blocked_until INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      blocked_by INTEGER,
      blocked_by_email TEXT
    );
  `);
  tablesReady = true;
}

export function checkRateLimit(identifier: string, action: RateLimitAction) {
  ensureTables();
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const rule = RULES[action];

  // Already blocked?
  const blocked = db
    .prepare(`SELECT * FROM blocked_entities WHERE identifier = ? AND blocked_until > ?`)
    .get(identifier, now) as any;

  if (blocked) {
    return {
      allowed: false,
      reason: blocked.reason,
      blockedUntil: blocked.blocked_until,
    };
  }

  // Count attempts in window
  const windowStart = now - rule.windowSeconds;
  const countRow = db
    .prepare(
      `SELECT COUNT(*) as count FROM rate_limit_attempts
       WHERE identifier = ? AND action = ? AND created_at >= ?`
    )
    .get(identifier, action, windowStart) as { count: number };

  const remaining = Math.max(0, rule.maxAttempts - countRow.count);

  if (countRow.count >= rule.maxAttempts) {
    const blockedUntil = now + rule.blockMinutes * 60;
    db.prepare(
      `INSERT INTO blocked_entities (identifier, type, reason, blocked_until, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(identifier) DO UPDATE SET
         blocked_until = excluded.blocked_until,
         reason = excluded.reason,
         created_at = excluded.created_at`
    ).run(
      identifier,
      identifier.includes("@") ? "user" : "ip",
      `rate_limit_exceeded:${action}`,
      blockedUntil,
      now
    );

    return {
      allowed: false,
      reason: `Too many ${action.replace(/_/g, " ")} attempts`,
      blockedUntil,
      remainingAttempts: 0,
    };
  }

  db.prepare(
    `INSERT INTO rate_limit_attempts (identifier, action, created_at) VALUES (?, ?, ?)`
  ).run(identifier, action, now);

  return { allowed: true, remainingAttempts: remaining - 1 };
}

export function getBlockedEntities() {
  ensureTables();
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  return db
    .prepare(`SELECT * FROM blocked_entities WHERE blocked_until > ? ORDER BY blocked_until DESC`)
    .all(now);
}

export function getRateLimitStats() {
  ensureTables();
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const dayAgo = now - 86400;

  const activeBlocksRow = db
    .prepare(`SELECT COUNT(*) as count FROM blocked_entities WHERE blocked_until > ?`)
    .get(now) as { count: number };

  const actionCounts = db
    .prepare(
      `SELECT action, COUNT(*) as count FROM rate_limit_attempts
       WHERE created_at >= ? GROUP BY action`
    )
    .all(dayAgo) as Array<{ action: string; count: number }>;

  const totalAttempts: Record<string, number> = {};
  actionCounts.forEach((row) => {
    totalAttempts[row.action] = row.count;
  });

  const topOffenders = db
    .prepare(
      `SELECT identifier, action, COUNT(*) as attempts
       FROM rate_limit_attempts
       WHERE created_at >= ?
       GROUP BY identifier, action
       ORDER BY attempts DESC
       LIMIT 10`
    )
    .all(dayAgo) as Array<{ identifier: string; action: string; attempts: number }>;

  return {
    activeBlocks: activeBlocksRow.count,
    totalAttempts,
    topOffenders,
  };
}

// Find and replace the blockEntity function with this:
export function blockEntity(
  identifier: string,
  type: string,
  reason: string,
  durationMinutes: number,
  blockedByUserId?: number
) {
  ensureTables();
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const blockedUntil = now + durationMinutes * 60;

  db.prepare(`
    INSERT INTO blocked_entities (identifier, type, reason, blocked_until, created_at, blocked_by)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(identifier) DO UPDATE SET
      type = excluded.type,
      reason = excluded.reason,
      blocked_until = excluded.blocked_until,
      created_at = excluded.created_at,
      blocked_by = excluded.blocked_by
  `).run(identifier, type, reason, blockedUntil, now, blockedByUserId ?? null);
}

export function unblockEntity(identifier: string, _unblockedByUserId?: number): boolean {
  ensureTables();
  const db = getDb();
  const result = db.prepare(`DELETE FROM blocked_entities WHERE identifier = ?`).run(identifier);
  return result.changes > 0;
}

export function cleanupExpiredLimits() {
  ensureTables();
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  db.prepare(`DELETE FROM blocked_entities WHERE blocked_until <= ?`).run(now);
  db.prepare(`DELETE FROM rate_limit_attempts WHERE created_at < ?`).run(now - 7 * 86400);
}

export function recordSuccessfulAction(identifier: string, action: RateLimitAction) {
  ensureTables();
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  // Clear recent attempts for this identifier+action on success
  // This prevents legitimate users from being locked out after success
  db.prepare(`
    DELETE FROM rate_limit_attempts
    WHERE identifier = ? AND action = ? AND created_at >= ?
  `).run(identifier, action, now - RULES[action].windowSeconds);

  // Remove any block if it exists and reason was rate limiting
  db.prepare(`
    DELETE FROM blocked_entities
    WHERE identifier = ?
    AND reason LIKE 'rate_limit_exceeded%'
  `).run(identifier);
}
