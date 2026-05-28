"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, ShieldAlert, Globe, BarChart2, Zap, Activity } from "lucide-react";
import { useHealth } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",          label: "Overview",  icon: Activity  },
  { href: "/alerts",    label: "Alerts",    icon: ShieldAlert },
  { href: "/sources",   label: "Sources",   icon: Globe     },
  { href: "/reports",   label: "Reports",   icon: BarChart2 },
  { href: "/brightdata",label: "Bright Data", icon: Zap     },
];

const MONO = "font-mono text-[0.60rem] tracking-widest uppercase";

export function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: health } = useHealth();

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Sidebar ── */}
      <nav
        className="w-44 shrink-0 flex flex-col border-r overflow-y-auto"
        style={{ background: "oklch(0.155 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}
      >
        {/* Logo */}
        <div
          className="px-4 py-4 flex items-center gap-2.5 border-b shrink-0"
          style={{ borderColor: "oklch(0.28 0.012 255)" }}
        >
          <div
            className="w-6 h-6 rounded flex items-center justify-center shrink-0"
            style={{ background: "oklch(0.52 0.18 255)" }}
          >
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="mono text-xs font-extrabold tracking-tight" style={{ color: "oklch(0.94 0.006 255)" }}>
            COMPLIANCE<br />
            <span style={{ color: "oklch(0.72 0.14 200)" }}>RADAR</span>
          </span>
        </div>

        {/* Nav links */}
        <div className="flex flex-col gap-0.5 p-2 flex-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-150",
                  active
                    ? "text-white"
                    : "hover:text-white"
                )}
                style={{
                  background: active ? "oklch(0.52 0.18 255 / 0.2)" : "transparent",
                  color: active ? "oklch(0.86 0.008 255)" : "oklch(0.52 0.010 255)",
                  outline: active ? "1px solid oklch(0.52 0.18 255 / 0.25)" : "none",
                  outlineOffset: "-1px",
                }}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs font-medium">{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Health footer */}
        <div
          className="px-4 py-3 border-t shrink-0"
          style={{ borderColor: "oklch(0.28 0.012 255)" }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                background: health?.status === "ok" ? "oklch(0.60 0.18 155)" : "oklch(0.60 0.22 22)",
                boxShadow: health?.status === "ok" ? "0 0 4px oklch(0.60 0.18 155)" : "none",
              }}
            />
            <span className={`${MONO} text-[0.55rem]`} style={{ color: "oklch(0.44 0.010 255)" }}>
              {health?.status === "ok" ? "LIVE" : "OFFLINE"}
            </span>
          </div>
          {health?.sources != null && (
            <p className={`${MONO} text-[0.55rem]`} style={{ color: "oklch(0.38 0.010 255)" }}>
              {health.sources} sources
            </p>
          )}
          {health?.last_scan && (
            <p className={`${MONO} text-[0.55rem] mt-0.5`} style={{ color: "oklch(0.34 0.010 255)" }}>
              {new Date(health.last_scan).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
      </nav>

      {/* ── Page content ── */}
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}
