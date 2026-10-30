import { NextRequest } from "next/server";
import { checkRateLimit, RateLimitAction } from "./rate-limiting";
import { auth } from "@/auth";

export function getRealIP(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfIp = req.headers.get("cf-connecting-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIp) return realIp;
  if (cfIp) return cfIp;

  return "127.0.0.1";
}

// NEW: Helper to check if user is admin
async function isAdminUser(email?: string | null): Promise<boolean> {
  if (!email) return false;

  try {
    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
    return adminEmails.includes(email.toLowerCase());
  } catch (error) {
    console.error("[Rate Limit Middleware] Error checking admin status:", error);
    return false;
  }
}

export async function checkIPRateLimit(
  req: NextRequest,
  action: RateLimitAction,
  email?: string | null
): Promise<{ allowed: boolean; error?: string; headers: Record<string, string>; ip: string; isAdmin?: boolean }> {
  const ip = getRealIP(req);
  
  // NEW: Check if user is admin - admins bypass ALL rate limiting
  const isAdmin = await isAdminUser(email);
  
  if (isAdmin) {
    console.log(`[Rate Limit] Admin user ${email} bypassing IP rate limit`);
    return { 
      allowed: true, 
      headers: {}, 
      ip,
      isAdmin: true 
    };
  }

  const result = checkRateLimit(ip, action);

  const headers: Record<string, string> = {};

  if (result.remainingAttempts !== undefined) {
    headers["X-RateLimit-Remaining"] = result.remainingAttempts.toString();
  }

  if (result.blockedUntil) {
    headers["X-RateLimit-Reset"] = result.blockedUntil.toString();
    headers["Retry-After"] = Math.max(
      0,
      result.blockedUntil - Math.floor(Date.now() / 1000)
    ).toString();
  }

  if (!result.allowed) {
    const resetTime = result.blockedUntil
      ? new Date(result.blockedUntil * 1000).toLocaleTimeString()
      : "later";

    return {
      allowed: false,
      error: `Too many requests. Try again after ${resetTime}.`,
      headers,
      ip,
    };
  }

  return { allowed: true, headers, ip };
}

export async function checkUserRateLimit(
  email: string,
  action: RateLimitAction
): Promise<{ allowed: boolean; error?: string; remainingAttempts?: number; isAdmin?: boolean }> {
  // NEW: Check if user is admin - admins bypass rate limiting
  const isAdmin = await isAdminUser(email);
  
  if (isAdmin) {
    console.log(`[Rate Limit] Admin user ${email} bypassing user rate limit`);
    return { allowed: true, remainingAttempts: 999, isAdmin: true };
  }

  const result = checkRateLimit(email, action);

  if (!result.allowed) {
    const resetTime = result.blockedUntil
      ? new Date(result.blockedUntil * 1000).toLocaleTimeString()
      : "later";

    return {
      allowed: false,
      error: `${result.reason}. Try again after ${resetTime}.`,
    };
  }

  return { allowed: true, remainingAttempts: result.remainingAttempts };
}