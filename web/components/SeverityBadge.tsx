import { cn } from "@/lib/utils";

const LABEL: Record<string, string> = {
  critical: "CRIT",
  high:     "HIGH",
  medium:   "MED",
  low:      "LOW",
};

const PILL_CLASS: Record<string, string> = {
  critical: "sev-pill sev-pill-critical",
  high:     "sev-pill sev-pill-high",
  medium:   "sev-pill sev-pill-medium",
  low:      "sev-pill sev-pill-low",
};

const DOT_CLASS: Record<string, string> = {
  critical: "sev-dot sev-dot-critical",
  high:     "sev-dot sev-dot-high",
  medium:   "sev-dot sev-dot-medium",
  low:      "sev-dot sev-dot-low",
};

interface Props {
  severity: string;
  className?: string;
  variant?: "pill" | "dot-label";
}

export function SeverityBadge({ severity, className, variant = "pill" }: Props) {
  const key = severity?.toLowerCase() ?? "";
  const label = LABEL[key] ?? key.toUpperCase();

  if (variant === "dot-label") {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <span className={DOT_CLASS[key] ?? "sev-dot"} />
        <span
          className="mono text-xs font-semibold"
          style={{ color: `var(--sev-${key}-text, var(--muted-foreground))` }}
        >
          {label}
        </span>
      </span>
    );
  }

  return (
    <span className={cn(PILL_CLASS[key] ?? "sev-pill sev-pill-unknown", className)}>
      {label}
    </span>
  );
}
