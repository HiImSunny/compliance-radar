"use client";

import { useState, useEffect, useRef } from "react";
import { Send, RefreshCw } from "lucide-react";
import { useAlerts, useSources, useHealth } from "@/lib/hooks";

// ── Simple markdown → JSX renderer ──────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let i = 0;
  let key = 0; // separate monotonic key counter

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      result.push(
        <pre key={key++} className="rounded p-2 my-1.5 overflow-x-auto text-[0.65rem] leading-relaxed"
          style={{ background: "oklch(0.10 0.008 255)", border: "1px solid oklch(0.28 0.012 255)", color: "oklch(0.76 0.14 155)" }}>
          {lang && <span className="mono text-[0.55rem] block mb-1" style={{ color: "oklch(0.44 0.010 255)" }}>{lang}</span>}
          {codeLines.join("\n")}
        </pre>
      );
      i++;
      continue;
    }

    // Heading
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);
    if (h1 || h2 || h3) {
      const content = (h1 || h2 || h3)![1];
      result.push(
        <p key={key++} className="font-bold text-xs mt-2 mb-0.5" style={{ color: "oklch(0.94 0.006 255)" }}>
          {inlineFormat(content)}
        </p>
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (line.trim().match(/^---+$/)) {
      result.push(<hr key={key++} className="my-2" style={{ borderColor: "oklch(0.28 0.012 255)" }} />);
      i++;
      continue;
    }

    // Bullet list
    if (line.match(/^[\s]*[-*]\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[\s]*[-*]\s+/)) {
        items.push(lines[i].replace(/^[\s]*[-*]\s+/, ""));
        i++;
      }
      result.push(
        <ul key={key++} className="space-y-0.5 my-1 pl-3">
          {items.map((item, j) => (
            <li key={j} className="text-xs flex gap-1.5" style={{ color: "oklch(0.78 0.008 255)" }}>
              <span style={{ color: "oklch(0.52 0.18 255)" }}>·</span>
              <span>{inlineFormat(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (line.match(/^[\s]*\d+\.\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[\s]*\d+\.\s+/)) {
        items.push(lines[i].replace(/^[\s]*\d+\.\s+/, ""));
        i++;
      }
      result.push(
        <ol key={key++} className="space-y-0.5 my-1 pl-3">
          {items.map((item, j) => (
            <li key={j} className="text-xs flex gap-1.5" style={{ color: "oklch(0.78 0.008 255)" }}>
              <span className="mono shrink-0" style={{ color: "oklch(0.52 0.010 255)" }}>{j + 1}.</span>
              <span>{inlineFormat(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      result.push(<div key={key++} className="h-1.5" />);
      i++;
      continue;
    }

    // Normal paragraph
    result.push(
      <p key={key++} className="text-xs leading-relaxed" style={{ color: "oklch(0.82 0.008 255)" }}>
        {inlineFormat(line)}
      </p>
    );
    i++;
  }

  return result;
}

// Inline formatting: **bold**, *italic*, `code`
function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} style={{ color: "oklch(0.94 0.006 255)", fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i} style={{ color: "oklch(0.86 0.008 255)" }}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="rounded px-1 py-0.5 mono text-[0.65rem]"
        style={{ background: "oklch(0.10 0.008 255)", color: "oklch(0.76 0.14 155)", border: "1px solid oklch(0.28 0.012 255)" }}>{part.slice(1, -1)}</code>;
    return part;
  });
}

function buildSystemContext(
  alerts: ReturnType<typeof useAlerts>["data"],
  sources: ReturnType<typeof useSources>["data"],
  health: ReturnType<typeof useHealth>["data"],
): string {
  if (!alerts?.length && !sources?.length) return "";

  const lines: string[] = ["=== LIVE COMPLIANCE RADAR SYSTEM STATE ==="];

  if (health) {
    lines.push(`System: ${health.status === "ok" ? "ONLINE" : "OFFLINE"} | Sources monitored: ${health.sources} | Last scan: ${health.last_scan ? new Date(health.last_scan).toLocaleString() : "never"}`);
  }

  if (sources?.length) {
    const active = sources.filter((s) => s.active);
    lines.push(`\nActive regulatory sources (${active.length}/${sources.length}):`);
    active.forEach((s) => lines.push(`  - ${s.name}: ${s.url} (scan every ${s.scan_interval_hours}h)`));
  }

  if (alerts?.length) {
    const critical = alerts.filter((a) => a.severity === "critical");
    const high = alerts.filter((a) => a.severity === "high");
    const medium = alerts.filter((a) => a.severity === "medium");
    const low = alerts.filter((a) => a.severity === "low");

    lines.push(`\nAlert summary: ${critical.length} critical, ${high.length} high, ${medium.length} medium, ${low.length} low`);

    const recent = [...alerts]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);

    lines.push("\nMost recent alerts:");
    recent.forEach((a) => {
      lines.push(`  [${a.severity.toUpperCase()}] ${a.source_name ?? `Source ${a.source_id}`}: ${a.summary.slice(0, 120)}...`);
      if (a.impacted_depts) lines.push(`    Impacted: ${a.impacted_depts}`);
    });
  }

  lines.push("=== END SYSTEM STATE ===");
  return lines.join("\n");
}

export function ThreatTerminal() {
  const { data: alerts = [] } = useAlerts(200);
  const { data: sources = [] } = useSources();
  const { data: health } = useHealth();

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    { sender: "ai" | "user"; text: string; time: string; isError?: boolean; provider?: string }[]
  >([]);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [provider, setProvider] = useState<"gemini" | "aimlapi">("gemini");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set initial greeting once live data loads
  useEffect(() => {
    if (chatMessages.length > 0) return;
    const alertCount = alerts.length;
    const criticalCount = alerts.filter((a) => a.severity === "critical").length;
    const sourceCount = sources.filter((s) => s.active).length;

    const greeting =
      alertCount > 0
        ? `**ComplianceRadar AI** — connected to live system.\n\n` +
          `Current posture: **${alertCount} alerts** across ${sourceCount} active sources` +
          (criticalCount > 0 ? `, including **${criticalCount} critical**` : "") +
          `.\n\nAsk me about any alert, what a regulation means, which teams are affected, or what steps your organization should take.`
        : `**ComplianceRadar AI** — connected.\n\nNo alerts in the system yet. Run a scan or use Demo Replay to load data.\n\nYou can also ask me about any compliance regulation or paste a policy document for analysis.`;

    setChatMessages([{ sender: "ai", text: greeting, time: new Date().toTimeString().slice(0, 5) }]);
  }, [alerts, sources]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isSendingChat]);

  const handleSendChat = async (userMsgText: string) => {
    if (!userMsgText.trim() || isSendingChat) return;
    const formattedTime = new Date().toTimeString().slice(0, 5);

    setChatMessages((prev) => [...prev, { sender: "user", text: userMsgText, time: formattedTime }]);
    setChatInput("");
    setIsSendingChat(true);

    const context = buildSystemContext(alerts, sources, health);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsgText, context, provider }),
      });

      const data = await response.json();

      if (!response.ok || data.isMock) {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: "Both AI providers unavailable. Check that `GEMINI_API_KEY` and `AIMLAPI_KEY` are set in `web/.env.local`.",
            time: new Date().toTimeString().slice(0, 5),
            isError: true,
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: data.text || "No response.",
            time: new Date().toTimeString().slice(0, 5),
            provider: data.provider,
          },
        ]);
      }
    } catch (err) {
      console.error("Gemini chat fetch failed:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Network error — could not reach the AI endpoint. Make sure the Next.js dev server is running.",
          time: new Date().toTimeString().slice(0, 5),
          isError: true,
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-5 overflow-hidden z-10">
      <div
        className="flex-1 rounded-2xl border p-4 flex flex-col overflow-hidden"
        style={{ background: "black", borderColor: "oklch(0.28 0.012 255)" }}
      >
        {/* Terminal header */}
        <div
          className="flex justify-between items-center pb-3 border-b text-xs shrink-0 mono"
          style={{ borderColor: "oklch(0.52 0.18 255 / 0.2)", color: "oklch(0.72 0.14 200)" }}
        >
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "oklch(0.60 0.22 22)" }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "oklch(0.68 0.20 42)" }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "oklch(0.60 0.18 155)" }} />
            </div>
            <span>CO-RADAR COMPLIANCE ASSISTANT</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Provider selector */}
            <div className="flex items-center gap-1 rounded border px-1.5 py-0.5" style={{ borderColor: "oklch(0.52 0.18 255 / 0.3)", background: "oklch(0.148 0.012 255)" }}>
              {(["gemini", "aimlapi"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className="mono text-[0.60rem] px-1.5 py-0.5 rounded transition-all cursor-pointer"
                  style={{
                    background: provider === p ? "oklch(0.52 0.18 255)" : "transparent",
                    color: provider === p ? "white" : "oklch(0.44 0.010 255)",
                  }}
                >
                  {p === "gemini" ? "Gemini" : "AIML"}
                </button>
              ))}
            </div>
            <span style={{ color: "oklch(0.44 0.010 255)" }}>
              {alerts.length > 0 ? `${alerts.length} alerts` : "no alerts"}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-2">
          {chatMessages.map((msg, idx) => {
            const isUser = msg.sender === "user";
            return (
              <div key={idx} className={`flex flex-col msg-in ${isUser ? "items-end" : "items-start"}`}>
                <div
                  className="flex items-center gap-2.5 mb-1 mono text-[0.70rem]"
                  style={{ color: "oklch(0.44 0.010 255)" }}
                >
                  <span className="font-bold">{isUser ? "OPERATOR" : "INTELLIGENCE AI"}</span>
                  <span>—</span>
                  <span>{msg.time}</span>
                  {!isUser && msg.provider && (
                    <span className="px-1 rounded" style={{ background: "oklch(0.235 0.012 255)", color: "oklch(0.52 0.18 255)" }}>
                      {msg.provider === "aimlapi" ? "AIML API" : "Gemini"}
                    </span>
                  )}
                </div>
                <div
                  className={`p-3 rounded-lg text-xs leading-relaxed max-w-xl ${
                    isUser ? "rounded-tr-none" : "rounded-tl-none"
                  }`}
                  style={{
                    background: msg.isError
                      ? "oklch(0.235 0.038 22 / 0.3)"
                      : isUser
                      ? "oklch(0.52 0.18 255 / 0.2)"
                      : "oklch(0.192 0.012 255)",
                    color: msg.isError
                      ? "oklch(0.82 0.18 22)"
                      : isUser
                      ? "oklch(0.86 0.008 255)"
                      : "oklch(0.82 0.008 255)",
                    border: `1px solid ${
                      msg.isError
                        ? "oklch(0.60 0.22 22 / 0.3)"
                        : isUser
                        ? "oklch(0.52 0.18 255 / 0.2)"
                        : "oklch(0.28 0.012 255)"
                    }`,
                  }}
                >
                  {isUser ? msg.text : renderMarkdown(msg.text)}
                </div>
              </div>
            );
          })}

          {isSendingChat && (
            <div className="flex flex-col items-start animate-pulse">
              <p className="mono text-[0.70rem] mb-1" style={{ color: "oklch(0.72 0.14 200)" }}>
                AI IS ANALYZING...
              </p>
              <div className="w-12 h-4 rounded-sm" style={{ background: "oklch(0.235 0.012 255)" }} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendChat(chatInput);
          }}
          className="mt-3 pt-3.5 border-t flex gap-2 shrink-0"
          style={{ borderColor: "oklch(0.28 0.012 255)" }}
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask about an alert, a regulation, which teams are affected, or what actions to take..."
            className="flex-1 rounded-lg px-3 py-2 text-xs outline-none transition-all"
            style={{
              background: "oklch(0.148 0.012 255)",
              border: "1px solid oklch(0.28 0.012 255)",
              color: "oklch(0.82 0.008 255)",
            }}
          />
          <button
            type="submit"
            disabled={isSendingChat || !chatInput.trim()}
            className="flex items-center justify-center px-4 rounded-lg transition-all cursor-pointer"
            style={{
              background:
                isSendingChat || !chatInput.trim()
                  ? "oklch(0.235 0.012 255)"
                  : "oklch(0.52 0.18 255)",
              color: "white",
            }}
          >
            {isSendingChat ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
