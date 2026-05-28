import type { Severity } from "./types";

export const SEV_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const SEV_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function sevClass(sev: string): string {
  const map: Record<string, string> = {
    critical: "sev-critical",
    high: "sev-high",
    medium: "sev-medium",
    low: "sev-low",
  };
  return map[sev?.toLowerCase()] ?? "";
}

export function sevDotColor(sev: string): string {
  const map: Record<string, string> = {
    critical: "var(--sev-critical-dot)",
    high: "var(--sev-high-dot)",
    medium: "var(--sev-medium-dot)",
    low: "var(--sev-low-dot)",
  };
  return map[sev?.toLowerCase()] ?? "var(--muted-foreground)";
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).replace(",", "");
}
