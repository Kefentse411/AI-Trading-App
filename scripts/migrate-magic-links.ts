import { db } from "../src/db/index.js";
import { magicLinks, magicRateLimits, adminSettings } from "../src/db/schema.js";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("🚀 Starting Magic Link migration...\n");

  try {
    // Step 1: Validate tables exist
    console.log("📊 Validating table schemas...");

    try {
      await db.select().from(magicLinks).limit(1);
      console.log("✅ magic_links table exists");
    } catch {
      console.error("❌ magic_links table missing. Run: npx drizzle-kit push");
      process.exit(1);
    }

    try {
      await db.select().from(magicRateLimits).limit(1);
      console.log("✅ magic_rate_limits table exists");
    } catch {
      console.error("❌ magic_rate_limits table missing. Run: npx drizzle-kit push");
      process.exit(1);
    }

    try {
      await db.select().from(adminSettings).limit(1);
      console.log("✅ admin_settings table exists");
    } catch {
      console.error("❌ admin_settings table missing. Run: npx drizzle-kit push");
      process.exit(1);
    }

    // Step 2: Insert default settings
    console.log("\n⚙️  Initializing default settings...");

    const defaultSettings = [
      { key: "rate_limit_ip", value: "5" },
      { key: "rate_limit_email", value: "3" },
      { key: "rate_limit_window", value: "3600000" },
      { key: "magic_link_expiry", value: "900000" },
    ];

    for (const setting of defaultSettings) {
      try {
        // Check if setting already exists
        const [existing] = await db
          .select()
          .from(adminSettings)
          .where(sql`${adminSettings.key} = ${setting.key}`)
          .limit(1);

        if (existing) {
          // Update existing setting
          await db
            .update(adminSettings)
            .set({
              value: setting.value,
              updatedAt: new Date(),
            })
            .where(sql`${adminSettings.key} = ${setting.key}`);
          console.log(`🔄 Updated ${setting.key} = ${setting.value}`);
        } else {
          // Insert new setting - use new Date() for timestamp_ms columns
          await db.insert(adminSettings).values({
            key: setting.key,
            value: setting.value,
            updatedAt: new Date(),
          });
          console.log(`✅ Set ${setting.key} = ${setting.value}`);
        }
      } catch (error: any) {
        console.error(`❌ Failed to set ${setting.key}: ${error.message}`);
      }
    }

    // Step 3: Clean up expired data
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

    // Step 4: Validate final state
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

    console.log(`\n📊 Current database state:`);
    console.log(`   - Magic Links: ${linkCount.count}`);
    console.log(`   - Rate Limits: ${rateLimitCount.count}`);
    console.log(`   - Settings: ${settingsCount.count}`);

    // Verify all settings were created
    if (settingsCount.count >= defaultSettings.length) {
      console.log(`\n✅ All ${defaultSettings.length} settings verified`);
    } else {
      console.log(`\n⚠️  Expected ${defaultSettings.length} settings, found ${settingsCount.count}`);
    }

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

migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
