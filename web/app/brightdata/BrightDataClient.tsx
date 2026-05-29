"use client";

import { useState } from "react";
import { useHealth, useSources } from "@/lib/hooks";
import { api } from "@/lib/api";
import { Zap, Globe, RefreshCw, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/AnimatedNumber";

const MONO = "font-mono text-[0.60rem] tracking-widest uppercase";
const DIM = { color: "oklch(0.52 0.010 255)" };

function StatBlock({ label, value, unit, accent }: { label: string; value: string | number; unit?: string; accent?: string }) {
  return (
    <div
      className="flex flex-col gap-1 p-4 rounded-lg border"
      style={{ background: "oklch(0.192 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}
    >
      <span className={MONO} style={DIM}>{label}</span>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className="mono text-2xl font-light" style={{ color: accent ?? "oklch(0.94 0.006 255)" }}>
          {typeof value === "number" ? <AnimatedNumber value={value} duration={600} /> : value}
        </span>
        {unit && <span className="mono text-xs" style={DIM}>{unit}</span>}
      </div>
    </div>
  );
}

export function BrightDataClient() {
  const { data: health } = useHealth();
  const { data: sources = [] } = useSources();
  const [replaying, setReplaying] = useState(false);
  const [replayMsg, setReplayMsg] = useState<string | null>(null);

  const activeSources = sources.filter((s) => s.active).length;

  async function handleDemoReplay() {
    if (!confirm("Demo Replay replaces existing alerts/documents. Continue?")) return;
    setReplaying(true);
    setReplayMsg(null);
    try {
      const res = await api.demoReplay(true);
      setReplayMsg(res.message);
    } catch (e: unknown) {
      setReplayMsg(e instanceof Error ? e.message : "Replay failed");
    } finally {
      setReplaying(false);
    }
  }

  return (
    <div className="p-6 overflow-y-auto h-full space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className={MONO} style={DIM}>BRIGHT DATA</span>
          <p className="text-xs mt-0.5" style={{ color: "oklch(0.44 0.010 255)" }}>
            Web Unlocker + MCP Server integration status
          </p>
        </div>
        <a
          href="https://brightdata.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border mono text-[0.65rem] font-bold transition-all hover:text-white"
          style={{ background: "oklch(0.192 0.012 255)", borderColor: "oklch(0.28 0.012 255)", color: "oklch(0.52 0.010 255)" }}
        >
          brightdata.com <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Usage stats */}
      <section>
        <h2 className={`${MONO} pb-1.5`} style={{ color: "oklch(0.52 0.010 255)", borderBottom: "1px solid oklch(0.245 0.010 255)" }}>
          Usage Stats
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <StatBlock label="Active Sources" value={activeSources} accent="oklch(0.72 0.14 200)" />
          <StatBlock label="Total Sources" value={sources.length} />
          <StatBlock
            label="System Status"
            value={health?.status === "ok" ? "LIVE" : "OFFLINE"}
            accent={health?.status === "ok" ? "oklch(0.60 0.18 155)" : "oklch(0.60 0.22 22)"}
          />
          <StatBlock
            label="Last Scan"
            value={health?.last_scan
              ? new Date(health.last_scan).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
              : "—"}
          />
        </div>
      </section>

      {/* Products in use */}
      <section>
        <h2 className={`${MONO} pb-1.5`} style={{ color: "oklch(0.52 0.010 255)", borderBottom: "1px solid oklch(0.245 0.010 255)" }}>
          Products in Use
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          {[
            {
              name: "Web Unlocker",
              badge: "ACTIVE",
              desc: "Bypasses geo-restrictions and anti-bot protections on regulatory sites. Used as the primary scraping layer for all configured sources.",
              features: ["Automatic proxy rotation", "JavaScript rendering", "CAPTCHA bypass", "Residential IPs"],
              docs: "https://docs.brightdata.com/scraping-automation/web-unlocker/introduction",
            },
            {
              name: "MCP Server",
              badge: "ACTIVE",
              desc: "Connects AI agents to live web data via the Model Context Protocol. Used for agent-driven regulatory search and context retrieval.",
              features: ["Real-time web search", "Structured data extraction", "Agent-native API", "OpenAI-compatible"],
              docs: "https://docs.brightdata.com/ai/mcp-server/overview",
            },
          ].map((product) => (
            <div
              key={product.name}
              className="rounded-lg border p-4 flex flex-col gap-3"
              style={{ background: "oklch(0.192 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" style={{ color: "oklch(0.72 0.14 200)" }} />
                  <span className="text-sm font-bold" style={{ color: "oklch(0.94 0.006 255)" }}>{product.name}</span>
                </div>
                <span
                  className="mono text-[0.60rem] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: "oklch(0.225 0.022 155 / 0.3)", color: "oklch(0.76 0.14 155)", border: "1px solid oklch(0.60 0.18 155 / 0.3)" }}
                >
                  {product.badge}
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "oklch(0.58 0.010 255)" }}>{product.desc}</p>
              <ul className="space-y-1">
                {product.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs" style={{ color: "oklch(0.66 0.008 255)" }}>
                    <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: "oklch(0.60 0.18 155)" }} />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={product.docs}
                target="_blank"
                rel="noopener noreferrer"
                className="mono text-[0.60rem] flex items-center gap-1 hover:underline mt-auto"
                style={{ color: "oklch(0.52 0.18 255)" }}
              >
                Documentation <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Monitored sources */}
      <section>
        <h2 className={`${MONO} pb-1.5`} style={{ color: "oklch(0.52 0.010 255)", borderBottom: "1px solid oklch(0.245 0.010 255)" }}>
          Monitored Sources
        </h2>
        <div className="mt-3 space-y-2">
          {sources.length === 0 ? (
            <p className={`${MONO} text-[0.60rem]`} style={DIM}>No sources configured.</p>
          ) : sources.map((src) => (
            <div
              key={src.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border"
              style={{ background: "oklch(0.168 0.012 255)", borderColor: "oklch(0.245 0.010 255)" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  background: src.active ? "oklch(0.60 0.18 155)" : "oklch(0.38 0.010 255)",
                  boxShadow: src.active ? "0 0 4px oklch(0.60 0.18 155)" : "none",
                }}
              />
              <Globe className="w-3.5 h-3.5 shrink-0" style={{ color: "oklch(0.44 0.010 255)" }} />
              <span className="text-xs font-medium flex-1" style={{ color: "oklch(0.82 0.008 255)" }}>{src.name}</span>
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mono text-[0.60rem] hover:underline truncate max-w-xs"
                style={{ color: "oklch(0.44 0.010 255)" }}
              >
                {src.url}
              </a>
              <span className="mono text-[0.60rem] shrink-0" style={{ color: "oklch(0.38 0.010 255)" }}>
                every {src.scan_interval_hours}h
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Demo replay */}
      <section>
        <h2 className={`${MONO} pb-1.5`} style={{ color: "oklch(0.52 0.010 255)", borderBottom: "1px solid oklch(0.245 0.010 255)" }}>
          Demo Replay
        </h2>
        <div
          className="mt-3 rounded-lg border p-4 flex flex-col gap-3"
          style={{ background: "oklch(0.192 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}
        >
          <p className="text-xs leading-relaxed" style={{ color: "oklch(0.58 0.010 255)" }}>
            Seeds the database with 5 realistic regulatory alerts from SEC, GDPR/ICO, FINRA, OSHA, and FTC.
            This replaces existing alerts/documents. Use only for demos.
          </p>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={handleDemoReplay}
              disabled={replaying}
              className="h-7 gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3 w-3 ${replaying ? "animate-spin" : ""}`} />
              {replaying ? "Replaying…" : "Run demo replay"}
            </Button>
            {replayMsg && (
              <span className="mono text-[0.60rem]" style={{ color: "oklch(0.60 0.18 155)" }}>
                ✓ {replayMsg}
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
