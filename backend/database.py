"""Supabase database client — thin wrapper around supabase-py."""
from __future__ import annotations

import logging
from typing import Any
from supabase import create_client, Client
from config import settings

logger = logging.getLogger(__name__)


def _get_client() -> Client | None:
    if not settings.supabase_url or not settings.supabase_key:
        logger.warning("Supabase credentials not set — DB operations will be no-ops")
        return None
    return create_client(settings.supabase_url, settings.supabase_key)


def get_db() -> Client | None:
    """Return a Supabase client (or None if unconfigured)."""
    return _get_client()


# ---------------------------------------------------------------------------
# Sources
# ---------------------------------------------------------------------------

def db_list_sources(db: Client) -> list[dict]:
    res = db.table("regulatory_sources").select("*").order("created_at", desc=False).execute()
    return res.data or []


def db_get_active_sources(db: Client) -> list[dict]:
    res = db.table("regulatory_sources").select("*").eq("active", True).execute()
    return res.data or []


def db_create_source(db: Client, data: dict) -> dict:
    res = db.table("regulatory_sources").insert(data).execute()
    return res.data[0] if res.data else {}


def db_update_source(db: Client, source_id: int, data: dict) -> dict | None:
    """Update fields in `data` for the given source. Returns the updated row or None if not found."""
    try:
        res = db.table("regulatory_sources").update(data).eq("id", source_id).execute()
        return res.data[0] if res.data else None
    except Exception:
        logger.exception("db_update_source failed for source_id=%s", source_id)
        return None


def db_update_source_scan_time(db: Client, source_id: int, ts: str) -> None:
    db.table("regulatory_sources").update({"last_scan_at": ts}).eq("id", source_id).execute()


def db_get_health_metrics(db: Client) -> dict:
    """Return aggregate health metrics for regulatory sources.

    Returns:
        {"sources": int, "last_scan": str | None}
        where ``last_scan`` is an ISO 8601 UTC string or None when no scan
        has ever been recorded.  Falls back to ``{"sources": 0, "last_scan": None}``
        on any error.

    Uses simple select + Python aggregation to avoid PostgREST aggregate
    restrictions (PGRST123).
    """
    try:
        res = (
            db.table("regulatory_sources")
            .select("id, last_scan_at")
            .execute()
        )
        rows = res.data or []
        count = len(rows)
        # Find the most recent last_scan_at across all sources in Python
        last_scan: str | None = None
        for row in rows:
            ts = row.get("last_scan_at")
            if ts:
                if last_scan is None or ts > last_scan:
                    last_scan = ts
        return {"sources": count, "last_scan": last_scan}
    except Exception:
        logger.exception("db_get_health_metrics failed")
        return {"sources": 0, "last_scan": None}


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

def db_get_latest_document(db: Client, source_id: int) -> dict | None:
    res = (
        db.table("documents")
        .select("*")
        .eq("source_id", source_id)
        .order("scraped_at", desc=True)
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


def db_create_document(db: Client, data: dict) -> dict:
    res = db.table("documents").insert(data).execute()
    return res.data[0] if res.data else {}


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

def db_list_alerts(db: Client, severity: str | None = None, limit: int = 100) -> list[dict]:
    q = (
        db.table("alerts")
        .select("*, regulatory_sources(name, url)")
        .order("created_at", desc=True)
        .limit(limit)
    )
    if severity:
        q = q.eq("severity", severity)
    res = q.execute()
    rows = res.data or []
    # Flatten joined source fields
    for row in rows:
        src = row.pop("regulatory_sources", None) or {}
        row["source_name"] = src.get("name", "")
        row["source_url"] = src.get("url", "")
    return rows


def db_get_alert(db: Client, alert_id: int) -> dict | None:
    res = (
        db.table("alerts")
        .select("*, regulatory_sources(name, url)")
        .eq("id", alert_id)
        .single()
        .execute()
    )
    if not res.data:
        return None
    row = res.data
    src = row.pop("regulatory_sources", None) or {}
    row["source_name"] = src.get("name", "")
    row["source_url"] = src.get("url", "")
    return row


def db_create_alert(db: Client, data: dict) -> dict:
    res = db.table("alerts").insert(data).execute()
    return res.data[0] if res.data else {}
