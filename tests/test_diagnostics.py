"""Diagnostics-Test."""
from __future__ import annotations

from unittest.mock import AsyncMock

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.components.diagnostics import (
    get_diagnostics_for_config_entry,
)
from pytest_homeassistant_custom_component.typing import ClientSessionGenerator

from tests.conftest import setup_entry


# Freeze via marker (not freezer.move_to in the test body): the access
# token used by hass_client is minted during fixture setup, before the
# test body runs. Moving the clock backward afterwards (move_to jumps to
# local midnight) leaves that token "issued in the future" and HA's auth
# middleware rejects it with 401. The marker freezes time from the start,
# so token creation and the frozen "today" agree.
@pytest.mark.freeze_time("2026-07-19")
async def test_diagnostics(
    hass: HomeAssistant,
    hass_client: ClientSessionGenerator,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
) -> None:
    assert await async_setup_component(hass, "diagnostics", {})
    await setup_entry(hass, mock_config_entry)
    diagnostics = await get_diagnostics_for_config_entry(
        hass, hass_client, mock_config_entry
    )
    assert diagnostics["entry"]["data"]["country"] == "AT"
    assert diagnostics["years"]["2026"]["holiday_count"] == 2
    assert diagnostics["years"]["2026"]["block_count"] == 2
    assert diagnostics["planner"]["budget_total"] == 25
