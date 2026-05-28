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

export function ReportsClient() {
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts(500);
  const { data: sources = [], isLoading: sourcesLoading } = useSources();
  const loading = alertsLoading || sourcesLoading;

  // Severity distribution
  const sevCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const a of alerts) {
    if (a.severity in sevCounts) sevCounts[a.severity as keyof typeof sevCounts]++;
  }
  const total = alerts.length || 1;

  // Alerts per source
  const bySource: Record<string, number> = {};
  for (const a of alerts) {
    const name = a.source_name ?? `Source ${a.source_id}`;
    bySource[name] = (bySource[name] ?? 0) + 1;
  }
  const sourceEntries = Object.entries(bySource).sort((a, b) => b[1] - a[1]);
  const maxSourceCount = Math.max(...sourceEntries.map(([, c]) => c), 1);

  // Heatmap: last 28 days (4 weeks × 7 days)
  const now = new Date();
  const heatmapDays: { date: string; label: string; count: number; dayOfWeek: number }[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const count = alerts.filter((a) => a.created_at?.slice(0, 10) === key).length;
    heatmapDays.push({ date: key, label, count, dayOfWeek: d.getDay() });
  }
  const maxHeat = Math.max(...heatmapDays.map((d) => d.count), 1);

  // Group into weeks (columns)
  const weeks: typeof heatmapDays[] = [];
  for (let i = 0; i < heatmapDays.length; i += 7) {
    weeks.push(heatmapDays.slice(i, i + 7));
  }

  return (
    <div className="space-y-8 p-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <span className={MONO_LABEL} style={DIM}>SYS / REPORTS</span>
        <span className={`${MONO_LABEL}`} style={DIM}>
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
          {/* ── Top row: severity + source ─────────────────────────────── */}
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
                      {/* Label */}
                      <span
                        className={`${MONO_LABEL} w-14 shrink-0`}
                        style={{ color: SEV_COLORS[sev] }}
                      >
                        {sev.slice(0, 4).toUpperCase()}
                      </span>

                      {/* Bar track */}
                      <div
                        className="flex-1 h-4 overflow-hidden"
                        style={{
                          background: SEV_BG[sev],
                          borderRadius: "2px",
                        }}
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

                      {/* Count */}
                      <span
                        className="mono text-sm font-bold w-6 text-right tabular-nums"
                        style={{ color: count > 0 ? SEV_COLORS[sev] : "oklch(0.38 0.010 255)" }}
                      >
                        {count > 0 ? <AnimatedNumber value={count} duration={600} /> : "0"}
                      </span>

                      {/* Pct */}
                      <span
                        className={`${MONO_LABEL} w-8 text-right`}
                        style={{ color: "oklch(0.38 0.010 255)" }}
                      >
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

          {/* ── Heatmap calendar ───────────────────────────────────────── */}
          <section>
            <SectionTitle>Alert activity — last 28 days</SectionTitle>
            <div className="mt-3 flex items-start gap-1">
              {/* Day labels */}
              <div className="flex flex-col gap-px justify-around pt-4">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <span key={i} className={MONO_LABEL} style={{ color: "oklch(0.35 0.010 255)", fontSize: "0.55rem" }}>
                    {d}
                  </span>
                ))}
              </div>

              {/* Weeks */}
              <div className="flex gap-px">
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-px">
                    {/* Month label above first week of month */}
                    <div className="h-3 flex items-center">
                      {week[0] && new Date(week[0].date).getDate() <= 7 && (
                        <span className={MONO_LABEL} style={{ color: "oklch(0.38 0.010 255)", fontSize: "0.55rem" }}>
                          {new Date(week[0].date).toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {week.map((day) => {
                      const intensity = day.count === 0 ? 0 : Math.max(0.15, day.count / maxHeat);
                      const isToday = day.date === now.toISOString().slice(0, 10);
                      return (
                        <div
                          key={day.date}
                          className="heatmap-cell rounded-sm"
                          title={`${day.label}: ${day.count} alert${day.count !== 1 ? "s" : ""}`}
                          style={{
                            width: 10, height: 10,
                            background: day.count === 0
                              ? "oklch(0.215 0.010 255)"
                              : `oklch(${0.44 + intensity * 0.28} ${0.14 + intensity * 0.06} 200)`,
                            outline: isToday ? "1px solid oklch(0.72 0.14 200 / 0.6)" : "none",
                            outlineOffset: "1px",
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex flex-col justify-end gap-px pb-0.5">
                <span className={MONO_LABEL} style={{ color: "oklch(0.35 0.010 255)", fontSize: "0.55rem" }}>MORE</span>
                {[1, 0.7, 0.4, 0.15, 0].map((v, i) => (
                  <div
                    key={i}
                    className="rounded-sm"
                    style={{
                      width: 8, height: 8,
                      background: v === 0
                        ? "oklch(0.215 0.010 255)"
                        : `oklch(${0.44 + v * 0.28} ${0.14 + v * 0.06} 200)`,
                    }}
                  />
                ))}
                <span className={MONO_LABEL} style={{ color: "oklch(0.35 0.010 255)", fontSize: "0.55rem" }}>LESS</span>
              </div>
            </div>
          </section>

          {/* ── Source coverage table ──────────────────────────────────── */}
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
                            {/* Mini bar */}
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
