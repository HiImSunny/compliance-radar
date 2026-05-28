"""
Shared theme module for ComplianceRadar frontend.

Provides CSS injection and severity class helpers used across all pages.

Color system uses OKLCH throughout. Neutrals are tinted toward
oklch hue 250 (blue-gray, authority/compliance register).
"""

import streamlit as st

# ---------------------------------------------------------------------------
# Severity color tokens — two roles per level:
#   bg  = row background tint (very low chroma, high lightness)
#   fg  = label/badge foreground (readable on white)
# ---------------------------------------------------------------------------
SEVERITY_BG = {
    "critical": "oklch(96% 0.025 20)",    # warm red tint
    "high":     "oklch(96% 0.020 40)",    # warm orange tint
    "medium":   "oklch(97% 0.018 85)",    # warm amber tint
    "low":      "oklch(97% 0.018 155)",   # cool green tint
    "unknown":  "oklch(99% 0.005 250)",   # near-white, brand-tinted
}

SEVERITY_FG = {
    "critical": "oklch(97% 0.005 20)",    # white on solid red badge
    "high":     "oklch(97% 0.005 40)",    # white on solid orange badge
    "medium":   "oklch(97% 0.005 85)",    # white on solid amber badge
    "low":      "oklch(97% 0.005 155)",   # white on solid green badge
    "unknown":  "oklch(97% 0.004 250)",   # white on solid gray badge
}

# Hex equivalents for Altair/Vega charts (OKLCH not supported in Vega spec)
SEVERITY_HEX = {
    "critical": "#c0392b",
    "high":     "#d35400",
    "medium":   "#b7950b",
    "low":      "#1e8449",
}

CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* ── Page surfaces ─────────────────────────────────────────────────────── */
[data-testid="stAppViewContainer"],
[data-testid="stAppViewContainer"] > .main {
    background-color: oklch(97% 0.006 250) !important;
}

[data-testid="stMain"] {
    background-color: oklch(97% 0.006 250) !important;
}

/* Main content block */
[data-testid="stMainBlockContainer"] {
    background-color: oklch(97% 0.006 250) !important;
}

[data-testid="stSidebar"],
[data-testid="stSidebar"] > div:first-child {
    background-color: oklch(22% 0.015 250) !important;
    border-right: 1px solid oklch(30% 0.015 250) !important;
}

/* Sidebar text */
[data-testid="stSidebar"] * {
    color: oklch(88% 0.008 250) !important;
}
[data-testid="stSidebar"] a {
    color: oklch(75% 0.08 250) !important;
}
[data-testid="stSidebar"] [data-testid="stMarkdownContainer"] p {
    color: oklch(88% 0.008 250) !important;
}

[data-testid="stExpander"],
[data-testid="stDataFrame"],
.stForm {
    background-color: oklch(100% 0.003 250) !important;
}

/* ── Typography ────────────────────────────────────────────────────────── */
html, body, [class*="css"] {
    font-family: 'Inter', sans-serif !important;
}

/* Main content text */
[data-testid="stMarkdownContainer"] p,
[data-testid="stMarkdownContainer"] li,
[data-testid="stMarkdownContainer"] span {
    color: oklch(18% 0.010 250) !important;
    font-family: 'Inter', sans-serif !important;
}

[data-testid="stMarkdownContainer"] h1,
[data-testid="stMarkdownContainer"] h2,
[data-testid="stMarkdownContainer"] h3 {
    color: oklch(12% 0.012 250) !important;
    font-family: 'Inter', sans-serif !important;
    font-weight: 700 !important;
}

/* Streamlit's own heading elements */
h1, h2, h3, h4 {
    color: oklch(12% 0.012 250) !important;
    font-family: 'Inter', sans-serif !important;
}

/* ── Native widget skin — inputs ───────────────────────────────────────── */
[data-testid="stTextInput"] input,
[data-testid="stTextArea"] textarea {
    font-family: 'Inter', sans-serif !important;
    background-color: oklch(100% 0.003 250) !important;
    border: 1px solid oklch(82% 0.012 250) !important;
    border-radius: 4px !important;
    color: oklch(15% 0.010 250) !important;
    font-size: 1rem !important;
    transition: border-color 0.12s ease-out;
}
[data-testid="stTextInput"] input:focus,
[data-testid="stTextArea"] textarea:focus {
    border-color: oklch(50% 0.14 250) !important;
    outline: none !important;
    box-shadow: 0 0 0 3px oklch(88% 0.04 250) !important;
}

/* ── Native widget skin — selectbox ────────────────────────────────────── */
[data-testid="stSelectbox"] > div > div {
    font-family: 'Inter', sans-serif !important;
    background-color: oklch(100% 0.003 250) !important;
    border: 1px solid oklch(82% 0.012 250) !important;
    border-radius: 4px !important;
    color: oklch(15% 0.010 250) !important;
    font-size: 1rem !important;
}

/* ── Native widget skin — buttons ──────────────────────────────────────── */
/* Streamlit renders buttons with data-testid="baseButton-primary" etc */
[data-testid="stButton"] > button,
button[kind="primary"],
[data-testid="stButton"] button[kind="primary"],
[data-testid="baseButton-primary"] {
    font-family: 'Inter', sans-serif !important;
    background-color: oklch(42% 0.16 250) !important;
    border: none !important;
    border-radius: 5px !important;
    color: oklch(98% 0.004 250) !important;
    font-size: 1rem !important;
    font-weight: 600 !important;
    transition: background-color 0.12s ease-out;
    padding: 0.55rem 1.25rem !important;
}
[data-testid="stButton"] > button:hover,
button[kind="primary"]:hover,
[data-testid="stButton"] button[kind="primary"]:hover {
    background-color: oklch(35% 0.16 250) !important;
    color: oklch(98% 0.004 250) !important;
}

/* Secondary / default buttons */
[data-testid="stButton"] button[kind="secondary"],
[data-testid="baseButton-secondary"] {
    font-family: 'Inter', sans-serif !important;
    background-color: oklch(100% 0.003 250) !important;
    border: 1.5px solid oklch(78% 0.014 250) !important;
    border-radius: 5px !important;
    color: oklch(22% 0.012 250) !important;
    font-size: 1rem !important;
    font-weight: 500 !important;
    transition: background-color 0.12s ease-out, border-color 0.12s ease-out;
    padding: 0.55rem 1.25rem !important;
}
[data-testid="stButton"] button[kind="secondary"]:hover {
    background-color: oklch(95% 0.008 250) !important;
    border-color: oklch(65% 0.016 250) !important;
}
[data-testid="stButton"] button:disabled {
    opacity: 0.4 !important;
    cursor: not-allowed !important;
}

/* ── Native widget skin — labels ───────────────────────────────────────── */
[data-testid="stTextInput"] label,
[data-testid="stSelectbox"] label,
[data-testid="stTextArea"] label,
[data-testid="stCheckbox"] label,
label[data-testid="stWidgetLabel"] {
    font-family: 'Inter', sans-serif !important;
    font-size: 0.9rem !important;
    font-weight: 600 !important;
    color: oklch(32% 0.012 250) !important;
    letter-spacing: 0.01em !important;
}

/* ── Native widget skin — warning / info / success / error ─────────────── */
[data-testid="stAlert"] {
    border-radius: 4px !important;
    font-family: 'Inter', sans-serif !important;
    font-size: 1rem !important;
}
/* Override the default blue info box to use brand-tinted neutral */
[data-testid="stAlert"][data-baseweb="notification"][kind="info"] {
    background-color: oklch(97% 0.008 250) !important;
    border: 1px solid oklch(88% 0.012 250) !important;
    color: oklch(25% 0.010 250) !important;
}

/* ── Severity row backgrounds ──────────────────────────────────────────── */
.sev-critical { background-color: oklch(94% 0.030 20) !important; }
.sev-high     { background-color: oklch(94% 0.025 40) !important; }
.sev-medium   { background-color: oklch(95% 0.022 85) !important; }
.sev-low      { background-color: oklch(95% 0.022 155) !important; }
.sev-unknown  { background-color: oklch(96% 0.008 250) !important; }

/* ── Severity label pills ──────────────────────────────────────────────── */
.sev-label {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 3px;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-family: 'Inter', sans-serif;
}
.sev-label-critical { background-color: oklch(38% 0.20 20); color: oklch(97% 0.005 20) !important; }
.sev-label-high     { background-color: oklch(50% 0.18 40); color: oklch(97% 0.005 40) !important; }
.sev-label-medium   { background-color: oklch(55% 0.16 85); color: oklch(97% 0.005 85) !important; }
.sev-label-low      { background-color: oklch(42% 0.16 155); color: oklch(97% 0.005 155) !important; }
.sev-label-unknown  { background-color: oklch(55% 0.012 250); color: oklch(97% 0.004 250) !important; }

/* ── Alert row ─────────────────────────────────────────────────────────── */
.alert-row {
    padding: 10px 14px;
    border-radius: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 3px;
    transition: filter 0.12s ease-out;
    border: 1px solid transparent;
}
.alert-row:hover {
    filter: brightness(0.96);
}
.alert-row.selected {
    background-color: oklch(92% 0.020 250) !important;
    border-color: oklch(65% 0.060 250) !important;
    outline: none;
}

/* ── Row-select button: visually hidden, keyboard and screen-reader accessible */
/* Uses the standard SR-only pattern: focusable, not pointer-events:none       */
.row-btn-wrapper > div[data-testid="stButton"] > button {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}
/* Restore visibility on keyboard focus so users can see what they're activating */
.row-btn-wrapper > div[data-testid="stButton"] > button:focus-visible {
    position: static;
    width: auto;
    height: auto;
    clip: auto;
    white-space: normal;
    margin: 0;
    overflow: visible;
    outline: 2px solid oklch(55% 0.12 250);
    outline-offset: 2px;
}

/* ── Skeleton shimmer ──────────────────────────────────────────────────── */
@keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
}
.skeleton-row {
    height: 36px;
    border-radius: 4px;
    background: linear-gradient(
        90deg,
        oklch(93% 0.008 250) 25%,
        oklch(89% 0.010 250) 50%,
        oklch(93% 0.008 250) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.4s ease-out infinite;
    margin-bottom: 4px;
}

/* ── Severity detail header (page 3) ───────────────────────────────────── */
.sev-header {
    border-radius: 6px;
    padding: 14px 18px;
    margin-bottom: 20px;
}
.sev-header-critical { background-color: oklch(94% 0.030 20); }
.sev-header-high     { background-color: oklch(94% 0.025 40); }
.sev-header-medium   { background-color: oklch(95% 0.022 85); }
.sev-header-low      { background-color: oklch(95% 0.022 155); }
.sev-header-unknown  { background-color: oklch(93% 0.010 250); }

.sev-header-title {
    font-size: 1.2rem;
    font-weight: 700;
    color: oklch(12% 0.010 250) !important;
    margin: 0 0 4px 0;
}
.sev-header-meta {
    font-size: 0.9rem;
    color: oklch(40% 0.012 250) !important;
    margin: 0;
}

/* ── Summary block (page 3) ────────────────────────────────────────────── */
.summary-block {
    background-color: oklch(96% 0.008 250);
    border-radius: 4px;
    padding: 14px 16px;
    margin-bottom: 16px;
    color: oklch(18% 0.010 250) !important;
    line-height: 1.6;
    font-size: 1rem;
}

/* ── Detail pane (dashboard right column) ──────────────────────────────── */
.detail-pane {
    background-color: oklch(100% 0.003 250);
    border-radius: 6px;
    padding: 16px 18px;
    border: 1px solid oklch(88% 0.010 250);
}
.detail-pane-placeholder {
    color: oklch(48% 0.010 250) !important;
    font-size: 1rem;
    padding: 24px 0;
    text-align: center;
}
.detail-section-label {
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: oklch(42% 0.012 250) !important;
    margin: 16px 0 6px 0;
}
.detail-section-label:first-child {
    margin-top: 0;
}
.detail-body {
    font-size: 1rem;
    color: oklch(18% 0.010 250) !important;
    line-height: 1.6;
}
.detail-source-link {
    font-size: 0.9rem;
    color: oklch(38% 0.14 250) !important;
    text-decoration: none;
}
.detail-source-link:hover {
    text-decoration: underline;
}
.remediation-step {
    font-size: 1rem;
    color: oklch(18% 0.010 250) !important;
    line-height: 1.6;
    padding: 3px 0;
}

/* ── Reports section headers ───────────────────────────────────────────── */
.report-section-title {
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: oklch(38% 0.012 250) !important;
    margin: 0 0 12px 0;
    padding-bottom: 6px;
    border-bottom: 1px solid oklch(88% 0.010 250);
}

/* ── Misc ──────────────────────────────────────────────────────────────── */
.muted {
    color: oklch(42% 0.012 250) !important;
    font-size: 0.9rem;
}

/* ── Streamlit metric / KPI overrides ──────────────────────────────────── */
[data-testid="stMetric"] {
    background-color: oklch(100% 0.003 250);
    border: 1px solid oklch(88% 0.010 250);
    border-radius: 6px;
    padding: 12px 16px;
}
[data-testid="stMetricValue"] {
    color: oklch(15% 0.012 250) !important;
    font-weight: 700 !important;
}
[data-testid="stMetricLabel"] {
    color: oklch(40% 0.012 250) !important;
    font-size: 0.85rem !important;
    font-weight: 600 !important;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

/* ── Spinner text ───────────────────────────────────────────────────────── */
[data-testid="stSpinner"] p {
    color: oklch(35% 0.012 250) !important;
}

/* ── Streamlit top header bar ───────────────────────────────────────────── */
[data-testid="stHeader"] {
    background-color: oklch(22% 0.015 250) !important;
}
[data-testid="stHeader"] button,
[data-testid="stHeader"] a {
    color: oklch(88% 0.008 250) !important;
}

/* ── Sidebar nav links ──────────────────────────────────────────────────── */
[data-testid="stSidebarNav"] a {
    color: oklch(80% 0.010 250) !important;
    font-size: 0.95rem !important;
    font-weight: 500 !important;
    border-radius: 4px;
    padding: 4px 8px;
}
[data-testid="stSidebarNav"] a:hover,
[data-testid="stSidebarNav"] a[aria-current="page"] {
    background-color: oklch(32% 0.018 250) !important;
    color: oklch(95% 0.006 250) !important;
}
</style>
"""


def inject_theme() -> None:
    """Inject the global CSS theme into the current Streamlit page."""
    st.markdown(CSS, unsafe_allow_html=True)


def get_severity_class(severity: str) -> str:
    """Map severity string to row background CSS class."""
    if not severity:
        return "sev-unknown"
    mapping = {
        "critical": "sev-critical",
        "high":     "sev-high",
        "medium":   "sev-medium",
        "low":      "sev-low",
    }
    return mapping.get(severity.lower(), "sev-unknown")


def get_severity_label_class(severity: str) -> str:
    """Map severity string to label pill CSS class."""
    if not severity:
        return "sev-label sev-label-unknown"
    mapping = {
        "critical": "sev-label sev-label-critical",
        "high":     "sev-label sev-label-high",
        "medium":   "sev-label sev-label-medium",
        "low":      "sev-label sev-label-low",
    }
    return mapping.get(severity.lower(), "sev-label sev-label-unknown")


def get_severity_header_class(severity: str) -> str:
    """Map severity string to detail-page header CSS class."""
    if not severity:
        return "sev-header sev-header-unknown"
    mapping = {
        "critical": "sev-header sev-header-critical",
        "high":     "sev-header sev-header-high",
        "medium":   "sev-header sev-header-medium",
        "low":      "sev-header sev-header-low",
    }
    return mapping.get(severity.lower(), "sev-header sev-header-unknown")
