"use client";

import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/context/ThemeContext";

interface TopBarProps {
  session: Session;
}

export default function TopBar({ session }: TopBarProps) {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "short",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  const roleName = (session.user as { role?: { name?: string } })?.role?.name ?? "user";

  const searchSuggestions = [
    { label: "Portfolio Overview", href: "/dashboard" },
    { label: "Active Strategies", href: "/dashboard/strategies" },
    { label: "Market Analysis", href: "/dashboard/analyse" },
    { label: "Trade Journal", href: "/dashboard/journal" },
    { label: "Economic Events", href: "/dashboard/events" },
  ].filter(
    (item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.href.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <header
      className="flex items-center justify-between px-6 py-4 border-b backdrop-blur-md sticky top-0 z-30 transition-colors duration-300"
      style={{
        borderColor: "var(--border-color)",
        background: "rgba(10, 10, 15, 0.75)",
      }}
    >
      <div className="flex items-center gap-6 flex-1">
        <h1 className="text-base font-bold tracking-tight uppercase hidden sm:block" style={{ color: "var(--text-primary)" }}>
          Client Workspace
        </h1>

        {/* Live Client Time */}
        <div
          className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full border"
          style={{
            borderColor: "var(--border-color)",
            background: "var(--bg-tertiary)",
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-mono font-medium" style={{ color: "var(--text-muted)" }}>
            {currentTime || "Loading Telemetry…"}
          </span>
        </div>

        {/* Search Bar */}
        <div
          ref={searchRef}
          className={`relative hidden sm:flex items-center flex-1 max-w-xs transition-all duration-300 ${
            searchFocused ? "max-w-md" : ""
          }`}
        >
          <div
            className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300`}
            style={{
              borderColor: searchFocused ? "var(--accent-blue)" : "var(--border-color)",
              background: searchFocused ? "var(--bg-glass)" : "transparent",
            }}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              style={{ color: "var(--text-muted)" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search dashboard…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{
                color: "var(--text-primary)",
              }}
              style={{
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Search suggestions dropdown */}
          {searchFocused && searchQuery && (
            <div
              className="absolute top-full left-0 right-0 mt-2 rounded-lg border shadow-lg z-50 slide-in overflow-hidden"
              style={{
                borderColor: "var(--border-color)",
                background: "var(--bg-tertiary)",
              }}
            >
              {searchSuggestions.length > 0 ? (
                searchSuggestions.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="block px-4 py-2 text-sm transition-colors"
                    style={{
                      color: "var(--text-secondary)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(59, 130, 246, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    {item.label}
                  </a>
                ))
              ) : (
                <div className="px-4 py-2 text-sm" style={{ color: "var(--text-muted)" }}>
                  No results found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* User Identity Info Card */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {session.user?.name}
            </div>
            <div
              className="text-[10px] mt-1 font-medium font-mono"
              style={{ color: "var(--text-muted)" }}
            >
              {session.user?.email}
            </div>
          </div>

          {session.user?.image && (
            <div className="relative">
              <img
                src={session.user.image}
                alt="Profile"
                className="w-8 h-8 rounded-lg border object-cover"
                style={{ borderColor: "var(--border-color)" }}
              />
              <div
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500"
                style={{ borderColor: "var(--bg-primary)" }}
              />
            </div>
          )}

          {/* Role badge */}
          <span
            className={`px-2 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider border ml-1 transition-colors duration-300 ${
              roleName === "admin"
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            }`}
          >
            {roleName}
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg border transition-all duration-300"
          style={{
            background: "var(--bg-tertiary)",
            borderColor: "var(--border-color)",
            color: "var(--text-secondary)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)";
          }}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </button>

        {/* Sign-out */}
        <button
          onClick={handleSignOut}
          className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all duration-300 flex items-center gap-2"
          style={{
            borderColor: "var(--border-color)",
            color: "var(--text-secondary)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(239, 68, 68, 0.3)";
            (e.currentTarget as HTMLElement).style.color = "#ef4444";
            (e.currentTarget as HTMLElement).style.background = "rgba(239, 68, 68, 0.1)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
            />
          </svg>
          <span className="hidden sm:inline">Exit</span>
        </button>
      </div>
    </header>
  );
}
