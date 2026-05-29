# ComplianceRadar

Real-time regulatory compliance monitoring. ComplianceRadar watches 50+ major regulatory sources continuously, detects content changes, and synthesizes them into severity-scored alerts with actionable remediation steps — before the fine arrives.

Built for the **Web Data UNLOCKED** hackathon (Bright Data) · Track: Security & Compliance

---

## The Problem

$14.8 billion in regulatory fines in 2025. Most companies find out about regulatory changes too late — through a fine notice, not a monitoring system. Compliance officers spend hours manually checking regulatory websites that may or may not have changed. ComplianceRadar eliminates that work entirely.

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

## Demo Mode (No Credentials Required)

No Bright Data, Gemini, or Slack credentials? The demo replay loads 5 pre-built alerts from 5 regulatory sources — no external API calls.

**From the dashboard:** click **Load Demo** on the home page.

**From the terminal:**

```bash
curl -X POST http://localhost:8000/api/v1/demo/replay
```

The dashboard immediately shows realistic compliance alerts across Critical, High, Medium, and Low severity. Fastest path to evaluating the full product experience.

---

## Bright Data Integration

ComplianceRadar uses two Bright Data products as core infrastructure, not optional add-ons.

### Web Unlocker — Geo-Bypass for Regulatory Sites

Regulatory websites like FCA.org.uk, FINRA.org, and ICO.org.uk frequently block automated access or restrict content by geography. Bright Data Web Unlocker routes every scrape request through a residential proxy network, automatically rotating IPs and handling CAPTCHAs, TLS fingerprinting, and JavaScript rendering.

A compliance officer in Singapore can monitor UK FCA guidance and EU GDPR updates with the same reliability as a London-based team.

```python
# backend/scrape_engine.py
async def scrape(self, url: str) -> str:
    payload = {"zone": settings.brightdata_zone, "url": url, "format": "raw"}
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(self.api_url, json=payload, headers=self.headers)
        return r.text
```

### MCP Server — AI Agent Connected to Live Web Data

Bright Data MCP Server exposes live web data as tools that AI agents can call directly. ComplianceRadar uses MCP for agent-driven regulatory search, cross-referencing enforcement actions, and pulling supporting context — all without leaving the AI reasoning loop.

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

| Tool | Description |
|------|-------------|
| `search_engine` | Google/Bing search for enforcement actions |
| `scrape_as_markdown` | Clean markdown extraction from any URL |
| `discover` | AI-powered URL discovery for a regulatory query |

---

## Environment Variables

All variables live in a single `.env` at the project root, shared by backend and frontend:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_KEY` | Yes | Supabase anon or service role key |
| `BRIGHTDATA_TOKEN` | Yes | Bright Data API token |
| `BRIGHTDATA_ZONE` | Yes | Bright Data proxy zone name |
| `BRIGHTDATA_API_URL` | No | Bright Data endpoint (default: `https://api.brightdata.com/request`) |
| `GEMINI_API_KEY` | Yes | Google AI Studio API key |
| `GEMINI_MODEL` | No | Gemini model name (default: `gemini-2.5-flash-preview-05-20`) |
| `AIMLAPI_KEY` | No | AIML API key — fallback when Gemini is unavailable |
| `AIMLAPI_BASE_URL` | No | AIML API base URL (default: `https://api.aimlapi.com/v1`) |
| `AIMLAPI_MODEL` | No | AIML model name (default: `gpt-4o`) |
| `SLACK_WEBHOOK_URL` | No | Slack incoming webhook URL |
| `NEXT_PUBLIC_API_URL` | No | Backend URL for the frontend (default: `http://localhost:8000`) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default: `http://localhost:3000`) |

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

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | System status and live metrics |
| `GET` | `/api/v1/sources` | List all regulatory sources |
| `POST` | `/api/v1/sources` | Add a new regulatory source |
| `PATCH` | `/api/v1/sources/{id}` | Update a source (active, interval, name, url) |
| `POST` | `/api/v1/scan` | Trigger scan on all active sources (background) |
| `POST` | `/api/v1/sources/{id}/scan` | Trigger scan on a single source |
| `GET` | `/api/v1/alerts` | List alerts — filter by `severity`, paginate by `limit` |
| `GET` | `/api/v1/alerts/{id}` | Full alert detail with AI analysis |
| `POST` | `/api/v1/demo/replay` | Load demo alerts — zero external API calls |

---

## Monitored Sources (50+)

| Domain | Sources |
|--------|---------|
| US Securities & Finance | SEC, FINRA, CFTC, OCC, Federal Reserve, FDIC, FinCEN |
| US Consumer & Trade | FTC, CFPB |
| US Workplace & Safety | OSHA, EEOC, DOL |
| US Healthcare | HHS/HIPAA, FDA, CMS |
| US Cybersecurity | CISA, NIST, FBI Cyber |
| EU / GDPR | ICO, EDPB, CNIL, DPC Ireland |
| EU Financial | EBA, ESMA, ECB Banking Supervision |
| UK | FCA, PRA |
| International | ISO, FATF, BIS |
| AI & Emerging Tech | EU AI Act, NIST AI, FTC AI |
| Environmental / ESG | EPA, SEC ESG, GRI |
| Crypto & Digital Assets | CFTC Digital Assets, SEC Crypto, FinCEN |
| Healthcare / Pharma | EMA, MHRA |

Additional sources can be added at runtime via the Sources page or `POST /api/v1/sources`.

---

## Feature Status

| Feature | Status |
|---------|--------|
| FastAPI + APScheduler periodic scan (every 6h, configurable) | ✅ |
| Supabase persistence (sources, documents, alerts) | ✅ |
| Bright Data Web Unlocker geo-bypass | ✅ |
| Bright Data MCP Server AI agent integration | ✅ |
| Gemini 2.5 Flash: severity scoring, summary, remediation | ✅ |
| AIML API fallback when Gemini is unavailable | ✅ |
| SHA-256 change detection, zero false positives | ✅ |
| Slack webhook notifications with severity formatting | ✅ |
| Demo replay — 5 alerts, zero credentials required | ✅ |
| Next.js dashboard: alert feed, source management, reports | ✅ |
| AI compliance analyst chat (Gemini + AIML fallback) | ✅ |
| Automated compliance audit (GDPR, SOC2, ISO 27001, HIPAA) | ✅ |
| 50+ real regulatory sources pre-seeded | ✅ |
| Single `.env` shared by backend and frontend | ✅ |
| Configurable CORS origins | ✅ |
| `/health` endpoint with live DB metrics | ✅ |
| Per-source scan trigger | ✅ |
| Google AI Studio standalone variant | ✅ |
| CSV export from Reports | Planned |
| Multi-tenant workspaces | Planned |

---

## License

MIT

Built with Bright Data Web Unlocker + MCP Server · Gemini 2.5 Flash · Supabase · FastAPI · Next.js
