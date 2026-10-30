import { getDb } from "./db";
import { logAuditEvent } from "./audit";
import { randomBytes } from "crypto";

export type InviteCode = {
  id: number;
  code: string;
  created_by: number;
  max_uses: number;
  current_uses: number;
  expires_at: number;
  role_id: number;
  notes: string | null;
  created_at: number;
  updated_at: number;
  creator_email?: string;
  role_name?: string;
};

export type InviteUsage = {
  id: number;
  invite_code_id: number;
  user_id: number;
  email: string;
  used_at: number;
  ip_address: string | null;
};

export function generateInviteCode(): string {
  // Generate a human-readable invite code
  const prefix = "INV";
  const random = randomBytes(8).toString("hex").toUpperCase();
  return `${prefix}-${random.slice(0, 4)}-${random.slice(4, 8)}`;
}

export function createInvite(
  createdBy: number,
  options: {
    maxUses?: number;
    expiresInDays?: number;
    roleId?: number;
    notes?: string;
  } = {}
): { code: string; id: number } {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  
  const code = generateInviteCode();
  const expiresAt = now + ((options.expiresInDays || 7) * 24 * 60 * 60);
  
  const result = db.prepare(`
    INSERT INTO invite_codes (
      code, created_by, max_uses, expires_at, role_id, notes
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    code,
    createdBy,
    options.maxUses || 1,
    expiresAt,
    options.roleId || 2, // default to user role
    options.notes || null
  );

  logAuditEvent({
    userId: createdBy,
    action: "invite.created" as any,
    resourceType: "system",
    resourceId: code,
    details: {
      maxUses: options.maxUses || 1,
      expiresInDays: options.expiresInDays || 7,
      roleId: options.roleId || 2,
    }
  }).catch(console.error);

  console.log(`📬 Invite code created: ${code} by user ${createdBy}`);

  return { code, id: result.lastInsertRowid as number };
}

export function validateInviteCode(code: string): {
  valid: boolean;
  invite?: InviteCode;
  reason?: string;
} {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const invite = db.prepare(`
    SELECT 
      ic.*,
      u.email as creator_email,
      r.name as role_name
    FROM invite_codes ic
    JOIN users u ON ic.created_by = u.id
    JOIN roles r ON ic.role_id = r.id
    WHERE ic.code = ?
  `).get(code) as InviteCode | undefined;

  if (!invite) {
    return { valid: false, reason: "Invalid invite code" };
  }

  if (invite.expires_at < now) {
    return { valid: false, reason: "Invite code has expired" };
  }

  if (invite.current_uses >= invite.max_uses) {
    return { valid: false, reason: "Invite code has been fully used" };
  }

  return { valid: true, invite };
}

export function useInviteCode(
  code: string,
  userId: number,
  email: string,
  ipAddress?: string
): { success: boolean; error?: string } {
  const db = getDb();
  const validation = validateInviteCode(code);

  if (!validation.valid || !validation.invite) {
    return { success: false, error: validation.reason };
  }

  const invite = validation.invite;

  try {
    // Start transaction
    db.exec("BEGIN TRANSACTION");

    // Record usage
    db.prepare(`
      INSERT INTO invite_usage (invite_code_id, user_id, email, ip_address)
      VALUES (?, ?, ?, ?)
    `).run(invite.id, userId, email, ipAddress);

    // Increment usage count
    db.prepare(`
      UPDATE invite_codes 
      SET current_uses = current_uses + 1, updated_at = strftime('%s', 'now')
      WHERE id = ?
    `).run(invite.id);

    // Update user's role if different from default
    if (invite.role_id !== 2) {
      db.prepare(`
        UPDATE users 
        SET role_id = ?, updated_at = strftime('%s', 'now')
        WHERE id = ?
      `).run(invite.role_id, userId);
    }

    db.exec("COMMIT");

    logAuditEvent({
      userId: userId,
      action: "invite.used" as any,
      resourceType: "system",
      resourceId: code,
      details: {
        email,
        inviteCreator: invite.creator_email,
        assignedRole: invite.role_name,
      }
    }).catch(console.error);

    console.log(`📩 Invite code ${code} used by ${email}`);

    return { success: true };

  } catch (error) {
    db.exec("ROLLBACK");
    console.error("Error using invite code:", error);
    return { success: false, error: "Failed to process invite" };
  }
}

export function getAllInvites(createdBy?: number): InviteCode[] {
  const db = getDb();
  
  let query = `
    SELECT 
      ic.*,
      u.email as creator_email,
      r.name as role_name
    FROM invite_codes ic
    JOIN users u ON ic.created_by = u.id
    JOIN roles r ON ic.role_id = r.id
  `;
  
  const params: any[] = [];
  
  if (createdBy) {
    query += ` WHERE ic.created_by = ?`;
    params.push(createdBy);
  }
  
  query += ` ORDER BY ic.created_at DESC`;
  
  return db.prepare(query).all(...params) as InviteCode[];
}

export function getInviteUsage(inviteId: number): InviteUsage[] {
  const db = getDb();
  
  return db.prepare(`
    SELECT iu.*, u.name as user_name, u.email as user_email
    FROM invite_usage iu
    JOIN users u ON iu.user_id = u.id
    WHERE iu.invite_code_id = ?
    ORDER BY iu.used_at DESC
  `).all(inviteId) as InviteUsage[];
}

export function deleteInvite(inviteId: number, deletedBy: number): boolean {
  const db = getDb();
  
  // Get invite details for audit
  const invite = db.prepare(`
    SELECT code, created_by FROM invite_codes WHERE id = ?
  `).get(inviteId) as { code: string; created_by: number } | undefined;
  
  if (!invite) return false;
  
  // Delete usage records first (foreign key constraint)
  db.prepare(`DELETE FROM invite_usage WHERE invite_code_id = ?`).run(inviteId);
  
  // Delete invite
  const result = db.prepare(`DELETE FROM invite_codes WHERE id = ?`).run(inviteId);
  
  if (result.changes > 0) {
    logAuditEvent({
      userId: deletedBy,
      action: "invite.deleted" as any,
      resourceType: "system",
      resourceId: invite.code,
      details: {
        originalCreator: invite.created_by,
      }
    }).catch(console.error);
    
    return true;
  }
  
  return false;
}

export function getInviteStats(): {
  total: number;
  active: number;
  expired: number;
  used: number;
  totalUses: number;
} {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN expires_at > ? AND current_uses < max_uses THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN expires_at <= ? THEN 1 ELSE 0 END) as expired,
      SUM(CASE WHEN current_uses >= max_uses THEN 1 ELSE 0 END) as used,
      SUM(current_uses) as total_uses
    FROM invite_codes
  `).get(now, now) as any;
  
  return {
    total: stats.total || 0,
    active: stats.active || 0,
    expired: stats.expired || 0,
    used: stats.used || 0,
    totalUses: stats.total_uses || 0,
  };
}

export function isInviteRequired(): boolean {
  const db = getDb();
  
  const setting = db.prepare(`
    SELECT value FROM system_settings WHERE key = 'invite_required'
  `).get() as { value: string } | undefined;
  
  return setting?.value === 'true';
}

export function setInviteRequired(required: boolean, updatedBy: number): void {
  const db = getDb();
  
  db.prepare(`
    UPDATE system_settings 
    SET value = ?, updated_by = ?, updated_at = strftime('%s', 'now')
    WHERE key = 'invite_required'
  `).run(required ? 'true' : 'false', updatedBy);
  
  logAuditEvent({
    userId: updatedBy,
    action: "system.setting.updated" as any,
    resourceType: "system",
    details: {
      setting: 'invite_required',
      newValue: required,
    }
  }).catch(console.error);
  
  console.log(`⚙️ Invite requirement ${required ? 'enabled' : 'disabled'} by user ${updatedBy}`);
}

export function cleanupExpiredInvites(): number {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  
  // Get expired invite codes for cleanup
  const expiredInvites = db.prepare(`
    SELECT id FROM invite_codes WHERE expires_at <= ?
  `).all(now) as Array<{ id: number }>;
  
  if (expiredInvites.length === 0) return 0;
  
  // Delete usage records for expired invites
  for (const invite of expiredInvites) {
    db.prepare(`DELETE FROM invite_usage WHERE invite_code_id = ?`).run(invite.id);
  }
  
  // Delete expired invites
  const result = db.prepare(`
    DELETE FROM invite_codes WHERE expires_at <= ?
  `).run(now);
  
  if (result.changes > 0) {
    console.log(`🧹 Cleaned up ${result.changes} expired invite codes`);
  }
  
  return result.changes;
}