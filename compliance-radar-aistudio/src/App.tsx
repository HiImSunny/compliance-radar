import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  Terminal, 
  Cpu, 
  Lock, 
  Unlock, 
  Send, 
  RefreshCw, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Compass, 
  Plus, 
  Search, 
  Check, 
  Sliders, 
  HelpCircle,
  TrendingUp,
  FileCode,
  ArrowRight,
  Database,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

// Interfaces for our app state
interface Incident {
  id: string;
  time: string;
  priority: 'HIGH' | 'WARNING' | 'INFO' | 'RESOLVED';
  source: string;
  desc: string;
  details?: string;
  triageText?: string;
  isTriaging?: boolean;
}

interface ComplianceStandard {
  id: string;
  name: string;
  initialScore: number;
  description: string;
  controls: {
    code: string;
    name: string;
    status: 'COMPLIANT' | 'WARNING' | 'FAILED';
    remediation: string;
  }[];
}

interface RadarNode {
  id: string;
  name: string;
  x: number; // radius distance percentage (0 to 100)
  angle: number; // 0 to 360 degrees
  category: 'Network' | 'Data' | 'Infrastructure' | 'Operational';
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  details: string;
  ip: string;
}

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'radar' | 'audit' | 'intelligence'>('radar');

  // Interactive System Metrics controlled by user sliders
  const [sliderFirewall, setSliderFirewall] = useState<number>(85);
  const [sliderUnpatched, setSliderUnpatched] = useState<number>(12);
  const [sliderKeyRotation, setSliderKeyRotation] = useState<number>(90);
  const [isSyncingEngine, setIsSyncingEngine] = useState<boolean>(false);

  // Core risk index and health calculations
  const globalRiskIndex = Math.min(
    100,
    Math.max(
      0,
      Number(
        (
          (100 - sliderFirewall) * 0.4 +
          sliderUnpatched * 3.5 +
          (100 - sliderKeyRotation) * 0.2
        ).toFixed(1)
      )
    )
  );

  const calculatedIntegrity = Math.max(92.0, 100 - globalRiskIndex / 15).toFixed(2);

  // App alerts state (Live incidents)
  const [incidents, setIncidents] = useState<Incident[]>([
    {
      id: 'INC-7049',
      time: '14:22:01',
      priority: 'HIGH',
      source: 'S3_ARCHIVE_EUROPE',
      desc: 'Anomalous bulk export detected from S3. Possible data leakage.',
      details: 'IP 185.220.101.5 querying historical financial databases violating GDPR Art 32 encryption requirements.',
    },
    {
      id: 'INC-6520',
      time: '14:15:40',
      priority: 'WARNING',
      source: 'AUTH_SERVER_PRIMARY',
      desc: 'Password policy non-compliance found in 14 user accounts (Domain-A).',
      details: 'Audit revealed accounts with active passes older than 365 days. Active Directory group policies failing SOC2 standard requirements.',
    },
    {
      id: 'INC-2401',
      time: '13:58:12',
      priority: 'INFO',
      source: 'LOG_ROTATION_DAEMON',
      desc: 'Monthly SOC2 audit log rotation initiated. 24.2GB processed.',
      details: 'Audit trail archived securely in GCS. Retention policy verified compliant with SOC2 Type II Trust Services Criteria CC2.1.',
    },
    {
      id: 'INC-1094',
      time: '12:30:55',
      priority: 'RESOLVED',
      source: 'PROD_LB_GATEWAY',
      desc: 'Unauthorized open port 8080 exposure closed on production balancer.',
      details: 'Manual verification complete. Ports scanned and secured. Network filter updated successfully.',
    }
  ]);

  // Selected incident details modal / side panel
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Alert simulation runner
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate random safe compliance activity or warnings occasionally
      const r = Math.random();
      if (r < 0.15) {
        const sources = ['REDSHIFT_REPLICA', 'API_DOCS_STAGING', 'DOCKER_REGISTRY', 'KUBE_NODE_04'];
        const randomSource = sources[Math.floor(Math.random() * sources.length)];
        const alerts = [
          {
            desc: 'Database encryption keys rotated successfully.',
            priority: 'INFO' as const,
            details: 'Automated policy rotation executing hourly intervals securely.',
          },
          {
            desc: 'Unregistered endpoint query detected in staging region.',
            priority: 'WARNING' as const,
            details: 'Subnet firewall logged temporary packet drops to external APIs.',
          },
          {
            desc: 'Container base-image CVE scan triggered.',
            priority: 'INFO' as const,
            details: 'Scanning latest registry builds against national vulnerability database.',
          }
        ];
        const selectedAlert = alerts[Math.floor(Math.random() * alerts.length)];
        const formatTime = () => {
          const now = new Date();
          return now.toTimeString().split(' ')[0];
        };

        const newInc: Incident = {
          id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
          time: formatTime(),
          source: randomSource,
          desc: selectedAlert.desc,
          priority: selectedAlert.priority,
          details: selectedAlert.details
        };

        setIncidents(prev => [newInc, ...prev.slice(0, 8)]);
      }
    }, 18000);

    return () => clearInterval(interval);
  }, []);

  // Standard compliance levels base structure
  const [complianceStandards, setComplianceStandards] = useState<ComplianceStandard[]>([
    {
      id: 'gdpr',
      name: 'GDPR Compliance',
      initialScore: 92,
      description: 'General Data Protection Regulation standards governing sensitive EU customer data handling, consent, and user encryptions.',
      controls: [
        { code: 'ART-32', name: 'Security of Personal Data Processing', status: 'COMPLIANT', remediation: 'Ensure TLS 1.3 is strictly enforced to protect personal tracking attributes.' },
        { code: 'ART-25', name: 'Data Protection by Design & Default', status: 'WARNING', remediation: 'Implement automated fields mask in logs files to hide specific IP logs & sessions.' },
        { code: 'ART-17', name: 'Right to Erasure / Retention Policies', status: 'COMPLIANT', remediation: 'Audit script triggers scheduled delete queries on expired visitor records.' },
      ]
    },
    {
      id: 'soc2',
      name: 'SOC2 Type II',
      initialScore: 84,
      description: 'Independent audit framework testing Security, Availability, Processing Integrity, Confidentiality, and Privacy controls.',
      controls: [
        { code: 'CC-6.1', name: 'Logical Access Protections / MFA', status: 'FAILED', remediation: "Enforce multi-factor authentication across all SSH terminals & root logins on primary subnets." },
        { code: 'CC-6.3', name: 'Physical Server Access Controls', status: 'COMPLIANT', remediation: "Secure facility logging sync with server rooms biometric locks." },
        { code: 'CC-6.7', name: 'Transmission Vulnerabilities Scanning', status: 'COMPLIANT', remediation: "Scheduled automated Docker image scanning at active build time." },
      ]
    },
    {
      id: 'iso27001',
      name: 'ISO 27001 ISMS',
      initialScore: 71,
      description: 'International benchmark specifying requirements for establishing, maintaining, and continually improving an Information Security System.',
      controls: [
        { code: 'A.12.6.1', name: 'Technical Vulnerabilities Management', status: 'WARNING', remediation: "Run system-wide vulnerability patching scans weekly to trace old libraries." },
        { code: 'A.12.4.1', name: 'Event Logging & Audit Logs Trails', status: 'COMPLIANT', remediation: "Forward all raw kernel messages to an immutable write-once read-many bucket." },
        { code: 'A.9.2.1', name: 'User Access Approvals Registry', status: 'FAILED', remediation: "Ensure quarterly review documentation of directory system permissions is signed off by CIO." },
      ]
    }
  ]);

  const [selectedStandard, setSelectedStandard] = useState<ComplianceStandard>(complianceStandards[0]);

  // Interactive node radar points configuration
  const initialNodes: RadarNode[] = [
    { id: 'node-1', name: 'Edge Firewall 01', x: 75, angle: 45, category: 'Network', status: 'HEALTHY', details: 'Operational state. Inspecting inbound packets. TLS decryption active.', ip: '10.0.1.250' },
    { id: 'node-2', name: 'Direct Connect Link', x: 45, angle: 120, category: 'Network', status: 'HEALTHY', details: '950Mbps average throughput. Encrypted VPN state clear.', ip: '10.12.0.1' },
    { id: 'node-3', name: 'GDPR Customer Vault', x: 82, angle: 220, category: 'Data', status: 'WARNING', details: 'Active encryption active. Minor gap in logging rotation frequency.', ip: '192.168.4.15' },
    { id: 'node-4', name: 'S3 Historical Backups', x: 90, angle: 260, category: 'Data', status: 'CRITICAL', details: 'Recent non-standard bulk export request executed. Possible leakage threat.', ip: 's3.eu-west-1.aws' },
    { id: 'node-5', name: 'Production VM Cluster', x: 35, angle: 300, category: 'Infrastructure', status: 'HEALTHY', details: '8 instances live. Kernel patches up to date. Security agent running.', ip: '10.0.5.2' },
    { id: 'node-6', name: 'Staging VM Group', x: 60, angle: 330, category: 'Infrastructure', status: 'WARNING', details: '14 unpatched libraries found in container daemon.', ip: '10.0.5.99' },
    { id: 'node-7', name: 'IAM Access Registry', x: 40, angle: 90, category: 'Operational', status: 'HEALTHY', details: 'MFA requirement active for 98% of workforce groups.', ip: 'iam.radar.sys' },
    { id: 'node-8', name: 'Biometric Logins Gate', x: 70, angle: 15, category: 'Operational', status: 'HEALTHY', details: 'Security system syncing without alerts.', ip: 'physical.core.gate' },
  ];

  const [radarNodes, setRadarNodes] = useState<RadarNode[]>(initialNodes);
  const [selectedNode, setSelectedNode] = useState<RadarNode | null>(radarNodes[3]);

  // Adjust node statuses based on user metrics
  useEffect(() => {
    setRadarNodes(prevNodes => prevNodes.map(node => {
      if (node.category === 'Network') {
        return {
          ...node,
          status: sliderFirewall > 70 ? 'HEALTHY' : sliderFirewall > 40 ? 'WARNING' : 'CRITICAL',
          details: sliderFirewall > 70 
            ? 'Strict firewall inspections. Port restrictions fully enforced.' 
            : 'Weak system security logic in place. Dynamic port mapping vulnerable.'
        };
      }
      if (node.category === 'Infrastructure') {
        return {
          ...node,
          status: sliderUnpatched < 8 ? 'HEALTHY' : sliderUnpatched < 25 ? 'WARNING' : 'CRITICAL',
          details: sliderUnpatched < 8 
            ? 'Operating with pristine kernel alignment. Zero unpatched CVEs found.' 
            : `Detected ${sliderUnpatched} critical unpatched CVEs. Exposed attack interfaces potential.`
        };
      }
      if (node.category === 'Data') {
        return {
          ...node,
          status: sliderKeyRotation > 75 ? 'HEALTHY' : sliderKeyRotation > 45 ? 'WARNING' : 'CRITICAL',
          details: sliderKeyRotation > 75 
            ? 'Immutable storage partitions securely active. Symmetric keys rotated.' 
            : 'Key age verification warning. Cryptographic standard deterioration.'
        };
      }
      return node;
    }));
  }, [sliderFirewall, sliderUnpatched, sliderKeyRotation]);

  // AI Auditing Workspace
  const [customAuditContent, setCustomAuditContent] = useState<string>(
    `-- CONFIGURATION AUDIT REPORT --\nsystem.environment = "Production"\nnetwork.open_ports = [80, 443, 8080, 22, 3306]\ndatabase.encryption_enabled = false\ns3_bucket.public_access = "READ_WRITE"\nuser_directory.mfa_enforced = false\nlog_retention.days = 5`
  );
  const [auditStandard, setAuditStandard] = useState<string>('GDPR / SOC2 Combo');
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditErrorMessage, setAuditErrorMessage] = useState<string | null>(null);

  // Gemini AI Security Copilot Chat chatbot
  const [chatInput, setChatInput] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'ai'; text: string; time: string }[]>([
    {
      sender: 'ai',
      text: `Xin chào! Tôi là **Trợ lý Kiểm toán AI Radar**. Tôi đã load đầy đủ dữ liệu thời gian thực từ các Sensor mạng và các Tiêu chuẩn Compliance hiện tại của hệ thống.
      
Bạn có thể hỏi tôi về cách khắc phục các Incident hoặc dán log, chính sách bảo mật bất kỳ để tôi phân tích khoảng cách bảo mật (Gap Analysis) trực tiếp bằng mô hình **Gemini 3.5**.`,
      time: '14:02'
    }
  ]);
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);

  // Quick select templates for instant audit proofing
  const preloadedTemplates = [
    {
      title: "Cấu hình Docker Sơ hở (SOC2)",
      standard: "SOC2 Type II - CC6.3",
      content: `FROM node:18-alpine\nENV NODE_ENV=production\nWORKDIR /app\nCOPY . .\n# ROOT USER EXECUTION\nUSER root\nRUN chmod -R 777 /app\nEXPOSE 22\nEXPOSE 8080\nCMD ["node", "server.js"]`
    },
    {
      title: "Log AWS S3 rò rỉ dữ liệu (GDPR)",
      standard: "GDPR Art 32 - Encryption Gap",
      content: `2026-05-28T09:12:05Z aws_s3_log anonymous_user ObjectAccess:Get\nBucket: customers-passports-archive\nURI: https://s3.amazonaws.com/customers-passports-archive/passport_export_9281.zip\nIP: 89.141.22.181 (Latvia)\nSignature: NO_SIGN_VERIFIED\nStatus: 200 OK`
    },
    {
      title: "Chính sách mật khẩu lỗi thời (ISO 27001)",
      standard: "ISO 27001 - A.9 Users Access Control",
      content: `[Password Policy]\npassword_min_length = 6\npassword_complexity = false\nmax_password_age_days = -1 # No expiration\nretry_limit_to_lockout = 99\nmfa_bypass_group = "everyone-and-external-guests"`
    }
  ];

  // Manual Scan Trigger
  const [isManualScanning, setIsManualScanning] = useState<boolean>(false);
  const [scanPulseCount, setScanPulseCount] = useState<number>(0);

  const triggerManualScan = () => {
    setIsManualScanning(true);
    setScanPulseCount(0);
    const audio = new Audio(); // silent placeholder
    
    let iterations = 0;
    const interval = setInterval(() => {
      setScanPulseCount(prev => prev + 1);
      iterations++;
      if (iterations >= 3) {
        clearInterval(interval);
        setIsManualScanning(false);
        // Slightly improve firewall score as a reward
        setSliderFirewall(prev => Math.min(100, prev + 5));
        
        // Add info alert
        const now = new Date();
        const scanSuccessAlert: Incident = {
          id: `INC-SCAN`,
          time: now.toTimeString().split(' ')[0],
          priority: 'RESOLVED',
          source: 'SYSTEM_AUDITOR',
          desc: 'Manual Compliance perimeter sweep completed successfully.',
          details: 'Verified 8 high priority system nodes. All endpoints evaluated against target standard guidelines.'
        };
        setIncidents(prev => [scanSuccessAlert, ...prev]);
      }
    }, 1000);
  };

  // Perform AI compliance evaluation
  const handleAiAudit = async (contentInput: string, standardInput: string) => {
    setIsAuditing(true);
    setAuditErrorMessage(null);
    setAuditResult(null);

    try {
      const response = await fetch('/api/gemini/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentInput,
          standard: standardInput,
          context: 'Compliance Radar System Live Dashboard Evaluation'
        })
      });

      const data = await response.json();
      
      if (!response.ok || data.isMock) {
        // AI Key not found or server returned fallback indicator
        // Use high-fidelity local response simulating Gemini logic instantly for ultra-flawless UX!
        setTimeout(() => {
          const simulatedAudit = simulateLocalAudit(contentInput, standardInput);
          setAuditResult(simulatedAudit);
          setIsAuditing(false);
          if (data.isMock) {
            setAuditErrorMessage("Trực quan hóa bằng chế độ Sandbox Nội bộ (Chưa thiết lập khóa API Gemini - Kết quả được mô phỏng chi tiết).");
          }
        }, 1500);
      } else {
        setAuditResult(data);
        setIsAuditing(false);
      }
    } catch (e: any) {
      console.warn("API Error, using fallback local smart audit system:", e);
      setTimeout(() => {
        setAuditResult(simulateLocalAudit(contentInput, standardInput));
        setIsAuditing(false);
        setAuditErrorMessage("Hệ thống mất kết nối mạng. Đã dùng thuật toán phân tích bảo mật dự phòng.");
      }, 1200);
    }
  };

  // Chat request with Gemini
  const handleSendChat = async (userMsgText: string) => {
    if (!userMsgText.trim()) return;
    const now = new Date();
    const formattedTime = now.toTimeString().slice(0, 5);

    const updatedMessages = [...chatMessages, { sender: 'user' as const, text: userMsgText, time: formattedTime }];
    setChatMessages(updatedMessages);
    setChatInput('');
    setIsSendingChat(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsgText })
      });

      const data = await response.json();
      if (!response.ok || data.isMock) {
        // Fallback simulated bot answering nicely in Vietnamese
        setTimeout(() => {
          const reply = getSimulatedBotReply(userMsgText);
          setChatMessages(prev => [...prev, {
            sender: 'ai',
            text: reply,
            time: new Date().toTimeString().slice(0, 5)
          }]);
          setIsSendingChat(false);
        }, 1200);
      } else {
        setChatMessages(prev => [...prev, {
          sender: 'ai',
          text: data.text || 'Không có câu trả lời từ máy chủ.',
          time: new Date().toTimeString().slice(0, 5)
        }]);
        setIsSendingChat(false);
      }
    } catch (err: any) {
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          sender: 'ai',
          text: '⚠️ Thiết bị mất kết nối tới API Gemini. Khắc phục: Hãy kiểm tra các tab Secrets để thiết lập khóa API hợp lệ, hoặc thử lại sau.\n\nĐề xuất nhanh: Thay đổi cấu hình tường lửa bằng cách thu nhỏ port 8080 trong Dockerfile.',
          time: new Date().toTimeString().slice(0, 5)
        }]);
        setIsSendingChat(false);
      }, 1000);
    }
  };

  // Auto-triage a specific incident via AI
  const handleTriageIncident = async (inc: Incident) => {
    // Update loading state for this incident
    setIncidents(prev => prev.map(item => item.id === inc.id ? { ...item, isTriaging: true } : item));
    if (selectedIncident?.id === inc.id) {
      setSelectedIncident(prev => prev ? { ...prev, isTriaging: true } : null);
    }

    try {
      // Prompt Gemini about this specific incident
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: `Hãy phân tích sự cố bảo mật sau dưới góc nhìn chuyên gia giám sát và cho biết tại sao cần khắc phục khẩn cấp và đưa ra một shell script khắc phục ngắn gọi, thực tế:
          Sự cố: ${inc.desc}
          Nguồn sự cố: ${inc.source}
          Chi tiết thêm: ${inc.details || ''}` 
        })
      });

      const data = await response.json();
      const triageTextCombined = response.ok && !data.isMock 
        ? data.text 
        : getSimulatedTriageText(inc);

      setIncidents(prev => prev.map(item => 
        item.id === inc.id 
          ? { ...item, isTriaging: false, triageText: triageTextCombined } 
          : item
      ));

      if (selectedIncident?.id === inc.id) {
        setSelectedIncident(prev => prev ? { ...prev, isTriaging: false, triageText: triageTextCombined } : null);
      }
    } catch (err) {
      const fallbackText = getSimulatedTriageText(inc);
      setIncidents(prev => prev.map(item => 
        item.id === inc.id 
          ? { ...item, isTriaging: false, triageText: fallbackText } 
          : item
      ));
      if (selectedIncident?.id === inc.id) {
        setSelectedIncident(prev => prev ? { ...prev, isTriaging: false, triageText: fallbackText } : null);
      }
    }
  };

  // Instantly repair / remediate an incident
  const handleRemediate = (incId: string) => {
    setIsSyncingEngine(true);
    setTimeout(() => {
      setIncidents(prev => prev.map(item => {
        if (item.id === incId) {
          return {
            ...item,
            priority: 'RESOLVED' as const,
            desc: item.desc.replace('detected', 'resolved & patched') + ' (Đã khắc phục)',
          };
        }
        return item;
      }));

      // If resolving S3 leak, reset corresponding node state
      if (incId === 'INC-7049') {
        setSliderKeyRotation(98);
      }
      if (incId === 'INC-6520') {
        setSliderUnpatched(prev => Math.max(0, prev - 8));
      }

      // Refresh currently selected details
      setSelectedIncident(null);
      setIsSyncingEngine(false);
    }, 1500);
  };

  // Helper simulated intelligence answers
  function getSimulatedTriageText(inc: Incident): string {
    if (inc.id === 'INC-7049') {
      return `### 🚨 ĐÁNH GIÁ TRIAGE AI: bulk S3_ARCHIVE_EUROPE export
**Phân tích rủi ro:** Một IP công cộng trái phép đang tải lượng lớn dữ liệu nén tệp zip từ máy chủ tài chính. Có dấu hiệu bẻ khóa token JWT hoặc rò rỉ khóa AWS Secret Access Key.

**Mức độ vi phạm:** **GDPR Điều 32 (An toàn dữ liệu nhạy cảm)** - Vi phạm nghiêm trọng về bảo mật dữ liệu khách hàng EU. Có thể bị phạt tới **20 triệu EUR** từ cơ quan quản lý.

**Script khắc phục khẩn cấp bằng Linux AWS CLI:**
\`\`\`bash
# 1. Quay vòng ngay lập tức AWS credentials bị lộ
aws iam deactivate-user-key --user-name production-backup-operator --access-key-id AKIAIOSFODNN7EXAMPLE

# 2. Áp dụng Block Public Access tức thì lên S3 bucket rò rỉ
aws s3api put-public-access-block \\
  --bucket customers-passports-archive \\
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
\`\`\``;
    }
    
    if (inc.id === 'INC-6520') {
      return `### ⚠️ ĐÁNH GIÁ TRIAGE AI: Password Policy Non-Compliance
**Phân tích rủi ro:** Phát hiện 14 tài khoản quản trị dịch vụ chưa thay đổi mật khẩu định kỳ trong 365 ngày qua. Thiếu MFA làm tăng nguy cơ tấn công brute-force hoặc nhồi thông tin đăng nhập (Credential Stuffing).

**Mức độ vi phạm:** **SOC2 CC-6.1 / ISO 27001 Kiểm soát Truy cập**.

**Câu lệnh khôi phục / Reset khẩn cấp trên AD PowerShell:**
\`\`\`powershell
# Buộc thay đổi mật khẩu khi đăng nhập tiếp theo với tất cả user vi phạm
Get-ADUser -Filter "PasswordLastSet -lt $((Get-Date).AddDays(-365))" | 
  Set-ADUser -ChangePasswordAtLogon $true
\`\`\``;
    }

    return `### 🔍 ĐÁNH GIÁ CHUYÊN SÂU AI: Sự cố ${inc.id}
**Đánh giá:** Sensor ghi nhận hoạt động không đồng bộ trong mô-đun nguồn \`${inc.source}\`.
**Khắc phục đề xuất:** Khởi chạy kiểm toán log nội bộ, thu hồi kết nối tạm thời từ subnet không xác thực và chạy lệnh kiểm tra tính toàn vẹn:
\`\`\`bash
# Cập nhật quyền hạn và rà soát file cấu hình hệ thống
chmod 600 /etc/security/radar_config.json
sudo systemctl restart secure_node_agent
\`\`\``;
  }

  function getSimulatedBotReply(userInput: string): string {
    const text = userInput.toLowerCase();
    if (text.includes('gdpr') || text.includes('art')) {
      return `### 🇪🇺 Phân tích GDPR từ AI
Đối với hệ thống lưu trữ dữ liệu nhạy cảm của khách hàng EU:
1. **Mã hóa bắt buộc (Art 32):** Toàn bộ database của bạn phải bật mã hóa đối xứng AES-256. Hiện tại slider xoay vòng Key của bạn ở mức **${sliderKeyRotation}%**, cần đẩy lên **95%** để xóa cảnh báo At-risk.
2. **Quyền được quên (Art 17):** Phải viết một cron service định kỳ rà soát các bản ghi khách hàng quá hạn lưu trữ.
3. **Mã hóa và giảm tải dữ liệu nhạy cảm:** Hãy sử dụng các thư viện như Cryptography của Node để hash các dữ liệu định danh như Số hộ chiếu, IP khách hàng trước khi đưa vào tệp log.`;
    }
    if (text.includes('soc2') || text.includes('ports') || text.includes('cổng')) {
      return `### 🛡️ Đánh giá Tiêu chuẩn SOC2 Type II
Hệ thống giám sát radar đang ghi nhận mức Risk Index toàn cầu ở mức **${globalRiskIndex}/100**. Để duy trì chứng chỉ SOC2:
- **CC6.1 - Quản lý Định danh:** Phải bật MFA bắt buộc đối với tất cả user hệ thống. Tránh tình trạng whitelist cả subnet bằng group bypass ảo.
- **CC6.3 - Quản lý cấu hình thay đổi:** File cấu hình Docker không được chạy trực tiếp bằng quyền \`USER root\`. Hãy thêm dòng lệnh tạo user non-root ở cuối Dockerfile.
- **Remediation Action:** Click vào các sự cố nguy cơ cao ở bảng bên trái và chọn **Giải quyết nhanh** để cập nhật trạng thái online.`;
    }
    return `### 📡 Phóng phân tích Radar thành công
**Đánh giá hạ tầng hiện tại:**
- Chỉ số Tường lửa an toàn mạng: **${sliderFirewall}%**
- Số máy chủ chưa vá lỗi bảo mật (CVE): **${sliderUnpatched} nodes**
- Tỷ lệ Key Rotation đồng bộ: **${sliderKeyRotation}%**

*Đề xuất hành động:* Kéo slider **Unpatched Servers** xuống thấp hơn hoặc nhấn nút **Manual Scan** ở trục Radar trung tâm để nâng cấp tức thời trạng thái Compliance của toàn bộ perimeter lên mức an toàn tuyệt đối.`;
  }

  function simulateLocalAudit(textInput: string, std: string): any {
    const isDocker = textInput.includes('FROM') || textInput.includes('USER root');
    const isS3 = textInput.includes('aws_s3_log') || textInput.includes('passport');
    const isPw = textInput.includes('password_min_length') || textInput.includes('No expiration');

    if (isDocker) {
      return {
        status: "CRITICAL_VIOLATION",
        score: 42,
        summary: "Phát hiện cấu hình container Dockerfile vi phạm nghiêm trọng tính an toàn của SOC2 và ISO 27001 vì chạy trực tiếp bằng root user cùng việc mở các port nhạy cảm vô điều kiện.",
        findings: [
          {
            id: "GAP-01",
            severity: "CRITICAL",
            control: "SOC2 CC6.3 - Change Management & Logical Protections",
            issue: "Docker container thiết lập quyền USER root điều khiển toàn bộ Linux kernel.",
            impact: "Khi hacker khai thác lỗi rò rỉ mã nguồn hoặc lỗi của ứng dụng chạy trong container, họ có quyền root trực tiếp để hijack host machine của bạn.",
            remediation: "Sửa Dockerfile: Tạo user custom không có đặc quyền và gán quyền sở hữu thư mục chứa app."
          },
          {
            id: "GAP-02",
            severity: "HIGH",
            control: "ISO 27001 A.12.6 - Technical Vulnerabilities",
            issue: "Mở cổng SSH port 22 và port 8080 ra ngoài internet công cộng.",
            impact: "Tạo điều kiện cho các BOT dò quét mật khẩu và tấn công SSH brute-force tràn lan.",
            remediation: "Xóa dòng lệnh EXPOSE 22 khỏi Dockerfile. Chỉ cho phép SSH thông qua tunnel VPN VPN-Gateway nội bộ."
          }
        ],
        verifiedAssets: [
          "Sử dụng base image an toàn node:18-alpine giúp giảm thiểu 80% dung lượng và thư viện thừa lỗi thời.",
          "Thư mục làm việc /app được khoanh vùng rõ ràng."
        ]
      };
    }

    if (isS3) {
      return {
        status: "CRITICAL_VIOLATION",
        score: 30,
        summary: "Log S3 Bucket cho thấy các yêu cầu truy vấn ẩn danh lấy hồ sơ khách hàng EU thành công trực tiếp mà không thông qua cơ chế kiểm soát token JWT, vi phạm trực tiếp hiến chương GDPR quy chuẩn bảo vệ dữ liệu cá nhân.",
        findings: [
          {
            id: "GAP-01",
            severity: "CRITICAL",
            control: "GDPR Art 32 - Security of Processing",
            issue: "Tệp Zip chứa hộ chiếu nhạy cảm bị tải xuống công khai không cần chữ ký số.",
            impact: "Rò rỉ toàn bộ cơ sở dữ liệu định danh khách hàng ra các chợ đen, chịu khoản phạt hành chính khổng lồ.",
            remediation: "Bật chế độ Block Public Access trên AWS Console hoặc chạy lệnh block của CLI. Chuyển đổi sang cấp phát Pre-signed URLs có hạn dùng ngắn."
          }
        ],
        verifiedAssets: [
          "Tiêu chuẩn lưu trữ nhật ký truy vết AWS CloudTrail CloudWatch được cấu hình đúng.",
          "Timestamp ISO-8601 được ghi nhận đầy đủ hỗ trợ phục dựng sự cố."
        ]
      };
    }

    if (isPw) {
      return {
        status: "FAILED",
        score: 55,
        summary: "Văn bản chính sách mật khẩu lỗi thời nghiêm trọng, hoàn toàn vi phạm quy định về xác thực mạnh mẽ của cả ISO 27001 và SOC2.",
        findings: [
          {
            id: "GAP-01",
            severity: "HIGH",
            control: "ISO 27001 A.9.4.3 - Password Management System",
            issue: "Thiết lập tuổi thọ tối đa của mật khẩu là không giới hạn (-1 days).",
            impact: "Người dùng không thay đổi mật khẩu trong nhiều năm, tạo điều kiện cho các lỗ hổng mật khẩu tĩnh bị lộ lặp lại vô thời hạn.",
            remediation: "Cấu hình max_password_age_days = 90 để buộc thay đổi mật khẩu định kỳ 3 tháng."
          },
          {
            id: "GAP-02",
            severity: "CRITICAL",
            control: "SOC2 CC-6.1 Identity Access Management",
            issue: "Group bỏ qua MFA lại chứa mặc định 'everyone-and-external-guests'.",
            impact: "Hệ thống bảo vệ đa nhân tố MFA bị vô hiệu hóa hoàn toàn đối với hầu hết nhân viên.",
            remediation: "Loại bỏ group bypass MFA hoang dã. Áp dụng chính sách MFA bắt buộc cho mọi người dùng không ngoại lệ."
          }
        ],
        verifiedAssets: [
          "Mức giới hạn sai số retry_limit_to_lockout được định nghĩa mặc dù quá lớn."
        ]
      };
    }

    // Default template-like simulated report
    return {
      status: "PARTIAL",
      score: 74,
      summary: "Tài liệu kiểm toán được phân tích thành công bởi core AI. Hệ thống chứa một số lỗ hổng trung bình liên quan đến chính sách lưu trữ log và kiểm soát truy cập từ xa.",
      findings: [
        {
          id: "GAP-01",
          severity: "MEDIUM",
          control: "SOC2 Trust Criteria - Common Criteria 6.1",
          issue: "Chính sách kiểm toán chưa định rõ việc hủy khóa định danh khi nhân viên rời khỏi dự án.",
          impact: "Các tài khoản zombie vẫn nắm giữ quyền truy cập database lâu dài.",
          remediation: "Tích hợp LDAP/Active Directory OKTA SSO để đồng bộ hóa vòng đời tài khoản tự động."
        }
      ],
      verifiedAssets: [
        "Mã hóa dữ liệu đang truyền tải (TLS) được tuân thủ đúng đắn.",
        "Thiết bị giám sát an ninh ghi nhận hoạt động đều đặn."
      ]
    };
  }

  return (
    <div className="bg-[#0B0E14] text-slate-300 font-sans h-screen w-full flex flex-col overflow-hidden select-none" id="app_root">
      
      {/* Top Navigation Bar */}
      <nav id="navbar" className="h-16 border-b border-slate-800/60 bg-[#0F1219] flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-3" id="brand_container">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/30 border border-indigo-500/30 animate-pulse">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-wider text-white">
              COMPLIANCE<span className="text-indigo-500 font-medium">RADAR</span>
            </span>
            <span className="text-[9px] text-slate-500 tracking-widest font-mono uppercase">Enterprise Perimeter Active</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-900/60 p-1 rounded-lg border border-slate-800/50" id="nav_tabs">
          <button 
            id="tab_radar_btn"
            onClick={() => setActiveTab('radar')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'radar' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Radar Sphere
          </button>
          
          <button
            id="tab_audit_btn"
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'audit' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            AI Compliance Desk
          </button>

          <button
            id="tab_intel_btn"
            onClick={() => setActiveTab('intelligence')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'intelligence' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Threat Terminal
          </button>
        </div>

        <div className="flex items-center gap-4 text-sm font-medium" id="system_status_container">
          <div className="flex items-center gap-3 bg-[#131924] px-3.5 py-1.5 rounded-lg border border-slate-800">
            <div className="h-2 w-2 bg-emerald-500 rounded-full animate-ping"></div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-mono">SYSTEM INTEGRITY</p>
              <p className="text-xs text-emerald-400 font-bold font-mono tracking-wider">SECURE_LIVE_{calculatedIntegrity}%</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shadow bg-gradient-to-tr from-slate-900 to-indigo-950">
            SEC
          </div>
        </div>
      </nav>

      {/* Main Structural Layout */}
      <main className="flex-1 flex overflow-hidden w-full" id="main_layout">
        
        {/* Left Side Sidebar - Active Standards & Risk Index Controls */}
        <aside id="sidebar_left" className="w-64 border-r border-slate-800/60 bg-[#0D1017] p-5 flex flex-col gap-6 select-none shrink-0 overflow-y-auto">
          
          {/* Active Compliance Scopes */}
          <section id="scopes_section">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Standards Matrix</h3>
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded-full font-mono">Active</span>
            </div>
            
            <div className="space-y-2.5" id="standards_list">
              {complianceStandards.map((std) => {
                const isSelected = selectedStandard.id === std.id;
                let pct = std.initialScore;
                
                // Dynamically offset score based on sliders to make it ultra interactive!
                if (std.id === 'gdpr') {
                  pct = Math.round(std.initialScore + (sliderKeyRotation - 90) * 0.15 - (sliderUnpatched > 10 ? 4 : 0));
                } else if (std.id === 'soc2') {
                  pct = Math.round(std.initialScore + (sliderFirewall - 85) * 0.25 - (sliderUnpatched > 15 ? 8 : 0));
                } else {
                  pct = Math.round(std.initialScore - (sliderUnpatched - 12) * 0.8 + (sliderKeyRotation - 90) * 0.1);
                }
                const score = Math.max(10, Math.min(100, pct));

                let colorClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
                let indicatorColor = 'bg-emerald-500';
                if (score < 75) {
                  colorClass = 'bg-red-500/10 border-red-500/30 text-red-300';
                  indicatorColor = 'bg-red-500';
                } else if (score < 90) {
                  colorClass = 'bg-amber-500/15 border-amber-500/30 text-amber-300';
                  indicatorColor = 'bg-amber-500';
                }

                return (
                  <div 
                    key={std.id}
                    onClick={() => {
                      setSelectedStandard(std);
                      setActiveTab('audit');
                    }}
                    className={`group cursor-pointer p-2.5 rounded-lg border transition-all duration-300 ${
                      isSelected 
                        ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-100 shadow-sm' 
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700/80 hover:bg-slate-900/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold font-mono tracking-tight group-hover:text-white transition-colors">{std.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${colorClass}`}>
                        {score}%
                      </span>
                    </div>
                    
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${indicatorColor} transition-all duration-500`} style={{ width: `${score}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Interactive Simulation Panel to influence Compliance on runtime */}
          <section id="interactive_simulation_panel" className="bg-[#121620] border border-indigo-950/40 p-4 rounded-xl flex flex-col gap-3.5">
            <div className="flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold text-indigo-200 tracking-wider">Perimeter Rig Modulators</h4>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              Thay đổi các thông số bên dưới để kiểm tra tính nhạy bén của radar và chỉ số rủi ro hệ thống tức thì:
            </p>

            {/* Slider 1 */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400 font-mono uppercase">1. Firewall Power</span>
                <span className="text-indigo-400 font-bold font-mono">{sliderFirewall}%</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="100" 
                value={sliderFirewall} 
                onChange={(e) => setSliderFirewall(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Slider 2 */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400 font-mono uppercase">2. Unpatched Servers</span>
                <span className="text-amber-400 font-bold font-mono">{sliderUnpatched} VMs</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="40" 
                value={sliderUnpatched} 
                onChange={(e) => setSliderUnpatched(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Slider 3 */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400 font-mono uppercase">3. Crypto Certificate Age</span>
                <span className="text-emerald-400 font-bold font-mono">{sliderKeyRotation}% Life</span>
              </div>
              <input 
                type="range" 
                min="20" 
                max="100" 
                value={sliderKeyRotation} 
                onChange={(e) => setSliderKeyRotation(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </section>

          {/* Global Risk posture gauge */}
          <section id="risk_posture_panel" className="bg-[#121620]/30 border border-slate-800/50 rounded-xl p-4 mt-auto">
            <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Internal Threats Index</h3>
            
            <div className="flex items-baseline gap-1 mb-2">
              <div className="text-3.5xl font-light text-white font-mono">{globalRiskIndex}</div>
              <div className="text-xs text-slate-500">/ 100</div>
            </div>

            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
              <div 
                className={`h-full transition-all duration-500 ${
                  globalRiskIndex > 70 
                    ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' 
                    : globalRiskIndex > 35 
                    ? 'bg-amber-500' 
                    : 'bg-emerald-500'
                }`} 
                style={{ width: `${globalRiskIndex}%` }}
              ></div>
            </div>

            <p className="text-[10.5px] text-slate-400 font-serif italic leading-relaxed">
              {globalRiskIndex > 70 
                ? "Nguy cơ cao! Hãy nhấp chọn 'Triage với AI' để nhận chuỗi mã lệnh ứng phó." 
                : globalRiskIndex > 35 
                ? "Cảnh báo rủi ro tăng nhẹ. Có khả năng rò rỉ hoặc thiếu chứng nhận." 
                : "Posture is fully safe and secure within nominal compliance limits."}
            </p>
          </section>

        </aside>

        {/* Center Panel (Modular Tab Area & SVG Radar Grid) */}
        <section id="content_middle" className="flex-1 bg-[#0A0C10] flex flex-col relative overflow-hidden">
          
          {/* Futuristic background grid */}
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1.2px)', backgroundSize: '18px 18px' }}></div>

          {/* Sub Header for Live Area */}
          <div className="px-6 py-4 flex justify-between items-center border-b border-slate-800/40 z-10 shrink-0">
            <div className="flex items-center gap-2">
              <Activity className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
              <h2 className="text-sm font-bold text-white tracking-widest uppercase">Perimeter Scanning Matrix</h2>
            </div>
            
            <div className="flex items-center gap-1.5 text-[10px] bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>
              <span className="text-indigo-300 font-mono font-medium lowercase">updating live sensor telemetry</span>
            </div>
          </div>

          {/* TAB 1: RADAR SPHERE */}
          {activeTab === 'radar' && (
            <div className="flex-1 flex flex-col lg:flex-row p-6 gap-6 overflow-y-auto z-10" id="tab_radar_content">
              
              {/* Spinning Interactive Radar Compass Container */}
              <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[#090b10]/40 rounded-2xl border border-slate-800/40">
                <div className="relative w-[340px] h-[340px] md:w-[380px] md:h-[380px] rounded-full flex items-center justify-center border border-indigo-950/60 shadow-inner">
                  
                  {/* CSS Rotary Scanning Bar */}
                  <div className={`absolute inset-0 rounded-full pointer-events-none ${isManualScanning ? 'duration-500 opacity-100' : 'opacity-40'}`} style={{
                    background: 'conic-gradient(from 0deg, rgba(79, 70, 229, 0.45) 0deg, rgba(79, 70, 229, 0) 120deg)',
                    animation: isManualScanning ? 'sweep 1.2s infinite linear' : 'sweep 6s infinite linear'
                  }}></div>

                  {/* SVG Circles representing distance rings */}
                  <svg className="absolute w-full h-full pointer-events-none overflow-visible">
                    {/* Ring 1 */}
                    <circle cx="50%" cy="50%" r="20%" fill="none" stroke="rgba(99, 102, 241, 0.08)" strokeDasharray="3 3" />
                    {/* Ring 2 */}
                    <circle cx="50%" cy="50%" r="35%" fill="none" stroke="rgba(99, 102, 241, 0.12)" />
                    {/* Ring 3 */}
                    <circle cx="50%" cy="50%" r="50%" fill="none" stroke="rgba(99, 102, 241, 0.16)" strokeDasharray="5 5" />
                    
                    {/* Grid division lines */}
                    <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(99, 102, 241, 0.08)" />
                    <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(99, 102, 241, 0.08)" />
                  </svg>

                  {/* Quadrant labels */}
                  <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[9px] font-mono tracking-widest text-[#4f46e5] font-extrabold uppercase">1. NETWORK GUARD</span>
                  <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-mono tracking-widest text-indigo-500/80 font-extrabold uppercase">3. DATA INTEGRITY</span>
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[9px] font-mono tracking-widest text-indigo-500/80 font-extrabold uppercase -rotate-90">4. INFRA CLOUD</span>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-mono tracking-widest text-indigo-500/80 font-extrabold uppercase rotate-90">2. COMPLIANCE OPS</span>

                  {/* Node targets plotted based on Polar conversion (radius, angle) */}
                  {radarNodes.map((node) => {
                    // Coordinates around 50% center
                    const radius = node.x * 0.45; // clamp space
                    const radian = (node.angle * Math.PI) / 180;
                    const left = `calc(50% + ${radius * Math.cos(radian)}% - 8px)`;
                    const top = `calc(50% + ${radius * Math.sin(radian)}% - 8px)`;

                    // Color based on status
                    let dotColor = 'bg-emerald-400 shadow-[0_0_8px_#10b981]';
                    if (node.status === 'CRITICAL') {
                      dotColor = 'bg-red-500 shadow-[0_0_12px_#ef4444] animate-ping';
                    } else if (node.status === 'WARNING') {
                      dotColor = 'bg-amber-400 shadow-[0_0_8px_#f59e0b]';
                    }

                    const isNodeActive = selectedNode?.id === node.id;

                    return (
                      <button
                        key={node.id}
                        onClick={() => setSelectedNode(node)}
                        className="absolute w-4.5 h-4.5 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-130 z-20 cursor-pointer"
                        style={{ left, top }}
                      >
                        <div className={`w-3 h-3 rounded-full ${dotColor} ${isNodeActive ? 'ring-4 ring-white/10 scale-120' : ''}`} />
                        {node.status === 'CRITICAL' && (
                          <div className="absolute w-6 h-6 rounded-full bg-red-600/30 animate-ping pointer-events-none"></div>
                        )}
                      </button>
                    );
                  })}

                  {/* Manual Sweep Button inside Center dial */}
                  <button 
                    onClick={triggerManualScan}
                    disabled={isManualScanning}
                    className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-full shadow-lg flex items-center justify-center flex-col transition-all duration-300 hover:border-indigo-500 hover:bg-slate-950/80 active:scale-95 group shrink-0 select-none cursor-pointer z-35"
                  >
                    <RefreshCw className={`w-4 h-4 text-indigo-400 ${isManualScanning ? 'animate-spin' : 'group-hover:rotate-45 transition-transform'}`} />
                    <span className="text-[8px] text-slate-500 font-mono mt-1 select-none font-bold">SCAN</span>
                  </button>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-[10px] text-slate-500 font-mono tracking-widest">
                    {isManualScanning 
                      ? `KIỂM TRA AN TOÀN CHU TRÌNH ${scanPulseCount}/3...` 
                      : 'Radar liên tục quét 8 phân khu an ninh. Chọn node để kiểm toán chi tiết.'}
                  </p>
                </div>
              </div>

              {/* Node Detail Inspector Tab */}
              <div className="w-full lg:w-72 bg-[#0E121A] rounded-2xl border border-slate-800/80 p-5 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-800">
                    <Database className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-mono font-bold tracking-wider text-indigo-200">Sensor Node Telemetry</span>
                  </div>

                  {selectedNode ? (
                    <div className="flex flex-col gap-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white tracking-wide">{selectedNode.name}</h4>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            selectedNode.status === 'HEALTHY' 
                              ? 'bg-emerald-500/10 text-emerald-400' 
                              : selectedNode.status === 'WARNING' 
                              ? 'bg-amber-500/10 text-amber-300' 
                              : 'bg-red-500/15 text-red-400'
                          }`}>
                            {selectedNode.status}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-slate-500 mt-1">{selectedNode.ip}</p>
                      </div>

                      <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-[11px] leading-relaxed font-mono">
                        <span className="text-slate-400">Class:</span> <span className="text-white font-bold">{selectedNode.category} Unit</span><br/>
                        <span className="text-slate-400">Index:</span> <span className="text-slate-200">{selectedNode.x}% range marker</span><br/>
                        <span className="text-slate-400">Angle:</span> <span className="text-slate-200">{selectedNode.angle}° azimuth</span>
                      </div>

                      <div>
                        <p className="text-[11px] text-slate-400 font-serif italic mb-1 leading-relaxed">
                          "{selectedNode.details}"
                        </p>
                      </div>

                      {selectedNode.status !== 'HEALTHY' && (
                        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-[11px] leading-relaxed text-red-200">
                          <p className="font-bold flex items-center gap-1.5 mb-1 text-red-300">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Incident warning triggered!
                          </p>
                          <p>
                            Vui lòng truy cập tab <strong>AI Compliance Desk</strong> hoặc kích hoạt quét sự cố bên cạnh để nhận mã lệnh kiểm toán nhanh.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-xs text-slate-500">Hãy chọn một Node phát sáng trên vòng tròn Radar để kiểm tra thông số chi tiết.</p>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex justify-between gap-2.5">
                  <button 
                    onClick={() => setActiveTab('audit')}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10"
                  >
                    Mở AI Auditor
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={triggerManualScan}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-bold border border-slate-700 hover:text-white transition-all cursor-pointer"
                  >
                    Re-verify
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: AI COMPLIANCE AUDITING WORKSPACE */}
          {activeTab === 'audit' && (
            <div className="flex-1 flex flex-col p-6 overflow-y-auto z-10" id="tab_audit_content">
              
              {/* Informative Intro banner */}
              <div className="bg-gradient-to-r from-indigo-950/40 via-indigo-900/10 to-transparent border border-indigo-500/10 p-4 rounded-xl mb-6">
                <span className="text-[9px] uppercase tracking-widest text-indigo-400 font-bold bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40 font-mono">WORKSPACE CORE</span>
                <h3 className="text-sm font-bold text-white mt-1.5 mb-1 leading-snug">Vùng Phân tích rò rỉ Chính sách bằng Gemini AI</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-2xl">
                  Dán nội dung cấu hình hệ thống, tệp log đáng nghi hoặc văn bản quy chế bảo mật vào khung dưới đây. Mô hình AI sẽ đối chiếu trực tiếp với các tiêu chuẩn an toàn quốc tế tối cao.
                </p>
              </div>

              {/* Grid workspace */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 items-stretch">
                
                {/* Input Editor area (5cols) */}
                <div className="xl:col-span-5 bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                  <div className="flex flex-col gap-4 flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide font-mono">Chính sách / Log cần quét</span>
                      
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] text-slate-500 tracking-tight font-mono">Đối chiếu:</label>
                        <select 
                          value={auditStandard} 
                          onChange={(e) => setAuditStandard(e.target.value)}
                          className="bg-slate-950 border border-slate-800 text-[10.5px] text-indigo-300 font-mono rounded px-2 py-0.5 outline-none font-bold"
                        >
                          <option value="GDPR - General Protection Registry">GDPR Protection</option>
                          <option value="SOC2 Type II Audit Schema">SOC2 Security</option>
                          <option value="ISO 27001 Code of Practice">ISO 27001 Code</option>
                          <option value="GDPR / SOC2 Combo">Dual Combo (GDPR & SOC2)</option>
                        </select>
                      </div>
                    </div>

                    <textarea
                      value={customAuditContent}
                      onChange={(e) => setCustomAuditContent(e.target.value)}
                      placeholder="Paste your system configurations, AWS credentials setups, docker/nginx configs, or user directory policies..."
                      className="w-full h-80 xl:h-auto xl:flex-1 bg-slate-950 border border-slate-800/80 rounded-lg p-3 text-xs text-indigo-100 font-mono focus:border-indigo-500 focus:outline-none transition-all resize-none leading-relaxed"
                    />

                    {/* Preloaded Template Selection */}
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 tracking-wide mb-2.5 font-mono uppercase">Quick Trial Templates (Mẫu Thử nhanh)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {preloadedTemplates.map((tpl, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setCustomAuditContent(tpl.content);
                              setAuditStandard(tpl.standard);
                            }}
                            className="bg-slate-950/90 border border-slate-800/80 hover:border-indigo-500/50 hover:bg-indigo-950/5 text-left p-2 rounded transition-all duration-300 text-slate-300"
                          >
                            <p className="text-[10px] font-bold text-indigo-400 tracking-tight font-mono mb-0.5 truncate">{tpl.title}</p>
                            <p className="text-[9px] text-slate-500">{tpl.standard}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-slate-800">
                    <button
                      onClick={() => handleAiAudit(customAuditContent, auditStandard)}
                      disabled={isAuditing || !customAuditContent.trim()}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-lg text-xs tracking-wider transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isAuditing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          TIẾN HÀNH KIỂM TOÁN CHUYÊN SÂU GEMINI AI...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          QUẤT BÁO CÁO THẤT THOÁT BẢO MẬT (AI AUDIT)
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Audit Result Display area (7cols) */}
                <div className="xl:col-span-7 bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex flex-col overflow-hidden min-h-[400px]">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
                    <h3 className="text-xs font-bold text-white tracking-widest font-mono uppercase">AI Gap Analysis Report (Kết quả từ Gemini)</h3>
                    {auditResult && (
                      <span className="text-[10px] text-slate-500 font-mono">Verified securely.</span>
                    )}
                  </div>

                  {auditErrorMessage && (
                    <div className="mb-4 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded text-xs text-amber-300 font-serif leading-relaxed italic">
                      ℹ️ {auditErrorMessage}
                    </div>
                  )}

                  {isAuditing ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                      <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                        <Shield className="w-6 h-6 text-indigo-400 animate-pulse" />
                      </div>
                      <p className="text-xs text-indigo-200 font-mono tracking-wider">ĐỐI CHIẾU VECTOR AN TOÀN TRÊN GEMINI 3.5...</p>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase">parsing AST syntax tree and detecting access control regulations</p>
                    </div>
                  ) : auditResult ? (
                    <div className="flex-1 flex flex-col overflow-y-auto space-y-4">
                      
                      {/* Overall Compliance Rating Score Card */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-stretch bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <div className="flex flex-col justify-center items-center md:border-r border-slate-800 py-1.5">
                          <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mb-1">Status Verdict</p>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            auditResult.status === 'COMPLIANT' 
                              ? 'bg-emerald-500/15 text-emerald-400' 
                              : auditResult.status === 'PARTIAL' 
                              ? 'bg-amber-500/15 text-amber-300' 
                              : 'bg-red-500/15 text-red-400 border border-red-500/30'
                          }`}>
                            {auditResult.status}
                          </span>
                        </div>

                        <div className="flex flex-col justify-center items-center md:border-r border-slate-800 py-1.5">
                          <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mb-0.5">Compliance Grade</p>
                          <div className="text-3xl font-extrabold font-mono text-white">{auditResult.score}%</div>
                        </div>

                        <div className="flex flex-col justify-center gap-1.5 py-1.5 px-2">
                          <p className="text-[10px] text-slate-400 font-serif italic leading-relaxed">
                            "{auditResult.summary}"
                          </p>
                        </div>
                      </div>

                      {/* List of Specific Gaps/Findings */}
                      <div>
                        <h4 className="text-[10px] font-bold text-red-400 tracking-wider font-mono uppercase mb-3 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                          PHÁT HIỆN SỰ CỐ / LỖ HỔNG (Gap Findings: {auditResult.findings.length})
                        </h4>
                        
                        <div className="space-y-3">
                          {auditResult.findings.map((item: any) => (
                            <div key={item.id} className="bg-slate-950 rounded-lg p-3.5 border border-slate-850 flex flex-col gap-2">
                              <div className="flex justify-between items-start gap-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-white bg-red-600 font-bold px-1.5 py-0.5 rounded font-mono uppercase tracking-tight">{item.severity}</span>
                                  <span className="text-[11px] font-bold text-slate-300 font-mono">{item.id} — {item.control}</span>
                                </div>
                              </div>
                              
                              <p className="text-[12.5px] text-slate-200 font-medium">{item.issue}</p>
                              
                              <div className="text-[11px] bg-[#0E1119] p-2.5 rounded border border-slate-800 text-slate-400 leading-normal">
                                <p className="text-[10px] font-bold text-red-400 tracking-wide font-mono uppercase mb-0.5">Impact Vector (Nguy hại):</p>
                                <p className="text-slate-300 mb-2">{item.impact}</p>

                                <p className="text-[10px] font-bold text-emerald-400 tracking-wide font-mono uppercase mb-0.5">Step-by-step Remediation (Khắc phục chỉ định):</p>
                                <p className="text-emerald-300 font-mono bg-slate-950 p-2 rounded border border-emerald-500/10 whitespace-pre-wrap">{item.remediation}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Verified compliant facets */}
                      {auditResult.verifiedAssets && auditResult.verifiedAssets.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-bold text-emerald-400 tracking-wider font-mono uppercase mb-2 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            CÁC PHẦN KIỂM CHỨNG ĐẠT CHUẨN (Compliant Safe Assets)
                          </h4>
                          <ul className="space-y-1.5">
                            {auditResult.verifiedAssets.map((asset: string, index: number) => (
                              <li key={index} className="bg-emerald-500/5 border border-emerald-500/10 rounded px-2.5 py-1 text-[11px] text-emerald-300 flex items-center gap-2">
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                {asset}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-20 text-slate-500">
                      <FileText className="w-10 h-10 mb-2 text-slate-600" />
                      <p className="text-xs">Chưa có kết quả.</p>
                      <p className="text-[10px] max-w-sm mt-1">Dán cấu hình hoặc chọn tệp mẫu bên trái, sau đó nhấn nút 'QUẤT BÁO CÁO' để AI liên lục địa phân tách chi tiết.</p>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: THREAT INTELLIGENCE LIVE TERMINAL */}
          {activeTab === 'intelligence' && (
            <div className="flex-1 flex flex-col p-6 overflow-hidden z-10" id="tab_intel_content">
              
              {/* Terminal View */}
              <div className="flex-1 bg-black rounded-2xl border border-slate-800 p-5 flex flex-col justify-between font-mono overflow-hidden shadow-2xl">
                
                {/* Header terminal banner */}
                <div className="flex justify-between items-center pb-3 border-b border-indigo-950 text-xs shrink-0 text-indigo-400">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                    </div>
                    <span>CO-RADAR THREAT AUDITING TERMINAL</span>
                  </div>
                  <div>
                    <span>HOST: secure-node-eu-01</span>
                  </div>
                </div>

                {/* List scrollable chat console */}
                <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-2" id="chat_logs_console">
                  {chatMessages.map((msg, idx) => {
                    const isUser = msg.sender === 'user';
                    return (
                      <div key={idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2.5 mb-1 text-[10px] text-slate-500">
                          <span className="font-bold">{isUser ? 'OPERATOR' : 'INTELLIGENCE AI'}</span>
                          <span>—</span>
                          <span>{msg.time}</span>
                        </div>
                        
                        <div className={`p-3 rounded-lg text-xs leading-relaxed max-w-xl whitespace-pre-wrap ${
                          isUser 
                            ? 'bg-indigo-600/20 text-indigo-50 border border-indigo-500/20 rounded-tr-none' 
                            : 'bg-slate-900/90 text-slate-300 border border-slate-800 rounded-tl-none font-sans'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}

                  {isSendingChat && (
                    <div className="flex flex-col items-start animate-pulse">
                      <p className="text-[10px] text-indigo-400 mb-1">AI IS EVALUATING THE COMPLEX CRITERIAS...</p>
                      <div className="w-12 h-4 bg-slate-800 rounded-sm"></div>
                    </div>
                  )}
                </div>

                {/* Input block */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChat(chatInput);
                  }}
                  className="mt-3 pt-3.5 border-t border-slate-800/80 flex gap-2 shrink-0 select-none"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask security standard recommendations, patch commands, code reviews... (e.g. Làm sao sửa lỗi docker root?)"
                    className="flex-1 bg-stone-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                  />
                  <button
                    type="submit"
                    disabled={isSendingChat || !chatInput.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 hover:scale-102 flex items-center justify-center p-2 rounded-lg text-white transition-all cursor-pointer select-none px-4"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>

              </div>

            </div>
          )}

        </section>

        {/* Right Side Sidebar - Live Dynamic Incidents / Alert Feed */}
        <aside id="sidebar_right" className="w-72 border-l border-slate-800/60 bg-[#0D1017] flex flex-col shrink-0 select-none">
          
          {/* Header block info */}
          <div className="p-4 border-b border-slate-800/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-4.5 h-4.5 text-indigo-400" />
              <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Active Alert Register</h3>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 bg-slate-900 border border-slate-800 font-mono text-indigo-300 rounded font-bold">
              {incidents.filter(inc => inc.priority !== 'RESOLVED').length} Unsolved
            </span>
          </div>

          {/* Dynamic Tickets flow */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" id="incidents_flow_container">
            {incidents.map((inc) => {
              const isActive = selectedIncident?.id === inc.id;
              
              let leftBorder = 'border-l-2 border-indigo-500';
              let priorityColorClass = 'text-indigo-400 bg-indigo-500/10';
              if (inc.priority === 'HIGH') {
                leftBorder = 'border-l-2 border-red-500 bg-red-500/5';
                priorityColorClass = 'text-red-400 bg-red-500/10 border border-red-500/20';
              } else if (inc.priority === 'WARNING') {
                leftBorder = 'border-l-2 border-amber-500 bg-amber-500/5';
                priorityColorClass = 'text-amber-400 bg-amber-500/10';
              } else if (inc.priority === 'RESOLVED') {
                leftBorder = 'border-l-2 border-emerald-500 bg-emerald-500/5 opacity-55';
                priorityColorClass = 'text-emerald-400 bg-emerald-500/10';
              }

              return (
                <div 
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className={`relative p-3 rounded transition-all duration-300 hover:bg-slate-900 cursor-pointer ${leftBorder} ${
                    isActive ? 'bg-slate-900 ring-1 ring-slate-800' : ''
                  }`}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[9px] text-slate-500 font-mono">{inc.time}</span>
                    <span className={`text-[8.5px] px-1.5 rounded font-mono font-bold ${priorityColorClass}`}>
                      {inc.priority}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-slate-200 font-medium leading-relaxed">{inc.desc}</p>
                  <p className="text-[9px] text-slate-500 font-mono mt-1.5 uppercase tracking-wide">Source: {inc.source}</p>
                  
                  {isActive && (
                    <div className="mt-3.5 pt-2 border-t border-slate-800 flex gap-1.5 shrink-0 select-none">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTriageIncident(inc);
                        }}
                        disabled={inc.isTriaging}
                        className="flex-1 py-1 px-2 rounded bg-indigo-650 hover:bg-indigo-600 disabled:bg-slate-950 text-white font-bold text-[9px] tracking-wide transition-all uppercase flex items-center justify-center gap-1 cursor-pointer border border-indigo-550/30"
                      >
                        {inc.isTriaging ? 'Triaging...' : 'AI Triage'}
                      </button>
                      
                      {inc.priority !== 'RESOLVED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemediate(inc.id);
                          }}
                          className="py-1 px-2 rounded bg-emerald-600 hover:bg-emerald-550 text-white font-bold text-[9px] tracking-wide transition-all uppercase cursor-pointer"
                        >
                          Remediate
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sidebar drawer details (only when interactive triage feedback exist) */}
          {selectedIncident && selectedIncident.triageText && (
            <div className="p-4 bg-slate-950 border-t border-slate-800 max-h-80 overflow-y-auto text-xs font-mono text-slate-300">
              <div className="flex justify-between items-center mb-2 text-[10px] text-indigo-400">
                <span className="font-bold">TRIAGE COMPLETED: {selectedIncident.id}</span>
                <button 
                  onClick={() => {
                    const temp = { ...selectedIncident };
                    temp.triageText = undefined;
                    setSelectedIncident(temp);
                  }}
                  className="hover:text-white"
                >
                  Clear Info
                </button>
              </div>
              <div className="prose prose-invert text-[11px] leading-relaxed select-text">
                {selectedIncident.triageText.split('\n').map((line, lidx) => (
                  <p key={lidx} className="mb-1">{line}</p>
                ))}
              </div>
            </div>
          )}

          {/* Summary status counter footer */}
          <div className="p-4 bg-slate-900/60 border-t border-slate-800 shrink-0 select-none">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Historical Scanned Threats</span>
              <span className="text-xs font-mono text-white font-bold">1,402</span>
            </div>
            <div className="text-[10px] text-indigo-400/80 leading-snug">
              Sync logs verified by mutable blockchain registries active.
            </div>
          </div>
        </aside>

      </main>

      {/* Persistent global footer */}
      <footer id="footer" className="h-8 border-t border-slate-800/80 bg-[#0D1017] px-6 flex items-center justify-between shrink-0 select-none z-20">
        <div className="flex gap-4 text-[9px] uppercase tracking-widest text-slate-500 font-mono">
          <span>ACTIVE COMPLY SHELL NODE: CLOUD_CONTAINER_US_EAST_1</span>
          <span>LATENCY: 12ms</span>
          <span>UPTIME: 99.987%</span>
          <span>SYNC: ACTIVE_BLOCKCHAIN_STATE</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></div>
          <span className="text-[9px] uppercase tracking-widest text-[#10b981] font-bold font-mono">Sensors synchronization online</span>
        </div>
      </footer>

      {/* Global CSS for scanning sweep simulation */}
      <style>{`
        @keyframes sweep {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

    </div>
  );
}
