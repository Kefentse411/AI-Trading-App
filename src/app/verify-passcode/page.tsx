"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";

type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const QUOTES = [
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "Risk comes from not knowing what you're doing.", author: "Warren Buffett" },
  { text: "Amateurs think about gains. Professionals think about losses.", author: "Jack Schwager" },
  { text: "We are what we repeatedly do. Excellence is a habit.", author: "Aristotle" },
  { text: "In the short run the market is a voting machine; in the long run a weighing machine.", author: "Benjamin Graham" },
  { text: "There is a time to go long, short, and fishing.", author: "Jesse Livermore" },
];

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === "system" ? getSystemTheme() : mode;
}

export default function VerifyPasscodePage() {
  const { data: session } = useSession();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [destination, setDestination] = useState("");
  const [devCode, setDevCode] = useState<string | undefined>(undefined);
  const [countdown, setCountdown] = useState(0);

  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");
  const isDark = resolvedTheme === "dark";

  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  const [bubbleVisibility, setBubbleVisibility] = useState<boolean[]>(Array(6).fill(false));

  useEffect(() => {
    const saved = (localStorage.getItem("algoedge-theme") as ThemeMode | null) || "system";
    setThemeMode(saved);
    setResolvedTheme(resolveTheme(saved));
  }, []);

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

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 700);
    const t2 = setTimeout(() => setPhase(2), 1700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Send code automatically on load
  useEffect(() => {
    void sendCode(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resend countdown
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Bubble cycles
  useEffect(() => {
    if (phase < 2) return;
    const timers: number[] = [];

    for (let i = 0; i < 6; i++) {
      const startDelay = 500 + i * 650;

      const cycle = (first = false) => {
        const showT = window.setTimeout(() => {
          setBubbleVisibility((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          });

          const visibleFor = 5500 + (i % 4) * 900;
          const hideT = window.setTimeout(() => {
            setBubbleVisibility((prev) => {
              const next = [...prev];
              next[i] = false;
              return next;
            });

            const gap = 1800 + (i % 5) * 700;
            const nextT = window.setTimeout(() => cycle(false), gap);
            timers.push(nextT);
          }, visibleFor);

          timers.push(hideT);
        }, first ? startDelay : 0);

        timers.push(showT);
      };

      cycle(true);
    }

    return () => timers.forEach((t) => clearTimeout(t));
  }, [phase]);

  const gridDots = useMemo(() => {
    return Array.from({ length: 64 }, (_, i) => {
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

  const bubbleSlots = useMemo(
    () => [
      { side: "left" as const, top: "10%", offset: "3%", quote: QUOTES[0] },
      { side: "left" as const, top: "38%", offset: "5%", quote: QUOTES[1] },
      { side: "left" as const, top: "66%", offset: "4%", quote: QUOTES[2] },
      { side: "right" as const, top: "14%", offset: "3%", quote: QUOTES[3] },
      { side: "right" as const, top: "42%", offset: "5%", quote: QUOTES[4] },
      { side: "right" as const, top: "70%", offset: "4%", quote: QUOTES[5] },
    ],
    []
  );

  const sendCode = async (isAuto = false) => {
    setSending(true);
    setError("");
    if (!isAuto) setInfo("");

    try {
      const res = await fetch("/api/auth/send-passcode", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send code");
        setSending(false);
        return;
      }

      setDestination(data.destination || session?.user?.email || "your email");
      setDevCode(data.devCode);
      setCountdown(30);
      setInfo(
        data.provider === "console"
          ? "Dev mode: code logged to server console (and shown below)."
          : `Verification code sent to ${data.destination}`
      );
    } catch {
      setError("Failed to send verification code");
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid code");
        setLoading(false);
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setError("Verification failed. Please try again.");
      setLoading(false);
    }
  };

  const showSkeleton = phase === 0;
  const showContent = phase >= 1;
  const expanded = phase >= 2;

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
        bubbleBg: "rgba(30,41,59,0.42)",
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
        bubbleBg: "rgba(255,255,255,0.55)",
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
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.75; }
          50% { transform: translateY(-18px) scale(1.08); opacity: 1; }
        }
        @keyframes skeletonShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes rocketFlame {
          0%, 100% { opacity: 0.55; transform: translateY(0) scaleY(1); }
          50% { opacity: 1; transform: translateY(1px) scaleY(1.15); }
        }
        .dot-pulse { animation: dotPulse ease-in-out infinite; }
        .orb-float { animation: orbFloat 6s ease-in-out infinite; }
        .rocket-flame { animation: rocketFlame 0.9s ease-in-out infinite; transform-origin: top center; }
        .skeleton-block {
          background: linear-gradient(90deg, rgba(100,116,139,.35) 25%, rgba(148,163,184,.45) 50%, rgba(100,116,139,.35) 75%);
          background-size: 200% 100%;
          animation: skeletonShimmer 1.4s linear infinite;
          border-radius: 12px;
        }
        .stage-wrap { transition: opacity .55s ease, transform .55s ease; }
        .brand-block {
          transition: transform 1s cubic-bezier(.22,1,.36,1), opacity .7s ease, margin-bottom 1s cubic-bezier(.22,1,.36,1);
        }
        .auth-card {
          transition: opacity .9s cubic-bezier(.22,1,.36,1), transform .9s cubic-bezier(.22,1,.36,1), filter .9s ease;
        }
        .quote-bubble {
          transition: opacity 1.1s ease, transform 1.1s ease;
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

      {/* Background */}
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
            key={i}
            className="absolute rounded-full dot-pulse"
            style={{
              left: dot.left,
              top: dot.top,
              width: `${dot.size}px`,
              height: `${dot.size}px`,
              animationDelay: dot.delay,
              animationDuration: dot.duration,
              background: isDark ? "rgba(96,165,250,0.9)" : "rgba(37,99,235,0.55)",
              boxShadow: isDark ? "0 0 10px rgba(96,165,250,.55)" : "0 0 10px rgba(37,99,235,.25)",
            }}
          />
        ))}

        <div
          className="absolute -top-40 -right-40 w-[28rem] h-[28rem] rounded-full blur-3xl orb-float"
          style={{ background: `radial-gradient(circle, ${t.orbA} 0%, transparent 70%)` }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[28rem] h-[28rem] rounded-full blur-3xl orb-float"
          style={{
            background: `radial-gradient(circle, ${t.orbB} 0%, transparent 70%)`,
            animationDelay: "1.4s",
          }}
        />

        {/* Quote bubbles */}
        <div className="absolute inset-0 hidden lg:block">
          {bubbleSlots.map((slot, i) => (
            <div
              key={i}
              className="absolute quote-bubble"
              style={{
                top: slot.top,
                [slot.side]: slot.offset,
                width: "220px",
                maxWidth: "22vw",
                opacity: expanded && bubbleVisibility[i] ? 1 : 0,
                transform:
                  expanded && bubbleVisibility[i]
                    ? "translateY(0) scale(1)"
                    : "translateY(10px) scale(0.98)",
              }}
            >
              <div
                className="relative px-3.5 py-3 rounded-2xl border backdrop-blur-md"
                style={{
                  background: t.bubbleBg,
                  borderColor: t.bubbleBorder,
                }}
              >
                <p className="text-[11px] leading-relaxed" style={{ color: t.bubbleText }}>
                  “{slot.quote.text}”
                </p>
                <p className="mt-2 text-[10px] font-medium" style={{ color: t.bubbleAuthor }}>
                  — {slot.quote.author}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

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
            <div className="skeleton-block w-52 h-8 mb-3" />
            <div className="skeleton-block w-64 h-4" />
          </div>
          <div className="rounded-2xl p-8 border" style={{ background: t.cardBg, borderColor: t.cardBorder }}>
            <div className="skeleton-block w-full h-16 mb-4" />
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
          <div
            className="brand-block text-center"
            style={{
              opacity: showContent ? 1 : 0,
              transform: expanded ? "translateY(0)" : "translateY(42px)",
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

            <h1 className="text-3xl font-bold tracking-tight">
              Algo
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-700">
                Edge
              </span>{" "}
              <span className="font-light" style={{ color: t.soft }}>
                Pro
              </span>
            </h1>
            <p className="mt-2 text-sm" style={{ color: t.muted }}>
              Two-Factor Verification
            </p>
            <p className="mt-2 text-sm font-medium" style={{ color: t.brandSub }}>
              Students of Abilash to the top
            </p>
          </div>

          <div
            className="auth-card backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border"
            style={{
              background: t.cardBg,
              borderColor: t.cardBorder,
              opacity: expanded ? 1 : 0,
              transform: expanded ? "translateY(0) scale(1)" : "translateY(28px) scale(0.98)",
              filter: expanded ? "blur(0px)" : "blur(6px)",
              pointerEvents: expanded ? "auto" : "none",
            }}
          >
            <div className="p-8">
              <p className="text-sm text-center mb-6" style={{ color: t.muted }}>
                Enter the 6-digit code sent to{" "}
                <span style={{ color: t.pageFg, fontWeight: 600 }}>
                  {destination || session?.user?.email || "your email"}
                </span>
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 text-xs text-center">
                  {error}
                </div>
              )}
              {info && (
                <div className="mb-4 p-3 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-500 text-xs text-center">
                  {info}
                </div>
              )}
              {devCode && (
                <div className="mb-4 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-xs text-center">
                  Dev code: <b style={{ letterSpacing: "0.2em" }}>{devCode}</b>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-5 rounded-2xl text-center text-3xl tracking-[0.35em] font-mono mb-5 border focus:outline-none focus:border-blue-500/50"
                  style={{
                    background: t.inputBg,
                    borderColor: t.inputBorder,
                    color: t.pageFg,
                  }}
                />

                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-blue-500/25 disabled:opacity-70 mb-3"
                >
                  {loading ? "Verifying..." : "Verify & Continue"}
                </button>
              </form>

              <button
                type="button"
                onClick={() => sendCode(false)}
                disabled={sending || countdown > 0}
                className="w-full py-3 rounded-lg border text-sm font-medium transition-all disabled:opacity-60 mb-3"
                style={{ borderColor: t.cardBorder, color: t.muted, background: "transparent" }}
              >
                {sending
                  ? "Sending..."
                  : countdown > 0
                  ? `Resend code in ${countdown}s`
                  : "Resend code"}
              </button>

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full py-3 rounded-lg border text-sm"
                style={{ borderColor: t.cardBorder, color: t.soft, background: "transparent" }}
              >
                Sign out
              </button>
            </div>
          </div>

          <div
            className="mt-6 text-center"
            style={{
              opacity: expanded ? 1 : 0,
              transform: expanded ? "translateY(0)" : "translateY(12px)",
              transition: "all .8s ease",
            }}
          >
            <p className="text-xs" style={{ color: t.soft }}>
              Protected by 2FA • Code expires in 10 minutes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}