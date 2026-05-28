# Requirements Document

## Introduction

ComplianceRadar là AI agent giám sát compliance quy định thời gian thực, build cho hackathon **Web Data UNLOCKED** (Bright Data), deadline **May 30, 2026 07:00 ICT**.

Backend đã hoàn chỉnh (FastAPI + APScheduler, Supabase, Gemini 2.5 Flash, Bright Data Web Unlocker + MCP, Slack webhook). Feature "compliance-radar-polish" bao gồm 5 nhóm công việc còn lại để đưa sản phẩm đến trạng thái submit-ready:

1. Nâng cấp `/health` endpoint với số liệu thực từ DB
2. Redesign Streamlit dashboard sang light theme theo Design Brief
3. Viết `README.md` với narrative hackathon-winning
4. Viết `JUDGING.md` với verification checklist cho judge
5. Cập nhật `TRACK.md` phản ánh trạng thái thực tế

---

## Glossary

- **ComplianceRadar**: Hệ thống giám sát compliance quy định thời gian thực — tên sản phẩm
- **Dashboard**: Ứng dụng Streamlit 4 trang chứa Alert Dashboard, Source Management, Alert Detail, Reports
- **Alert**: Bản ghi trong Supabase `alerts` table — output của AI synthesis sau khi phát hiện thay đổi quy định
- **Source**: Bản ghi trong `regulatory_sources` table — URL nguồn quy định được giám sát
- **Backend**: FastAPI application chạy tại `localhost:8000`
- **Health_Endpoint**: GET `/health` trả về trạng thái hệ thống
- **Alert_Feed**: Danh sách alert dạng dense list trong trang Alert Dashboard
- **Split_Pane**: Bố cục 2 cột — danh sách bên trái, detail bên phải — trên Alert Dashboard
- **Severity_Tint**: Background color row theo severity (critical #FFF2F2, high #FFF6F0, medium #FFFBEB, low #F0FFF4) — không dùng border-left stripe
- **Demo_Replay**: POST `/api/v1/demo/replay` — nạp 5 demo alerts mà không cần external API call
- **Judge**: Người chấm hackathon cần verify toàn bộ tính năng trong thời gian ngắn
- **Skeleton_Row**: Placeholder dạng hàng màu xám nhạt hiển thị trong khi data đang load
- **README**: File `compliance-radar/README.md` — tài liệu chính cho hackathon
- **JUDGING_DOC**: File `compliance-radar/JUDGING.md` — hướng dẫn verification cho judge
- **TRACK_DOC**: File `compliance-radar/TRACK.md` — bảng theo dõi tiến độ
- **Inter**: Font chữ sans-serif dùng xuyên suốt Dashboard
- **Light_Theme**: Color scheme: background `#FAFAFA`, surface `#FFFFFF`, text `#111827`

---

## Requirements

### Requirement 1: Health Endpoint với System Metrics

**User Story:** As a judge, I want to call `/health` and see live system metrics, so that I can verify the system is operational with real data without opening the database.

#### Acceptance Criteria

1. WHEN a GET request is sent to `/health`, THE Health_Endpoint SHALL return HTTP 200 with a JSON object containing `status`, `version`, `sources`, and `last_scan` fields.
2. IF the Supabase database is reachable, THEN THE Health_Endpoint SHALL populate `sources` with the total count of rows in `regulatory_sources` and `last_scan` with the most recent `last_scan_at` timestamp across all sources formatted as ISO 8601 UTC string (e.g. `"2026-05-28T09:15:00+00:00"`).
3. IF the Supabase database connection times out after 2500 ms or is unreachable, THEN THE Health_Endpoint SHALL return `{"status": "ok", "version": "1.0.0", "sources": 0, "last_scan": null}` and SHALL NOT raise an HTTP 5xx error.
4. THE Health_Endpoint SHALL respond within 3000 ms unconditionally.

---

### Requirement 2: Dashboard Light Theme

**User Story:** As a compliance officer, I want a clean light-theme interface, so that the dashboard is comfortable to use on a monitor in mid-afternoon and conveys an authoritative, precise product register.

#### Acceptance Criteria

1. THE Dashboard SHALL apply a global CSS stylesheet setting `background-color: #FAFAFA` on the page root, `background-color: #FFFFFF` on card elements, expander containers, and dataframe containers, and `color: #111827` on body text.
2. THE Dashboard SHALL load the Inter font from Google Fonts via `@import` in the injected CSS, and SHALL apply `font-family: 'Inter', sans-serif` to all visible text elements.
3. THE Dashboard SHALL NOT contain any `background-color` or `background` shorthand CSS property set to values beginning with `#0f`, `#1e`, or any other dark hex value in any injected `<style>` block.
4. IF an alert row's severity value is `critical`, THEN THE Alert_Feed SHALL render that row's background as `#FFF2F2`.
5. IF an alert row's severity value is `high`, THEN THE Alert_Feed SHALL render that row's background as `#FFF6F0`.
6. IF an alert row's severity value is `medium`, THEN THE Alert_Feed SHALL render that row's background as `#FFFBEB`.
7. IF an alert row's severity value is `low`, THEN THE Alert_Feed SHALL render that row's background as `#F0FFF4`.
8. THE Dashboard SHALL NOT render any `border-left` CSS property on alert rows.
9. THE Dashboard SHALL NOT render emoji characters in page headers, section headings, or navigation chrome (sidebar page titles).
10. THE Dashboard SHALL NOT render any `st.metric` components on the Alert Dashboard home page or the Alert Feed page.
11. IF an alert row's severity value is absent or unrecognized, THEN THE Alert_Feed SHALL render that row's background as `#FFFFFF`.

---

### Requirement 3: Alert Feed — Dense List with Split Pane

**User Story:** As a compliance officer, I want to triage alerts in a dense list with a side detail pane, so that I can scan 50 items quickly and open full analysis without leaving the page.

#### Acceptance Criteria

1. THE Alert_Feed SHALL display alerts as single-line rows, each rendered without inline expansion controls — NOT as `st.expander` elements.
2. THE Alert_Feed SHALL paginate at 50 alerts per page and SHALL render page navigation controls below the list.
3. IF the alerts dataset contains zero records for the current filter, THEN THE Alert_Feed SHALL display the text "No regulatory changes detected today" and SHALL NOT display any error state or spinner.
4. WHILE alert data is being fetched from the Backend, THE Alert_Feed SHALL display exactly 50 Skeleton_Row placeholders and SHALL NOT display a spinner widget.
5. WHEN the Alert_Feed page first loads with no alert selected, THE Split_Pane right column SHALL display "Select an alert to view details" placeholder text.
6. WHEN a user selects an alert row, THE Split_Pane SHALL render the alert detail in the right column without navigating to a separate page, and SHALL apply a distinct background to the selected row.
7. WHILE a scan is in progress, THE Alert_Feed page SHALL display the inline text "Scanning X/Y sources…" where X is the count of completed sources and Y is the total — and SHALL NOT display a full-page blocking overlay.
8. WHEN the user clicks "Scan Now", THE Dashboard SHALL NOT replace the current page content with a loading overlay.

---

### Requirement 4: Source Management Page Redesign

**User Story:** As a compliance officer, I want to manage regulatory sources in a clean table layout, so that I can scan, edit, and pause individual sources with per-row actions.

#### Acceptance Criteria

1. THE Source Management page SHALL display sources in a `st.dataframe` with columns: Name, URL, Status (values: "Active" or "Paused"), Last Scan (UTC timestamp), and Interval (in hours).
2. THE Source Management page SHALL render per-row action buttons below or alongside the dataframe: a "Scan" button that triggers `POST /api/v1/scan` scoped to that source, and a "Pause" button (label "Pause" when source is Active, "Resume" when source is Paused) that toggles the `active` field via `PATCH /api/v1/sources/{id}`.
3. THE Source Management page SHALL NOT render the Bright Data configuration expander in the main content area by default — it SHALL be placed inside a `st.expander` that is collapsed on page load.
4. IF the Backend is unreachable when the page loads, THEN THE Source Management page SHALL display the text "Backend unreachable — check that the FastAPI server is running on port 8000" and SHALL NOT display an unhandled exception traceback.
5. WHEN the user clicks a per-row "Scan" button, THE Source Management page SHALL display a spinner scoped to that row and SHALL display a success or error message below the button within 30 seconds.
6. WHEN the user clicks a per-row "Pause" or "Resume" button, THE Source Management page SHALL send a PATCH request to update the `active` field and SHALL reflect the updated status in the table without a full page reload.
7. IF a per-row action request fails, THEN THE Source Management page SHALL display the error message returned by the Backend and SHALL NOT leave the row in an indeterminate state.

---

### Requirement 5: Reports Page — No Hero Metrics

**User Story:** As a judge, I want to see analytics on a single scrollable page without hero metric cards, so that the reports section matches the authoritative, flat design language.

#### Acceptance Criteria

1. THE Reports page SHALL NOT render any `st.metric` components anywhere on the page.
2. IF the alerts dataset contains one or more records, THEN THE Reports page SHALL render a severity distribution bar chart, an alerts-by-source bar chart, a daily alert timeline line chart, and an impacted departments bar chart in sequence on a single page without tabs or pagination.
3. IF the alerts dataset contains zero records, THEN THE Reports page SHALL display "No regulatory changes detected today" and a "Load Demo" button — and SHALL NOT display any chart containers.

---

### Requirement 6: README.md

**User Story:** As a hackathon judge, I want to clone the repo, read the README, and understand the product and how to run it in under 5 minutes, so that I can evaluate the submission without asking questions.

#### Acceptance Criteria

1. THE README SHALL open with a single-sentence narrative that references the `$14.8 billion` regulatory fine figure and states what ComplianceRadar does.
2. THE README SHALL contain an ASCII architecture diagram showing the relationship between FastAPI, Streamlit, Supabase, Bright Data Web Unlocker, Bright Data MCP Server, Gemini 2.5 Flash, and Slack.
3. THE README SHALL contain a feature matrix table using `✅`, `🔶`, and `🔲` symbols with at minimum one row for each of the 5 technology components named in criterion 2 (FastAPI, Supabase, Bright Data Web Unlocker, Bright Data MCP Server, Gemini 2.5 Flash).
4. THE README SHALL contain a Quick Start section with exactly 3 commands scoped to the backend: `git clone`, `pip install -r backend/requirements.txt`, and `uvicorn main:app --reload` (run from the `backend/` directory).
5. THE README SHALL contain a dedicated "Bright Data Integration" section describing how Web Unlocker bypasses geo-restrictions and how MCP Server connects the AI agent to live web data.
6. THE README SHALL contain an environment variables table with columns: variable name, description, and example value — covering all keys present in `.env.example`.
7. THE README SHALL contain a placeholder line for the demo video link in the format `**Demo Video:** [Watch on YouTube](<link>)`.
8. IF the reader follows the Quick Start commands on a machine with valid `.env` credentials, THEN the backend server SHALL emit the `"Application startup complete"` log line and `GET /health` SHALL return HTTP 200.

---

### Requirement 7: JUDGING.md

**User Story:** As a hackathon judge, I want a single document I can follow blindly to verify all judging criteria, so that I can complete verification in under 10 minutes without any prior knowledge of the codebase.

#### Acceptance Criteria

1. THE JUDGING_DOC SHALL contain a Gate G1 section with copy-paste `curl` commands to start the backend, trigger `POST /api/v1/scan`, and confirm that a document row appears in the Supabase `documents` table.
2. THE JUDGING_DOC SHALL contain a Gate G2 section with `curl` commands to trigger a scan on a seeded source and confirm both that an alert row exists in Supabase and that a Slack message was delivered (or that the stub log line `[SLACK STUB]` appears in backend stdout when no webhook is set).
3. THE JUDGING_DOC SHALL contain a Gate G3 section with a sequential shell script covering: `git clone`, `cd compliance-radar`, `pip install -r backend/requirements.txt`, `cd backend && uvicorn main:app`, and `curl http://localhost:8000/health` — where the expected output is `HTTP 200` with `"status": "ok"`.
4. THE JUDGING_DOC SHALL contain a Gate G4 section with a single `curl -X POST http://localhost:8000/api/v1/demo/replay` command and the expected response confirming 5 sources and 5 alerts loaded — with an explicit note that this requires no Bright Data, Gemini, or Slack credentials.
5. THE JUDGING_DOC SHALL contain a section listing all required environment variables and providing demo-safe placeholder values (e.g. `GEMINI_API_KEY=demo-not-required-for-gate-g4`) that allow Gate G4 to pass without real credentials.
6. THE JUDGING_DOC SHALL contain a verification checklist table with columns: Criterion, What to Check, Command/Observation — with one row each for Application of Technology, Business Value, Presentation, and Originality.
7. IF a judge follows the Gate G4 instructions with no Bright Data, Gemini, or Slack credentials set, THEN THE Demo_Replay endpoint SHALL return HTTP 200 with a JSON body containing `"message"` confirming 5 sources and 5 alerts loaded.

---

### Requirement 8: TRACK.md Update

**User Story:** As a project maintainer, I want TRACK.md to accurately reflect completed tasks, so that the progress tracker is trustworthy and the remaining work is clear.

#### Acceptance Criteria

1. THE TRACK_DOC SHALL mark tasks 6 through 23 as `✅ Done` in the Status column.
2. THE TRACK_DOC SHALL mark task 25 (`/health` endpoint) as `✅ Done` and SHALL record `{"status":"ok","sources":N,"last_scan":"..."}` in the Notes column for that task row.
3. THE TRACK_DOC SHALL mark task 24 (`.env.example` + `.gitignore`) as `✅ Done`.
4. THE TRACK_DOC SHALL keep tasks 26 (Demo video) and 27 (Submit) as `⏳ Pending`.
5. THE TRACK_DOC SHALL NOT list any task numbered 6–25 with status `⏳ Pending` in the Status column.
