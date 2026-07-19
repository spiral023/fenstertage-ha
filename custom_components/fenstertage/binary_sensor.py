"""Binary sensor platform for Fenstertage."""
from __future__ import annotations

import datetime as dt
from typing import Any

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from . import derive
from .api import BridgeDayBlock, Holiday
from .coordinator import FenstertageConfigEntry, FenstertageCoordinator
from .entity import FenstertageEntity

PARALLEL_UPDATES = 0


async def async_setup_entry(
    hass: HomeAssistant,
    entry: FenstertageConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the Fenstertage binary sensors."""
    coordinator = entry.runtime_data.coordinator
    async_add_entities(
        [
            HolidayTodayBinarySensor(coordinator, entry),
            BridgeDayTodayBinarySensor(coordinator, entry),
        ]
    )


def _today() -> dt.date:
    return dt_util.now().date()


class HolidayTodayBinarySensor(FenstertageEntity, BinarySensorEntity):
    """On when today is a public holiday."""

    def __init__(
        self, coordinator: FenstertageCoordinator, entry: FenstertageConfigEntry
    ) -> None:
        super().__init__(coordinator, entry, "holiday_today")

    def _holiday(self) -> Holiday | None:
        today = _today()
        metrics = self.coordinator.data.years.get(today.year)
        if metrics is None:
            return None
        return derive.holiday_on(metrics, today)

    @property
    def is_on(self) -> bool:
        return self._holiday() is not None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        holiday = self._holiday()
        if holiday is None:
            return {}
        return {"holiday_name": holiday.local_name}


class BridgeDayTodayBinarySensor(FenstertageEntity, BinarySensorEntity):
    """On when today falls inside any block's free range."""

    _unrecorded_attributes = frozenset({"block"})

    def __init__(
        self, coordinator: FenstertageCoordinator, entry: FenstertageConfigEntry
    ) -> None:
        super().__init__(coordinator, entry, "bridge_day_today")

    def _block(self) -> BridgeDayBlock | None:
        return derive.block_covering(self.coordinator.data.years, _today())

    @property
    def is_on(self) -> bool:
        return self._block() is not None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        block = self._block()
        if block is None:
            return {}
        return {"block": derive.block_as_dict(block)}
