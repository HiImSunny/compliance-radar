"use client";

import { useState } from "react";
import {
  Activity, RefreshCw, FileText, AlertTriangle, CheckCircle2, Check,
} from "lucide-react";
import { useAlerts } from "@/lib/hooks";

// ── Preloaded demo templates ──────────────────────────────────────────────
const PRELOADED_TEMPLATES = [
  {
    title: "Insecure Docker Config (SOC2)",
    standard: "SOC2 Type II - CC6.3",
    content: `FROM node:18-alpine\nENV NODE_ENV=production\nWORKDIR /app\nCOPY . .\nUSER root\nRUN chmod -R 777 /app\nEXPOSE 22\nEXPOSE 8080\nCMD ["node", "server.js"]`,
  },
  {
    title: "AWS S3 Data Leak Logs (GDPR)",
    standard: "GDPR Art 32 - Encryption Gap",
    content: `2026-05-28T09:12:05Z aws_s3_log anonymous_user ObjectAccess:Get\nBucket: customers-passports-archive\nURI: https://s3.amazonaws.com/customers-passports-archive/passport_export_9281.zip\nIP: 89.141.22.181 (Latvia)\nSignature: NO_SIGN_VERIFIED\nStatus: 200 OK`,
  },
  {
    title: "Outdated Password Policy (ISO 27001)",
    standard: "ISO 27001 - A.9 Users Access Control",
    content: `[Password Policy]\npassword_min_length = 6\npassword_complexity = false\nmax_password_age_days = -1\nretry_limit_to_lockout = 99\nmfa_bypass_group = "everyone-and-external-guests"`,
  },
];

interface AuditFinding {
  id: string;
  severity: string;
  control: string;
  issue: string;
  impact: string;
  remediation: string;
}

interface AuditResult {
  status: string;
  score: number;
  summary: string;
  findings: AuditFinding[];
  verifiedAssets?: string[];
  isMock?: boolean;
}

export function ComplianceDesk() {
  const { data: alerts = [] } = useAlerts(200);

  const [customAuditContent, setCustomAuditContent] = useState(
    `-- CONFIGURATION AUDIT REPORT --\nsystem.environment = "Production"\nnetwork.open_ports = [80, 443, 8080, 22, 3306]\ndatabase.encryption_enabled = false\ns3_bucket.public_access = "READ_WRITE"\nuser_directory.mfa_enforced = false\nlog_retention.days = 5`,
  );
  const [auditStandard, setAuditStandard] = useState("GDPR / SOC2 Combo");
  const [provider, setProvider] = useState<"gemini" | "aimlapi">("aimlapi");
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditErrorMessage, setAuditErrorMessage] = useState<string | null>(null);

  // Build context from live alerts to enrich the AI audit
  function buildAuditContext(): string {
    if (!alerts.length) return "";
    const recent = [...alerts]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
    const lines = ["Live system alerts for context:"];
    recent.forEach((a) => {
      lines.push(`[${a.severity.toUpperCase()}] ${a.source_name ?? "Unknown"}: ${a.summary.slice(0, 100)}`);
    });
    return lines.join("\n");
  }

  const handleAiAudit = async (contentInput: string, standardInput: string) => {
    setIsAuditing(true);
    setAuditErrorMessage(null);
    setAuditResult(null);

    try {
      const response = await fetch("/api/llm/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: contentInput,
          standard: standardInput,
          context: buildAuditContext(),
          provider,
        }),
      });

      const data: AuditResult & { provider?: string } = await response.json();

      if (!response.ok || data.isMock) {
        setAuditErrorMessage(
          "Both AI providers unavailable. Check that `GEMINI_API_KEY` and `AIMLAPI_KEY` are set in `web/.env.local`.",
        );
        setAuditResult(null);
      } else {
        setAuditResult(data);
      }
    } catch (err) {
      console.error("AI audit fetch failed:", err);
      setAuditErrorMessage("Network error — could not reach the AI audit endpoint.");
    } finally {
      setIsAuditing(false);
    }
  };

  const statusColor = (status: string) => {
    if (status === "CRITICAL_VIOLATION") return "oklch(0.60 0.22 22)";
    if (status === "FAILED") return "oklch(0.68 0.20 42)";
    if (status === "COMPLIANT") return "oklch(0.60 0.18 155)";
    return "oklch(0.72 0.14 200)";
  };

  const statusBg = (status: string) => {
    if (status === "CRITICAL_VIOLATION") return "oklch(0.235 0.038 22 / 0.3)";
    if (status === "FAILED") return "oklch(0.235 0.030 42 / 0.3)";
    if (status === "COMPLIANT") return "oklch(0.225 0.022 155 / 0.3)";
    return "oklch(0.235 0.020 255 / 0.3)";
  };

  const statusBorder = (status: string) => {
    if (status === "CRITICAL_VIOLATION") return "oklch(0.60 0.22 22 / 0.3)";
    if (status === "FAILED") return "oklch(0.68 0.20 42 / 0.3)";
    if (status === "COMPLIANT") return "oklch(0.60 0.18 155 / 0.3)";
    return "oklch(0.52 0.18 255 / 0.3)";
  };

  return (
    <div className="flex-1 flex flex-col p-5 overflow-y-auto z-10">
      {/* Header */}
      <div
        className="rounded-xl border p-4 mb-5"
        style={{ background: "oklch(0.192 0.012 255)", borderColor: "oklch(0.52 0.18 255 / 0.15)" }}
      >
        <span
          className="mono text-[0.70rem] uppercase tracking-widest px-2 py-0.5 rounded border font-bold"
          style={{
            color: "oklch(0.72 0.14 200)",
            background: "oklch(0.148 0.012 255)",
            borderColor: "oklch(0.52 0.18 255 / 0.2)",
          }}
        >
          WORKSPACE CORE
        </span>
        <h3 className="text-sm font-bold mt-1.5 mb-1" style={{ color: "oklch(0.94 0.006 255)" }}>
          Policy Gap Analysis with AIML API
        </h3>
        <p className="text-xs leading-relaxed max-w-2xl" style={{ color: "oklch(0.58 0.010 255)" }}>
          Paste system configuration, suspicious log files, or security policy documents below. AIML API will
          cross-reference against international compliance standards and your live alert context.
          {alerts.length > 0 && (
            <span style={{ color: "oklch(0.72 0.14 200)" }}>
              {" "}({alerts.length} live alerts loaded as context.)
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 flex-1 items-stretch">
        {/* Left: input */}
        <div
          className="xl:col-span-5 rounded-xl border p-4 flex flex-col gap-3"
          style={{ background: "oklch(0.192 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}
        >
          <div className="flex justify-between items-center">
            <span
              className="mono text-[0.70rem] uppercase font-bold tracking-wide"
              style={{ color: "oklch(0.52 0.010 255)" }}
            >
              Policy / Log to Scan
            </span>
            <div className="flex items-center gap-2">
              {/* Provider toggle */}
              <div className="flex items-center gap-0.5 rounded border px-1 py-0.5" style={{ borderColor: "oklch(0.28 0.012 255)", background: "oklch(0.148 0.012 255)" }}>
                {(["aimlapi", "gemini"] as const).map((p) => (
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
              <label className="mono text-[0.70rem]" style={{ color: "oklch(0.52 0.010 255)" }}>
                Standard:
              </label>
              <select
                value={auditStandard}
                onChange={(e) => setAuditStandard(e.target.value)}
                className="rounded px-2 py-0.5 mono text-xs font-bold outline-none"
                style={{
                  background: "oklch(0.148 0.012 255)",
                  border: "1px solid oklch(0.28 0.012 255)",
                  color: "oklch(0.72 0.14 200)",
                }}
              >
                <option value="GDPR - General Protection Registry">GDPR Protection</option>
                <option value="SOC2 Type II Audit Schema">SOC2 Security</option>
                <option value="ISO 27001 Code of Practice">ISO 27001 Code</option>
                <option value="GDPR / SOC2 Combo">GDPR + SOC2 Combo</option>
                <option value="HIPAA Healthcare Compliance">HIPAA Healthcare</option>
                <option value="FINRA Broker-Dealer Rules">FINRA Rules</option>
                <option value="SEC Cybersecurity Disclosure Rules">SEC Cybersecurity</option>
              </select>
            </div>
          </div>

          <textarea
            value={customAuditContent}
            onChange={(e) => setCustomAuditContent(e.target.value)}
            className="flex-1 min-h-[180px] rounded-lg p-3 text-xs mono leading-relaxed resize-none outline-none transition-all"
            style={{
              background: "oklch(0.148 0.012 255)",
              border: "1px solid oklch(0.28 0.012 255)",
              color: "oklch(0.82 0.008 255)",
            }}
            placeholder="Paste configuration, log, or security policy here..."
          />

          <div>
            <p
              className="mono text-[0.70rem] uppercase tracking-widest mb-1.5"
              style={{ color: "oklch(0.52 0.010 255)" }}
            >
              Quick Templates:
            </p>
            <div className="flex flex-col gap-1">
              {PRELOADED_TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCustomAuditContent(tpl.content);
                    setAuditStandard(tpl.standard);
                  }}
                  className="text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-2 cursor-pointer border"
                  style={{
                    background: "oklch(0.148 0.012 255)",
                    borderColor: "oklch(0.28 0.012 255)",
                    color: "oklch(0.58 0.010 255)",
                  }}
                >
                  <FileText className="w-3 h-3 shrink-0" style={{ color: "oklch(0.72 0.14 200)" }} />
                  {tpl.title}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleAiAudit(customAuditContent, auditStandard)}
            disabled={isAuditing || !customAuditContent.trim()}
            className="w-full py-2.5 rounded-lg text-xs font-bold tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
            style={{
              background:
                isAuditing || !customAuditContent.trim()
                  ? "oklch(0.235 0.012 255)"
                  : "oklch(0.52 0.18 255)",
              color: isAuditing || !customAuditContent.trim() ? "oklch(0.52 0.010 255)" : "white",
            }}
          >
            {isAuditing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Analyzing with {provider === "aimlapi" ? "AIML API" : "Gemini"}...
              </>
            ) : (
              <>
                <Activity className="w-3.5 h-3.5" />
                RUN COMPLIANCE AUDIT
              </>
            )}
          </button>

          {auditErrorMessage && (
            <p
              className="mono text-[0.70rem] leading-relaxed p-2 rounded border"
              style={{
                color: "oklch(0.68 0.20 42)",
                background: "oklch(0.235 0.030 42 / 0.3)",
                borderColor: "oklch(0.68 0.20 42 / 0.3)",
              }}
            >
              {auditErrorMessage}
            </p>
          )}
        </div>

        {/* Right: results */}
        <div
          className="xl:col-span-7 rounded-xl border p-4 flex flex-col gap-4 overflow-y-auto"
          style={{ background: "oklch(0.192 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}
        >
          {auditResult ? (
            <>
              {/* Status banner */}
              <div
                className="flex flex-col md:flex-row gap-4 p-3.5 rounded-xl border"
                style={{
                  background: statusBg(auditResult.status),
                  borderColor: statusBorder(auditResult.status),
                }}
              >
                <div
                  className="flex flex-col justify-center pr-4 border-r"
                  style={{ borderColor: "oklch(0.28 0.012 255)" }}
                >
                  <p
                    className="mono text-[0.70rem] uppercase tracking-widest mb-0.5"
                    style={{ color: "oklch(0.52 0.010 255)" }}
                  >
                    Audit Status
                  </p>
                  <span
                    className="mono text-sm font-extrabold tracking-wider"
                    style={{ color: statusColor(auditResult.status) }}
                  >
                    {auditResult.status}
                  </span>
                </div>
                <div
                  className="flex flex-col justify-center items-center px-4 border-r"
                  style={{ borderColor: "oklch(0.28 0.012 255)" }}
                >
                  <p
                    className="mono text-[0.70rem] uppercase tracking-widest mb-0.5"
                    style={{ color: "oklch(0.52 0.010 255)" }}
                  >
                    Compliance Grade
                  </p>
                  <span className="mono text-3xl font-extrabold" style={{ color: "oklch(0.94 0.006 255)" }}>
                    {auditResult.score}%
                  </span>
                </div>
                <div className="flex flex-col justify-center px-2">
                  <p className="text-xs italic leading-relaxed" style={{ color: "oklch(0.58 0.010 255)" }}>
                    &ldquo;{auditResult.summary}&rdquo;
                  </p>
                </div>
              </div>

              {/* Findings */}
              {auditResult.findings?.length > 0 && (
                <div>
                  <h4
                    className="mono text-[0.70rem] font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1"
                    style={{ color: "oklch(0.60 0.22 22)" }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    GAP FINDINGS ({auditResult.findings.length})
                  </h4>
                  <div className="space-y-2.5">
                    {auditResult.findings.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg p-3 border flex flex-col gap-2"
                        style={{
                          background: "oklch(0.148 0.012 255)",
                          borderColor: "oklch(0.28 0.012 255)",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="mono text-[0.70rem] font-bold px-1.5 py-0.5 rounded uppercase"
                            style={{ background: "oklch(0.60 0.22 22)", color: "white" }}
                          >
                            {item.severity}
                          </span>
                          <span
                            className="mono text-xs font-bold"
                            style={{ color: "oklch(0.82 0.008 255)" }}
                          >
                            {item.id} — {item.control}
                          </span>
                        </div>
                        <p className="text-xs font-medium" style={{ color: "oklch(0.86 0.008 255)" }}>
                          {item.issue}
                        </p>
                        <div
                          className="text-xs p-2.5 rounded border leading-normal"
                          style={{
                            background: "oklch(0.192 0.012 255)",
                            borderColor: "oklch(0.28 0.012 255)",
                          }}
                        >
                          <p
                            className="mono text-[0.70rem] font-bold uppercase mb-0.5"
                            style={{ color: "oklch(0.60 0.22 22)" }}
                          >
                            Impact Vector:
                          </p>
                          <p className="mb-2" style={{ color: "oklch(0.82 0.008 255)" }}>
                            {item.impact}
                          </p>
                          <p
                            className="mono text-[0.70rem] font-bold uppercase mb-0.5"
                            style={{ color: "oklch(0.60 0.18 155)" }}
                          >
                            Remediation:
                          </p>
                          <p
                            className="mono p-2 rounded border whitespace-pre-wrap"
                            style={{
                              color: "oklch(0.76 0.14 155)",
                              background: "oklch(0.148 0.012 255)",
                              borderColor: "oklch(0.60 0.18 155 / 0.15)",
                            }}
                          >
                            {item.remediation}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verified assets */}
              {auditResult.verifiedAssets && auditResult.verifiedAssets.length > 0 && (
                <div>
                  <h4
                    className="mono text-[0.70rem] font-bold uppercase tracking-wider mb-2 flex items-center gap-1"
                    style={{ color: "oklch(0.60 0.18 155)" }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    VERIFIED COMPLIANT ASSETS
                  </h4>
                  <ul className="space-y-1.5">
                    {auditResult.verifiedAssets.map((asset, i) => (
                      <li
                        key={i}
                        className="rounded px-2.5 py-1 text-xs flex items-center gap-2 border"
                        style={{
                          background: "oklch(0.225 0.022 155 / 0.2)",
                          borderColor: "oklch(0.60 0.18 155 / 0.2)",
                          color: "oklch(0.76 0.14 155)",
                        }}
                      >
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        {asset}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
              <FileText className="w-10 h-10 mb-2" style={{ color: "oklch(0.35 0.010 255)" }} />
              <p className="text-xs" style={{ color: "oklch(0.52 0.010 255)" }}>
                No results yet.
              </p>
              <p className="text-xs max-w-sm mt-1" style={{ color: "oklch(0.44 0.010 255)" }}>
                Paste a configuration or select a template on the left, then click &ldquo;RUN COMPLIANCE
                AUDIT&rdquo; for real Gemini AI analysis.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
