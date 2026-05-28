"""Seed demo data directly via Supabase (run standalone, not via FastAPI).

Usage:
    cd backend
    python seed_demo.py
"""
import sys
from datetime import datetime, timezone

from config import settings
from database import get_db
from change_detector import hash_content

SOURCES = [
    {"name": "SEC Enforcement", "url": "https://www.sec.gov/litigation/litreleases.htm", "active": True, "scan_interval_hours": 6},
    {"name": "GDPR Enforcement — ICO", "url": "https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/", "active": True, "scan_interval_hours": 12},
    {"name": "FINRA Rule Updates", "url": "https://www.finra.org/rules-guidance/notices", "active": True, "scan_interval_hours": 6},
    {"name": "OSHA Hazard Bulletins", "url": "https://www.osha.gov/news/newsreleases", "active": True, "scan_interval_hours": 24},
    {"name": "FTC Consumer Protection", "url": "https://www.ftc.gov/news-events/news/press-releases", "active": True, "scan_interval_hours": 12},
]

ALERTS_TEMPLATE = [
    {
        "severity": "critical",
        "summary": "The SEC issued Release No. LR-26000 imposing new cybersecurity disclosure requirements effective Q1. All public companies must disclose material incidents within 4 business days. Non-compliance may result in penalties up to $100 000/day.",
        "impacted_depts": "Legal, IT Security, Finance, Investor Relations",
        "remediation_steps": "1. Review SEC Release LR-26000\n2. Assess recent incidents for materiality\n3. Establish 4-business-day disclosure SOP\n4. Train IR and Legal teams\n5. Update incident response playbook\n6. File 8-K for outstanding material incidents",
        "created_at": "2026-05-20T09:15:00+00:00",
    },
    {
        "severity": "high",
        "summary": "ICO issued updated guidance on AI-generated personal data, clarifying that synthetic datasets derived from personal data require full GDPR compliance. Controllers must conduct fresh DPIAs for existing AI training pipelines.",
        "impacted_depts": "Data Protection, AI/ML Engineering, Legal",
        "remediation_steps": "1. Identify AI models trained on personal data\n2. Conduct DPIA for each pipeline\n3. Update privacy notices\n4. Re-confirm DPO engagement\n5. Document lawful basis for each processing activity",
        "created_at": "2026-05-22T14:30:00+00:00",
    },
    {
        "severity": "high",
        "summary": "FINRA Regulatory Notice 26-08 requires broker-dealers to implement enhanced supervisory procedures for AI-assisted trading recommendations by September 2026. Human review must be documented for all AI-flagged trades above $50 000.",
        "impacted_depts": "Trading, Compliance, Technology, Risk Management",
        "remediation_steps": "1. Audit current AI trading advisory tools\n2. Design supervisory framework\n3. Implement logging for AI-flagged trades\n4. Draft updated WSP and file with FINRA by August 1\n5. Train registered representatives",
        "created_at": "2026-05-25T11:00:00+00:00",
    },
    {
        "severity": "medium",
        "summary": "OSHA issued a hazard bulletin updating PPE requirements for chemical handling in warehouse environments, citing three recent incidents. New eye protection standards take effect in 120 days.",
        "impacted_depts": "Operations, HR, Health & Safety",
        "remediation_steps": "1. Review OSHA PPE standard 29 CFR 1910.133\n2. Audit PPE inventory across all warehouse sites\n3. Order compliant eye protection within 60 days\n4. Schedule mandatory safety briefing\n5. Update hazard communication program",
        "created_at": "2026-05-26T08:45:00+00:00",
    },
    {
        "severity": "low",
        "summary": "FTC released a policy statement clarifying that existing truth-in-advertising standards apply to AI-generated testimonials and endorsements. No new rules; existing guides updated with illustrative AI examples.",
        "impacted_depts": "Marketing, Legal",
        "remediation_steps": "1. Review FTC Endorsement Guides AI addendum\n2. Audit marketing materials using AI-generated content\n3. Add required disclosures to AI-generated testimonials\n4. Brief marketing team on updated guidelines",
        "created_at": "2026-05-28T07:00:00+00:00",
    },
]


def seed():
    db = get_db()
    if db is None:
        print("ERROR: Supabase not configured — check SUPABASE_URL and SUPABASE_KEY in .env")
        sys.exit(1)

    print("Cleaning existing demo data…")
    try:
        db.table("alerts").delete().gte("id", 1).execute()
        db.table("documents").delete().gte("id", 1).execute()
        db.table("regulatory_sources").delete().gte("id", 1).execute()
    except Exception as e:
        print(f"  Cleanup warning: {e}")

    print("Seeding sources…")
    source_ids = []
    for src in SOURCES:
        res = db.table("regulatory_sources").insert({
            **src,
            "last_scan_at": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
        if res.data:
            source_ids.append(res.data[0]["id"])
            print(f"  ✓ {src['name']} (id={res.data[0]['id']})")

    if len(source_ids) != 5:
        print(f"ERROR: Expected 5 sources, got {len(source_ids)}")
        sys.exit(1)

    print("Seeding documents + alerts…")
    for i, tmpl in enumerate(ALERTS_TEMPLATE):
        sid = source_ids[i]
        doc_res = db.table("documents").insert({
            "source_id": sid,
            "content_hash": hash_content(tmpl["summary"]),
            "raw_html": f"<html><body>{tmpl['summary']}</body></html>",
            "scraped_at": tmpl["created_at"],
        }).execute()
        doc_id = doc_res.data[0]["id"] if doc_res.data else None

        alert_res = db.table("alerts").insert({
            "source_id": sid,
            "document_id": doc_id,
            "severity": tmpl["severity"],
            "summary": tmpl["summary"],
            "impacted_depts": tmpl["impacted_depts"],
            "remediation_steps": tmpl["remediation_steps"],
            "created_at": tmpl["created_at"],
        }).execute()
        if alert_res.data:
            print(f"  ✓ Alert [{tmpl['severity'].upper()}] for source_id={sid}")

    print("\nSeed complete — 5 sources, 5 documents, 5 alerts loaded.")


if __name__ == "__main__":
    seed()
