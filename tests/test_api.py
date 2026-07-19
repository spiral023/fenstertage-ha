"""Pure unit tests for api.py — no Home Assistant required."""
from __future__ import annotations

import datetime as dt
from typing import Any

import aiohttp
import pytest

from custom_components.fenstertage.api import (
    FenstertageApiClient,
    FenstertageConnectionError,
    FenstertageDataError,
    FenstertageResponseError,
    _fix_mojibake,
    parse_metrics,
)


# Kompaktes, strukturtreues Abbild der echten /api/metrics-Antwort
# (AT 2026, verifiziert am 2026-07-19). Ein Feiertag absichtlich mit
# Mojibake, wie ihn die Live-API liefert.
PAYLOAD: dict[str, Any] = {
    "country": "AT",
    "subdivision": None,
    "year": 2026,
    "workdays": 251,
    "weekendDays": 104,
    "holidayDays": 15,
    "holidays": [
        {
            "date": "2026-01-01",
            "localName": "Neujahr",
            "name": "New Year's Day",
            "countryCode": "AT",
            "fixed": False,
            "global": True,
            "counties": None,
            "launchYear": None,
            "types": ["Public"],
        },
        {
            "date": "2026-01-06",
            "localName": "Heilige Drei KÃ¶nige",
            "name": "Epiphany",
            "countryCode": "AT",
            "fixed": False,
            "global": True,
            "counties": None,
            "launchYear": None,
            "types": ["Public"],
        },
    ],
    "bridgeDaysByLevel": {
        "level1": {
            "blocks": 5,
            "vacationDays": 5,
            "freeDays": 20,
            "freeDaysWithoutWeekend": 10,
            "averageEfficiency": 4,
        },
        "level2": {
            "blocks": 1,
            "vacationDays": 2,
            "freeDays": 6,
            "freeDaysWithoutWeekend": 4,
            "averageEfficiency": 3,
        },
    },
    "bridgeDayBlocks": [
        {
            "level": 1,
            "vacationDates": ["2026-01-02"],
            "vacationDayWeekdays": ["Fr"],
            "vacationDays": 1,
            "freeDays": 4,
            "freeDaysWithoutWeekend": 2,
            "efficiency": 4,
            "freeRangeStart": "2026-01-01",
            "freeRangeEnd": "2026-01-04",
            "holidays": [
                {
                    "date": "2026-01-01",
                    "localName": "Neujahr",
                    "name": "New Year's Day",
                    "types": ["Public"],
                }
            ],
        },
        {
            "level": 2,
            "vacationDates": ["2026-05-26", "2026-05-27"],
            "vacationDayWeekdays": ["Di", "Mi"],
            "vacationDays": 2,
            "freeDays": 6,
            "freeDaysWithoutWeekend": 4,
            "efficiency": 3,
            "freeRangeStart": "2026-05-23",
            "freeRangeEnd": "2026-05-28",
            "holidays": [],
        },
    ],
    "suggestionLevelEvaluated": 5,
    "generatedAt": "2026-07-19T02:41:22.146Z",
}


def test_fix_mojibake_repairs_double_encoded() -> None:
    assert _fix_mojibake("Heilige Drei KÃ¶nige") == "Heilige Drei Könige"


def test_fix_mojibake_leaves_clean_strings_alone() -> None:
    assert _fix_mojibake("Mariä Empfängnis") == "Mariä Empfängnis"
    assert _fix_mojibake("Neujahr") == "Neujahr"


def test_parse_metrics_full_shape() -> None:
    metrics = parse_metrics(PAYLOAD)
    assert metrics.country == "AT"
    assert metrics.subdivision is None
    assert metrics.year == 2026
    assert metrics.workdays == 251
    assert metrics.weekend_days == 104
    assert metrics.holiday_days == 15
    assert len(metrics.holidays) == 2
    assert metrics.holidays[1].local_name == "Heilige Drei Könige"
    assert metrics.holidays[0].date == dt.date(2026, 1, 1)
    assert metrics.levels[1].average_efficiency == 4
    assert metrics.levels[2].blocks == 1
    assert len(metrics.blocks) == 2
    block = metrics.blocks[1]
    assert block.vacation_dates == (dt.date(2026, 5, 26), dt.date(2026, 5, 27))
    assert block.free_range_start == dt.date(2026, 5, 23)
    assert block.efficiency == 3
    assert metrics.generated_at == "2026-07-19T02:41:22.146Z"


def test_block_id_is_deterministic() -> None:
    a = parse_metrics(PAYLOAD).blocks
    b = parse_metrics(PAYLOAD).blocks
    assert [x.block_id for x in a] == [x.block_id for x in b]
    assert a[0].block_id == "2026-01-02_1d"
    assert a[1].block_id == "2026-05-26_2d"


def test_parse_metrics_rejects_missing_year() -> None:
    bad = {**PAYLOAD, "year": None}
    with pytest.raises(FenstertageDataError):
        parse_metrics(bad)


def test_parse_metrics_rejects_bad_date() -> None:
    bad = {**PAYLOAD, "holidays": [{"date": "not-a-date", "localName": "x"}]}
    with pytest.raises(FenstertageDataError):
        parse_metrics(bad)


def test_parse_metrics_skips_block_without_vacation_dates() -> None:
    bad = {
        **PAYLOAD,
        "bridgeDayBlocks": [{"level": 1, "vacationDates": []}],
    }
    metrics = parse_metrics(bad)
    assert metrics.blocks == ()


# ---------------------------------------------------------------------------
# Fehler-Mapping des Clients — Fake-Session statt echtem Netzwerk.
# ---------------------------------------------------------------------------


class _FakeResponse:
    def __init__(
        self,
        *,
        status: int = 200,
        json_data: Any = None,
        json_exc: Exception | None = None,
    ) -> None:
        self.status = status
        self._json_data = json_data
        self._json_exc = json_exc

    async def __aenter__(self) -> "_FakeResponse":
        return self

    async def __aexit__(self, *exc_info: object) -> None:
        return None

    def raise_for_status(self) -> None:
        if self.status >= 400:
            raise aiohttp.ClientResponseError(
                request_info=None,  # type: ignore[arg-type]
                history=(),
                status=self.status,
                message="boom",
            )

    async def json(self, content_type: str | None = None) -> Any:
        if self._json_exc is not None:
            raise self._json_exc
        return self._json_data


class _FakeSession:
    """Duck-typed aiohttp.ClientSession: get() liefert einen async-CM."""

    def __init__(
        self,
        response: _FakeResponse | None = None,
        exc: Exception | None = None,
    ) -> None:
        self._response = response
        self._exc = exc
        self.last_url: str | None = None
        self.last_params: dict[str, str] | None = None

    def get(self, url: str, **kwargs: Any) -> _FakeResponse:
        if self._exc is not None:
            raise self._exc
        self.last_url = url
        self.last_params = kwargs.get("params")
        assert self._response is not None
        return self._response


async def test_client_happy_path_builds_params() -> None:
    session = _FakeSession(_FakeResponse(json_data=PAYLOAD))
    client = FenstertageApiClient(session)  # type: ignore[arg-type]
    metrics = await client.async_get_metrics(
        "DE", 2027, subdivision="DE-BY", max_level=3
    )
    assert metrics.year == 2026  # aus dem Payload; Params separat geprüft:
    assert session.last_url == "https://fenstertage.com/api/metrics"
    assert session.last_params == {
        "country": "DE",
        "year": "2027",
        "maxLevel": "3",
        "subdivision": "DE-BY",
    }


async def test_client_omits_subdivision_when_none() -> None:
    session = _FakeSession(_FakeResponse(json_data=PAYLOAD))
    client = FenstertageApiClient(session)  # type: ignore[arg-type]
    await client.async_get_metrics("AT", 2026)
    assert session.last_params == {
        "country": "AT",
        "year": "2026",
        "maxLevel": "5",
    }


async def test_client_maps_http_error() -> None:
    session = _FakeSession(_FakeResponse(status=500, json_data={}))
    client = FenstertageApiClient(session)  # type: ignore[arg-type]
    with pytest.raises(FenstertageResponseError) as exc_info:
        await client.async_get_metrics("AT", 2026)
    assert exc_info.value.status == 500


async def test_client_maps_timeout() -> None:
    session = _FakeSession(exc=TimeoutError())
    client = FenstertageApiClient(session)  # type: ignore[arg-type]
    with pytest.raises(FenstertageConnectionError):
        await client.async_get_metrics("AT", 2026)


async def test_client_maps_connection_error() -> None:
    session = _FakeSession(exc=aiohttp.ClientError("no route"))
    client = FenstertageApiClient(session)  # type: ignore[arg-type]
    with pytest.raises(FenstertageConnectionError):
        await client.async_get_metrics("AT", 2026)


async def test_client_maps_invalid_json() -> None:
    session = _FakeSession(_FakeResponse(json_exc=ValueError("bad json")))
    client = FenstertageApiClient(session)  # type: ignore[arg-type]
    with pytest.raises(FenstertageDataError):
        await client.async_get_metrics("AT", 2026)


async def test_client_rejects_non_dict_payload() -> None:
    session = _FakeSession(_FakeResponse(json_data=[1, 2, 3]))
    client = FenstertageApiClient(session)  # type: ignore[arg-type]
    with pytest.raises(FenstertageDataError):
        await client.async_get_metrics("AT", 2026)
