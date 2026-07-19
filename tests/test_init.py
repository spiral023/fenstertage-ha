"""Entry lifecycle tests for the Fenstertage integration."""
from __future__ import annotations

import datetime as dt
from unittest.mock import AsyncMock

from freezegun.api import FrozenDateTimeFactory
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.fenstertage.const import DOMAIN, SOURCE_MANUAL
from tests.conftest import setup_entry


async def test_setup_and_unload(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    """Setting up populates runtime data and unloading succeeds."""
    freezer.move_to("2026-07-19")
    await setup_entry(hass, mock_config_entry)

    assert mock_config_entry.state is ConfigEntryState.LOADED
    assert mock_config_entry.runtime_data.coordinator.data is not None
    assert mock_config_entry.runtime_data.planner is not None

    assert await hass.config_entries.async_unload(mock_config_entry.entry_id)
    await hass.async_block_till_done()
    assert mock_config_entry.state is ConfigEntryState.NOT_LOADED


async def test_device_created(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    """Setting up creates the integration service device."""
    freezer.move_to("2026-07-19")
    await setup_entry(hass, mock_config_entry)

    device = dr.async_get(hass).async_get_device(
        identifiers={(DOMAIN, mock_config_entry.entry_id)}
    )
    assert device is not None
    assert device.manufacturer == "fenstertage.com"
    assert device.entry_type is dr.DeviceEntryType.SERVICE


async def test_remove_entry_deletes_planner_store(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
    hass_storage: dict,
) -> None:
    """Removing an entry deletes its persisted planner data."""
    freezer.move_to("2026-07-19")
    await setup_entry(hass, mock_config_entry)
    planner = mock_config_entry.runtime_data.planner
    await planner.async_add_item(
        start=dt.date(2026, 8, 3),
        end=dt.date(2026, 8, 4),
        holidays=set(),
        source=SOURCE_MANUAL,
    )
    storage_key = f"{DOMAIN}.{mock_config_entry.entry_id}"
    assert storage_key in hass_storage

    await hass.config_entries.async_remove(mock_config_entry.entry_id)
    await hass.async_block_till_done()
    assert storage_key not in hass_storage
