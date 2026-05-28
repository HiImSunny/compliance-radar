"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield, ShieldAlert, ShieldCheck, Activity, Terminal, Cpu,
  Send, RefreshCw, FileText, AlertTriangle, CheckCircle2,
  Compass, Check, Sliders, FileCode, ArrowRight, Database,
  ExternalLink,
} from "lucide-react";
import { useAlerts, useSources, useHealth, revalidateAll } from "@/lib/hooks";
import { api } from "@/lib/api";
import type { Alert } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RadarNode {
  id: string; name: string; x: number; angle: number;
  category: "Network" | "Data" | "Infrastructure" | "Operational";
  status: "HEALTHY" | "WARNING" | "CRITICAL"; details: string; ip: string;
}

interface ComplianceStandard {
  id: string; name: string; initialScore: number; description: string;
  controls: { code: string; name: string; status: "COMPLIANT" | "WARNING" | "FAILED"; remediation: string }[];
}

// ─── Static data ──────────────────────────────────────────────────────────────

const COMPLIANCE_STANDARDS: ComplianceStandard[] = [
  {
    id: "gdpr", name: "GDPR Compliance", initialScore: 92,
    description: "General Data Protection Regulation standards governing sensitive EU customer data handling, consent, and user encryptions.",
    controls: [
      { code: "ART-32", name: "Security of Personal Data Processing", status: "COMPLIANT", remediation: "Ensure TLS 1.3 is strictly enforced to protect personal tracking attributes." },
      { code: "ART-25", name: "Data Protection by Design & Default", status: "WARNING", remediation: "Implement automated fields mask in logs files to hide specific IP logs & sessions." },
      { code: "ART-17", name: "Right to Erasure / Retention Policies", status: "COMPLIANT", remediation: "Audit script triggers scheduled delete queries on expired visitor records." },
    ],
  },
  {
    id: "soc2", name: "SOC2 Type II", initialScore: 84,
    description: "Independent audit framework testing Security, Availability, Processing Integrity, Confidentiality, and Privacy controls.",
    controls: [
      { code: "CC-6.1", name: "Logical Access Protections / MFA", status: "FAILED", remediation: "Enforce multi-factor authentication across all SSH terminals & root logins on primary subnets." },
      { code: "CC-6.3", name: "Physical Server Access Controls", status: "COMPLIANT", remediation: "Secure facility logging sync with server rooms biometric locks." },
      { code: "CC-6.7", name: "Transmission Vulnerabilities Scanning", status: "COMPLIANT", remediation: "Scheduled automated Docker image scanning at active build time." },
    ],
  },
  {
    id: "iso27001", name: "ISO 27001 ISMS", initialScore: 71,
    description: "International benchmark specifying requirements for establishing, maintaining, and continually improving an Information Security System.",
    controls: [
      { code: "A.12.6.1", name: "Technical Vulnerabilities Management", status: "WARNING", remediation: "Run system-wide vulnerability patching scans weekly to trace old libraries." },
      { code: "A.12.4.1", name: "Event Logging & Audit Logs Trails", status: "COMPLIANT", remediation: "Forward all raw kernel messages to an immutable write-once read-many bucket." },
      { code: "A.9.2.1", name: "User Access Approvals Registry", status: "FAILED", remediation: "Ensure quarterly review documentation of directory system permissions is signed off by CIO." },
    ],
  },
];

const INITIAL_NODES: RadarNode[] = [
  { id: "n1", name: "Edge Firewall 01", x: 75, angle: 45, category: "Network", status: "HEALTHY", details: "Operational state. Inspecting inbound packets. TLS decryption active.", ip: "10.0.1.250" },
  { id: "n2", name: "Direct Connect Link", x: 45, angle: 120, category: "Network", status: "HEALTHY", details: "950Mbps average throughput. Encrypted VPN state clear.", ip: "10.12.0.1" },
  { id: "n3", name: "GDPR Customer Vault", x: 82, angle: 220, category: "Data", status: "WARNING", details: "Active encryption active. Minor gap in logging rotation frequency.", ip: "192.168.4.15" },
  { id: "n4", name: "S3 Historical Backups", x: 90, angle: 260, category: "Data", status: "CRITICAL", details: "Recent non-standard bulk export request executed. Possible leakage threat.", ip: "s3.eu-west-1.aws" },
  { id: "n5", name: "Production VM Cluster", x: 35, angle: 300, category: "Infrastructure", status: "HEALTHY", details: "8 instances live. Kernel patches up to date. Security agent running.", ip: "10.0.5.2" },
  { id: "n6", name: "Staging VM Group", x: 60, angle: 330, category: "Infrastructure", status: "WARNING", details: "14 unpatched libraries found in container daemon.", ip: "10.0.5.99" },
  { id: "n7", name: "IAM Access Registry", x: 40, angle: 90, category: "Operational", status: "HEALTHY", details: "MFA requirement active for 98% of workforce groups.", ip: "iam.radar.sys" },
  { id: "n8", name: "Biometric Logins Gate", x: 70, angle: 15, category: "Operational", status: "HEALTHY", details: "Security system syncing without alerts.", ip: "physical.core.gate" },
];

const PRELOADED_TEMPLATES = [
  { title: "Insecure Docker Config (SOC2)", standard: "SOC2 Type II - CC6.3", content: `FROM node:18-alpine\nENV NODE_ENV=production\nWORKDIR /app\nCOPY . .\nUSER root\nRUN chmod -R 777 /app\nEXPOSE 22\nEXPOSE 8080\nCMD ["node", "server.js"]` },
  { title: "AWS S3 Data Leak Logs (GDPR)", standard: "GDPR Art 32 - Encryption Gap", content: `2026-05-28T09:12:05Z aws_s3_log anonymous_user ObjectAccess:Get\nBucket: customers-passports-archive\nURI: https://s3.amazonaws.com/customers-passports-archive/passport_export_9281.zip\nIP: 89.141.22.181 (Latvia)\nSignature: NO_SIGN_VERIFIED\nStatus: 200 OK` },
  { title: "Outdated Password Policy (ISO 27001)", standard: "ISO 27001 - A.9 Users Access Control", content: `[Password Policy]\npassword_min_length = 6\npassword_complexity = false\nmax_password_age_days = -1\nretry_limit_to_lockout = 99\nmfa_bypass_group = "everyone-and-external-guests"` },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function alertToIncidentPriority(sev: string): "HIGH" | "WARNING" | "INFO" | "RESOLVED" {
  if (sev === "critical") return "HIGH";
  if (sev === "high") return "WARNING";
  if (sev === "medium") return "INFO";
  return "RESOLVED";
}

function simulateLocalAudit(textInput: string): any {
  const isDocker = textInput.includes("FROM") || textInput.includes("USER root");
  const isS3 = textInput.includes("aws_s3_log") || textInput.includes("passport");
  const isPw = textInput.includes("password_min_length") || textInput.includes("No expiration");
  if (isDocker) return { status: "CRITICAL_VIOLATION", score: 42, summary: "Docker container configuration violates SOC2 and ISO 27001 security standards.", findings: [{ id: "GAP-01", severity: "CRITICAL", control: "SOC2 CC6.3", issue: "Docker container runs as USER root.", impact: "Attacker gains direct root access to hijack the host machine.", remediation: "Create a custom non-privileged user in the Dockerfile." }, { id: "GAP-02", severity: "HIGH", control: "ISO 27001 A.12.6", issue: "SSH port 22 and port 8080 exposed to the internet.", impact: "Exposes the container to SSH brute-force bot attacks.", remediation: "Remove the EXPOSE 22 line from the Dockerfile." }], verifiedAssets: ["Safe base image node:18-alpine in use.", "Working directory /app is properly scoped."] };
  if (isS3) return { status: "CRITICAL_VIOLATION", score: 30, summary: "S3 Bucket logs show anonymous queries accessing EU customer records, directly violating GDPR.", findings: [{ id: "GAP-01", severity: "CRITICAL", control: "GDPR Art 32", issue: "Sensitive passport zip archive downloaded publicly without digital signature.", impact: "Full customer identity database exposed.", remediation: "Enable Block Public Access on the AWS Console." }], verifiedAssets: ["AWS CloudTrail audit log storage is correctly configured."] };
  if (isPw) return { status: "FAILED", score: 55, summary: "Outdated password policy severely violates ISO 27001 and SOC2 standards.", findings: [{ id: "GAP-01", severity: "HIGH", control: "ISO 27001 A.9.4.3", issue: "Maximum password age set to unlimited (-1 days).", impact: "Users never rotate passwords across years of access.", remediation: "Set max_password_age_days = 90." }, { id: "GAP-02", severity: "CRITICAL", control: "SOC2 CC-6.1", issue: "MFA bypass group defaults to 'everyone-and-external-guests'.", impact: "Entire MFA protection layer is disabled.", remediation: "Remove bypass group. Enforce mandatory MFA policy." }], verifiedAssets: ["Retry limit retry_limit_to_lockout is properly defined."] };
  return { status: "PARTIAL", score: 74, summary: "Audit document analyzed successfully. System contains several medium-severity gaps.", findings: [{ id: "GAP-01", severity: "MEDIUM", control: "SOC2 CC 6.1", issue: "Audit policy does not specify deprovisioning when employees leave.", impact: "Zombie accounts retain database access indefinitely.", remediation: "Integrate LDAP/Active Directory OKTA SSO for account lifecycle sync." }], verifiedAssets: ["Data in transit encryption (TLS) is properly enforced.", "Security monitoring devices report consistent activity."] };
}

function getSimulatedBotReply(userInput: string, sliderFirewall: number, sliderUnpatched: number, sliderKeyRotation: number, globalRiskIndex: number): string {
  const text = userInput.toLowerCase();
  if (text.includes("gdpr") || text.includes("art")) return `### 🇪🇺 GDPR AI Analysis\n1. **Encryption required (Art 32):** Enable AES-256 on all databases. Current Key Rotation: **${sliderKeyRotation}%**, target **95%**.\n2. **Right to erasure (Art 17):** Set up a cron service to purge expired customer records.\n3. **Data minimization:** Hash PII fields (passport numbers, customer IPs) before writing to logs.`;
  if (text.includes("soc2") || text.includes("ports") || text.includes("port")) return `### 🛡️ SOC2 Type II Assessment\nGlobal Risk Index: **${globalRiskIndex}/100**. To maintain SOC2 certification:\n- **CC6.1:** Enforce MFA for all system users.\n- **CC6.3:** Do not run Docker containers as \`USER root\`.\n- Click high-risk incidents and select **Quick Remediate** to update status.`;
  return `### 📡 Radar Analysis Complete\n- Firewall Strength: **${sliderFirewall}%**\n- Unpatched Servers: **${sliderUnpatched} nodes**\n- Key Rotation: **${sliderKeyRotation}%**\n\n*Recommendation:* Lower the **Unpatched Servers** slider or run **Manual Scan** to improve compliance posture.`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OverviewClient() {
  const { data: liveAlerts = [] } = useAlerts(200);
  const { data: sources = [] } = useSources();
  const { data: health } = useHealth();

  const [activeTab, setActiveTab] = useState<"radar" | "audit" | "intelligence">("radar");
  const [sliderFirewall, setSliderFirewall] = useState(85);
  const [sliderUnpatched, setSliderUnpatched] = useState(12);
  const [sliderKeyRotation, setSliderKeyRotation] = useState(90);
  const [isSyncingEngine, setIsSyncingEngine] = useState(false);

  const globalRiskIndex = Math.min(100, Math.max(0, Number(
    ((100 - sliderFirewall) * 0.4 + sliderUnpatched * 3.5 + (100 - sliderKeyRotation) * 0.2).toFixed(1)
  )));
  const calculatedIntegrity = Math.max(92.0, 100 - globalRiskIndex / 15).toFixed(2);

  // Build incidents from live alerts + static fallback
  const [incidents, setIncidents] = useState(() => {
    return [
      { id: "INC-7049", time: "14:22:01", priority: "HIGH" as const, source: "S3_ARCHIVE_EUROPE", desc: "Anomalous bulk export detected from S3. Possible data leakage.", details: "IP 185.220.101.5 querying historical financial databases violating GDPR Art 32 encryption requirements." },
      { id: "INC-6520", time: "14:15:40", priority: "WARNING" as const, source: "AUTH_SERVER_PRIMARY", desc: "Password policy non-compliance found in 14 user accounts (Domain-A).", details: "Audit revealed accounts with active passes older than 365 days. Active Directory group policies failing SOC2 standard requirements." },
      { id: "INC-2401", time: "13:58:12", priority: "INFO" as const, source: "LOG_ROTATION_DAEMON", desc: "Monthly SOC2 audit log rotation initiated. 24.2GB processed.", details: "Audit trail archived securely in GCS. Retention policy verified compliant with SOC2 Type II Trust Services Criteria CC2.1." },
      { id: "INC-1094", time: "12:30:55", priority: "RESOLVED" as const, source: "PROD_LB_GATEWAY", desc: "Unauthorized open port 8080 exposure closed on production balancer.", details: "Manual verification complete. Ports scanned and secured. Network filter updated successfully." },
    ] as { id: string; time: string; priority: "HIGH" | "WARNING" | "INFO" | "RESOLVED"; source: string; desc: string; details?: string; triageText?: string; isTriaging?: boolean }[];
  });

  // Merge live alerts into incidents feed
  useEffect(() => {
    if (!liveAlerts.length) return;
    const liveIncs = liveAlerts.slice(0, 5).map(a => ({
      id: `INC-${a.id}`,
      time: new Date(a.created_at).toTimeString().slice(0, 8),
      priority: alertToIncidentPriority(a.severity),
      source: a.source_name ?? `SOURCE_${a.source_id}`,
      desc: a.summary,
      details: a.remediation_steps || a.impacted_depts || "",
    }));
    setIncidents(prev => {
      const existingIds = new Set(prev.map(i => i.id));
      const newOnes = liveIncs.filter(i => !existingIds.has(i.id));
      return [...newOnes, ...prev].slice(0, 10);
    });
  }, [liveAlerts]);

  const [selectedIncident, setSelectedIncident] = useState<typeof incidents[0] | null>(null);
  const [selectedStandard, setSelectedStandard] = useState(COMPLIANCE_STANDARDS[0]);
  const [radarNodes, setRadarNodes] = useState<RadarNode[]>(INITIAL_NODES);
  const [selectedNode, setSelectedNode] = useState<RadarNode | null>(INITIAL_NODES[3]);
  const [isManualScanning, setIsManualScanning] = useState(false);
  const [scanPulseCount, setScanPulseCount] = useState(0);

  // Sync node statuses with sliders
  useEffect(() => {
    setRadarNodes(prev => prev.map(node => {
      if (node.category === "Network") return { ...node, status: sliderFirewall > 70 ? "HEALTHY" : sliderFirewall > 40 ? "WARNING" : "CRITICAL", details: sliderFirewall > 70 ? "Strict firewall inspections. Port restrictions fully enforced." : "Weak system security logic in place. Dynamic port mapping vulnerable." };
      if (node.category === "Infrastructure") return { ...node, status: sliderUnpatched < 8 ? "HEALTHY" : sliderUnpatched < 25 ? "WARNING" : "CRITICAL", details: sliderUnpatched < 8 ? "Operating with pristine kernel alignment. Zero unpatched CVEs found." : `Detected ${sliderUnpatched} critical unpatched CVEs. Exposed attack interfaces potential.` };
      if (node.category === "Data") return { ...node, status: sliderKeyRotation > 75 ? "HEALTHY" : sliderKeyRotation > 45 ? "WARNING" : "CRITICAL", details: sliderKeyRotation > 75 ? "Immutable storage partitions securely active. Symmetric keys rotated." : "Key age verification warning. Cryptographic standard deterioration." };
      return node;
    }));
  }, [sliderFirewall, sliderUnpatched, sliderKeyRotation]);

  const triggerManualScan = async () => {
    setIsManualScanning(true); setScanPulseCount(0);
    let iterations = 0;
    const interval = setInterval(() => {
      setScanPulseCount(prev => prev + 1); iterations++;
      if (iterations >= 3) {
        clearInterval(interval); setIsManualScanning(false);
        setSliderFirewall(prev => Math.min(100, prev + 5));
        const now = new Date();
        setIncidents(prev => [{ id: "INC-SCAN", time: now.toTimeString().slice(0, 8), priority: "RESOLVED" as const, source: "SYSTEM_AUDITOR", desc: "Manual Compliance perimeter sweep completed successfully.", details: "Verified 8 high priority system nodes. All endpoints evaluated against target standard guidelines." }, ...prev]);
      }
    }, 1000);
    // Also trigger real backend scan
    try { await api.scan(); revalidateAll(); } catch { /* ignore */ }
  };

  const handleRemediate = (incId: string) => {
    setIsSyncingEngine(true);
    setTimeout(() => {
      setIncidents(prev => prev.map(item => item.id === incId ? { ...item, priority: "RESOLVED" as const, desc: item.desc.replace("detected", "resolved & patched") + " (Remediated)" } : item));
      setSelectedIncident(null); setIsSyncingEngine(false);
    }, 1500);
  };

  const handleTriageIncident = async (inc: typeof incidents[0]) => {
    setIncidents(prev => prev.map(item => item.id === inc.id ? { ...item, isTriaging: true } : item));
    await new Promise(r => setTimeout(r, 1200));
    const triageText = `### 🔍 AI TRIAGE ASSESSMENT: ${inc.id}\n**Assessment:** Sensor detected anomalous activity in source module \`${inc.source}\`.\n**Recommended Remediation:**\n\`\`\`bash\nchmod 600 /etc/security/radar_config.json\nsudo systemctl restart secure_node_agent\n\`\`\``;
    setIncidents(prev => prev.map(item => item.id === inc.id ? { ...item, isTriaging: false, triageText } : item));
    if (selectedIncident?.id === inc.id) setSelectedIncident(prev => prev ? { ...prev, isTriaging: false, triageText } : null);
  };

  // Audit workspace
  const [customAuditContent, setCustomAuditContent] = useState(`-- CONFIGURATION AUDIT REPORT --\nsystem.environment = "Production"\nnetwork.open_ports = [80, 443, 8080, 22, 3306]\ndatabase.encryption_enabled = false\ns3_bucket.public_access = "READ_WRITE"\nuser_directory.mfa_enforced = false\nlog_retention.days = 5`);
  const [auditStandard, setAuditStandard] = useState("GDPR / SOC2 Combo");
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditErrorMessage, setAuditErrorMessage] = useState<string | null>(null);

  const handleAiAudit = async (contentInput: string, standardInput: string) => {
    setIsAuditing(true); setAuditErrorMessage(null); setAuditResult(null);
    try {
      const response = await fetch("/api/gemini/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: contentInput, standard: standardInput, context: "Compliance Radar System Live Dashboard Evaluation" }) });
      const data = await response.json();
      if (!response.ok || data.isMock) {
        setTimeout(() => { setAuditResult(simulateLocalAudit(contentInput)); setIsAuditing(false); if (data.isMock) setAuditErrorMessage("Rendering with internal Sandbox mode (Gemini API key not configured — using detailed simulation)."); }, 1500);
      } else { setAuditResult(data); setIsAuditing(false); }
    } catch {
      setTimeout(() => { setAuditResult(simulateLocalAudit(contentInput)); setIsAuditing(false); setAuditErrorMessage("Network connection lost. Falling back to local security analysis engine."); }, 1200);
    }
  };

  // Chat
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ sender: "ai" | "user"; text: string; time: string }[]>([{ sender: "ai", text: `Hello! I'm your **Radar AI Audit Assistant**. I've loaded real-time data from network sensors and your current compliance standards.\n\nAsk me about remediating incidents, or paste any log or security policy for a gap analysis powered by **Gemini**.`, time: "14:02" }]);
  const [isSendingChat, setIsSendingChat] = useState(false);

  const handleSendChat = async (userMsgText: string) => {
    if (!userMsgText.trim()) return;
    const formattedTime = new Date().toTimeString().slice(0, 5);
    setChatMessages(prev => [...prev, { sender: "user" as const, text: userMsgText, time: formattedTime }]);
    setChatInput(""); setIsSendingChat(true);
    try {
      const response = await fetch("/api/gemini/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: userMsgText }) });
      const data = await response.json();
      if (!response.ok || data.isMock) {
        setTimeout(() => { setChatMessages(prev => [...prev, { sender: "ai" as const, text: getSimulatedBotReply(userMsgText, sliderFirewall, sliderUnpatched, sliderKeyRotation, globalRiskIndex), time: new Date().toTimeString().slice(0, 5) }]); setIsSendingChat(false); }, 1200);
      } else { setChatMessages(prev => [...prev, { sender: "ai" as const, text: data.text || "No response from server.", time: new Date().toTimeString().slice(0, 5) }]); setIsSendingChat(false); }
    } catch {
      setTimeout(() => { setChatMessages(prev => [...prev, { sender: "ai" as const, text: getSimulatedBotReply(userMsgText, sliderFirewall, sliderUnpatched, sliderKeyRotation, globalRiskIndex), time: new Date().toTimeString().slice(0, 5) }]); setIsSendingChat(false); }, 1000);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden select-none overview-layout">

      {/* ── Left Sidebar ── */}
      <aside className="w-60 border-r flex flex-col gap-5 p-4 shrink-0 overflow-y-auto" style={{ background: "oklch(0.168 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}>

        {/* Standards Matrix */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <span className="mono text-[0.70rem] tracking-widest uppercase" style={{ color: "oklch(0.52 0.010 255)" }}>Standards Matrix</span>
            <span className="mono text-[0.70rem] px-1.5 py-0.5 rounded" style={{ background: "oklch(0.235 0.012 255)", color: "oklch(0.58 0.010 255)" }}>Active</span>
          </div>
          <div className="space-y-2">
            {COMPLIANCE_STANDARDS.map(std => {
              const isSelected = selectedStandard.id === std.id;
              let pct = std.initialScore;
              if (std.id === "gdpr") pct = Math.round(std.initialScore + (sliderKeyRotation - 90) * 0.15 - (sliderUnpatched > 10 ? 4 : 0));
              else if (std.id === "soc2") pct = Math.round(std.initialScore + (sliderFirewall - 85) * 0.25 - (sliderUnpatched > 15 ? 8 : 0));
              else pct = Math.round(std.initialScore - (sliderUnpatched - 12) * 0.8 + (sliderKeyRotation - 90) * 0.1);
              const score = Math.max(10, Math.min(100, pct));
              const barColor = score < 75 ? "oklch(0.60 0.22 22)" : score < 90 ? "oklch(0.68 0.20 42)" : "oklch(0.60 0.18 155)";
              const textColor = score < 75 ? "oklch(0.82 0.18 22)" : score < 90 ? "oklch(0.80 0.16 42)" : "oklch(0.76 0.14 155)";
              return (
                <div key={std.id} onClick={() => { setSelectedStandard(std); setActiveTab("audit"); }}
                  className="cursor-pointer p-2.5 rounded-lg border transition-all duration-200"
                  style={{ background: isSelected ? "oklch(0.235 0.020 255)" : "oklch(0.192 0.012 255)", borderColor: isSelected ? "oklch(0.74 0.14 200 / 0.4)" : "oklch(0.28 0.012 255)" }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold mono" style={{ color: "oklch(0.86 0.008 255)" }}>{std.name}</span>
                    <span className="mono text-[0.70rem] font-bold px-1.5 py-0.5 rounded" style={{ color: textColor, background: "oklch(0.192 0.012 255)" }}>{score}%</span>
                  </div>
                  <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "oklch(0.235 0.012 255)" }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, background: barColor }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Perimeter Rig Modulators */}
        <section className="rounded-xl border p-3.5 flex flex-col gap-3" style={{ background: "oklch(0.192 0.012 255)", borderColor: "oklch(0.74 0.14 200 / 0.15)" }}>
          <div className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" style={{ color: "oklch(0.72 0.14 200)" }} />
            <span className="text-xs font-bold" style={{ color: "oklch(0.82 0.008 255)" }}>Perimeter Rig Modulators</span>
          </div>
          {[
            { label: "1. Firewall Power", value: sliderFirewall, setter: setSliderFirewall, min: 10, max: 100, color: "oklch(0.72 0.14 200)", unit: "%" },
            { label: "2. Unpatched Servers", value: sliderUnpatched, setter: setSliderUnpatched, min: 0, max: 40, color: "oklch(0.68 0.20 42)", unit: " VMs" },
            { label: "3. Crypto Certificate Age", value: sliderKeyRotation, setter: setSliderKeyRotation, min: 20, max: 100, color: "oklch(0.60 0.18 155)", unit: "% Life" },
          ].map(({ label, value, setter, min, max, color, unit }) => (
            <div key={label} className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="mono text-[0.70rem] uppercase" style={{ color: "oklch(0.52 0.010 255)" }}>{label}</span>
                <span className="mono text-[0.70rem] font-bold" style={{ color }}>{value}{unit}</span>
              </div>
              <input type="range" min={min} max={max} value={value} onChange={e => setter(Number(e.target.value))} className="w-full h-1 rounded-lg appearance-none cursor-pointer" style={{ accentColor: color }} />
            </div>
          ))}
        </section>

        {/* Risk Index */}
        <section className="rounded-xl border p-3.5 mt-auto" style={{ background: "oklch(0.192 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}>
          <span className="mono text-[0.70rem] tracking-widest uppercase" style={{ color: "oklch(0.52 0.010 255)" }}>Internal Threats Index</span>
          <div className="flex items-baseline gap-1 my-2">
            <span className="mono text-2xl font-light" style={{ color: "oklch(0.94 0.006 255)" }}>{globalRiskIndex}</span>
            <span className="text-xs" style={{ color: "oklch(0.52 0.010 255)" }}>/ 100</span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "oklch(0.235 0.012 255)" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${globalRiskIndex}%`, background: globalRiskIndex > 70 ? "oklch(0.60 0.22 22)" : globalRiskIndex > 35 ? "oklch(0.68 0.20 42)" : "oklch(0.60 0.18 155)" }}></div>
          </div>
          <p className="text-xs italic leading-relaxed" style={{ color: "oklch(0.52 0.010 255)" }}>
            {globalRiskIndex > 70 ? "High risk! Select 'Triage with AI' for an incident response command chain." : globalRiskIndex > 35 ? "Moderate risk detected. Potential exposure or missing certification." : "Posture is fully safe and secure within nominal compliance limits."}
          </p>
        </section>
      </aside>

      {/* ── Center Panel ── */}
      <section className="flex-1 flex flex-col relative overflow-hidden" style={{ background: "oklch(0.148 0.012 255)" }}>
        {/* Dot grid bg */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: "radial-gradient(oklch(0.72 0.14 200) 1px, transparent 1.2px)", backgroundSize: "18px 18px" }}></div>

        {/* Tab bar */}
        <div className="px-5 py-3 flex items-center justify-between border-b z-10 shrink-0" style={{ borderColor: "oklch(0.28 0.012 255)" }}>
          <div className="flex items-center gap-1.5 p-1 rounded-lg border" style={{ background: "oklch(0.192 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}>
            {([["radar", "Radar Sphere", Compass], ["audit", "AI Compliance Desk", FileCode], ["intelligence", "Threat Terminal", Terminal]] as const).map(([tab, label, Icon]) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
                style={{ background: activeTab === tab ? "oklch(0.52 0.18 255)" : "transparent", color: activeTab === tab ? "white" : "oklch(0.58 0.010 255)" }}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-[0.70rem] px-2.5 py-1 rounded-full border" style={{ background: "oklch(0.192 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}>
            <div className="w-2 h-2 rounded-full animate-ping" style={{ background: "oklch(0.52 0.18 255)" }}></div>
            <span className="mono" style={{ color: "oklch(0.72 0.14 200)" }}>updating live sensor telemetry</span>
          </div>
          {/* Quick nav to real pages */}
          <div className="flex items-center gap-1.5 ml-2">
            {([
              ["/alerts",     "Alert Feed"],
              ["/sources",    "Sources"],
              ["/reports",    "Reports"],
              ["/brightdata", "Bright Data"],
            ] as const).map(([href, label]) => (
              <Link key={href} href={href}
                className="flex items-center gap-1 px-2.5 py-1 rounded border text-[0.70rem] font-semibold mono transition-all hover:text-white"
                style={{ background: "oklch(0.192 0.012 255)", borderColor: "oklch(0.28 0.012 255)", color: "oklch(0.52 0.010 255)" }}>
                {label} <ExternalLink className="w-2.5 h-2.5" />
              </Link>
            ))}
          </div>
        </div>

        {/* ── TAB: RADAR ── */}
        {activeTab === "radar" && (
          <div className="flex-1 flex flex-col lg:flex-row p-5 gap-5 overflow-y-auto z-10">
            {/* Radar canvas */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 rounded-2xl border" style={{ background: "oklch(0.168 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}>
              <div className="relative rounded-full flex items-center justify-center border overflow-hidden" style={{ width: 680, height: 680, maxWidth: "100%", borderColor: "oklch(0.52 0.18 255 / 0.2)" }}>
                {/* Sweep */}
                <div className="absolute inset-0 rounded-full pointer-events-none" style={{ background: "conic-gradient(from 0deg, oklch(0.52 0.18 255 / 0.4) 0deg, oklch(0.52 0.18 255 / 0) 120deg)", animation: isManualScanning ? "sweep 1.2s infinite linear" : "sweep 6s infinite linear", opacity: isManualScanning ? 1 : 0.4 }}></div>
                {/* SVG rings */}
                <svg className="absolute w-full h-full pointer-events-none">
                  <circle cx="50%" cy="50%" r="20%" fill="none" stroke="oklch(0.52 0.18 255 / 0.08)" strokeDasharray="3 3" />
                  <circle cx="50%" cy="50%" r="35%" fill="none" stroke="oklch(0.52 0.18 255 / 0.12)" />
                  <circle cx="50%" cy="50%" r="50%" fill="none" stroke="oklch(0.52 0.18 255 / 0.16)" strokeDasharray="5 5" />
                  <line x1="50%" y1="0" x2="50%" y2="100%" stroke="oklch(0.52 0.18 255 / 0.08)" />
                  <line x1="0" y1="50%" x2="100%" y2="50%" stroke="oklch(0.52 0.18 255 / 0.08)" />
                </svg>
                {/* Quadrant labels */}
                <span className="absolute top-3 left-1/2 -translate-x-1/2 mono text-[11px] tracking-widest font-extrabold uppercase" style={{ color: "oklch(0.52 0.18 255)" }}>1. NETWORK GUARD</span>
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 mono text-[11px] tracking-widest font-extrabold uppercase" style={{ color: "oklch(0.52 0.18 255 / 0.7)" }}>3. DATA INTEGRITY</span>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 mono text-[11px] tracking-widest font-extrabold uppercase -rotate-90" style={{ color: "oklch(0.52 0.18 255 / 0.7)" }}>4. INFRA CLOUD</span>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 mono text-[11px] tracking-widest font-extrabold uppercase rotate-90" style={{ color: "oklch(0.52 0.18 255 / 0.7)" }}>2. COMPLIANCE OPS</span>
                {/* Nodes */}
                {radarNodes.map(node => {
                  const radius = node.x * 0.45;
                  const radian = (node.angle * Math.PI) / 180;
                  const left = `calc(50% + ${radius * Math.cos(radian)}% - 13px)`;
                  const top = `calc(50% + ${radius * Math.sin(radian)}% - 13px)`;
                  const dotBg = node.status === "CRITICAL" ? "oklch(0.60 0.22 22)" : node.status === "WARNING" ? "oklch(0.68 0.20 42)" : "oklch(0.60 0.18 155)";
                  const isActive = selectedNode?.id === node.id;
                  return (
                    <button key={node.id} onClick={() => setSelectedNode(node)}
                      className="absolute flex items-center justify-center transition-all duration-200 hover:scale-125 z-20 cursor-pointer"
                      suppressHydrationWarning
                      style={{ left, top, width: 26, height: 26, borderRadius: "50%" }}>
                      <div className={node.status === "CRITICAL" ? "animate-ping" : ""} style={{ width: 16, height: 16, borderRadius: "50%", background: dotBg, boxShadow: `0 0 12px ${dotBg}`, outline: isActive ? `3px solid oklch(0.94 0.006 255 / 0.15)` : "none" }} />
                      {node.status === "CRITICAL" && <div className="absolute rounded-full pointer-events-none" style={{ width: 32, height: 32, background: "oklch(0.60 0.22 22 / 0.25)", animation: "ping 1s cubic-bezier(0,0,0.2,1) infinite" }} />}
                    </button>
                  );
                })}
                {/* Center scan button */}
                <button onClick={triggerManualScan} disabled={isManualScanning}
                  suppressHydrationWarning
                  className="flex flex-col items-center justify-center transition-all duration-200 cursor-pointer z-30"
                  style={{ width: 88, height: 88, borderRadius: "50%", background: "oklch(0.192 0.012 255)", border: "1px solid oklch(0.28 0.012 255)" }}>
                  <RefreshCw className={`w-6 h-6 ${isManualScanning ? "animate-spin" : ""}`} style={{ color: "oklch(0.72 0.14 200)" }} />
                  <span className="mono text-xs mt-1 font-bold" style={{ color: "oklch(0.52 0.010 255)" }}>SCAN</span>
                </button>
              </div>
              <p className="mt-3 mono text-[0.70rem] tracking-widest text-center" style={{ color: "oklch(0.52 0.010 255)" }}>
                {isManualScanning ? `SECURITY SCAN CYCLE ${scanPulseCount}/3...` : "Radar continuously scans 8 security sectors. Select a node for detailed audit."}
              </p>
            </div>

            {/* Node inspector */}
            <div className="w-full lg:w-64 rounded-2xl border p-4 flex flex-col justify-between" style={{ background: "oklch(0.192 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}>
              <div>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: "oklch(0.28 0.012 255)" }}>
                  <Database className="w-3.5 h-3.5" style={{ color: "oklch(0.72 0.14 200)" }} />
                  <span className="mono text-xs font-bold" style={{ color: "oklch(0.72 0.14 200)" }}>Sensor Node Telemetry</span>
                </div>
                {selectedNode ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold" style={{ color: "oklch(0.94 0.006 255)" }}>{selectedNode.name}</span>
                      <span className="mono text-[0.70rem] font-bold px-1.5 py-0.5 rounded" style={{ color: selectedNode.status === "HEALTHY" ? "oklch(0.60 0.18 155)" : selectedNode.status === "WARNING" ? "oklch(0.68 0.20 42)" : "oklch(0.60 0.22 22)", background: "oklch(0.148 0.012 255)" }}>{selectedNode.status}</span>
                    </div>
                    <p className="mono text-xs" style={{ color: "oklch(0.52 0.010 255)" }}>{selectedNode.ip}</p>
                    <div className="p-2.5 rounded-lg border mono text-xs leading-relaxed" style={{ background: "oklch(0.148 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}>
                      <span style={{ color: "oklch(0.52 0.010 255)" }}>Class:</span> <span className="font-bold" style={{ color: "oklch(0.94 0.006 255)" }}>{selectedNode.category} Unit</span><br />
                      <span style={{ color: "oklch(0.52 0.010 255)" }}>Index:</span> <span style={{ color: "oklch(0.82 0.008 255)" }}>{selectedNode.x}% range marker</span><br />
                      <span style={{ color: "oklch(0.52 0.010 255)" }}>Angle:</span> <span style={{ color: "oklch(0.82 0.008 255)" }}>{selectedNode.angle}° azimuth</span>
                    </div>
                    <p className="text-xs italic leading-relaxed" style={{ color: "oklch(0.58 0.010 255)" }}>"{selectedNode.details}"</p>
                    {selectedNode.status !== "HEALTHY" && (
                      <div className="p-2.5 rounded-lg border text-xs leading-relaxed" style={{ background: "oklch(0.235 0.038 22 / 0.3)", borderColor: "oklch(0.60 0.22 22 / 0.3)", color: "oklch(0.82 0.18 22)" }}>
                        <p className="font-bold flex items-center gap-1.5 mb-1"><ShieldAlert className="w-3 h-3" />Incident warning triggered!</p>
                        <p>Visit the <strong>AI Compliance Desk</strong> tab or activate the scan button for quick audit commands.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-center py-8" style={{ color: "oklch(0.52 0.010 255)" }}>Select a glowing Node on the Radar sphere to inspect detailed telemetry.</p>
                )}
              </div>
              <div className="mt-4 pt-3 border-t flex gap-2" style={{ borderColor: "oklch(0.28 0.012 255)" }}>
                <button onClick={() => setActiveTab("audit")} className="flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer" style={{ background: "oklch(0.52 0.18 255)", color: "white" }}>
                  Open AI Auditor <ArrowRight className="w-3 h-3" />
                </button>
                <button onClick={triggerManualScan} className="py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer" style={{ background: "oklch(0.235 0.012 255)", borderColor: "oklch(0.28 0.012 255)", color: "oklch(0.82 0.008 255)" }}>Re-verify</button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: AI COMPLIANCE DESK ── */}
        {activeTab === "audit" && (
          <div className="flex-1 flex flex-col p-5 overflow-y-auto z-10">
            {/* Banner */}
            <div className="rounded-xl border p-4 mb-5" style={{ background: "oklch(0.192 0.012 255)", borderColor: "oklch(0.52 0.18 255 / 0.15)" }}>
              <span className="mono text-[0.70rem] uppercase tracking-widest px-2 py-0.5 rounded border font-bold" style={{ color: "oklch(0.72 0.14 200)", background: "oklch(0.148 0.012 255)", borderColor: "oklch(0.52 0.18 255 / 0.2)" }}>WORKSPACE CORE</span>
              <h3 className="text-sm font-bold mt-1.5 mb-1" style={{ color: "oklch(0.94 0.006 255)" }}>Policy Gap Analysis with Gemini AI</h3>
              <p className="text-xs leading-relaxed max-w-2xl" style={{ color: "oklch(0.58 0.010 255)" }}>Paste system configuration, suspicious log files, or security policy documents below. The AI will cross-reference against international compliance standards.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 flex-1 items-stretch">
              {/* Input editor */}
              <div className="xl:col-span-5 rounded-xl border p-4 flex flex-col gap-3" style={{ background: "oklch(0.192 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}>
                <div className="flex justify-between items-center">
                  <span className="mono text-[0.70rem] uppercase font-bold tracking-wide" style={{ color: "oklch(0.52 0.010 255)" }}>Policy / Log to Scan</span>
                  <div className="flex items-center gap-1.5">
                    <label className="mono text-[0.70rem]" style={{ color: "oklch(0.52 0.010 255)" }}>Standard:</label>
                    <select value={auditStandard} onChange={e => setAuditStandard(e.target.value)} className="rounded px-2 py-0.5 mono text-xs font-bold outline-none" style={{ background: "oklch(0.148 0.012 255)", border: "1px solid oklch(0.28 0.012 255)", color: "oklch(0.72 0.14 200)" }}>
                      <option value="GDPR - General Protection Registry">GDPR Protection</option>
                      <option value="SOC2 Type II Audit Schema">SOC2 Security</option>
                      <option value="ISO 27001 Code of Practice">ISO 27001 Code</option>
                      <option value="GDPR / SOC2 Combo">GDPR + SOC2 Combo</option>
                      <option value="HIPAA Healthcare Compliance">HIPAA Healthcare</option>
                    </select>
                  </div>
                </div>
                <textarea value={customAuditContent} onChange={e => setCustomAuditContent(e.target.value)}
                  className="flex-1 min-h-[180px] rounded-lg p-3 text-xs mono leading-relaxed resize-none outline-none transition-all"
                  style={{ background: "oklch(0.148 0.012 255)", border: "1px solid oklch(0.28 0.012 255)", color: "oklch(0.82 0.008 255)" }}
                  placeholder="Paste configuration, log, or security policy here..." />
                <div>
                  <p className="mono text-[0.70rem] uppercase tracking-widest mb-1.5" style={{ color: "oklch(0.52 0.010 255)" }}>Quick Templates:</p>
                  <div className="flex flex-col gap-1">
                    {PRELOADED_TEMPLATES.map((tpl, i) => (
                      <button key={i} onClick={() => { setCustomAuditContent(tpl.content); setAuditStandard(tpl.standard); }}
                        className="text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-2 cursor-pointer border"
                        style={{ background: "oklch(0.148 0.012 255)", borderColor: "oklch(0.28 0.012 255)", color: "oklch(0.58 0.010 255)" }}>
                        <FileText className="w-3 h-3 shrink-0" style={{ color: "oklch(0.72 0.14 200)" }} />{tpl.title}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => handleAiAudit(customAuditContent, auditStandard)} disabled={isAuditing || !customAuditContent.trim()}
                  className="w-full py-2.5 rounded-lg text-xs font-bold tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                  style={{ background: isAuditing || !customAuditContent.trim() ? "oklch(0.235 0.012 255)" : "oklch(0.52 0.18 255)", color: isAuditing || !customAuditContent.trim() ? "oklch(0.52 0.010 255)" : "white" }}>
                  {isAuditing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Analyzing with AI...</> : <><Activity className="w-3.5 h-3.5" />RUN COMPLIANCE AUDIT</>}
                </button>
                {auditErrorMessage && <p className="mono text-[0.70rem] leading-relaxed p-2 rounded border" style={{ color: "oklch(0.68 0.20 42)", background: "oklch(0.235 0.030 42 / 0.3)", borderColor: "oklch(0.68 0.20 42 / 0.3)" }}>{auditErrorMessage}</p>}
              </div>

              {/* Audit results */}
              <div className="xl:col-span-7 rounded-xl border p-4 flex flex-col gap-4 overflow-y-auto" style={{ background: "oklch(0.192 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}>
                {auditResult ? (
                  <>
                    <div className={`flex flex-col md:flex-row gap-4 p-3.5 rounded-xl border`} style={{ background: auditResult.status === "CRITICAL_VIOLATION" ? "oklch(0.235 0.038 22 / 0.3)" : auditResult.status === "FAILED" ? "oklch(0.235 0.030 42 / 0.3)" : "oklch(0.225 0.022 155 / 0.3)", borderColor: auditResult.status === "CRITICAL_VIOLATION" ? "oklch(0.60 0.22 22 / 0.3)" : auditResult.status === "FAILED" ? "oklch(0.68 0.20 42 / 0.3)" : "oklch(0.60 0.18 155 / 0.3)" }}>
                      <div className="flex flex-col justify-center pr-4 border-r" style={{ borderColor: "oklch(0.28 0.012 255)" }}>
                        <p className="mono text-[0.70rem] uppercase tracking-widest mb-0.5" style={{ color: "oklch(0.52 0.010 255)" }}>Audit Status</p>
                        <span className="mono text-sm font-extrabold tracking-wider" style={{ color: auditResult.status === "CRITICAL_VIOLATION" ? "oklch(0.60 0.22 22)" : auditResult.status === "FAILED" ? "oklch(0.68 0.20 42)" : "oklch(0.60 0.18 155)" }}>{auditResult.status}</span>
                      </div>
                      <div className="flex flex-col justify-center items-center px-4 border-r" style={{ borderColor: "oklch(0.28 0.012 255)" }}>
                        <p className="mono text-[0.70rem] uppercase tracking-widest mb-0.5" style={{ color: "oklch(0.52 0.010 255)" }}>Compliance Grade</p>
                        <span className="mono text-3xl font-extrabold" style={{ color: "oklch(0.94 0.006 255)" }}>{auditResult.score}%</span>
                      </div>
                      <div className="flex flex-col justify-center px-2">
                        <p className="text-xs italic leading-relaxed" style={{ color: "oklch(0.58 0.010 255)" }}>"{auditResult.summary}"</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="mono text-[0.70rem] font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1" style={{ color: "oklch(0.60 0.22 22)" }}>
                        <AlertTriangle className="w-3.5 h-3.5" />GAP FINDINGS ({auditResult.findings.length})
                      </h4>
                      <div className="space-y-2.5">
                        {auditResult.findings.map((item: any) => (
                          <div key={item.id} className="rounded-lg p-3 border flex flex-col gap-2" style={{ background: "oklch(0.148 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}>
                            <div className="flex items-center gap-2">
                              <span className="mono text-[0.70rem] font-bold px-1.5 py-0.5 rounded uppercase" style={{ background: "oklch(0.60 0.22 22)", color: "white" }}>{item.severity}</span>
                              <span className="mono text-xs font-bold" style={{ color: "oklch(0.82 0.008 255)" }}>{item.id} — {item.control}</span>
                            </div>
                            <p className="text-xs font-medium" style={{ color: "oklch(0.86 0.008 255)" }}>{item.issue}</p>
                            <div className="text-xs p-2.5 rounded border leading-normal" style={{ background: "oklch(0.192 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}>
                              <p className="mono text-[0.70rem] font-bold uppercase mb-0.5" style={{ color: "oklch(0.60 0.22 22)" }}>Impact Vector:</p>
                              <p className="mb-2" style={{ color: "oklch(0.82 0.008 255)" }}>{item.impact}</p>
                              <p className="mono text-[0.70rem] font-bold uppercase mb-0.5" style={{ color: "oklch(0.60 0.18 155)" }}>Step-by-step Remediation:</p>
                              <p className="mono p-2 rounded border whitespace-pre-wrap" style={{ color: "oklch(0.76 0.14 155)", background: "oklch(0.148 0.012 255)", borderColor: "oklch(0.60 0.18 155 / 0.15)" }}>{item.remediation}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {auditResult.verifiedAssets?.length > 0 && (
                      <div>
                        <h4 className="mono text-[0.70rem] font-bold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: "oklch(0.60 0.18 155)" }}>
                          <CheckCircle2 className="w-3.5 h-3.5" />VERIFIED COMPLIANT ASSETS
                        </h4>
                        <ul className="space-y-1.5">
                          {auditResult.verifiedAssets.map((asset: string, i: number) => (
                            <li key={i} className="rounded px-2.5 py-1 text-xs flex items-center gap-2 border" style={{ background: "oklch(0.225 0.022 155 / 0.2)", borderColor: "oklch(0.60 0.18 155 / 0.2)", color: "oklch(0.76 0.14 155)" }}>
                              <Check className="w-3.5 h-3.5 shrink-0" />{asset}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                    <FileText className="w-10 h-10 mb-2" style={{ color: "oklch(0.35 0.010 255)" }} />
                    <p className="text-xs" style={{ color: "oklch(0.52 0.010 255)" }}>No results yet.</p>
                    <p className="text-xs max-w-sm mt-1" style={{ color: "oklch(0.44 0.010 255)" }}>Paste configuration or select a template on the left, then click 'RUN COMPLIANCE AUDIT' for AI analysis.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: THREAT TERMINAL ── */}
        {activeTab === "intelligence" && (
          <div className="flex-1 flex flex-col p-5 overflow-hidden z-10">
            <div className="flex-1 rounded-2xl border p-4 flex flex-col overflow-hidden" style={{ background: "black", borderColor: "oklch(0.28 0.012 255)" }}>
              {/* Terminal header */}
              <div className="flex justify-between items-center pb-3 border-b text-xs shrink-0 mono" style={{ borderColor: "oklch(0.52 0.18 255 / 0.2)", color: "oklch(0.72 0.14 200)" }}>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "oklch(0.60 0.22 22)" }}></div>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "oklch(0.68 0.20 42)" }}></div>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "oklch(0.60 0.18 155)" }}></div>
                  </div>
                  <span>CO-RADAR THREAT AUDITING TERMINAL</span>
                </div>
                <span>HOST: secure-node-eu-01</span>
              </div>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-2">
                {chatMessages.map((msg, idx) => {
                  const isUser = msg.sender === "user";
                  return (
                    <div key={idx} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                      <div className="flex items-center gap-2.5 mb-1 mono text-[0.70rem]" style={{ color: "oklch(0.44 0.010 255)" }}>
                        <span className="font-bold">{isUser ? "OPERATOR" : "INTELLIGENCE AI"}</span>
                        <span>—</span>
                        <span>{msg.time}</span>
                      </div>
                      <div className={`p-3 rounded-lg text-xs leading-relaxed max-w-xl whitespace-pre-wrap ${isUser ? "rounded-tr-none" : "rounded-tl-none"}`}
                        style={{ background: isUser ? "oklch(0.52 0.18 255 / 0.2)" : "oklch(0.192 0.012 255)", color: isUser ? "oklch(0.86 0.008 255)" : "oklch(0.82 0.008 255)", border: `1px solid ${isUser ? "oklch(0.52 0.18 255 / 0.2)" : "oklch(0.28 0.012 255)"}`, fontFamily: isUser ? "inherit" : "inherit" }}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                {isSendingChat && (
                  <div className="flex flex-col items-start animate-pulse">
                    <p className="mono text-[0.70rem] mb-1" style={{ color: "oklch(0.72 0.14 200)" }}>AI IS EVALUATING THE COMPLEX CRITERIAS...</p>
                    <div className="w-12 h-4 rounded-sm" style={{ background: "oklch(0.235 0.012 255)" }}></div>
                  </div>
                )}
              </div>
              {/* Input */}
              <form onSubmit={e => { e.preventDefault(); handleSendChat(chatInput); }}
                className="mt-3 pt-3.5 border-t flex gap-2 shrink-0" style={{ borderColor: "oklch(0.28 0.012 255)" }}>
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                  placeholder="Ask security standard recommendations, patch commands, code reviews... (e.g. How to fix docker root vulnerability?)"
                  className="flex-1 rounded-lg px-3 py-2 text-xs outline-none transition-all"
                  style={{ background: "oklch(0.148 0.012 255)", border: "1px solid oklch(0.28 0.012 255)", color: "oklch(0.82 0.008 255)" }} />
                <button type="submit" disabled={isSendingChat || !chatInput.trim()}
                  className="flex items-center justify-center px-4 rounded-lg transition-all cursor-pointer"
                  style={{ background: isSendingChat || !chatInput.trim() ? "oklch(0.235 0.012 255)" : "oklch(0.52 0.18 255)", color: "white" }}>
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </section>

      {/* ── Right Sidebar: Alert Register ── */}
      <aside className="w-68 border-l flex flex-col shrink-0" suppressHydrationWarning style={{ width: 272, background: "oklch(0.168 0.012 255)", borderColor: "oklch(0.28 0.012 255)" }}>
        <div className="p-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: "oklch(0.28 0.012 255)" }}>
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" style={{ color: "oklch(0.72 0.14 200)" }} />
            <span className="mono text-[0.70rem] uppercase tracking-widest font-extrabold" style={{ color: "oklch(0.58 0.010 255)" }}>Active Alert Register</span>
          </div>
          <span className="mono text-[0.70rem] px-1.5 py-0.5 rounded border font-bold" style={{ background: "oklch(0.192 0.012 255)", borderColor: "oklch(0.28 0.012 255)", color: "oklch(0.72 0.14 200)" }}>
            {incidents.filter(i => i.priority !== "RESOLVED").length} Unsolved
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {incidents.map(inc => {
            const isActive = selectedIncident?.id === inc.id;
            const borderLeft = inc.priority === "HIGH" ? "oklch(0.60 0.22 22)" : inc.priority === "WARNING" ? "oklch(0.68 0.20 42)" : inc.priority === "RESOLVED" ? "oklch(0.60 0.18 155)" : "oklch(0.52 0.18 255)";
            const badgeBg = inc.priority === "HIGH" ? "oklch(0.235 0.038 22 / 0.5)" : inc.priority === "WARNING" ? "oklch(0.235 0.030 42 / 0.5)" : inc.priority === "RESOLVED" ? "oklch(0.225 0.022 155 / 0.5)" : "oklch(0.235 0.020 255 / 0.5)";
            const badgeColor = inc.priority === "HIGH" ? "oklch(0.82 0.18 22)" : inc.priority === "WARNING" ? "oklch(0.80 0.16 42)" : inc.priority === "RESOLVED" ? "oklch(0.76 0.14 155)" : "oklch(0.72 0.14 200)";
            return (
              <div key={inc.id} onClick={() => setSelectedIncident(isActive ? null : inc)}
                className="cursor-pointer p-3 rounded-lg transition-all duration-200"
                style={{ borderLeft: `2px solid ${borderLeft}`, background: isActive ? "oklch(0.235 0.020 255 / 0.5)" : "oklch(0.192 0.012 255)", outline: isActive ? `1px solid oklch(0.52 0.18 255 / 0.3)` : "none", opacity: inc.priority === "RESOLVED" ? 0.6 : 1 }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="mono text-[0.70rem] font-bold px-1.5 py-0.5 rounded uppercase" style={{ background: badgeBg, color: badgeColor }}>{inc.priority}</span>
                  <span className="mono text-[0.70rem]" style={{ color: "oklch(0.44 0.010 255)" }}>{inc.time}</span>
                </div>
                <p className="mono text-xs font-bold mb-0.5" style={{ color: "oklch(0.82 0.008 255)" }}>{inc.id}</p>
                <p className="text-xs leading-snug break-words" style={{ color: "oklch(0.58 0.010 255)" }}>{inc.desc}</p>

                {isActive && (
                  <div className="mt-2.5 flex flex-col gap-2">
                    {inc.details && <p className="text-[0.70rem] leading-relaxed border-t pt-2" style={{ color: "oklch(0.52 0.010 255)", borderColor: "oklch(0.28 0.012 255)" }}>{inc.details}</p>}
                    {inc.triageText && (
                      <div className="rounded p-2 border text-[0.70rem] leading-relaxed whitespace-pre-wrap" style={{ background: "oklch(0.148 0.012 255)", borderColor: "oklch(0.28 0.012 255)", color: "oklch(0.82 0.008 255)" }}>{inc.triageText}</div>
                    )}
                    {inc.priority !== "RESOLVED" && (
                      <div className="flex gap-1.5 mt-1">
                        <button onClick={e => { e.stopPropagation(); handleTriageIncident(inc); }} disabled={inc.isTriaging}
                          className="flex-1 py-1.5 rounded text-[0.70rem] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 border"
                          style={{ background: "oklch(0.52 0.18 255 / 0.15)", borderColor: "oklch(0.52 0.18 255 / 0.3)", color: "oklch(0.72 0.14 200)" }}>
                          {inc.isTriaging ? <><RefreshCw className="w-3 h-3 animate-spin" />Triaging...</> : <><Cpu className="w-3 h-3" />Triage with AI</>}
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleRemediate(inc.id); }} disabled={isSyncingEngine}
                          className="flex-1 py-1.5 rounded text-[0.70rem] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 border"
                          style={{ background: "oklch(0.225 0.022 155 / 0.2)", borderColor: "oklch(0.60 0.18 155 / 0.3)", color: "oklch(0.76 0.14 155)" }}>
                          {isSyncingEngine ? <><RefreshCw className="w-3 h-3 animate-spin" />Processing...</> : <><ShieldCheck className="w-3 h-3" />Quick Remediate</>}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
