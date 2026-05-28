# Implementation Plan: compliance-radar-polish

## Overview

Đưa ComplianceRadar từ trạng thái "backend hoàn chỉnh, frontend thô" sang **submit-ready** cho hackathon Web Data UNLOCKED (deadline May 30, 2026). Kế hoạch gồm 8 nhóm công việc: nâng cấp backend endpoints, redesign toàn bộ frontend sang light theme, viết tài liệu hackathon, và bổ sung test suite.

Ngôn ngữ: **Python** (FastAPI backend, Streamlit frontend, pytest + hypothesis cho tests).

---

## Tasks

- [ ] 1. Nâng cấp database.py — thêm health metrics và source update functions
  - [ ] 1.1 Thêm hàm `db_get_health_metrics(db)` vào `backend/database.py`
    - Query `SELECT COUNT(*), MAX(last_scan_at) FROM regulatory_sources`
    - Trả về `{"sources": int, "last_scan": str | None}` (ISO 8601 UTC string hoặc None)
    - _Requirements: 1.2_
  - [ ] 1.2 Thêm hàm `db_update_source(db, source_id, data)` vào `backend/database.py`
    - UPDATE `regulatory_sources` SET các field trong `data` WHERE `id = source_id`
    - Trả về row đã update dạng `dict`, hoặc `None` nếu không tìm thấy row
    - _Requirements: 4.2, 4.6_

- [ ] 2. Nâng cấp backend main.py — health endpoint và PATCH sources
  - [ ] 2.1 Nâng cấp `GET /health` trong `backend/main.py`
    - Import `db_get_health_metrics` từ `database.py`
    - Thêm Pydantic model `HealthResponse` với fields: `status`, `version`, `sources`, `last_scan`
    - Wrap DB query bằng `asyncio.wait_for(..., timeout=2.5)` trong executor
    - Fallback graceful: nếu timeout hoặc exception → `sources=0`, `last_scan=null`, vẫn HTTP 200
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [ ]* 2.2 Viết property test cho health endpoint graceful fallback
    - **Property 1: Health endpoint graceful fallback**
    - Dùng `hypothesis` với `@given(db_reachable=st.booleans())`
    - Mock `db_get_health_metrics` để simulate reachable/unreachable DB
    - Assert: luôn HTTP 200, response có đủ 4 fields (`status`, `version`, `sources`, `last_scan`)
    - Assert: không bao giờ raise HTTP 5xx
    - **Validates: Requirements 1.1, 1.3**
    - File: `backend/tests/test_health_properties.py`
  - [ ] 2.3 Thêm `PATCH /api/v1/sources/{id}` vào `backend/main.py`
    - Thêm Pydantic model `SourcePatch` với fields: `active: Optional[bool]`, `scan_interval_hours: Optional[int]`
    - Import `db_update_source` từ `database.py`
    - Nếu `db_update_source` trả về `None` → raise `HTTPException(404, "Source {id} not found")`
    - Nếu DB không configured → raise `HTTPException(503, "Database not configured")`
    - _Requirements: 4.2, 4.6_
  - [ ]* 2.4 Viết property test cho PATCH source toggle round-trip
    - **Property 4: PATCH source toggle round-trip**
    - Dùng `hypothesis` với `@given(active=st.booleans())`
    - Mock `db_update_source` và `db_list_sources` để verify round-trip
    - Assert: sau PATCH `{"active": X}`, GET source trả về `active == X`
    - **Validates: Requirements 4.2, 4.6**
    - File: `backend/tests/test_patch_properties.py`

- [ ] 3. Checkpoint — Backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Tạo CSS theme module dùng chung cho frontend
  - [ ] 4.1 Tạo file `frontend/theme.py` với hàm `inject_theme()`
    - Import Google Fonts Inter qua `@import url('https://fonts.googleapis.com/...')`
    - Set `background-color: #FAFAFA` cho page root `[data-testid="stAppViewContainer"]`
    - Set `background-color: #FFFFFF` cho sidebar, expander, dataframe, form containers
    - Set `font-family: 'Inter', sans-serif; color: #111827` cho body text
    - Định nghĩa CSS classes: `.sev-critical` (#FFF2F2), `.sev-high` (#FFF6F0), `.sev-medium` (#FFFBEB), `.sev-low` (#F0FFF4), `.sev-unknown` (#FFFFFF)
    - Định nghĩa `.skeleton-row` với shimmer animation (`@keyframes shimmer`)
    - Không có `background-color` nào bắt đầu bằng `#0f`, `#1e`, hoặc dark hex values
    - Không có `border-left` trên alert rows
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.11_
  - [ ]* 4.2 Viết unit tests cho CSS theme injection
    - Test `test_css_no_dark_colors`: assert CSS string không chứa `#0f`, `#1e`
    - Test `test_css_no_border_left`: assert CSS string không chứa `border-left` trên alert row selectors
    - Test `test_severity_tint_critical`: assert `.sev-critical` có `background-color: #FFF2F2`
    - Test `test_severity_tint_unknown`: assert `.sev-unknown` có `background-color: #FFFFFF`
    - File: `backend/tests/test_theme.py`
  - [ ]* 4.3 Viết property test cho severity tint mapping
    - **Property 3: Severity tint correctness**
    - Dùng `hypothesis` với `@given(severity=st.sampled_from(["critical","high","medium","low","","unknown","CRITICAL"]))`
    - Implement hàm `get_severity_class(severity: str) -> str` trong `theme.py`
    - Assert: known severities map đúng CSS class; unknown/empty → `sev-unknown`
    - **Validates: Requirements 2.4, 2.5, 2.6, 2.7, 2.11**
    - File: `backend/tests/test_severity_properties.py`

- [ ] 5. Redesign app.py — apply light theme, xóa dark CSS
  - [ ] 5.1 Cập nhật `frontend/app.py`
    - Import và gọi `inject_theme()` từ `theme.py` (thay thế CSS block hiện tại)
    - Xóa toàn bộ CSS block chứa `#0f1117`, `.metric-card { background: #1e2130 }` và các dark colors
    - Xóa `st.metric` hero cards (c1–c5 KPI row)
    - Thay KPI row bằng section header text (plain text, không emoji trong heading)
    - Giữ nguyên quick-action buttons và recent alerts preview
    - _Requirements: 2.1, 2.2, 2.3, 2.9, 2.10_

- [ ] 6. Redesign Alert Dashboard — split pane, dense list, pagination, skeleton
  - [ ] 6.1 Redesign `frontend/pages/1_Alert_Dashboard.py` — layout và dense list rows
    - Xóa `st.expander` alert feed hiện tại
    - Xóa `st.metric` KPI row (c1–c5)
    - Xóa severity chart và timeline chart
    - Thêm `inject_theme()` từ `theme.py`
    - Implement split pane: `st.columns([2, 1])` — list trái, detail phải
    - Render alert rows dưới dạng HTML `<div>` với CSS class `sev-{severity}` (không dùng `st.expander`)
    - Mỗi row có `st.button` để select alert (key=`f"row_{alert_id}"`)
    - Detail pane: hiển thị "Select an alert to view details" khi chưa chọn; hiển thị full detail khi đã chọn
    - Áp dụng distinct background cho selected row
    - _Requirements: 3.1, 3.5, 3.6, 2.1, 2.9, 2.10_
  - [ ] 6.2 Thêm pagination 50 alerts/page vào Alert Dashboard
    - Dùng `st.session_state["alert_page"]` (0-indexed, default 0)
    - Slice alerts: `page_alerts = alerts[page*50 : (page+1)*50]`
    - Render "← Prev  Page X/Y  Next →" navigation controls bên dưới list
    - _Requirements: 3.2_
  - [ ]* 6.3 Viết property test cho alert pagination completeness
    - **Property 6: Alert pagination completeness**
    - Dùng `hypothesis` với `@given(alerts=st.lists(st.fixed_dictionaries({"id": st.integers(min_value=1)}), min_size=0, max_size=200))`
    - Implement hàm `paginate_alerts(alerts, page_size=50)` trong module riêng hoặc trong page
    - Assert: tổng số alert qua tất cả pages == N, không duplicate, không omission
    - **Validates: Requirements 3.2**
    - File: `backend/tests/test_pagination_properties.py`
  - [ ] 6.4 Thêm skeleton rows và scan progress inline
    - Khi đang fetch: render 50 `<div class="skeleton-row">` thay vì spinner widget
    - Khi `st.session_state["scan_progress"]` không None: hiển thị inline text `"Scanning X/Y sources…"` (không blocking overlay)
    - Empty state: khi `len(alerts) == 0` sau filter → hiển thị "No regulatory changes detected today"
    - _Requirements: 3.3, 3.4, 3.7, 3.8_

- [ ] 7. Redesign Source Management — per-row actions, PATCH integration, error handling
  - [ ] 7.1 Redesign `frontend/pages/2_Source_Management.py`
    - Thêm `inject_theme()` từ `theme.py`
    - Thay bằng per-row layout dùng `st.columns([3, 2, 1, 1, 1])`
    - Mỗi row: Name, URL (truncated), Status ("Active"/"Paused"), Scan button, Pause/Resume button
    - Scan button → POST `/api/v1/scan`, spinner scoped to row
    - Pause/Resume button → PATCH `/api/v1/sources/{id}` với `{"active": not src["active"]}`
    - Sau PATCH thành công: `st.cache_data.clear()` + `st.rerun()`
    - Bright Data expander: `st.expander(..., expanded=False)`
    - Error handling: "Backend unreachable — check that the FastAPI server is running on port 8000"
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ] 8. Redesign Reports page — xóa st.metric, empty state, 4 charts
  - [ ] 8.1 Redesign `frontend/pages/4_Reports.py`
    - Thêm `inject_theme()` từ `theme.py`
    - Xóa toàn bộ `st.metric` block (c1–c4 KPI row)
    - Empty state: khi `len(alerts) == 0` → "No regulatory changes detected today" + "Load Demo" button, không render chart containers
    - Khi `len(alerts) > 0`: 4 charts theo thứ tự: Severity Distribution, Alerts by Source, Alert Timeline Daily, Impacted Departments
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ]* 8.2 Viết property test cho Reports empty state exclusivity
    - **Property 5: Reports empty state exclusivity**
    - Dùng `hypothesis` với `@given(alert_count=st.integers(min_value=0, max_value=500))`
    - Assert: `alert_count == 0` → empty state True, charts False; `alert_count > 0` → ngược lại
    - **Validates: Requirements 5.1, 5.2, 5.3**
    - File: `backend/tests/test_reports_properties.py`

- [ ] 9. Checkpoint — Frontend redesign complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Viết README.md
  - [ ] 10.1 Tạo `compliance-radar/README.md`
    - Single-sentence narrative đề cập `$14.8 billion`
    - ASCII architecture diagram (FastAPI, Streamlit, Supabase, Bright Data Web Unlocker, MCP Server, Gemini 2.5 Flash, Slack)
    - Feature matrix `✅`/`🔶`/`🔲` — ít nhất 1 row cho mỗi 5 tech components
    - Quick Start: đúng 3 commands (`git clone`, `pip install -r backend/requirements.txt`, `uvicorn main:app --reload`)
    - "Bright Data Integration" section
    - Environment variables table (Variable, Description, Example)
    - `**Demo Video:** [Watch on YouTube](<link>)`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  - [ ]* 10.2 Viết document verification tests cho README
    - File: `backend/tests/test_documents.py`

- [ ] 11. Viết JUDGING.md
  - [ ] 11.1 Tạo `compliance-radar/JUDGING.md`
    - Gate G1: curl commands verify `POST /api/v1/scan` → document in Supabase
    - Gate G2: curl commands verify AI + Slack loop
    - Gate G3: fresh clone → pip install → uvicorn → `GET /health` → HTTP 200
    - Gate G4: `curl -X POST http://localhost:8000/api/v1/demo/replay` → 5 sources + 5 alerts, no external credentials
    - Demo-safe env var placeholder values
    - Verification checklist table (Application of Technology, Business Value, Presentation, Originality)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
  - [ ]* 11.2 Viết document verification tests cho JUDGING.md
    - File: `backend/tests/test_documents.py` (append)

- [ ] 12. Cập nhật TRACK.md
  - [ ] 12.1 Cập nhật `compliance-radar/TRACK.md`
    - Tasks 6–23 → `✅ Done`
    - Task 24 → `✅ Done`
    - Task 25 → `✅ Done`, Notes: `{"status":"ok","sources":N,"last_scan":"..."}`
    - Tasks 26, 27 → `⏳ Pending`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [ ]* 12.2 Viết document verification tests cho TRACK.md
    - File: `backend/tests/test_documents.py` (append)

- [ ] 13. Viết unit tests cho backend endpoints
  - [ ] 13.1 Tạo `backend/tests/test_endpoints.py`
    - `test_health_ok`, `test_health_db_fallback`, `test_patch_source_active_false`, `test_patch_source_not_found`, `test_patch_source_db_unconfigured`
    - _Requirements: 1.1, 1.2, 1.3, 4.2, 4.6_

- [ ] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks đánh dấu `*` là optional — có thể bỏ qua để ra MVP nhanh hơn
- Checkpoints tại task 3, 9, 14 để validate incremental progress
- Property tests dùng `hypothesis` — cần `pip install hypothesis pytest-asyncio`
- CSS theme tập trung trong `frontend/theme.py` để tránh duplicate code

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.3", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.4", "4.2", "4.3", "5.1"] },
    { "id": 3, "tasks": ["6.1", "7.1", "8.1", "13.1"] },
    { "id": 4, "tasks": ["6.2", "6.4", "8.2"] },
    { "id": 5, "tasks": ["6.3", "10.1", "11.1", "12.1"] },
    { "id": 6, "tasks": ["10.2", "11.2", "12.2"] }
  ]
}
```
