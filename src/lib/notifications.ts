import { db } from "@/db";
import { signalHistory, userNotificationPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";

interface SignalNotification {
  userId: number;
  symbol: string;
  direction: "bullish" | "bearish" | "neutral";
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  expectedReturn: number;
}

// Email notification (using your preferred provider - examples: SendGrid, Resend, etc.)
async function sendEmailNotification(
  email: string,
  symbol: string,
  direction: string,
  confidence: number,
  entryPrice: number,
  targetPrice: number,
  expectedReturn: number
): Promise<boolean> {
  try {
    // Example using Resend (you can use SendGrid, Nodemailer, etc.)
    // For now, we'll just log it
    console.log(`[EMAIL] Sending ${direction} signal notification for ${symbol} to ${email}`);
    
    // Replace this with your actual email service
    // const response = await fetch("https://api.resend.com/emails", {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     from: "signals@algoedge.com",
    //     to: email,
    //     subject: `🚀 ${direction.toUpperCase()} Signal: ${symbol}`,
    //     html: `
    //       <h2>${direction === 'bullish' ? '📈' : '📉'} ${symbol} Signal</h2>
    //       <p><strong>Direction:</strong> ${direction}</p>
    //       <p><strong>Confidence:</strong> ${(confidence * 100).toFixed(1)}%</p>
    //       <p><strong>Entry:</strong> $${entryPrice.toFixed(5)}</p>
    //       <p><strong>Target:</strong> $${targetPrice.toFixed(5)}</p>
    //       <p><strong>Expected Return:</strong> ${(expectedReturn * 100).toFixed(2)}%</p>
    //       <a href="https://algoedge.com/dashboard/forex">View Trade →</a>
    //     `,
    //   }),
    // });
    
    return true;
  } catch (error) {
    console.error("Failed to send email notification:", error);
    return false;
  }
}

// SMS notification via Twilio.
// Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER set in
// your environment (.env.local for local dev).
async function sendSmsNotification(
  phoneNumber: string,
  symbol: string,
  direction: string,
  confidence: number,
  expectedReturn: number
): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.error(
      "[SMS] Twilio credentials missing — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, " +
      "and TWILIO_PHONE_NUMBER in your environment."
    );
    return false;
  }

  // Basic E.164 format check (+ followed by 8-15 digits). Twilio rejects
  // malformed numbers anyway, but failing fast here gives a clearer log
  // message than parsing Twilio's raw error response for a format issue.
  if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
    console.error(
      `[SMS] Invalid phone number format: "${phoneNumber}". Expected E.164, e.g. +15551234567`
    );
    return false;
  }

  try {
    const messageBody =
      `🚀 AlgoEdge Alert: ${direction.toUpperCase()} signal on ${symbol} ` +
      `(${(confidence * 100).toFixed(0)}% confidence, ${(expectedReturn * 100).toFixed(1)}% target)`;

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: phoneNumber,
          Body: messageBody,
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[SMS] Twilio API error (${response.status}): ${errorBody}`);
      return false;
    }

    const result = await response.json();
    console.log(`[SMS] Sent successfully to ${phoneNumber}, SID: ${result.sid}`);
    return true;
  } catch (error) {
    console.error("Failed to send SMS notification:", error);
    return false;
  }
}

// In-app notification
async function createInAppNotification(
  userId: number,
  symbol: string,
  direction: string,
  confidence: number
): Promise<boolean> {
  try {
    // This would store in a real-time database or WebSocket for live notifications
    console.log(`[IN-APP] ${direction.toUpperCase()} signal for ${userId} on ${symbol}`);
    return true;
  } catch (error) {
    console.error("Failed to create in-app notification:", error);
    return false;
  }
}

// Main function to handle signal notifications
export async function notifySignal(signal: SignalNotification) {
  try {
    // Get user preferences
    const prefs = await db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, signal.userId))
      .then((result) => result[0]);

    if (!prefs) {
      console.log(`No notification preferences found for user ${signal.userId}`);
      return;
    }

    // Check confidence threshold
    if (signal.confidence < prefs.minConfidenceThreshold) {
      console.log(`Signal confidence ${signal.confidence} below threshold ${prefs.minConfidenceThreshold}`);
      return;
    }

    // Check direction preferences
    if (signal.direction === "bullish" && !prefs.bullishSignals) {
      return;
    }
    if (signal.direction === "bearish" && !prefs.bearishSignals) {
      return;
    }

    // Record signal in history, capturing the inserted row's id.
    // FIXED: previously the emailSent/smsSent/notificationSent updates below
    // filtered only by userId, which meant EVERY historical signalHistory row
    // for that user got marked as sent — not just this one. Using the
    // returned row id scopes each update to exactly the signal just created.
    // NOTE: assumes the primary key column is named `id` — adjust if your
    // schema names it differently (e.g. signalId).
    const [insertedSignal] = await db
      .insert(signalHistory)
      .values({
        userId: signal.userId,
        symbol: signal.symbol,
        direction: signal.direction,
        confidence: signal.confidence,
        entryPrice: signal.entryPrice,
        targetPrice: signal.targetPrice,
        stopLoss: signal.stopLoss,
      })
      .returning();

    const signalId = insertedSignal.id;

    // Send notifications based on preferences
    const notifications = [];

    if (prefs.emailNotifications && prefs.emailAddress) {
      notifications.push(
        sendEmailNotification(
          prefs.emailAddress,
          signal.symbol,
          signal.direction,
          signal.confidence,
          signal.entryPrice,
          signal.targetPrice,
          signal.expectedReturn
        )
          .then((success) => {
            if (success) {
              return db
                .update(signalHistory)
                .set({ emailSent: true })
                .where(eq(signalHistory.id, signalId));
            }
          })
      );
    }

    if (prefs.smsNotifications && prefs.phoneNumber) {
      notifications.push(
        sendSmsNotification(
          prefs.phoneNumber,
          signal.symbol,
          signal.direction,
          signal.confidence,
          signal.expectedReturn
        )
          .then((success) => {
            if (success) {
              return db
                .update(signalHistory)
                .set({ smsSent: true })
                .where(eq(signalHistory.id, signalId));
            }
          })
      );
    }

    // Always create in-app notification
    notifications.push(
      createInAppNotification(
        signal.userId,
        signal.symbol,
        signal.direction,
        signal.confidence
      )
        .then((success) => {
          if (success) {
            return db
              .update(signalHistory)
              .set({ notificationSent: true })
              .where(eq(signalHistory.id, signalId));
          }
        })
    );

    await Promise.all(notifications);
    console.log(`Notification sent for ${signal.symbol} ${signal.direction} signal to user ${signal.userId}`);
  } catch (error) {
    console.error("Error sending signal notification:", error);
  }
}

// Get user notification preferences
export async function getUserNotificationPreferences(userId: number) {
  try {
    const prefs = await db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId))
      .then((result) => result[0]);

    return prefs || null;
  } catch (error) {
    console.error("Error fetching user notification preferences:", error);
    return null;
  }
}

// Update notification preferences
export async function updateNotificationPreferences(
  userId: number,
  preferences: Partial<typeof userNotificationPreferences.$inferInsert>
) {
  try {
    await db
      .update(userNotificationPreferences)
      .set(preferences)
      .where(eq(userNotificationPreferences.userId, userId));

    return true;
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return false;
  }
}