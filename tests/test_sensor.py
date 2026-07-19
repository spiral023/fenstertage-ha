"""Sensor-Plattform-Tests."""
from __future__ import annotations

import datetime as dt
from unittest.mock import AsyncMock

from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.fenstertage.const import DOMAIN, SOURCE_MANUAL
from tests.conftest import setup_entry


def _state(hass: HomeAssistant, entry: MockConfigEntry, key: str):
    entity_id = er.async_get(hass).async_get_entity_id(
        "sensor", DOMAIN, f"{entry.entry_id}_{key}"
    )
    assert entity_id is not None, f"sensor {key} nicht registriert"
    return hass.states.get(entity_id)


async def test_next_bridge_day(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to("2026-07-19 12:00:00")
    await setup_entry(hass, mock_config_entry)
    state = _state(hass, mock_config_entry, "next_bridge_day")
    # Kommende Blöcke ab 2026-07-19: 2026-12-28 (3d) und 2027-05-03.
    assert state.state == "2026-12-28"
    assert state.attributes["days_until"] == 162
    assert state.attributes["block"]["block_id"] == "2026-12-28_3d"
    assert [b["block_id"] for b in state.attributes["blocks"]] == [
        "2026-12-28_3d",
        "2027-05-03_1d",
    ]
    assert state.attributes["config_entry_id"] == mock_config_entry.entry_id
    # years-Attribut enthält beide Jahre mit Feiertagen + allen Blöcken:
    years = state.attributes["years"]
    assert set(years) == {"2026", "2027"}
    assert years["2026"]["holidays"][0]["date"] == "2026-05-14"
    assert len(years["2026"]["blocks"]) == 2  # inkl. vergangener Block


async def test_best_bridge_day_prefers_efficiency(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to("2026-07-19 12:00:00")
    await setup_entry(hass, mock_config_entry)
    state = _state(hass, mock_config_entry, "best_bridge_day")
    # 2027-05-03 hat efficiency 3.0 > 2.67 des Dezember-Blocks.
    assert state.state == "2027-05-03"
    assert state.attributes["block"]["efficiency"] == 3.0


async def test_workdays_remaining(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    # Mo 2026-12-28: verbleibende Werktage Mo–Do 28.–31.12. = 4
    freezer.move_to("2026-12-28 12:00:00")
    await setup_entry(hass, mock_config_entry)
    state = _state(hass, mock_config_entry, "workdays_remaining")
    assert state.state == "4"
    assert state.attributes["workdays_total"] == 250


async def test_holidays_this_year(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to("2026-07-19 12:00:00")
    await setup_entry(hass, mock_config_entry)
    state = _state(hass, mock_config_entry, "holidays_this_year")
    assert state.state == "2"
    assert state.attributes["next_holiday"] == "Weihnachten"
    assert state.attributes["next_holiday_date"] == "2026-12-25"
    assert len(state.attributes["holidays"]) == 2


async def test_vacation_budget_reacts_to_planner(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to("2026-07-19 12:00:00")
    await setup_entry(hass, mock_config_entry)
    state = _state(hass, mock_config_entry, "vacation_budget")
    assert state.state == "25"
    assert state.attributes["budget_total"] == 25
    assert state.attributes["planned_days"] == 0

    runtime = mock_config_entry.runtime_data
    await runtime.planner.async_add_item(
        start=dt.date(2026, 8, 3),
        end=dt.date(2026, 8, 7),
        holidays=set(),
        source=SOURCE_MANUAL,
    )
    runtime.coordinator.async_update_listeners()
    await hass.async_block_till_done()

    state = _state(hass, mock_config_entry, "vacation_budget")
    assert state.state == "20"
    assert state.attributes["planned_days"] == 5
    assert len(state.attributes["planned_items"]) == 1
