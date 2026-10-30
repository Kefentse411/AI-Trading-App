import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import AnalysePageClient from "./AnalysePageClient";

export default async function AnalysePage() {
  const session = await auth();

  let canWrite = false;

  if (session?.user?.email) {
    try {
      const appDb = getDb();
      const appUser = appDb
        .prepare("SELECT id FROM users WHERE email = ?")
        .get(session.user.email) as { id: number } | undefined;

      if (appUser) {
        canWrite = hasPermission(appUser.id, "trading.write");
      }
    } catch (error) {
      console.error("[AnalysePage] Failed to resolve trading.write permission:", error);
    }
  }

  return <AnalysePageClient canRunAnalysis={canWrite} />;
}