"use client";

import { useState, useMemo } from "react";
import { RefreshCw, Database, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import { revalidateAll, useAlerts } from "@/lib/hooks";
import type { Alert } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────

type NodeStatus = "HEALTHY" | "WARNING" | "CRITICAL";
type NodeCategory = "Network" | "Data" | "Infrastructure" | "Operational";

interface RadarNode {
  id: string;
  name: string;
  r: number;    // 0–100, distance from center
  angle: number; // 0° = North (top), clockwise
  category: NodeCategory;
  status: NodeStatus;
  details: string;
  alertId?: number;
  sourceUrl?: string;
}

// ─── Keyword → category mapping ──────────────────────────────

function inferCategory(text: string): NodeCategory {
  const t = text.toLowerCase();
  if (t.includes("network") || t.includes("firewall") || t.includes("vpn") || t.includes("port") || t.includes("ssh") || t.includes("tls") || t.includes("ssl") || t.includes("dns") || t.includes("ddos")) return "Network";
  if (t.includes("data") || t.includes("gdpr") || t.includes("s3") || t.includes("database") || t.includes("backup") || t.includes("storage") || t.includes("encryption") || t.includes("privacy") || t.includes("personal")) return "Data";
  if (t.includes("vm") || t.includes("server") || t.includes("docker") || t.includes("container") || t.includes("kubernetes") || t.includes("cloud") || t.includes("infra") || t.includes("patch") || t.includes("vulnerability")) return "Infrastructure";
  return "Operational";
}

function sevToStatus(sev: string): NodeStatus {
  if (sev === "critical") return "CRITICAL";
  if (sev === "high" || sev === "medium") return "WARNING";
  return "HEALTHY";
}

// ─── Spread nodes evenly to avoid overlap ────────────────────

const CATEGORY_QUADRANT: Record<NodeCategory, number> = {
  Network: 315,        // top-right
  Data: 225,           // top-left
  Infrastructure: 135, // bottom-left
  Operational: 45,     // bottom-right
};

// Max nodes to show per category — pick the most severe ones
const MAX_PER_CATEGORY = 8;
// Max total nodes on radar
const MAX_TOTAL_NODES = 24;

function distributeNodes(alerts: Alert[]): RadarNode[] {
  if (alerts.length === 0) return [];

  // Group by category, sort each group by severity (critical first)
  const SEV_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const groups: Record<NodeCategory, Alert[]> = {
    Network: [], Data: [], Infrastructure: [], Operational: [],
  };

  for (const alert of alerts) {
    const text = `${alert.summary} ${alert.source_name ?? ""} ${alert.impacted_depts ?? ""}`;
    const cat = inferCategory(text);
    groups[cat].push(alert);
  }

  // Sort each group by severity and cap at MAX_PER_CATEGORY
  for (const cat of Object.keys(groups) as NodeCategory[]) {
    groups[cat].sort((a, b) => (SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9));
    groups[cat] = groups[cat].slice(0, MAX_PER_CATEGORY);
  }

  const nodes: RadarNode[] = [];

  for (const [cat, catAlerts] of Object.entries(groups) as [NodeCategory, Alert[]][]) {
    if (catAlerts.length === 0) continue;

    const baseAngle = CATEGORY_QUADRANT[cat];
    // Spread across 80° max, with minimum 12° gap between nodes
    const spread = Math.min(80, Math.max(0, (catAlerts.length - 1) * 14));
    const step = catAlerts.length > 1 ? spread / (catAlerts.length - 1) : 0;
    const startAngle = baseAngle - spread / 2;

    catAlerts.forEach((alert, i) => {
      // Vary radius by severity: critical outer, low inner
      const baseR = alert.severity === "critical" ? 80
        : alert.severity === "high" ? 65
        : alert.severity === "medium" ? 50
        : 35;
      // Slight jitter to avoid perfect overlap when same severity
      const jitter = (i % 2 === 0 ? 1 : -1) * (Math.floor(i / 2) * 5);
      const r = Math.min(90, Math.max(18, baseR + jitter));
      const angle = (startAngle + i * step + 360) % 360;

      nodes.push({
        id: `node-${alert.id}`,
        name: alert.source_name ?? `Source ${alert.source_id}`,
        r,
        angle,
        category: cat,
        status: sevToStatus(alert.severity),
        details: alert.summary.slice(0, 120),
        alertId: alert.id,
        sourceUrl: alert.source_url,
      });
    });
  }

  // Final cap — keep most severe across all categories
  return nodes
    .sort((a, b) => {
      const rank: Record<NodeStatus, number> = { CRITICAL: 0, WARNING: 1, HEALTHY: 2 };
      return rank[a.status] - rank[b.status];
    })
    .slice(0, MAX_TOTAL_NODES);
}

// ─── Static fallback nodes (shown when no alerts loaded) ─────

const FALLBACK_NODES: RadarNode[] = [
  { id: "f1", name: "Edge Firewall 01",     r: 72, angle: 40,  category: "Network",        status: "HEALTHY",  details: "Awaiting live data — run a scan to populate." },
  { id: "f2", name: "Direct Connect Link",  r: 48, angle: 130, category: "Network",        status: "HEALTHY",  details: "Awaiting live data — run a scan to populate." },
  { id: "f3", name: "GDPR Customer Vault",  r: 78, angle: 215, category: "Data",           status: "WARNING",  details: "Awaiting live data — run a scan to populate." },
  { id: "f4", name: "S3 Historical Backups",r: 85, angle: 340, category: "Data",           status: "CRITICAL", details: "Awaiting live data — run a scan to populate." },
  { id: "f5", name: "Production VM Cluster",r: 38, angle: 290, category: "Infrastructure", status: "HEALTHY",  details: "Awaiting live data — run a scan to populate." },
  { id: "f6", name: "Staging VM Group",     r: 62, angle: 255, category: "Infrastructure", status: "WARNING",  details: "Awaiting live data — run a scan to populate." },
  { id: "f7", name: "IAM Access Registry",  r: 44, angle: 80,  category: "Operational",   status: "HEALTHY",  details: "Awaiting live data — run a scan to populate." },
  { id: "f8", name: "Biometric Login Gate", r: 68, angle: 165, category: "Operational",   status: "HEALTHY",  details: "Awaiting live data — run a scan to populate." },
];

// ─── Component ────────────────────────────────────────────────

export function RadarSphere() {
  const { data: liveAlerts = [] } = useAlerts(200);
  const [sel, setSel] = useState<RadarNode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [tick, setTick] = useState(0);

  const nodes = useMemo(() => {
    const live = distributeNodes(liveAlerts);
    // Show fallback only when idle with no data — never during/after a scan
    if (live.length > 0) return live;
    if (scanning) return [];
    return FALLBACK_NODES;
  }, [liveAlerts, scanning]);

  const isLive = liveAlerts.length > 0;

  const fire = async () => {
    setScanning(true);
    setTick(0);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTick(i);
      if (i >= 3) {
        clearInterval(iv);
        setScanning(false);
      }
    }, 900);
    try {
      await api.scan();
      revalidateAll();
    } catch {
      /* silent */
    }
  };

  const INDIGO = "rgba(99, 102, 241, 0.45)";

  // Stats from live alerts
  const criticalCount = liveAlerts.filter((a) => a.severity === "critical").length;
  const warningCount = liveAlerts.filter((a) => a.severity === "high" || a.severity === "medium").length;
  const healthyCount = liveAlerts.filter((a) => a.severity === "low").length;

  return (
    <div className="flex-1 flex items-stretch gap-0 overflow-hidden z-10">
      {/* Radar */}
      <div
        className="flex-1 flex items-center justify-center p-5 relative"
        style={{ background: "oklch(0.148 0.012 255)" }}
      >
        <div
          className="relative rounded-full flex items-center justify-center overflow-hidden"
          style={{
            width: 580,
            height: 580,
            minWidth: 580,
            minHeight: 580,
            background: "#090b10",
            boxShadow: "inset 0 0 60px rgba(0,0,0,0.6), 0 0 40px rgba(79,70,229,0.04)",
            border: "1px solid rgba(99,102,241,0.15)",
          }}
        >
          {/* Sweep beam */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              zIndex: 2,
              background:
                "conic-gradient(from 0deg, rgba(79,70,229,0.35) 0deg, rgba(79,70,229,0.08) 60deg, transparent 120deg)",
              animation: scanning ? "sweep 1.2s infinite linear" : "sweep 6s infinite linear",
            }}
          />

          {/* SVG rings */}
          <svg className="absolute w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            <circle cx="50%" cy="50%" r="20%" fill="none" stroke="rgba(99,102,241,0.08)" strokeDasharray="3 3" />
            <circle cx="50%" cy="50%" r="35%" fill="none" stroke="rgba(99,102,241,0.12)" />
            <circle cx="50%" cy="50%" r="50%" fill="none" stroke="rgba(99,102,241,0.16)" strokeDasharray="5 5" />
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(99,102,241,0.08)" />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(99,102,241,0.08)" />
          </svg>

          {/* Quadrant labels */}
          <span
            className="absolute top-3 left-1/2 -translate-x-1/2 text-[9px] font-mono tracking-widest font-extrabold uppercase pointer-events-none"
            style={{ color: "#6366f1", zIndex: 3 }}
          >
            1. NETWORK GUARD
          </span>
          <span
            className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-mono tracking-widest font-extrabold uppercase pointer-events-none"
            style={{ color: "rgba(99,102,241,0.55)", zIndex: 3 }}
          >
            3. DATA INTEGRITY
          </span>
          <span
            className="absolute text-[9px] font-mono tracking-widest font-extrabold uppercase pointer-events-none"
            style={{
              color: "rgba(99,102,241,0.55)",
              zIndex: 3,
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%) translateX(-255px) rotate(-90deg)",
              whiteSpace: "nowrap",
            }}
          >
            4. INFRA CLOUD
          </span>
          <span
            className="absolute text-[9px] font-mono tracking-widest font-extrabold uppercase pointer-events-none"
            style={{
              color: "rgba(99,102,241,0.55)",
              zIndex: 3,
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%) translateX(255px) rotate(90deg)",
              whiteSpace: "nowrap",
            }}
          >
            2. COMPLIANCE OPS
          </span>

          {/* Nodes */}
          {nodes.map((node, index) => {
            // 0° = North (top), clockwise
            const rad = ((node.angle - 90) * Math.PI) / 180;
            const radius = node.r * 0.46;
            const pxVal = 50 + radius * Math.cos(rad);
            const pyVal = 50 + radius * Math.sin(rad);
            const px = pxVal.toFixed(4);
            const py = pyVal.toFixed(4);
            const active = sel?.id === node.id;
            const dotSize = active ? 16 : node.status === "CRITICAL" ? 14 : 12;
            const half = (dotSize / 2).toFixed(0);

            let dotStyle: string;
            let glow: string;
            if (node.status === "CRITICAL") {
              dotStyle = "bg-red-500";
              glow = "0 0 12px #ef4444";
            } else if (node.status === "WARNING") {
              dotStyle = "bg-amber-400";
              glow = "0 0 8px #f59e0b";
            } else {
              dotStyle = "bg-emerald-400";
              glow = "0 0 8px #10b981";
            }

            return (
              <button
                key={node.id}
                onClick={() => setSel(active ? null : node)}
                className="absolute z-10 cursor-pointer node-pop btn-press"
                style={{
                  left: `calc(${px}% - ${half}px)`,
                  top: `calc(${py}% - ${half}px)`,
                  width: dotSize,
                  height: dotSize,
                  animationDelay: `${(index % 12) * 60}ms`,
                }}
              >
                <div
                  className={`w-full h-full rounded-full ${dotStyle} transition-all duration-200`}
                  style={{
                    boxShadow: glow,
                    outline: active ? "2px solid rgba(255,255,255,0.15)" : "none",
                    outlineOffset: 2,
                  }}
                />
                {node.status === "CRITICAL" && (
                  <div
                    className="absolute rounded-full bg-red-500/20 pointer-events-none"
                    style={{ inset: -6, animation: "pulse-dot 2s ease-in-out infinite" }}
                  />
                )}
              </button>
            );
          })}

          {/* Center hub */}
          <button
            onClick={fire}
            disabled={scanning}
            className="flex flex-col items-center justify-center z-20 cursor-pointer btn-press"
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "oklch(0.148 0.012 255)",
              border: "1px solid rgba(99,102,241,0.25)",
              boxShadow: "inset 0 0 20px rgba(0,0,0,0.4)",
            }}
          >
            <RefreshCw
              className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`}
              style={{ color: scanning ? INDIGO : "rgba(129,140,248,0.6)" }}
            />
            <span
              className="mono text-[0.50rem] mt-0.5 font-bold tracking-widest"
              style={{ color: scanning ? INDIGO : "rgba(148,163,184,0.6)" }}
            >
              {scanning ? `0${tick}` : "SCAN"}
            </span>
          </button>
        </div>

        {/* Status bar */}
        <div className="absolute bottom-3 flex items-center gap-4 pointer-events-none">
          {isLive ? (
            <>
              <span className="mono text-[0.60rem] tracking-widest" style={{ color: "rgba(148,163,184,0.5)" }}>
                {nodes.length} shown · {liveAlerts.length} total alerts
              </span>
              {criticalCount > 0 && (
                <span className="mono text-[0.60rem] font-bold" style={{ color: "rgba(239,68,68,0.7)" }}>
                  {criticalCount} CRITICAL
                </span>
              )}
              {warningCount > 0 && (
                <span className="mono text-[0.60rem] font-bold" style={{ color: "rgba(245,158,11,0.7)" }}>
                  {warningCount} WARNING
                </span>
              )}
              {healthyCount > 0 && (
                <span className="mono text-[0.60rem]" style={{ color: "rgba(16,185,129,0.6)" }}>
                  {healthyCount} LOW
                </span>
              )}
            </>
          ) : scanning ? (
            <span className="mono text-[0.60rem] tracking-widest text-center" style={{ color: "rgba(148,163,184,0.5)" }}>
              SCANNING CYCLE {tick}/3...
            </span>
          ) : (
            <span className="mono text-[0.60rem] tracking-widest text-center" style={{ color: "rgba(148,163,184,0.4)" }}>
              Showing demo nodes — run a scan to load live data
            </span>
          )}
        </div>
      </div>

      {/* Inspector panel */}
      <div
        className="w-64 border-l shrink-0 flex flex-col"
        style={{ background: "oklch(0.168 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}
      >
        <div
          className="p-4 border-b flex items-center gap-2"
          style={{ borderColor: "oklch(0.28 0.012 255)" }}
        >
          <Database className="w-4 h-4" style={{ color: "rgba(129,140,248,0.8)" }} />
          <span
            className="mono text-[0.65rem] tracking-widest uppercase font-bold"
            style={{ color: "rgba(165,180,252,0.8)" }}
          >
            Sensor Telemetry
          </span>
        </div>

        {sel ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div
              className="flex items-center justify-between pb-2 border-b"
              style={{ borderColor: "oklch(0.28 0.012 255)" }}
            >
              <span className="text-xs font-bold" style={{ color: "oklch(0.94 0.006 255)" }}>
                {sel.name}
              </span>
              <span
                className={`mono text-[0.6rem] font-bold px-1.5 py-0.5 rounded ${
                  sel.status === "HEALTHY"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : sel.status === "WARNING"
                    ? "bg-amber-500/10 text-amber-300"
                    : "bg-red-500/15 text-red-400"
                }`}
              >
                {sel.status}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Category + angle */}
              <div
                className="p-2.5 rounded-lg border"
                style={{ background: "oklch(0.092 0.008 255 / 0.6)", borderColor: "oklch(0.28 0.012 255)" }}
              >
                <span className="mono text-[0.55rem]" style={{ color: "rgba(148,163,184,0.5)" }}>
                  Class:{" "}
                </span>
                <span className="text-xs font-bold" style={{ color: "oklch(0.94 0.006 255)" }}>
                  {sel.category} Unit
                </span>
                <br />
                <span className="mono text-[0.55rem]" style={{ color: "rgba(148,163,184,0.5)" }}>
                  Range:{" "}
                </span>
                <span className="text-xs" style={{ color: "rgba(203,213,225,0.8)" }}>
                  {sel.r}% · {sel.angle}° azimuth
                </span>
              </div>

              {/* Details / summary */}
              <p className="text-[0.7rem] leading-relaxed" style={{ color: "rgba(148,163,184,0.7)" }}>
                &ldquo;{sel.details}&rdquo;
              </p>

              {/* Source link */}
              {sel.sourceUrl && (
                <a
                  href={sel.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.65rem] hover:underline break-all block"
                  style={{ color: "oklch(0.72 0.14 200)" }}
                >
                  View source →
                </a>
              )}

              {/* Critical warning */}
              {sel.status === "CRITICAL" && (
                <div
                  className="p-2.5 rounded-lg border text-xs"
                  style={{ background: "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.2)" }}
                >
                  <p
                    className="font-bold flex items-center gap-1"
                    style={{ color: "rgba(252,165,165,0.9)" }}
                  >
                    <ShieldAlert className="w-3 h-3" />
                    Incident warning triggered
                  </p>
                  <p className="text-[0.65rem] mt-0.5" style={{ color: "rgba(252,165,165,0.6)" }}>
                    Open AI Compliance Desk or Threat Terminal for full analysis.
                  </p>
                </div>
              )}

              {/* Live vs fallback indicator */}
              {!isLive && (
                <p className="mono text-[0.60rem]" style={{ color: "rgba(148,163,184,0.35)" }}>
                  Demo node — run a scan to load live data.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-xs text-center" style={{ color: "rgba(148,163,184,0.5)" }}>
              {isLive
                ? `${nodes.length} live nodes — click any dot to inspect`
                : "Click any node to inspect"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
