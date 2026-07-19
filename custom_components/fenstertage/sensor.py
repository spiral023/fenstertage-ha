"""Sensor platform for Fenstertage."""
from __future__ import annotations

import datetime as dt
from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from . import derive
from .api import YearMetrics
from .const import ATTR_CONFIG_ENTRY_ID
from .coordinator import FenstertageConfigEntry, FenstertageCoordinator
from .entity import FenstertageEntity

PARALLEL_UPDATES = 0


async def async_setup_entry(
    hass: HomeAssistant,
    entry: FenstertageConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the five Fenstertage sensors."""
    coordinator = entry.runtime_data.coordinator
    async_add_entities(
        [
            NextBridgeDaySensor(coordinator, entry),
            BestBridgeDaySensor(coordinator, entry),
            WorkdaysRemainingSensor(coordinator, entry),
            HolidaysThisYearSensor(coordinator, entry),
            VacationBudgetSensor(coordinator, entry),
        ]
    )


def _today() -> dt.date:
    return dt_util.now().date()


class NextBridgeDaySensor(FenstertageEntity, SensorEntity):
    """First vacation day of the next upcoming bridge-day block."""

    _attr_device_class = SensorDeviceClass.DATE
    # Karten-Payload — zu groß und zu volatil für den Recorder.
    _unrecorded_attributes = frozenset({"block", "blocks", "years"})

    def __init__(
        self, coordinator: FenstertageCoordinator, entry: FenstertageConfigEntry
    ) -> None:
        super().__init__(coordinator, entry, "next_bridge_day")

    @property
    def native_value(self) -> dt.date | None:
        block = derive.next_block(self.coordinator.data.years, _today())
        return block.vacation_dates[0] if block else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        today = _today()
        years = self.coordinator.data.years
        attrs: dict[str, Any] = {
            ATTR_CONFIG_ENTRY_ID: self._entry.entry_id,
            "blocks": [
                derive.block_as_dict(b)
                for b in derive.upcoming_blocks(years, today)
            ],
            "years": {
                str(year): {
                    "holidays": [
                        {"date": h.date.isoformat(), "local_name": h.local_name}
                        for h in metrics.holidays
                    ],
                    "blocks": [
                        derive.block_as_dict(b) for b in metrics.blocks
                    ],
                }
                for year, metrics in sorted(years.items())
            },
        }
        block = derive.next_block(years, today)
        if block is not None:
            attrs["block"] = derive.block_as_dict(block)
            attrs["days_until"] = (block.vacation_dates[0] - today).days
        return attrs


class BestBridgeDaySensor(FenstertageEntity, SensorEntity):
    """Upcoming block with the best free-days-per-vacation-day ratio."""

    _attr_device_class = SensorDeviceClass.DATE
    _unrecorded_attributes = frozenset({"block"})

    def __init__(
        self, coordinator: FenstertageCoordinator, entry: FenstertageConfigEntry
    ) -> None:
        super().__init__(coordinator, entry, "best_bridge_day")

    @property
    def native_value(self) -> dt.date | None:
        block = derive.best_block(self.coordinator.data.years, _today())
        return block.vacation_dates[0] if block else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        attrs: dict[str, Any] = {ATTR_CONFIG_ENTRY_ID: self._entry.entry_id}
        block = derive.best_block(self.coordinator.data.years, _today())
        if block is not None:
            attrs["block"] = derive.block_as_dict(block)
            attrs["efficiency"] = block.efficiency
        return attrs


class WorkdaysRemainingSensor(FenstertageEntity, SensorEntity):
    """Mon–Fri non-holiday days left in the current year."""

    _attr_native_unit_of_measurement = "d"

    def __init__(
        self, coordinator: FenstertageCoordinator, entry: FenstertageConfigEntry
    ) -> None:
        super().__init__(coordinator, entry, "workdays_remaining")

    def _current_metrics(self) -> YearMetrics | None:
        return self.coordinator.data.years.get(_today().year)

    @property
    def native_value(self) -> int | None:
        metrics = self._current_metrics()
        if metrics is None:
            return None
        return derive.workdays_remaining(metrics, _today())

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        metrics = self._current_metrics()
        if metrics is None:
            return {}
        return {
            "workdays_total": metrics.workdays,
            "weekend_days": metrics.weekend_days,
            "holiday_days": metrics.holiday_days,
        }


class HolidaysThisYearSensor(FenstertageEntity, SensorEntity):
    """Number of public holidays in the current year."""

    _unrecorded_attributes = frozenset({"holidays"})

    def __init__(
        self, coordinator: FenstertageCoordinator, entry: FenstertageConfigEntry
    ) -> None:
        super().__init__(coordinator, entry, "holidays_this_year")

    def _current_metrics(self) -> YearMetrics | None:
        return self.coordinator.data.years.get(_today().year)

    @property
    def native_value(self) -> int | None:
        metrics = self._current_metrics()
        return len(metrics.holidays) if metrics else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        metrics = self._current_metrics()
        if metrics is None:
            return {}
        attrs: dict[str, Any] = {
            "holidays": [
                {"date": h.date.isoformat(), "local_name": h.local_name}
                for h in metrics.holidays
            ],
        }
        today = _today()
        upcoming = [h for h in metrics.holidays if h.date >= today]
        if upcoming:
            nxt = min(upcoming, key=lambda h: h.date)
            attrs["next_holiday"] = nxt.local_name
            attrs["next_holiday_date"] = nxt.date.isoformat()
        return attrs


class VacationBudgetSensor(FenstertageEntity, SensorEntity):
    """Remaining vacation budget for the current year (can go negative)."""

    _attr_native_unit_of_measurement = "d"
    _unrecorded_attributes = frozenset({"planned_items", "budgets"})

    def __init__(
        self, coordinator: FenstertageCoordinator, entry: FenstertageConfigEntry
    ) -> None:
        super().__init__(coordinator, entry, "vacation_budget")

    @property
    def native_value(self) -> int:
        planner = self._entry.runtime_data.planner
        year = _today().year
        return planner.budget_for(year) - planner.planned_days_for(year)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        planner = self._entry.runtime_data.planner
        return {
            ATTR_CONFIG_ENTRY_ID: self._entry.entry_id,
            **planner.as_attributes(_today().year),
        }
