"""Page 3 — Alert Detail: full AI analysis, remediation steps, source citation."""
import os
import sys

import httpx
import streamlit as st

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from theme import (  # noqa: E402
    get_severity_header_class,
    get_severity_label_class,
    inject_theme,
)

BACKEND = "http://localhost:8000"

st.set_page_config(page_title="Alert Detail — ComplianceRadar", layout="wide")
inject_theme()

st.markdown("## Alert Detail")

SEV_DISPLAY = {
    "critical": "Critical",
    "high":     "High",
    "medium":   "Medium",
    "low":      "Low",
}


@st.cache_data(ttl=30)
def fetch_alert(alert_id: int) -> dict | None:
    try:
        r = httpx.get(f"{BACKEND}/api/v1/alerts/{alert_id}", timeout=8)
        if r.status_code == 200:
            return r.json()
        return None
    except Exception:
        return None


@st.cache_data(ttl=60)
def fetch_alerts_list(limit: int = 200) -> list[dict]:
    try:
        return httpx.get(
            f"{BACKEND}/api/v1/alerts", params={"limit": limit}, timeout=8
        ).json()
    except Exception:
        return []


# ── Alert selector ────────────────────────────────────────────────────────────
all_alerts = fetch_alerts_list()

if not all_alerts:
    st.markdown(
        '<p class="muted">No alerts found. Run a scan or load demo data from the home page.</p>',
        unsafe_allow_html=True,
    )
    st.stop()

alert_options = {
    f"[{SEV_DISPLAY.get(a.get('severity',''), a.get('severity','?').title())}]"
    f" {a.get('source_name', 'Unknown')} — {a.get('created_at','')[:10]}": a.get("id")
    for a in all_alerts
}

default_label = None
if "selected_alert_id" in st.session_state:
    for label, aid in alert_options.items():
        if aid == st.session_state["selected_alert_id"]:
            default_label = label
            break

selected_label = st.selectbox(
    "Alert",
    list(alert_options.keys()),
    index=list(alert_options.keys()).index(default_label) if default_label else 0,
)
selected_id = alert_options[selected_label]
alert = fetch_alert(selected_id)

if not alert:
    st.error(f"Could not load alert #{selected_id}. It may have been removed.")
    st.stop()

# ── Severity header — background tint, no border-left ────────────────────────
sev = alert.get("severity", "")
sev_display = SEV_DISPLAY.get(sev, sev.title() if sev else "Unknown")
header_class = get_severity_header_class(sev)
label_class = get_severity_label_class(sev)
src_name = alert.get("source_name", f"Source {alert.get('source_id', '?')}")
src_url = alert.get("source_url", "")
created = alert.get("created_at", "")[:19].replace("T", " ")

st.markdown(
    f'<div class="{header_class}">'
    f'<p class="sev-header-title">'
    f'<span class="{label_class}">{sev_display}</span>'
    f"&ensp;{src_name}"
    f"</p>"
    f'<p class="sev-header-meta">Alert #{alert.get("id")} &middot; Detected {created}</p>'
    f"</div>",
    unsafe_allow_html=True,
)

# ── Two-column layout ─────────────────────────────────────────────────────────
left_col, right_col = st.columns([3, 2])

with left_col:
    # Summary
    st.markdown("### Summary")
    summary = alert.get("summary", "")
    if summary:
        st.markdown(
            f'<div class="summary-block">{summary}</div>',
            unsafe_allow_html=True,
        )
    else:
        st.markdown('<p class="muted">No summary available.</p>', unsafe_allow_html=True)

    # Remediation
    st.markdown("### Remediation")
    steps = alert.get("remediation_steps", "")
    if steps:
        for line in steps.split("\n"):
            line = line.strip()
            if line:
                st.markdown(line)
    else:
        st.markdown('<p class="muted">No remediation steps available.</p>', unsafe_allow_html=True)

with right_col:
    # Impacted departments
    st.markdown("### Impacted Departments")
    depts = alert.get("impacted_depts", "")
    if depts:
        dept_list = [d.strip() for d in depts.split(",") if d.strip()]
        st.markdown(
            "".join(
                f'<span style="display:inline-block;margin:2px 4px 2px 0;padding:3px 10px;'
                f'background:oklch(96% 0.008 250);border-radius:3px;font-size:0.9rem;'
                f'color:oklch(28% 0.010 250)">{d}</span>'
                for d in dept_list
            ),
            unsafe_allow_html=True,
        )
    else:
        st.markdown('<p class="muted">—</p>', unsafe_allow_html=True)

    # Source
    st.markdown("### Source")
    if src_url:
        st.markdown(
            f'<a href="{src_url}" target="_blank" class="detail-source-link">{src_name}</a>'
            f'<br><span class="muted" style="word-break:break-all">{src_url}</span>',
            unsafe_allow_html=True,
        )
    else:
        st.markdown(src_name or "—")

    # Raw data (collapsed, for debugging)
    with st.expander("Raw data", expanded=False):
        st.json(alert)
