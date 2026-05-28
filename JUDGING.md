# ComplianceRadar — Judge Verification Guide

> **Goal:** Follow this document top-to-bottom and verify all judging criteria in under 10 minutes.
> No prior knowledge of the codebase required. Every command is copy-paste ready.

---

## Demo-Safe Environment Variables

Create a `.env` file in `compliance-radar/` with the values below.
**Gate G4 passes with these exact placeholder values — no real credentials needed.**

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
BRIGHTDATA_TOKEN=demo-not-required-for-gate-g4
BRIGHTDATA_ZONE=unlocker
GEMINI_API_KEY=demo-not-required-for-gate-g4
SLACK_WEBHOOK_URL=
```

> `SLACK_WEBHOOK_URL` left blank intentionally. When empty, the backend logs
> `[SLACK STUB] Would send alert id=… severity=…` to stdout instead of calling Slack.
> Gates G1–G4 all pass without a real Slack webhook.

---

## Gate G3 — Fresh Clone to Running Server

Run these commands in sequence. Expected total time: ~2 minutes.

```bash
git clone https://github.com/<your-org>/compliance-radar.git
cd compliance-radar

# Copy demo env (edit SUPABASE_URL + SUPABASE_KEY if you have a Supabase project;
# leave as-is to run Gate G4 without any database)
cp .env.example .env

pip install -r backend/requirements.txt

cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

In a second terminal, verify the server is up:

```bash
curl http://localhost:8000/health
```

**Expected response — HTTP 200:**

```json
{"status": "ok", "version": "1.0.0", "sources": 0, "last_scan": null}
```

> If Supabase credentials are valid, `sources` will show the seeded count and
> `last_scan` will show an ISO 8601 timestamp. Without credentials the fallback
> `{"status":"ok","sources":0,"last_scan":null}` is returned — this is correct behaviour.

---

## Gate G4 — Demo Replay (Zero External Credentials)

With the server running from Gate G3, fire a single command:

```bash
curl -X POST http://localhost:8000/api/v1/demo/replay
```

**Expected response — HTTP 200:**

```json
{
  "message": "Demo replay complete — 5 sources and 5 alerts loaded",
  "sources": [
    {"id": 1, "name": "SEC Enforcement", "url": "https://www.sec.gov/litigation/litreleases.htm", "active": true, "scan_interval_hours": 6},
    {"id": 2, "name": "GDPR Enforcement — ICO", "url": "https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/", "active": true, "scan_interval_hours": 12},
    {"id": 3, "name": "FINRA Rule Updates", "url": "https://www.finra.org/rules-guidance/notices", "active": true, "scan_interval_hours": 6},
    {"id": 4, "name": "OSHA Hazard Bulletins", "url": "https://www.osha.gov/news/newsreleases", "active": true, "scan_interval_hours": 24},
    {"id": 5, "name": "FTC Consumer Protection", "url": "https://www.ftc.gov/news-events/news/press-releases", "active": true, "scan_interval_hours": 12}
  ],
  "alerts": [ ... 5 alert objects ... ]
}
```

> **No Bright Data, Gemini, or Slack credentials are required for this gate.**
> The endpoint uses pre-cached demo data and makes zero external API calls.

Confirm the 5 alerts are retrievable:

```bash
curl http://localhost:8000/api/v1/alerts
# Expected: JSON array with 5 objects, severities: critical, high, high, medium, low

curl "http://localhost:8000/api/v1/alerts?severity=critical"
# Expected: 1 alert — SEC Enforcement, cybersecurity disclosure requirements
```

---

## Gate G1 — Scan Pipeline → Document Saved to Supabase

> **Requires:** Valid `SUPABASE_URL` and `SUPABASE_KEY` in `.env`.
> Skip to Gate G4 if you do not have Supabase credentials.

**Step 1 — Seed a source:**

```bash
curl -X POST http://localhost:8000/api/v1/sources \
  -H "Content-Type: application/json" \
  -d '{"name":"FTC Press Releases","url":"https://www.ftc.gov/news-events/news/press-releases","scan_interval_hours":6}'
```

Expected: HTTP 201 with the created source object including an `id` field.

**Step 2 — Trigger a scan:**

```bash
curl -X POST http://localhost:8000/api/v1/scan
```

Expected:

```json
{"message": "Scan triggered — results will appear in /api/v1/alerts"}
```

The scan runs asynchronously. Watch backend stdout for:

```
INFO  compliance_radar  Alert created for source id=1 name=FTC Press Releases severity=…
```

**Step 3 — Confirm document row in Supabase:**

Open your Supabase project → Table Editor → `documents` table.
You should see a new row with:
- `source_id` matching the source created in Step 1
- `content_hash` — a SHA-256 hex string
- `scraped_at` — UTC timestamp of the scan

Alternatively, query via the Supabase SQL Editor:

```sql
SELECT id, source_id, content_hash, scraped_at
FROM documents
ORDER BY scraped_at DESC
LIMIT 5;
```

---

## Gate G2 — Alert Created + Slack Notification

> **Requires:** Supabase credentials (same as Gate G1).
> Slack webhook is optional — the stub log line confirms the notification path works.

**Step 1 — Run demo replay to seed sources and trigger the alert pipeline:**

```bash
curl -X POST http://localhost:8000/api/v1/demo/replay
```

**Step 2 — Confirm alert row exists:**

```bash
curl http://localhost:8000/api/v1/alerts/1
```

Expected: HTTP 200 with a full alert object containing `severity`, `summary`,
`impacted_depts`, and `remediation_steps`.

In Supabase → Table Editor → `alerts` table, confirm at least one row exists with
a non-null `summary` and `severity` value.

**Step 3 — Confirm Slack delivery:**

*If `SLACK_WEBHOOK_URL` is set:* A formatted Slack card arrives in your channel
with severity colour, source link, summary, and remediation steps.

*If `SLACK_WEBHOOK_URL` is empty (demo mode):* Check backend stdout for:

```
INFO  compliance_radar  [SLACK STUB] Would send alert id=1 severity=critical
```

This log line confirms the notification code path executed correctly.

---

## Verification Checklist

| Criterion | What to Check | Command / Observation |
|-----------|--------------|----------------------|
| **Application of Technology** | Bright Data Web Unlocker used in `backend/scrape_engine.py` (HTTP proxy via `BRIGHTDATA_TOKEN`); Bright Data MCP Server client in `backend/mcp_client.py` (agent calls `mcp_client.search()`); both products integrated into the live scan pipeline | `grep -n "brightdata\|BRIGHTDATA\|mcp_client" backend/scrape_engine.py backend/mcp_client.py` — confirms proxy URL and MCP tool calls |
| **Business Value** | `$14.8 billion` regulatory fine narrative in `README.md` opening sentence; 5 real regulatory sources (SEC, ICO/GDPR, FINRA, OSHA, FTC) seeded and scannable | `head -5 README.md` — first sentence references $14.8B; `curl http://localhost:8000/api/v1/sources` after Gate G4 — returns 5 sources |
| **Presentation** | `README.md` contains architecture diagram, feature matrix, Quick Start (3 commands), Bright Data integration section, env vars table; `JUDGING.md` (this file) provides blind-follow verification; demo video link in README | `cat README.md` — verify sections present; demo video link at bottom of README |
| **Originality** | AI agent combining geo-unblocked live regulatory data (Bright Data Web Unlocker bypasses geo-restrictions on regulator sites) with Gemini 2.5 Flash synthesis and real-time Slack alerting — no comparable open-source tool exists for this use case | Review `backend/scrape_engine.py` (Web Unlocker proxy), `backend/ai_synthesizer.py` (Gemini prompt), `backend/notifier.py` (Slack card) — three distinct integrations in a single automated pipeline |

---

## Quick Reference — All Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | System status + live metrics |
| `GET` | `/api/v1/sources` | List all regulatory sources |
| `POST` | `/api/v1/sources` | Add a new source |
| `PATCH` | `/api/v1/sources/{id}` | Update source (pause/resume, interval) |
| `POST` | `/api/v1/scan` | Trigger scan on all active sources |
| `GET` | `/api/v1/alerts` | List alerts (optional `?severity=critical`) |
| `GET` | `/api/v1/alerts/{id}` | Get single alert detail |
| `POST` | `/api/v1/demo/replay` | **Zero-credential demo** — loads 5 sources + 5 alerts |

---

## Bright Data Promo Code

`unlocked` — apply at https://brightdata.com → Billing → Overview → Apply a promo code
for $250 in free credits to test the live Web Unlocker + MCP integration.
