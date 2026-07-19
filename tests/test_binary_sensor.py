"""Binary-Sensor-Tests."""
from __future__ import annotations

from unittest.mock import AsyncMock

from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.fenstertage.const import DOMAIN
from tests.conftest import setup_entry


def _state(hass: HomeAssistant, entry: MockConfigEntry, key: str):
    entity_id = er.async_get(hass).async_get_entity_id(
        "binary_sensor", DOMAIN, f"{entry.entry_id}_{key}"
    )
    assert entity_id is not None, f"binary_sensor {key} nicht registriert"
    return hass.states.get(entity_id)


async def test_holiday_today_on(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to("2026-12-25 12:00:00")
    await setup_entry(hass, mock_config_entry)
    state = _state(hass, mock_config_entry, "holiday_today")
    assert state.state == "on"
    assert state.attributes["holiday_name"] == "Weihnachten"


async def test_holiday_today_off(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to("2026-07-19 12:00:00")
    await setup_entry(hass, mock_config_entry)
    assert _state(hass, mock_config_entry, "holiday_today").state == "off"


async def test_bridge_day_today_on_inside_free_range(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    # Dezember-Block: vacation 2026-12-28..30, free_range 2026-12-27..31.
    freezer.move_to("2026-12-29 12:00:00")
    await setup_entry(hass, mock_config_entry)
    state = _state(hass, mock_config_entry, "bridge_day_today")
    assert state.state == "on"
    assert state.attributes["block"]["block_id"] == "2026-12-28_3d"


async def test_bridge_day_today_off(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to("2026-07-19 12:00:00")
    await setup_entry(hass, mock_config_entry)
    assert _state(hass, mock_config_entry, "bridge_day_today").state == "off"
