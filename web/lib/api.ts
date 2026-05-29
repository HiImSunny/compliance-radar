import type { Alert, Source, HealthResponse } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const api = {
  health: () => get<HealthResponse>("/health"),
  alerts: (severity?: string, limit = 200) =>
    get<Alert[]>("/api/v1/alerts", {
      limit: String(limit),
      ...(severity && severity !== "all" ? { severity } : {}),
    }),
  alert: (id: number) => get<Alert>(`/api/v1/alerts/${id}`),
  sources: () => get<Source[]>("/api/v1/sources"),
  createSource: (body: { name: string; url: string; scan_interval_hours: number }) =>
    post<Source>("/api/v1/sources", body),
  patchSource: (id: number, body: { active?: boolean; scan_interval_hours?: number; name?: string; url?: string }) =>
    patch<Source>(`/api/v1/sources/${id}`, body),
  scan: () => post<{ message: string }>("/api/v1/scan"),
  scanSource: (id: number) => post<{ message: string }>(`/api/v1/sources/${id}/scan`),
  demoReplay: (force = false) => post<{ message: string; sources: Source[]; alerts: Alert[] }>(`/api/v1/demo/replay${force ? "?force=true" : ""}`),
};
