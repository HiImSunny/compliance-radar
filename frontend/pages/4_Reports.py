"""Page 4 — Reports: severity distribution, source coverage, daily alert volume."""
import os
import sys

import altair as alt
import httpx
import pandas as pd
import streamlit as st

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from theme import inject_theme, SEVERITY_HEX  # noqa: E402

BACKEND = "http://localhost:8000"

st.set_page_config(page_title="Reports — ComplianceRadar", layout="wide")
inject_theme()

# ── Toolbar ───────────────────────────────────────────────────────────────────
title_col, refresh_col = st.columns([5, 1])
with title_col:
    st.markdown("## Reports")
    st.markdown(
        '<p class="muted">Severity distribution, source coverage, and daily alert volume</p>',
        unsafe_allow_html=True,
    )
with refresh_col:
    st.markdown("<br>", unsafe_allow_html=True)
    if st.button("Refresh", use_container_width=True):
        st.cache_data.clear()
        st.rerun()


# ── Data fetching ─────────────────────────────────────────────────────────────
@st.cache_data(ttl=30)
def fetch_alerts(limit: int = 500) -> list[dict]:
    try:
        return httpx.get(
            f"{BACKEND}/api/v1/alerts", params={"limit": limit}, timeout=8
        ).json()
    except Exception:
        return []


@st.cache_data(ttl=30)
def fetch_sources() -> list[dict]:
    try:
        return httpx.get(f"{BACKEND}/api/v1/sources", timeout=8).json()
    except Exception:
        return []


alerts = fetch_alerts()
sources = fetch_sources()

if not alerts and not sources:
    st.markdown(
        '<p class="muted" style="padding:16px 0">No data yet. Run a scan or load demo data from the home page.</p>',
        unsafe_allow_html=True,
    )
    st.stop()

df = pd.DataFrame(alerts) if alerts else pd.DataFrame()
src_df = pd.DataFrame(sources) if sources else pd.DataFrame()

# ── Shared chart config ───────────────────────────────────────────────────────
CHART_HEIGHT = 220
AXIS_CONFIG = alt.Axis(
    labelFont="Inter, sans-serif",
    labelFontSize=11,
    labelColor="#6b7280",
    titleFont="Inter, sans-serif",
    titleFontSize=11,
    titleColor="#6b7280",
    gridColor="#f0f0f4",
    domainColor="#e5e7eb",
    tickColor="#e5e7eb",
)


def section_header(label: str) -> None:
    st.markdown(
        f'<p class="report-section-title">{label}</p>',
        unsafe_allow_html=True,
    )


def no_data_note() -> None:
    st.markdown(
        '<p class="muted" style="padding:8px 0">No data available.</p>',
        unsafe_allow_html=True,
    )


# ── Row 1: Severity distribution + Alerts by source ──────────────────────────
row1_left, row1_right = st.columns(2)

with row1_left:
    section_header("Severity Distribution")
    if not df.empty and "severity" in df.columns:
        SEV_ORDER = ["critical", "high", "medium", "low"]
        sev_df = df["severity"].value_counts().reset_index()
        sev_df.columns = ["severity", "count"]
        sev_df["severity"] = pd.Categorical(
            sev_df["severity"], categories=SEV_ORDER, ordered=True
        )
        sev_df = sev_df.sort_values("severity")
        sev_df["color"] = sev_df["severity"].map(SEVERITY_HEX).fillna("#9ca3af")

        chart = (
            alt.Chart(sev_df)
            .mark_bar(cornerRadiusTopLeft=3, cornerRadiusTopRight=3)
            .encode(
                x=alt.X(
                    "severity:N",
                    sort=SEV_ORDER,
                    title=None,
                    axis=AXIS_CONFIG,
                ),
                y=alt.Y(
                    "count:Q",
                    title="Alerts",
                    axis=AXIS_CONFIG,
                ),
                color=alt.Color(
                    "color:N",
                    scale=None,
                    legend=None,
                ),
                tooltip=[
                    alt.Tooltip("severity:N", title="Severity"),
                    alt.Tooltip("count:Q", title="Alerts"),
                ],
            )
            .properties(height=CHART_HEIGHT)
            .configure_view(strokeWidth=0)
        )
        st.altair_chart(chart, use_container_width=True)
    else:
        no_data_note()

with row1_right:
    section_header("Alerts by Source")
    if not df.empty and "source_name" in df.columns:
        src_counts = df["source_name"].value_counts().reset_index()
        src_counts.columns = ["source", "count"]

        chart = (
            alt.Chart(src_counts)
            .mark_bar(cornerRadiusTopLeft=3, cornerRadiusTopRight=3, color="#4b6cb7")
            .encode(
                x=alt.X(
                    "count:Q",
                    title="Alerts",
                    axis=AXIS_CONFIG,
                ),
                y=alt.Y(
                    "source:N",
                    sort="-x",
                    title=None,
                    axis=AXIS_CONFIG,
                ),
                tooltip=[
                    alt.Tooltip("source:N", title="Source"),
                    alt.Tooltip("count:Q", title="Alerts"),
                ],
            )
            .properties(height=CHART_HEIGHT)
            .configure_view(strokeWidth=0)
        )
        st.altair_chart(chart, use_container_width=True)
    elif not df.empty and "source_id" in df.columns:
        src_counts = df["source_id"].value_counts().reset_index()
        src_counts.columns = ["source_id", "count"]
        chart = (
            alt.Chart(src_counts)
            .mark_bar(cornerRadiusTopLeft=3, cornerRadiusTopRight=3, color="#4b6cb7")
            .encode(
                x=alt.X("count:Q", title="Alerts", axis=AXIS_CONFIG),
                y=alt.Y("source_id:N", sort="-x", title=None, axis=AXIS_CONFIG),
                tooltip=["source_id:N", "count:Q"],
            )
            .properties(height=CHART_HEIGHT)
            .configure_view(strokeWidth=0)
        )
        st.altair_chart(chart, use_container_width=True)
    else:
        no_data_note()

# ── Row 2: Daily alert volume + Impacted departments ─────────────────────────
row2_left, row2_right = st.columns(2)

with row2_left:
    section_header("Daily Alert Volume")
    if not df.empty and "created_at" in df.columns:
        df["date"] = pd.to_datetime(
            df["created_at"], utc=True, errors="coerce"
        ).dt.floor("D")
        timeline = (
            df.groupby("date")
            .size()
            .reset_index(name="count")
            .dropna(subset=["date"])
        )
        if not timeline.empty:
            chart = (
                alt.Chart(timeline)
                .mark_area(
                    line={"color": "#4b6cb7", "strokeWidth": 1.5},
                    color=alt.Gradient(
                        gradient="linear",
                        stops=[
                            alt.GradientStop(color="#4b6cb7", offset=0),
                            alt.GradientStop(color="#e8edf8", offset=1),
                        ],
                        x1=1, x2=1, y1=1, y2=0,
                    ),
                )
                .encode(
                    x=alt.X("date:T", title=None, axis=AXIS_CONFIG),
                    y=alt.Y("count:Q", title="Alerts", axis=AXIS_CONFIG),
                    tooltip=[
                        alt.Tooltip("date:T", title="Date", format="%b %d"),
                        alt.Tooltip("count:Q", title="Alerts"),
                    ],
                )
                .properties(height=CHART_HEIGHT)
                .configure_view(strokeWidth=0)
            )
            st.altair_chart(chart, use_container_width=True)
        else:
            no_data_note()
    else:
        no_data_note()

with row2_right:
    section_header("Impacted Departments")
    if not df.empty and "impacted_depts" in df.columns:
        dept_counter: dict[str, int] = {}
        for row in df["impacted_depts"].dropna():
            for dept in [d.strip() for d in row.split(",")]:
                if dept:
                    dept_counter[dept] = dept_counter.get(dept, 0) + 1
        if dept_counter:
            dept_df = pd.DataFrame(
                sorted(dept_counter.items(), key=lambda x: -x[1]),
                columns=["department", "count"],
            )
            chart = (
                alt.Chart(dept_df)
                .mark_bar(cornerRadiusTopLeft=3, cornerRadiusTopRight=3, color="#4b6cb7")
                .encode(
                    x=alt.X("count:Q", title="Alerts", axis=AXIS_CONFIG),
                    y=alt.Y(
                        "department:N",
                        sort="-x",
                        title=None,
                        axis=AXIS_CONFIG,
                    ),
                    tooltip=[
                        alt.Tooltip("department:N", title="Department"),
                        alt.Tooltip("count:Q", title="Alerts"),
                    ],
                )
                .properties(height=CHART_HEIGHT)
                .configure_view(strokeWidth=0)
            )
            st.altair_chart(chart, use_container_width=True)
        else:
            no_data_note()
    else:
        no_data_note()
