"""Unit tests for FastAPI backend endpoints.

Tests use httpx.AsyncClient with the FastAPI app and unittest.mock.patch
to isolate database calls — no real Supabase connection required.
"""
from __future__ import annotations

import sys
import os
from unittest.mock import MagicMock, patch

import httpx
import pytest
import pytest_asyncio

# ---------------------------------------------------------------------------
# Make sure the backend package is importable when running from the tests dir
# ---------------------------------------------------------------------------
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from main import app  # noqa: E402  (import after sys.path manipulation)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mock_db() -> MagicMock:
    """Return a non-None mock Supabase client."""
    return MagicMock()


# ---------------------------------------------------------------------------
# Test 1 — GET /health — DB reachable
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_health_ok():
    """Health endpoint returns HTTP 200 with all 4 required fields when DB is reachable."""
    mock_metrics = {"sources": 5, "last_scan": "2026-05-28T09:15:00+00:00"}

    with (
        patch("main.get_db", return_value=_mock_db()),
        patch("main.db_get_health_metrics", return_value=mock_metrics),
    ):
        async with httpx.AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["sources"] == 5
    assert body["last_scan"] is not None
    assert "version" in body


# ---------------------------------------------------------------------------
# Test 2 — GET /health — DB returns None (unconfigured)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_health_db_fallback():
    """Health endpoint returns HTTP 200 with fallback values when DB is None."""
    with patch("main.get_db", return_value=None):
        async with httpx.AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["sources"] == 0
    assert body["last_scan"] is None


# ---------------------------------------------------------------------------
# Test 3 — PATCH /api/v1/sources/{id} — active set to False
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_patch_source_active_false():
    """PATCH source with active=false returns HTTP 200 and updated row with active=False."""
    updated_row = {
        "id": 1,
        "name": "Test",
        "active": False,
        "url": "http://test.com",
        "scan_interval_hours": 6,
    }

    with (
        patch("main.get_db", return_value=_mock_db()),
        patch("main.db_update_source", return_value=updated_row),
    ):
        async with httpx.AsyncClient(app=app, base_url="http://test") as client:
            response = await client.patch(
                "/api/v1/sources/1",
                json={"active": False},
            )

    assert response.status_code == 200
    body = response.json()
    assert body["active"] is False


# ---------------------------------------------------------------------------
# Test 4 — PATCH /api/v1/sources/{id} — source not found
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_patch_source_not_found():
    """PATCH a non-existent source returns HTTP 404."""
    with (
        patch("main.get_db", return_value=_mock_db()),
        patch("main.db_update_source", return_value=None),
    ):
        async with httpx.AsyncClient(app=app, base_url="http://test") as client:
            response = await client.patch(
                "/api/v1/sources/9999",
                json={"active": True},
            )

    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Test 5 — PATCH /api/v1/sources/{id} — DB not configured
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_patch_source_db_unconfigured():
    """PATCH source returns HTTP 503 when the database is not configured."""
    with patch("main.get_db", return_value=None):
        async with httpx.AsyncClient(app=app, base_url="http://test") as client:
            response = await client.patch(
                "/api/v1/sources/1",
                json={"active": True},
            )

    assert response.status_code == 503
