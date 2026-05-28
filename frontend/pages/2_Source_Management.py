"""Page 2 — Source Management: per-row scan/pause actions, add sources, Bright Data config."""
import os
import sys

import httpx
import streamlit as st

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from theme import inject_theme  # noqa: E402

BACKEND = "http://localhost:8000"

st.set_page_config(page_title="Source Management — ComplianceRadar", layout="wide")
inject_theme()

st.markdown("## Source Management")

# ── Fetch sources ─────────────────────────────────────────────────────────────

@st.cache_data(ttl=15)
def fetch_sources() -> list[dict] | None:
    """Return sources list, or None if backend is unreachable."""
    try:
        return httpx.get(f"{BACKEND}/api/v1/sources", timeout=8).json()
    except Exception:
        return None


sources = fetch_sources()
if sources is None:
    st.error(
        "Backend unreachable. Check that the FastAPI server is running on port 8000."
    )
    st.stop()

# ── Source table with per-row actions ─────────────────────────────────────────

st.markdown("### Monitored Sources")

if sources:
    # Header row
    hdr = st.columns([3, 4, 1, 1, 1, 1])
    hdr[0].markdown(
        '<p style="font-size:0.82rem;font-weight:600;letter-spacing:0.06em;'
        'text-transform:uppercase;color:oklch(45% 0.010 250);margin:0">Name</p>',
        unsafe_allow_html=True,
    )
    hdr[1].markdown(
        '<p style="font-size:0.82rem;font-weight:600;letter-spacing:0.06em;'
        'text-transform:uppercase;color:oklch(45% 0.010 250);margin:0">URL</p>',
        unsafe_allow_html=True,
    )
    hdr[2].markdown(
        '<p style="font-size:0.82rem;font-weight:600;letter-spacing:0.06em;'
        'text-transform:uppercase;color:oklch(45% 0.010 250);margin:0">Status</p>',
        unsafe_allow_html=True,
    )
    hdr[3].markdown(
        '<p style="font-size:0.82rem;font-weight:600;letter-spacing:0.06em;'
        'text-transform:uppercase;color:oklch(45% 0.010 250);margin:0">Interval</p>',
        unsafe_allow_html=True,
    )
    hdr[4].markdown("")
    hdr[5].markdown("")

    for src in sources:
        cols = st.columns([3, 4, 1, 1, 1, 1])
        cols[0].write(src.get("name", ""))

        # Show full URL as a link; truncate display text only
        url_full = (src.get("url", "") or "")
        url_display = url_full[:50] + "…" if len(url_full) > 50 else url_full
        cols[1].markdown(
            f'<a href="{url_full}" target="_blank" title="{url_full}" '
            f'style="font-size:1rem;color:oklch(38% 0.12 250);word-break:break-all">'
            f'{url_display}</a>',
            unsafe_allow_html=True,
        )

        is_active = src.get("active")
        status_color = "oklch(42% 0.14 155)" if is_active else "oklch(50% 0.010 250)"
        cols[2].markdown(
            f'<span style="font-size:1rem;color:{status_color}">'
            f'{"Active" if is_active else "Paused"}</span>',
            unsafe_allow_html=True,
        )

        interval_h = src.get("scan_interval_hours", "")
        cols[3].markdown(
            f'<span style="font-size:1rem;color:oklch(38% 0.010 250)">'
            f'{f"{interval_h}h" if interval_h != "" else "—"}</span>',
            unsafe_allow_html=True,
        )

        # Scan button
        with cols[4]:
            if st.button("Scan", key=f"scan_{src['id']}"):
                with st.spinner("Scanning…"):
                    try:
                        r = httpx.post(
                            f"{BACKEND}/api/v1/scan",
                            json={"source_id": src["id"]},
                            timeout=30,
                        )
                        if r.status_code in (200, 201):
                            st.success(r.json().get("message", "Scan complete"))
                        else:
                            st.error(
                                f"Scan failed: server returned {r.status_code}. "
                                "Check the backend logs for details."
                            )
                    except httpx.RequestError:
                        st.error("Scan failed: backend unreachable.")

        # Pause / Resume button
        with cols[5]:
            toggle_label = "Pause" if is_active else "Resume"
            if st.button(toggle_label, key=f"toggle_{src['id']}"):
                try:
                    r = httpx.patch(
                        f"{BACKEND}/api/v1/sources/{src['id']}",
                        json={"active": not is_active},
                        timeout=10,
                    )
                    if r.status_code == 200:
                        st.cache_data.clear()
                        st.rerun()
                    else:
                        st.error(
                            f"Could not update source: server returned {r.status_code}."
                        )
                except httpx.RequestError:
                    st.error("Request failed: backend unreachable.")
else:
    st.markdown(
        '<p class="muted">No sources yet. Add one below or load demo data from the home page.</p>',
        unsafe_allow_html=True,
    )

# ── Add new source ─────────────────────────────────────────────────────────────

st.markdown("### Add New Source")
with st.form("add_source", clear_on_submit=True):
    col1, col2 = st.columns(2)
    with col1:
        name = st.text_input("Source Name", placeholder="e.g. SEC Enforcement Releases")
        url = st.text_input("URL", placeholder="https://www.sec.gov/litigation/litreleases.htm")
    with col2:
        interval = st.selectbox(
            "Scan Interval",
            [6, 12, 24, 48],
            index=0,
            format_func=lambda h: f"Every {h} hours",
        )
        active = st.checkbox("Active immediately", value=True)

    submitted = st.form_submit_button("Add Source", type="primary")
    if submitted:
        if not name or not url:
            st.error("Source name and URL are both required.")
        elif not url.startswith(("http://", "https://")):
            st.error("URL must start with http:// or https://")
        else:
            try:
                r = httpx.post(
                    f"{BACKEND}/api/v1/sources",
                    json={
                        "name": name,
                        "url": url,
                        "scan_interval_hours": interval,
                        "active": active,
                    },
                    timeout=10,
                )
                if r.status_code in (200, 201):
                    st.success(f"Source added: {name}")
                    st.cache_data.clear()
                    st.rerun()
                else:
                    st.error(
                        f"Could not add source: server returned {r.status_code}."
                    )
            except httpx.RequestError:
                st.error("Could not add source: backend unreachable.")

# ── Bright Data configuration ─────────────────────────────────────────────────

with st.expander("Bright Data Configuration", expanded=False):
    st.markdown("""
**Bright Data** powers all web scraping in ComplianceRadar via the Web Unlocker API.

| Setting | Description |
|---|---|
| `BRIGHTDATA_TOKEN` | API Bearer token from the Bright Data dashboard |
| `BRIGHTDATA_ZONE` | Web Unlocker zone name (e.g. `unlocker`) |

**Available scraping tools:**
- `search_engine` — Google/Bing search for enforcement actions
- `scrape_as_markdown` — Clean markdown extraction from any URL
- `discover` — AI-powered URL discovery for a regulatory query
- `search_engine_batch` — Batch search across multiple queries
- `scrape_batch` — Batch scrape across multiple URLs
    """)

    st.markdown(
        '<p class="muted">Credentials are loaded from <code>.env</code> at startup. '
        'Edit <code>.env</code> to update them.</p>',
        unsafe_allow_html=True,
    )
