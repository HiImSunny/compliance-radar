# Design Document — compliance-radar-polish

## Overview

ComplianceRadar là AI agent giám sát compliance quy định thời gian thực, build cho hackathon **Web Data UNLOCKED** (Bright Data). Feature "compliance-radar-polish" là giai đoạn cuối đưa sản phẩm từ trạng thái "backend hoàn chỉnh, frontend thô" sang trạng thái **submit-ready** cho hackathon deadline May 30, 2026.

### Phạm vi công việc

| Nhóm | Mô tả | File(s) thay đổi |
|------|-------|-----------------|
| Health endpoint | Thêm live DB metrics vào `/health` | `backend/main.py`, `backend/database.py` |
| Light theme | CSS injection toàn cục, severity tints, Inter font | `frontend/app.py`, tất cả `pages/*.py` |
| Alert Feed redesign | Dense list + split pane, skeleton rows, pagination | `frontend/pages/1_Alert_Dashboard.py` |
| Source Management | Per-row actions, PATCH endpoint, collapsed Bright Data expander | `frontend/pages/2_Source_Management.py`, `backend/main.py` |
| Reports | Xóa `st.metric`, 4 charts, empty state | `frontend/pages/4_Reports.py` |
| README.md | Hackathon narrative, ASCII arch, feature matrix, quick start | `compliance-radar/README.md` |
| JUDGING.md | Gates G1–G4, curl commands, verification checklist | `compliance-radar/JUDGING.md` |
| TRACK.md | Cập nhật tasks 6–25 → ✅ Done | `compliance-radar/TRACK.md` |

### Nguyên tắc thiết kế cốt lõi

- **Restrained color**: Severity color < 10% diện tích màn hình. Tint background, không border-left stripe.
- **Light theme**: `#FAFAFA` page background, `#FFFFFF` surface, `#111827` text.
- **Flat**: Không shadow, không gradient text, không glassmorphism.
- **Dense list**: Alert feed là danh sách đơn dòng, không `st.expander`.
- **Split pane**: `st.columns([2,1])` — list trái, detail phải, `st.session_state` cho selection.
- **No hero metrics**: Không `st.metric` trên Alert Dashboard và Reports.
- **No emoji in headers**: Không emoji trong page headers, section headings, sidebar titles.

---

## Architecture

### Tổng quan hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│                    Streamlit Frontend (:8501)                    │
│                                                                  │
│  app.py (Home)  │  Alert Dashboard  │  Source Mgmt  │  Reports  │
│                 │  (split pane)     │  (per-row)    │  (charts) │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP (httpx)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (:8000)                       │
│                                                                  │
│  GET  /health              ← NEW: live DB metrics               │
│  GET  /api/v1/sources                                           │
│  POST /api/v1/sources                                           │
│  PATCH /api/v1/sources/{id}  ← NEW: toggle active field        │
│  POST /api/v1/scan                                              │
│  GET  /api/v1/alerts                                            │
│  GET  /api/v1/alerts/{id}                                       │
│  POST /api/v1/demo/replay                                       │
│                                                                  │
│  APScheduler (6h periodic scan)                                 │
└──────────┬──────────────────────────────────────────────────────┘
           │
    ┌──────┴──────────────────────────────────┐
    │                                         │
    ▼                                         ▼
┌──────────────┐                    ┌──────────────────────┐
│   Supabase   │                    │   External Services  │
│  PostgreSQL  │                    │                      │
│              │                    │  Bright Data         │
│  regulatory_ │                    │  Web Unlocker        │
│  sources     │                    │  + MCP Server        │
│  documents   │                    │                      │
│  alerts      │                    │  Gemini 2.5 Flash    │
└──────────────┘                    │                      │
                                    │  Slack Webhook       │
                                    └──────────────────────┘
```

### Luồng dữ liệu chính

```
Scan trigger (manual / APScheduler)
    │
    ▼
ScrapeEngine.scrape(url)          ← Bright Data Web Unlocker
    │
    ▼
ChangeDetector.detect_change()    ← SHA-256 hash compare
    │ (changed)
    ▼
AISynthesizer.synthesize()        ← Gemini 2.5 Flash
    │
    ▼
db_create_alert()                 ← Supabase INSERT
    │
    ▼
Notifier.send_alert()             ← Slack webhook
    │
    ▼
Frontend polls /api/v1/alerts     ← Streamlit st.cache_data(ttl=20)
```

### Hai thay đổi backend mới

1. **`GET /health` nâng cấp**: Query `regulatory_sources` để lấy `COUNT(*)` và `MAX(last_scan_at)`. Timeout 2500ms, fallback graceful nếu DB unreachable.
2. **`PATCH /api/v1/sources/{id}`**: Nhận `{"active": bool}` body, update field trong Supabase, trả về row đã update.

---

## Components and Interfaces

### Backend Components

#### 1. Health Endpoint (nâng cấp)

```python
# main.py
@app.get("/health")
async def health():
    # Hiện tại: return {"status": "ok", "version": "1.0.0"}
    # Sau khi nâng cấp:
    # - Query Supabase với asyncio.wait_for(timeout=2.5s)
    # - Trả về sources count + last_scan ISO 8601
    # - Fallback: sources=0, last_scan=null nếu DB unreachable
```

**Response schema:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "sources": 5,
  "last_scan": "2026-05-28T09:15:00+00:00"
}
```

**Fallback response (DB unreachable):**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "sources": 0,
  "last_scan": null
}
```

#### 2. PATCH /api/v1/sources/{id} (mới)

```python
class SourcePatch(BaseModel):
    active: Optional[bool] = None
    scan_interval_hours: Optional[int] = None

@app.patch("/api/v1/sources/{source_id}")
async def patch_source(source_id: int, body: SourcePatch):
    # Update chỉ các field được cung cấp (partial update)
    # Trả về row đã update
    # 404 nếu source không tồn tại
```

#### 3. db_update_source (database.py — mới)

```python
def db_update_source(db: Client, source_id: int, data: dict) -> dict | None:
    # UPDATE regulatory_sources SET ... WHERE id = source_id
    # Trả về None nếu không tìm thấy row
```

#### 4. db_get_health_metrics (database.py — mới)

```python
def db_get_health_metrics(db: Client) -> dict:
    # SELECT COUNT(*), MAX(last_scan_at) FROM regulatory_sources
    # Trả về {"sources": int, "last_scan": str | None}
```

### Frontend Components

#### 5. CSS Theme Module (shared)

Mỗi page inject cùng một CSS block qua `st.markdown(..., unsafe_allow_html=True)`. CSS này được định nghĩa trong một hàm helper `inject_theme()` dùng chung.

**CSS variables:**
```css
/* Google Fonts import */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* Page root */
[data-testid="stAppViewContainer"] { background-color: #FAFAFA; }
[data-testid="stSidebar"] { background-color: #FFFFFF; border-right: 1px solid #E5E7EB; }

/* Surface elements */
[data-testid="stExpander"],
[data-testid="stDataFrame"],
.stForm { background-color: #FFFFFF; }

/* Typography */
html, body, [class*="css"] { font-family: 'Inter', sans-serif; color: #111827; }

/* Severity tint rows */
.sev-critical { background-color: #FFF2F2; }
.sev-high     { background-color: #FFF6F0; }
.sev-medium   { background-color: #FFFBEB; }
.sev-low      { background-color: #F0FFF4; }
.sev-unknown  { background-color: #FFFFFF; }

/* Skeleton shimmer */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
.skeleton-row {
  height: 36px;
  border-radius: 4px;
  background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  margin-bottom: 4px;
}
```

#### 6. Alert Dashboard (1_Alert_Dashboard.py — redesign)

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Toolbar: [Severity filter] [Search] [Scan Now]         │
│  Scan progress: "Scanning 2/5 sources…" (inline)        │
├──────────────────────────┬──────────────────────────────┤
│  Alert List (col 2)      │  Detail Pane (col 1)         │
│                          │                              │
│  [CRITICAL] SEC · 09:15  │  (empty: "Select an alert   │
│  [HIGH]     ICO · 14:30  │   to view details")          │
│  [HIGH]     FINRA· 11:00 │                              │
│  [MEDIUM]   OSHA · 08:45 │  (selected: full detail      │
│  [LOW]      FTC  · 07:00 │   inline, no page nav)       │
│                          │                              │
│  ← Prev  Page 1/1  Next →│                              │
└──────────────────────────┴──────────────────────────────┘
```

**Alert row HTML template:**
```html
<div class="alert-row sev-{severity}" style="
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
">
  <span class="sev-badge">{SEVERITY_LABEL}</span>
  <span class="source-name">{source_name}</span>
  <span class="ts">{timestamp}</span>
  <span class="summary-preview">{summary[:80]}…</span>
</div>
```

**Session state keys:**
- `st.session_state["selected_alert_id"]` — ID của alert đang được chọn
- `st.session_state["alert_page"]` — trang hiện tại (0-indexed)
- `st.session_state["scan_progress"]` — dict `{"completed": int, "total": int}` hoặc `None`

#### 7. Source Management (2_Source_Management.py — redesign)

**Per-row action pattern:**
```python
for src in sources:
    row_cols = st.columns([3, 2, 1, 1, 1])
    row_cols[0].write(src["name"])
    row_cols[1].write(src["url"][:40] + "…")
    row_cols[2].write("Active" if src["active"] else "Paused")
    
    with row_cols[3]:
        if st.button("Scan", key=f"scan_{src['id']}"):
            # POST /api/v1/scan với source_id
            ...
    
    with row_cols[4]:
        label = "Pause" if src["active"] else "Resume"
        if st.button(label, key=f"toggle_{src['id']}"):
            # PATCH /api/v1/sources/{id} với {"active": not src["active"]}
            ...
```

**Bright Data expander:** Collapsed by default (`expanded=False`), không hiển thị trong main content area.

#### 8. Reports (4_Reports.py — redesign)

**Xóa hoàn toàn:** `st.metric` block (4 metrics hiện tại).

**Thay bằng:** Section header text + 4 charts trên single scrollable page:
1. Severity Distribution (bar chart)
2. Alerts by Source (bar chart)
3. Alert Timeline Daily (line chart)
4. Impacted Departments (bar chart)

**Empty state:** Khi `len(alerts) == 0`, hiển thị text "No regulatory changes detected today" + "Load Demo" button. Không render chart containers.

---

## Data Models

### Supabase Tables (không thay đổi schema)

#### regulatory_sources
```sql
CREATE TABLE regulatory_sources (
    id                  SERIAL PRIMARY KEY,
    name                TEXT NOT NULL,
    url                 TEXT NOT NULL,
    active              BOOLEAN DEFAULT TRUE,
    scan_interval_hours INTEGER DEFAULT 6,
    last_scan_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

#### documents
```sql
CREATE TABLE documents (
    id           SERIAL PRIMARY KEY,
    source_id    INTEGER REFERENCES regulatory_sources(id),
    content_hash TEXT NOT NULL,
    raw_html     TEXT,
    scraped_at   TIMESTAMPTZ DEFAULT NOW()
);
```

#### alerts
```sql
CREATE TABLE alerts (
    id                SERIAL PRIMARY KEY,
    source_id         INTEGER REFERENCES regulatory_sources(id),
    document_id       INTEGER REFERENCES documents(id),
    severity          TEXT CHECK (severity IN ('critical','high','medium','low')),
    summary           TEXT,
    impacted_depts    TEXT,
    remediation_steps TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### Pydantic Models (backend)

#### SourcePatch (mới — main.py)
```python
class SourcePatch(BaseModel):
    active: Optional[bool] = None
    scan_interval_hours: Optional[int] = None
```

#### HealthResponse (mới — main.py)
```python
class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    sources: int = 0
    last_scan: Optional[str] = None  # ISO 8601 UTC string
```

### Frontend State Models

#### Session State Schema (Alert Dashboard)
```python
# st.session_state keys
{
    "selected_alert_id": int | None,   # ID của alert đang chọn
    "alert_page": int,                  # 0-indexed page number
    "scan_progress": {                  # None khi không scan
        "completed": int,
        "total": int
    } | None
}
```

### API Response Shapes

#### GET /health (sau nâng cấp)
```json
{
  "status": "ok",
  "version": "1.0.0",
  "sources": 5,
  "last_scan": "2026-05-28T09:15:00+00:00"
}
```

#### PATCH /api/v1/sources/{id}
**Request body:** `{ "active": false }`
**Response (200):** updated source row
**Response (404):** `{ "detail": "Source 99 not found" }`

---

## Correctness Properties

### Property 1: Health endpoint graceful fallback
*For any* state of the Supabase connection, `/health` SHALL return HTTP 200 — never HTTP 5xx.
**Validates: Requirements 1.1, 1.3**

### Property 2: Health response time bound
*For any* state of the Supabase connection, `/health` SHALL respond within 3000 ms.
**Validates: Requirements 1.4**

### Property 3: Severity tint correctness
*For any* alert severity value, the rendered row background SHALL match the defined tint (or `#FFFFFF` for unknown).
**Validates: Requirements 2.4–2.7, 2.11**

### Property 4: PATCH source toggle round-trip
*For any* source id, `PATCH {"active": X}` → subsequent `GET /api/v1/sources` SHALL show `active == X`.
**Validates: Requirements 4.2, 4.6**

### Property 5: Reports empty state exclusivity
*For any* alerts dataset: `len==0` → empty state only; `len>0` → 4 charts only. Never both.
**Validates: Requirements 5.1–5.3**

### Property 6: Alert pagination completeness
*For any* N alerts, paginating all pages at 50/page SHALL yield exactly N unique rows.
**Validates: Requirements 3.2**

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Supabase unreachable on `/health` | `asyncio.wait_for` 2500ms timeout → fallback `{sources:0, last_scan:null}`, HTTP 200 |
| `PATCH` source not found | HTTP 404 |
| `PATCH` DB unreachable | HTTP 503 |
| Backend unreachable on frontend load | "Backend unreachable — check port 8000" — no traceback |
| Per-row action fails | Error message scoped to row, no indeterminate state |
| Alert fetch empty | "No regulatory changes detected today" — no spinner |
| Alert fetch in progress | 50 skeleton rows — no spinner widget |

---

## Testing Strategy

### Property-Based Tests (hypothesis)

```python
@given(db_reachable=st.booleans())
def test_health_always_200(db_reachable): ...          # Property 1

@given(severity=st.sampled_from(["critical","high","medium","low","","unknown"]))
def test_severity_tint_mapping(severity): ...           # Property 3

@given(active=st.booleans())
def test_patch_source_round_trip(active): ...           # Property 4

@given(alert_count=st.integers(min_value=0, max_value=500))
def test_reports_empty_state_exclusivity(alert_count): ... # Property 5

@given(alerts=st.lists(st.fixed_dictionaries({"id": st.integers(min_value=1)}), max_size=200))
def test_pagination_completeness(alerts): ...           # Property 6
```

### Unit Tests

`test_health_ok`, `test_health_db_fallback`, `test_patch_source_active_false`, `test_patch_source_not_found`, `test_reports_empty_state`, `test_reports_with_data`, `test_css_no_dark_colors`, `test_css_no_border_left`, `test_severity_tint_critical`, `test_severity_tint_unknown`

### Document Verification Tests

`test_readme_has_narrative` ($14.8 billion), `test_readme_has_quick_start` (3 commands), `test_judging_has_gates` (G1–G4), `test_track_tasks_done` (tasks 6–25 ✅)
