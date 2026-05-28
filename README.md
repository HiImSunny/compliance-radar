# ComplianceRadar

Real-time regulatory compliance monitoring. ComplianceRadar watches major regulatory sources continuously, detects content changes, and synthesizes them into severity-scored alerts with actionable remediation steps — before the fine arrives.

Built for the **Web Data UNLOCKED** hackathon (Bright Data) · Track: Security & Compliance

---

## The Problem

$14.8 billion in regulatory fines in 2025. Most companies find out about regulatory changes too late — through a fine notice, not a monitoring system. Compliance officers spend hours manually checking regulatory websites that may or may not have changed. ComplianceRadar eliminates that work entirely.

---

## What It Does

- Monitors 5 major regulatory sources (GDPR, EU AI Act, FCA, FINRA, PCI DSS) on a configurable schedule
- Detects content changes via SHA-256 hashing — zero false positives on unchanged pages
- Synthesizes changes into structured alerts using Gemini 2.5 Flash: severity score, 3-sentence summary, impacted departments, remediation steps
- Delivers real-time Slack notifications with severity color coding and source links
- Surfaces everything in a Streamlit dashboard: alert feed, split-pane detail view, source management, reports

A compliance officer can triage a full day of regulatory changes in under 5 minutes.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ComplianceRadar                          │
│                                                                 │
│   ┌──────────────┐          ┌──────────────────────────────┐   │
│   │  Streamlit   │◄────────►│  FastAPI + APScheduler       │   │
│   │  Dashboard   │          │  (backend/main.py)           │   │
│   └──────────────┘          └──────────┬───────────────────┘   │
│                                        │                        │
│                             ┌──────────▼───────────────────┐   │
│                             │       Supabase               │   │
│                             │  (regulatory_sources,        │   │
│                             │   documents, alerts)         │   │
│                             └──────────────────────────────┘   │
│                                        │                        │
│              ┌─────────────────────────┼──────────────────┐    │
│              │                         │                  │    │
│   ┌──────────▼──────────┐  ┌───────────▼──────┐  ┌───────▼──┐ │
│   │  Bright Data        │  │  Bright Data     │  │  Gemini  │ │
│   │  Web Unlocker       │  │  MCP Server      │  │ 2.5 Flash│ │
│   │  (geo-bypass)       │  │  (AI agent web   │  │  (AI     │ │
│   │                     │  │   data access)   │  │ synthesis│ │
│   └─────────────────────┘  └──────────────────┘  └───────┬──┘ │
│                                                           │    │
│                                              ┌────────────▼──┐ │
│                                              │     Slack     │ │
│                                              │  (real-time   │ │
│                                              │  alerts)      │ │
│                                              └───────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Data flow:** APScheduler triggers scan → Bright Data Web Unlocker fetches regulatory pages (bypassing geo-blocks) → SHA-256 change detection → Gemini 2.5 Flash synthesizes changes into structured alerts → Supabase stores everything → Streamlit dashboard renders live → Slack delivers real-time notifications.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend | FastAPI + APScheduler | Async API, in-process scheduler (no Redis needed) |
| Frontend | Streamlit + Altair | Python-native dashboard, 4 pages |
| Database | Supabase (PostgreSQL) | Free tier, JSONB for regulatory data |
| AI | Gemini 2.5 Flash | 1M context window, free tier |
| Scraping | Bright Data Web Unlocker | Geo-bypass on regulatory sites |
| AI Agent Data | Bright Data MCP Server | Live web data access for AI agents |
| Notifications | Slack Webhook | Real-time alert delivery |
| Change Detection | SHA-256 hashing | Content diff without storing full HTML |

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/your-username/compliance-radar.git
cd compliance-radar
```

```bash
# Backend
pip install -r backend/requirements.txt

# Frontend
pip install -r frontend/requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials (see [Environment Variables](#environment-variables) below).

### 3. Set up the database

Run the schema against your Supabase project:

```bash
# In the Supabase SQL editor, paste and run:
cat supabase/schema.sql
```

### 4. Start the backend

```bash
cd backend
uvicorn main:app --reload
```

Verify it's running:

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{
  "status": "ok",
  "version": "1.0.0",
  "sources": 5,
  "last_scan": "2026-05-28T09:15:00+00:00"
}
```

### 5. Start the dashboard

In a second terminal:

```bash
cd frontend
streamlit run app.py
```

Open `http://localhost:8501` in your browser.

---

## Demo Mode (No Credentials Required)

No Bright Data, Gemini, or Slack credentials? The demo replay endpoint loads 5 pre-built alerts from 5 regulatory sources with mixed severity — no external API calls.

**From the dashboard:** click **Load Demo Data** on the home page.

**From the terminal:**

```bash
curl -X POST http://localhost:8000/api/v1/demo/replay
```

Expected response:

```json
{
  "message": "Demo replay complete — 5 sources and 5 alerts loaded",
  "sources": 5,
  "alerts": 5
}
```

The dashboard immediately shows realistic compliance alerts across Critical, High, Medium, and Low severity. This is the fastest path to evaluating the full product experience.

---

## Bright Data Integration

ComplianceRadar uses two Bright Data products as core infrastructure, not optional add-ons.

### Web Unlocker — Geo-Bypass for Regulatory Sites

Regulatory websites like GDPR.eu, FCA.org.uk, FINRA.org, and PCI DSS frequently block automated access or restrict content by geography. Bright Data Web Unlocker routes every scrape request through a residential proxy network, automatically rotating IPs and handling CAPTCHAs, TLS fingerprinting, and JavaScript rendering.

A compliance officer in Singapore can monitor UK FCA guidance and EU GDPR updates with the same reliability as a London-based team. The geo-restriction problem disappears entirely.

Every scan in `scrape_engine.py` routes through the Web Unlocker endpoint:

```python
response = requests.get(
    url,
    proxies={"https": f"https://{BRIGHTDATA_TOKEN}@{BRIGHTDATA_ZONE}.brightdata.com:22225"},
    verify=False,
    timeout=30,
)
```

### MCP Server — AI Agent Connected to Live Web Data

Bright Data MCP Server exposes live web data as tools that AI agents can call directly. ComplianceRadar's Gemini agent uses MCP to search for enforcement actions, cross-reference regulatory announcements, and pull supporting context — all without leaving the AI reasoning loop.

The MCP connection enriches each alert with current enforcement context from across the web, not just the scraped page.

```python
# MCP tool call during AI synthesis
mcp_result = await mcp_client.call_tool(
    "web_search",
    {"query": f"{source_name} regulatory update enforcement action 2026"},
)
```

**Available MCP tools:**

| Tool | Description |
|------|-------------|
| `search_engine` | Google/Bing search for enforcement actions |
| `scrape_as_markdown` | Clean markdown extraction from any URL |
| `discover` | AI-powered URL discovery for a regulatory query |
| `search_engine_batch` | Batch search across multiple queries |
| `scrape_batch` | Batch scrape across multiple URLs |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_KEY` | Yes | Supabase anon or service role key |
| `BRIGHTDATA_TOKEN` | Yes | Bright Data account API token |
| `BRIGHTDATA_ZONE` | Yes | Bright Data proxy zone name (e.g. `unlocker`) |
| `GEMINI_API_KEY` | Yes | Google AI Studio API key |
| `SLACK_WEBHOOK_URL` | No | Slack incoming webhook URL |

`SLACK_WEBHOOK_URL` is optional. When not set, the backend logs `[SLACK STUB]` to stdout instead of sending a message — all other functionality works normally.

---

## Project Structure

```
compliance-radar/
├── backend/
│   ├── main.py              # FastAPI app + APScheduler + demo replay
│   ├── config.py            # Environment variable loading (pydantic-settings)
│   ├── models.py            # Pydantic models + Supabase client
│   ├── scrape_engine.py     # Bright Data Web Unlocker + MCP wrapper
│   ├── change_detector.py   # SHA-256 content hashing + diff detection
│   ├── ai_synthesizer.py    # Gemini 2.5 Flash prompt + severity parsing
│   ├── notifier.py          # Slack webhook delivery
│   ├── database.py          # Supabase query helpers
│   ├── seed_demo.py         # Standalone demo seeder script
│   └── requirements.txt
├── frontend/
│   ├── app.py               # Home page: recent alerts, KPI summary, quick actions
│   ├── theme.py             # Shared CSS (OKLCH color system, widget skin, Altair config)
│   ├── requirements.txt
│   └── pages/
│       ├── 1_Alert_Dashboard.py   # Split-pane alert list with sort, filter, detail
│       ├── 2_Source_Management.py # Add/pause/scan sources, Bright Data config
│       ├── 3_Alert_Detail.py      # Full alert view: summary, remediation, source
│       └── 4_Reports.py           # Severity distribution, source coverage, daily volume
├── supabase/
│   └── schema.sql
├── .env.example
├── .gitignore
├── JUDGING.md
├── TRACK.md
└── README.md
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | System status and live metrics from the database |
| `GET` | `/api/v1/sources` | List all regulatory sources |
| `POST` | `/api/v1/sources` | Add a new regulatory source |
| `PATCH` | `/api/v1/sources/{id}` | Update a source (active status, scan interval) |
| `POST` | `/api/v1/scan` | Trigger a scan (all sources, runs in background) |
| `GET` | `/api/v1/alerts` | List alerts — filterable by `severity`, paginated by `limit` |
| `GET` | `/api/v1/alerts/{id}` | Full alert detail with AI analysis and remediation steps |
| `POST` | `/api/v1/demo/replay` | Load 5 demo alerts — no external APIs required |

---

## Monitored Regulatory Sources

| Source | Domain | Coverage |
|--------|--------|----------|
| GDPR.eu | gdpr.eu | EU data protection regulation |
| EU AI Act | artificialintelligenceact.eu | EU AI regulation |
| FCA | fca.org.uk | UK financial conduct authority |
| FINRA | finra.org | US financial industry regulation |
| PCI DSS | pcisecuritystandards.org | Payment card industry standards |

Additional sources can be added at runtime via the Source Management page or the `POST /api/v1/sources` endpoint.

---

## Feature Status

| Feature | Status |
|---------|--------|
| FastAPI + APScheduler periodic scan (every 6h, configurable) | ✅ |
| Supabase persistence (sources, documents, alerts) | ✅ |
| Bright Data Web Unlocker geo-bypass | ✅ |
| Bright Data MCP Server AI agent integration | ✅ |
| Gemini 2.5 Flash: severity scoring, summary, remediation | ✅ |
| SHA-256 change detection, zero false positives | ✅ |
| Slack webhook notifications with severity formatting | ✅ |
| Demo replay — 5 alerts, zero credentials required | ✅ |
| Streamlit dashboard: alert feed, split-pane detail, source management | ✅ |
| Reports: severity distribution, source coverage, daily volume (Altair) | ✅ |
| `/health` endpoint with live DB metrics | ✅ |
| Alert sort by severity, date, source | ✅ |
| WCAG 2.1 AA accessible keyboard navigation | ✅ |
| CSV export from Reports | Planned |
| Multi-tenant workspaces | Planned |

---

## License

MIT

Built with Bright Data Web Unlocker + MCP Server · Gemini 2.5 Flash · Supabase · FastAPI · Streamlit
