"use client";

import { useState } from "react";
import { useSources, revalidateAll } from "@/lib/hooks";
import { api } from "@/lib/api";
import type { Source } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/severity";
import { cn } from "@/lib/utils";
import { Plus, RefreshCw, Pause, Play, Globe, Pencil, Check, X } from "lucide-react";

export function SourcesClient() {
  const { data: sources = [], isLoading, mutate } = useSources();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", scan_interval_hours: 6 });
  const [saving, setSaving] = useState(false);
  const [scanningId, setScanningId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; url: string; scan_interval_hours: number }>({ name: "", url: "", scan_interval_hours: 6 });
  const [savingEditId, setSavingEditId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.url.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createSource(form);
      await mutate();
      setForm({ name: "", url: "", scan_interval_hours: 6 });
      setAdding(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add source");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(source: Source) {
    setTogglingId(source.id);
    try {
      await api.patchSource(source.id, { active: !source.active });
      await mutate();
    } catch { /* ignore */ } finally {
      setTogglingId(null);
    }
  }

  async function handleScanOne(sourceId: number) {
    setScanningId(sourceId);
    try {
      await api.scanSource(sourceId);
      // Give backend a moment then revalidate
      setTimeout(() => { revalidateAll(); }, 2000);
    } catch { /* ignore */ } finally {
      setScanningId(null);
    }
  }

  function startEdit(source: Source) {
    setEditingId(source.id);
    setEditForm({ name: source.name, url: source.url, scan_interval_hours: source.scan_interval_hours });
  }

  async function saveEdit(sourceId: number) {
    setSavingEditId(sourceId);
    try {
      await api.patchSource(sourceId, editForm);
      await mutate();
      setEditingId(null);
    } catch { /* ignore */ } finally {
      setSavingEditId(null);
    }
  }

  return (
    <div className="space-y-5 p-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <span className="mono text-[0.60rem] tracking-widest uppercase" style={{ color: "oklch(0.52 0.010 255)" }}>
            SYS / SOURCES
          </span>
          <p className="text-xs mt-0.5" style={{ color: "oklch(0.44 0.010 255)" }}>
            {isLoading ? "Loading…" : `${sources.filter((s) => s.active).length} active · ${sources.length} total`}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setAdding((v) => !v)}
          className="gap-1.5 text-xs h-7"
          style={{ background: "oklch(0.52 0.18 255)", color: "white", border: "none" }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add source
        </Button>
      </div>

      {/* Add form */}
      {adding && (
        <form
          onSubmit={handleAdd}
          className="rounded-lg border p-4 space-y-3"
          style={{ background: "oklch(0.192 0.012 255)", borderColor: "oklch(0.52 0.18 255 / 0.2)" }}
        >
          <p className="mono text-[0.60rem] uppercase tracking-widest font-bold" style={{ color: "oklch(0.72 0.14 200)" }}>
            New regulatory source
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="mono text-[0.60rem] uppercase tracking-widest" style={{ color: "oklch(0.52 0.010 255)" }}>Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. GDPR.eu"
                className="w-full h-7 rounded border px-3 text-xs outline-none focus:ring-1 focus:ring-ring"
                style={{ background: "oklch(0.148 0.012 255)", borderColor: "oklch(0.28 0.012 255)", color: "oklch(0.86 0.008 255)" }}
              />
            </div>
            <div className="space-y-1">
              <label className="mono text-[0.60rem] uppercase tracking-widest" style={{ color: "oklch(0.52 0.010 255)" }}>URL</label>
              <input
                required
                type="url"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://…"
                className="w-full h-7 rounded border px-3 text-xs outline-none focus:ring-1 focus:ring-ring"
                style={{ background: "oklch(0.148 0.012 255)", borderColor: "oklch(0.28 0.012 255)", color: "oklch(0.86 0.008 255)" }}
              />
            </div>
          </div>
          <div className="space-y-1 w-40">
            <label className="mono text-[0.60rem] uppercase tracking-widest" style={{ color: "oklch(0.52 0.010 255)" }}>
              Scan interval (hours)
            </label>
            <input
              type="number"
              min={1}
              max={168}
              value={form.scan_interval_hours}
              onChange={(e) => setForm((f) => ({ ...f, scan_interval_hours: Number(e.target.value) }))}
              className="w-full h-7 rounded border px-3 text-xs outline-none focus:ring-1 focus:ring-ring"
              style={{ background: "oklch(0.148 0.012 255)", borderColor: "oklch(0.28 0.012 255)", color: "oklch(0.86 0.008 255)" }}
            />
          </div>
          {error && <p className="mono text-[0.60rem]" style={{ color: "oklch(0.60 0.22 22)" }}>{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving} className="h-7 text-xs"
              style={{ background: "oklch(0.52 0.18 255)", color: "white", border: "none" }}>
              {saving ? "Saving…" : "Add source"}
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => { setAdding(false); setError(null); }}
              style={{ borderColor: "oklch(0.28 0.012 255)", color: "oklch(0.58 0.010 255)" }}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Sources table */}
      <div
        className="overflow-hidden"
        style={{ border: "1px solid oklch(0.28 0.012 255)", borderRadius: "var(--radius)", background: "oklch(0.192 0.012 255)" }}
      >
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" style={{ background: "oklch(0.215 0.012 255)" }} />)}
          </div>
        ) : sources.length === 0 ? (
          <div className="px-6 py-10 text-center mono text-xs" style={{ color: "oklch(0.44 0.010 255)" }}>
            No sources configured. Add one above.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid oklch(0.28 0.012 255)", background: "oklch(0.168 0.012 255)" }}>
                {["Source", "Status", "Interval", "Last scan", "Actions"].map((h, i) => (
                  <th key={h} className={cn(
                    "px-3 py-2 mono text-[0.60rem] tracking-widest uppercase",
                    i === 4 ? "text-right" : "text-left"
                  )} style={{ color: "oklch(0.52 0.010 255)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sources.map((source, idx) => {
                const isEditing = editingId === source.id;
                return (
                  <tr
                    key={source.id}
                    style={{
                      borderBottom: idx < sources.length - 1 ? "1px solid oklch(0.245 0.010 255)" : "none",
                      background: isEditing ? "oklch(0.215 0.020 255)" : "transparent",
                    }}
                  >
                    {/* Source name + URL */}
                    <td className="px-3 py-2.5">
                      {isEditing ? (
                        <div className="flex flex-col gap-1">
                          <input
                            value={editForm.name}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            className="h-6 rounded border px-2 text-xs outline-none w-full"
                            style={{ background: "oklch(0.148 0.012 255)", borderColor: "oklch(0.52 0.18 255 / 0.4)", color: "oklch(0.86 0.008 255)" }}
                          />
                          <input
                            value={editForm.url}
                            onChange={(e) => setEditForm((f) => ({ ...f, url: e.target.value }))}
                            className="h-6 rounded border px-2 text-xs outline-none w-full"
                            style={{ background: "oklch(0.148 0.012 255)", borderColor: "oklch(0.28 0.012 255)", color: "oklch(0.58 0.010 255)" }}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 shrink-0" style={{ color: "oklch(0.44 0.010 255)" }} />
                          <div>
                            <p className="text-xs font-medium" style={{ color: "oklch(0.86 0.008 255)" }}>{source.name}</p>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mono text-[0.60rem] hover:underline truncate block max-w-xs"
                              style={{ color: "oklch(0.44 0.010 255)" }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {source.url}
                            </a>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2.5">
                      <span
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 mono text-[0.60rem] font-bold"
                        style={{
                          background: source.active ? "oklch(0.225 0.022 155 / 0.3)" : "oklch(0.215 0.010 255)",
                          color: source.active ? "oklch(0.76 0.14 155)" : "oklch(0.44 0.010 255)",
                          border: `1px solid ${source.active ? "oklch(0.60 0.18 155 / 0.3)" : "oklch(0.28 0.012 255)"}`,
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: source.active ? "oklch(0.60 0.18 155)" : "oklch(0.38 0.010 255)" }}
                        />
                        {source.active ? "ACTIVE" : "PAUSED"}
                      </span>
                    </td>

                    {/* Interval */}
                    <td className="px-3 py-2.5">
                      {isEditing ? (
                        <input
                          type="number"
                          min={1}
                          max={168}
                          value={editForm.scan_interval_hours}
                          onChange={(e) => setEditForm((f) => ({ ...f, scan_interval_hours: Number(e.target.value) }))}
                          className="h-6 w-16 rounded border px-2 mono text-xs outline-none"
                          style={{ background: "oklch(0.148 0.012 255)", borderColor: "oklch(0.28 0.012 255)", color: "oklch(0.82 0.008 255)" }}
                        />
                      ) : (
                        <span className="mono text-xs" style={{ color: "oklch(0.52 0.010 255)" }}>{source.scan_interval_hours}h</span>
                      )}
                    </td>

                    {/* Last scan */}
                    <td className="px-3 py-2.5 mono text-[0.65rem]" style={{ color: "oklch(0.44 0.010 255)" }}>
                      {source.last_scan_at ? formatDate(source.last_scan_at) : "Never"}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {isEditing ? (
                          <>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1"
                              disabled={savingEditId === source.id}
                              onClick={() => saveEdit(source.id)}
                              style={{ color: "oklch(0.72 0.14 200)" }}>
                              <Check className="h-3 w-3" />
                              {savingEditId === source.id ? "Saving…" : "Save"}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1"
                              onClick={() => setEditingId(null)}
                              style={{ color: "oklch(0.52 0.010 255)" }}>
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1"
                              disabled={scanningId === source.id}
                              onClick={() => handleScanOne(source.id)}
                              style={{ color: "oklch(0.58 0.010 255)" }}>
                              <RefreshCw className={cn("h-3 w-3", scanningId === source.id && "animate-spin")} />
                              Scan
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1"
                              onClick={() => startEdit(source)}
                              style={{ color: "oklch(0.58 0.010 255)" }}>
                              <Pencil className="h-3 w-3" />
                              Edit
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1"
                              disabled={togglingId === source.id}
                              onClick={() => handleToggle(source)}
                              style={{ color: "oklch(0.58 0.010 255)" }}>
                              {source.active ? <><Pause className="h-3 w-3" />Pause</> : <><Play className="h-3 w-3" />Resume</>}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
