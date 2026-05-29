"""Seed 50 real regulatory sources into Supabase.

Adds sources without wiping existing data. Safe to run multiple times
(skips sources whose URL already exists).

Usage:
    cd backend
    python seed_sources.py
"""
from __future__ import annotations

import sys
from datetime import datetime, timezone

from config import settings
from database import get_db

# ---------------------------------------------------------------------------
# 50 real regulatory / compliance sources across major domains
# ---------------------------------------------------------------------------

SOURCES = [
    # ── US Securities & Finance ──────────────────────────────────────────
    {"name": "SEC Enforcement Actions",         "url": "https://www.sec.gov/litigation/litreleases.htm",                    "scan_interval_hours": 6},
    {"name": "SEC Press Releases",              "url": "https://www.sec.gov/news/pressreleases",                            "scan_interval_hours": 6},
    {"name": "SEC Rulemaking Activity",         "url": "https://www.sec.gov/rules/proposed.shtml",                         "scan_interval_hours": 12},
    {"name": "FINRA Rule Updates",              "url": "https://www.finra.org/rules-guidance/notices",                     "scan_interval_hours": 6},
    {"name": "FINRA Enforcement Actions",       "url": "https://www.finra.org/rules-guidance/oversight-enforcement/finra-disciplinary-actions", "scan_interval_hours": 12},
    {"name": "CFTC Press Releases",             "url": "https://www.cftc.gov/PressRoom/PressReleases",                     "scan_interval_hours": 12},
    {"name": "OCC Bulletins",                   "url": "https://www.occ.gov/news-issuances/bulletins/index-bulletins.html","scan_interval_hours": 24},
    {"name": "Federal Reserve Supervision",     "url": "https://www.federalreserve.gov/supervisionreg/enforcementactions.htm", "scan_interval_hours": 24},
    {"name": "FDIC Press Releases",             "url": "https://www.fdic.gov/news/press-releases/",                        "scan_interval_hours": 24},
    {"name": "FinCEN Advisories",               "url": "https://www.fincen.gov/",                      "scan_interval_hours": 24},

    # ── US Consumer & Trade ──────────────────────────────────────────────
    {"name": "FTC Press Releases",              "url": "https://www.ftc.gov/news-events/news/press-releases",              "scan_interval_hours": 12},
    {"name": "FTC Business Guidance",           "url": "https://www.ftc.gov/business-guidance",                           "scan_interval_hours": 24},
    {"name": "CFPB Newsroom",                   "url": "https://www.consumerfinance.gov/about-us/newsroom/",               "scan_interval_hours": 12},
    {"name": "CFPB Enforcement Actions",        "url": "https://www.consumerfinance.gov/enforcement/actions/",             "scan_interval_hours": 12},

    # ── US Workplace & Safety ────────────────────────────────────────────
    {"name": "OSHA News Releases",              "url": "https://www.osha.gov/news/newsreleases",                           "scan_interval_hours": 24},
    {"name": "OSHA Enforcement",                "url": "https://www.osha.gov/enforcement",                                 "scan_interval_hours": 24},
    {"name": "EEOC Press Releases",             "url": "https://www.eeoc.gov/newsroom/press-releases",                    "scan_interval_hours": 24},
    {"name": "DOL Wage & Hour News",            "url": "https://www.dol.gov/newsroom/releases/whd",                       "scan_interval_hours": 24},

    # ── US Healthcare ────────────────────────────────────────────────────
    {"name": "HHS OCR HIPAA Enforcement",       "url": "https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/agreements/index.html", "scan_interval_hours": 24},
    {"name": "FDA Safety Alerts",               "url": "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts", "scan_interval_hours": 12},
    {"name": "CMS Compliance Guidance",         "url": "https://www.cms.gov/",              "scan_interval_hours": 48},

    # ── US Cybersecurity ─────────────────────────────────────────────────
    {"name": "CISA Alerts & Advisories",        "url": "https://www.cisa.gov/news-events/cybersecurity-advisories",       "scan_interval_hours": 6},
    {"name": "NIST Cybersecurity News",         "url": "https://www.nist.gov/cybersecurity",                              "scan_interval_hours": 24},
    {"name": "FBI Cyber Division Alerts",       "url": "https://www.ic3.gov/",                           "scan_interval_hours": 12},

    # ── EU / GDPR ────────────────────────────────────────────────────────
    {"name": "ICO News & Blogs",                "url": "https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/",   "scan_interval_hours": 12},
    {"name": "ICO Enforcement Actions",         "url": "https://ico.org.uk/action-weve-taken/enforcement/",               "scan_interval_hours": 12},
    {"name": "EDPB Press Releases",             "url": "https://www.edpb.europa.eu/news/news_en",                         "scan_interval_hours": 12},
    {"name": "CNIL Actualités (France DPA)",    "url": "https://www.cnil.fr/en/news",                                     "scan_interval_hours": 24},
    {"name": "DPC Ireland Decisions",           "url": "https://www.dataprotection.ie/en/news-media",                     "scan_interval_hours": 24},

    # ── EU Financial & Markets ───────────────────────────────────────────
    {"name": "EBA Press Releases",              "url": "https://www.eba.europa.eu/publications-and-media/press-releases",               "scan_interval_hours": 12},
    {"name": "ESMA Press Releases",             "url": "https://www.esma.europa.eu/press-news/esma-news",                 "scan_interval_hours": 12},
    {"name": "ECB Banking Supervision",         "url": "https://www.bankingsupervision.europa.eu/press/pr/html/index.en.html", "scan_interval_hours": 24},

    # ── UK ───────────────────────────────────────────────────────────────
    {"name": "FCA Press Releases",              "url": "https://www.fca.org.uk/news/press-releases",                      "scan_interval_hours": 6},
    {"name": "FCA Enforcement Actions",         "url": "https://www.fca.org.uk/news/enforcement-actions",                 "scan_interval_hours": 12},
    {"name": "PRA Publications",                "url": "https://www.bankofengland.co.uk/prudential-regulation", "scan_interval_hours": 24},

    # ── International Standards ──────────────────────────────────────────
    {"name": "ISO News",                        "url": "https://www.iso.org/news.html",                                   "scan_interval_hours": 48},
    {"name": "FATF Outcomes",                   "url": "https://www.fatf-gafi.org/en/publications.html", "scan_interval_hours": 48},
    {"name": "BIS Publications",                "url": "https://www.bis.org/press/index.htm",                             "scan_interval_hours": 24},

    # ── AI & Emerging Tech Regulation ───────────────────────────────────
    {"name": "EU AI Act Updates",               "url": "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai", "scan_interval_hours": 24},
    {"name": "NIST AI Risk Management",         "url": "https://www.nist.gov/artificial-intelligence",                    "scan_interval_hours": 48},
    {"name": "FTC AI Guidance",                 "url": "https://www.ftc.gov/business-guidance/blog",                      "scan_interval_hours": 24},

    # ── Environmental & ESG ──────────────────────────────────────────────
    {"name": "EPA Enforcement Actions",         "url": "https://www.epa.gov/enforcement/enforcement-news",                "scan_interval_hours": 24},
    {"name": "SEC ESG Disclosure Rules",        "url": "https://www.sec.gov/rules/final.shtml",               "scan_interval_hours": 48},
    {"name": "GRI Standards Updates",           "url": "https://www.globalreporting.org/news/",                           "scan_interval_hours": 48},

    # ── Crypto & Digital Assets ──────────────────────────────────────────
    {"name": "CFTC Digital Assets",             "url": "https://www.cftc.gov/digitalassets/index.htm",                    "scan_interval_hours": 12},
    {"name": "SEC Crypto Enforcement",          "url": "https://www.sec.gov/spotlight/cybersecurity",                     "scan_interval_hours": 12},
    {"name": "FinCEN Crypto Guidance",          "url": "https://www.fincen.gov/resources/statutes-regulations/guidance",  "scan_interval_hours": 24},

    # ── Healthcare / Pharma ──────────────────────────────────────────────
    {"name": "EMA Regulatory News",             "url": "https://www.ema.europa.eu/en/news-events",                   "scan_interval_hours": 24},
    {"name": "MHRA Enforcement",                "url": "https://www.gov.uk/government/organisations/medicines-and-healthcare-products-regulatory-agency/about/our-governance", "scan_interval_hours": 48},
]


def seed_sources():
    db = get_db()
    if db is None:
        print("ERROR: Supabase not configured — check SUPABASE_URL and SUPABASE_KEY in .env")
        sys.exit(1)

    # Fetch existing URLs to avoid duplicates
    existing = db.table("regulatory_sources").select("url").execute()
    existing_urls = {row["url"] for row in (existing.data or [])}
    print(f"Found {len(existing_urls)} existing sources in DB.")

    added = 0
    skipped = 0
    now = datetime.now(timezone.utc).isoformat()

    for src in SOURCES:
        if src["url"] in existing_urls:
            print(f"  SKIP (exists): {src['name']}")
            skipped += 1
            continue

        try:
            res = db.table("regulatory_sources").insert({
                "name": src["name"],
                "url": src["url"],
                "active": True,
                "scan_interval_hours": src["scan_interval_hours"],
                "last_scan_at": None,
                "created_at": now,
            }).execute()
            if res.data:
                print(f"  ✓ Added: {src['name']}")
                added += 1
            else:
                print(f"  ✗ Failed (no data returned): {src['name']}")
        except Exception as e:
            print(f"  ✗ Error adding {src['name']}: {e}")

    print(f"\nDone — {added} added, {skipped} skipped (already existed).")
    print(f"Total sources in DB: {len(existing_urls) + added}")


if __name__ == "__main__":
    seed_sources()
