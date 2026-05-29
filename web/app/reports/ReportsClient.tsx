"use client";

import { useAlerts, useSources } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/AnimatedNumber";

const SEV_COLORS: Record<string, string> = {
  critical: "var(--sev-critical-dot)",
  high:     "var(--sev-high-dot)",
  medium:   "var(--sev-medium-dot)",
  low:      "var(--sev-low-dot)",
};

const SEV_BG: Record<string, string> = {
  critical: "var(--sev-critical-bg)",
  high:     "var(--sev-high-bg)",
  medium:   "var(--sev-medium-bg)",
  low:      "var(--sev-low-bg)",
};

const MONO_LABEL = "mono text-[0.60rem] tracking-widest uppercase";
const DIM = { color: "oklch(0.52 0.010 255)" };
const DIM2 = { color: "oklch(0.42 0.010 255)" };

export function ReportsClient() {
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts(500);
  const { data: sources = [], isLoading: sourcesLoading } = useSources();
  const loading = alertsLoading || sourcesLoading;

  const sevCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const a of alerts) {
    if (a.severity in sevCounts) sevCounts[a.severity as keyof typeof sevCounts]++;
  }
  const total = alerts.length || 1;

  const bySource: Record<string, number> = {};
  for (const a of alerts) {
    const name = a.source_name ?? `Source ${a.source_id}`;
    bySource[name] = (bySource[name] ?? 0) + 1;
  }
  const sourceEntries = Object.entries(bySource).sort((a, b) => b[1] - a[1]);
  const maxSourceCount = Math.max(...sourceEntries.map(([, c]) => c), 1);

  // ── 90-day timeline ───────────────────────────────────────────────
  const now = new Date();
  const DAYS = 90;
  const dayData: { date: string; label: string; count: number; dayOfWeek: number; full: Date }[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const count = alerts.filter((a) => a.created_at?.slice(0, 10) === key).length;
    dayData.push({ date: key, label, count, dayOfWeek: d.getDay(), full: d });
  }
  const maxDayCount = Math.max(...dayData.map((d) => d.count), 1);
  const totalAlerts = alerts.length;
  const avgDaily = (totalAlerts / DAYS).toFixed(1);
  const busiestDay = dayData.reduce((a, b) => (a.count >= b.count ? a : b), dayData[0]);

  // Group into weeks for heatmap — pad start so first day aligns to correct weekday
  const firstDayOfWeek = dayData[0].dayOfWeek; // 0=Sun
  const paddedDays = [
    ...Array.from({ length: firstDayOfWeek }, (_, i) => null), // leading nulls
    ...dayData,
  ];
  const weeks: (typeof dayData[0] | null)[][] = [];
  for (let i = 0; i < paddedDays.length; i += 7) {
    weeks.push(paddedDays.slice(i, i + 7));
  }

  return (
    <div className="space-y-8 p-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <span className={MONO_LABEL} style={DIM}>REPORTS</span>
        <span className={MONO_LABEL} style={DIM}>
          {loading ? "…" : `${alerts.length} alerts · ${sources.length} sources`}
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded" style={{ background: "oklch(0.215 0.012 255)" }} />
          ))}
        </div>
      ) : (
        <>
          {/* ── Alert Activity (hero section) ───────────────────────── */}
          <section>
            <SectionTitle>Alert activity — last 90 days</SectionTitle>

            {/* Summary stats */}
            <div className="flex gap-8 mt-4 mb-5">
              {[
                { label: "Total", value: totalAlerts, color: "oklch(0.86 0.008 255)" },
                { label: "Avg / day", value: avgDaily, color: "oklch(0.58 0.010 255)" },
                { label: "Busiest", value: `${busiestDay.count} (${busiestDay.label})`, color: "var(--sev-critical-dot)" },
                { label: "Active sources", value: sources.filter(s => s.active).length, color: "oklch(0.76 0.14 155)" },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col gap-0.5">
                  <span className={MONO_LABEL} style={DIM2}>{stat.label}</span>
                  <span className="mono text-lg font-bold tabular-nums" style={{ color: stat.color }}>
                    {typeof stat.value === "number" ? <AnimatedNumber value={stat.value} duration={600} /> : stat.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Daily bar chart — show last 90 days */}
            <div className="mt-4">
              <div className="flex items-end gap-[1px] h-24">
                {dayData.map((day) => {
                  const heightPct = (day.count / maxDayCount) * 100;
                  const isToday = day.date === now.toISOString().slice(0, 10);
                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center justify-end group relative"
                    >
                      <div
                        className="w-full bar-fill rounded-[1px]"
                        title={`${day.label}: ${day.count} alerts`}
                        style={{
                          height: `${Math.max(heightPct, day.count > 0 ? 8 : 2)}%`,
                          background: day.count === 0
                            ? "oklch(0.26 0.010 255)"
                            : `oklch(${0.44 + (day.count / maxDayCount) * 0.32} ${0.14 + (day.count / maxDayCount) * 0.06} 200)`,
                          opacity: isToday ? 1 : 0.85,
                          minHeight: day.count > 0 ? "4px" : "2px",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              {/* Month labels — show at start of each month */}
              <div className="flex mt-1.5 relative h-4">
                {dayData.map((day, i) => {
                  const isFirstOfMonth = day.full.getDate() === 1 || i === 0;
                  if (!isFirstOfMonth) return <div key={day.date} className="flex-1" />;
                  return (
                    <div key={day.date} className="flex-1 relative">
                      <span
                        className={MONO_LABEL}
                        style={{ color: "oklch(0.42 0.010 255)", fontSize: "0.50rem", position: "absolute", left: 0, whiteSpace: "nowrap" }}
                      >
                        {day.full.toLocaleDateString("en-US", { month: "short" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Heatmap grid — GitHub-style, 90 days */}
            <div className="flex items-start gap-2 mt-6 overflow-x-auto pb-1">
              {/* Day-of-week labels */}
              <div className="flex flex-col shrink-0" style={{ paddingTop: "1.4rem", gap: "3px" }}>
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <span
                    key={i}
                    className={MONO_LABEL}
                    style={{ color: "oklch(0.35 0.010 255)", fontSize: "0.50rem", lineHeight: "14px", height: 14 }}
                  >
                    {i % 2 === 1 ? d : ""}
                  </span>
                ))}
              </div>

              {/* Week columns */}
              <div className="flex gap-[3px]">
                {weeks.map((week, wi) => {
                  // Find first real day in this week to show month label
                  const firstReal = week.find((d) => d !== null);
                  const showMonth = firstReal && (firstReal.full.getDate() <= 7 || wi === 0);
                  return (
                    <div key={wi} className="flex flex-col gap-[3px]">
                      {/* Month label row */}
                      <div className="h-[1.2rem] flex items-center">
                        {showMonth && (
                          <span className={MONO_LABEL} style={{ color: "oklch(0.42 0.010 255)", fontSize: "0.50rem", whiteSpace: "nowrap" }}>
                            {firstReal!.full.toLocaleDateString("en-US", { month: "short" })}
                          </span>
                        )}
                      </div>
                      {week.map((day, di) => {
                        if (!day) {
                          return <div key={`empty-${wi}-${di}`} style={{ width: 14, height: 14 }} />;
                        }
                        const intensity = day.count === 0 ? 0 : Math.max(0.15, day.count / maxDayCount);
                        const isToday = day.date === now.toISOString().slice(0, 10);
                        return (
                          <div
                            key={day.date}
                            className="rounded-sm heatmap-cell"
                            title={`${day.label}: ${day.count} alert${day.count !== 1 ? "s" : ""}`}
                            style={{
                              width: 14,
                              height: 14,
                              background: day.count === 0
                                ? "oklch(0.215 0.010 255)"
                                : `oklch(${0.44 + intensity * 0.28} ${0.14 + intensity * 0.06} 200)`,
                              outline: isToday ? "1px solid oklch(0.72 0.14 200 / 0.7)" : "none",
                              outlineOffset: "1px",
                            }}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-col justify-end gap-[3px] pb-px ml-1 shrink-0">
                <span className={MONO_LABEL} style={{ color: "oklch(0.35 0.010 255)", fontSize: "0.50rem", lineHeight: "12px" }}>MORE</span>
                {[1, 0.7, 0.4, 0.15, 0].map((v, i) => (
                  <div
                    key={i}
                    className="rounded-sm"
                    style={{
                      width: 12,
                      height: 12,
                      background: v === 0
                        ? "oklch(0.215 0.010 255)"
                        : `oklch(${0.44 + v * 0.28} ${0.14 + v * 0.06} 200)`,
                    }}
                  />
                ))}
                <span className={MONO_LABEL} style={{ color: "oklch(0.35 0.010 255)", fontSize: "0.50rem", lineHeight: "12px" }}>LESS</span>
              </div>
            </div>
          </section>

          {/* ── Severity + Source row ────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-6">

            {/* Severity distribution */}
            <section>
              <SectionTitle>Severity distribution</SectionTitle>
              <div className="space-y-2.5 mt-3">
                {(["critical", "high", "medium", "low"] as const).map((sev, idx) => {
                  const count = sevCounts[sev];
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={sev} className="flex items-center gap-3">
                      <span className={`${MONO_LABEL} w-14 shrink-0`} style={{ color: SEV_COLORS[sev] }}>
                        {sev.slice(0, 4).toUpperCase()}
                      </span>
                      <div
                        className="flex-1 h-4 overflow-hidden"
                        style={{ background: SEV_BG[sev], borderRadius: "2px" }}
                      >
                        <div
                          className="h-full bar-fill"
                          style={{
                            width: `${pct}%`,
                            background: SEV_COLORS[sev],
                            borderRadius: "2px",
                            minWidth: count > 0 ? "4px" : "0",
                            animationDelay: `${idx * 80}ms`,
                          }}
                        />
                      </div>
                      <span
                        className="mono text-sm font-bold w-6 text-right tabular-nums"
                        style={{ color: count > 0 ? SEV_COLORS[sev] : "oklch(0.38 0.010 255)" }}
                      >
                        {count > 0 ? <AnimatedNumber value={count} duration={600} /> : "0"}
                      </span>
                      <span className={`${MONO_LABEL} w-8 text-right`} style={{ color: "oklch(0.38 0.010 255)" }}>
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Alerts by source */}
            <section>
              <SectionTitle>Alerts by source</SectionTitle>
              {sourceEntries.length === 0 ? (
                <p className={`${MONO_LABEL} mt-3`} style={DIM}>NO DATA</p>
              ) : (
                <div className="space-y-2.5 mt-3">
                  {sourceEntries.map(([name, count], idx) => (
                    <div key={name} className="flex items-center gap-3">
                      <span
                        className="text-xs truncate w-36 shrink-0"
                        style={{ color: "oklch(0.72 0.008 255)" }}
                        title={name}
                      >
                        {name}
                      </span>
                      <div
                        className="flex-1 h-4 overflow-hidden"
                        style={{ background: "oklch(0.215 0.012 255)", borderRadius: "2px" }}
                      >
                        <div
                          className="h-full bar-fill"
                          style={{
                            width: `${Math.round((count / maxSourceCount) * 100)}%`,
                            background: "oklch(0.72 0.14 200)",
                            borderRadius: "2px",
                            minWidth: "4px",
                            animationDelay: `${idx * 60}ms`,
                          }}
                        />
                      </div>
                      <span
                        className="mono text-sm font-bold w-6 text-right tabular-nums"
                        style={{ color: "oklch(0.72 0.14 200)" }}
                      >
                        <AnimatedNumber value={count} duration={500} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ── Source coverage table ────────────────────────────────── */}
          <section>
            <SectionTitle>Source coverage</SectionTitle>
            <div
              className="mt-3 overflow-hidden"
              style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)" }}
            >
              <table className="w-full">
                <thead style={{ background: "oklch(0.168 0.012 255)", borderBottom: "1px solid var(--border)" }}>
                  <tr>
                    {["Source", "Status", "Interval", "Alerts"].map((h, i) => (
                      <th
                        key={h}
                        className={`px-3 py-2 text-left ${MONO_LABEL} ${i === 3 ? "text-right" : ""}`}
                        style={DIM}
                      >
                        {h.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sources.map((src, idx) => {
                    const count = bySource[src.name] ?? 0;
                    const pct = alerts.length > 0 ? Math.round((count / alerts.length) * 100) : 0;
                    return (
                      <tr
                        key={src.id}
                        className="data-row"
                        style={{
                          borderBottom: idx < sources.length - 1 ? "1px solid oklch(0.245 0.010 255)" : "none",
                          background: "var(--card)",
                        }}
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-1.5 w-1.5 rounded-full shrink-0"
                              style={{
                                background: src.active ? "var(--sev-low-dot)" : "oklch(0.38 0.010 255)",
                                boxShadow: src.active ? "0 0 4px var(--sev-low-dot)" : "none",
                              }}
                            />
                            <span className="text-xs font-medium" style={{ color: "oklch(0.82 0.008 255)" }}>
                              {src.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`${MONO_LABEL}`}
                            style={{ color: src.active ? "var(--sev-low-fg)" : "oklch(0.42 0.010 255)" }}
                          >
                            {src.active ? "ACTIVE" : "PAUSED"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 mono text-xs" style={{ color: "oklch(0.52 0.010 255)" }}>
                          {src.scan_interval_hours}h
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div
                              className="h-1.5 w-16 overflow-hidden"
                              style={{ background: "oklch(0.215 0.012 255)", borderRadius: "1px" }}
                            >
                              <div
                                className="h-full bar-fill"
                                style={{
                                  width: `${pct}%`,
                                  background: "oklch(0.72 0.14 200 / 0.7)",
                                  borderRadius: "1px",
                                  minWidth: count > 0 ? "2px" : "0",
                                }}
                              />
                            </div>
                            <span className="mono text-sm font-bold tabular-nums" style={{ color: "oklch(0.82 0.008 255)" }}>
                              {count > 0 ? <AnimatedNumber value={count} duration={500} /> : "0"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="mono text-[0.60rem] tracking-widest uppercase pb-1.5"
      style={{
        color: "oklch(0.52 0.010 255)",
        borderBottom: "1px solid oklch(0.245 0.010 255)",
      }}
    >
      {children}
    </h2>
  );
}
