import { db } from "@/db";
import { userNotificationPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function initializeNotificationPreferencesForUser(userId: number, email: string) {
  try {
    // Check if preferences already exist
    const existing = await db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId))
      .then((result) => result[0]);

    if (existing) {
      console.log(`Notification preferences already exist for user ${userId}`);
      return existing;
    }

    // Create default preferences for new user
    const result = await db
      .insert(userNotificationPreferences)
      .values({
        userId,
        emailAddress: email,
        phoneNumber: null,
        emailNotifications: true,
        smsNotifications: false,
        bullishSignals: true,
        bearishSignals: true,
        riskAlerts: true,
        minConfidenceThreshold: 0.5,
      })
      .returning();

    console.log(`Created notification preferences for user ${userId}`);
    return result[0];
  } catch (error) {
    console.error(`Failed to initialize notification preferences for user ${userId}:`, error);
    throw error;
  }
}