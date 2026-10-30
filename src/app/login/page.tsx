"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const errorMessages: Record<string, string> = {
  Configuration: "Server configuration error. Please try again.",
  AccessDenied: "Access denied.",
  OAuthCallback: "Google sign-in failed. Please try again.",
  OAuthSignin: "Could not start Google sign-in.",
  Default: "Sign in failed. Please try again.",
};

const QUOTES = [
  { text: "The stock market transfers money from the impatient to the patient.", author: "Warren Buffett" },
  { text: "Risk comes from not knowing what you're doing.", author: "Warren Buffett" },
  { text: "In the short run the market is a voting machine; in the long run a weighing machine.", author: "Benjamin Graham" },
  { text: "Amateurs think about gains. Professionals think about losses.", author: "Jack Schwager" },
  { text: "It's not whether you're right or wrong, but how much you make when right.", author: "George Soros" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "We are what we repeatedly do. Excellence is a habit.", author: "Aristotle" },
  { text: "There is a time to go long, short, and fishing.", author: "Jesse Livermore" },
  { text: "The four most dangerous words in investing: this time is different.", author: "Sir John Templeton" },
  { text: "The wise man does at once what the fool does finally.", author: "Niccolò Machiavelli" },
  { text: "He who is not a good servant will not be a good master.", author: "Plato" },
  { text: "The goal of a successful trader is to make the best trades. Money is secondary.", author: "Alexander Elder" },
];

type BubbleSlot = {
  id: number;
  side: "left" | "right";
  top: string;
  offset: string;
  quoteIndex: number;
  visible: boolean;
};

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === "system" ? getSystemTheme() : mode;
}

export default function LoginPage() {
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // theme
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");
  const isDark = resolvedTheme === "dark";

  // intro phases: 0 skeleton, 1 brand, 2 card
  const [phase, setPhase] = useState<0 | 1 | 2>(0);

  // bubbles
  const [bubbles, setBubbles] = useState<BubbleSlot[]>([
    { id: 0, side: "left", top: "10%", offset: "3%", quoteIndex: 0, visible: false },
    { id: 1, side: "left", top: "38%", offset: "5%", quoteIndex: 1, visible: false },
    { id: 2, side: "left", top: "66%", offset: "4%", quoteIndex: 2, visible: false },
    { id: 3, side: "right", top: "14%", offset: "3%", quoteIndex: 3, visible: false },
    { id: 4, side: "right", top: "42%", offset: "5%", quoteIndex: 4, visible: false },
    { id: 5, side: "right", top: "70%", offset: "4%", quoteIndex: 5, visible: false },
  ]);

  // Load theme preference
  useEffect(() => {
    const saved = (localStorage.getItem("algoedge-theme") as ThemeMode | null) || "system";
    setThemeMode(saved);
    setResolvedTheme(resolveTheme(saved));
  }, []);

  // Keep system theme in sync
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (themeMode === "system") setResolvedTheme(getSystemTheme());
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem("algoedge-theme", themeMode);
    setResolvedTheme(resolveTheme(themeMode));
  }, [themeMode]);

  // Intro timeline
  useEffect(() => {
    const err = searchParams.get("error");
    if (err) setError(errorMessages[err] || errorMessages.Default);

    const t1 = setTimeout(() => setPhase(1), 850);
    const t2 = setTimeout(() => setPhase(2), 2100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [searchParams]);

  // Bubble fade cycles (independent intervals, visible >= 5s)
  useEffect(() => {
    if (phase < 2) return;

    const timers: number[] = [];
    let quoteCursor = 6;

    bubbles.forEach((bubble, index) => {
      // Stagger first appearance
      const initialDelay = 400 + index * 700;

      const runCycle = (first = false) => {
        // SHOW
        const showTimer = window.setTimeout(() => {
          setBubbles((prev) =>
            prev.map((b) =>
              b.id === bubble.id
                ? {
                    ...b,
                    visible: true,
                    quoteIndex: first ? b.quoteIndex : quoteCursor++ % QUOTES.length,
                  }
                : b
            )
          );

          // Stay visible at least 5s (5.5s - 9s)
          const visibleFor = 5500 + (index % 4) * 900;

          // HIDE
          const hideTimer = window.setTimeout(() => {
            setBubbles((prev) =>
              prev.map((b) => (b.id === bubble.id ? { ...b, visible: false } : b))
            );

            // Hidden gap before next show (different intervals)
            const hiddenFor = 1800 + (index % 5) * 700;
            const nextTimer = window.setTimeout(() => runCycle(false), hiddenFor);
            timers.push(nextTimer);
          }, visibleFor);

          timers.push(hideTimer);
        }, first ? initialDelay : 0);

        timers.push(showTimer);
      };

      runCycle(true);
    });

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const gridDots = useMemo(() => {
    return Array.from({ length: 70 }, (_, i) => {
      const seed = (i + 1) * 9301 + 49297;
      const r1 = (seed % 233280) / 233280;
      const r2 = ((seed * 3) % 233280) / 233280;
      const r3 = ((seed * 7) % 233280) / 233280;
      const r4 = ((seed * 11) % 233280) / 233280;
      return {
        left: `${r1 * 100}%`,
        top: `${r2 * 100}%`,
        size: 2 + Math.floor(r3 * 3),
        delay: `${r4 * 2.5}s`,
        duration: `${1.4 + r3 * 1.8}s`,
      };
    });
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError("");
    setInfo("");
    try {
      await signIn("google", { callbackUrl: "/verify-passcode" });
    } catch {
      setError("Could not start Google sign-in.");
      setIsLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }

    setIsMagicLinkLoading(true);
    setError("");
    setInfo("");

    try {
      const result = await signIn("email", {
        email,
        redirect: false,
        callbackUrl: "/verify-passcode",
      });

      if (result?.error) {
        setError("Failed to send magic link. Please try again.");
      } else {
        setMagicLinkSent(true);
        setInfo(`Magic link sent to ${email}. Check your inbox and click the link to sign in.`);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsMagicLinkLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("Email/password auth is not enabled yet. Use Google or Magic Link.");
  };

  const showSkeleton = phase === 0;
  const showContent = phase >= 1;
  const expanded = phase >= 2;

  // Theme tokens (light is lighter, not pure white)
  const t = isDark
    ? {
        pageBg: "#0a0e17",
        pageFg: "#e5e7eb",
        muted: "#9ca3af",
        soft: "#6b7280",
        cardBg: "rgba(17,24,39,0.82)",
        cardBorder: "rgba(55,65,81,0.55)",
        inputBg: "#0d1321",
        inputBorder: "rgba(55,65,81,0.55)",
        panel: "#1a2236",
        panelHover: "#1f2a42",
        bubbleBg: "rgba(30, 41, 59, 0.42)",
        bubbleBorder: "rgba(147,197,253,0.18)",
        bubbleText: "rgba(229,231,235,0.78)",
        bubbleAuthor: "rgba(147,197,253,0.8)",
        grid: "rgba(42,130,228,0.35)",
        orbA: "rgba(59,130,246,0.45)",
        orbB: "rgba(16,185,129,0.38)",
        brandSub: "#60a5fa",
        toggleBg: "rgba(15,23,42,0.8)",
        toggleBorder: "rgba(55,65,81,0.7)",
      }
    : {
        pageBg: "#dbe7f5",
        pageFg: "#0f172a",
        muted: "#475569",
        soft: "#64748b",
        cardBg: "rgba(255,255,255,0.72)",
        cardBorder: "rgba(148,163,184,0.45)",
        inputBg: "rgba(255,255,255,0.9)",
        inputBorder: "rgba(148,163,184,0.55)",
        panel: "rgba(241,245,249,0.95)",
        panelHover: "rgba(226,232,240,0.95)",
        bubbleBg: "rgba(255, 255, 255, 0.55)",
        bubbleBorder: "rgba(59,130,246,0.18)",
        bubbleText: "rgba(30,41,59,0.78)",
        bubbleAuthor: "rgba(29,78,216,0.8)",
        grid: "rgba(37,99,235,0.18)",
        orbA: "rgba(59,130,246,0.22)",
        orbB: "rgba(16,185,129,0.18)",
        brandSub: "#2563eb",
        toggleBg: "rgba(255,255,255,0.7)",
        toggleBorder: "rgba(148,163,184,0.55)",
      };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-500"
      style={{ background: t.pageBg, color: t.pageFg }}
    >
      <style jsx global>{`
        @keyframes dotPulse {
          0%, 100% { transform: scale(0.75); opacity: 0.18; }
          50% { transform: scale(1.55); opacity: 0.95; }
        }
        @keyframes orbFloat {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.75; }
          50% { transform: translateY(-18px) scale(1.08); opacity: 1; }
        }
        @keyframes skeletonShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes rocketFlame {
          0%, 100% { opacity: 0.55; transform: translateY(0px) scaleY(1); }
          50% { opacity: 1; transform: translateY(1px) scaleY(1.15); }
        }
        @keyframes magicSparkle {
          0%, 100% { opacity: 0.4; transform: scale(0.8) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.2) rotate(180deg); }
        }

        .dot-pulse {
          animation-name: dotPulse;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        .orb-float { animation: orbFloat 6s ease-in-out infinite; }
        .rocket-flame { animation: rocketFlame 0.9s ease-in-out infinite; transform-origin: top center; }
        .magic-sparkle { animation: magicSparkle 2s ease-in-out infinite; }

        .skeleton-block {
          background: linear-gradient(90deg, rgba(100,116,139,.35) 25%, rgba(148,163,184,.45) 50%, rgba(100,116,139,.35) 75%);
          background-size: 200% 100%;
          animation: skeletonShimmer 1.4s linear infinite;
          border-radius: 12px;
        }

        .stage-wrap { transition: opacity .55s ease, transform .55s ease; }
        .brand-block {
          transition: transform 1s cubic-bezier(.22,1,.36,1), opacity .7s ease, margin
        .brand-block {
          transition: transform 1s cubic-bezier(.22,1,.36,1), opacity .7s ease, margin-bottom 1s cubic-bezier(.22,1,.36,1);
        }
        .auth-card {
          transition: opacity .9s cubic-bezier(.22,1,.36,1), transform .9s cubic-bezier(.22,1,.36,1), filter .9s ease, background-color .4s ease, border-color .4s ease;
        }
        .footer-block {
          transition: opacity .8s ease .12s, transform .8s cubic-bezier(.22,1,.36,1) .12s;
        }

        .tab-switch {
          position: relative;
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-bottom: 1px solid rgba(100,116,139,.25);
        }
        .tab-slider {
          position: absolute;
          top: 6px;
          left: 6px;
          width: calc(50% - 6px);
          height: calc(100% - 12px);
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(37,99,235,.35), rgba(59,130,246,.2));
          border: 1px solid rgba(96,165,250,.35);
          box-shadow: 0 0 18px rgba(37,99,235,.2);
          transition: transform .35s cubic-bezier(.22,1,.36,1);
          pointer-events: none;
        }
        .tab-slider.signup { transform: translateX(100%); }
        .tab-btn {
          position: relative;
          z-index: 1;
          padding: 14px 8px;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: .04em;
          transition: color .25s ease;
        }

        .quote-bubble {
          transition: opacity 1.1s ease, transform 1.1s ease, background-color .4s ease, border-color .4s ease, color .4s ease;
          will-change: opacity, transform;
        }
      `}</style>

      {/* Theme toggle */}
      <div
        className="fixed top-4 right-4 z-50 flex items-center gap-1 p-1 rounded-xl border backdrop-blur-md"
        style={{ background: t.toggleBg, borderColor: t.toggleBorder }}
      >
        {([
          { id: "light", label: "Light" },
          { id: "dark", label: "Dark" },
          { id: "system", label: "System" },
        ] as const).map((opt) => {
          const active = themeMode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setThemeMode(opt.id)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
              style={{
                background: active ? "rgba(37,99,235,0.9)" : "transparent",
                color: active ? "#fff" : t.soft,
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-[0.045]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(${t.grid} 1px, transparent 1px), linear-gradient(90deg, ${t.grid} 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        {gridDots.map((dot, i) => (
          <div
            key={`dot-${i}`}
            className="absolute rounded-full dot-pulse"
            style={{
              left: dot.left,
              top: dot.top,
              width: `${dot.size}px`,
              height: `${dot.size}px`,
              animationDelay: dot.delay,
              animationDuration: dot.duration,
              background: isDark ? "rgba(96,165,250,0.9)" : "rgba(37,99,235,0.55)",
              boxShadow: isDark
                ? "0 0 10px rgba(96,165,250,.55)"
                : "0 0 10px rgba(37,99,235,.25)",
            }}
          />
        ))}

        <div
          className="absolute -top-40 -right-40 w-[28rem] h-[28rem] rounded-full blur-3xl orb-float"
          style={{
            background: `radial-gradient(circle, ${t.orbA} 0%, transparent 70%)`,
          }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[28rem] h-[28rem] rounded-full blur-3xl orb-float"
          style={{
            background: `radial-gradient(circle, ${t.orbB} 0%, transparent 70%)`,
            animationDelay: "1.4s",
          }}
        />

        {/* Quote bubbles with independent fade cycles */}
        <div className="absolute inset-0 hidden lg:block">
          {bubbles.map((b) => {
            const q = QUOTES[b.quoteIndex % QUOTES.length];
            return (
              <div
                key={b.id}
                className="absolute quote-bubble"
                style={{
                  top: b.top,
                  [b.side]: b.offset,
                  width: "220px",
                  maxWidth: "22vw",
                  opacity: expanded && b.visible ? 1 : 0,
                  transform:
                    expanded && b.visible
                      ? "translateY(0px) scale(1)"
                      : "translateY(10px) scale(0.98)",
                  pointerEvents: "none",
                }}
              >
                <div
                  className="relative px-3.5 py-3 rounded-2xl text-left border backdrop-blur-md"
                  style={{
                    background: t.bubbleBg,
                    borderColor: t.bubbleBorder,
                    boxShadow: isDark
                      ? "0 8px 24px rgba(0,0,0,0.18)"
                      : "0 8px 24px rgba(15,23,42,0.08)",
                  }}
                >
                  <p className="text-[11px] leading-relaxed" style={{ color: t.bubbleText }}>
                    "{q.text}"
                  </p>
                  <p className="mt-2 text-[10px] font-medium" style={{ color: t.bubbleAuthor }}>
                    — {q.author}
                  </p>

                  <div
                    className="absolute w-2.5 h-2.5 rotate-45"
                    style={{
                      background: t.bubbleBg,
                      borderLeft: b.side === "right" ? `1px solid ${t.bubbleBorder}` : "none",
                      borderBottom: b.side === "right" ? `1px solid ${t.bubbleBorder}` : "none",
                      borderRight: b.side === "left" ? `1px solid ${t.bubbleBorder}` : "none",
                      borderTop: b.side === "left" ? `1px solid ${t.bubbleBorder}` : "none",
                      bottom: 12,
                      ...(b.side === "left" ? { left: -5 } : { right: -5 }),
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FOREGROUND */}
      <div className="relative z-10 w-full max-w-md px-6">
        {/* Skeleton */}
        <div
          className="stage-wrap"
          style={{
            opacity: showSkeleton ? 1 : 0,
            transform: showSkeleton ? "translateY(0)" : "translateY(-8px)",
            pointerEvents: showSkeleton ? "auto" : "none",
            position: showSkeleton ? "relative" : "absolute",
            inset: showSkeleton ? undefined : 0,
          }}
        >
          <div className="flex flex-col items-center mb-8">
            <div className="skeleton-block w-14 h-14 mb-4" />
            <div className="skeleton-block w-48 h-8 mb-3" />
            <div className="skeleton-block w-64 h-4 mb-2" />
            <div className="skeleton-block w-44 h-4" />
          </div>
          <div className="rounded-2xl p-8 border" style={{ background: t.cardBg, borderColor: t.cardBorder }}>
            <div className="skeleton-block w-full h-10 mb-4" />
            <div className="skeleton-block w-full h-10 mb-4" />
            <div className="skeleton-block w-full h-12 mb-4" />
            <div className="skeleton-block w-full h-12" />
          </div>
        </div>

        {/* Content */}
        <div
          className="stage-wrap"
          style={{
            opacity: showContent ? 1 : 0,
            transform: showContent ? "translateY(0)" : "translateY(12px)",
            pointerEvents: showContent ? "auto" : "none",
          }}
        >
          {/* Brand */}
          <div
            className="brand-block text-center"
            style={{
              opacity: showContent ? 1 : 0,
              transform: expanded ? "translateY(0px)" : "translateY(42px)",
              marginBottom: expanded ? "2rem" : "0.5rem",
            }}
          >
            <div className="inline-flex items-center justify-center mb-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path d="M16 5 L16 21" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
                    <path d="M10.5 12.5 L16 5 L21.5 12.5" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 18 L11 23" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
                    <path d="M16 18 L21 23" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
                    <path
                      className="rocket-flame"
                      d="M14.2 22.5 C14.8 25.2 16 27.5 16 27.5 C16 27.5 17.2 25.2 17.8 22.5"
                      stroke="#6ee7b7"
                      strokeWidth="2"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 animate-pulse" style={{ borderColor: t.pageBg }} />
              </div>
            </div>

            <h1 className="text-3xl font-bold tracking-tight" style={{ color: t.pageFg }}>
              Algo
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-700">
                Edge
              </span>{" "}
              <span className="font-light" style={{ color: t.soft }}>
                Pro
              </span>
            </h1>
            <p className="mt-2 text-sm tracking-wide" style={{ color: t.muted }}>
              Institutional-Grade Algorithmic Trading
            </p>
            <p className="mt-2 text-sm font-medium tracking-wide" style={{ color: t.brandSub }}>
              Students of Abilash to the top
            </p>
          </div>

          {/* Card */}
          <div
            className="auth-card backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border"
            style={{
              background: t.cardBg,
              borderColor: t.cardBorder,
              opacity: expanded ? 1 : 0,
              transform: expanded ? "translateY(0px) scale(1)" : "translateY(28px) scale(0.98)",
              filter: expanded ? "blur(0px)" : "blur(6px)",
              pointerEvents: expanded ? "auto" : "none",
            }}
          >
            <div className="tab-switch" style={{ background: isDark ? "rgba(13,19,33,0.9)" : "rgba(248,250,252,0.9)" }}>
              <div className={`tab-slider ${activeTab === "signup" ? "signup" : ""}`} />
              <button
                type="button"
                onClick={() => setActiveTab("login")}
                className="tab-btn"
                style={{ color: activeTab === "login" ? t.pageFg : t.soft }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("signup")}
                className="tab-btn"
                style={{ color: activeTab === "signup" ? t.pageFg : t.soft }}
              >
                Create Account
              </button>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-3 gap-3 mb-6">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="flex items-center justify-center py-2.5 px-4 rounded-lg border transition-all disabled:opacity-60"
                  style={{ background: t.panel, borderColor: t.cardBorder }}
                >
                  <svg className="w-5 h-5" style={{ color: t.muted }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setInfo("GitHub login is not configured yet. Use Google.")}
                  className="flex items-center justify-center py-2.5 px-4 rounded-lg border"
                  style={{ background: t.panel, borderColor: t.cardBorder }}
                >
                  <span className="text-xs" style={{ color: t.soft }}>GH</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInfo("X login is not configured yet. Use Google.")}
                  className="flex items-center justify-center py-2.5 px-4 rounded-lg border"
                  style={{ background: t.panel, borderColor: t.cardBorder }}
                >
                  <span className="text-xs" style={{ color: t.soft }}>X</span>
                </button>
              </div>

              {/* Magic Link Section */}
              {!magicLinkSent && (
                <div className="mb-6">
                  <div className="flex items-center justify-center mb-3">
                    <div className="h-px bg-gradient-to-r from-transparent via-current to-transparent flex-1" style={{ color: t.cardBorder }} />
                    <span className="px-3 text-xs" style={{ color: t.soft }}>or use magic link</span>
                    <div className="h-px bg-gradient-to-r from-transparent via-current to-transparent flex-1" style={{ color: t.cardBorder }} />
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="flex-1 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-blue-500/50 border"
                      style={{ background: t.inputBg, borderColor: t.inputBorder, color: t.pageFg }}
                    />
                    <button
                      type="button"
                      onClick={handleMagicLink}
                      disabled={isMagicLinkLoading || !email}
                      className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2"
                      style={{
                        background: "linear-gradient(135deg, #8b5cf6, #a855f7)",
                        color: "#fff",
                        border: "1px solid rgba(168,85,247,0.3)",
                      }}
                    >
                      {isMagicLinkLoading ? (
                        <>
                          <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                          <span className="text-xs">Sending...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3 magic-sparkle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          <span className="text-xs">Send Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Magic Link Sent State */}
              {magicLinkSent && (
                <div className="mb-6 p-4 rounded-lg border text-center" style={{ background: t.panel, borderColor: "rgba(168,85,247,0.3)" }}>
                  <div className="flex items-center justify-center mb-2">
                    <svg className="w-5 h-5 text-purple-500 magic-sparkle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium mb-1" style={{ color: t.pageFg }}>Magic Link Sent!</h3>
                  <p className="text-xs" style={{ color: t.muted }}>Check your email and click the link to sign in securely.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setMagicLinkSent(false);
                      setInfo("");
                    }}
                    className="mt-3 text-xs text-purple-500 hover:text-purple-400 underline"
                  >
                    Send to different email
                  </button>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 text-xs">
                  {error}
                </div>
              )}
              {info && !magicLinkSent && (
                <div className="mb-4 p-3 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-500 text-xs">
                  {info}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div
                  style={{
                    maxHeight: activeTab === "signup" ? 96 : 0,
                    opacity: activeTab === "signup" ? 1 : 0,
                    overflow: "hidden",
                    transition: "max-height .35s ease, opacity .25s ease",
                  }}
                >
                  <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: t.muted }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-blue-500/50 border"
                    style={{ background: t.inputBg, borderColor: t.inputBorder, color: t.pageFg }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: t.muted }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="trader@algoedge.pro"
                    className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-blue-500/50 border"
                    style={{ background: t.inputBg, borderColor: t.inputBorder, color: t.pageFg }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: t.muted }}>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-4 py-3 pr-16 rounded-lg text-sm focus:outline-none focus:border-blue-500/50 border"
                      style={{ background: t.inputBg, borderColor: t.inputBorder, color: t.pageFg }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 px-3 text-xs"
                      style={{ color: t.soft }}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div style={{ minHeight: 24 }}>
                  {activeTab === "login" && (
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="accent-blue-500"
                        />
                        <span className="text-xs" style={{ color: t.soft }}>Remember me</span>
                      </label>
                      <button type="button" className="text-xs text-blue-500 hover:text-blue-400">
                        Forgot password?
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-blue-500/25 disabled:opacity-70"
                >
                  {isLoading
                    ? "Authenticating..."
                    : activeTab === "login"
                    ? "Continue with Google"
                    : "Sign up with Google"}
                </button>
              </form>
            </div>
          </div>

          <div
            className="footer-block mt-6 text-center"
            style={{
              opacity: expanded ? 1 : 0,
              transform: expanded ? "translateY(0px)" : "translateY(12px)",
            }}
          >
            <p className="text-xs" style={{ color: t.soft }}>
              © 2024 AlgoEdge Pro. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}