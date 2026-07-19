"""Shared factories building api.py dataclasses for tests."""
from __future__ import annotations

import datetime as dt

from custom_components.fenstertage.api import (
    BridgeDayBlock,
    Holiday,
    YearMetrics,
)


def make_holiday(date_str: str, local_name: str = "Feiertag") -> Holiday:
    return Holiday(
        date=dt.date.fromisoformat(date_str),
        local_name=local_name,
        name=local_name,
        types=("Public",),
    )


def make_block(
    first_vacation_date: str,
    vacation_days: int = 1,
    efficiency: float = 4.0,
    level: int = 1,
    free_range: tuple[str, str] | None = None,
    holidays: tuple[Holiday, ...] = (),
) -> BridgeDayBlock:
    start = dt.date.fromisoformat(first_vacation_date)
    dates = tuple(start + dt.timedelta(days=i) for i in range(vacation_days))
    if free_range is None:
        range_start = start - dt.timedelta(days=1)
        range_end = dates[-1] + dt.timedelta(days=1)
    else:
        range_start = dt.date.fromisoformat(free_range[0])
        range_end = dt.date.fromisoformat(free_range[1])
    return BridgeDayBlock(
        block_id=f"{start.isoformat()}_{vacation_days}d",
        level=level,
        vacation_dates=dates,
        vacation_day_weekdays=tuple("?" for _ in dates),
        vacation_days=vacation_days,
        free_days=(range_end - range_start).days + 1,
        free_days_without_weekend=vacation_days + 1,
        efficiency=efficiency,
        free_range_start=range_start,
        free_range_end=range_end,
        holidays=holidays,
    )


def make_metrics(
    year: int,
    blocks: tuple[BridgeDayBlock, ...] = (),
    holidays: tuple[Holiday, ...] = (),
    workdays: int = 250,
    country: str = "AT",
) -> YearMetrics:
    return YearMetrics(
        country=country,
        subdivision=None,
        year=year,
        workdays=workdays,
        weekend_days=104,
        holiday_days=len(holidays),
        holidays=holidays,
        levels={},
        blocks=blocks,
        generated_at="2026-07-19T00:00:00.000Z",
    )
