"""
Page 1 — Alert Dashboard

Dense list + split pane layout.
- Left column (2/3): paginated alert list with sort + filter toolbar
- Right column (1/3): alert detail on selection, structured pane when nothing selected
"""

import os
import sys

import httpx
import streamlit as st

# Allow importing theme.py from the parent frontend/ directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from theme import get_severity_class, get_severity_label_class, get_severity_header_class, inject_theme  # noqa: E402

# ── Constants ─────────────────────────────────────────────────────────────────
BACKEND = "http://localhost:8000"
PAGE_SIZE = 50

SEV_LABEL = {
    "critical": "CRITICAL",
    "high": "HIGH",
    "medium": "MEDIUM",
    "low": "LOW",
}

SEV_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}

# ── Page config ───────────────────────────────────────────────────────────────
st.set_page_config(page_title="Alert Dashboard — ComplianceRadar", layout="wide")
inject_theme()

st.markdown("## Alert Dashboard")

# ── Session state defaults ────────────────────────────────────────────────────
st.session_state.setdefault("alert_page", 0)
st.session_state.setdefault("selected_alert_id", None)


# ── Data fetching ─────────────────────────────────────────────────────────────
@st.cache_data(ttl=20)
def fetch_alerts() -> list[dict] | None:
    """
    Fetch all alerts from the backend.

    Returns:
        List of alert dicts on success, None if backend is unreachable.
    """
    try:
        resp = httpx.get(f"{BACKEND}/api/v1/alerts", params={"limit": 500}, timeout=8)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        return None


@st.cache_data(ttl=20)
def fetch_alert_detail(alert_id: int) -> dict | None:
    """Fetch a single alert's full detail from the backend."""
    try:
        resp = httpx.get(f"{BACKEND}/api/v1/alerts/{alert_id}", timeout=8)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        return None


# ── Toolbar row ───────────────────────────────────────────────────────────────
toolbar_search, toolbar_sev, toolbar_sort, toolbar_scan = st.columns([2, 1, 1, 1])

with toolbar_search:
    search_term = st.text_input(
        "Search alerts",
        placeholder="Keyword, source, or department…",
    )

with toolbar_sev:
    severity_filter = st.selectbox(
        "Severity",
        ["All", "Critical", "High", "Medium", "Low"],
    )

with toolbar_sort:
    sort_order = st.selectbox(
        "Sort by",
        ["Severity", "Newest first", "Oldest first"],
    )

with toolbar_scan:
    scan_clicked = st.button("Scan Now", use_container_width=True)

# ── Scan Now handler ──────────────────────────────────────────────────────────
if scan_clicked:
    with st.spinner("Scanning sources…"):
        try:
            httpx.post(f"{BACKEND}/api/v1/scan", timeout=10)
            st.cache_data.clear()
            st.rerun()
        except httpx.RequestError:
            st.error("Scan failed: backend unreachable. Check that the FastAPI server is running on port 8000.")
        except httpx.HTTPStatusError as e:
            st.error(f"Scan failed: server returned {e.response.status_code}.")

# ── Fetch alerts ─────────────────────────────────────────────────────────────
raw_alerts = fetch_alerts()

if raw_alerts is None:
    st.error(
        "Backend unreachable. Check that the FastAPI server is running on port 8000."
    )
    st.stop()

# ── Client-side filtering ─────────────────────────────────────────────────────
filtered_alerts = raw_alerts

if severity_filter != "All":
    filtered_alerts = [
        a for a in filtered_alerts
        if a.get("severity", "").lower() == severity_filter.lower()
    ]

if search_term:
    term = search_term.lower()
    filtered_alerts = [
        a for a in filtered_alerts
        if term in a.get("summary", "").lower()
        or term in a.get("source_name", "").lower()
        or term in a.get("impacted_depts", "").lower()
    ]

# ── Client-side sorting ───────────────────────────────────────────────────────
if sort_order == "Severity":
    filtered_alerts = sorted(
        filtered_alerts,
        key=lambda a: SEV_ORDER.get(a.get("severity", "").lower(), 99),
    )
elif sort_order == "Newest first":
    filtered_alerts = sorted(
        filtered_alerts,
        key=lambda a: a.get("created_at", ""),
        reverse=True,
    )
elif sort_order == "Oldest first":
    filtered_alerts = sorted(
        filtered_alerts,
        key=lambda a: a.get("created_at", ""),
    )

# ── Split pane ────────────────────────────────────────────────────────────────
list_col, detail_col = st.columns([2, 1])

# ── Alert list (left column) ──────────────────────────────────────────────────
with list_col:
    if len(filtered_alerts) == 0:
        st.markdown(
            '<p class="muted" style="padding:16px 0">No alerts match the current filters.</p>',
            unsafe_allow_html=True,
        )

    else:
        # Pagination
        total_pages = max(1, (len(filtered_alerts) + PAGE_SIZE - 1) // PAGE_SIZE)
        page = st.session_state["alert_page"]

        # Guard against stale page index after filter change
        if page >= total_pages:
            page = 0
            st.session_state["alert_page"] = 0

        page_alerts = filtered_alerts[page * PAGE_SIZE : (page + 1) * PAGE_SIZE]

        # Render each alert row
        for alert in page_alerts:
            alert_id = alert.get("id")
            sev = alert.get("severity", "")
            sev_class = get_severity_class(sev)
            label_class = get_severity_label_class(sev)
            sev_label = SEV_LABEL.get(sev.lower() if sev else "", sev.upper() if sev else "")
            src_name = alert.get("source_name", f"Source {alert.get('source_id', '?')}")
            ts = alert.get("created_at", "")[:16].replace("T", " ")
            summary_preview = (alert.get("summary") or "")[:80]
            if len(alert.get("summary") or "") > 80:
                summary_preview += "…"

            selected = st.session_state.get("selected_alert_id") == alert_id
            extra_class = "selected" if selected else ""

            # HTML row for visual styling
            st.markdown(
                f'<div class="alert-row {sev_class} {extra_class}">'
                f'<span class="{label_class}">{sev_label}</span>'
                f'<span style="min-width:120px;display:inline-block;font-weight:500">{src_name}</span>'
                f'<span style="color:oklch(50% 0.010 250);min-width:110px;display:inline-block;font-size:0.9rem">{ts}</span>'
                f'<span style="color:oklch(30% 0.008 250);font-size:0.95rem">{summary_preview}</span>'
                f"</div>",
                unsafe_allow_html=True,
            )

            # Visually hidden button using the standard SR-only pattern.
            # pointer-events is NOT set to none, so the button remains focusable
            # via keyboard and activatable by screen readers.
            st.markdown('<div class="row-btn-wrapper">', unsafe_allow_html=True)
            if st.button(
                f"Select alert: {sev_label} from {src_name}, {ts}",
                key=f"row_{alert_id}",
                use_container_width=True,
            ):
                st.session_state["selected_alert_id"] = alert_id
                st.rerun()
            st.markdown("</div>", unsafe_allow_html=True)

        # ── Pagination controls ───────────────────────────────────────────────
        prev_col, page_label_col, next_col = st.columns([1, 2, 1])

        with prev_col:
            if st.button("← Previous", disabled=(page == 0), use_container_width=True):
                st.session_state["alert_page"] = page - 1
                st.rerun()

        with page_label_col:
            st.markdown(
                f'<p style="text-align:center;margin:6px 0;font-size:0.9rem;color:oklch(50% 0.010 250)">'
                f'{page * PAGE_SIZE + 1}–{min((page + 1) * PAGE_SIZE, len(filtered_alerts))} of {len(filtered_alerts)}'
                f'</p>',
                unsafe_allow_html=True,
            )

        with next_col:
            if st.button(
                "Next →",
                disabled=(page >= total_pages - 1),
                use_container_width=True,
            ):
                st.session_state["alert_page"] = page + 1
                st.rerun()

# ── Detail pane (right column) ────────────────────────────────────────────────
with detail_col:
    selected_id = st.session_state.get("selected_alert_id")

    if selected_id is None:
        st.markdown(
            '<div class="detail-pane">'
            '<p class="detail-pane-placeholder">Select an alert to view details</p>'
            '</div>',
            unsafe_allow_html=True,
        )
    else:
        detail = fetch_alert_detail(selected_id)

        if detail is None:
            st.error("Could not load alert detail. The alert may have been removed.")
        else:
            sev = detail.get("severity", "")
            sev_label_text = SEV_LABEL.get(sev.lower() if sev else "", sev.upper() if sev else "")
            label_class = get_severity_label_class(sev)
            header_class = get_severity_header_class(sev)
            src_name = detail.get("source_name", f"Source {detail.get('source_id', '?')}")
            src_url = detail.get("source_url", "")
            created = detail.get("created_at", "")[:16].replace("T", " ")

            # Severity header
            st.markdown(
                f'<div class="{header_class}" style="margin-bottom:12px">'
                f'<p class="sev-header-title">'
                f'<span class="{label_class}">{sev_label_text}</span>'
                f'&ensp;{src_name}'
                f'</p>'
                f'<p class="sev-header-meta">Alert #{detail.get("id")} &middot; {created}</p>'
                f'</div>',
                unsafe_allow_html=True,
            )

            # Summary
            summary = detail.get("summary", "")
            if summary:
                st.markdown('<p class="detail-section-label">Summary</p>', unsafe_allow_html=True)
                st.markdown(
                    f'<div class="summary-block">{summary}</div>',
                    unsafe_allow_html=True,
                )

            # Impacted departments
            depts = detail.get("impacted_depts", "")
            if depts:
                dept_list = [d.strip() for d in depts.split(",") if d.strip()]
                st.markdown('<p class="detail-section-label">Impacted Departments</p>', unsafe_allow_html=True)
                st.markdown(
                    "".join(
                        f'<span style="display:inline-block;margin:2px 4px 2px 0;padding:3px 10px;'
                        f'background:oklch(96% 0.008 250);border-radius:3px;font-size:0.9rem;'
                        f'color:oklch(28% 0.010 250)">{d}</span>'
                        for d in dept_list
                    ),
                    unsafe_allow_html=True,
                )

            # Remediation steps
            steps = detail.get("remediation_steps", "")
            if steps:
                st.markdown('<p class="detail-section-label">Remediation Steps</p>', unsafe_allow_html=True)
                for line in steps.split("\n"):
                    line = line.strip()
                    if line:
                        st.markdown(
                            f'<div class="remediation-step">{line}</div>',
                            unsafe_allow_html=True,
                        )

            # Source link
            if src_url:
                st.markdown('<p class="detail-section-label">Source</p>', unsafe_allow_html=True)
                st.markdown(
                    f'<a href="{src_url}" target="_blank" class="detail-source-link">{src_name}</a>',
                    unsafe_allow_html=True,
                )

            # Clear selection
            st.markdown("<br>", unsafe_allow_html=True)
            if st.button("Clear selection", key="clear_selection"):
                st.session_state["selected_alert_id"] = None
                st.rerun()
