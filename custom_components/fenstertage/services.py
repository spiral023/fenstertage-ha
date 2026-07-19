"""Domain services: plan/remove vacations, set budgets.

Registered once in async_setup (domain level). The target entry is
addressed via config_entry_id so automations and the Lovelace card use
the exact same write path.
"""
from __future__ import annotations

import datetime as dt

import voluptuous as vol
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv

from .const import (
    ATTR_BLOCK_ID,
    ATTR_CONFIG_ENTRY_ID,
    ATTR_DAYS,
    ATTR_END,
    ATTR_ITEM_ID,
    ATTR_START,
    ATTR_YEAR,
    DOMAIN,
    MAX_VACATION_BUDGET,
    SERVICE_PLAN_BRIDGE_DAY,
    SERVICE_PLAN_VACATION,
    SERVICE_REMOVE_VACATION,
    SERVICE_SET_BUDGET,
    SOURCE_BRIDGE_DAY,
    SOURCE_MANUAL,
)
from .coordinator import FenstertageRuntimeData
from .derive import holidays_in_years

_ENTRY_FIELD = {vol.Required(ATTR_CONFIG_ENTRY_ID): cv.string}

PLAN_BRIDGE_DAY_SCHEMA = vol.Schema(
    {**_ENTRY_FIELD, vol.Required(ATTR_BLOCK_ID): cv.string}
)
PLAN_VACATION_SCHEMA = vol.Schema(
    {
        **_ENTRY_FIELD,
        vol.Required(ATTR_START): cv.date,
        vol.Required(ATTR_END): cv.date,
    }
)
REMOVE_VACATION_SCHEMA = vol.Schema(
    {**_ENTRY_FIELD, vol.Required(ATTR_ITEM_ID): cv.string}
)
SET_BUDGET_SCHEMA = vol.Schema(
    {
        **_ENTRY_FIELD,
        vol.Required(ATTR_YEAR): vol.All(
            vol.Coerce(int), vol.Range(min=1970, max=2100)
        ),
        vol.Required(ATTR_DAYS): vol.All(
            vol.Coerce(int), vol.Range(min=0, max=MAX_VACATION_BUDGET)
        ),
    }
)


def _get_runtime(hass: HomeAssistant, call: ServiceCall) -> FenstertageRuntimeData:
    entry_id = str(call.data[ATTR_CONFIG_ENTRY_ID])
    entry = hass.config_entries.async_get_entry(entry_id)
    if (
        entry is None
        or entry.domain != DOMAIN
        or entry.state is not ConfigEntryState.LOADED
    ):
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="unknown_entry",
            translation_placeholders={"entry_id": entry_id},
        )
    runtime: FenstertageRuntimeData = entry.runtime_data
    return runtime


def async_setup_services(hass: HomeAssistant) -> None:
    """Register the four domain services."""

    async def _plan_bridge_day(call: ServiceCall) -> None:
        runtime = _get_runtime(hass, call)
        block_id = str(call.data[ATTR_BLOCK_ID])
        years = runtime.coordinator.data.years
        block = next(
            (
                b
                for metrics in years.values()
                for b in metrics.blocks
                if b.block_id == block_id
            ),
            None,
        )
        if block is None:
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="unknown_block",
                translation_placeholders={"block_id": block_id},
            )
        await runtime.planner.async_add_item(
            start=block.vacation_dates[0],
            end=block.vacation_dates[-1],
            holidays=holidays_in_years(years),
            source=SOURCE_BRIDGE_DAY,
            block_id=block_id,
            vacation_dates=block.vacation_dates,
        )
        runtime.coordinator.async_update_listeners()

    async def _plan_vacation(call: ServiceCall) -> None:
        runtime = _get_runtime(hass, call)
        start: dt.date = call.data[ATTR_START]
        end: dt.date = call.data[ATTR_END]
        years = runtime.coordinator.data.years
        # Feiertage müssen für jedes berührte Jahr bekannt sein — sonst
        # würden Urlaubstage falsch gezählt. Bewusst ablehnen statt raten.
        for year in range(start.year, end.year + 1):
            if year not in years:
                raise ServiceValidationError(
                    translation_domain=DOMAIN,
                    translation_key="year_not_loaded",
                    translation_placeholders={"year": str(year)},
                )
        await runtime.planner.async_add_item(
            start=start,
            end=end,
            holidays=holidays_in_years(years),
            source=SOURCE_MANUAL,
        )
        runtime.coordinator.async_update_listeners()

    async def _remove_vacation(call: ServiceCall) -> None:
        runtime = _get_runtime(hass, call)
        await runtime.planner.async_remove_item(str(call.data[ATTR_ITEM_ID]))
        runtime.coordinator.async_update_listeners()

    async def _set_budget(call: ServiceCall) -> None:
        runtime = _get_runtime(hass, call)
        await runtime.planner.async_set_budget(
            int(call.data[ATTR_YEAR]), int(call.data[ATTR_DAYS])
        )
        runtime.coordinator.async_update_listeners()

    hass.services.async_register(
        DOMAIN, SERVICE_PLAN_BRIDGE_DAY, _plan_bridge_day, PLAN_BRIDGE_DAY_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_PLAN_VACATION, _plan_vacation, PLAN_VACATION_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_REMOVE_VACATION, _remove_vacation, REMOVE_VACATION_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_SET_BUDGET, _set_budget, SET_BUDGET_SCHEMA
    )
