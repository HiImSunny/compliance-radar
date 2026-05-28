export type Severity = "critical" | "high" | "medium" | "low";

export interface Alert {
  id: number;
  source_id: number;
  document_id: number;
  severity: Severity;
  summary: string;
  impacted_depts: string;
  remediation_steps: string;
  created_at: string;
  source_name?: string;
  source_url?: string;
}

export interface Source {
  id: number;
  name: string;
  url: string;
  active: boolean;
  scan_interval_hours: number;
  last_scan_at?: string;
  created_at?: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  sources: number;
  last_scan: string | null;
}
