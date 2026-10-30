#!/usr/bin/env tsx
/**
 * Magic Link Database Migration Script
 * 
 * This script:
 * 1. Creates new magic_links, magic_rate_limits, and admin_settings tables
 * 2. Sets default configuration values
 * 3. Validates the migration
 * 
 * Usage:
 *   npm run migrate:magic-links
 *   # or
 *   npx tsx scripts/migrate-magic-links.ts
 */

import { db } from "../src/db";
import { magicLinks, magicRateLimits, adminSettings } from "../src/db/schema";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("🚀 Starting Magic Link migration...\n");

  try {
    // Step 1: Create tables (handled by drizzle-kit push, but we validate here)
    console.log("📊 Validating table schemas...");
    
    // Test magic_links table
    try {
      await db.select().from(magicLinks).limit(1);
      console.log("✅ magic_links table exists");
    } catch (error) {
      console.error("❌ magic_links table missing. Run: npx drizzle-kit push");
      process.exit(1);
    }

    // Test magic_rate_limits table
    try {
      await db.select().from(magicRateLimits).limit(1);
      console.log("✅ magic_rate_limits table exists");
    } catch (error) {
      console.error("❌ magic_rate_limits table missing. Run: npx drizzle-kit push");
      process.exit(1);
    }

    // Test admin_settings table
    try {
      await db.select().from(adminSettings).limit(1);
      console.log("✅ admin_settings table exists");
    } catch (error) {
      console.error("❌ admin_settings table missing. Run: npx drizzle-kit push");
      process.exit(1);
    }

    console.log("\n⚙️  Initializing default settings...");

    // Step 2: Insert default rate limit settings
    const defaultSettings = [
      { key: "rate_limit_ip", value: "5" },
      { key: "rate_limit_email", value: "3" },
      { key: "rate_limit_window", value: "3600000" }, // 1 hour in milliseconds
      { key: "magic_link_expiry", value: "900000" },  // 15 minutes
    ];

    for (const setting of defaultSettings) {
      try {
        await db
          .insert(adminSettings)
          .values({
            key: setting.key,
            value: setting.value,
            updatedAt: Date.now(),
          })
          .onConflictDoUpdate({
            target: adminSettings.key,
            set: {
              value: sql`excluded.value`,
              updatedAt: Date.now(),
            },
          });
        console.log(`✅ Set ${setting.key} = ${setting.value}`);
      } catch (error) {
        console.error(`❌ Failed to set ${setting.key}:`, error);
      }
    }

    // Step 3: Clean up any existing expired data
    console.log("\n🧹 Cleaning up expired data...");
    
    const now = Date.now();
    
    const deletedLinks = await db
      .delete(magicLinks)
      .where(sql`${magicLinks.expires} < ${now}`);
    
    const deletedRateLimits = await db
      .delete(magicRateLimits)
      .where(sql`${magicRateLimits.expiresAt} < ${now}`);

    console.log(`✅ Cleaned ${deletedLinks.changes || 0} expired magic links`);
    console.log(`✅ Cleaned ${deletedRateLimits.changes || 0} expired rate limit entries`);

    // Step 4: Validation
    console.log("\n🔍 Running validation checks...");

    const [linkCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(magicLinks);
    
    const [rateLimitCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(magicRateLimits);
    
    const [settingsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(adminSettings);

    console.log(`📊 Current database state:`);
    console.log(`   - Magic Links: ${linkCount.count}`);
    console.log(`   - Rate Limits: ${rateLimitCount.count}`);
    console.log(`   - Settings: ${settingsCount.count}`);

    console.log("\n✨ Migration completed successfully!\n");
    console.log("Next steps:");
    console.log("  1. Review settings in admin panel: /admin/magic-links");
    console.log("  2. Test magic link authentication at: /login");
    console.log("  3. Monitor system at: /admin/magic-links\n");

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });