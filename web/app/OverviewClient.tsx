"use client";

import { useState, useCallback } from "react";
import Link from "next/link";import {
  ShieldAlert, ShieldCheck, Cpu, RefreshCw,
  Compass, FileCode, Terminal,
} from "lucide-react";
import { RadarSphere } from "@/app/overview/RadarSphere";
import { useAlerts, useSources, useHealth } from "@/lib/hooks";
import { ComplianceDesk } from "@/app/overview/ComplianceDesk";
import { ThreatTerminal } from "@/app/overview/ThreatTerminal";
import type { Alert } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────

type Priority = "HIGH" | "WARNING" | "INFO" | "RESOLVED";

// Static definition of standards (no scores — scores are computed from live data)
const STANDARD_DEFS = [
  { id: "gdpr",        name: "GDPR Compliance",   color: "oklch(0.60 0.18 155)" },
  { id: "soc2",        name: "SOC2 Type II",       color: "oklch(0.68 0.20 42)"  },
  { id: "iso27001",    name: "ISO 27001 ISMS",     color: "oklch(0.60 0.22 22)"  },
  { id: "gdpr_soc2",   name: "GDPR + SOC2 Combo",  color: "oklch(0.65 0.16 180)" },
  { id: "hipaa",       name: "HIPAA Healthcare",   color: "oklch(0.72 0.18 280)" },
  { id: "finra",       name: "FINRA Rules",        color: "oklch(0.72 0.14 200)" },
  { id: "sec",         name: "SEC Cybersecurity",  color: "oklch(0.68 0.16 60)"  },
];

function sevToPriority(sev: string): Priority {
  if (sev === "critical") return "HIGH";
  if (sev === "high") return "WARNING";
  if (sev === "medium") return "INFO";
  return "RESOLVED";
}

interface Incident {
  id: string;
  alertId: number;
  time: string;
  priority: Priority;
  source: string;
  desc: string;
  details: string;
  impactedDepts: string;
  remediationSteps: string;
  sourceUrl?: string;
  triageText?: string;
  isTriaging?: boolean;
  resolvedAt?: string;
}

function alertToIncident(a: Alert): Incident {
  return {
    id: `INC-${a.id}`,
    alertId: a.id,
    time: new Date(a.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
    priority: sevToPriority(a.severity),
    source: a.source_name ?? `SOURCE_${a.source_id}`,
    desc: a.summary,
    details: a.impacted_depts ?? "",
    impactedDepts: a.impacted_depts ?? "",
    remediationSteps: a.remediation_steps ?? "",
    sourceUrl: a.source_url,
  };
}

/**
 * Compute compliance scores from live alerts.
 * Each critical alert -8, high -4, medium -2, low -1 per standard keyword match.
 * Base score 100, floor 0.
 */
function computeComplianceScores(alerts: Alert[]) {
  const standards = [
    {
      id: "gdpr",
      name: "GDPR Compliance",
      keywords: ["gdpr", "ico", "personal data", "dpia", "data protection", "erasure", "consent", "privacy"],
      color: "oklch(0.60 0.18 155)",
    },
    {
      id: "soc2",
      name: "SOC2 Type II",
      keywords: ["soc2", "soc 2", "mfa", "access control", "docker", "ssh", "authentication", "availability"],
      color: "oklch(0.68 0.20 42)",
    },
    {
      id: "iso27001",
      name: "ISO 27001 ISMS",
      keywords: ["iso 27001", "iso27001", "isms", "vulnerability", "patch", "access registry", "audit log", "information security"],
      color: "oklch(0.60 0.22 22)",
    },
    {
      id: "gdpr_soc2",
      name: "GDPR + SOC2 Combo",
      keywords: ["gdpr", "soc2", "soc 2", "personal data", "access control", "mfa", "consent", "authentication", "privacy", "availability"],
      color: "oklch(0.65 0.16 180)",
    },
    {
      id: "hipaa",
      name: "HIPAA Healthcare",
      keywords: ["hipaa", "hhs", "phi", "healthcare", "medical", "patient", "health data", "covered entity", "ocr"],
      color: "oklch(0.72 0.18 280)",
    },
    {
      id: "finra",
      name: "FINRA Rules",
      keywords: ["finra", "broker", "dealer", "trading", "supervisory", "wsp", "registered representative"],
      color: "oklch(0.72 0.14 200)",
    },
    {
      id: "sec",
      name: "SEC Cybersecurity",
      keywords: ["sec", "cybersecurity disclosure", "8-k", "investor", "material incident", "lr-", "enforcement"],
      color: "oklch(0.68 0.16 60)",
    },
  ];

  const PENALTY: Record<string, number> = { critical: 8, high: 4, medium: 2, low: 1 };

  return standards.map((std) => {
    let deductions = 0;
    for (const alert of alerts) {
      const text = `${alert.summary} ${alert.impacted_depts ?? ""} ${alert.source_name ?? ""}`.toLowerCase();
      const matches = std.keywords.some((kw) => text.includes(kw));
      if (matches) {
        deductions += PENALTY[alert.severity] ?? 1;
      }
    }
    const score = Math.max(0, Math.min(100, 100 - deductions));
    return { ...std, score };
  });
}

// ─── Main Component ───────────────────────────────────────────

export function OverviewClient() {
  const { data: liveAlerts = [] } = useAlerts(200);
  const { data: sources = [] } = useSources();
  const { data: health } = useHealth();

  const [activeTab, setActiveTab] = useState<"radar" | "audit" | "intelligence">("radar");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [triagingIds, setTriagingIds] = useState<Set<string>>(new Set());
  const [triageResults, setTriageResults] = useState<Record<string, string>>({});

  // Build incidents purely from live alerts — no hardcoded fallback
  const incidents: Incident[] = [...liveAlerts]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 15)
    .map(alertToIncident);

  // Compute real compliance scores from live alerts
  // Only compute when we actually have alert data — show N/A when offline
  const complianceStandards = liveAlerts.length > 0
    ? computeComplianceScores(liveAlerts)
    : null;

  const activeSourceCount = sources.filter((s) => s.active).length;
  const criticalAlertCount = liveAlerts.filter((a) => a.severity === "critical").length;
  const openAlertCount = liveAlerts.filter((a) => a.severity !== "low").length;

  // Real AI triage — calls Gemini with full alert context
  const handleTriageIncident = useCallback(async (inc: Incident) => {
    if (triagingIds.has(inc.id)) return;
    setTriagingIds((prev) => new Set(prev).add(inc.id));

    const prompt =
      `Triage this compliance incident:\n\n` +
      `Source: ${inc.source}\n` +
      `Severity: ${inc.priority}\n` +
      `Description: ${inc.desc}\n` +
      (inc.impactedDepts ? `Impacted departments: ${inc.impactedDepts}\n` : "") +
      (inc.remediationSteps ? `Known remediation steps: ${inc.remediationSteps}\n` : "") +
      `\nProvide: (1) root cause assessment, (2) immediate actions with specific commands, (3) timeline recommendation.`;

    try {
      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
      });
      const data = await res.json();
      const text = data.isMock
        ? "Gemini API unavailable — check GEMINI_API_KEY in web/.env.local."
        : (data.text ?? "No response.");
      setTriageResults((prev) => ({ ...prev, [inc.id]: text }));
    } catch {
      setTriageResults((prev) => ({ ...prev, [inc.id]: "Network error — could not reach AI endpoint." }));
    } finally {
      setTriagingIds((prev) => {
        const next = new Set(prev);
        next.delete(inc.id);
        return next;
      });
    }
  }, [triagingIds]);

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden select-none overview-layout">

      {/* ── Left Sidebar ── */}
      <aside
        className="w-56 border-r flex flex-col gap-4 p-4 shrink-0 overflow-y-auto"
        style={{ background: "oklch(0.168 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}
      >
        {/* Standards Matrix — computed from live alerts */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <span className="mono text-[0.70rem] tracking-widest uppercase" style={{ color: "oklch(0.52 0.010 255)" }}>
              Standards
            </span>
            <span
              className="mono text-[0.70rem] px-1.5 py-0.5 rounded"
              style={{ background: "oklch(0.235 0.012 255)", color: "oklch(0.58 0.010 255)" }}
            >
              {STANDARD_DEFS.length}
            </span>
          </div>
          <div className="space-y-2">
            {STANDARD_DEFS.map((std) => {
              const computed = complianceStandards?.find((s) => s.id === std.id);
              const score = computed?.score;
              const hasData = score !== undefined;
              return (
                <div
                  key={std.id}
                  className="p-2.5 rounded-lg border"
                  style={{ background: "oklch(0.192 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold mono" style={{ color: "oklch(0.86 0.008 255)" }}>
                      {std.name}
                    </span>
                    <span
                      className="mono text-[0.70rem] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        color: hasData ? std.color : "oklch(0.38 0.010 255)",
                        background: "oklch(0.192 0.012 255)",
                      }}
                    >
                      {hasData ? `${score}%` : "—"}
                    </span>
                  </div>
                  <div
                    className="w-full h-1 rounded-full overflow-hidden"
                    style={{ background: "oklch(0.235 0.012 255)" }}
                  >
                    {hasData && (
                      <div
                        className="h-full rounded-full bar-fill"
                        style={{ width: `${score}%`, background: std.color }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {!complianceStandards && (
            <p className="mono text-[0.60rem] mt-2" style={{ color: "oklch(0.38 0.010 255)" }}>
              Scores require live alert data.
            </p>
          )}
        </section>

        {/* KPI summary */}
        <section
          className="rounded-xl border p-3.5 flex flex-col gap-2.5"
          style={{ background: "oklch(0.192 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}
        >
          <span className="mono text-[0.70rem] tracking-widest uppercase" style={{ color: "oklch(0.52 0.010 255)" }}>
            System Summary
          </span>
          <div className="space-y-2">
            {[
              {
                label: "Sources active",
                value: `${activeSourceCount} / ${sources.length}`,
                color: "oklch(0.60 0.18 155)",
              },
              {
                label: "Total alerts",
                value: liveAlerts.length,
                color: "oklch(0.72 0.14 200)",
              },
              {
                label: "Critical alerts",
                value: criticalAlertCount,
                color: criticalAlertCount > 0 ? "oklch(0.60 0.22 22)" : "oklch(0.60 0.18 155)",
              },
              {
                label: "Open incidents",
                value: openAlertCount,
                color: openAlertCount > 0 ? "oklch(0.68 0.20 42)" : "oklch(0.60 0.18 155)",
              },
              {
                label: "System status",
                value: health?.status === "ok" ? "LIVE" : "OFFLINE",
                color: health?.status === "ok" ? "oklch(0.60 0.18 155)" : "oklch(0.60 0.22 22)",
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="mono text-[0.65rem]" style={{ color: "oklch(0.44 0.010 255)" }}>
                  {label}
                </span>
                <span className="mono text-xs font-bold" style={{ color }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </section>


      </aside>

      {/* ── Center Panel ── */}
      <section
        className="flex-1 flex flex-col relative overflow-hidden"
        style={{ background: "oklch(0.148 0.012 255)" }}
      >
        {/* Tab bar */}
        <div
          className="px-5 py-3 flex items-center justify-between border-b z-10 shrink-0"
          style={{ borderColor: "oklch(0.28 0.012 255)" }}
        >
          <div
            className="flex items-center gap-1.5 p-1 rounded-lg border"
            style={{ background: "oklch(0.192 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}
          >
            {(
              [
                ["radar", "Radar", Compass],
                ["audit", "AI Compliance Desk", FileCode],
                ["intelligence", "Threat Terminal", Terminal],
              ] as const
            ).map(([tab, label, Icon]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
                style={{
                  background: activeTab === tab ? "oklch(0.52 0.18 255)" : "transparent",
                  color: activeTab === tab ? "white" : "oklch(0.58 0.010 255)",
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
          <div
            className="flex items-center gap-1.5 text-[0.70rem] px-2.5 py-1 rounded-full border"
            style={{ background: "oklch(0.192 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: health?.status === "ok" ? "oklch(0.60 0.18 155)" : "oklch(0.60 0.22 22)",
              }}
            />
            <span className="mono" style={{ color: "oklch(0.52 0.010 255)" }}>
              {health?.status === "ok" ? "System online" : "System offline"}
            </span>
          </div>
        </div>

        {activeTab === "radar" && <RadarSphere />}
        {activeTab === "audit" && <ComplianceDesk />}
        {activeTab === "intelligence" && <ThreatTerminal />}
      </section>

      {/* ── Right Sidebar: Live Alert Register ── */}
      <aside
        className="border-l flex flex-col shrink-0"
        suppressHydrationWarning
        style={{ width: 272, background: "oklch(0.168 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}
      >
        <div
          className="p-4 border-b flex items-center justify-between shrink-0"
          style={{ borderColor: "oklch(0.28 0.012 255)" }}
        >
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" style={{ color: "oklch(0.72 0.14 200)" }} />
            <span
              className="mono text-[0.70rem] uppercase tracking-widest font-extrabold"
              style={{ color: "oklch(0.58 0.010 255)" }}
            >
              Live Alerts
            </span>
          </div>
          <span
            className="mono text-[0.70rem] px-1.5 py-0.5 rounded border font-bold"
            style={{
              background: "oklch(0.192 0.012 255)",
              borderColor: "oklch(0.28 0.012 255)",
              color: criticalAlertCount > 0 ? "oklch(0.82 0.18 22)" : "oklch(0.72 0.14 200)",
            }}
          >
            {liveAlerts.length} total
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {incidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
              <p className="mono text-[0.65rem]" style={{ color: "oklch(0.44 0.010 255)" }}>
                No alerts yet.
              </p>
              <p className="mono text-[0.60rem]" style={{ color: "oklch(0.35 0.010 255)" }}>
                Run a scan or use Demo Replay in the Bright Data page.
              </p>
            </div>
          ) : (
            incidents.map((inc) => {
              const isActive = selectedIncident?.id === inc.id;
              const isTriaging = triagingIds.has(inc.id);
              const triageText = triageResults[inc.id];

              const borderLeft =
                inc.priority === "HIGH"
                  ? "oklch(0.60 0.22 22)"
                  : inc.priority === "WARNING"
                  ? "oklch(0.68 0.20 42)"
                  : inc.priority === "RESOLVED"
                  ? "oklch(0.60 0.18 155)"
                  : "oklch(0.52 0.18 255)";

              const badgeBg =
                inc.priority === "HIGH"
                  ? "oklch(0.235 0.038 22 / 0.5)"
                  : inc.priority === "WARNING"
                  ? "oklch(0.235 0.030 42 / 0.5)"
                  : inc.priority === "RESOLVED"
                  ? "oklch(0.225 0.022 155 / 0.5)"
                  : "oklch(0.235 0.020 255 / 0.5)";

              const badgeColor =
                inc.priority === "HIGH"
                  ? "oklch(0.82 0.18 22)"
                  : inc.priority === "WARNING"
                  ? "oklch(0.80 0.16 42)"
                  : inc.priority === "RESOLVED"
                  ? "oklch(0.76 0.14 155)"
                  : "oklch(0.72 0.14 200)";

              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(isActive ? null : inc)}
                  className={`cursor-pointer p-3 rounded-lg transition-all duration-200 animate-fade-up`}
                  style={{
                    borderLeft: `2px solid ${borderLeft}`,
                    background: isActive ? "oklch(0.235 0.020 255 / 0.5)" : "oklch(0.192 0.012 255)",
                    outline: isActive ? "1px solid oklch(0.52 0.18 255 / 0.3)" : "none",
                    opacity: inc.priority === "RESOLVED" ? 0.6 : 1,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="mono text-[0.70rem] font-bold px-1.5 py-0.5 rounded uppercase"
                      style={{ background: badgeBg, color: badgeColor }}
                    >
                      {inc.priority}
                    </span>
                    <span className="mono text-[0.70rem]" style={{ color: "oklch(0.44 0.010 255)" }}>
                      {inc.time}
                    </span>
                  </div>
                  <p className="mono text-xs font-bold mb-0.5" style={{ color: "oklch(0.82 0.008 255)" }}>
                    {inc.id}
                  </p>
                  <p className="text-xs leading-snug break-words" style={{ color: "oklch(0.58 0.010 255)" }}>
                    {inc.desc.length > 100 ? inc.desc.slice(0, 100) + "…" : inc.desc}
                  </p>

                  {isActive && (
                    <div className="mt-2.5 flex flex-col gap-2">
                      {/* Source */}
                      <div
                        className="border-t pt-2 space-y-1"
                        style={{ borderColor: "oklch(0.28 0.012 255)" }}
                      >
                        <p className="mono text-[0.60rem] uppercase" style={{ color: "oklch(0.44 0.010 255)" }}>
                          Source
                        </p>
                        {inc.sourceUrl ? (
                          <a
                            href={inc.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[0.70rem] hover:underline break-all"
                            style={{ color: "oklch(0.72 0.14 200)" }}
                          >
                            {inc.source}
                          </a>
                        ) : (
                          <p className="text-[0.70rem]" style={{ color: "oklch(0.58 0.010 255)" }}>
                            {inc.source}
                          </p>
                        )}
                      </div>

                      {/* Impacted depts */}
                      {inc.impactedDepts && (
                        <div>
                          <p className="mono text-[0.60rem] uppercase mb-0.5" style={{ color: "oklch(0.44 0.010 255)" }}>
                            Impacted
                          </p>
                          <p className="text-[0.70rem] leading-relaxed" style={{ color: "oklch(0.52 0.010 255)" }}>
                            {inc.impactedDepts}
                          </p>
                        </div>
                      )}

                      {/* Remediation steps */}
                      {inc.remediationSteps && (
                        <div>
                          <p className="mono text-[0.60rem] uppercase mb-0.5" style={{ color: "oklch(0.44 0.010 255)" }}>
                            Remediation
                          </p>
                          <p
                            className="text-[0.65rem] leading-relaxed whitespace-pre-wrap"
                            style={{ color: "oklch(0.58 0.010 255)" }}
                          >
                            {inc.remediationSteps.slice(0, 200)}
                            {inc.remediationSteps.length > 200 ? "…" : ""}
                          </p>
                        </div>
                      )}

                      {/* AI triage result */}
                      {triageText && (
                        <div
                          className="rounded p-2 border text-[0.70rem] leading-relaxed whitespace-pre-wrap"
                          style={{
                            background: "oklch(0.148 0.012 255)",
                            borderColor: "oklch(0.52 0.18 255 / 0.2)",
                            color: "oklch(0.82 0.008 255)",
                          }}
                        >
                          {triageText}
                        </div>
                      )}

                      {/* Actions */}
                      {inc.priority !== "RESOLVED" && (
                        <div className="flex gap-1.5 mt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriageIncident(inc);
                            }}
                            disabled={isTriaging}
                            className="flex-1 py-1.5 rounded text-[0.70rem] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 border btn-press"
                            style={{
                              background: "oklch(0.52 0.18 255 / 0.15)",
                              borderColor: "oklch(0.52 0.18 255 / 0.3)",
                              color: "oklch(0.72 0.14 200)",
                            }}
                          >
                            {isTriaging ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Triaging...
                              </>
                            ) : (
                              <>
                                <Cpu className="w-3 h-3" />
                                Triage with AI
                              </>
                            )}
                          </button>
                          <Link
                            href={`/alerts?id=${inc.alertId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 py-1.5 rounded text-[0.70rem] font-bold transition-all flex items-center justify-center gap-1 border"
                            style={{
                              background: "oklch(0.225 0.022 155 / 0.2)",
                              borderColor: "oklch(0.60 0.18 155 / 0.3)",
                              color: "oklch(0.76 0.14 155)",
                            }}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            Full Detail
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}
