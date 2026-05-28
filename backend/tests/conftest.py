"""Pytest configuration and shared fixtures for backend tests."""
from __future__ import annotations

import pytest


@pytest.fixture(scope="session")
def anyio_backend():
    """Use asyncio as the anyio backend for async tests."""
    return "asyncio"
