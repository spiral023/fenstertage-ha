"""Persistent vacation planning — one HA Store per config entry.

Items are always date ranges; bridge-day blocks and free ranges share
the same schema (source + optional block_id tell them apart). The
server computes the actual vacation days (weekends and public holidays
removed) — only those count against the yearly budget. Over-booking is
allowed and merely surfaces as a negative remaining budget.
"""
from __future__ import annotations

import datetime as dt
import uuid
from dataclasses import dataclass
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import (
    DOMAIN,
    MAX_VACATION_RANGE_DAYS,
    SOURCE_MANUAL,
    STORAGE_VERSION,
)


def compute_vacation_dates(
    start: dt.date, end: dt.date, holidays: set[dt.date]
) -> tuple[dt.date, ...]:
    """All Mon–Fri days in [start, end] that are not public holidays."""
    out: list[dt.date] = []
    day = start
    while day <= end:
        if day.weekday() < 5 and day not in holidays:
            out.append(day)
        day += dt.timedelta(days=1)
    return tuple(out)


@dataclass(frozen=True)
class PlannedItem:
    """One planned vacation range."""

    id: str
    start: dt.date
    end: dt.date
    vacation_dates: tuple[dt.date, ...]
    source: str
    block_id: str | None
    created_at: str

    def as_dict(self) -> dict[str, Any]:
        """JSON-serialisable representation (Store + sensor attributes)."""
        return {
            "id": self.id,
            "start": self.start.isoformat(),
            "end": self.end.isoformat(),
            "vacation_dates": [d.isoformat() for d in self.vacation_dates],
            "source": self.source,
            "block_id": self.block_id,
            "created_at": self.created_at,
        }


def _item_from_dict(raw: Any) -> PlannedItem | None:
    """Parse one persisted item; None for malformed rows (skip, don't crash)."""
    if not isinstance(raw, dict):
        return None
    try:
        return PlannedItem(
            id=str(raw["id"]),
            start=dt.date.fromisoformat(raw["start"]),
            end=dt.date.fromisoformat(raw["end"]),
            vacation_dates=tuple(
                dt.date.fromisoformat(d) for d in raw["vacation_dates"]
            ),
            source=str(raw.get("source") or SOURCE_MANUAL),
            block_id=raw.get("block_id") or None,
            created_at=str(raw.get("created_at") or ""),
        )
    except (KeyError, TypeError, ValueError):
        return None


class PlannerStore:
    """Vacation plans + per-year budgets, persisted via HA Store."""

    def __init__(
        self, hass: HomeAssistant, entry_id: str, default_budget: int
    ) -> None:
        self._store: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, f"{DOMAIN}.{entry_id}"
        )
        self._default_budget = default_budget
        self._budgets: dict[int, int] = {}
        self._items: list[PlannedItem] = []

    async def async_load(self) -> None:
        """Load persisted state; malformed rows are skipped."""
        raw = await self._store.async_load()
        if not isinstance(raw, dict):
            return
        budgets_raw = raw.get("budgets")
        if isinstance(budgets_raw, dict):
            for key, value in budgets_raw.items():
                try:
                    self._budgets[int(key)] = int(value)
                except (TypeError, ValueError):
                    continue
        items_raw = raw.get("items")
        if isinstance(items_raw, list):
            self._items = [
                item
                for item in (_item_from_dict(r) for r in items_raw)
                if item is not None
            ]
            self._items.sort(key=lambda i: i.start)

    async def _async_save(self) -> None:
        await self._store.async_save(
            {
                "budgets": {str(y): d for y, d in self._budgets.items()},
                "items": [item.as_dict() for item in self._items],
            }
        )

    async def async_remove(self) -> None:
        """Delete the backing store file (entry removal)."""
        await self._store.async_remove()

    @property
    def items(self) -> list[PlannedItem]:
        """Copy of all planned items, sorted by start date."""
        return list(self._items)

    def budget_for(self, year: int) -> int:
        """Budget for a year — explicit override or the options default."""
        return self._budgets.get(year, self._default_budget)

    def planned_days_for(self, year: int) -> int:
        """Vacation days already planned inside one calendar year."""
        return sum(
            1
            for item in self._items
            for day in item.vacation_dates
            if day.year == year
        )

    def _check_overlap(self, start: dt.date, end: dt.date) -> None:
        for item in self._items:
            if start <= item.end and end >= item.start:
                raise ServiceValidationError(
                    translation_domain=DOMAIN,
                    translation_key="overlapping_vacation",
                    translation_placeholders={
                        "start": item.start.isoformat(),
                        "end": item.end.isoformat(),
                    },
                )

    async def async_add_item(
        self,
        *,
        start: dt.date,
        end: dt.date,
        holidays: set[dt.date],
        source: str,
        block_id: str | None = None,
        vacation_dates: tuple[dt.date, ...] | None = None,
    ) -> PlannedItem:
        """Validate + persist one new range. Raises ServiceValidationError."""
        if end < start:
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="invalid_range",
            )
        if (end - start).days + 1 > MAX_VACATION_RANGE_DAYS:
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="range_too_long",
                translation_placeholders={
                    "max_days": str(MAX_VACATION_RANGE_DAYS)
                },
            )
        self._check_overlap(start, end)
        dates = (
            tuple(vacation_dates)
            if vacation_dates
            else compute_vacation_dates(start, end, holidays)
        )
        if not dates:
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="no_vacation_days",
            )
        item = PlannedItem(
            id=uuid.uuid4().hex[:8],
            start=start,
            end=end,
            vacation_dates=dates,
            source=source,
            block_id=block_id,
            created_at=dt_util.utcnow().isoformat(),
        )
        self._items.append(item)
        self._items.sort(key=lambda i: i.start)
        await self._async_save()
        return item

    async def async_remove_item(self, item_id: str) -> None:
        """Delete one planned item by id."""
        for index, item in enumerate(self._items):
            if item.id == item_id:
                del self._items[index]
                await self._async_save()
                return
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="unknown_item",
            translation_placeholders={"item_id": item_id},
        )

    async def async_set_budget(self, year: int, days: int) -> None:
        """Set the explicit budget for one year."""
        self._budgets[year] = days
        await self._async_save()

    def as_attributes(self, year: int) -> dict[str, Any]:
        """Attribute payload for the vacation_budget sensor."""
        budgets = {str(y): d for y, d in self._budgets.items()}
        budgets.setdefault(str(year), self.budget_for(year))
        return {
            "budget_total": self.budget_for(year),
            "planned_days": self.planned_days_for(year),
            "planned_items": [item.as_dict() for item in self._items],
            "budgets": budgets,
        }
