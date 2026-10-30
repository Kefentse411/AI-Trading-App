import { getDb } from "./db";
import { headers } from "next/headers";

export type AuditAction =
  | "user.role.updated"
  | "user.deleted"
  | "user.created"
  | "user.promoted"
  | "admin.login"
  | "passcode.sent"
  | "passcode.verified"
  | "session.created"
  | "permission.denied"
  | "rate_limit.exceeded"
  | "user.blocked"
  | "user.unblocked"
  | "invite.created"
  | "invite.used"
  | "invite.deleted"
  | "system.setting.updated"
  | "magic_link.sent"
  | "magic_link.used";

export type ResourceType =
  | "user"
  | "role"
  | "session"
  | "passcode"
  | "system";

export interface AuditLogEntry {
  userId: number;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    // Guard: skip audit logging if userId is invalid
    // This can happen when session.user.id is a UUID string and Number() returns NaN
    if (!Number.isFinite(entry.userId) || entry.userId <= 0) {
      console.warn(`⚠️  Skipping audit: invalid userId (${entry.userId}) for action ${entry.action}`);
      return;
    }

    const db = getDb();

    // Verify user exists in database.db before inserting
    const userExists = db
      .prepare("SELECT id FROM users WHERE id = ?")
      .get(entry.userId);

    if (!userExists) {
      console.warn(`⚠️  Skipping audit: userId ${entry.userId} not found in users table for action ${entry.action}`);
      return;
    }

    const headersList = await headers();
    const ipAddress = entry.ipAddress ||
      headersList.get('x-forwarded-for') ||
      headersList.get('x-real-ip') ||
      'unknown';

    const userAgent = entry.userAgent ||
      headersList.get('user-agent') ||
      'unknown';

    const stmt = db.prepare(`
      INSERT INTO audit_log (
        user_id, action, resource_type, resource_id,
        details, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      entry.userId,
      entry.action,
      entry.resourceType,
      entry.resourceId || null,
      entry.details ? JSON.stringify(entry.details) : null,
      ipAddress,
      userAgent.substring(0, 500)
    );

    console.log(`📊 Audit: ${entry.action} by user ${entry.userId} on ${entry.resourceType}${entry.resourceId ? `:${entry.resourceId}` : ''}`);
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Never throw - audit logging failure must not break app flow
  }
}

export function getAuditLogs(options: {
  userId?: number;
  action?: AuditAction;
  resourceType?: ResourceType;
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
} = {}): any[] {
  const db = getDb();

  let query = `
    SELECT
      al.id,
      al.action,
      al.resource_type,
      al.resource_id,
      al.details,
      al.ip_address,
      al.user_agent,
      al.created_at,
      u.email as user_email,
      u.name as user_name
    FROM audit_log al
    JOIN users u ON al.user_id = u.id
    WHERE 1=1
  `;

  const params: any[] = [];

  if (options.userId) {
    query += ` AND al.user_id = ?`;
    params.push(options.userId);
  }

  if (options.action) {
    query += ` AND al.action = ?`;
    params.push(options.action);
  }

  if (options.resourceType) {
    query += ` AND al.resource_type = ?`;
    params.push(options.resourceType);
  }

  if (options.startDate) {
    query += ` AND al.created_at >= ?`;
    params.push(Math.floor(options.startDate.getTime() / 1000));
  }

  if (options.endDate) {
    query += ` AND al.created_at <= ?`;
    params.push(Math.floor(options.endDate.getTime() / 1000));
  }

  query += ` ORDER BY al.created_at DESC`;

  if (options.limit) {
    query += ` LIMIT ?`;
    params.push(options.limit);

    if (options.offset) {
      query += ` OFFSET ?`;
      params.push(options.offset);
    }
  }

  const stmt = db.prepare(query);
  const results = stmt.all(...params);

  return results.map((row: any) => ({
    ...row,
    details: row.details ? JSON.parse(row.details) : null,
  }));
}

export function getAuditStats(): {
  totalEvents: number;
  eventsByAction: Record<string, number>;
  eventsByUser: Array<{ userId: number; userEmail: string; count: number }>;
  recentActivity: any[];
} {
  const db = getDb();

  const totalEvents = db
    .prepare(`SELECT COUNT(*) as count FROM audit_log`)
    .get() as { count: number };

  const actionStats = db.prepare(`
    SELECT action, COUNT(*) as count
    FROM audit_log
    GROUP BY action
    ORDER BY count DESC
  `).all() as Array<{ action: string; count: number }>;

  const eventsByAction = Object.fromEntries(
    actionStats.map(stat => [stat.action, stat.count])
  );

  const userStats = db.prepare(`
    SELECT
      al.user_id,
      u.email as user_email,
      COUNT(*) as count
    FROM audit_log al
    JOIN users u ON al.user_id = u.id
    GROUP BY al.user_id, u.email
    ORDER BY count DESC
    LIMIT 10
  `).all() as Array<{ userId: number; userEmail: string; count: number }>;

  const recentActivity = getAuditLogs({ limit: 50 });

  return {
    totalEvents: totalEvents.count,
    eventsByAction,
    eventsByUser: userStats,
    recentActivity,
  };
}
