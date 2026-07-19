"""Pure derivations over YearMetrics — no Home Assistant imports.

Everything here is deterministic in (data, today) so the sensors stay
trivially thin and the midnight re-render needs no API call.
"""
from __future__ import annotations

import datetime as dt
from typing import Any

from .api import BridgeDayBlock, Holiday, YearMetrics


def _block_sort_key(
    block: BridgeDayBlock,
) -> tuple[
    dt.date,
    str,
    int,
    dt.date,
    dt.date,
    tuple[dt.date, ...],
    tuple[str, ...],
    int,
    int,
    int,
    float,
    tuple[tuple[dt.date, str, str, tuple[str, ...]], ...],
]:
    """Stable canonical ordering for potentially duplicated API blocks."""
    return (
        block.vacation_dates[0] if block.vacation_dates else dt.date.min,
        block.block_id,
        block.level,
        block.free_range_start,
        block.free_range_end,
        block.vacation_dates,
        block.vacation_day_weekdays,
        block.vacation_days,
        block.free_days,
        block.free_days_without_weekend,
        block.efficiency,
        tuple(
            (holiday.date, holiday.local_name, holiday.name, holiday.types)
            for holiday in block.holidays
        ),
    )


def upcoming_blocks(
    years: dict[int, YearMetrics], today: dt.date
) -> list[BridgeDayBlock]:
    """All blocks whose first vacation day is today or later, date-sorted."""
    blocks = [
        block
        for metrics in years.values()
        for block in metrics.blocks
        if block.vacation_dates and block.vacation_dates[0] >= today
    ]
    return sorted(blocks, key=_block_sort_key)


def next_block(
    years: dict[int, YearMetrics], today: dt.date
) -> BridgeDayBlock | None:
    """The next upcoming block, or None."""
    blocks = upcoming_blocks(years, today)
    return blocks[0] if blocks else None


def best_block(
    years: dict[int, YearMetrics], today: dt.date
) -> BridgeDayBlock | None:
    """Upcoming block with the highest efficiency; earlier date wins ties."""
    blocks = upcoming_blocks(years, today)
    if not blocks:
        return None
    return min(
        blocks,
        key=lambda block: (-block.efficiency, _block_sort_key(block)),
    )


def workdays_remaining(metrics: YearMetrics, today: dt.date) -> int:
    """Mon–Fri non-holiday days from today (inclusive) to Dec 31."""
    holidays = {holiday.date for holiday in metrics.holidays}
    end = dt.date(metrics.year, 12, 31)
    day = max(today, dt.date(metrics.year, 1, 1))
    count = 0
    while day <= end:
        if day.weekday() < 5 and day not in holidays:
            count += 1
        day += dt.timedelta(days=1)
    return count


def holiday_on(metrics: YearMetrics, day: dt.date) -> Holiday | None:
    """The holiday falling on `day`, or None."""
    for holiday in metrics.holidays:
        if holiday.date == day:
            return holiday
    return None


def block_covering(
    years: dict[int, YearMetrics], day: dt.date
) -> BridgeDayBlock | None:
    """The block whose free range contains `day`, or None."""
    blocks = [
        block
        for metrics in years.values()
        for block in metrics.blocks
        if block.free_range_start <= day <= block.free_range_end
    ]
    return min(blocks, key=_block_sort_key) if blocks else None


def holidays_in_years(years: dict[int, YearMetrics]) -> set[dt.date]:
    """Union of all holiday dates across the loaded years."""
    return {holiday.date for metrics in years.values() for holiday in metrics.holidays}


def block_as_dict(block: BridgeDayBlock) -> dict[str, Any]:
    """JSON-serialisable block representation (attributes + card)."""
    return {
        "block_id": block.block_id,
        "level": block.level,
        "vacation_dates": [day.isoformat() for day in block.vacation_dates],
        "vacation_day_weekdays": list(block.vacation_day_weekdays),
        "vacation_days": block.vacation_days,
        "free_days": block.free_days,
        "free_days_without_weekend": block.free_days_without_weekend,
        "efficiency": block.efficiency,
        "free_range_start": block.free_range_start.isoformat(),
        "free_range_end": block.free_range_end.isoformat(),
        "holidays": [
            {
                "date": holiday.date.isoformat(),
                "local_name": holiday.local_name,
                "name": holiday.name,
            }
            for holiday in block.holidays
        ],
    }
