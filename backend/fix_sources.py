"""Fix broken source URLs in Supabase.

- Corrects 404 URLs to working alternatives
- Removes sources that are permanently broken (SSL cert failures, no working alt)
- 403s are kept — Bright Data Web Unlocker handles those

Usage:
    cd backend
    python fix_sources.py
"""
from __future__ import annotations

import sys
from database import get_db

# (old_url, new_url_or_None)
# None = delete the source
FIXES = [
    # 404 → corrected URLs
    ("https://www.fincen.gov/resources/advisories",
     "https://www.fincen.gov/"),

    ("https://www.cms.gov/medicare/compliance-and-audits",
     "https://www.cms.gov/"),

    ("https://www.ic3.gov/Media/News/Alerts",
     "https://www.ic3.gov/"),

    ("https://www.eba.europa.eu/newsroom/press-releases",
     "https://www.eba.europa.eu/publications-and-media/press-releases"),

    ("https://www.bankofengland.co.uk/prudential-regulation/publication",
     "https://www.bankofengland.co.uk/prudential-regulation"),

    ("https://www.ema.europa.eu/en/news-events/news",
     "https://www.ema.europa.eu/en/news-events"),

    ("https://www.fatf-gafi.org/en/publications/Fatfgeneral/outcomes-fatf-plenary.html",
     "https://www.fatf-gafi.org/en/publications.html"),

    ("https://www.iosco.org/news/",
     None),  # 403 even on homepage — remove

    # SSL cert failure — remove
    ("https://www.bfdi.bund.de/EN/Home/home_node.html",
     None),

    # SEC ESG — direct PDF link, not a news page
    ("https://www.sec.gov/rules/final/2024/33-11275.pdf",
     "https://www.sec.gov/rules/final.shtml"),
]


def fix():
    db = get_db()
    if db is None:
        print("ERROR: Supabase not configured")
        sys.exit(1)

    for old_url, new_url in FIXES:
        # Find the source
        res = db.table("regulatory_sources").select("id, name, url").eq("url", old_url).execute()
        rows = res.data or []
        if not rows:
            print(f"  NOT FOUND: {old_url}")
            continue

        row = rows[0]
        src_id = row["id"]
        name = row["name"]

        if new_url is None:
            db.table("regulatory_sources").delete().eq("id", src_id).execute()
            print(f"  DELETED: {name}")
        else:
            db.table("regulatory_sources").update({"url": new_url}).eq("id", src_id).execute()
            print(f"  FIXED:   {name}")
            print(f"           {old_url}")
            print(f"        -> {new_url}")

    print("\nDone.")


if __name__ == "__main__":
    fix()
