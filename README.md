# ComplianceRadar

Real-time regulatory compliance monitoring. ComplianceRadar watches 50+ major regulatory sources continuously, detects content changes, and synthesizes them into severity-scored alerts with actionable remediation steps — before the fine arrives.

Built for the **Web Data UNLOCKED** hackathon (Bright Data) · Track: Security & Compliance

---

## The Problem

Regulatory fines are accelerating. In 2025, US state privacy regulators alone collected **$3.425 billion** in fines — the highest in history and expected to accelerate through 2028. GDPR penalties since 2018 exceed **€7.1 billion**, with **€1.2 billion** issued in 2025 alone. Most companies find out about regulatory changes too late — through a fine notice, not a monitoring system. Compliance officers spend hours manually checking regulatory websites that may or may not have changed. ComplianceRadar eliminates that work entirely.

---

## What It Does

- Monitors **50+ real regulatory sources** across SEC, FINRA, GDPR/ICO, FCA, OSHA, CISA, EU AI Act, and more — on a configurable schedule
- Detects content changes via SHA-256 hashing — zero false positives on unchanged pages
- Synthesizes changes into structured alerts using **Gemini 2.5 Flash**: severity score, plain-English summary, impacted departments, numbered remediation steps
- Delivers real-time **Slack notifications** with severity color coding and source links
- Surfaces everything in a **Next.js dashboard**: alert feed, source management, AI compliance chat, audit tool, and Bright Data integration status
- **AI compliance analyst chat** — ask questions about any alert, get structured answers from Gemini with AIML API fallback
- **Automated compliance audit** — paste any config, policy, or log and get a scored JSON audit report against GDPR, SOC2, ISO 27001, HIPAA, and more

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          ComplianceRadar                            │
│                                                                     │
│   ┌─────────────────────┐       ┌──────────────────────────────┐   │
│   │   Next.js Dashboard │◄─────►│   FastAPI + APScheduler      │   │
│   │   (web/)            │       │   (backend/main.py)          │   │
│   │                     │       └──────────┬───────────────────┘   │
│   │  • Alert feed        │                  │                       │
│   │  • AI chat           │       ┌──────────▼───────────────────┐  │
│   │  • Audit tool        │       │         Supabase             │  │
│   │  • Source mgmt       │       │  (regulatory_sources,        │  │
│   │  • Reports           │       │   documents, alerts)         │  │
│   │  • Bright Data panel │       └──────────────────────────────┘  │
│   └─────────────────────┘                  │                       │
│                                ┌───────────┼──────────────┐        │
│                                │           │              │        │
│   ┌────────────────────┐  ┌────▼──────┐  ┌▼──────────┐  ┌▼─────┐  │
│   │  Bright Data       │  │  Bright   │  │  Gemini   │  │Slack │  │
│   │  Web Unlocker      │  │  Data MCP │  │ 2.5 Flash │  │      │  │
│   │  (geo-bypass)      │  │  Server   │  │ + AIML    │  │      │  │
│   └────────────────────┘  └───────────┘  └───────────┘  └──────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Data flow:** APScheduler triggers scan → Bright Data Web Unlocker fetches regulatory pages (bypassing geo-blocks) → SHA-256 change detection → Gemini 2.5 Flash synthesizes changes into structured alerts → Supabase stores everything → Next.js dashboard renders live → Slack delivers real-time notifications.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend | FastAPI + APScheduler | Async API, in-process scheduler |
| Frontend | Next.js 15 + Tailwind CSS | Dashboard, AI chat, audit tool |
| Database | Supabase (PostgreSQL) | Sources, documents, alerts |
| AI (backend) | Gemini 2.5 Flash | Alert synthesis, severity scoring |
| AI (frontend) | Gemini + AIML API fallback | Compliance chat, audit reports |
| Scraping | Bright Data Web Unlocker | Geo-bypass on regulatory sites |
| AI Agent Data | Bright Data MCP Server | Live web data access for AI agents |
| Notifications | Slack Webhook | Real-time alert delivery |
| Change Detection | SHA-256 hashing | Content diff without storing full HTML |

---

## Quick Start

### 1. Clone

```bash
git clone https://github.com/your-username/compliance-radar.git
cd compliance-radar
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` — all credentials live in one file shared by both backend and frontend:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
BRIGHTDATA_TOKEN=your_brightdata_token
BRIGHTDATA_ZONE=compliance_radar
GEMINI_API_KEY=your_gemini_api_key
AIMLAPI_KEY=your_aimlapi_key
SLACK_WEBHOOK_URL=your_slack_webhook_url   # optional
NEXT_PUBLIC_API_URL=http://localhost:8000
CORS_ORIGINS=http://localhost:3000
```

### 3. Set up the database

Paste `supabase/schema.sql` into your Supabase SQL Editor and run it.

### 4. Start everything

The launcher handles dependencies, starts both services, and streams logs:

```bash
python start.py
```

Or start manually:

```bash
# Terminal 1 — backend
pip install -r backend/requirements.txt
cd backend && uvicorn main:app --reload --port 8000

# Terminal 2 — frontend
cd web && npm install && npm run dev
```

Open `http://localhost:3000` in your browser.

Verify the backend:

```bash
curl http://localhost:8000/health
# {"status":"ok","version":"1.0.0","sources":50,"last_scan":"..."}
```

---

## Demo Mode (Zero Credentials Required)

No Bright Data, Gemini, or Slack credentials? The demo replay loads **50 pre-seeded regulatory sources** and **5 pre-built alerts** — zero external API calls.

**From the terminal:**

```bash
curl -X POST http://localhost:8000/api/v1/demo/replay
```

**Expected response:**

```json
{
  "message": "Demo replay complete — 5 sources and 5 alerts loaded",
  "sources": [
    {"id": 1, "name": "SEC Enforcement", "url": "https://www.sec.gov/litigation/litreleases.htm", "active": true, "scan_interval_hours": 6},
    {"id": 2, "name": "GDPR Enforcement — ICO", "url": "https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/", "active": true, "scan_interval_hours": 12},
    ...
  ],
  "alerts": [ ... 5 alert objects with severity, summary, remediation_steps ... ]
}
```

The dashboard immediately shows realistic compliance alerts across Critical, High, Medium, and Low severity. Fastest path to evaluating the full product experience without any external credentials.

---

## Bright Data Integration

ComplianceRadar uses two Bright Data products as core infrastructure, not optional add-ons.

### Web Unlocker — Geo-Bypass for Regulatory Sites

Regulatory websites like FCA.org.uk, FINRA.org, and ICO.org.uk frequently block automated access or restrict content by geography. Bright Data Web Unlocker routes every scrape request through a residential proxy network, automatically rotating IPs and handling CAPTCHAs, TLS fingerprinting, and JavaScript rendering.

A compliance officer in Singapore can monitor UK FCA guidance and EU GDPR updates with the same reliability as a London-based team.

**Implementation:**

```python
# backend/scrape_engine.py
async def scrape(self, url: str) -> str:
    payload = {"zone": settings.brightdata_zone, "url": url, "format": "raw"}
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(self.api_url, json=payload, headers=self.headers)
        return r.text
```

**Monitored sites that require geo-bypass:**
- FCA.org.uk (UK Financial Conduct Authority)
- ICO.org.uk (UK Information Commissioner's Office)
- FINRA.org (US Financial Industry Regulatory Authority)
- SEC.gov (US Securities and Exchange Commission)
- And 46+ more regulatory sources

### MCP Server — AI Agent Connected to Live Web Data

Bright Data MCP Server exposes live web data as tools that AI agents can call directly. ComplianceRadar uses MCP for agent-driven regulatory search, cross-referencing enforcement actions, and pulling supporting context — all without leaving the AI reasoning loop.

**Implementation:**

```python
# backend/mcp_client.py
async def search(self, query: str, num: int = 5) -> list[dict]:
    result = await self._session.call_tool("search_engine", {"query": query, "num": num})
    return json.loads(result.content[0].text).get("organic", [])

async def scrape(self, url: str) -> str:
    result = await self._session.call_tool("scrape_as_markdown", {"url": url})
    return result.content[0].text
```

**Available MCP tools:**

| Tool | Description | Use Case |
|------|-------------|----------|
| `search_engine` | Google/Bing search for enforcement actions | Find related enforcement cases, precedents |
| `scrape_as_markdown` | Clean markdown extraction from any URL | Extract full regulatory guidance, policy documents |
| `discover` | AI-powered URL discovery for a regulatory query | Discover new regulatory sources by topic |

---

## Environment Variables

All variables live in a single `.env` at the project root, shared by backend and frontend:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_KEY` | Yes | Supabase anon or service role key |
| `BRIGHTDATA_TOKEN` | Yes | Bright Data API token |
| `BRIGHTDATA_ZONE` | Yes | Bright Data proxy zone name (e.g., `unlocker`) |
| `BRIGHTDATA_API_URL` | No | Bright Data endpoint (default: `https://api.brightdata.com/request`) |
| `GEMINI_API_KEY` | Yes | Google AI Studio API key |
| `GEMINI_MODEL` | No | Gemini model name (default: `gemini-3.1-flash-lite`) |
| `AIMLAPI_KEY` | No | AIML API key — fallback when Gemini is unavailable |
| `AIMLAPI_BASE_URL` | No | AIML API base URL (default: `https://api.aimlapi.com/v1`) |
| `AIMLAPI_MODEL` | No | AIML model name (default: `gpt-4o`) |
| `SLACK_WEBHOOK_URL` | No | Slack incoming webhook URL — optional, logs stub when not set |
| `NEXT_PUBLIC_API_URL` | No | Backend URL for the frontend (default: `http://localhost:8000`) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default: `*`) |

`SLACK_WEBHOOK_URL` is optional. When not set, the backend logs `[SLACK STUB]` to stdout — all other functionality works normally.

---

## Project Structure

```
compliance-radar/
├── backend/
│   ├── main.py              # FastAPI app, APScheduler, all endpoints, demo replay
│   ├── config.py            # Pydantic-settings — all env vars in one place
│   ├── models.py            # Pydantic models
│   ├── scrape_engine.py     # Bright Data Web Unlocker + MCP wrapper
│   ├── mcp_client.py        # Bright Data MCP Server client
│   ├── change_detector.py   # SHA-256 content hashing + diff detection
│   ├── ai_synthesizer.py    # Gemini 2.5 Flash prompt + severity parsing
│   ├── notifier.py          # Slack webhook delivery
│   ├── database.py          # Supabase query helpers
│   ├── seed_demo.py         # Standalone demo seeder script
│   ├── seed_sources.py      # Seed 50 real regulatory sources
│   └── requirements.txt
├── web/                     # Next.js 15 frontend
│   ├── app/
│   │   ├── page.tsx                    # Home — alert overview
│   │   ├── alerts/                     # Alert feed with severity filter
│   │   ├── sources/                    # Source management
│   │   ├── overview/                   # Radar sphere, compliance desk, threat terminal
│   │   ├── reports/                    # Severity distribution, source coverage
│   │   ├── brightdata/                 # Bright Data integration status
│   │   └── api/gemini/
│   │       ├── chat/route.ts           # AI compliance analyst chat endpoint
│   │       └── audit/route.ts          # Structured compliance audit endpoint
│   ├── lib/
│   │   ├── api.ts                      # Backend API client
│   │   ├── ai-client.ts                # Unified AI client (Gemini + AIML fallback)
│   │   ├── hooks.ts                    # SWR data hooks
│   │   └── types.ts                    # Shared TypeScript types
│   ├── components/                     # Shared UI components
│   ├── next.config.ts                  # Loads root .env via dotenv
│   └── package.json
├── supabase/
│   └── schema.sql
├── compliance-radar-aistudio/          # Standalone Google AI Studio variant
├── start.py                            # TUI launcher — installs deps, starts both services
├── .env.example
├── .gitignore
├── JUDGING.md
└── README.md
```

---

## API Reference

### Health & System

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| `GET` | `/health` | System status and live metrics | `{"status":"ok","version":"1.0.0","sources":50,"last_scan":"2025-05-30T..."}` |

### Sources Management

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| `GET` | `/api/v1/sources` | List all regulatory sources | — |
| `POST` | `/api/v1/sources` | Add a new regulatory source | `{"name":"...","url":"...","scan_interval_hours":6,"active":true}` |
| `PATCH` | `/api/v1/sources/{id}` | Update a source | `{"active":true,"scan_interval_hours":12,"name":"...","url":"..."}` |

### Scanning

| Method | Endpoint | Description | Behavior |
|--------|----------|-------------|----------|
| `POST` | `/api/v1/scan` | Trigger scan on all active sources | Runs asynchronously, returns immediately |
| `POST` | `/api/v1/sources/{id}/scan` | Trigger scan on a single source | Runs asynchronously, returns immediately |

### Alerts

| Method | Endpoint | Description | Query Params |
|--------|----------|-------------|--------------|
| `GET` | `/api/v1/alerts` | List alerts with optional filtering | `?severity=critical&limit=10` |
| `GET` | `/api/v1/alerts/{id}` | Full alert detail with AI analysis | — |

### Demo & Testing

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| `POST` | `/api/v1/demo/replay` | Load 50 sources + 5 demo alerts (zero external calls) | `{"message":"Demo replay complete","sources":[...],"alerts":[...]}` |

---

## Monitored Sources (50+)

ComplianceRadar monitors **50+ real regulatory sources** across 13 domains:

| Domain | Key Sources | Count |
|--------|-----------|-------|
| **US Securities & Finance** | SEC, FINRA, CFTC, OCC, Federal Reserve, FDIC, FinCEN | 7 |
| **US Consumer & Trade** | FTC, CFPB | 2 |
| **US Workplace & Safety** | OSHA, EEOC, DOL | 3 |
| **US Healthcare** | HHS/HIPAA, FDA, CMS | 3 |
| **US Cybersecurity** | CISA, NIST, FBI Cyber | 3 |
| **EU / GDPR** | ICO, EDPB, CNIL, DPC Ireland | 4 |
| **EU Financial** | EBA, ESMA, ECB Banking Supervision | 3 |
| **UK** | FCA, PRA | 2 |
| **International** | ISO, FATF, BIS | 3 |
| **AI & Emerging Tech** | EU AI Act, NIST AI, FTC AI | 3 |
| **Environmental / ESG** | EPA, SEC ESG, GRI | 3 |
| **Crypto & Digital Assets** | CFTC Digital Assets, SEC Crypto, FinCEN | 3 |
| **Healthcare / Pharma** | EMA, MHRA | 2 |

**All 50 sources are pre-seeded and ready to scan.** Additional sources can be added at runtime via the Sources page or `POST /api/v1/sources`.

---

## Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| **Core Pipeline** | | |
| FastAPI + APScheduler periodic scan (every 6h, configurable) | ✅ | Runs in background, configurable per-source |
| Supabase persistence (sources, documents, alerts) | ✅ | PostgreSQL with proper indexes |
| Bright Data Web Unlocker geo-bypass | ✅ | Handles CAPTCHAs, TLS fingerprinting, JS rendering |
| Bright Data MCP Server AI agent integration | ✅ | search_engine, scrape_as_markdown, discover tools |
| SHA-256 change detection, zero false positives | ✅ | Compares content hashes, stores first 50KB |
| **AI & Synthesis** | | |
| Gemini 3.1 Flash Lite: severity scoring, summary, remediation | ✅ | JSON output with structured fields |
| AIML API fallback when Gemini is unavailable | ✅ | Automatic fallback, no manual intervention |
| **Notifications & Delivery** | | |
| Slack webhook notifications with severity formatting | ✅ | Color-coded cards, source links, remediation steps |
| Slack stub mode (logs when webhook not configured) | ✅ | Allows demo without Slack credentials |
| **Dashboard & UI** | | |
| Next.js dashboard: alert feed, source management, reports | ✅ | Real-time updates, severity filtering |
| AI compliance analyst chat (Gemini + AIML fallback) | ✅ | Ask questions about any alert |
| Automated compliance audit (GDPR, SOC2, ISO 27001, HIPAA) | ✅ | Scored JSON report against 4 frameworks |
| Compliance scoring (live from alerts) | ✅ | Computed client-side, deductions per severity |
| **Demo & Testing** | | |
| Demo replay — 50 sources + 5 alerts, zero credentials | ✅ | `/api/v1/demo/replay` endpoint |
| Unit tests (health, PATCH, error handling) | ✅ | `backend/tests/test_endpoints.py` |
| **Configuration** | | |
| 50+ real regulatory sources pre-seeded | ✅ | All 50 sources in DEMO_SOURCES array |
| Single `.env` shared by backend and frontend | ✅ | Loaded by both services |
| Configurable CORS origins | ✅ | Default: `*`, can restrict per environment |
| `/health` endpoint with live DB metrics | ✅ | Returns status, version, source count, last_scan |
| Per-source scan trigger | ✅ | `POST /api/v1/sources/{id}/scan` |
| **Variants** | | |
| Google AI Studio standalone variant | ✅ | `compliance-radar-aistudio/` directory |
| **Planned Features** | | |
| CSV export from Reports | 📋 | Marked for future release |
| Multi-tenant workspaces | 📋 | Marked for future release |
| Custom alert rules (regex, keyword matching) | 📋 | Future enhancement |
| Email notifications | 📋 | Currently Slack only |

---

## Bright Data Promo Code

**Use code `unlocked`** at https://brightdata.com → Billing → Overview → Apply a promo code
for **$250 in free credits** to test the live Web Unlocker + MCP integration.

---

## Troubleshooting

### Backend won't start

**Error:** `ModuleNotFoundError: No module named 'fastapi'`

```bash
pip install -r backend/requirements.txt
```

**Error:** `SUPABASE_URL not found in environment`

Ensure `.env` file exists in project root with valid Supabase credentials:

```bash
cp .env.example .env
# Edit .env with your credentials
```

### Demo replay returns empty

**Error:** `{"message":"Demo replay complete","sources":[],"alerts":[]}`

This is expected if Supabase is not configured. The demo data is seeded into the database. To verify:

```bash
curl http://localhost:8000/api/v1/sources
# Should return 50 sources after demo/replay
```

### Slack notifications not sending

**Expected behavior:** If `SLACK_WEBHOOK_URL` is not set, the backend logs:

```
INFO  compliance_radar  [SLACK STUB] Would send alert id=1 severity=critical
```

This is correct. To enable real Slack notifications, set `SLACK_WEBHOOK_URL` in `.env`.

### Gemini API errors

**Error:** `google.auth.exceptions.DefaultCredentialsError`

Ensure `GEMINI_API_KEY` is set in `.env`. The system will automatically fall back to AIML API if Gemini is unavailable.

---

## Performance Notes

- **Change detection:** SHA-256 hashing is O(n) on content size, typically <100ms per page
- **AI synthesis:** Gemini 3.1 Flash Lite averages 2-3 seconds per alert
- **Database:** Supabase PostgreSQL with indexes on `source_id`, `severity`, `created_at`
- **Concurrent scans:** APScheduler runs scans sequentially to avoid rate limiting
- **Storage:** First 50KB of raw HTML stored per document to cap database size

---

## Contributing

Found a bug or want to add a regulatory source? Open an issue or PR on GitHub.

---

## License

MIT

Built with Bright Data Web Unlocker + MCP Server · Gemini 3.1 Flash Lite · Supabase · FastAPI · Next.js
