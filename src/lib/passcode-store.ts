import { getDb } from "./db";

export function generatePasscode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function savePasscode(email: string, code: string) {
  const db = getDb();
  const normalizedEmail = normalizeEmail(email);
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Use INSERT OR REPLACE to update existing email records
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO passcodes (email, code, expires_at)
    VALUES (?, ?, ?)
  `);

  stmt.run(normalizedEmail, code, expiresAt);
}

export function getExistingValidPasscode(email: string) {
  const db = getDb();
  const normalizedEmail = normalizeEmail(email);
  const now = Date.now();

  // Clean up expired codes first
  const cleanupStmt = db.prepare(`
    DELETE FROM passcodes 
    WHERE expires_at <= ?
  `);
  cleanupStmt.run(now);

  // Get valid passcode for this email
  const stmt = db.prepare(`
    SELECT code, expires_at 
    FROM passcodes 
    WHERE email = ? AND expires_at > ?
  `);

  const row = stmt.get(normalizedEmail, now) as {
    code: string;
    expires_at: number;
  } | undefined;

  return row?.code || null;
}

export function verifyPasscode(email: string, submittedCode: string) {
  const db = getDb();
  const normalizedEmail = normalizeEmail(email);
  const now = Date.now();
  const cleanSubmittedCode = submittedCode.trim();

  // Get the passcode record
  const selectStmt = db.prepare(`
    SELECT code, expires_at 
    FROM passcodes 
    WHERE email = ?
  `);

  const row = selectStmt.get(normalizedEmail) as {
    code: string;
    expires_at: number;
  } | undefined;

  if (!row) {
    return {
      ok: false as const,
      reason: "No passcode found. Please request a new code.",
    };
  }

  if (now > row.expires_at) {
    // Clean up expired code
    const deleteStmt = db.prepare(`
      DELETE FROM passcodes WHERE email = ?
    `);
    deleteStmt.run(normalizedEmail);

    return {
      ok: false as const,
      reason: "Passcode expired. Please request a new code.",
    };
  }

  if (row.code !== cleanSubmittedCode) {
    return {
      ok: false as const,
      reason: "Invalid passcode.",
    };
  }

  // Delete the used passcode
  const deleteStmt = db.prepare(`
    DELETE FROM passcodes WHERE email = ?
  `);
  deleteStmt.run(normalizedEmail);

  return {
    ok: true as const,
  };
}