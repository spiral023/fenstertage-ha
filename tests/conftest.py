"""Shared pytest fixtures for the Fenstertage tests."""
from __future__ import annotations

from collections.abc import Generator
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.fenstertage.api import YearMetrics
from custom_components.fenstertage.const import (
    CONF_COUNTRY,
    CONF_SUBDIVISION,
    DOMAIN,
)
from tests.common import make_block, make_holiday, make_metrics


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations: None) -> None:
    """Enable loading custom integrations in all tests."""


def default_metrics(year: int) -> YearMetrics:
    """Return deterministic metrics for a requested year."""
    if year == 2026:
        return make_metrics(
            2026,
            blocks=(
                make_block("2026-05-15", efficiency=4.0),
                make_block(
                    "2026-12-28", vacation_days=3, efficiency=2.67, level=3
                ),
            ),
            holidays=(
                make_holiday("2026-05-14", "Christi Himmelfahrt"),
                make_holiday("2026-12-25", "Weihnachten"),
            ),
        )
    return make_metrics(
        year,
        blocks=(make_block(f"{year}-05-03", efficiency=3.0),),
        holidays=(make_holiday(f"{year}-05-01", "Staatsfeiertag"),),
    )


@pytest.fixture
def mock_api() -> Generator[AsyncMock]:
    """Patch the API client used by the coordinator."""

    async def _get(
        country: str,
        year: int,
        subdivision: str | None = None,
        max_level: int = 5,
    ) -> YearMetrics:
        return default_metrics(year)

    with patch(
        "custom_components.fenstertage.coordinator."
        "FenstertageApiClient.async_get_metrics",
        side_effect=_get,
    ) as mock:
        yield mock


@pytest.fixture
def mock_metrics() -> YearMetrics:
    """Return the standard 2026 fixture payload."""
    return default_metrics(2026)


@pytest.fixture
def mock_config_entry() -> MockConfigEntry:
    """Return an Austrian entry without a subdivision."""
    return MockConfigEntry(
        domain=DOMAIN,
        title="Fenstertage AT",
        data={CONF_COUNTRY: "AT", CONF_SUBDIVISION: None},
        options={},
        unique_id="AT_none",
        entry_id="test_entry_at",
    )


async def setup_entry(hass: Any, entry: MockConfigEntry) -> None:
    """Add and fully set up a config entry."""
    if hass.config_entries.async_get_entry(entry.entry_id) is None:
        entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
