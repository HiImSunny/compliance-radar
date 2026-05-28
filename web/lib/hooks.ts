import useSWR, { mutate } from "swr";
import { api } from "./api";
import type { Alert, Source, HealthResponse } from "./types";

// Shared fetchers — SWR deduplicates concurrent calls with the same key
export function useAlerts(limit = 500) {
  return useSWR<Alert[]>(["alerts", limit], () => api.alerts(undefined, limit), {
    revalidateOnFocus: false,
    dedupingInterval: 10_000,
  });
}

export function useSources() {
  return useSWR<Source[]>("sources", api.sources, {
    revalidateOnFocus: false,
    dedupingInterval: 10_000,
  });
}

export function useHealth() {
  return useSWR<HealthResponse>("health", api.health, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
    dedupingInterval: 10_000,
  });
}

// Invalidate all data (after scan / demo replay)
export function revalidateAll() {
  mutate(() => true, undefined, { revalidate: true });
}
