"use client";

import { usePathname } from "next/navigation";
import { Session } from "next-auth/react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react"; // Keep Lucide for chevron
import {
  // CORRECTED: Phosphor icons with correct names
  ChartBar,
  Pulse,
  TrendUp,  // Changed from TrendingUp to TrendUp
  FolderOpen,
  Newspaper,
  CalendarBlank,  // Changed from Calendar to CalendarBlank
  BookOpen,
  Code,
  Gear,
ChatCircle,
  SignOut as SignOutIcon,  // Changed from SignOut
} from "@phosphor-icons/react";

interface SidebarProps {
  session: Session | null;
}

export default function Sidebar({ session }: SidebarProps) {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // UPDATED: Navigation items with correct Phosphor icons
// Replace the navigationItems array with role-aware filtering

const isAdmin = (session?.user as any)?.role?.name === "admin";

const navigationItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: ChartBar,
    exact: true,
    color: "from-blue-500 to-blue-600",
    glowColor: "rgba(59, 130, 246, 0.3)",
  },
  {
    href: "/dashboard/assistant",
    label: "AI Assistant",
    icon: ChatCircle,
    color: "from-teal-500 to-cyan-600",
    glowColor: "rgba(20, 184, 166, 0.3)",
  },
  {
    href: "/dashboard/forex",
    label: "Forex Watchlist",
    icon: TrendUp,
    color: "from-green-500 to-emerald-600",
    glowColor: "rgba(16, 185, 129, 0.3)",
  },
  {
    href: "/dashboard/analyse",
    label: "Analyse",
    icon: Pulse,
    color: "from-purple-500 to-purple-600",
    glowColor: "rgba(168, 85, 247, 0.3)",
  },
  {
    href: "/dashboard/strategies",
    label: "Strategies",
    icon: Gear,
    color: "from-orange-500 to-orange-600",
    glowColor: "rgba(249, 115, 22, 0.3)",
  },
  {
    href: "/dashboard/news",
    label: "News",
    icon: Newspaper,
    color: "from-red-500 to-red-600",
    glowColor: "rgba(239, 68, 68, 0.3)",
  },
  {
    href: "/dashboard/calendar",
    label: "Calendar",
    icon: CalendarBlank,
    color: "from-pink-500 to-pink-600",
    glowColor: "rgba(236, 72, 153, 0.3)",
  },
  {
    href: "/dashboard/journal",
    label: "Journal",
    icon: BookOpen,
    color: "from-indigo-500 to-indigo-600",
    glowColor: "rgba(99, 102, 241, 0.3)",
  },
  {
    href: "/dashboard/pinescript",
    label: "PineScript",
    icon: Code,
    color: "from-cyan-500 to-cyan-600",
    glowColor: "rgba(34, 211, 238, 0.3)",
  },
  ...(isAdmin
    ? [
        {
          href: "/dashboard/admin",
          label: "Admin",
          icon: Gear,
          color: "from-slate-500 to-slate-600",
          glowColor: "rgba(100, 116, 139, 0.3)",
        },
        {
          href: "/dashboard/admin/rate-limits",
          label: "Rate Limits",
          icon: Pulse,
          color: "from-yellow-500 to-yellow-600",
          glowColor: "rgba(234, 179, 8, 0.3)",
        },
      ]
    : []),
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Gear,
    color: "from-slate-500 to-slate-600",
    glowColor: "rgba(100, 116, 139, 0.3)",
  },
];
  const isActive = (href: string, exact: boolean = false) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const currentActiveIndex = navigationItems.findIndex(
    (item) => isActive(item.href, item.exact)
  );

  return (
    <div
      className="relative h-screen flex flex-col overflow-hidden transition-all duration-500 group"
      style={{
        width: isHovered ? "280px" : "80px",
        background: "var(--bg-primary)",
        borderRight: "1px solid var(--border-color)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated background glow that follows cursor */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(59, 130, 246, 0.3), transparent 300px)`,
        }}
      />

      {/* Logo / Branding - Animated */}
      <div
        className="relative p-4 border-b transition-all duration-500 flex items-center justify-between overflow-hidden"
        style={{ borderColor: "var(--border-color)" }}
      >
        {/* Icon - Always visible */}
        <div
          className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-500 group-hover:shadow-lg"
          style={{
            background: "linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(168, 85, 247, 0.2))",
            border: "1px solid rgba(59, 130, 246, 0.3)",
          }}
        >
          <span className="text-xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Ⓐ
          </span>
        </div>

        {/* Branding Text - Animated in/out */}
        {isHovered && (
          <div className="flex-1 ml-3 animate-in fade-in slide-in-from-left duration-300">
            <div className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              AlgoEdge
            </div>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              ML Trading
            </p>
          </div>
        )}

        {/* Close indicator for non-hovered state */}
        {!isHovered && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <ChevronRight size={18} style={{ color: "var(--accent-blue)" }} />
          </div>
        )}
      </div>

      {/* Navigation - Main content */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-2 relative z-10">
        {navigationItems.map((item, index) => {
          const active = isActive(item.href, item.exact);
          const IconComponent = item.icon;

          return (
            <div
              key={item.href}
              className="relative group/nav-item"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {/* Animated background for active item */}
              {active && (
                <div
                  className="absolute inset-0 rounded-lg opacity-20 transition-all duration-500 blur-md"
                  style={{
                    background: `linear-gradient(135deg, ${item.glowColor}, transparent)`,
                  }}
                />
              )}

              {/* Animated hover background */}
              {activeIndex === index && !active && (
                <div
                  className="absolute inset-0 rounded-lg opacity-10 transition-all duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${item.glowColor}, transparent)`,
                  }}
                />
              )}

              <Link
                href={item.href}
                className="relative flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-300 group/link"
                style={{
                  background: active
                    ? "rgba(59, 130, 246, 0.1)"
                    : "transparent",
                  color: active
                    ? "var(--accent-blue)"
                    : "var(--text-secondary)",
                  borderLeft: active
                    ? "3px solid var(--accent-blue)"
                    : "3px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(59, 130, 246, 0.05)";
                    (e.currentTarget as HTMLElement).style.color =
                      "var(--text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                    (e.currentTarget as HTMLElement).style.color =
                      "var(--text-secondary)";
                  }
                }}
              >
                {/* Icon Container - Uses Phosphor */}
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 group-hover/link:scale-110"
                  style={{
                    background: active
                      ? `linear-gradient(135deg, ${item.color})`
                      : "rgba(59, 130, 246, 0.1)",
                    transform: activeIndex === index && !active ? "scale(1.05)" : "scale(1)",
                  }}
                >
                  <IconComponent
                    size={20}
                    weight="duotone"
                    color="white"
                  />
                </div>

                {/* Label - Animated in/out */}
                {isHovered && (
                  <div className="flex-1 animate-in fade-in slide-in-from-left duration-300 overflow-hidden">
                    <div className="font-semibold text-sm truncate">{item.label}</div>
                    <div
                      className="text-[10px] truncate"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {active ? "Active" : "View"}
                    </div>
                  </div>
                )}

                {/* Active indicator dot */}
                {active && !isHovered && (
                  <div
                    className="absolute -right-2 w-2 h-2 rounded-full animate-pulse"
                    style={{ background: "var(--accent-blue)" }}
                  />
                )}

                {/* Hover indicator for collapsed state */}
                {activeIndex === index && !active && !isHovered && (
                  <div
                    className="absolute -right-1.5 w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: "var(--accent-blue)" }}
                  />
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* User Profile Section - Enhanced */}
      <div
        className="relative p-3 border-t space-y-3 z-10 transition-all duration-500"
        style={{ borderColor: "var(--border-color)" }}
      >
        {/* User Info Card - Animated */}
        {isHovered && (
          <div
            className="px-4 py-3 rounded-lg animate-in fade-in slide-in-from-bottom duration-300"
            style={{ background: "var(--bg-tertiary)" }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Logged In
            </p>
            <p
              className="text-sm font-bold truncate mt-1"
              style={{ color: "var(--text-primary)" }}
            >
              {session?.user?.name || session?.user?.email || "User"}
            </p>
          </div>
        )}

        {/* User Avatar - Always visible */}
        {!isHovered && (
          <div
            className="w-10 h-10 rounded-lg mx-auto flex items-center justify-center font-bold text-sm transition-all duration-300 group-hover/profile:scale-110"
            style={{
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(168, 85, 247, 0.2))",
              border: "2px solid rgba(59, 130, 246, 0.3)",
              color: "var(--accent-blue)",
            }}
          >
            {(session?.user?.name?.[0] ||
              session?.user?.email?.[0] ||
              "U").toUpperCase()}
          </div>
        )}

        {/* Logout Button - Updated with Phosphor icon */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold border transition-all duration-300 hover:scale-105 active:scale-95 group/logout"
          style={{
            background: "rgba(239, 68, 68, 0.08)",
            borderColor: "rgba(239, 68, 68, 0.2)",
            color: "#ef4444",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(239, 68, 68, 0.2)";
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 8px 20px rgba(239, 68, 68, 0.2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(239, 68, 68, 0.08)";
            (e.currentTarget as HTMLElement).style.boxShadow = "none";
          }}
        >
          <SignOutIcon size={16} weight="duotone" />
          {isHovered && (
            <span className="animate-in fade-in slide-in-from-left duration-300">
              Logout
            </span>
          )}
        </button>
      </div>

      {/* Animated border glow on hover */}
      {isHovered && (
        <div
          className="absolute top-0 right-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-purple-500 to-transparent opacity-30 animate-pulse"
          style={{
            animation: "gradient-shift 3s ease-in-out infinite",
          }}
        />
      )}

      {/* Collapsed state indicator */}
      {!isHovered && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
          <span style={{ color: "var(--text-muted)" }}>Hover to expand</span>
        </div>
      )}
    </div>
  );
}