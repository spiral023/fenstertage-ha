"""Async client for the fenstertage.com /api/metrics endpoint.

Only this one endpoint is ever used — it combines holidays, workday
stats and bridge-day blocks, so each required year costs exactly one
HTTP call. The API is public (no auth); it asks clients to cache and
be gentle, which the coordinator honours with a 12 h default interval.
"""
from __future__ import annotations

import datetime as dt
import logging
from dataclasses import dataclass
from typing import Any

import aiohttp

from .const import API_BASE_URL, METRICS_ENDPOINT, USER_AGENT

_LOGGER = logging.getLogger(__name__)

REQUEST_TIMEOUT_SEC = 30


class FenstertageApiError(Exception):
    """Base exception for fenstertage.com API failures."""


class FenstertageConnectionError(FenstertageApiError):
    """Network-level failure (DNS, connection refused, timeout)."""


class FenstertageResponseError(FenstertageApiError):
    """Non-2xx HTTP response."""

    def __init__(self, status: int, reason: str) -> None:
        super().__init__(f"HTTP {status}: {reason}")
        self.status = status
        self.reason = reason


class FenstertageDataError(FenstertageApiError):
    """Malformed or unexpected JSON payload."""


def _fix_mojibake(text: str) -> str:
    """Repair double-encoded UTF-8 ("KÃ¶nige" → "Könige").

    The upstream sometimes serves localName values that went through a
    utf-8-bytes-read-as-latin-1 round trip. Only strings containing the
    telltale Ã/Â markers are re-decoded; clean umlauts pass through.
    """
    if "Ã" not in text and "Â" not in text:
        return text
    try:
        return text.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return text


def _parse_date(raw: Any) -> dt.date:
    if not isinstance(raw, str):
        raise FenstertageDataError(f"expected ISO date string, got {raw!r}")
    try:
        return dt.date.fromisoformat(raw)
    except ValueError as err:
        raise FenstertageDataError(f"invalid date: {raw!r}") from err


def _require_int(raw: Any, field: str) -> int:
    if isinstance(raw, bool) or not isinstance(raw, (int, float)):
        raise FenstertageDataError(f"field {field} is not a number: {raw!r}")
    return int(raw)


@dataclass(frozen=True)
class Holiday:
    """One public holiday."""

    date: dt.date
    local_name: str
    name: str
    types: tuple[str, ...]


@dataclass(frozen=True)
class BridgeDayBlock:
    """One bridge-day suggestion block."""

    block_id: str
    level: int
    vacation_dates: tuple[dt.date, ...]
    vacation_day_weekdays: tuple[str, ...]
    vacation_days: int
    free_days: int
    free_days_without_weekend: int
    efficiency: float
    free_range_start: dt.date
    free_range_end: dt.date
    holidays: tuple[Holiday, ...]


@dataclass(frozen=True)
class LevelSummary:
    """Aggregate stats for one suggestion level."""

    blocks: int
    vacation_days: int
    free_days: int
    free_days_without_weekend: int
    average_efficiency: float


@dataclass(frozen=True)
class YearMetrics:
    """Everything /api/metrics returns for one country/year."""

    country: str
    subdivision: str | None
    year: int
    workdays: int
    weekend_days: int
    holiday_days: int
    holidays: tuple[Holiday, ...]
    levels: dict[int, LevelSummary]
    blocks: tuple[BridgeDayBlock, ...]
    generated_at: str


def _parse_holiday(raw: Any) -> Holiday:
    if not isinstance(raw, dict):
        raise FenstertageDataError("holiday entry is not an object")
    types_raw = raw.get("types") or []
    if not isinstance(types_raw, list):
        types_raw = []
    return Holiday(
        date=_parse_date(raw.get("date")),
        local_name=_fix_mojibake(str(raw.get("localName") or "")),
        name=str(raw.get("name") or ""),
        types=tuple(str(t) for t in types_raw if isinstance(t, str)),
    )


def _parse_block(raw: Any) -> BridgeDayBlock | None:
    """Parse one bridgeDayBlocks entry. Returns None for unusable rows."""
    if not isinstance(raw, dict):
        return None
    dates_raw = raw.get("vacationDates") or []
    if not isinstance(dates_raw, list) or not dates_raw:
        return None
    vacation_dates = tuple(sorted(_parse_date(d) for d in dates_raw))
    vacation_days = _require_int(
        raw.get("vacationDays", len(vacation_dates)), "vacationDays"
    )
    weekdays_raw = raw.get("vacationDayWeekdays") or []
    if not isinstance(weekdays_raw, list):
        weekdays_raw = []
    holidays_raw = raw.get("holidays") or []
    if not isinstance(holidays_raw, list):
        holidays_raw = []
    return BridgeDayBlock(
        # Deterministic across refreshes — planner items reference this.
        block_id=f"{vacation_dates[0].isoformat()}_{vacation_days}d",
        level=_require_int(raw.get("level", 0), "level"),
        vacation_dates=vacation_dates,
        vacation_day_weekdays=tuple(str(w) for w in weekdays_raw),
        vacation_days=vacation_days,
        free_days=_require_int(raw.get("freeDays", 0), "freeDays"),
        free_days_without_weekend=_require_int(
            raw.get("freeDaysWithoutWeekend", 0), "freeDaysWithoutWeekend"
        ),
        efficiency=float(raw.get("efficiency") or 0.0),
        free_range_start=_parse_date(raw.get("freeRangeStart")),
        free_range_end=_parse_date(raw.get("freeRangeEnd")),
        holidays=tuple(_parse_holiday(h) for h in holidays_raw),
    )


def _parse_levels(raw: Any) -> dict[int, LevelSummary]:
    if not isinstance(raw, dict):
        return {}
    out: dict[int, LevelSummary] = {}
    for key, value in raw.items():
        if not isinstance(key, str) or not key.startswith("level"):
            continue
        if not isinstance(value, dict):
            continue
        try:
            level_no = int(key.removeprefix("level"))
        except ValueError:
            continue
        out[level_no] = LevelSummary(
            blocks=_require_int(value.get("blocks", 0), "blocks"),
            vacation_days=_require_int(
                value.get("vacationDays", 0), "vacationDays"
            ),
            free_days=_require_int(value.get("freeDays", 0), "freeDays"),
            free_days_without_weekend=_require_int(
                value.get("freeDaysWithoutWeekend", 0),
                "freeDaysWithoutWeekend",
            ),
            average_efficiency=float(value.get("averageEfficiency") or 0.0),
        )
    return out


def parse_metrics(payload: dict[str, Any]) -> YearMetrics:
    """Parse a full /api/metrics payload into typed dataclasses."""
    year_raw = payload.get("year")
    if not isinstance(year_raw, int):
        raise FenstertageDataError(f"missing/invalid year: {year_raw!r}")
    holidays_raw = payload.get("holidays") or []
    if not isinstance(holidays_raw, list):
        raise FenstertageDataError("holidays is not a list")
    blocks_raw = payload.get("bridgeDayBlocks") or []
    if not isinstance(blocks_raw, list):
        raise FenstertageDataError("bridgeDayBlocks is not a list")

    blocks = tuple(
        b for b in (_parse_block(raw) for raw in blocks_raw) if b is not None
    )
    subdivision_raw = payload.get("subdivision")
    return YearMetrics(
        country=str(payload.get("country") or ""),
        subdivision=str(subdivision_raw) if subdivision_raw else None,
        year=year_raw,
        workdays=_require_int(payload.get("workdays", 0), "workdays"),
        weekend_days=_require_int(payload.get("weekendDays", 0), "weekendDays"),
        holiday_days=_require_int(payload.get("holidayDays", 0), "holidayDays"),
        holidays=tuple(_parse_holiday(h) for h in holidays_raw),
        levels=_parse_levels(payload.get("bridgeDaysByLevel")),
        blocks=blocks,
        generated_at=str(payload.get("generatedAt") or ""),
    )


class FenstertageApiClient:
    """Thin client — session is injected (Platinum inject-websession)."""

    def __init__(self, session: aiohttp.ClientSession) -> None:
        self._session = session

    async def async_get_metrics(
        self,
        country: str,
        year: int,
        subdivision: str | None = None,
        max_level: int = 5,
    ) -> YearMetrics:
        """Fetch and parse /api/metrics for one country/year."""
        params: dict[str, str] = {
            "country": country,
            "year": str(year),
            "maxLevel": str(max_level),
        }
        if subdivision:
            params["subdivision"] = subdivision
        timeout = aiohttp.ClientTimeout(total=REQUEST_TIMEOUT_SEC)
        headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
        try:
            async with self._session.get(
                f"{API_BASE_URL}{METRICS_ENDPOINT}",
                params=params,
                headers=headers,
                timeout=timeout,
            ) as resp:
                resp.raise_for_status()
                data = await resp.json(content_type=None)
        except TimeoutError as err:
            raise FenstertageConnectionError(
                f"timeout after {REQUEST_TIMEOUT_SEC}s"
            ) from err
        except aiohttp.ClientResponseError as err:
            raise FenstertageResponseError(err.status, err.message or "") from err
        except aiohttp.ClientError as err:
            raise FenstertageConnectionError(f"connection error: {err}") from err
        except ValueError as err:
            raise FenstertageDataError(f"invalid json: {err}") from err

        if not isinstance(data, dict):
            raise FenstertageDataError(
                f"expected object, got {type(data).__name__}"
            )
        return parse_metrics(data)
