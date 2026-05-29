"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAlerts, revalidateAll } from "@/lib/hooks";
import { api } from "@/lib/api";
import type { Alert } from "@/lib/types";
import { SeverityBadge } from "@/components/SeverityBadge";
import { formatDate, SEV_ORDER } from "@/lib/severity";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;
type SortKey = "severity" | "newest" | "oldest";

const TH = "px-3 py-2 text-left mono text-[0.60rem] tracking-widest uppercase";
const TH_COLOR = { color: "oklch(0.62 0.010 255)" };

export function AlertsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id") ? Number(searchParams.get("id")) : null;

  const { data: alerts = [], isLoading } = useAlerts(500);
  const [selectedId, setSelectedId] = useState<number | null>(initialId);
  const [sevFilter, setSevFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("severity");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [scanning, setScanning] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let list = alerts;
    if (sevFilter !== "all") list = list.filter((a) => a.severity === sevFilter);
    if (search) {
      const t = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.summary?.toLowerCase().includes(t) ||
          a.source_name?.toLowerCase().includes(t) ||
          a.impacted_depts?.toLowerCase().includes(t)
      );
    }
    if (sortKey === "severity") list = [...list].sort((a, b) => (SEV_ORDER[a.severity] ?? 99) - (SEV_ORDER[b.severity] ?? 99));
    else if (sortKey === "newest") list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else list = [...list].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return list;
  }, [alerts, sevFilter, sortKey, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageAlerts = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const selectedAlert = selectedId != null ? alerts.find((a) => a.id === selectedId) : null;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) {
      e.preventDefault();
      searchRef.current?.focus();
      return;
    }
    if (e.key === "Escape") {
      clearSelection();
      return;
    }
    if (e.key === "j" || e.key === "k") {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) return;
      e.preventDefault();
      const visibleIds = pageAlerts.map(a => a.id);
      if (visibleIds.length === 0) return;
      const currentIdx = selectedId != null ? visibleIds.indexOf(selectedId) : -1;
      const nextIdx = e.key === "j"
        ? Math.min(currentIdx + 1, visibleIds.length - 1)
        : Math.max(currentIdx - 1, 0);
      selectAlert(visibleIds[nextIdx]);
    }
  }, [pageAlerts, selectedId]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  async function handleScan() {
    setScanning(true);
    try { await api.scan(); revalidateAll(); } catch (e) { console.error("Scan failed:", e); } finally { setScanning(false); }
  }

  function selectAlert(id: number) {
    setSelectedId(id);
    router.replace(`/alerts?id=${id}`, { scroll: false });
  }

  function clearSelection() {
    setSelectedId(null);
    router.replace("/alerts", { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3 h-full p-6 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="mono text-[0.65rem] tracking-widest uppercase mr-2" style={{ color: "oklch(0.64 0.010 255)" }}>
          ALERTS
        </span>

        <input
          ref={searchRef}
          type="search"
          placeholder="Search…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="h-7 rounded border px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring w-52"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
            color: "oklch(0.86 0.008 255)",
          }}
        />

        <Select value={sevFilter} onValueChange={(v) => { setSevFilter(v ?? "all"); setPage(0); }}>
          <SelectTrigger className="h-7 w-32 text-xs border-border bg-card" style={{ color: "oklch(0.60 0.010 255)" }}>
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortKey} onValueChange={(v) => setSortKey((v ?? "severity") as SortKey)}>
          <SelectTrigger className="h-7 w-32 text-xs border-border bg-card" style={{ color: "oklch(0.60 0.010 255)" }}>
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="severity">By severity</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
          </SelectContent>
        </Select>

        <span className="mono text-[0.65rem]" style={{ color: "oklch(0.62 0.010 255)" }}>
          [{isLoading ? "…" : filtered.length}]
        </span>
        <span className="mono text-[0.55rem] tracking-widest hidden sm:inline" style={{ color: "oklch(0.38 0.010 255)" }}>
          / search · j/k nav · esc close
        </span>

        <div className="ml-auto">
          <Button
            size="sm"
            onClick={handleScan}
            disabled={scanning}
            className="h-7 gap-1.5 text-xs"
          >
            <RefreshCw className={cn("h-3 w-3", scanning && "animate-spin")} />
            {scanning ? "Scanning…" : "Scan"}
          </Button>
        </div>
      </div>

      {/* Split pane */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* List */}
        <div
          className="flex flex-col flex-1 min-w-0 overflow-hidden"
          style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--card)" }}
        >
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-3 space-y-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 rounded-none" style={{ background: "oklch(0.215 0.012 255)" }} />
                ))}
              </div>
            ) : pageAlerts.length === 0 ? (
              <div className="px-6 py-10 text-center mono text-xs" style={{ color: "oklch(0.62 0.010 255)" }}>
                NO RESULTS
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 z-10" style={{ background: "oklch(0.168 0.012 255)" }}>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th className={`${TH} w-20`} style={TH_COLOR}>SEV</th>
                    <th className={`${TH} w-36`} style={TH_COLOR}>SOURCE</th>
                    <th className={TH} style={TH_COLOR}>SUMMARY</th>
                    <th className={`${TH} w-24`} style={TH_COLOR}>TIME</th>
                  </tr>
                </thead>
                <tbody>
                  {pageAlerts.map((alert) => (
                    <tr
                      key={alert.id}
                      className={cn("data-row", selectedId === alert.id && "active")}
                      style={{ borderBottom: "1px solid oklch(0.245 0.010 255)" }}
                      onClick={() => selectAlert(alert.id)}
                    >
                      <td className="px-3 py-2"><SeverityBadge severity={alert.severity} /></td>
                      <td className="px-3 py-2 text-xs font-medium truncate max-w-[140px]" style={{ color: "oklch(0.90 0.008 255)" }}>
                        {alert.source_name ?? `Source ${alert.source_id}`}
                      </td>
                      <td className="px-3 py-2 text-xs" style={{ color: "oklch(0.62 0.008 255)" }}>
                        <span className="line-clamp-1">{alert.summary}</span>
                      </td>
                      <td className="px-3 py-2 mono text-[0.65rem] whitespace-nowrap" style={{ color: "oklch(0.50 0.008 255)" }}>
                        {formatDate(alert.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!isLoading && totalPages > 1 && (
            <div
              className="flex items-center justify-between px-3 py-1.5"
              style={{ borderTop: "1px solid var(--border)", background: "oklch(0.168 0.012 255)" }}
            >
              <Button size="sm" variant="ghost" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} className="h-6 gap-1 mono text-[0.65rem]" style={{ color: "oklch(0.58 0.010 255)" }}>
                <ChevronLeft className="h-3 w-3" /> PREV
              </Button>
              <span className="mono text-[0.60rem]" style={{ color: "oklch(0.50 0.010 255)" }}>
                {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} / {filtered.length}
              </span>
              <Button size="sm" variant="ghost" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)} className="h-6 gap-1 mono text-[0.65rem]" style={{ color: "oklch(0.58 0.010 255)" }}>
                NEXT <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Detail */}
        <div
          className="w-72 shrink-0 overflow-y-auto"
          style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--card)" }}
        >
          {selectedAlert ? (
            <AlertDetail key={selectedAlert.id} alert={selectedAlert} onClose={clearSelection} />
          ) : (
            <div className="flex items-center justify-center h-full mono text-[0.65rem] tracking-widest uppercase px-6 text-center" style={{ color: "oklch(0.42 0.010 255)" }}>
              SELECT ALERT
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertDetail({ alert, onClose }: { alert: Alert; onClose: () => void }) {
  const depts = alert.impacted_depts?.split(",").map((d) => d.trim()).filter(Boolean) ?? [];
  const steps = alert.remediation_steps?.split("\n").map((s) => s.trim()).filter(Boolean) ?? [];

  return (
    <div className="p-4 space-y-4 slide-in-right">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5">
          <SeverityBadge severity={alert.severity} />
          <p className="text-xs font-semibold leading-snug mt-1" style={{ color: "oklch(0.90 0.008 255)" }}>
            {alert.source_name ?? `Source ${alert.source_id}`}
          </p>
          <p className="mono text-[0.60rem]" style={{ color: "oklch(0.50 0.010 255)" }}>
            #{alert.id} · {formatDate(alert.created_at)}
          </p>
        </div>
        <button onClick={onClose} className="transition-colors mt-0.5" style={{ color: "oklch(0.50 0.010 255)" }} aria-label="Close">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div style={{ height: "1px", background: "var(--border)" }} />

      {alert.summary && (
        <section>
          <DLabel>Summary</DLabel>
          <p className="text-xs leading-relaxed" style={{ color: "oklch(0.78 0.008 255)" }}>{alert.summary}</p>
        </section>
      )}

      {depts.length > 0 && (
        <section>
          <DLabel>Impacted</DLabel>
          <div className="flex flex-wrap gap-1">
            {depts.map((d) => (
              <span
                key={d}
                className="mono text-[0.60rem] px-1.5 py-0.5"
                style={{
                  background: "oklch(0.235 0.012 255)",
                  color: "oklch(0.66 0.010 255)",
                  border: "1px solid var(--border)",
                  borderRadius: "2px",
                }}
              >
                {d}
              </span>
            ))}
          </div>
        </section>
      )}

      {steps.length > 0 && (
        <section>
          <DLabel>Remediation</DLabel>
          <ol className="space-y-1.5">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed" style={{ color: "oklch(0.72 0.008 255)" }}>
                <span className="mono shrink-0" style={{ color: "oklch(0.50 0.010 255)" }}>{i + 1}.</span>
                <span>{step.replace(/^\d+\.\s*/, "")}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {alert.source_url && (
        <section>
          <DLabel>Source</DLabel>
          <a
            href={alert.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs hover:underline break-all"
            style={{ color: "oklch(0.72 0.14 200)" }}
          >
            {alert.source_name ?? alert.source_url}
          </a>
        </section>
      )}
    </div>
  );
}

function DLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mono text-[0.60rem] tracking-widest uppercase mb-1.5" style={{ color: "oklch(0.50 0.010 255)" }}>
      {children}
    </p>
  );
}
