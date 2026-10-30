import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { canAccessDashboard } from "@/lib/permissions";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { getDb } from "@/lib/db";

const globalStyles = `
  /* Theme variables */
  [data-theme="dark"] {
    --bg-primary: #0a0a0f;
    --bg-secondary: #111113;
    --bg-tertiary: #1a1a1f;
    --bg-glass: rgba(17, 17, 19, 0.65);
    --border-color: rgba(147, 197, 253, 0.1);
    --border-hover: rgba(147, 197, 253, 0.3);
    --text-primary: #e5e7eb;
    --text-secondary: #9ca3af;
    --text-muted: #6b7280;
    --accent-blue: #60a5fa;
    --accent-emerald: #10b981;
    --accent-purple: #a78bfa;
  }

  [data-theme="light"] {
    --bg-primary: #f9fafb;
    --bg-secondary: #f3f4f6;
    --bg-tertiary: #e5e7eb;
    --bg-glass: rgba(255, 255, 255, 0.8);
    --border-color: rgba(59, 130, 246, 0.1);
    --border-hover: rgba(59, 130, 246, 0.3);
    --text-primary: #111827;
    --text-secondary: #4b5563;
    --text-muted: #9ca3af;
    --accent-blue: #3b82f6;
    --accent-emerald: #059669;
    --accent-purple: #7c3aed;
  }

  /* Enhanced Keyframe Animations */
  @keyframes dotPulse {
    0%, 100% { transform: scale(0.5); opacity: 0.2; }
    50% { transform: scale(1.8); opacity: 1; }
  }

  @keyframes orbFloat {
    0%, 100% { transform: translateY(0px) scale(1); opacity: 0.8; }
    50% { transform: translateY(-25px) scale(1.15); opacity: 1; }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pageTransition {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes bubblePulse {
    0%, 100% {
      transform: scale(1);
      opacity: 0.8;
    }
    50% {
      transform: scale(1.05);
      opacity: 1;
    }
  }

  /* NEW: Gradient Animations */
  @keyframes gradientShift {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }

  @keyframes floatX {
    0%, 100% { transform: translateX(0px); }
    50% { transform: translateX(30px); }
  }

  @keyframes floatY {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(30px); }
  }

  @keyframes glow {
    0%, 100% { filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.5)); }
    50% { filter: drop-shadow(0 0 40px rgba(59, 130, 246, 0.8)); }
  }

  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }

  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
    }
    50% {
      box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
    }
  }

  @keyframes ripple {
    0% {
      transform: scale(0);
      opacity: 1;
    }
    100% {
      transform: scale(4);
      opacity: 0;
    }
  }

  /* Animation Classes */
  .dot-pulse {
    animation-name: dotPulse;
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
  }

  .orb-float {
    animation: orbFloat 5s ease-in-out infinite;
  }

  .slide-in {
    animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .page-transition {
    animation: pageTransition 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .gradient-shift {
    background-size: 200% 200%;
    animation: gradientShift 8s ease infinite;
  }

  .float-x {
    animation: floatX 6s ease-in-out infinite;
  }

  .float-y {
    animation: floatY 5s ease-in-out infinite;
  }

  .glow-pulse {
    animation: glow 4s ease-in-out infinite;
  }

  .shimmer {
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    background-size: 1000px 100%;
    animation: shimmer 3s infinite;
  }

  .spin-slow {
    animation: spin-slow 20s linear infinite;
  }

  .pulse-glow {
    animation: pulse-glow 2s infinite;
  }

  .ripple {
    animation: ripple 0.6s;
  }

  /* Scrollbar Styling */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 99px;
    transition: background 0.2s;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: var(--border-hover);
  }

  /* Smooth transitions for all elements */
  * {
    transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
  }

  /* Disable transitions on specific interactions */
  .no-transition,
  .no-transition * {
    transition: none !important;
  }

  /* Text Selection */
  ::selection {
    background: rgba(59, 130, 246, 0.3);
    color: var(--text-primary);
  }

  /* Improved focus states */
  *:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 2px;
  }

  /* Backdrop blur support */
  @supports (backdrop-filter: blur(1px)) {
    .backdrop-blur-xl {
      backdrop-filter: blur(16px);
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }

    .dot-pulse,
    .orb-float,
    .slide-in,
    .page-transition,
    .gradient-shift,
    .float-x,
    .float-y,
    .glow-pulse,
    .shimmer,
    .spin-slow,
    .pulse-glow {
      animation: none !important;
    }
  }
`;

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const isPasscodeVerified = cookieStore.get("passcode_verified")?.value === "1";

  if (!isPasscodeVerified) {
    redirect("/verify-passcode");
  }

  let appUserId: number = 0;

  try {
    const appDb = getDb();
    const appUser = appDb
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(session.user.email) as { id: number } | undefined;
    appUserId = appUser?.id ?? 0;
  } catch (error) {
    console.error("[DashboardLayout] Failed to resolve appUserId:", error);
  }

  if (!canAccessDashboard(appUserId)) {
    redirect("/access-denied");
  }

  // Generate random grid dots with deterministic positioning
  const gridDots = Array.from({ length: 60 }, (_, i) => {
    const seed = (i + 1) * 9301 + 49297;
    const r1 = (seed % 233280) / 233280;
    const r2 = ((seed * 3) % 233280) / 233280;
    const r3 = ((seed * 7) % 233280) / 233280;
    const r4 = ((seed * 11) % 233280) / 233280;
    return {
      left: `${r1 * 100}%`,
      top: `${r2 * 100}%`,
      size: 3 + Math.floor(r3 * 4),
      delay: `${r4 * 2.5}s`,
      duration: `${1.2 + r3 * 1.4}s`,
    };
  });

  return (
    <div
      className="flex h-screen overflow-hidden relative transition-colors duration-300"
      style={{
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />

      {/* Background Decorations - ENHANCED */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Subtle animated grid background */}
        <div className="absolute inset-0 opacity-[0.05]">
          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              backgroundImage: `
                linear-gradient(rgba(42,130,228,0.5) 1px, transparent 1px),
                linear-gradient(90deg, rgba(42,130,228,0.5) 1px, transparent 1px)`,
              backgroundSize: "50px 50px",
            }}
          />
        </div>

        {/* Large Floating neon orbs - INTENSIFIED */}
        <div
          className="absolute -top-40 right-10 w-[40rem] h-[40rem] rounded-full blur-3xl orb-float"
          style={{
            background: "radial-gradient(circle, rgba(59,130,246,0.5) 0%, transparent 65%)",
          }}
        />

        <div
          className="absolute -bottom-40 left-10 w-[40rem] h-[40rem] rounded-full blur-3xl orb-float"
          style={{
            background: "radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 65%)",
            animationDelay: "1.5s",
          }}
        />

        {/* Additional accent orbs */}
        <div
          className="absolute top-1/2 right-1/4 w-[28rem] h-[28rem] rounded-full blur-3xl orb-float"
          style={{
            background: "radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)",
            animationDelay: "2.5s",
          }}
        />

        {/* Pulsing dots - INTENSIFIED */}
        {gridDots.map((dot, i) => (
          <div
            key={`dash-dot-${i}`}
            className="absolute rounded-full dot-pulse transition-colors duration-300"
            style={{
              left: dot.left,
              top: dot.top,
              width: `${dot.size}px`,
              height: `${dot.size}px`,
              animationDelay: dot.delay,
              animationDuration: dot.duration,
              background: "rgba(96,165,250,0.9)",
              boxShadow: "0 0 12px rgba(96,165,250,0.7), 0 0 24px rgba(96,165,250,0.4)",
            }}
          />
        ))}

        {/* Ambient light rays */}
        <div
          className="absolute top-0 left-1/4 w-1 h-96 blur-3xl opacity-20"
          style={{
            background: "linear-gradient(180deg, rgba(59,130,246,0.5) 0%, transparent 100%)",
          }}
        />

        <div
          className="absolute bottom-0 right-1/4 w-1 h-96 blur-3xl opacity-20"
          style={{
            background: "linear-gradient(0deg, rgba(168,85,247,0.5) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* Foreground Workspace */}
      <div className="relative z-10 flex h-full w-full overflow-hidden">
        {/* Sidebar */}
        <Sidebar session={session} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <TopBar session={session} />

          {/* Main Content */}
          <main
            className="flex-1 overflow-auto p-6 relative page-transition"
            style={{
              background: "var(--bg-secondary)",
              borderLeft: "1px solid var(--border-color)",
            }}
          >
            <div className="page-transition">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Subtle corner accent lights - NEW */}
      <div
        className="fixed top-0 right-0 w-96 h-96 blur-3xl pointer-events-none opacity-10"
        style={{
          background: "radial-gradient(circle, rgba(59,130,246,0.5), transparent 70%)",
        }}
      />

      <div
        className="fixed bottom-0 left-0 w-96 h-96 blur-3xl pointer-events-none opacity-10"
        style={{
          background: "radial-gradient(circle, rgba(168,85,247,0.5), transparent 70%)",
        }}
      />
    </div>
  );
}