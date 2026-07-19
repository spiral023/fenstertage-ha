"""Service-Tests: plan_bridge_day, plan_vacation, remove_vacation, set_budget."""
from __future__ import annotations

from unittest.mock import AsyncMock

import pytest
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.fenstertage.const import (
    DOMAIN,
    SERVICE_PLAN_BRIDGE_DAY,
    SERVICE_PLAN_VACATION,
    SERVICE_REMOVE_VACATION,
    SERVICE_SET_BUDGET,
    SOURCE_BRIDGE_DAY,
)
from tests.conftest import setup_entry


async def _setup(hass, mock_config_entry, freezer) -> None:
    freezer.move_to("2026-07-19")
    await setup_entry(hass, mock_config_entry)


async def test_plan_bridge_day(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    await _setup(hass, mock_config_entry, freezer)
    await hass.services.async_call(
        DOMAIN,
        SERVICE_PLAN_BRIDGE_DAY,
        {
            "config_entry_id": mock_config_entry.entry_id,
            "block_id": "2026-12-28_3d",
        },
        blocking=True,
    )
    items = mock_config_entry.runtime_data.planner.items
    assert len(items) == 1
    assert items[0].source == SOURCE_BRIDGE_DAY
    assert items[0].block_id == "2026-12-28_3d"
    assert len(items[0].vacation_dates) == 3


async def test_plan_bridge_day_unknown_block(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    await _setup(hass, mock_config_entry, freezer)
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            SERVICE_PLAN_BRIDGE_DAY,
            {
                "config_entry_id": mock_config_entry.entry_id,
                "block_id": "1999-01-01_9d",
            },
            blocking=True,
        )


async def test_plan_vacation_excludes_weekend_and_holiday(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    await _setup(hass, mock_config_entry, freezer)
    # Mo 2026-12-21 .. Mo 2026-12-28; 25.12. ist Feiertag, 26.–27. Wochenende.
    await hass.services.async_call(
        DOMAIN,
        SERVICE_PLAN_VACATION,
        {
            "config_entry_id": mock_config_entry.entry_id,
            "start": "2026-12-21",
            "end": "2026-12-28",
        },
        blocking=True,
    )
    items = mock_config_entry.runtime_data.planner.items
    assert len(items) == 1
    # Mo 21., Di 22., Mi 23., Do 24., Mo 28. = 5 Urlaubstage
    assert len(items[0].vacation_dates) == 5


async def test_plan_vacation_year_not_loaded(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    await _setup(hass, mock_config_entry, freezer)
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            SERVICE_PLAN_VACATION,
            {
                "config_entry_id": mock_config_entry.entry_id,
                "start": "2029-08-01",
                "end": "2029-08-05",
            },
            blocking=True,
        )


async def test_remove_vacation(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    await _setup(hass, mock_config_entry, freezer)
    await hass.services.async_call(
        DOMAIN,
        SERVICE_PLAN_VACATION,
        {
            "config_entry_id": mock_config_entry.entry_id,
            "start": "2026-08-03",
            "end": "2026-08-04",
        },
        blocking=True,
    )
    item_id = mock_config_entry.runtime_data.planner.items[0].id
    await hass.services.async_call(
        DOMAIN,
        SERVICE_REMOVE_VACATION,
        {
            "config_entry_id": mock_config_entry.entry_id,
            "item_id": item_id,
        },
        blocking=True,
    )
    assert mock_config_entry.runtime_data.planner.items == []


async def test_set_budget(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    await _setup(hass, mock_config_entry, freezer)
    await hass.services.async_call(
        DOMAIN,
        SERVICE_SET_BUDGET,
        {
            "config_entry_id": mock_config_entry.entry_id,
            "year": 2026,
            "days": 30,
        },
        blocking=True,
    )
    assert mock_config_entry.runtime_data.planner.budget_for(2026) == 30


async def test_unknown_entry_rejected(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    await _setup(hass, mock_config_entry, freezer)
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            DOMAIN,
            SERVICE_SET_BUDGET,
            {"config_entry_id": "nope", "year": 2026, "days": 30},
            blocking=True,
        )


async def test_budget_sensor_updates_after_service(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    from homeassistant.helpers import entity_registry as er

    await _setup(hass, mock_config_entry, freezer)
    entity_id = er.async_get(hass).async_get_entity_id(
        "sensor", DOMAIN, f"{mock_config_entry.entry_id}_vacation_budget"
    )
    assert hass.states.get(entity_id).state == "25"
    await hass.services.async_call(
        DOMAIN,
        SERVICE_PLAN_BRIDGE_DAY,
        {
            "config_entry_id": mock_config_entry.entry_id,
            "block_id": "2026-12-28_3d",
        },
        blocking=True,
    )
    await hass.async_block_till_done()
    assert hass.states.get(entity_id).state == "22"
