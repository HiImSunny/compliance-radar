from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional


class RegulatorySource(BaseModel):
    id: Optional[int] = None
    name: str
    url: str
    active: bool = True
    scan_interval_hours: int = 6
    last_scan_at: Optional[datetime] = None
    created_at: datetime = datetime.now(timezone.utc)


class Document(BaseModel):
    id: Optional[int] = None
    source_id: int
    content_hash: str
    raw_html: str
    scraped_at: datetime = datetime.now(timezone.utc)


class Alert(BaseModel):
    id: Optional[int] = None
    source_id: int
    document_id: int
    severity: str  # critical, high, medium, low
    summary: str
    impacted_depts: str
    remediation_steps: str
    created_at: datetime = datetime.now(timezone.utc)
