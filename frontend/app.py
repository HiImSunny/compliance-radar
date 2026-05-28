"""ComplianceRadar — Streamlit home / overview dashboard."""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

import httpx
import streamlit as st
from theme import get_severity_class, get_severity_label_class, inject_theme

BACKEND = "http://localhost:8000"

st.set_page_config(
    page_title="ComplianceRadar",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Theme ────────────────────────────────────────────────────────────────────
inject_theme()


# ── Data helpers ─────────────────────────────────────────────────────────────
@st.cache_data(ttl=30)
def fetch_sources():
    try:
        return httpx.get(f"{BACKEND}/api/v1/sources", timeout=8).json()
    except Exception:
        return []


@st.cache_data(ttl=30)
def fetch_alerts(limit=200):
    try:
        return httpx.get(f"{BACKEND}/api/v1/alerts", params={"limit": limit}, timeout=8).json()
    except Exception:
        return []


# ── Header ───────────────────────────────────────────────────────────────────
st.markdown("## ComplianceRadar")
st.markdown('<p class="muted" style="margin:0 0 2px 0">Real-time regulatory compliance monitoring · Bright Data + Gemini 2.5 Flash</p>', unsafe_allow_html=True)

sources = fetch_sources()
alerts = fetch_alerts()

active_sources = [s for s in sources if s.get("active")]

last_scan = "—"
for s in sources:
    if s.get("last_scan_at"):
        ts = s["last_scan_at"][:19].replace("T", " ")
        if last_scan == "—" or ts > last_scan:
            last_scan = ts

# ── KPI summary ──────────────────────────────────────────────────────────────
critical_count = sum(1 for a in alerts if a.get("severity") == "critical")
high_count = sum(1 for a in alerts if a.get("severity") == "high")

kpi_parts = [
    f"**{len(active_sources)}** sources monitored",
    f"**{len(alerts)}** alerts",
]
if critical_count:
    kpi_parts.append(f'<span style="color:oklch(42% 0.18 20);font-weight:600">{critical_count} critical</span>')
if high_count:
    kpi_parts.append(f'<span style="color:oklch(46% 0.16 40);font-weight:600">{high_count} high</span>')
kpi_parts.append(f"Last scan: **{last_scan}**")

st.markdown(" · ".join(kpi_parts), unsafe_allow_html=True)

# ── Quick-action buttons ──────────────────────────────────────────────────────
col_a, col_b, col_c = st.columns([1, 1, 4])

with col_a:
    if st.button("Scan Now", type="primary", use_container_width=True):
        with st.spinner("Scanning sources…"):
            try:
                r = httpx.post(f"{BACKEND}/api/v1/scan", timeout=15)
                r.raise_for_status()
                st.success(r.json().get("message", "Scan complete"))
                st.cache_data.clear()
            except httpx.HTTPStatusError as e:
                st.error(f"Scan failed: server returned {e.response.status_code}. Check the backend logs.")
            except httpx.RequestError:
                st.error("Scan failed: backend unreachable. Check that the FastAPI server is running on port 8000.")

with col_b:
    if st.button("Load Demo Data", use_container_width=True):
        with st.spinner("Loading demo data…"):
            try:
                r = httpx.post(f"{BACKEND}/api/v1/demo/replay", timeout=30)
                r.raise_for_status()
                data = r.json()
                st.success(data.get("message", "Demo data loaded"))
                st.cache_data.clear()
                st.rerun()
            except httpx.HTTPStatusError as e:
                st.error(f"Could not load demo: server returned {e.response.status_code}.")
            except httpx.RequestError:
                st.error("Could not load demo: backend unreachable.")

st.markdown("### Recent Alerts")

if not alerts:
    st.markdown(
        '<p class="muted">No alerts yet. Run <strong>Scan Now</strong> to check for regulatory changes, '
        'or load <strong>Demo Data</strong> to explore the interface.</p>',
        unsafe_allow_html=True,
    )
else:
    SEV_LABEL_MAP = {
        "critical": "CRITICAL",
        "high":     "HIGH",
        "medium":   "MEDIUM",
        "low":      "LOW",
    }
    for alert in alerts[:5]:
        sev = alert.get("severity", "")
        sev_class = get_severity_class(sev)
        label_class = get_severity_label_class(sev)
        sev_label = SEV_LABEL_MAP.get(sev, sev.upper() if sev else "")
        src_name = alert.get("source_name", f"Source {alert.get('source_id')}")
        ts = alert.get("created_at", "")[:16].replace("T", " ")
        summary = (alert.get("summary") or "")[:120]
        if len(alert.get("summary") or "") > 120:
            summary += "…"
        depts = alert.get("impacted_depts", "")

        st.markdown(
            f'<div class="alert-row {sev_class}" style="flex-direction:column;align-items:flex-start;gap:4px;padding:10px 14px;">'
            f'<div style="display:flex;align-items:center;gap:8px;">'
            f'<span class="{label_class}">{sev_label}</span>'
            f'<span style="font-weight:500;font-size:1rem;color:oklch(18% 0.008 250)">{src_name}</span>'
            f'<span class="muted">{ts}</span>'
            f"</div>"
            f'<div style="color:oklch(30% 0.008 250);font-size:0.95rem;line-height:1.5">{summary}</div>'
            + (f'<div class="muted">Impacted: {depts}</div>' if depts else "")
            + "</div>",
            unsafe_allow_html=True,
        )

    st.markdown(
        f'<p class="muted" style="margin-top:10px">'
        f'Showing 5 most recent · <a href="/Alert_Dashboard" target="_self" style="color:oklch(38% 0.12 250)">View all {len(alerts)} alerts</a>'
        f'</p>',
        unsafe_allow_html=True,
    )

st.markdown('<p class="muted" style="margin-top:24px">ComplianceRadar v1.0</p>', unsafe_allow_html=True)
