"""ComplianceRadar — FastAPI backend.

Endpoints
---------
GET  /health
GET  /api/v1/sources
POST /api/v1/sources
POST /api/v1/scan
GET  /api/v1/alerts
GET  /api/v1/alerts/{id}
POST /api/v1/demo/replay   — instant demo using cached data, zero external calls
"""
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ai_synthesizer import AISynthesizer
from change_detector import detect_change, hash_content
from config import settings
from database import (
    db_create_alert,
    db_create_document,
    db_create_source,
    db_get_active_sources,
    db_get_alert,
    db_get_health_metrics,
    db_get_latest_document,
    db_list_alerts,
    db_list_sources,
    db_update_source,
    db_update_source_scan_time,
    get_db,
)
from models import RegulatorySource
from notifier import Notifier
from scrape_engine import ScrapeEngine

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s")
logger = logging.getLogger("compliance_radar")

synthesizer = AISynthesizer()
notifier = Notifier()
scraper = ScrapeEngine()
scheduler = AsyncIOScheduler()


# ---------------------------------------------------------------------------
# Periodic scan job
# ---------------------------------------------------------------------------

async def _run_periodic_scan() -> None:
    logger.info("APScheduler triggered periodic scan")
    db = get_db()
    if db is None:
        logger.warning("DB not configured — skipping periodic scan")
        return
    await _scan_all_sources(db)


async def _scan_all_sources(db) -> list[dict]:
    """Core pipeline: scrape → detect change → store document → AI → alert → Slack."""
    sources = db_get_active_sources(db)
    results = []
    for src in sources:
        result = await _scan_source(db, src)
        results.append(result)
    return results


async def _scan_source(db, src: dict) -> dict:
    source_id = src["id"]
    url = src["url"]
    name = src["name"]

    try:
        # 1. Scrape
        try:
            raw_content = await scraper.scrape(url)
        except Exception:
            # Fallback to MCP markdown scrape
            raw_content = await scraper.scrape_markdown(url)

        # 2. Hash & change detection
        new_hash = hash_content(raw_content)
        latest_doc = db_get_latest_document(db, source_id)
        old_hash = latest_doc["content_hash"] if latest_doc else ""
        changed = detect_change(old_hash, raw_content)

        # 3. Update scan timestamp
        now_ts = datetime.now(timezone.utc).isoformat()
        db_update_source_scan_time(db, source_id, now_ts)

        if not changed and old_hash:
            logger.info(f"No change detected for source id={source_id} name={name}")
            return {"source_id": source_id, "name": name, "changed": False}

        # 4. Store document
        doc_row = db_create_document(
            db,
            {
                "source_id": source_id,
                "content_hash": new_hash,
                "raw_html": raw_content[:50000],  # cap storage
                "scraped_at": now_ts,
            },
        )
        doc_id = doc_row.get("id")

        # 5. AI synthesis
        ai = await synthesizer.synthesize(
            source_name=name,
            url=url,
            new_content=raw_content,
            old_hash=old_hash,
        )

        # 6. Create alert
        alert_row = db_create_alert(
            db,
            {
                "source_id": source_id,
                "document_id": doc_id,
                "severity": ai["severity"],
                "summary": ai["summary"],
                "impacted_depts": ai["impacted_depts"],
                "remediation_steps": ai["remediation_steps"],
                "created_at": now_ts,
            },
        )

        # 7. Slack notification
        await notifier.send_alert(
            {
                **alert_row,
                "source_name": name,
                "source_url": url,
            }
        )

        logger.info(f"Alert created for source id={source_id} name={name} severity={ai['severity']}")
        return {"source_id": source_id, "name": name, "changed": True, "alert": alert_row}

    except Exception as exc:
        logger.error(f"Scan failed for source id={source_id} name={name}: {exc}")
        return {"source_id": source_id, "name": name, "error": str(exc)}


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(_run_periodic_scan, "interval", hours=6, id="periodic_scan", replace_existing=True)
    scheduler.start()
    logger.info("APScheduler started — periodic scan every 6 h")
    yield
    scheduler.shutdown(wait=False)
    logger.info("APScheduler stopped")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(title="ComplianceRadar", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    sources: int = 0
    last_scan: Optional[str] = None  # ISO 8601 UTC string


class SourceCreate(BaseModel):
    name: str
    url: str
    scan_interval_hours: int = 6
    active: bool = True


class SourcePatch(BaseModel):
    active: Optional[bool] = None
    scan_interval_hours: Optional[int] = None
    name: Optional[str] = None
    url: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
async def health():
    db = get_db()
    if db is None:
        return HealthResponse()

    loop = asyncio.get_event_loop()
    try:
        metrics = await asyncio.wait_for(
            loop.run_in_executor(None, db_get_health_metrics, db),
            timeout=2.5,
        )
        return HealthResponse(
            sources=metrics.get("sources", 0),
            last_scan=metrics.get("last_scan"),
        )
    except Exception:
        logger.warning("Health check DB query failed — returning fallback response")
        return HealthResponse()


# --- Sources ---

@app.get("/api/v1/sources")
async def list_sources():
    db = get_db()
    if db is None:
        return []
    return db_list_sources(db)


@app.post("/api/v1/sources", status_code=201)
async def create_source(body: SourceCreate):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database not configured")
    row = db_create_source(
        db,
        {
            "name": body.name,
            "url": body.url,
            "scan_interval_hours": body.scan_interval_hours,
            "active": body.active,
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    return row


@app.patch("/api/v1/sources/{source_id}")
async def patch_source(source_id: int, body: SourcePatch):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database not configured")
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    result = db_update_source(db, source_id, update_data)
    if result is None:
        raise HTTPException(404, detail=f"Source {source_id} not found")
    return result


# --- Scan ---

@app.post("/api/v1/scan")
async def trigger_scan():
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database not configured")
    # Run in background so the HTTP response returns promptly
    asyncio.create_task(_scan_all_sources(db))
    return {"message": "Scan triggered — results will appear in /api/v1/alerts"}


@app.post("/api/v1/sources/{source_id}/scan")
async def trigger_source_scan(source_id: int):
    """Trigger a scan for a single source."""
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database not configured")
    sources = db_list_sources(db)
    src = next((s for s in sources if s["id"] == source_id), None)
    if src is None:
        raise HTTPException(404, f"Source {source_id} not found")
    asyncio.create_task(_scan_source(db, src))
    return {"message": f"Scan triggered for source {source_id} — {src['name']}"}


# --- Alerts ---

@app.get("/api/v1/alerts")
async def list_alerts(
    severity: Optional[str] = Query(None, pattern="^(critical|high|medium|low)$"),
    limit: int = Query(100, ge=1, le=500),
):
    db = get_db()
    if db is None:
        return []
    return db_list_alerts(db, severity=severity, limit=limit)


@app.get("/api/v1/alerts/{alert_id}")
async def get_alert(alert_id: int):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database not configured")
    row = db_get_alert(db, alert_id)
    if row is None:
        raise HTTPException(404, f"Alert {alert_id} not found")
    return row


# ---------------------------------------------------------------------------
# Demo replay — zero external calls
# ---------------------------------------------------------------------------

DEMO_ALERTS = [
    {
        "id": 1,
        "source_id": 1,
        "document_id": 1,
        "severity": "critical",
        "source_name": "SEC Enforcement",
        "source_url": "https://www.sec.gov/litigation/litreleases.htm",
        "summary": (
            "The SEC issued Release No. LR-26000 imposing new cybersecurity disclosure "
            "requirements effective Q1. All public companies must disclose material incidents "
            "within 4 business days. Non-compliance may result in penalties up to $100 000/day."
        ),
        "impacted_depts": "Legal, IT Security, Finance, Investor Relations",
        "remediation_steps": (
            "1. Review SEC Release LR-26000 in full\n"
            "2. Assess all recent security incidents for materiality\n"
            "3. Establish a 4-business-day disclosure SOP\n"
            "4. Train IR and Legal teams on new requirements\n"
            "5. Update incident response playbook\n"
            "6. File 8-K for any outstanding material incidents"
        ),
        "created_at": "2026-05-20T09:15:00+00:00",
    },
    {
        "id": 2,
        "source_id": 2,
        "document_id": 2,
        "severity": "high",
        "source_name": "GDPR Enforcement — ICO",
        "source_url": "https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/",
        "summary": (
            "ICO issued updated guidance on AI-generated personal data, clarifying that "
            "synthetic datasets derived from personal data require full GDPR compliance. "
            "Controllers must conduct fresh DPIAs for existing AI training pipelines."
        ),
        "impacted_depts": "Data Protection, AI/ML Engineering, Legal",
        "remediation_steps": (
            "1. Identify all AI models trained on personal data\n"
            "2. Conduct DPIA for each identified pipeline\n"
            "3. Update privacy notices to reflect synthetic data processing\n"
            "4. Appoint or re-confirm DPO engagement\n"
            "5. Document lawful basis for each processing activity"
        ),
        "created_at": "2026-05-22T14:30:00+00:00",
    },
    {
        "id": 3,
        "source_id": 3,
        "document_id": 3,
        "severity": "high",
        "source_name": "FINRA Rule Updates",
        "source_url": "https://www.finra.org/rules-guidance/notices",
        "summary": (
            "FINRA Regulatory Notice 26-08 requires broker-dealers to implement enhanced "
            "supervisory procedures for AI-assisted trading recommendations by September 2026. "
            "Human review must be documented for all AI-flagged trades above $50 000."
        ),
        "impacted_depts": "Trading, Compliance, Technology, Risk Management",
        "remediation_steps": (
            "1. Audit current AI trading advisory tools\n"
            "2. Design supervisory framework for AI recommendations\n"
            "3. Implement logging for all AI-flagged trades above threshold\n"
            "4. Draft and file updated WSP with FINRA by August 1\n"
            "5. Train registered representatives on new supervisory procedures"
        ),
        "created_at": "2026-05-25T11:00:00+00:00",
    },
    {
        "id": 4,
        "source_id": 4,
        "document_id": 4,
        "severity": "medium",
        "source_name": "OSHA Hazard Bulletins",
        "source_url": "https://www.osha.gov/news/newsreleases",
        "summary": (
            "OSHA issued a hazard bulletin updating PPE requirements for chemical handling "
            "in warehouse environments, citing three recent incidents. New eye protection "
            "standards take effect in 120 days."
        ),
        "impacted_depts": "Operations, HR, Health & Safety",
        "remediation_steps": (
            "1. Review updated OSHA PPE standard 29 CFR 1910.133\n"
            "2. Audit current PPE inventory across all warehouse sites\n"
            "3. Order compliant eye protection within 60 days\n"
            "4. Schedule mandatory safety briefing for warehouse staff\n"
            "5. Update hazard communication program"
        ),
        "created_at": "2026-05-26T08:45:00+00:00",
    },
    {
        "id": 5,
        "source_id": 5,
        "document_id": 5,
        "severity": "low",
        "source_name": "FTC Consumer Protection",
        "source_url": "https://www.ftc.gov/news-events/news/press-releases",
        "summary": (
            "FTC released a policy statement clarifying that existing truth-in-advertising "
            "standards apply to AI-generated testimonials and endorsements. No new rules; "
            "existing guides updated with illustrative AI examples."
        ),
        "impacted_depts": "Marketing, Legal",
        "remediation_steps": (
            "1. Review FTC Endorsement Guides AI addendum\n"
            "2. Audit marketing materials using AI-generated content\n"
            "3. Add required disclosures to AI-generated testimonials\n"
            "4. Brief marketing team on updated guidelines"
        ),
        "created_at": "2026-05-28T07:00:00+00:00",
    },
]

DEMO_SOURCES = [
    {"id": 1, "name": "SEC Enforcement", "url": "https://www.sec.gov/litigation/litreleases.htm", "active": True, "scan_interval_hours": 6},
    {"id": 2, "name": "GDPR Enforcement — ICO", "url": "https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/", "active": True, "scan_interval_hours": 12},
    {"id": 3, "name": "FINRA Rule Updates", "url": "https://www.finra.org/rules-guidance/notices", "active": True, "scan_interval_hours": 6},
    {"id": 4, "name": "OSHA Hazard Bulletins", "url": "https://www.osha.gov/news/newsreleases", "active": True, "scan_interval_hours": 24},
    {"id": 5, "name": "FTC Consumer Protection", "url": "https://www.ftc.gov/news-events/news/press-releases", "active": True, "scan_interval_hours": 12},
]


@app.post("/api/v1/demo/replay")
async def demo_replay():
    """Seed the database with demo data and return the full alert set — no external calls."""
    db = get_db()

    if db is not None:
        # Wipe & re-seed sources
        try:
            db.table("alerts").delete().gte("id", 1).execute()
            db.table("documents").delete().gte("id", 1).execute()
            db.table("regulatory_sources").delete().gte("id", 1).execute()
        except Exception as e:
            logger.warning(f"Demo replay cleanup: {e}")

        for src in DEMO_SOURCES:
            try:
                db.table("regulatory_sources").insert({
                    "name": src["name"],
                    "url": src["url"],
                    "active": src["active"],
                    "scan_interval_hours": src["scan_interval_hours"],
                    "last_scan_at": datetime.now(timezone.utc).isoformat(),
                }).execute()
            except Exception:
                pass

        for alert in DEMO_ALERTS:
            try:
                db.table("documents").insert({
                    "source_id": alert["source_id"],
                    "content_hash": hash_content(alert["summary"]),
                    "raw_html": f"<html><body>{alert['summary']}</body></html>",
                    "scraped_at": alert["created_at"],
                }).execute()
            except Exception:
                pass
            try:
                db.table("alerts").insert({
                    "source_id": alert["source_id"],
                    "document_id": alert["document_id"],
                    "severity": alert["severity"],
                    "summary": alert["summary"],
                    "impacted_depts": alert["impacted_depts"],
                    "remediation_steps": alert["remediation_steps"],
                    "created_at": alert["created_at"],
                }).execute()
            except Exception:
                pass

        logger.info("Demo replay: seeded 5 sources and 5 alerts into Supabase")

    return {
        "message": "Demo replay complete — 5 sources and 5 alerts loaded",
        "sources": DEMO_SOURCES,
        "alerts": DEMO_ALERTS,
    }
