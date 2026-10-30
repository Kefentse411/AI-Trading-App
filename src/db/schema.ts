import { sqliteTable, text, integer, real, primaryKey, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─── Existing tables (unchanged) ────────────────────────────────────────────

export const users = sqliteTable("user", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
});

export const accounts = sqliteTable("account", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = sqliteTable("session", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  sessionToken: text("sessionToken").notNull().unique(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.identifier, table.token] }),
]);

// ─── New Magic Link tables ───────────────────────────────────────────────────
// NOTE: Named with magic_ prefix to avoid any future collision with
// your existing in-memory rate limiting system

export const magicLinks = sqliteTable("magic_links", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  used: integer("used", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`),
  usedAt: integer("used_at", { mode: "timestamp_ms" }),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

// magic_rate_limits: database-backed rate limiting ONLY for magic link flows.
// Completely separate from your existing in-memory rate-limiting system
// which handles passcode/verify flows via @/lib/rate-limiting
export const magicRateLimits = sqliteTable("magic_rate_limits", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  identifier: text("identifier").notNull(), // IP address or email
  type: text("type").notNull(),             // 'ip' or 'email'
  count: integer("count").default(1),
  windowStart: integer("window_start", { mode: "timestamp_ms" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

// admin_settings: key-value store for magic link configuration
// (IP limits, email limits, sliding window duration)
export const adminSettings = sqliteTable("admin_settings", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`),
});

// ─── New Notifications tables ───────────────────────────────────────────────────
export const notifications = sqliteTable(
  "notifications",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull(),
    type: text({ enum: ["email", "sms", "in_app"] }).notNull(),
    channel: text({ enum: ["bullish_signal", "bearish_signal", "risk_alert"] }).notNull(),
    enabled: integer({ mode: "boolean" }).default(true),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_notifications_user").on(table.userId),
  ]
);

export const signalHistory = sqliteTable(
  "signal_history",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull(),
    symbol: text().notNull(),
    direction: text({ enum: ["bullish", "bearish", "neutral"] }).notNull(),
    confidence: real().notNull(),
    entryPrice: real("entry_price").notNull(),
    targetPrice: real("target_price").notNull(),
    stopLoss: real("stop_loss").notNull(),
    notificationSent: integer("notification_sent", { mode: "boolean" }).default(false),
    emailSent: integer("email_sent", { mode: "boolean" }).default(false),
    smsSent: integer("sms_sent", { mode: "boolean" }).default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_signal_history_user").on(table.userId),
    index("idx_signal_history_symbol").on(table.symbol),
  ]
);

export const userNotificationPreferences = sqliteTable(
  "user_notification_preferences",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: integer("user_id").unique().notNull(),
    emailAddress: text("email_address").notNull(),
    phoneNumber: text("phone_number"),
    emailNotifications: integer("email_notifications", { mode: "boolean" }).default(true),
    smsNotifications: integer("sms_notifications", { mode: "boolean" }).default(false),
    bullishSignals: integer("bullish_signals", { mode: "boolean" }).default(true),
    bearishSignals: integer("bearish_signals", { mode: "boolean" }).default(true),
    riskAlerts: integer("risk_alerts", { mode: "boolean" }).default(true),
    minConfidenceThreshold: real("min_confidence_threshold").default(0.50),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  }
);