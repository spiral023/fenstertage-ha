"""Fenstertage integration for Home Assistant (fenstertage.com)."""
from __future__ import annotations

from typing import Any

from homeassistant.const import EVENT_HOMEASSISTANT_STARTED, Platform
from homeassistant.core import CoreState, Event, HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.event import async_track_time_change

from .card_registration import JSModuleRegistration
from .const import CONF_VACATION_BUDGET, DEFAULT_VACATION_BUDGET, DOMAIN
from .coordinator import (
    FenstertageConfigEntry,
    FenstertageCoordinator,
    FenstertageRuntimeData,
)
from .planner import PlannerStore
from .services import async_setup_services

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

PLATFORMS: list[Platform] = [Platform.BINARY_SENSOR, Platform.SENSOR]


async def async_setup(hass: HomeAssistant, config: dict[str, Any]) -> bool:
    """Domain-level setup: Services + Card-Registrierung (einmal pro Prozess)."""
    async_setup_services(hass)

    registration = JSModuleRegistration(hass)

    async def _register_card(_event: Event | None = None) -> None:
        await registration.async_register()

    if hass.state == CoreState.running:
        await _register_card()
    else:
        hass.bus.async_listen_once(
            EVENT_HOMEASSISTANT_STARTED, _register_card
        )

    return True


async def async_setup_entry(
    hass: HomeAssistant, entry: FenstertageConfigEntry
) -> bool:
    """Set up one country or region config entry."""
    coordinator = FenstertageCoordinator(hass, entry)
    await coordinator.async_config_entry_first_refresh()

    config = {**entry.data, **entry.options}
    planner = PlannerStore(
        hass,
        entry.entry_id,
        default_budget=int(
            config.get(CONF_VACATION_BUDGET, DEFAULT_VACATION_BUDGET)
        ),
    )
    await planner.async_load()

    entry.runtime_data = FenstertageRuntimeData(
        coordinator=coordinator,
        planner=planner,
    )

    dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id,
        identifiers={(DOMAIN, entry.entry_id)},
        name=entry.title,
        manufacturer="fenstertage.com",
        entry_type=dr.DeviceEntryType.SERVICE,
        configuration_url="https://fenstertage.com",
    )

    @callback
    def _midnight_tick(_now: Any) -> None:
        """Notify derived entities at the local day boundary."""
        coordinator.async_update_listeners()

    entry.async_on_unload(
        async_track_time_change(
            hass,
            _midnight_tick,
            hour=0,
            minute=0,
            second=5,
        )
    )
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_reload_entry))
    return True


async def _async_reload_entry(
    hass: HomeAssistant, entry: FenstertageConfigEntry
) -> None:
    """Reload an entry after its options change."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(
    hass: HomeAssistant, entry: FenstertageConfigEntry
) -> bool:
    """Unload a config entry and its configured platforms."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def async_remove_entry(
    hass: HomeAssistant, entry: FenstertageConfigEntry
) -> None:
    """Drop the planner store; unregister the card with the last entry."""
    planner = PlannerStore(
        hass,
        entry.entry_id,
        default_budget=DEFAULT_VACATION_BUDGET,
    )
    await planner.async_remove()

    remaining = [
        e
        for e in hass.config_entries.async_entries(DOMAIN)
        if e.entry_id != entry.entry_id
    ]
    if not remaining:
        await JSModuleRegistration(hass).async_unregister()
