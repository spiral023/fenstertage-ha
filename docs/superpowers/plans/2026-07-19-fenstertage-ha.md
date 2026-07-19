# Fenstertage HA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** HACS-installierbare Home-Assistant-Integration `fenstertage` für die öffentliche API fenstertage.com (Feiertage/Werktage/Fenstertage AT/DE/CH) inkl. interaktiver Lovelace-Karte (`compact`/`list`/`year`) mit Urlaubsplanung (Blöcke + freie Ranges, Budget, Services, HA-Storage-Persistenz).

**Architecture:** Ein `DataUpdateCoordinator` holt pro benötigtem Jahr genau einen `/api/metrics`-Call und hält `dict[int, YearMetrics]` (typisierte frozen dataclasses). Urlaubsplanungen liegen in einem HA `Store` pro Config-Entry (`planner.py`), werden über vier Services geschrieben und als Attribute eines `vacation_budget`-Sensors gelesen. Die Lit/TypeScript-Karte liest nur Entity-States/-Attribute und schreibt nur über `hass.callService()`.

**Tech Stack:** Python (HA custom component, aiohttp aus HA-Core, keine externen requirements), pytest + pytest-homeassistant-custom-component (PHACC), TypeScript + Lit 3 + Rollup 4 für die Karte.

**Spec:** `docs/superpowers/specs/2026-07-19-fenstertage-ha-design.md` — bei Detailfragen dort nachschlagen.

## Global Constraints

- `domain = "fenstertage"`, Name "Fenstertage", Repo `https://github.com/spiral023/fenstertage-ha`, Codeowner `@spiral023`.
- `manifest.json`: `iot_class: cloud_polling`, `integration_type: service`, `requirements: []`, `config_flow: true`, `after_dependencies: ["frontend", "http", "lovelace"]`.
- Nur Endpunkt `GET https://fenstertage.com/api/metrics` — **ein HTTP-Call pro Jahr**, nie mehr. Kein Auth. User-Agent `fenstertage-ha/<version>`.
- Poll-Default 12 h, Options-Minimum 1 h, Maximum 48 h.
- Python-Zielversion 3.14 (`[tool.ruff] target-version = "py314"`), mypy `strict = true`.
- Coverage-Gate: `--cov --cov-fail-under=90` (pytest.ini). TDD: Test zuerst, dann Implementierung, in jedem Task.
- Alle User-sichtbaren Strings über `strings.json` + `translations/{en,de}.json`; Exceptions mit `translation_domain=DOMAIN` + `translation_key`.
- `unique_id`-Formate sind stabil zu halten: Entry `f"{country}_{subdivision or 'none'}"`, Entities `f"{entry.entry_id}_{key}"`.
- Karte: ein gebundeltes ES-Modul `custom_components/fenstertage/www/fenstertage-card.js`, Rollup, `inlineDynamicImports: true`. `CARD_VERSION` in `const.py` und `src/const.ts` synchron halten.
- Commit nach jedem grünen Task (`git commit`), Conventional-Commit-Präfixe (`feat:`, `test:`, `chore:`, `docs:`, `ci:`).
- Tests laufen mit `python -m pytest tests/ -v` (lokal ggf. venv; alternativ Docker-Python-3.14-Container, Ergebnis identisch). Während der Arbeit an einem einzelnen Task Coverage-Gate umgehen mit `-o addopts=""` — das Gate gilt für die Gesamtsuite (Task 16).

## Datei-Struktur (Endzustand)

```
custom_components/fenstertage/
├── __init__.py            # setup, setup_entry, Mitternachts-Tick, Device
├── api.py                 # Client + dataclasses + Exceptions + Mojibake-Fix
├── binary_sensor.py       # holiday_today, bridge_day_today
├── card_registration.py   # Lovelace-Resource-Registrierung (aus Referenz)
├── config_flow.py         # ConfigFlow (user→subdivision) + OptionsFlow
├── const.py               # Domain, Defaults, DE/CH-Subdivision-Listen
├── coordinator.py         # FenstertageCoordinator + RuntimeData
├── derive.py              # pure Ableitungen (next/best block, workdays_remaining …)
├── diagnostics.py
├── entity.py              # FenstertageEntity-Basisklasse
├── planner.py             # PlannerStore (HA Store) + compute_vacation_dates
├── sensor.py              # 5 Sensoren
├── services.py            # 4 Services
├── services.yaml
├── icons.json, strings.json, translations/{en,de}.json
├── manifest.json, quality_scale.yaml, py.typed
└── www/fenstertage-card.js   # Build-Artefakt (eingecheckt)
src/                        # Karten-Quellcode
├── fenstertage-card.ts, editor.ts, const.ts, types.ts, styles.ts, localize.ts
└── modes/{compact,list,year}.ts
tests/                      # pytest + PHACC
```

---

### Task 1: Repo-Grundgerüst (manifest, hacs.json, const.py, Tooling)

**Files:**
- Create: `custom_components/fenstertage/manifest.json`
- Create: `custom_components/fenstertage/const.py`
- Create: `custom_components/fenstertage/__init__.py` (Platzhalter-Docstring)
- Create: `custom_components/fenstertage/py.typed` (leer)
- Create: `hacs.json`, `pyproject.toml`, `pytest.ini`, `requirements_test.txt`, `.gitignore`, `LICENSE`
- Test: `tests/__init__.py` (leer), Validierung via JSON-Parse

**Interfaces:**
- Produces: alle Konstanten aus `const.py` (Namen unten), die jeder spätere Task importiert.

- [ ] **Step 1: Verzeichnisse + Metadaten anlegen**

`custom_components/fenstertage/manifest.json`:

```json
{
  "domain": "fenstertage",
  "name": "Fenstertage",
  "after_dependencies": ["frontend", "http", "lovelace"],
  "codeowners": ["@spiral023"],
  "config_flow": true,
  "dependencies": [],
  "documentation": "https://github.com/spiral023/fenstertage-ha",
  "integration_type": "service",
  "iot_class": "cloud_polling",
  "issue_tracker": "https://github.com/spiral023/fenstertage-ha/issues",
  "loggers": ["custom_components.fenstertage"],
  "requirements": [],
  "version": "0.1.0"
}
```

`hacs.json`:

```json
{
  "name": "Fenstertage HA",
  "country": ["AT", "DE", "CH"],
  "homeassistant": "2025.1.0",
  "hacs": "2.0.0",
  "render_readme": true
}
```

`custom_components/fenstertage/__init__.py` (Platzhalter, wird in Task 5 ersetzt):

```python
"""Fenstertage integration for Home Assistant (fenstertage.com)."""
```

`custom_components/fenstertage/py.typed`: leere Datei.

- [ ] **Step 2: const.py schreiben**

`custom_components/fenstertage/const.py`:

```python
"""Constants for the Fenstertage integration."""
from __future__ import annotations

DOMAIN = "fenstertage"
NAME = "Fenstertage"
VERSION = "0.1.0"
CARD_VERSION = "0.1.0"

API_BASE_URL = "https://fenstertage.com"
METRICS_ENDPOINT = "/api/metrics"
USER_AGENT = f"fenstertage-ha/{VERSION} (+https://github.com/spiral023/fenstertage-ha)"
ATTRIBUTION = "Daten von fenstertage.com"

CONF_COUNTRY = "country"
CONF_SUBDIVISION = "subdivision"
CONF_MAX_LEVEL = "max_level"
CONF_PREVIEW_YEARS = "preview_years"
CONF_UPDATE_INTERVAL_HOURS = "update_interval_hours"
CONF_VACATION_BUDGET = "vacation_budget"

DEFAULT_MAX_LEVEL = 5
DEFAULT_PREVIEW_YEARS = 1
DEFAULT_UPDATE_INTERVAL_HOURS = 12
MIN_UPDATE_INTERVAL_HOURS = 1
MAX_UPDATE_INTERVAL_HOURS = 48
DEFAULT_VACATION_BUDGET = 25
MAX_VACATION_BUDGET = 100
MAX_VACATION_RANGE_DAYS = 60

STORAGE_VERSION = 1

COUNTRIES = ["AT", "DE", "CH"]

# ISO-3166-2 — die API liefert keine Enumeration, daher hartkodiert.
SUBDIVISIONS: dict[str, list[str]] = {
    "AT": [],
    "DE": [
        "DE-BW", "DE-BY", "DE-BE", "DE-BB", "DE-HB", "DE-HH", "DE-HE",
        "DE-MV", "DE-NI", "DE-NW", "DE-RP", "DE-SL", "DE-SN", "DE-ST",
        "DE-SH", "DE-TH",
    ],
    "CH": [
        "CH-AG", "CH-AI", "CH-AR", "CH-BE", "CH-BL", "CH-BS", "CH-FR",
        "CH-GE", "CH-GL", "CH-GR", "CH-JU", "CH-LU", "CH-NE", "CH-NW",
        "CH-OW", "CH-SG", "CH-SH", "CH-SO", "CH-SZ", "CH-TG", "CH-TI",
        "CH-UR", "CH-VD", "CH-VS", "CH-ZG", "CH-ZH",
    ],
}

SERVICE_PLAN_BRIDGE_DAY = "plan_bridge_day"
SERVICE_PLAN_VACATION = "plan_vacation"
SERVICE_REMOVE_VACATION = "remove_vacation"
SERVICE_SET_BUDGET = "set_budget"

ATTR_CONFIG_ENTRY_ID = "config_entry_id"
ATTR_BLOCK_ID = "block_id"
ATTR_ITEM_ID = "item_id"
ATTR_START = "start"
ATTR_END = "end"
ATTR_YEAR = "year"
ATTR_DAYS = "days"

SOURCE_BRIDGE_DAY = "bridge_day"
SOURCE_MANUAL = "manual"
```

- [ ] **Step 3: Tooling-Dateien schreiben**

`pyproject.toml`:

```toml
[tool.ruff]
target-version = "py314"
line-length = 88

[tool.mypy]
strict = true
ignore_missing_imports = true
files = ["custom_components/fenstertage"]

[tool.coverage.run]
source = ["custom_components/fenstertage"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
    "\\.\\.\\.",
]
show_missing = true
skip_empty = true
```

`pytest.ini`:

```ini
[pytest]
asyncio_mode = auto
asyncio_default_fixture_loop_scope = function
pythonpath = .
addopts = --cov --cov-fail-under=90
```

`requirements_test.txt`:

```
pytest-homeassistant-custom-component>=0.13.346,<0.14
pytest-asyncio>=1.3.0,<2
pytest-cov>=7.1.0,<8
mypy>=2.2.0,<3
ruff>=0.15.20,<1
```

`.gitignore`:

```
__pycache__/
*.py[cod]
.venv/
.pytest_cache/
.coverage
node_modules/
*.js.map
.DS_Store
```

`LICENSE`: MIT-Lizenz, Copyright `2026 Philipp Asanger`. Standard-MIT-Text unverändert übernehmen (https://opensource.org/license/mit), nur Jahr/Name einsetzen.

`tests/__init__.py`: leere Datei.

- [ ] **Step 4: Validieren**

Run: `python -c "import json; json.load(open('custom_components/fenstertage/manifest.json')); json.load(open('hacs.json')); print('OK')"`
Expected: `OK`

Run: `python -c "import sys; sys.path.insert(0,'.'); from custom_components.fenstertage import const; assert const.DOMAIN=='fenstertage'; assert len(const.SUBDIVISIONS['DE'])==16; assert len(const.SUBDIVISIONS['CH'])==26; print('OK')"`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: Repo-Grundgerüst (manifest, hacs.json, const, Tooling)"
```

---

### Task 2: api.py — Client, dataclasses, Exceptions, Mojibake-Fix

**Files:**
- Create: `custom_components/fenstertage/api.py`
- Test: `tests/test_api.py`

**Interfaces:**
- Consumes: `const.py` (`API_BASE_URL`, `METRICS_ENDPOINT`, `USER_AGENT`).
- Produces (spätere Tasks verlassen sich exakt hierauf):
  - `FenstertageApiClient(session: aiohttp.ClientSession)` mit
    `async_get_metrics(country: str, year: int, subdivision: str | None = None, max_level: int = 5) -> YearMetrics`
  - `parse_metrics(payload: dict[str, Any]) -> YearMetrics` (pure, testbar ohne HA)
  - frozen dataclasses `Holiday`, `BridgeDayBlock`, `LevelSummary`, `YearMetrics` (Felder siehe Code)
  - Exceptions: `FenstertageApiError` → `FenstertageConnectionError`, `FenstertageResponseError(status, reason)`, `FenstertageDataError`
  - `BridgeDayBlock.block_id` deterministisch: `f"{vacation_dates[0].isoformat()}_{vacation_days}d"`

- [ ] **Step 1: Failing Tests schreiben**

`tests/test_api.py`:

```python
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
```

Hinweis: Für diese reinen Unit-Tests wird PHACC noch nicht gebraucht, aber
`pytest-asyncio` (asyncio_mode=auto aus pytest.ini) muss installiert sein:
`pip install -r requirements_test.txt` einmalig vorab.

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `python -m pytest tests/test_api.py -v -o addopts=""`
Expected: FAIL / ERROR mit `ModuleNotFoundError` bzw. `ImportError` (api.py existiert nicht).

- [ ] **Step 3: api.py implementieren**

`custom_components/fenstertage/api.py`:

```python
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
```

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `python -m pytest tests/test_api.py -v -o addopts=""`
Expected: alle Tests PASS.

- [ ] **Step 5: Commit**

```bash
git add custom_components/fenstertage/api.py tests/test_api.py
git commit -m "feat: api.py — /api/metrics-Client mit typisiertem Parsing und Mojibake-Fix"
```

---

### Task 3: planner.py — PlannerStore, Budget, Validierung

**Files:**
- Create: `custom_components/fenstertage/planner.py`
- Test: `tests/test_planner.py`

**Interfaces:**
- Consumes: `const.py` (`DOMAIN`, `STORAGE_VERSION`, `MAX_VACATION_RANGE_DAYS`, `SOURCE_MANUAL`, `SOURCE_BRIDGE_DAY`).
- Produces:
  - `compute_vacation_dates(start: dt.date, end: dt.date, holidays: set[dt.date]) -> tuple[dt.date, ...]` (pure)
  - `PlannedItem` (frozen dataclass: `id: str`, `start: dt.date`, `end: dt.date`, `vacation_dates: tuple[dt.date, ...]`, `source: str`, `block_id: str | None`, `created_at: str`) mit `as_dict() -> dict[str, Any]`
  - `PlannerStore(hass, entry_id: str, default_budget: int)` mit:
    `async_load()`, `async_remove()`, Property `items -> list[PlannedItem]`,
    `budget_for(year: int) -> int`, `planned_days_for(year: int) -> int`,
    `async_add_item(*, start, end, holidays, source, block_id=None, vacation_dates=None) -> PlannedItem`,
    `async_remove_item(item_id: str)`, `async_set_budget(year: int, days: int)`,
    `as_attributes(year: int) -> dict[str, Any]`
  - Alle Validierungsfehler als `ServiceValidationError(translation_domain=DOMAIN, translation_key=...)` mit Keys:
    `invalid_range`, `range_too_long`, `overlapping_vacation`, `no_vacation_days`, `unknown_item`

- [ ] **Step 1: Failing Tests schreiben**

`tests/test_planner.py`:

```python
"""Tests for planner.py — PHACC's hass fixture, no config entry needed."""
from __future__ import annotations

import datetime as dt

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError

from custom_components.fenstertage.const import SOURCE_BRIDGE_DAY, SOURCE_MANUAL
from custom_components.fenstertage.planner import (
    PlannerStore,
    compute_vacation_dates,
)

D = dt.date


def test_compute_vacation_dates_skips_weekends_and_holidays() -> None:
    # Mo 2026-05-11 .. So 2026-05-17, Feiertag am Do 2026-05-14
    result = compute_vacation_dates(
        D(2026, 5, 11), D(2026, 5, 17), {D(2026, 5, 14)}
    )
    assert result == (
        D(2026, 5, 11),
        D(2026, 5, 12),
        D(2026, 5, 13),
        D(2026, 5, 15),
    )


def test_compute_vacation_dates_pure_weekend_is_empty() -> None:
    assert compute_vacation_dates(D(2026, 5, 16), D(2026, 5, 17), set()) == ()


async def test_add_and_persist_roundtrip(hass: HomeAssistant) -> None:
    store = PlannerStore(hass, "entry1", default_budget=25)
    await store.async_load()
    item = await store.async_add_item(
        start=D(2026, 5, 15),
        end=D(2026, 5, 15),
        holidays=set(),
        source=SOURCE_BRIDGE_DAY,
        block_id="2026-05-15_1d",
    )
    assert item.vacation_dates == (D(2026, 5, 15),)
    assert item.block_id == "2026-05-15_1d"

    # Neue Instanz lädt denselben Stand von Platte.
    store2 = PlannerStore(hass, "entry1", default_budget=25)
    await store2.async_load()
    assert len(store2.items) == 1
    assert store2.items[0].id == item.id
    assert store2.items[0].vacation_dates == (D(2026, 5, 15),)


async def test_vacation_dates_override_wins(hass: HomeAssistant) -> None:
    store = PlannerStore(hass, "entry2", default_budget=25)
    await store.async_load()
    item = await store.async_add_item(
        start=D(2026, 5, 26),
        end=D(2026, 5, 27),
        holidays=set(),
        source=SOURCE_BRIDGE_DAY,
        block_id="2026-05-26_2d",
        vacation_dates=(D(2026, 5, 26), D(2026, 5, 27)),
    )
    assert item.vacation_dates == (D(2026, 5, 26), D(2026, 5, 27))


async def test_overlap_rejected(hass: HomeAssistant) -> None:
    store = PlannerStore(hass, "entry3", default_budget=25)
    await store.async_load()
    await store.async_add_item(
        start=D(2026, 8, 3), end=D(2026, 8, 7), holidays=set(),
        source=SOURCE_MANUAL,
    )
    with pytest.raises(ServiceValidationError):
        await store.async_add_item(
            start=D(2026, 8, 7), end=D(2026, 8, 10), holidays=set(),
            source=SOURCE_MANUAL,
        )
    # Anschließend an bestehende Range ist ok:
    await store.async_add_item(
        start=D(2026, 8, 10), end=D(2026, 8, 12), holidays=set(),
        source=SOURCE_MANUAL,
    )
    assert len(store.items) == 2


async def test_invalid_range_and_too_long_rejected(hass: HomeAssistant) -> None:
    store = PlannerStore(hass, "entry4", default_budget=25)
    await store.async_load()
    with pytest.raises(ServiceValidationError):
        await store.async_add_item(
            start=D(2026, 8, 7), end=D(2026, 8, 3), holidays=set(),
            source=SOURCE_MANUAL,
        )
    with pytest.raises(ServiceValidationError):
        await store.async_add_item(
            start=D(2026, 1, 1), end=D(2026, 3, 15), holidays=set(),
            source=SOURCE_MANUAL,
        )


async def test_range_with_no_workdays_rejected(hass: HomeAssistant) -> None:
    store = PlannerStore(hass, "entry5", default_budget=25)
    await store.async_load()
    with pytest.raises(ServiceValidationError):
        await store.async_add_item(
            start=D(2026, 5, 16), end=D(2026, 5, 17), holidays=set(),
            source=SOURCE_MANUAL,
        )


async def test_budget_accounting_and_year_split(hass: HomeAssistant) -> None:
    store = PlannerStore(hass, "entry6", default_budget=25)
    await store.async_load()
    assert store.budget_for(2026) == 25
    await store.async_set_budget(2026, 30)
    assert store.budget_for(2026) == 30
    assert store.budget_for(2027) == 25  # Fallback auf Default

    # Range über den Jahreswechsel: Mi 2026-12-30 .. Mo 2027-01-04.
    # Ohne Feiertage: 30.+31.12. zählen 2026, 1.1. (Fr) + 4.1. (Mo) zählen 2027.
    await store.async_add_item(
        start=D(2026, 12, 30), end=D(2027, 1, 4), holidays=set(),
        source=SOURCE_MANUAL,
    )
    assert store.planned_days_for(2026) == 2
    assert store.planned_days_for(2027) == 2


async def test_remove_item(hass: HomeAssistant) -> None:
    store = PlannerStore(hass, "entry7", default_budget=25)
    await store.async_load()
    item = await store.async_add_item(
        start=D(2026, 8, 3), end=D(2026, 8, 4), holidays=set(),
        source=SOURCE_MANUAL,
    )
    await store.async_remove_item(item.id)
    assert store.items == []
    with pytest.raises(ServiceValidationError):
        await store.async_remove_item("does-not-exist")


async def test_as_attributes_shape(hass: HomeAssistant) -> None:
    store = PlannerStore(hass, "entry8", default_budget=25)
    await store.async_load()
    await store.async_add_item(
        start=D(2026, 8, 3), end=D(2026, 8, 4), holidays=set(),
        source=SOURCE_MANUAL,
    )
    attrs = store.as_attributes(2026)
    assert attrs["budget_total"] == 25
    assert attrs["planned_days"] == 2
    assert attrs["budgets"] == {"2026": 25}
    assert len(attrs["planned_items"]) == 1
    assert attrs["planned_items"][0]["start"] == "2026-08-03"


async def test_load_ignores_malformed_entries(hass: HomeAssistant) -> None:
    store = PlannerStore(hass, "entry9", default_budget=25)
    # Direkt kaputte Daten in den Store schreiben:
    await store._store.async_save(  # noqa: SLF001 — gezielter Whitebox-Test
        {
            "budgets": {"2026": 30, "kaputt": "x"},
            "items": [
                {"id": "ok", "start": "2026-08-03", "end": "2026-08-04",
                 "vacation_dates": ["2026-08-03", "2026-08-04"],
                 "source": "manual", "block_id": None, "created_at": ""},
                {"id": "broken", "start": "not-a-date"},
                "garbage",
            ],
        }
    )
    await store.async_load()
    assert len(store.items) == 1
    assert store.budget_for(2026) == 30
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `python -m pytest tests/test_planner.py -v -o addopts=""`
Expected: FAIL mit `ModuleNotFoundError: No module named 'custom_components.fenstertage.planner'`.

- [ ] **Step 3: planner.py implementieren**

`custom_components/fenstertage/planner.py`:

```python
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
        return {
            "budget_total": self.budget_for(year),
            "planned_days": self.planned_days_for(year),
            "planned_items": [item.as_dict() for item in self._items],
            "budgets": {str(y): d for y, d in self._budgets.items()},
        }
```

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `python -m pytest tests/test_planner.py -v -o addopts=""`
Expected: alle Tests PASS.

- [ ] **Step 5: Commit**

```bash
git add custom_components/fenstertage/planner.py tests/test_planner.py
git commit -m "feat: planner.py — Urlaubsplanungs-Store mit Budget und Validierung"
```

---

### Task 4: derive.py — pure Ableitungen + Test-Factories

**Files:**
- Create: `custom_components/fenstertage/derive.py`
- Create: `tests/common.py` (Factories, von allen späteren Tests genutzt)
- Test: `tests/test_derive.py`

**Interfaces:**
- Consumes: dataclasses aus `api.py`.
- Produces (Signaturen exakt so, spätere Tasks nutzen sie):
  - `upcoming_blocks(years: dict[int, YearMetrics], today: dt.date) -> list[BridgeDayBlock]`
  - `next_block(years, today) -> BridgeDayBlock | None`
  - `best_block(years, today) -> BridgeDayBlock | None` (höchste efficiency, Tiebreak früheres Datum)
  - `workdays_remaining(metrics: YearMetrics, today: dt.date) -> int`
  - `holiday_on(metrics: YearMetrics, day: dt.date) -> Holiday | None`
  - `block_covering(years, day: dt.date) -> BridgeDayBlock | None` (free_range enthält day)
  - `holidays_in_years(years) -> set[dt.date]`
  - `block_as_dict(block: BridgeDayBlock) -> dict[str, Any]` (ISO-Strings, für Attribute/Karte)
  - `tests/common.py`: `make_holiday(date_str, local_name="Feiertag")`, `make_block(first_vacation_date, vacation_days=1, efficiency=4.0, level=1, free_range=None, holidays=())`, `make_metrics(year, blocks=(), holidays=(), workdays=250, country="AT")`

- [ ] **Step 1: Test-Factories schreiben**

`tests/common.py`:

```python
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
    dates = tuple(
        start + dt.timedelta(days=i) for i in range(vacation_days)
    )
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
```

- [ ] **Step 2: Failing Tests schreiben**

`tests/test_derive.py`:

```python
"""Pure unit tests for derive.py."""
from __future__ import annotations

import datetime as dt

from custom_components.fenstertage.derive import (
    best_block,
    block_as_dict,
    block_covering,
    holiday_on,
    holidays_in_years,
    next_block,
    upcoming_blocks,
    workdays_remaining,
)
from tests.common import make_block, make_holiday, make_metrics

D = dt.date


def _years() -> dict:
    b_jan = make_block("2026-01-02", efficiency=4.0)
    b_may = make_block("2026-05-15", efficiency=4.0)
    b_dec = make_block("2026-12-28", vacation_days=3, efficiency=2.67, level=3)
    b_next = make_block("2027-05-14", efficiency=4.5)
    return {
        2026: make_metrics(
            2026,
            blocks=(b_jan, b_may, b_dec),
            holidays=(make_holiday("2026-05-14", "Christi Himmelfahrt"),),
        ),
        2027: make_metrics(2027, blocks=(b_next,)),
    }


def test_upcoming_blocks_filters_past_and_sorts() -> None:
    result = upcoming_blocks(_years(), D(2026, 5, 1))
    assert [b.block_id for b in result] == [
        "2026-05-15_1d",
        "2026-12-28_3d",
        "2027-05-14_1d",
    ]


def test_next_block_and_empty() -> None:
    assert next_block(_years(), D(2026, 5, 1)).block_id == "2026-05-15_1d"
    assert next_block({}, D(2026, 5, 1)) is None
    assert next_block(_years(), D(2028, 1, 1)) is None


def test_best_block_prefers_efficiency_then_earlier_date() -> None:
    # 2027-05-14 hat 4.5 — beste Effizienz unter den kommenden.
    assert best_block(_years(), D(2026, 5, 1)).block_id == "2027-05-14_1d"
    # Bei gleicher Effizienz gewinnt das frühere Datum:
    tie = {
        2026: make_metrics(
            2026,
            blocks=(
                make_block("2026-10-26", efficiency=4.0),
                make_block("2026-05-15", efficiency=4.0),
            ),
        )
    }
    assert best_block(tie, D(2026, 1, 1)).block_id == "2026-05-15_1d"


def test_workdays_remaining_counts_from_today() -> None:
    # Letzte Woche 2026: Mi 30.12., Do 31.12. sind Werktage
    metrics = make_metrics(2026)
    assert workdays_remaining(metrics, D(2026, 12, 30)) == 2
    # Feiertag am 31.12. reduziert auf 1:
    metrics2 = make_metrics(2026, holidays=(make_holiday("2026-12-31"),))
    assert workdays_remaining(metrics2, D(2026, 12, 30)) == 1
    # today nach Jahresende → 0:
    assert workdays_remaining(metrics, D(2027, 1, 5)) == 0


def test_holiday_on() -> None:
    metrics = _years()[2026]
    assert holiday_on(metrics, D(2026, 5, 14)).local_name == "Christi Himmelfahrt"
    assert holiday_on(metrics, D(2026, 5, 15)) is None


def test_block_covering_uses_free_range() -> None:
    years = _years()
    # b_may: free_range 2026-05-14..2026-05-16 (default: ±1 Tag)
    assert block_covering(years, D(2026, 5, 16)).block_id == "2026-05-15_1d"
    assert block_covering(years, D(2026, 7, 1)) is None


def test_holidays_in_years_unions_all() -> None:
    assert holidays_in_years(_years()) == {D(2026, 5, 14)}


def test_block_as_dict_serialises_iso() -> None:
    block = make_block(
        "2026-05-15", holidays=(make_holiday("2026-05-14", "Christi Himmelfahrt"),)
    )
    data = block_as_dict(block)
    assert data["block_id"] == "2026-05-15_1d"
    assert data["vacation_dates"] == ["2026-05-15"]
    assert data["free_range_start"] == "2026-05-14"
    assert data["holidays"][0]["local_name"] == "Christi Himmelfahrt"
```

- [ ] **Step 3: Tests laufen lassen — müssen fehlschlagen**

Run: `python -m pytest tests/test_derive.py -v -o addopts=""`
Expected: FAIL mit `ModuleNotFoundError: No module named 'custom_components.fenstertage.derive'`.

- [ ] **Step 4: derive.py implementieren**

`custom_components/fenstertage/derive.py`:

```python
"""Pure derivations over YearMetrics — no Home Assistant imports.

Everything here is deterministic in (data, today) so the sensors stay
trivially thin and the midnight re-render needs no API call.
"""
from __future__ import annotations

import datetime as dt
from typing import Any

from .api import BridgeDayBlock, Holiday, YearMetrics


def upcoming_blocks(
    years: dict[int, YearMetrics], today: dt.date
) -> list[BridgeDayBlock]:
    """All blocks whose first vacation day is today or later, date-sorted."""
    blocks = [
        block
        for metrics in years.values()
        for block in metrics.blocks
        if block.vacation_dates[0] >= today
    ]
    return sorted(blocks, key=lambda b: b.vacation_dates[0])


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
    return max(
        blocks,
        key=lambda b: (b.efficiency, -b.vacation_dates[0].toordinal()),
    )


def workdays_remaining(metrics: YearMetrics, today: dt.date) -> int:
    """Mon–Fri non-holiday days from today (inclusive) to Dec 31."""
    holidays = {h.date for h in metrics.holidays}
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
    for metrics in years.values():
        for block in metrics.blocks:
            if block.free_range_start <= day <= block.free_range_end:
                return block
    return None


def holidays_in_years(years: dict[int, YearMetrics]) -> set[dt.date]:
    """Union of all holiday dates across the loaded years."""
    return {h.date for metrics in years.values() for h in metrics.holidays}


def block_as_dict(block: BridgeDayBlock) -> dict[str, Any]:
    """JSON-serialisable block representation (attributes + card)."""
    return {
        "block_id": block.block_id,
        "level": block.level,
        "vacation_dates": [d.isoformat() for d in block.vacation_dates],
        "vacation_day_weekdays": list(block.vacation_day_weekdays),
        "vacation_days": block.vacation_days,
        "free_days": block.free_days,
        "free_days_without_weekend": block.free_days_without_weekend,
        "efficiency": block.efficiency,
        "free_range_start": block.free_range_start.isoformat(),
        "free_range_end": block.free_range_end.isoformat(),
        "holidays": [
            {
                "date": h.date.isoformat(),
                "local_name": h.local_name,
                "name": h.name,
            }
            for h in block.holidays
        ],
    }
```

- [ ] **Step 5: Tests laufen lassen — müssen bestehen**

Run: `python -m pytest tests/test_derive.py tests/test_api.py tests/test_planner.py -v -o addopts=""`
Expected: alle Tests PASS.

- [ ] **Step 6: Commit**

```bash
git add custom_components/fenstertage/derive.py tests/common.py tests/test_derive.py
git commit -m "feat: derive.py — pure Ableitungen für Sensoren und Karte"
```

---

### Task 5: coordinator.py + __init__.py + conftest — Mehrjahres-Fetch und Entry-Lifecycle

**Files:**
- Create: `custom_components/fenstertage/coordinator.py`
- Modify: `custom_components/fenstertage/__init__.py` (Platzhalter ersetzen)
- Create: `tests/conftest.py`
- Test: `tests/test_coordinator.py`, `tests/test_init.py`

**Interfaces:**
- Consumes: `FenstertageApiClient`, Exceptions aus `api.py`; `PlannerStore` aus `planner.py`; Konstanten.
- Produces:
  - `FenstertageData` (dataclass, Feld `years: dict[int, YearMetrics]`)
  - `FenstertageRuntimeData` (dataclass, Felder `coordinator: FenstertageCoordinator`, `planner: PlannerStore`)
  - `type FenstertageConfigEntry = ConfigEntry[FenstertageRuntimeData]`
  - `FenstertageCoordinator(hass, entry)` mit `data: FenstertageData`
  - `__init__.py`: `async_setup`, `async_setup_entry` (setzt `entry.runtime_data`, registriert Device, Mitternachts-Tick), `async_unload_entry`, `async_remove_entry`, `PLATFORMS: list[Platform]` (hier noch `[]`, Tasks 7/8 erweitern)
  - conftest-Fixtures: `mock_config_entry` (AT, unique_id `AT_none`), `mock_api` (patcht `async_get_metrics`, liefert `make_metrics(year, ...)` pro angefragtem Jahr), `mock_metrics`

- [ ] **Step 1: conftest.py schreiben**

`tests/conftest.py`:

```python
"""Shared PHACC fixtures for the Fenstertage tests."""
from __future__ import annotations

from collections.abc import Generator
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.fenstertage.api import YearMetrics
from custom_components.fenstertage.const import (
    CONF_COUNTRY,
    CONF_SUBDIVISION,
    DOMAIN,
)
from tests.common import make_block, make_holiday, make_metrics


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations: None) -> None:
    """Enable loading custom integrations in all tests."""
    return


def default_metrics(year: int) -> YearMetrics:
    """Deterministic metrics for any requested year.

    2026 carries the 'interesting' fixtures (two blocks, two holidays),
    every other year gets one simple block so preview years are non-empty.
    """
    if year == 2026:
        return make_metrics(
            2026,
            blocks=(
                make_block("2026-05-15", efficiency=4.0),
                make_block(
                    "2026-12-28", vacation_days=3, efficiency=2.67, level=3
                ),
            ),
            holidays=(
                make_holiday("2026-05-14", "Christi Himmelfahrt"),
                make_holiday("2026-12-25", "Weihnachten"),
            ),
        )
    return make_metrics(
        year,
        blocks=(make_block(f"{year}-05-03", efficiency=3.0),),
        holidays=(make_holiday(f"{year}-05-01", "Staatsfeiertag"),),
    )


@pytest.fixture
def mock_api() -> Generator[AsyncMock]:
    """Patch the API client used by the coordinator."""

    async def _get(
        country: str,
        year: int,
        subdivision: str | None = None,
        max_level: int = 5,
    ) -> YearMetrics:
        return default_metrics(year)

    with patch(
        "custom_components.fenstertage.coordinator."
        "FenstertageApiClient.async_get_metrics",
        side_effect=_get,
    ) as mock:
        yield mock


@pytest.fixture
def mock_config_entry() -> MockConfigEntry:
    """AT entry without subdivision, default options."""
    return MockConfigEntry(
        domain=DOMAIN,
        title="Fenstertage AT",
        data={CONF_COUNTRY: "AT", CONF_SUBDIVISION: None},
        options={},
        unique_id="AT_none",
        entry_id="test_entry_at",
    )


async def setup_entry(hass: Any, entry: MockConfigEntry) -> None:
    """Add + fully set up a config entry."""
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
```

- [ ] **Step 2: Failing Tests schreiben**

`tests/test_coordinator.py`:

```python
"""Coordinator tests: Mehrjahres-Fetch, Fehlerpolitik, Mitternachts-Tick."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from freezegun.api import FrozenDateTimeFactory
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
)

from custom_components.fenstertage.api import FenstertageConnectionError
from custom_components.fenstertage.const import CONF_PREVIEW_YEARS, DOMAIN
from tests.conftest import default_metrics, setup_entry


async def test_fetches_current_plus_preview_year(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to("2026-07-19")
    await setup_entry(hass, mock_config_entry)
    coordinator = mock_config_entry.runtime_data.coordinator
    assert set(coordinator.data.years) == {2026, 2027}
    assert mock_api.call_count == 2


async def test_preview_years_zero_fetches_only_current(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to("2026-07-19")
    hass.config_entries.async_update_entry(
        mock_config_entry, options={CONF_PREVIEW_YEARS: 0}
    )
    await setup_entry(hass, mock_config_entry)
    coordinator = mock_config_entry.runtime_data.coordinator
    assert set(coordinator.data.years) == {2026}
    assert mock_api.call_count == 1


async def test_current_year_failure_puts_entry_in_retry(
    hass: HomeAssistant,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to("2026-07-19")
    from unittest.mock import patch

    with patch(
        "custom_components.fenstertage.coordinator."
        "FenstertageApiClient.async_get_metrics",
        side_effect=FenstertageConnectionError("down"),
    ):
        mock_config_entry.add_to_hass(hass)
        await hass.config_entries.async_setup(mock_config_entry.entry_id)
        await hass.async_block_till_done()
    assert mock_config_entry.state is ConfigEntryState.SETUP_RETRY


async def test_preview_year_failure_keeps_previous_data(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to("2026-07-19")
    await setup_entry(hass, mock_config_entry)
    coordinator = mock_config_entry.runtime_data.coordinator
    assert 2027 in coordinator.data.years

    async def _flaky(
        country: str,
        year: int,
        subdivision: str | None = None,
        max_level: int = 5,
    ):
        if year == 2027:
            raise FenstertageConnectionError("preview down")
        return default_metrics(year)

    mock_api.side_effect = _flaky
    await coordinator.async_refresh()
    assert coordinator.last_update_success is True
    # Alte 2027er-Daten bleiben erhalten:
    assert 2027 in coordinator.data.years


async def test_midnight_tick_notifies_listeners_without_api_call(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to("2026-07-19 23:50:00+00:00")
    await setup_entry(hass, mock_config_entry)
    coordinator = mock_config_entry.runtime_data.coordinator
    calls_before = mock_api.call_count

    listener = MagicMock()
    unsub = coordinator.async_add_listener(listener)

    # Über Mitternacht (lokale Zeit) springen und den Zeit-Trigger feuern.
    freezer.move_to("2026-07-20 00:00:06+00:00")
    async_fire_time_changed(hass)
    await hass.async_block_till_done()

    assert listener.called
    assert mock_api.call_count == calls_before  # kein API-Call
    unsub()
```

`tests/test_init.py`:

```python
"""Entry-Lifecycle: setup, unload, remove (Store-Löschung), Device."""
from __future__ import annotations

import datetime as dt
from unittest.mock import AsyncMock

from freezegun.api import FrozenDateTimeFactory
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.fenstertage.const import DOMAIN, SOURCE_MANUAL
from tests.conftest import setup_entry


async def test_setup_and_unload(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to("2026-07-19")
    await setup_entry(hass, mock_config_entry)
    assert mock_config_entry.state is ConfigEntryState.LOADED
    assert mock_config_entry.runtime_data.coordinator.data is not None
    assert mock_config_entry.runtime_data.planner is not None

    assert await hass.config_entries.async_unload(mock_config_entry.entry_id)
    await hass.async_block_till_done()
    assert mock_config_entry.state is ConfigEntryState.NOT_LOADED


async def test_device_created(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to("2026-07-19")
    await setup_entry(hass, mock_config_entry)
    device = dr.async_get(hass).async_get_device(
        identifiers={(DOMAIN, mock_config_entry.entry_id)}
    )
    assert device is not None
    assert device.manufacturer == "fenstertage.com"
    assert device.entry_type is dr.DeviceEntryType.SERVICE


async def test_remove_entry_deletes_planner_store(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
    hass_storage: dict,
) -> None:
    freezer.move_to("2026-07-19")
    await setup_entry(hass, mock_config_entry)
    planner = mock_config_entry.runtime_data.planner
    await planner.async_add_item(
        start=dt.date(2026, 8, 3),
        end=dt.date(2026, 8, 4),
        holidays=set(),
        source=SOURCE_MANUAL,
    )
    storage_key = f"{DOMAIN}.{mock_config_entry.entry_id}"
    assert storage_key in hass_storage

    await hass.config_entries.async_remove(mock_config_entry.entry_id)
    await hass.async_block_till_done()
    assert storage_key not in hass_storage
```

- [ ] **Step 3: Tests laufen lassen — müssen fehlschlagen**

Run: `python -m pytest tests/test_coordinator.py tests/test_init.py -v -o addopts=""`
Expected: FAIL (`ImportError` / Setup schlägt fehl, da coordinator.py fehlt und `__init__.py` noch Platzhalter ist).

- [ ] **Step 4: coordinator.py implementieren**

`custom_components/fenstertage/coordinator.py`:

```python
"""DataUpdateCoordinator for Fenstertage — one API call per year."""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import timedelta
from typing import TYPE_CHECKING

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import (
    DataUpdateCoordinator,
    UpdateFailed,
)
from homeassistant.util import dt as dt_util

from .api import FenstertageApiClient, FenstertageApiError, YearMetrics
from .const import (
    CONF_COUNTRY,
    CONF_MAX_LEVEL,
    CONF_PREVIEW_YEARS,
    CONF_SUBDIVISION,
    CONF_UPDATE_INTERVAL_HOURS,
    DEFAULT_MAX_LEVEL,
    DEFAULT_PREVIEW_YEARS,
    DEFAULT_UPDATE_INTERVAL_HOURS,
    DOMAIN,
    MAX_UPDATE_INTERVAL_HOURS,
    MIN_UPDATE_INTERVAL_HOURS,
)

if TYPE_CHECKING:
    from .planner import PlannerStore

_LOGGER = logging.getLogger(__name__)


@dataclass
class FenstertageData:
    """Coordinator payload: metrics per loaded year."""

    years: dict[int, YearMetrics]


@dataclass
class FenstertageRuntimeData:
    """Everything a loaded entry carries at runtime."""

    coordinator: FenstertageCoordinator
    planner: PlannerStore


type FenstertageConfigEntry = ConfigEntry[FenstertageRuntimeData]


class FenstertageCoordinator(DataUpdateCoordinator[FenstertageData]):
    """Fetch /api/metrics for the current + configured preview years."""

    config_entry: FenstertageConfigEntry

    def __init__(
        self, hass: HomeAssistant, entry: FenstertageConfigEntry
    ) -> None:
        config = {**entry.data, **entry.options}
        self._country: str = str(config[CONF_COUNTRY])
        self._subdivision: str | None = config.get(CONF_SUBDIVISION) or None
        self._max_level: int = int(
            config.get(CONF_MAX_LEVEL, DEFAULT_MAX_LEVEL)
        )
        self._preview_years: int = int(
            config.get(CONF_PREVIEW_YEARS, DEFAULT_PREVIEW_YEARS)
        )
        hours = min(
            MAX_UPDATE_INTERVAL_HOURS,
            max(
                MIN_UPDATE_INTERVAL_HOURS,
                int(
                    config.get(
                        CONF_UPDATE_INTERVAL_HOURS,
                        DEFAULT_UPDATE_INTERVAL_HOURS,
                    )
                ),
            ),
        )
        self.client = FenstertageApiClient(async_get_clientsession(hass))
        super().__init__(
            hass,
            _LOGGER,
            config_entry=entry,
            name=DOMAIN,
            update_interval=timedelta(hours=hours),
        )

    async def _async_update_data(self) -> FenstertageData:
        """Fetch every wanted year; preview-year failures are non-fatal."""
        current_year = dt_util.now().date().year
        wanted = [
            current_year + offset for offset in range(self._preview_years + 1)
        ]
        previous = self.data.years if self.data else {}
        years: dict[int, YearMetrics] = {}
        for year in wanted:
            try:
                years[year] = await self.client.async_get_metrics(
                    self._country,
                    year,
                    subdivision=self._subdivision,
                    max_level=self._max_level,
                )
            except FenstertageApiError as err:
                if year == current_year:
                    raise UpdateFailed(
                        translation_domain=DOMAIN,
                        translation_key="update_failed",
                        translation_placeholders={
                            "year": str(year),
                            "error": str(err),
                        },
                    ) from err
                if year in previous:
                    _LOGGER.warning(
                        "Preview year %s failed (%s); keeping stale data",
                        year,
                        err,
                    )
                    years[year] = previous[year]
                else:
                    _LOGGER.warning("Preview year %s failed (%s)", year, err)
        return FenstertageData(years=years)
```

- [ ] **Step 5: __init__.py implementieren (Platzhalter ersetzen)**

`custom_components/fenstertage/__init__.py` (kompletter neuer Inhalt):

```python
"""Fenstertage integration for Home Assistant (fenstertage.com)."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.event import async_track_time_change

from .const import CONF_VACATION_BUDGET, DEFAULT_VACATION_BUDGET, DOMAIN
from .coordinator import (
    FenstertageConfigEntry,
    FenstertageCoordinator,
    FenstertageRuntimeData,
)
from .planner import PlannerStore

_LOGGER = logging.getLogger(__name__)

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

# Task 7/8 erweitern das um SENSOR / BINARY_SENSOR.
PLATFORMS: list[Platform] = []


async def async_setup(hass: HomeAssistant, config: dict[str, Any]) -> bool:
    """Domain-level setup. Services (Task 9) und Karte (Task 11) docken hier an."""
    return True


async def async_setup_entry(
    hass: HomeAssistant, entry: FenstertageConfigEntry
) -> bool:
    """Set up one country/region entry."""
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
        coordinator=coordinator, planner=planner
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
        # Tageswechsel: abgeleitete Zustände (holiday_today, next_bridge_day)
        # aus dem Cache neu rechnen — bewusst KEIN API-Call.
        coordinator.async_update_listeners()

    entry.async_on_unload(
        async_track_time_change(
            hass, _midnight_tick, hour=0, minute=0, second=5
        )
    )

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_reload_entry))
    return True


async def _async_reload_entry(
    hass: HomeAssistant, entry: FenstertageConfigEntry
) -> None:
    """Reload the entry when options change."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(
    hass: HomeAssistant, entry: FenstertageConfigEntry
) -> bool:
    """Unload a config entry."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def async_remove_entry(
    hass: HomeAssistant, entry: FenstertageConfigEntry
) -> None:
    """Drop the planner store when the entry is removed."""
    planner = PlannerStore(
        hass, entry.entry_id, default_budget=DEFAULT_VACATION_BUDGET
    )
    await planner.async_remove()
```

- [ ] **Step 6: Tests laufen lassen — müssen bestehen**

Run: `python -m pytest tests/test_coordinator.py tests/test_init.py -v -o addopts=""`
Expected: alle Tests PASS.

- [ ] **Step 7: Commit**

```bash
git add custom_components/fenstertage/coordinator.py custom_components/fenstertage/__init__.py tests/conftest.py tests/test_coordinator.py tests/test_init.py
git commit -m "feat: Coordinator mit Mehrjahres-Fetch und Entry-Lifecycle"
```

---

### Task 6: config_flow.py + strings.json + translations

**Files:**
- Create: `custom_components/fenstertage/config_flow.py`
- Create: `custom_components/fenstertage/strings.json`
- Create: `custom_components/fenstertage/translations/en.json`, `custom_components/fenstertage/translations/de.json`
- Modify: `custom_components/fenstertage/const.py` (eine Konstante ergänzen)
- Test: `tests/test_config_flow.py`

**Interfaces:**
- Consumes: `FenstertageApiClient` (Validierungs-Call), Konstanten, `SUBDIVISIONS`.
- Produces:
  - `FenstertageConfigFlow` (Steps `user` → optional `subdivision`), `FenstertageOptionsFlow` (Step `init`)
  - Entry: `data={CONF_COUNTRY, CONF_SUBDIVISION}`, `options={CONF_MAX_LEVEL, CONF_PREVIEW_YEARS, CONF_UPDATE_INTERVAL_HOURS, CONF_VACATION_BUDGET}` (Options erst nach OptionsFlow-Save gefüllt; Coordinator/Setup nutzen Defaults)
  - `const.py` neu: `SUBDIVISION_NATIONWIDE = "nationwide"` (Sentinel für "landesweit" im Dropdown)
  - unique_id: `f"{country}_{subdivision or 'none'}"`; Titel `f"Fenstertage {subdivision or country}"`

- [ ] **Step 1: Failing Tests schreiben**

`tests/test_config_flow.py`:

```python
"""Config- und Options-Flow-Tests."""
from __future__ import annotations

from unittest.mock import patch

from homeassistant.config_entries import SOURCE_USER
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.fenstertage.const import (
    CONF_COUNTRY,
    CONF_MAX_LEVEL,
    CONF_PREVIEW_YEARS,
    CONF_SUBDIVISION,
    CONF_UPDATE_INTERVAL_HOURS,
    CONF_VACATION_BUDGET,
    DOMAIN,
    SUBDIVISION_NATIONWIDE,
)
from custom_components.fenstertage.api import FenstertageConnectionError
from tests.conftest import default_metrics


def _patch_probe(**kwargs):
    """Patch den Validierungs-Call des Config Flows."""
    return patch(
        "custom_components.fenstertage.config_flow."
        "FenstertageApiClient.async_get_metrics",
        **kwargs,
    )


def _patch_setup():
    return patch(
        "custom_components.fenstertage.async_setup_entry", return_value=True
    )


async def test_at_flow_creates_entry_without_subdivision(
    hass: HomeAssistant,
) -> None:
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"

    with (
        _patch_probe(return_value=default_metrics(2026)) as probe,
        _patch_setup(),
    ):
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"], {CONF_COUNTRY: "AT"}
        )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Fenstertage AT"
    assert result["data"] == {CONF_COUNTRY: "AT", CONF_SUBDIVISION: None}
    assert result["result"].unique_id == "AT_none"
    assert probe.called


async def test_de_flow_asks_for_subdivision(hass: HomeAssistant) -> None:
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_COUNTRY: "DE"}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "subdivision"

    with _patch_probe(return_value=default_metrics(2026)), _patch_setup():
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"], {CONF_SUBDIVISION: "DE-BY"}
        )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Fenstertage DE-BY"
    assert result["data"] == {CONF_COUNTRY: "DE", CONF_SUBDIVISION: "DE-BY"}
    assert result["result"].unique_id == "DE_DE-BY"


async def test_de_flow_nationwide_maps_to_none(hass: HomeAssistant) -> None:
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_COUNTRY: "DE"}
    )
    with _patch_probe(return_value=default_metrics(2026)), _patch_setup():
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"], {CONF_SUBDIVISION: SUBDIVISION_NATIONWIDE}
        )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["data"] == {CONF_COUNTRY: "DE", CONF_SUBDIVISION: None}
    assert result["result"].unique_id == "DE_none"


async def test_duplicate_entry_aborts(hass: HomeAssistant) -> None:
    MockConfigEntry(
        domain=DOMAIN,
        data={CONF_COUNTRY: "AT", CONF_SUBDIVISION: None},
        unique_id="AT_none",
    ).add_to_hass(hass)
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    with _patch_probe(return_value=default_metrics(2026)):
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"], {CONF_COUNTRY: "AT"}
        )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "already_configured"


async def test_cannot_connect_shows_error_then_recovers(
    hass: HomeAssistant,
) -> None:
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    with _patch_probe(side_effect=FenstertageConnectionError("down")):
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"], {CONF_COUNTRY: "AT"}
        )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": "cannot_connect"}

    with _patch_probe(return_value=default_metrics(2026)), _patch_setup():
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"], {CONF_COUNTRY: "AT"}
        )
    assert result["type"] is FlowResultType.CREATE_ENTRY


async def test_options_flow_roundtrip(
    hass: HomeAssistant,
    mock_api,
    mock_config_entry: MockConfigEntry,
    freezer,
) -> None:
    freezer.move_to("2026-07-19")
    from tests.conftest import setup_entry

    await setup_entry(hass, mock_config_entry)
    result = await hass.config_entries.options.async_init(
        mock_config_entry.entry_id
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "init"

    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        {
            CONF_MAX_LEVEL: 3,
            CONF_PREVIEW_YEARS: 2,
            CONF_UPDATE_INTERVAL_HOURS: 6,
            CONF_VACATION_BUDGET: 30,
        },
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert mock_config_entry.options == {
        CONF_MAX_LEVEL: 3,
        CONF_PREVIEW_YEARS: 2,
        CONF_UPDATE_INTERVAL_HOURS: 6,
        CONF_VACATION_BUDGET: 30,
    }
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `python -m pytest tests/test_config_flow.py -v -o addopts=""`
Expected: FAIL (config_flow.py existiert nicht → Flow kann nicht initialisiert werden).

- [ ] **Step 3: const.py ergänzen**

In `custom_components/fenstertage/const.py` nach dem `SUBDIVISIONS`-Block einfügen:

```python
# Dropdown-Sentinel im Config Flow für "landesweit" (kein Subdivision-Filter).
SUBDIVISION_NATIONWIDE = "nationwide"
```

- [ ] **Step 4: config_flow.py implementieren**

`custom_components/fenstertage/config_flow.py`:

```python
"""Config flow for Fenstertage.

Two steps: pick a country; for DE/CH additionally pick a subdivision
(or nationwide). A real /api/metrics probe runs before the entry is
created (Quality-Scale rule test-before-configure).
"""
from __future__ import annotations

import logging
from collections.abc import Mapping
from typing import Any

import voluptuous as vol
from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.core import callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.selector import (
    NumberSelector,
    NumberSelectorConfig,
    NumberSelectorMode,
    SelectOptionDict,
    SelectSelector,
    SelectSelectorConfig,
    SelectSelectorMode,
)
from homeassistant.util import dt as dt_util

from .api import FenstertageApiClient, FenstertageApiError, FenstertageConnectionError
from .const import (
    CONF_COUNTRY,
    CONF_MAX_LEVEL,
    CONF_PREVIEW_YEARS,
    CONF_SUBDIVISION,
    CONF_UPDATE_INTERVAL_HOURS,
    CONF_VACATION_BUDGET,
    COUNTRIES,
    DEFAULT_MAX_LEVEL,
    DEFAULT_PREVIEW_YEARS,
    DEFAULT_UPDATE_INTERVAL_HOURS,
    DEFAULT_VACATION_BUDGET,
    DOMAIN,
    MAX_UPDATE_INTERVAL_HOURS,
    MAX_VACATION_BUDGET,
    MIN_UPDATE_INTERVAL_HOURS,
    SUBDIVISION_NATIONWIDE,
    SUBDIVISIONS,
)

_LOGGER = logging.getLogger(__name__)


def _options_schema(defaults: Mapping[str, Any]) -> vol.Schema:
    return vol.Schema(
        {
            vol.Required(
                CONF_MAX_LEVEL,
                default=defaults.get(CONF_MAX_LEVEL, DEFAULT_MAX_LEVEL),
            ): NumberSelector(
                NumberSelectorConfig(
                    min=1, max=5, step=1, mode=NumberSelectorMode.SLIDER
                )
            ),
            vol.Required(
                CONF_PREVIEW_YEARS,
                default=defaults.get(
                    CONF_PREVIEW_YEARS, DEFAULT_PREVIEW_YEARS
                ),
            ): NumberSelector(
                NumberSelectorConfig(
                    min=0, max=3, step=1, mode=NumberSelectorMode.SLIDER
                )
            ),
            vol.Required(
                CONF_UPDATE_INTERVAL_HOURS,
                default=defaults.get(
                    CONF_UPDATE_INTERVAL_HOURS, DEFAULT_UPDATE_INTERVAL_HOURS
                ),
            ): NumberSelector(
                NumberSelectorConfig(
                    min=MIN_UPDATE_INTERVAL_HOURS,
                    max=MAX_UPDATE_INTERVAL_HOURS,
                    step=1,
                    unit_of_measurement="h",
                    mode=NumberSelectorMode.BOX,
                )
            ),
            vol.Required(
                CONF_VACATION_BUDGET,
                default=defaults.get(
                    CONF_VACATION_BUDGET, DEFAULT_VACATION_BUDGET
                ),
            ): NumberSelector(
                NumberSelectorConfig(
                    min=0,
                    max=MAX_VACATION_BUDGET,
                    step=1,
                    mode=NumberSelectorMode.BOX,
                )
            ),
        }
    )


class FenstertageConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle the Fenstertage config flow."""

    VERSION = 1
    MINOR_VERSION = 1

    def __init__(self) -> None:
        self._country: str = "AT"

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: ConfigEntry,
    ) -> FenstertageOptionsFlow:
        """Return the options flow handler."""
        return FenstertageOptionsFlow()

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Step 1 — pick the country."""
        errors: dict[str, str] = {}
        if user_input is not None:
            self._country = str(user_input[CONF_COUNTRY])
            if SUBDIVISIONS[self._country]:
                return await self.async_step_subdivision()
            result = await self._async_try_create(None, errors)
            if result is not None:
                return result

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_COUNTRY, default="AT"): SelectSelector(
                        SelectSelectorConfig(
                            options=[
                                SelectOptionDict(value=c, label=c)
                                for c in COUNTRIES
                            ],
                            mode=SelectSelectorMode.DROPDOWN,
                            translation_key="country",
                        )
                    )
                }
            ),
            errors=errors,
        )

    async def async_step_subdivision(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Step 2 (nur DE/CH) — pick subdivision or nationwide."""
        errors: dict[str, str] = {}
        if user_input is not None:
            raw = str(user_input.get(CONF_SUBDIVISION, ""))
            subdivision = None if raw == SUBDIVISION_NATIONWIDE else raw
            result = await self._async_try_create(subdivision, errors)
            if result is not None:
                return result

        options = [
            SelectOptionDict(
                value=SUBDIVISION_NATIONWIDE, label=SUBDIVISION_NATIONWIDE
            )
        ] + [
            SelectOptionDict(value=code, label=code)
            for code in SUBDIVISIONS[self._country]
        ]
        return self.async_show_form(
            step_id="subdivision",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_SUBDIVISION, default=SUBDIVISION_NATIONWIDE
                    ): SelectSelector(
                        SelectSelectorConfig(
                            options=options,
                            mode=SelectSelectorMode.DROPDOWN,
                            translation_key="subdivision",
                        )
                    )
                }
            ),
            errors=errors,
            description_placeholders={"country": self._country},
        )

    async def _async_try_create(
        self, subdivision: str | None, errors: dict[str, str]
    ) -> ConfigFlowResult | None:
        """unique_id + Live-Probe; None = Fehler (errors befüllt)."""
        await self.async_set_unique_id(
            f"{self._country}_{subdivision or 'none'}"
        )
        self._abort_if_unique_id_configured()

        client = FenstertageApiClient(async_get_clientsession(self.hass))
        try:
            await client.async_get_metrics(
                self._country, dt_util.now().date().year, subdivision
            )
        except FenstertageConnectionError:
            errors["base"] = "cannot_connect"
            return None
        except FenstertageApiError:
            errors["base"] = "unknown"
            return None

        return self.async_create_entry(
            title=f"Fenstertage {subdivision or self._country}",
            data={
                CONF_COUNTRY: self._country,
                CONF_SUBDIVISION: subdivision,
            },
        )


class FenstertageOptionsFlow(OptionsFlow):
    """Options: max_level, preview_years, update interval, budget."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Show / save the options form."""
        if user_input is not None:
            return self.async_create_entry(
                data={
                    CONF_MAX_LEVEL: int(user_input[CONF_MAX_LEVEL]),
                    CONF_PREVIEW_YEARS: int(user_input[CONF_PREVIEW_YEARS]),
                    CONF_UPDATE_INTERVAL_HOURS: int(
                        user_input[CONF_UPDATE_INTERVAL_HOURS]
                    ),
                    CONF_VACATION_BUDGET: int(
                        user_input[CONF_VACATION_BUDGET]
                    ),
                }
            )
        config = {**self.config_entry.data, **self.config_entry.options}
        return self.async_show_form(
            step_id="init", data_schema=_options_schema(config)
        )
```

- [ ] **Step 5: strings.json + translations schreiben**

`custom_components/fenstertage/strings.json` (Englisch = Quelle):

```json
{
  "config": {
    "step": {
      "user": {
        "title": "Choose country",
        "data": {
          "country": "Country"
        },
        "data_description": {
          "country": "Public holidays and bridge days are calculated for this country."
        }
      },
      "subdivision": {
        "title": "Choose region",
        "description": "Some holidays in {country} differ per region. Pick a region or nationwide.",
        "data": {
          "subdivision": "Region"
        }
      }
    },
    "error": {
      "cannot_connect": "Could not reach fenstertage.com. Check your internet connection.",
      "unknown": "Unexpected response from fenstertage.com."
    },
    "abort": {
      "already_configured": "This country/region combination is already configured."
    }
  },
  "options": {
    "step": {
      "init": {
        "title": "Fenstertage options",
        "data": {
          "max_level": "Maximum suggestion level (vacation days per block)",
          "preview_years": "Preview years to preload",
          "update_interval_hours": "Update interval (hours)",
          "vacation_budget": "Yearly vacation budget (days)"
        }
      }
    }
  },
  "selector": {
    "country": {
      "options": {
        "AT": "Austria",
        "DE": "Germany",
        "CH": "Switzerland"
      }
    },
    "subdivision": {
      "options": {
        "nationwide": "Nationwide (no region filter)"
      }
    }
  },
  "entity": {
    "sensor": {
      "next_bridge_day": { "name": "Next bridge day" },
      "best_bridge_day": { "name": "Best bridge day" },
      "workdays_remaining": { "name": "Workdays remaining" },
      "holidays_this_year": { "name": "Holidays this year" },
      "vacation_budget": { "name": "Vacation budget remaining" }
    },
    "binary_sensor": {
      "holiday_today": { "name": "Holiday today" },
      "bridge_day_today": { "name": "Bridge day today" }
    }
  },
  "services": {
    "plan_bridge_day": {
      "name": "Plan bridge day",
      "description": "Marks one suggested bridge-day block as planned vacation.",
      "fields": {
        "config_entry_id": { "name": "Entry", "description": "The Fenstertage entry to plan against." },
        "block_id": { "name": "Block ID", "description": "The block_id from the sensor attributes." }
      }
    },
    "plan_vacation": {
      "name": "Plan vacation",
      "description": "Plans a free date range as vacation. Weekends and holidays are excluded automatically.",
      "fields": {
        "config_entry_id": { "name": "Entry", "description": "The Fenstertage entry to plan against." },
        "start": { "name": "Start", "description": "First day of the range." },
        "end": { "name": "End", "description": "Last day of the range." }
      }
    },
    "remove_vacation": {
      "name": "Remove vacation",
      "description": "Removes one planned vacation item.",
      "fields": {
        "config_entry_id": { "name": "Entry", "description": "The Fenstertage entry." },
        "item_id": { "name": "Item ID", "description": "The id of the planned item." }
      }
    },
    "set_budget": {
      "name": "Set budget",
      "description": "Sets the vacation budget for one year.",
      "fields": {
        "config_entry_id": { "name": "Entry", "description": "The Fenstertage entry." },
        "year": { "name": "Year", "description": "Calendar year." },
        "days": { "name": "Days", "description": "Vacation days available in that year." }
      }
    }
  },
  "exceptions": {
    "update_failed": {
      "message": "Fetching fenstertage.com data for {year} failed: {error}"
    },
    "invalid_range": {
      "message": "End date must not be before start date."
    },
    "range_too_long": {
      "message": "Vacation ranges are limited to {max_days} days."
    },
    "overlapping_vacation": {
      "message": "The range overlaps an existing plan ({start} – {end})."
    },
    "no_vacation_days": {
      "message": "The range contains no workdays — nothing to plan."
    },
    "unknown_item": {
      "message": "No planned vacation with id {item_id}."
    },
    "unknown_block": {
      "message": "No bridge-day block with id {block_id} in the loaded years."
    },
    "unknown_entry": {
      "message": "Unknown or not loaded Fenstertage entry: {entry_id}."
    },
    "year_not_loaded": {
      "message": "No holiday data loaded for {year}. Increase the preview years option."
    }
  }
}
```

`custom_components/fenstertage/translations/en.json`: exakte Kopie von `strings.json`.

`custom_components/fenstertage/translations/de.json`: gleiche Struktur, deutsche Texte:

```json
{
  "config": {
    "step": {
      "user": {
        "title": "Land wählen",
        "data": {
          "country": "Land"
        },
        "data_description": {
          "country": "Feiertage und Fenstertage werden für dieses Land berechnet."
        }
      },
      "subdivision": {
        "title": "Region wählen",
        "description": "Manche Feiertage in {country} gelten nur regional. Wähle eine Region oder landesweit.",
        "data": {
          "subdivision": "Region"
        }
      }
    },
    "error": {
      "cannot_connect": "fenstertage.com ist nicht erreichbar. Prüfe deine Internetverbindung.",
      "unknown": "Unerwartete Antwort von fenstertage.com."
    },
    "abort": {
      "already_configured": "Diese Land/Region-Kombination ist bereits eingerichtet."
    }
  },
  "options": {
    "step": {
      "init": {
        "title": "Fenstertage-Optionen",
        "data": {
          "max_level": "Maximales Vorschlags-Level (Urlaubstage pro Block)",
          "preview_years": "Vorschau-Jahre vorladen",
          "update_interval_hours": "Aktualisierungsintervall (Stunden)",
          "vacation_budget": "Jahresurlaub (Tage)"
        }
      }
    }
  },
  "selector": {
    "country": {
      "options": {
        "AT": "Österreich",
        "DE": "Deutschland",
        "CH": "Schweiz"
      }
    },
    "subdivision": {
      "options": {
        "nationwide": "Landesweit (kein Regionsfilter)"
      }
    }
  },
  "entity": {
    "sensor": {
      "next_bridge_day": { "name": "Nächster Fenstertag" },
      "best_bridge_day": { "name": "Bester Fenstertag" },
      "workdays_remaining": { "name": "Verbleibende Werktage" },
      "holidays_this_year": { "name": "Feiertage dieses Jahr" },
      "vacation_budget": { "name": "Resturlaub" }
    },
    "binary_sensor": {
      "holiday_today": { "name": "Heute Feiertag" },
      "bridge_day_today": { "name": "Heute Fenstertag" }
    }
  },
  "services": {
    "plan_bridge_day": {
      "name": "Fenstertag planen",
      "description": "Markiert einen vorgeschlagenen Fenstertag-Block als geplanten Urlaub.",
      "fields": {
        "config_entry_id": { "name": "Eintrag", "description": "Der Fenstertage-Eintrag, für den geplant wird." },
        "block_id": { "name": "Block-ID", "description": "Die block_id aus den Sensor-Attributen." }
      }
    },
    "plan_vacation": {
      "name": "Urlaub planen",
      "description": "Plant einen freien Datumsbereich als Urlaub. Wochenenden und Feiertage werden automatisch ausgenommen.",
      "fields": {
        "config_entry_id": { "name": "Eintrag", "description": "Der Fenstertage-Eintrag, für den geplant wird." },
        "start": { "name": "Beginn", "description": "Erster Tag des Bereichs." },
        "end": { "name": "Ende", "description": "Letzter Tag des Bereichs." }
      }
    },
    "remove_vacation": {
      "name": "Urlaub entfernen",
      "description": "Entfernt eine geplante Urlaubsbuchung.",
      "fields": {
        "config_entry_id": { "name": "Eintrag", "description": "Der Fenstertage-Eintrag." },
        "item_id": { "name": "Eintrags-ID", "description": "Die id der geplanten Buchung." }
      }
    },
    "set_budget": {
      "name": "Budget setzen",
      "description": "Setzt das Urlaubsbudget für ein Jahr.",
      "fields": {
        "config_entry_id": { "name": "Eintrag", "description": "Der Fenstertage-Eintrag." },
        "year": { "name": "Jahr", "description": "Kalenderjahr." },
        "days": { "name": "Tage", "description": "Verfügbare Urlaubstage in diesem Jahr." }
      }
    }
  },
  "exceptions": {
    "update_failed": {
      "message": "Abruf der fenstertage.com-Daten für {year} fehlgeschlagen: {error}"
    },
    "invalid_range": {
      "message": "Das Enddatum darf nicht vor dem Beginn liegen."
    },
    "range_too_long": {
      "message": "Urlaubsbereiche sind auf {max_days} Tage begrenzt."
    },
    "overlapping_vacation": {
      "message": "Der Bereich überschneidet sich mit einer bestehenden Planung ({start} – {end})."
    },
    "no_vacation_days": {
      "message": "Der Bereich enthält keine Werktage — nichts zu planen."
    },
    "unknown_item": {
      "message": "Keine geplante Buchung mit der id {item_id}."
    },
    "unknown_block": {
      "message": "Kein Fenstertag-Block mit der id {block_id} in den geladenen Jahren."
    },
    "unknown_entry": {
      "message": "Unbekannter oder nicht geladener Fenstertage-Eintrag: {entry_id}."
    },
    "year_not_loaded": {
      "message": "Für {year} sind keine Feiertagsdaten geladen. Erhöhe die Option Vorschau-Jahre."
    }
  }
}
```

- [ ] **Step 6: Tests laufen lassen — müssen bestehen**

Run: `python -m pytest tests/test_config_flow.py -v -o addopts=""`
Expected: alle Tests PASS.

- [ ] **Step 7: Commit**

```bash
git add custom_components/fenstertage/config_flow.py custom_components/fenstertage/strings.json custom_components/fenstertage/translations custom_components/fenstertage/const.py tests/test_config_flow.py
git commit -m "feat: Config- und Options-Flow mit Live-Validierung und Übersetzungen"
```

---

### Task 7: entity.py + sensor.py — die fünf Sensoren

**Files:**
- Create: `custom_components/fenstertage/entity.py`
- Create: `custom_components/fenstertage/sensor.py`
- Create: `custom_components/fenstertage/icons.json`
- Modify: `custom_components/fenstertage/__init__.py` (PLATFORMS erweitern)
- Test: `tests/test_sensor.py`

**Interfaces:**
- Consumes: `derive.py`-Funktionen, `FenstertageEntity`, `runtime_data.planner`.
- Produces:
  - `FenstertageEntity(coordinator, entry, key)` — Basisklasse mit `unique_id = f"{entry.entry_id}_{key}"`, `translation_key = key`, Device-Info.
  - Sensor-Keys (= translation_keys, von Karte/Tests referenziert): `next_bridge_day`, `best_bridge_day`, `workdays_remaining`, `holidays_this_year`, `vacation_budget`.
  - Attribut-Schema von `next_bridge_day` (Karte liest exakt das):
    `config_entry_id`, `days_until`, `block` (block_as_dict), `blocks` (kommende Blöcke aller Jahre), `years` = `{ "<jahr>": { "holidays": [{date, local_name}], "blocks": [block_as_dict] } }` (für den Jahres-Grid der Karte, inkl. vergangener Blöcke).
  - Attribut-Schema von `vacation_budget`: `config_entry_id` + `planner.as_attributes(year)` (`budget_total`, `planned_days`, `planned_items`, `budgets`).

- [ ] **Step 1: Failing Tests schreiben**

`tests/test_sensor.py`:

```python
"""Sensor-Plattform-Tests."""
from __future__ import annotations

import datetime as dt
from unittest.mock import AsyncMock

from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.fenstertage.const import DOMAIN, SOURCE_MANUAL
from tests.conftest import setup_entry


def _state(hass: HomeAssistant, entry: MockConfigEntry, key: str):
    entity_id = er.async_get(hass).async_get_entity_id(
        "sensor", DOMAIN, f"{entry.entry_id}_{key}"
    )
    assert entity_id is not None, f"sensor {key} nicht registriert"
    return hass.states.get(entity_id)


async def test_next_bridge_day(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to("2026-07-19")
    await setup_entry(hass, mock_config_entry)
    state = _state(hass, mock_config_entry, "next_bridge_day")
    # Kommende Blöcke ab 2026-07-19: 2026-12-28 (3d) und 2027-05-03.
    assert state.state == "2026-12-28"
    assert state.attributes["days_until"] == 162
    assert state.attributes["block"]["block_id"] == "2026-12-28_3d"
    assert [b["block_id"] for b in state.attributes["blocks"]] == [
        "2026-12-28_3d",
        "2027-05-03_1d",
    ]
    assert state.attributes["config_entry_id"] == mock_config_entry.entry_id
    # years-Attribut enthält beide Jahre mit Feiertagen + allen Blöcken:
    years = state.attributes["years"]
    assert set(years) == {"2026", "2027"}
    assert years["2026"]["holidays"][0]["date"] == "2026-05-14"
    assert len(years["2026"]["blocks"]) == 2  # inkl. vergangener Block


async def test_best_bridge_day_prefers_efficiency(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to("2026-07-19")
    await setup_entry(hass, mock_config_entry)
    state = _state(hass, mock_config_entry, "best_bridge_day")
    # 2027-05-03 hat efficiency 3.0 > 2.67 des Dezember-Blocks.
    assert state.state == "2027-05-03"
    assert state.attributes["block"]["efficiency"] == 3.0


async def test_workdays_remaining(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    # Mo 2026-12-28: verbleibende Werktage Mo–Do 28.–31.12. = 4
    freezer.move_to("2026-12-28")
    await setup_entry(hass, mock_config_entry)
    state = _state(hass, mock_config_entry, "workdays_remaining")
    assert state.state == "4"
    assert state.attributes["workdays_total"] == 250


async def test_holidays_this_year(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to("2026-07-19")
    await setup_entry(hass, mock_config_entry)
    state = _state(hass, mock_config_entry, "holidays_this_year")
    assert state.state == "2"
    assert state.attributes["next_holiday"] == "Weihnachten"
    assert state.attributes["next_holiday_date"] == "2026-12-25"
    assert len(state.attributes["holidays"]) == 2


async def test_vacation_budget_reacts_to_planner(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to("2026-07-19")
    await setup_entry(hass, mock_config_entry)
    state = _state(hass, mock_config_entry, "vacation_budget")
    assert state.state == "25"
    assert state.attributes["budget_total"] == 25
    assert state.attributes["planned_days"] == 0

    runtime = mock_config_entry.runtime_data
    await runtime.planner.async_add_item(
        start=dt.date(2026, 8, 3),
        end=dt.date(2026, 8, 7),
        holidays=set(),
        source=SOURCE_MANUAL,
    )
    runtime.coordinator.async_update_listeners()
    await hass.async_block_till_done()

    state = _state(hass, mock_config_entry, "vacation_budget")
    assert state.state == "20"
    assert state.attributes["planned_days"] == 5
    assert len(state.attributes["planned_items"]) == 1
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `python -m pytest tests/test_sensor.py -v -o addopts=""`
Expected: FAIL — Sensoren nicht registriert (Plattform existiert nicht).

- [ ] **Step 3: entity.py implementieren**

`custom_components/fenstertage/entity.py`:

```python
"""Base entity for Fenstertage."""
from __future__ import annotations

from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import ATTRIBUTION, DOMAIN
from .coordinator import FenstertageConfigEntry, FenstertageCoordinator


class FenstertageEntity(CoordinatorEntity[FenstertageCoordinator]):
    """Common base: device info, unique_id, translation_key."""

    _attr_has_entity_name = True
    _attr_attribution = ATTRIBUTION

    def __init__(
        self,
        coordinator: FenstertageCoordinator,
        entry: FenstertageConfigEntry,
        key: str,
    ) -> None:
        super().__init__(coordinator)
        self._entry = entry
        # KEEP THIS FORMAT STABLE — changes wipe existing registry rows.
        self._attr_unique_id = f"{entry.entry_id}_{key}"
        self._attr_translation_key = key
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=entry.title,
            manufacturer="fenstertage.com",
            entry_type=DeviceEntryType.SERVICE,
            configuration_url="https://fenstertage.com",
        )
```

- [ ] **Step 4: sensor.py implementieren**

`custom_components/fenstertage/sensor.py`:

```python
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
```

- [ ] **Step 5: icons.json schreiben + PLATFORMS erweitern**

`custom_components/fenstertage/icons.json`:

```json
{
  "entity": {
    "sensor": {
      "next_bridge_day": { "default": "mdi:calendar-star" },
      "best_bridge_day": { "default": "mdi:calendar-heart" },
      "workdays_remaining": { "default": "mdi:briefcase-outline" },
      "holidays_this_year": { "default": "mdi:calendar-multiple" },
      "vacation_budget": { "default": "mdi:beach" }
    },
    "binary_sensor": {
      "holiday_today": { "default": "mdi:party-popper" },
      "bridge_day_today": { "default": "mdi:calendar-today" }
    }
  },
  "services": {
    "plan_bridge_day": { "service": "mdi:calendar-plus" },
    "plan_vacation": { "service": "mdi:calendar-plus" },
    "remove_vacation": { "service": "mdi:calendar-remove" },
    "set_budget": { "service": "mdi:counter" }
  }
}
```

In `custom_components/fenstertage/__init__.py` die PLATFORMS-Zeile ändern:

```python
PLATFORMS: list[Platform] = [Platform.SENSOR]
```

- [ ] **Step 6: Tests laufen lassen — müssen bestehen**

Run: `python -m pytest tests/test_sensor.py tests/test_init.py -v -o addopts=""`
Expected: alle Tests PASS (test_init muss mit geladener Sensor-Plattform weiterhin grün sein).

- [ ] **Step 7: Commit**

```bash
git add custom_components/fenstertage/entity.py custom_components/fenstertage/sensor.py custom_components/fenstertage/icons.json custom_components/fenstertage/__init__.py tests/test_sensor.py
git commit -m "feat: Sensor-Plattform — next/best bridge day, workdays, holidays, budget"
```

---

### Task 8: binary_sensor.py — holiday_today, bridge_day_today

**Files:**
- Create: `custom_components/fenstertage/binary_sensor.py`
- Modify: `custom_components/fenstertage/__init__.py` (PLATFORMS erweitern)
- Test: `tests/test_binary_sensor.py`

**Interfaces:**
- Consumes: `derive.holiday_on`, `derive.block_covering`, `FenstertageEntity`.
- Produces: Binary-Sensor-Keys `holiday_today`, `bridge_day_today`.

- [ ] **Step 1: Failing Tests schreiben**

`tests/test_binary_sensor.py`:

```python
"""Binary-Sensor-Tests."""
from __future__ import annotations

from unittest.mock import AsyncMock

from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.fenstertage.const import DOMAIN
from tests.conftest import setup_entry


def _state(hass: HomeAssistant, entry: MockConfigEntry, key: str):
    entity_id = er.async_get(hass).async_get_entity_id(
        "binary_sensor", DOMAIN, f"{entry.entry_id}_{key}"
    )
    assert entity_id is not None, f"binary_sensor {key} nicht registriert"
    return hass.states.get(entity_id)


async def test_holiday_today_on(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to("2026-12-25")
    await setup_entry(hass, mock_config_entry)
    state = _state(hass, mock_config_entry, "holiday_today")
    assert state.state == "on"
    assert state.attributes["holiday_name"] == "Weihnachten"


async def test_holiday_today_off(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to("2026-07-19")
    await setup_entry(hass, mock_config_entry)
    assert _state(hass, mock_config_entry, "holiday_today").state == "off"


async def test_bridge_day_today_on_inside_free_range(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    # Dezember-Block: vacation 2026-12-28..30, free_range 2026-12-27..31.
    freezer.move_to("2026-12-29")
    await setup_entry(hass, mock_config_entry)
    state = _state(hass, mock_config_entry, "bridge_day_today")
    assert state.state == "on"
    assert state.attributes["block"]["block_id"] == "2026-12-28_3d"


async def test_bridge_day_today_off(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to("2026-07-19")
    await setup_entry(hass, mock_config_entry)
    assert _state(hass, mock_config_entry, "bridge_day_today").state == "off"
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `python -m pytest tests/test_binary_sensor.py -v -o addopts=""`
Expected: FAIL — Binary-Sensoren nicht registriert.

- [ ] **Step 3: binary_sensor.py implementieren**

`custom_components/fenstertage/binary_sensor.py`:

```python
"""Binary sensor platform for Fenstertage."""
from __future__ import annotations

import datetime as dt
from typing import Any

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from . import derive
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

    def _holiday(self):
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

    def _block(self):
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
```

- [ ] **Step 4: PLATFORMS erweitern**

In `custom_components/fenstertage/__init__.py`:

```python
PLATFORMS: list[Platform] = [Platform.BINARY_SENSOR, Platform.SENSOR]
```

- [ ] **Step 5: Tests laufen lassen — müssen bestehen**

Run: `python -m pytest tests/test_binary_sensor.py tests/test_sensor.py -v -o addopts=""`
Expected: alle Tests PASS.

- [ ] **Step 6: Commit**

```bash
git add custom_components/fenstertage/binary_sensor.py custom_components/fenstertage/__init__.py tests/test_binary_sensor.py
git commit -m "feat: Binary-Sensoren holiday_today und bridge_day_today"
```

---

### Task 9: services.py + services.yaml — die vier Planungs-Services

**Files:**
- Create: `custom_components/fenstertage/services.py`
- Create: `custom_components/fenstertage/services.yaml`
- Modify: `custom_components/fenstertage/__init__.py` (`async_setup` registriert Services)
- Test: `tests/test_services.py`

**Interfaces:**
- Consumes: `PlannerStore.async_add_item/async_remove_item/async_set_budget`, `derive.holidays_in_years`, `runtime_data`.
- Produces:
  - `async_setup_services(hass: HomeAssistant) -> None` (aufgerufen aus `async_setup`)
  - Services `fenstertage.plan_bridge_day` (`config_entry_id`, `block_id`), `fenstertage.plan_vacation` (`config_entry_id`, `start`, `end`), `fenstertage.remove_vacation` (`config_entry_id`, `item_id`), `fenstertage.set_budget` (`config_entry_id`, `year`, `days`)
  - Nach jedem erfolgreichen Call: `coordinator.async_update_listeners()` (Budget-Sensor + Karte aktualisieren sofort)
  - Fehler-Keys zusätzlich zu denen aus planner.py: `unknown_entry`, `unknown_block`, `year_not_loaded`

- [ ] **Step 1: Failing Tests schreiben**

`tests/test_services.py`:

```python
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
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `python -m pytest tests/test_services.py -v -o addopts=""`
Expected: FAIL — Services nicht registriert (`ServiceNotFound`).

- [ ] **Step 3: services.py implementieren**

`custom_components/fenstertage/services.py`:

```python
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
    return entry.runtime_data


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
```

- [ ] **Step 4: services.yaml schreiben + in async_setup registrieren**

`custom_components/fenstertage/services.yaml`:

```yaml
plan_bridge_day:
  fields:
    config_entry_id:
      required: true
      selector:
        config_entry:
          integration: fenstertage
    block_id:
      required: true
      example: "2026-05-15_1d"
      selector:
        text:

plan_vacation:
  fields:
    config_entry_id:
      required: true
      selector:
        config_entry:
          integration: fenstertage
    start:
      required: true
      example: "2026-08-03"
      selector:
        date:
    end:
      required: true
      example: "2026-08-14"
      selector:
        date:

remove_vacation:
  fields:
    config_entry_id:
      required: true
      selector:
        config_entry:
          integration: fenstertage
    item_id:
      required: true
      selector:
        text:

set_budget:
  fields:
    config_entry_id:
      required: true
      selector:
        config_entry:
          integration: fenstertage
    year:
      required: true
      example: 2026
      selector:
        number:
          min: 1970
          max: 2100
          mode: box
    days:
      required: true
      example: 25
      selector:
        number:
          min: 0
          max: 100
          mode: box
```

In `custom_components/fenstertage/__init__.py` den Import ergänzen und `async_setup` ersetzen:

```python
from .services import async_setup_services
```

```python
async def async_setup(hass: HomeAssistant, config: dict[str, Any]) -> bool:
    """Domain-level setup: Services einmal pro HA-Prozess registrieren."""
    async_setup_services(hass)
    return True
```

- [ ] **Step 5: Tests laufen lassen — müssen bestehen**

Run: `python -m pytest tests/test_services.py -v -o addopts=""`
Expected: alle Tests PASS.

- [ ] **Step 6: Commit**

```bash
git add custom_components/fenstertage/services.py custom_components/fenstertage/services.yaml custom_components/fenstertage/__init__.py tests/test_services.py
git commit -m "feat: Services plan_bridge_day, plan_vacation, remove_vacation, set_budget"
```

---

### Task 10: diagnostics.py + quality_scale.yaml

**Files:**
- Create: `custom_components/fenstertage/diagnostics.py`
- Create: `custom_components/fenstertage/quality_scale.yaml`
- Test: `tests/test_diagnostics.py`

**Interfaces:**
- Consumes: `runtime_data` (coordinator + planner).
- Produces: `async_get_config_entry_diagnostics(hass, entry) -> dict[str, Any]` — keine sensiblen Daten, daher keine Redaction nötig.

- [ ] **Step 1: Failing Test schreiben**

`tests/test_diagnostics.py`:

```python
"""Diagnostics-Test."""
from __future__ import annotations

from unittest.mock import AsyncMock

from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.components.diagnostics import (
    get_diagnostics_for_config_entry,
)
from pytest_homeassistant_custom_component.typing import ClientSessionGenerator

from tests.conftest import setup_entry


async def test_diagnostics(
    hass: HomeAssistant,
    hass_client: ClientSessionGenerator,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    freezer.move_to("2026-07-19")
    assert await async_setup_component(hass, "diagnostics", {})
    await setup_entry(hass, mock_config_entry)
    diagnostics = await get_diagnostics_for_config_entry(
        hass, hass_client, mock_config_entry
    )
    assert diagnostics["entry"]["data"]["country"] == "AT"
    assert diagnostics["years"]["2026"]["holiday_count"] == 2
    assert diagnostics["years"]["2026"]["block_count"] == 2
    assert diagnostics["planner"]["budget_total"] == 25
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `python -m pytest tests/test_diagnostics.py -v -o addopts=""`
Expected: FAIL (kein Diagnostics-Handler).

- [ ] **Step 3: diagnostics.py implementieren**

`custom_components/fenstertage/diagnostics.py`:

```python
"""Diagnostics support for Fenstertage — no sensitive data, no redaction."""
from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from .coordinator import FenstertageConfigEntry


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: FenstertageConfigEntry
) -> dict[str, Any]:
    """Return diagnostics for a config entry."""
    runtime = entry.runtime_data
    return {
        "entry": {
            "data": dict(entry.data),
            "options": dict(entry.options),
        },
        "years": {
            str(year): {
                "workdays": metrics.workdays,
                "holiday_count": len(metrics.holidays),
                "block_count": len(metrics.blocks),
                "generated_at": metrics.generated_at,
            }
            for year, metrics in sorted(runtime.coordinator.data.years.items())
        },
        "planner": runtime.planner.as_attributes(dt_util.now().date().year),
    }
```

- [ ] **Step 4: quality_scale.yaml schreiben**

`custom_components/fenstertage/quality_scale.yaml`:

```yaml
rules:
  # --- Bronze ---
  action-setup: done
  appropriate-polling: done  # 12 h Default, konfigurierbar 1–48 h
  brands: todo  # PR in home-assistant/brands separat einreichen
  common-modules: done  # coordinator.py, entity.py
  config-flow: done
  config-flow-test-coverage: done
  dependency-transparency: done  # requirements: []
  docs-actions: done  # README + services.yaml
  docs-high-level-description: done
  docs-installation-instructions: done
  docs-removal-instructions: done
  entity-event-setup:
    status: exempt
    comment: Keine Event-Subscriptions — reine Coordinator-Entities.
  entity-unique-id: done
  has-entity-name: done
  runtime-data: done
  test-before-configure: done
  test-before-setup: done  # async_config_entry_first_refresh
  unique-config-entry: done

  # --- Silver ---
  action-exceptions: done  # ServiceValidationError mit translation_key
  config-entry-unloading: done
  docs-configuration-parameters: done
  docs-installation-parameters: done
  entity-unavailable: done  # CoordinatorEntity-Standardverhalten
  integration-owner: done
  log-when-unavailable: done  # DataUpdateCoordinator-Standardverhalten
  parallel-updates: done  # PARALLEL_UPDATES = 0
  reauthentication-flow:
    status: exempt
    comment: Öffentliche API ohne Authentifizierung.
  test-coverage: done  # fail-under=90

  # --- Gold ---
  devices: done
  diagnostics: done
  discovery:
    status: exempt
    comment: Cloud-Service, nichts zu discovern.
  discovery-update-info:
    status: exempt
    comment: Kein Discovery.
  docs-data-update: done
  docs-examples: done
  docs-known-limitations: done
  docs-supported-devices:
    status: exempt
    comment: Keine Geräte — Cloud-Service.
  docs-supported-functions: done
  docs-troubleshooting: done
  docs-use-cases: done
  dynamic-devices:
    status: exempt
    comment: Ein statisches Service-Device pro Entry.
  entity-category: done
  entity-device-class: done
  entity-disabled-by-default:
    status: exempt
    comment: Alle 7 Entities sind Kern-Funktionalität.
  entity-translations: done
  exception-translations: done
  icon-translations: done
  reconfiguration-flow:
    status: exempt
    comment: Land/Region bestimmen die unique_id; Wechsel = neuer Entry.
      Alle übrigen Parameter sind Options.
  repair-issues:
    status: exempt
    comment: Keine reparierbaren Fehlerzustände.
  stale-devices:
    status: exempt
    comment: Ein statisches Device pro Entry, entfernt mit dem Entry.

  # --- Platinum ---
  async-dependency: done  # aiohttp
  inject-websession: done  # async_get_clientsession → Client-Konstruktor
  strict-typing: done  # mypy strict, py.typed
```

- [ ] **Step 5: Tests laufen lassen — müssen bestehen**

Run: `python -m pytest tests/test_diagnostics.py -v -o addopts=""`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add custom_components/fenstertage/diagnostics.py custom_components/fenstertage/quality_scale.yaml tests/test_diagnostics.py
git commit -m "feat: Diagnostics und quality_scale.yaml"
```

---

### Task 11: card_registration.py + Verdrahtung in __init__.py

**Files:**
- Create: `custom_components/fenstertage/card_registration.py`
- Create: `custom_components/fenstertage/www/fenstertage-card.js` (Platzhalter, Task 12 ersetzt per Build)
- Modify: `custom_components/fenstertage/__init__.py`
- Test: `tests/test_card_registration.py`

**Interfaces:**
- Consumes: `CARD_VERSION` aus `const.py`.
- Produces: `JSModuleRegistration(hass)` mit `async_register()` / `async_unregister()`; `URL_BASE = "/fenstertage"`; Resource-URL `/fenstertage/fenstertage-card.js?v=<CARD_VERSION>`.

Die Datei ist eine 1:1-Adaption von
`C:\Users\asi\Documents\GitHub\linz-linien-austria\custom_components\linz_linien_austria\card_registration.py`
(dort abschreiben!) mit genau diesen Änderungen — sonst NICHTS anpassen:

1. Docstring-Kopf: "Lovelace JS module registration for Fenstertage."
2. `from .const import CARD_VERSION` bleibt gleich (unsere const.py hat die Konstante).
3. `URL_BASE = "/fenstertage"`
4. `JSMODULES = [{"name": "Fenstertage Card", "filename": "fenstertage-card.js", "version": CARD_VERSION}]`

Alles andere (LOVELACE_DATA-Fallback, `_is_storage_mode` mit
`resource_mode`/`mode`-Duck-Typing, Retry-Loop mit Cap 60×5 s,
Update-vs-Create-Logik, `_get_path`/`_get_version`) unverändert übernehmen.

- [ ] **Step 1: Failing Tests schreiben**

`tests/test_card_registration.py`:

```python
"""Card-Registrierungs-Tests mit gefaketem Lovelace-Storage."""
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from homeassistant.core import HomeAssistant

from custom_components.fenstertage.card_registration import (
    URL_BASE,
    JSModuleRegistration,
)
from custom_components.fenstertage.const import CARD_VERSION


class FakeResources:
    def __init__(self, items: list[dict] | None = None) -> None:
        self.loaded = True
        self._items = items or []
        self.async_create_item = AsyncMock()
        self.async_update_item = AsyncMock()
        self.async_delete_item = AsyncMock()

    def async_items(self) -> list[dict]:
        return self._items


def _fake_lovelace(resources: FakeResources) -> SimpleNamespace:
    return SimpleNamespace(mode="storage", resources=resources)


def _registration(
    hass: HomeAssistant, resources: FakeResources
) -> JSModuleRegistration:
    registration = JSModuleRegistration(hass)
    registration.lovelace = _fake_lovelace(resources)
    hass.http = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()
    return registration


async def test_register_creates_resource(hass: HomeAssistant) -> None:
    resources = FakeResources()
    registration = _registration(hass, resources)
    await registration.async_register()
    resources.async_create_item.assert_awaited_once_with(
        {
            "res_type": "module",
            "url": f"{URL_BASE}/fenstertage-card.js?v={CARD_VERSION}",
        }
    )


async def test_register_updates_stale_version(hass: HomeAssistant) -> None:
    resources = FakeResources(
        items=[
            {
                "id": "abc",
                "url": f"{URL_BASE}/fenstertage-card.js?v=0.0.1",
            }
        ]
    )
    registration = _registration(hass, resources)
    await registration.async_register()
    resources.async_create_item.assert_not_awaited()
    resources.async_update_item.assert_awaited_once()


async def test_register_skips_without_http(hass: HomeAssistant) -> None:
    registration = JSModuleRegistration(hass)
    registration.lovelace = _fake_lovelace(FakeResources())
    hass.http = None
    await registration.async_register()  # darf nicht crashen


async def test_unregister_removes_resources(hass: HomeAssistant) -> None:
    resources = FakeResources(
        items=[
            {
                "id": "abc",
                "url": f"{URL_BASE}/fenstertage-card.js?v={CARD_VERSION}",
            }
        ]
    )
    registration = _registration(hass, resources)
    await registration.async_unregister()
    resources.async_delete_item.assert_awaited_once_with("abc")


def test_version_helpers(hass: HomeAssistant) -> None:
    registration = JSModuleRegistration(hass)
    assert registration._get_path("/x/card.js?v=1.2.3") == "/x/card.js"
    assert registration._get_version("/x/card.js?v=1.2.3") == "1.2.3"
    assert registration._get_version("/x/card.js") == "0"
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `python -m pytest tests/test_card_registration.py -v -o addopts=""`
Expected: FAIL mit `ModuleNotFoundError`.

- [ ] **Step 3: card_registration.py aus der Referenz adaptieren**

Referenzdatei kopieren und die vier oben genannten Änderungen anwenden.
Zusätzlich Platzhalter-Bundle anlegen, damit der statische Pfad existiert:

`custom_components/fenstertage/www/fenstertage-card.js`:

```js
// Fenstertage Card — Platzhalter. Wird in Task 12 durch den Rollup-Build ersetzt.
console.warn("fenstertage-card: placeholder bundle — run npm run build");
```

- [ ] **Step 4: __init__.py verdrahten**

In `custom_components/fenstertage/__init__.py`:

Imports ergänzen:

```python
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED, Platform
from homeassistant.core import CoreState, Event, HomeAssistant, callback

from .card_registration import JSModuleRegistration
```

`async_setup` ersetzen durch:

```python
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
```

Und `async_remove_entry` erweitern (Lovelace-Resource nur beim letzten Entry
entfernen):

```python
async def async_remove_entry(
    hass: HomeAssistant, entry: FenstertageConfigEntry
) -> None:
    """Drop the planner store; unregister the card with the last entry."""
    planner = PlannerStore(
        hass, entry.entry_id, default_budget=DEFAULT_VACATION_BUDGET
    )
    await planner.async_remove()

    remaining = [
        e
        for e in hass.config_entries.async_entries(DOMAIN)
        if e.entry_id != entry.entry_id
    ]
    if not remaining:
        await JSModuleRegistration(hass).async_unregister()
```

- [ ] **Step 5: Tests laufen lassen — müssen bestehen**

Run: `python -m pytest tests/test_card_registration.py tests/test_init.py -v -o addopts=""`
Expected: alle Tests PASS (PHACC-Umgebung hat kein `hass.http` → Registrierung wird beim Setup sauber übersprungen; genau dafür existiert der Guard).

- [ ] **Step 6: Commit**

```bash
git add custom_components/fenstertage/card_registration.py custom_components/fenstertage/www custom_components/fenstertage/__init__.py tests/test_card_registration.py
git commit -m "feat: Lovelace-Resource-Registrierung für die Fenstertage-Karte"
```

---

### Task 12: Karten-Grundgerüst — Build-Setup, Typen, Localize, Styles, compact-Modus, Editor

> **Design-Hinweis für den Implementierer:** Vor diesem und den beiden
> folgenden Card-Tasks die Skills `frontend-design:frontend-design` und
> `make-interfaces-feel-better` laden und deren Prinzipien anwenden
> (User-Vorgabe). Konkrete Vorgaben aus dem Design: Farben ausschließlich
> aus HA-Theme-Variablen ableiten (`--primary-text-color`,
> `--secondary-text-color`, `--divider-color`, `--card-background-color`,
> `--primary-color`), Effizienz als eigene Farbrampe (neutral → kräftig,
> KEINE rot/gelb/grün-Ampel), Zahlen tabellarisch (`font-variant-numeric:
> tabular-nums`), Übergänge 150–200 ms, Hover-/Active-States für alles
> Klickbare.

**Files:**
- Create: `package.json`, `rollup.config.mjs`, `tsconfig.json`
- Create: `src/const.ts`, `src/types.ts`, `src/localize.ts`, `src/styles.ts`
- Create: `src/fenstertage-card.ts`, `src/modes/compact.ts`, `src/editor.ts`
- Replace (per Build): `custom_components/fenstertage/www/fenstertage-card.js`

**Interfaces:**
- Consumes: Attribut-Schema der Sensoren aus Task 7 (`blocks`, `years`, `block`, `days_until`, `config_entry_id`; Budget: `budget_total`, `planned_days`, `planned_items`).
- Produces:
  - Custom Elements `fenstertage-card` + `fenstertage-card-editor`, registriert in `window.customCards`.
  - `CardCtx`-Objekt (siehe types.ts) — `modes/list.ts` (Task 13) und `modes/year.ts` (Task 14) bekommen exakt dieses Objekt.
  - Card-Methoden für die Modi: `planBlock(blockId: string)`, `removeItem(itemId: string)`, `planRange(start: string, end: string)`, `openDialog(state: DialogState)`, `closeDialog()`, Getter/Setter `selStart: string | undefined`.
  - `efficiencyColor(eff: number): string` aus `styles.ts`.

- [ ] **Step 1: Build-Setup schreiben**

`package.json`:

```json
{
  "name": "fenstertage-card",
  "private": true,
  "version": "0.0.0",
  "description": "Lovelace custom card for the Fenstertage HA integration",
  "type": "module",
  "scripts": {
    "build": "rollup -c",
    "dev": "rollup -c -w"
  },
  "devDependencies": {
    "@rollup/plugin-commonjs": "^29.0.3",
    "@rollup/plugin-json": "^6.1.0",
    "@rollup/plugin-node-resolve": "^16.0.3",
    "@rollup/plugin-terser": "^1.0.0",
    "@rollup/plugin-typescript": "^12.1.0",
    "rollup": "^4.62.2",
    "tslib": "^2.8.0",
    "typescript": "^6.0.3"
  },
  "dependencies": {
    "lit": "^3.3.3"
  }
}
```

`rollup.config.mjs`:

```js
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import json from "@rollup/plugin-json";

const dev = !!process.env.ROLLUP_WATCH;

const banner =
  "// Fenstertage Card — bundled by Rollup. Edit sources in src/, then `npm run build`.";

const onwarn = (warning, warn) => {
  if (
    warning.code === "THIS_IS_UNDEFINED" &&
    warning.id?.includes("/node_modules/")
  ) {
    return;
  }
  warn(warning);
};

export default {
  input: "src/fenstertage-card.ts",
  output: {
    file: "custom_components/fenstertage/www/fenstertage-card.js",
    format: "es",
    sourcemap: dev,
    banner,
    inlineDynamicImports: true,
  },
  plugins: [
    nodeResolve(),
    commonjs(),
    typescript(),
    json(),
    !dev && terser({ format: { comments: /Fenstertage Card/ } }),
  ].filter(Boolean),
  onwarn,
};
```

`tsconfig.json`: exakt den Inhalt aus dem Referenz-Repo
`C:\Users\asi\Documents\GitHub\linz-linien-austria\tsconfig.json` übernehmen
(target es2022, strict, experimentalDecorators, useDefineForClassFields
false etc. — unverändert).

- [ ] **Step 2: const.ts + types.ts schreiben**

`src/const.ts`:

```ts
// MUSS mit CARD_VERSION in custom_components/fenstertage/const.py synchron sein.
export const CARD_VERSION = "0.1.0";
export const CARD_TAG = "fenstertage-card";
export const EDITOR_TAG = "fenstertage-card-editor";
export const DOMAIN = "fenstertage";
```

`src/types.ts`:

```ts
export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  locale?: { language: string };
  language?: string;
  callService(
    domain: string,
    service: string,
    data: Record<string, unknown>,
  ): Promise<unknown>;
}

export type CardMode = "compact" | "list" | "year";

export interface FenstertageCardConfig {
  type: string;
  entity: string;
  mode?: CardMode;
  title?: string;
  show_budget?: boolean;
  levels?: number[];
}

export interface HolidayData {
  date: string;
  local_name: string;
}

export interface BlockData {
  block_id: string;
  level: number;
  vacation_dates: string[];
  vacation_day_weekdays: string[];
  vacation_days: number;
  free_days: number;
  free_days_without_weekend: number;
  efficiency: number;
  free_range_start: string;
  free_range_end: string;
  holidays: { date: string; local_name: string; name: string }[];
}

export interface PlannedItemData {
  id: string;
  start: string;
  end: string;
  vacation_dates: string[];
  source: string;
  block_id: string | null;
}

export interface YearData {
  holidays: HolidayData[];
  blocks: BlockData[];
}

export interface BudgetInfo {
  remaining: number;
  total: number;
  planned: number;
}

export type DialogState =
  | { kind: "block"; block: BlockData }
  | { kind: "item"; item: PlannedItemData }
  | { kind: "range"; start: string; end: string };

export interface CardCtx {
  hass: HomeAssistant;
  config: FenstertageCardConfig & {
    mode: CardMode;
    show_budget: boolean;
  };
  entryId: string;
  /** Kommende Blöcke, nach `levels` gefiltert, datumssortiert. */
  blocks: BlockData[];
  /** Voller Jahres-Datensatz für den year-Modus. */
  years: Record<string, YearData>;
  planned: PlannedItemData[];
  plannedBlockIds: Set<string>;
  budget: BudgetInfo | null;
  t: (key: string) => string;
}
```

- [ ] **Step 3: localize.ts + styles.ts schreiben**

`src/localize.ts`:

```ts
import type { HomeAssistant } from "./types";

const STRINGS: Record<string, Record<string, string>> = {
  en: {
    next_bridge_day: "Next bridge day",
    no_blocks: "No upcoming bridge days",
    entity_missing: "Entity not found. Is the Fenstertage integration set up?",
    vacation_days_short: "d off",
    free_days_short: "d free",
    efficiency: "Efficiency",
    level: "Level",
    planned: "Planned",
    plan: "Plan",
    remove: "Remove",
    cancel: "Cancel",
    budget: "Budget",
    of_budget_planned: "planned",
    over_budget: "over budget",
    holidays: "Holidays",
    pick_end: "Tap the last day of your vacation",
    range_estimate: "Estimated vacation days",
    in_days: "in {days} days",
    today: "today",
    date_range: "Free range",
    year: "Year",
  },
  de: {
    next_bridge_day: "Nächster Fenstertag",
    no_blocks: "Keine kommenden Fenstertage",
    entity_missing:
      "Entity nicht gefunden. Ist die Fenstertage-Integration eingerichtet?",
    vacation_days_short: "UT",
    free_days_short: "Tage frei",
    efficiency: "Effizienz",
    level: "Level",
    planned: "Geplant",
    plan: "Planen",
    remove: "Entfernen",
    cancel: "Abbrechen",
    budget: "Budget",
    of_budget_planned: "verplant",
    over_budget: "über Budget",
    holidays: "Feiertage",
    pick_end: "Tippe auf den letzten Urlaubstag",
    range_estimate: "Voraussichtliche Urlaubstage",
    in_days: "in {days} Tagen",
    today: "heute",
    date_range: "Freier Zeitraum",
    year: "Jahr",
  },
};

export function makeLocalize(
  hass?: HomeAssistant,
): (key: string, vars?: Record<string, string | number>) => string {
  const lang = (hass?.locale?.language ?? hass?.language ?? "en").split(
    "-",
  )[0];
  const table = STRINGS[lang ?? "en"] ?? STRINGS.en!;
  return (key, vars) => {
    let text = table[key] ?? STRINGS.en![key] ?? key;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replace(`{${name}}`, String(value));
      }
    }
    return text;
  };
}
```

`src/styles.ts`:

```ts
import { css } from "lit";

/**
 * Effizienz-Farbrampe: neutral (niedrig) → kräftiges Teal (hoch).
 * Bewusst keine Ampel — Effizienz ist kein Alarm, sondern eine Güte.
 * Werte via color-mix aus der Theme-Primärfarbe abgeleitet, damit die
 * Karte in jedem Theme (hell/dunkel) stimmig bleibt.
 */
export function efficiencyColor(eff: number): string {
  // eff ist praktisch 1.0 … 4.0+; auf 0..1 normieren.
  const t = Math.max(0, Math.min(1, (eff - 1) / 3));
  const pct = Math.round(25 + t * 75); // 25 % … 100 % Primärfarbanteil
  return `color-mix(in srgb, var(--primary-color) ${pct}%, var(--secondary-text-color) ${100 - pct}%)`;
}

export const cardStyles = css`
  :host {
    --fen-radius: 10px;
    --fen-transition: 180ms ease;
  }
  ha-card {
    padding: 16px;
  }
  .title {
    font-size: 1.05rem;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--primary-text-color);
  }
  .muted {
    color: var(--secondary-text-color);
  }
  .num {
    font-variant-numeric: tabular-nums;
  }

  /* Budget-Balken */
  .budget {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
    font-size: 0.85rem;
  }
  .budget .bar {
    flex: 1;
    height: 6px;
    border-radius: 3px;
    background: var(--divider-color);
    overflow: hidden;
  }
  .budget .bar > div {
    height: 100%;
    border-radius: 3px;
    background: var(--primary-color);
    transition: width var(--fen-transition);
  }
  .budget.over .bar > div {
    background: var(--error-color, #d32f2f);
  }

  /* Badges */
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-primary-color, #fff);
  }

  /* Dialog-Overlay */
  .overlay {
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, var(--card-background-color) 55%, transparent);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--ha-card-border-radius, 12px);
    z-index: 2;
  }
  .dialog {
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: var(--fen-radius);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.25);
    padding: 16px;
    max-width: 320px;
    width: calc(100% - 48px);
  }
  .dialog h3 {
    margin: 0 0 8px;
    font-size: 1rem;
  }
  .dialog .row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 0.85rem;
    padding: 3px 0;
  }
  .dialog .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 14px;
  }
  button.fen {
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    padding: 8px 14px;
    cursor: pointer;
    transition: filter var(--fen-transition), transform var(--fen-transition);
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
  }
  button.fen.ghost {
    background: transparent;
    color: var(--primary-text-color);
    border: 1px solid var(--divider-color);
  }
  button.fen.danger {
    background: var(--error-color, #d32f2f);
  }
  button.fen:hover {
    filter: brightness(1.08);
  }
  button.fen:active {
    transform: scale(0.97);
  }

  .hint {
    padding: 12px;
    border: 1px dashed var(--divider-color);
    border-radius: var(--fen-radius);
    color: var(--secondary-text-color);
    font-size: 0.9rem;
  }
`;
```

- [ ] **Step 4: Haupt-Element fenstertage-card.ts + compact-Modus + Editor schreiben**

`src/modes/compact.ts`:

```ts
import { html, nothing, type TemplateResult } from "lit";
import { efficiencyColor } from "../styles";
import type { CardCtx } from "../types";
import { daysUntil, formatDate, renderBudget } from "../shared";

export function renderCompact(ctx: CardCtx): TemplateResult {
  const next = ctx.blocks[0];
  if (!next) {
    return html`<div class="hint">${ctx.t("no_blocks")}</div>`;
  }
  const days = daysUntil(next.vacation_dates[0]!);
  return html`
    <div class="compact">
      <div class="when">
        <span class="date">${formatDate(ctx, next.vacation_dates[0]!)}</span>
        <span class="muted"
          >${days === 0 ? ctx.t("today") : ctx.t("in_days", { days })}</span
        >
      </div>
      <div class="what">
        <span
          class="badge"
          style="background:${efficiencyColor(next.efficiency)}"
          >×${next.efficiency.toFixed(1)}</span
        >
        <span class="num"
          >${next.vacation_days} ${ctx.t("vacation_days_short")} →
          ${next.free_days} ${ctx.t("free_days_short")}</span
        >
        ${ctx.plannedBlockIds.has(next.block_id)
          ? html`<span class="muted">✓ ${ctx.t("planned")}</span>`
          : nothing}
      </div>
      ${ctx.config.show_budget ? renderBudget(ctx) : nothing}
    </div>
  `;
}
```

Dazu `src/shared.ts` (von allen Modi genutzt — HIER anlegen):

```ts
import { html, nothing, type TemplateResult } from "lit";
import type { CardCtx } from "./types";

export function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${iso}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function formatDate(ctx: CardCtx, iso: string): string {
  const lang = ctx.hass.locale?.language ?? "en";
  return new Date(`${iso}T00:00:00`).toLocaleDateString(lang, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function renderBudget(ctx: CardCtx): TemplateResult | typeof nothing {
  if (!ctx.budget) {
    return nothing;
  }
  const { total, planned } = ctx.budget;
  const over = planned > total;
  const pct = total > 0 ? Math.min(100, (planned / total) * 100) : 0;
  return html`
    <div class="budget ${over ? "over" : ""}">
      <span class="num">${planned}/${total}</span>
      <div class="bar"><div style="width:${pct}%"></div></div>
      <span class="muted"
        >${over
          ? `${planned - total} ${ctx.t("over_budget")}`
          : ctx.t("of_budget_planned")}</span
      >
    </div>
  `;
}
```

`src/fenstertage-card.ts`:

```ts
import { LitElement, html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { CARD_TAG, CARD_VERSION, DOMAIN, EDITOR_TAG } from "./const";
import { makeLocalize } from "./localize";
import { renderCompact } from "./modes/compact";
import { cardStyles } from "./styles";
import type {
  BlockData,
  BudgetInfo,
  CardCtx,
  DialogState,
  FenstertageCardConfig,
  HassEntity,
  HomeAssistant,
  PlannedItemData,
  YearData,
} from "./types";

// Task 13/14 ersetzen diese Platzhalter durch echte Implementierungen:
import { renderList } from "./modes/list";
import { renderYear } from "./modes/year";

console.info(`%c FENSTERTAGE-CARD %c v${CARD_VERSION}`, "background:#222;color:#7fdbca", "");

declare global {
  interface Window {
    customCards?: unknown[];
  }
}
window.customCards = window.customCards ?? [];
window.customCards.push({
  type: CARD_TAG,
  name: "Fenstertage Card",
  description:
    "Bridge days, holidays and an interactive year vacation planner.",
  preview: true,
});

@customElement(CARD_TAG)
export class FenstertageCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: FenstertageCardConfig;

  /** year-Modus: erster Tap einer freien Range. */
  @state() public selStart?: string;

  @state() private _dialog?: DialogState;

  static override styles = cardStyles;

  public setConfig(config: FenstertageCardConfig): void {
    if (!config.entity) {
      throw new Error("fenstertage-card: `entity` is required");
    }
    this._config = { mode: "list", show_budget: true, ...config };
    this.selStart = undefined;
    this._dialog = undefined;
  }

  public getCardSize(): number {
    switch (this._config?.mode) {
      case "compact":
        return 2;
      case "year":
        return 8;
      default:
        return 4;
    }
  }

  public static getStubConfig(
    hass: HomeAssistant,
  ): Partial<FenstertageCardConfig> {
    const entity = Object.values(hass.states).find(
      (s) =>
        s.entity_id.startsWith("sensor.") &&
        Array.isArray(s.attributes["blocks"]) &&
        typeof s.attributes["config_entry_id"] === "string",
    );
    return { entity: entity?.entity_id ?? "", mode: "list" };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    // Editor ist im Bundle enthalten (inlineDynamicImports).
    await import("./editor");
    return document.createElement(EDITOR_TAG);
  }

  // ------------------------------------------------------------------
  // Kontext-Aufbau
  // ------------------------------------------------------------------

  private _buildCtx(): CardCtx | null {
    if (!this.hass || !this._config) {
      return null;
    }
    const anchor: HassEntity | undefined =
      this.hass.states[this._config.entity];
    if (!anchor) {
      return null;
    }
    const entryId = String(anchor.attributes["config_entry_id"] ?? "");
    const levels = this._config.levels;
    const allBlocks = (anchor.attributes["blocks"] ?? []) as BlockData[];
    const blocks = levels?.length
      ? allBlocks.filter((b) => levels.includes(b.level))
      : allBlocks;
    const years = (anchor.attributes["years"] ?? {}) as Record<
      string,
      YearData
    >;

    // Budget-Sensor desselben Entries über config_entry_id-Attribut finden.
    const budgetEntity = Object.values(this.hass.states).find(
      (s) =>
        s.attributes["config_entry_id"] === entryId &&
        typeof s.attributes["budget_total"] === "number",
    );
    let budget: BudgetInfo | null = null;
    let planned: PlannedItemData[] = [];
    if (budgetEntity) {
      planned = (budgetEntity.attributes["planned_items"] ??
        []) as PlannedItemData[];
      budget = {
        remaining: Number(budgetEntity.state),
        total: Number(budgetEntity.attributes["budget_total"]),
        planned: Number(budgetEntity.attributes["planned_days"]),
      };
    }
    return {
      hass: this.hass,
      config: this._config as CardCtx["config"],
      entryId,
      blocks,
      years,
      planned,
      plannedBlockIds: new Set(
        planned
          .filter((p) => p.block_id != null)
          .map((p) => p.block_id as string),
      ),
      budget,
      t: makeLocalize(this.hass),
    };
  }

  // ------------------------------------------------------------------
  // Aktionen (von allen Modi genutzt)
  // ------------------------------------------------------------------

  private async _call(
    service: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const ctx = this._buildCtx();
    if (!ctx) {
      return;
    }
    try {
      await ctx.hass.callService(DOMAIN, service, {
        config_entry_id: ctx.entryId,
        ...data,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.dispatchEvent(
        new CustomEvent("hass-notification", {
          detail: { message },
          bubbles: true,
          composed: true,
        }),
      );
    }
    this.closeDialog();
  }

  public planBlock(blockId: string): void {
    void this._call("plan_bridge_day", { block_id: blockId });
  }

  public removeItem(itemId: string): void {
    void this._call("remove_vacation", { item_id: itemId });
  }

  public planRange(start: string, end: string): void {
    void this._call("plan_vacation", { start, end });
  }

  public openDialog(dialog: DialogState): void {
    this._dialog = dialog;
  }

  public closeDialog(): void {
    this._dialog = undefined;
    this.selStart = undefined;
  }

  // ------------------------------------------------------------------
  // Rendering
  // ------------------------------------------------------------------

  protected override render(): TemplateResult | typeof nothing {
    if (!this._config) {
      return nothing;
    }
    const ctx = this._buildCtx();
    if (!ctx) {
      return html`<ha-card
        ><div class="hint">
          ${makeLocalize(this.hass)("entity_missing")}
        </div></ha-card
      >`;
    }
    let body: TemplateResult;
    switch (ctx.config.mode) {
      case "compact":
        body = renderCompact(ctx);
        break;
      case "year":
        body = renderYear(ctx, this);
        break;
      default:
        body = renderList(ctx, this);
    }
    return html`
      <ha-card style="position:relative">
        ${this._config.title
          ? html`<div class="title">${this._config.title}</div>`
          : nothing}
        ${body} ${this._renderDialog(ctx)}
      </ha-card>
    `;
  }

  private _renderDialog(ctx: CardCtx): TemplateResult | typeof nothing {
    const dialog = this._dialog;
    if (!dialog) {
      return nothing;
    }
    if (dialog.kind === "block") {
      const b = dialog.block;
      const isPlanned = ctx.plannedBlockIds.has(b.block_id);
      const plannedItem = ctx.planned.find((p) => p.block_id === b.block_id);
      return html`
        <div class="overlay" @click=${() => this.closeDialog()}>
          <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
            <h3>
              ${b.vacation_days} ${ctx.t("vacation_days_short")} →
              ${b.free_days} ${ctx.t("free_days_short")}
            </h3>
            <div class="row">
              <span class="muted">${ctx.t("date_range")}</span>
              <span class="num"
                >${b.free_range_start} – ${b.free_range_end}</span
              >
            </div>
            <div class="row">
              <span class="muted">${ctx.t("efficiency")}</span>
              <span class="num">×${b.efficiency.toFixed(2)}</span>
            </div>
            <div class="row">
              <span class="muted">${ctx.t("holidays")}</span>
              <span>${b.holidays.map((h) => h.local_name).join(", ")}</span>
            </div>
            <div class="actions">
              <button class="fen ghost" @click=${() => this.closeDialog()}>
                ${ctx.t("cancel")}
              </button>
              ${isPlanned && plannedItem
                ? html`<button
                    class="fen danger"
                    @click=${() => this.removeItem(plannedItem.id)}
                  >
                    ${ctx.t("remove")}
                  </button>`
                : html`<button
                    class="fen"
                    @click=${() => this.planBlock(b.block_id)}
                  >
                    ${ctx.t("plan")}
                  </button>`}
            </div>
          </div>
        </div>
      `;
    }
    if (dialog.kind === "item") {
      const item = dialog.item;
      return html`
        <div class="overlay" @click=${() => this.closeDialog()}>
          <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
            <h3>${ctx.t("planned")}</h3>
            <div class="row">
              <span class="muted">${ctx.t("date_range")}</span>
              <span class="num">${item.start} – ${item.end}</span>
            </div>
            <div class="row">
              <span class="muted">${ctx.t("range_estimate")}</span>
              <span class="num">${item.vacation_dates.length}</span>
            </div>
            <div class="actions">
              <button class="fen ghost" @click=${() => this.closeDialog()}>
                ${ctx.t("cancel")}
              </button>
              <button
                class="fen danger"
                @click=${() => this.removeItem(item.id)}
              >
                ${ctx.t("remove")}
              </button>
            </div>
          </div>
        </div>
      `;
    }
    // kind === "range" — Bestätigung einer freien Auswahl.
    return html`
      <div class="overlay" @click=${() => this.closeDialog()}>
        <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
          <h3>${ctx.t("plan")}</h3>
          <div class="row">
            <span class="muted">${ctx.t("date_range")}</span>
            <span class="num">${dialog.start} – ${dialog.end}</span>
          </div>
          <div class="actions">
            <button class="fen ghost" @click=${() => this.closeDialog()}>
              ${ctx.t("cancel")}
            </button>
            <button
              class="fen"
              @click=${() => this.planRange(dialog.start, dialog.end)}
            >
              ${ctx.t("plan")}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [CARD_TAG]: FenstertageCard;
  }
}
```

Damit der Build in diesem Task durchläuft, `src/modes/list.ts` und
`src/modes/year.ts` als minimale Platzhalter anlegen (Tasks 13/14 ersetzen
sie vollständig):

```ts
// src/modes/list.ts — Platzhalter, wird in Task 13 ersetzt.
// Parameter mit _-Präfix: tsconfig noUnusedParameters ignoriert nur _-Namen.
import { html, type TemplateResult } from "lit";
import type { CardCtx } from "../types";
import type { FenstertageCard } from "../fenstertage-card";

export function renderList(
  _ctx: CardCtx,
  _card: FenstertageCard,
): TemplateResult {
  return html`<div class="hint">list mode: Task 13</div>`;
}
```

```ts
// src/modes/year.ts — Platzhalter, wird in Task 14 ersetzt.
import { html, type TemplateResult } from "lit";
import type { CardCtx } from "../types";
import type { FenstertageCard } from "../fenstertage-card";

export function renderYear(
  _ctx: CardCtx,
  _card: FenstertageCard,
): TemplateResult {
  return html`<div class="hint">year mode: Task 14</div>`;
}
```

`src/editor.ts`:

```ts
import { LitElement, html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { EDITOR_TAG } from "./const";
import type { FenstertageCardConfig, HomeAssistant } from "./types";

const SCHEMA = [
  { name: "entity", required: true, selector: { entity: { domain: "sensor" } } },
  {
    name: "mode",
    selector: {
      select: {
        mode: "dropdown",
        options: [
          { value: "compact", label: "Compact" },
          { value: "list", label: "List" },
          { value: "year", label: "Year planner" },
        ],
      },
    },
  },
  { name: "title", selector: { text: {} } },
  { name: "show_budget", selector: { boolean: {} } },
  {
    name: "levels",
    selector: {
      select: {
        multiple: true,
        options: ["1", "2", "3", "4", "5"].map((v) => ({
          value: v,
          label: `Level ${v}`,
        })),
      },
    },
  },
];

@customElement(EDITOR_TAG)
export class FenstertageCardEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: FenstertageCardConfig;

  public setConfig(config: FenstertageCardConfig): void {
    this._config = config;
  }

  protected override render(): TemplateResult | typeof nothing {
    if (!this.hass || !this._config) {
      return nothing;
    }
    // levels als Strings für den Multi-Select spiegeln:
    const data = {
      ...this._config,
      levels: (this._config.levels ?? []).map(String),
    };
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${SCHEMA}
        .computeLabel=${(s: { name: string }) => s.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const value = ev.detail.value as FenstertageCardConfig & {
      levels?: string[];
    };
    const config: FenstertageCardConfig = {
      ...value,
      levels: value.levels?.length
        ? value.levels.map(Number)
        : undefined,
    };
    if (config.levels === undefined) {
      delete (config as Record<string, unknown>)["levels"];
    }
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [EDITOR_TAG]: FenstertageCardEditor;
  }
}
```

- [ ] **Step 5: Bauen und verifizieren**

Run: `npm install && npm run build`
Expected: Rollup schreibt `custom_components/fenstertage/www/fenstertage-card.js` ohne TypeScript-Fehler.

Run: `node -e "const s=require('fs').readFileSync('custom_components/fenstertage/www/fenstertage-card.js','utf8'); if(!s.includes('fenstertage-card')) process.exit(1); console.log('bundle OK,', s.length, 'bytes')"`
Expected: `bundle OK, <n> bytes`

Run: `python -m pytest tests/ -v -o addopts=""` (Regression: Backend unverändert grün)
Expected: alle Tests PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json rollup.config.mjs tsconfig.json src custom_components/fenstertage/www
git commit -m "feat: Karten-Grundgerüst mit compact-Modus und GUI-Editor"
```

---

### Task 13: list-Modus der Karte

**Files:**
- Replace: `src/modes/list.ts` (Platzhalter aus Task 12)
- Modify: `src/styles.ts` (List-Styles ergänzen)
- Rebuild: `custom_components/fenstertage/www/fenstertage-card.js`

**Interfaces:**
- Consumes: `CardCtx`, `FenstertageCard.openDialog`, `renderBudget`, `efficiencyColor`, `daysUntil`, `formatDate`.
- Produces: `renderList(ctx: CardCtx, card: FenstertageCard): TemplateResult`.

- [ ] **Step 1: list.ts implementieren**

`src/modes/list.ts` (kompletter neuer Inhalt):

```ts
import { html, nothing, type TemplateResult } from "lit";
import type { FenstertageCard } from "../fenstertage-card";
import { daysUntil, formatDate, renderBudget } from "../shared";
import { efficiencyColor } from "../styles";
import type { CardCtx } from "../types";

export function renderList(
  ctx: CardCtx,
  card: FenstertageCard,
): TemplateResult {
  if (!ctx.blocks.length) {
    return html`<div class="hint">${ctx.t("no_blocks")}</div>`;
  }
  return html`
    <div class="list" role="list">
      ${ctx.blocks.map((block) => {
        const planned = ctx.plannedBlockIds.has(block.block_id);
        const days = daysUntil(block.vacation_dates[0]!);
        return html`
          <button
            class="list-row ${planned ? "planned" : ""}"
            role="listitem"
            @click=${() => card.openDialog({ kind: "block", block })}
          >
            <span class="when">
              <span class="date">${formatDate(ctx, block.vacation_dates[0]!)}</span>
              <span class="muted small">
                ${days === 0 ? ctx.t("today") : ctx.t("in_days", { days })}
              </span>
            </span>
            <span class="ratio num">
              ${block.vacation_days} ${ctx.t("vacation_days_short")} →
              ${block.free_days} ${ctx.t("free_days_short")}
            </span>
            <span
              class="badge"
              style="background:${efficiencyColor(block.efficiency)}"
              >×${block.efficiency.toFixed(1)}</span
            >
            <span class="mark">${planned ? "✓" : ""}</span>
          </button>
        `;
      })}
    </div>
    ${ctx.config.show_budget ? renderBudget(ctx) : nothing}
  `;
}
```

- [ ] **Step 2: List-Styles in styles.ts ergänzen**

In `src/styles.ts` innerhalb von `cardStyles` (vor dem schließenden Backtick)
anfügen:

```css
  /* list-Modus */
  .list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .list-row {
    display: grid;
    grid-template-columns: 1fr auto auto 20px;
    align-items: center;
    gap: 10px;
    width: 100%;
    text-align: left;
    font: inherit;
    color: var(--primary-text-color);
    background: transparent;
    border: none;
    border-radius: 8px;
    padding: 8px 10px;
    cursor: pointer;
    transition: background var(--fen-transition);
  }
  .list-row:hover {
    background: color-mix(in srgb, var(--primary-color) 8%, transparent);
  }
  .list-row.planned {
    background: color-mix(in srgb, var(--primary-color) 14%, transparent);
  }
  .list-row .when {
    display: flex;
    flex-direction: column;
  }
  .list-row .date {
    font-weight: 600;
  }
  .small {
    font-size: 0.75rem;
  }
  .list-row .mark {
    color: var(--primary-color);
    font-weight: 700;
    text-align: center;
  }

  /* compact-Modus */
  .compact .when {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .compact .date {
    font-size: 1.3rem;
    font-weight: 700;
  }
  .compact .what {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 6px;
  }
```

- [ ] **Step 3: Bauen und verifizieren**

Run: `npm run build`
Expected: Build ohne Fehler; Bundle aktualisiert.

- [ ] **Step 4: Commit**

```bash
git add src custom_components/fenstertage/www
git commit -m "feat: list-Modus der Fenstertage-Karte"
```

---

### Task 14: year-Modus — der interaktive Jahresplaner

**Files:**
- Replace: `src/modes/year.ts` (Platzhalter aus Task 12)
- Modify: `src/fenstertage-card.ts` (ein `@state() activeYear` ergänzen)
- Modify: `src/styles.ts` (Jahres-Grid-Styles ergänzen)
- Rebuild: `custom_components/fenstertage/www/fenstertage-card.js`

**Interfaces:**
- Consumes: `ctx.years` (`{ "<jahr>": { holidays, blocks } }`), `ctx.planned`, Card-Methoden `openDialog`, `selStart`.
- Produces: `renderYear(ctx: CardCtx, card: FenstertageCard): TemplateResult`.

**Interaktionsregeln (aus der Spec):**
1. Tap auf geplanten Tag → Dialog `item` (Entfernen).
2. Tap auf Block-Urlaubstag → Dialog `block` (Planen/Entfernen).
3. Tap auf freien Werktag → `selStart` setzen; zweiter Tap → Dialog `range`
   (Start/Ende werden bei „falscher“ Reihenfolge getauscht). Tap auf
   denselben Tag = Eintages-Range.
4. Vergangene Tage, Wochenenden und Feiertage sind nicht selektierbar.

- [ ] **Step 1: activeYear-State in fenstertage-card.ts ergänzen**

In `src/fenstertage-card.ts` unter `selStart` einfügen:

```ts
  /** year-Modus: angezeigtes Jahr (Default: erstes geladenes Jahr). */
  @state() public activeYear?: string;
```

Und in `setConfig` das Reset ergänzen:

```ts
    this.activeYear = undefined;
```

- [ ] **Step 2: year.ts implementieren**

`src/modes/year.ts` (kompletter neuer Inhalt):

```ts
import { html, nothing, type TemplateResult } from "lit";
import type { FenstertageCard } from "../fenstertage-card";
import { renderBudget } from "../shared";
import { efficiencyColor } from "../styles";
import type {
  BlockData,
  CardCtx,
  PlannedItemData,
} from "../types";

const MS_PER_DAY = 86400000;

interface DayCell {
  iso: string;
  day: number;
  weekend: boolean;
  past: boolean;
  holidayName?: string;
  block?: BlockData;
  inFreeRange: boolean;
  planned?: PlannedItemData;
  selected: boolean;
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(
    day,
  ).padStart(2, "0")}`;
}

function todayIso(): string {
  const now = new Date();
  return iso(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Lookup-Tabellen einmal pro Render bauen — O(1) pro Tageszelle. */
function buildLookups(ctx: CardCtx, year: string) {
  const data = ctx.years[year];
  const holidayByIso = new Map<string, string>();
  const blockByVacationIso = new Map<string, BlockData>();
  const freeRangeIso = new Set<string>();
  for (const h of data?.holidays ?? []) {
    holidayByIso.set(h.date, h.local_name);
  }
  const levels = ctx.config.levels;
  for (const b of data?.blocks ?? []) {
    if (levels?.length && !levels.includes(b.level)) {
      continue;
    }
    for (const d of b.vacation_dates) {
      blockByVacationIso.set(d, b);
    }
    const start = new Date(`${b.free_range_start}T00:00:00`);
    const end = new Date(`${b.free_range_end}T00:00:00`);
    for (
      let t = start.getTime();
      t <= end.getTime();
      t += MS_PER_DAY
    ) {
      const d = new Date(t);
      freeRangeIso.add(iso(d.getFullYear(), d.getMonth(), d.getDate()));
    }
  }
  const plannedByIso = new Map<string, PlannedItemData>();
  for (const item of ctx.planned) {
    for (const d of item.vacation_dates) {
      plannedByIso.set(d, item);
    }
  }
  return { holidayByIso, blockByVacationIso, freeRangeIso, plannedByIso };
}

function monthName(ctx: CardCtx, year: number, month: number): string {
  const lang = ctx.hass.locale?.language ?? "en";
  return new Date(year, month, 1).toLocaleDateString(lang, {
    month: "short",
  });
}

function weekdayInitials(ctx: CardCtx): string[] {
  const lang = ctx.hass.locale?.language ?? "en";
  // 2024-01-01 war ein Montag.
  return Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i)
      .toLocaleDateString(lang, { weekday: "narrow" }),
  );
}

function onDayClick(
  card: FenstertageCard,
  cell: DayCell,
): void {
  if (cell.planned) {
    card.openDialog({ kind: "item", item: cell.planned });
    return;
  }
  if (cell.block) {
    card.openDialog({ kind: "block", block: cell.block });
    return;
  }
  if (cell.weekend || cell.holidayName || cell.past) {
    return;
  }
  if (!card.selStart) {
    card.selStart = cell.iso;
    return;
  }
  const [start, end] =
    card.selStart <= cell.iso
      ? [card.selStart, cell.iso]
      : [cell.iso, card.selStart];
  card.openDialog({ kind: "range", start, end });
}

function renderMonth(
  ctx: CardCtx,
  card: FenstertageCard,
  year: number,
  month: number,
  lookups: ReturnType<typeof buildLookups>,
): TemplateResult {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Mo-basierter Offset der ersten Zelle (0 = Montag).
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const today = todayIso();
  const cells: (DayCell | null)[] = Array.from(
    { length: firstWeekday },
    () => null,
  );
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayIso = iso(year, month, day);
    const weekday = (firstWeekday + day - 1) % 7;
    cells.push({
      iso: dayIso,
      day,
      weekend: weekday >= 5,
      past: dayIso < today,
      holidayName: lookups.holidayByIso.get(dayIso),
      block: lookups.blockByVacationIso.get(dayIso),
      inFreeRange: lookups.freeRangeIso.has(dayIso),
      planned: lookups.plannedByIso.get(dayIso),
      selected: card.selStart === dayIso,
    });
  }
  return html`
    <div class="month">
      <div class="month-name">${monthName(ctx, year, month)}</div>
      <div class="month-grid">
        ${weekdayInitials(ctx).map(
          (w) => html`<span class="wd muted">${w}</span>`,
        )}
        ${cells.map((cell) => {
          if (cell === null) {
            return html`<span></span>`;
          }
          const classes = [
            "day",
            cell.weekend ? "weekend" : "",
            cell.past ? "past" : "",
            cell.holidayName ? "holiday" : "",
            cell.inFreeRange && !cell.block ? "range" : "",
            cell.block ? "block" : "",
            cell.planned ? "is-planned" : "",
            cell.selected ? "selected" : "",
            cell.iso === todayIso() ? "today" : "",
          ]
            .filter(Boolean)
            .join(" ");
          const style = cell.block
            ? `--fen-day-color:${efficiencyColor(cell.block.efficiency)}`
            : "";
          return html`
            <button
              class=${classes}
              style=${style}
              title=${cell.holidayName ?? ""}
              @click=${() => onDayClick(card, cell)}
            >
              ${cell.day}
            </button>
          `;
        })}
      </div>
    </div>
  `;
}

export function renderYear(
  ctx: CardCtx,
  card: FenstertageCard,
): TemplateResult {
  const yearKeys = Object.keys(ctx.years).sort();
  if (!yearKeys.length) {
    return html`<div class="hint">${ctx.t("no_blocks")}</div>`;
  }
  const active = card.activeYear ?? yearKeys[0]!;
  const year = Number(active);
  const lookups = buildLookups(ctx, active);
  return html`
    <div class="year-head">
      <div class="year-tabs" role="tablist">
        ${yearKeys.map(
          (y) => html`
            <button
              class="year-tab ${y === active ? "active" : ""}"
              role="tab"
              @click=${() => {
                card.activeYear = y;
                card.selStart = undefined;
              }}
            >
              ${y}
            </button>
          `,
        )}
      </div>
      ${ctx.config.show_budget ? renderBudget(ctx) : nothing}
    </div>
    ${card.selStart
      ? html`<div class="pick-hint">${ctx.t("pick_end")}</div>`
      : nothing}
    <div class="months">
      ${Array.from({ length: 12 }, (_, month) =>
        renderMonth(ctx, card, year, month, lookups),
      )}
    </div>
    <div class="legend muted small">
      <span><i class="dot block-dot"></i>Fenstertag</span>
      <span><i class="dot holiday-dot"></i>${ctx.t("holidays")}</span>
      <span><i class="dot planned-dot"></i>${ctx.t("planned")}</span>
    </div>
  `;
}
```

- [ ] **Step 3: Jahres-Grid-Styles in styles.ts ergänzen**

In `src/styles.ts` innerhalb von `cardStyles` anfügen:

```css
  /* year-Modus */
  .year-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 12px;
  }
  .year-head .budget {
    margin-top: 0;
    min-width: 180px;
    flex: 1;
  }
  .year-tabs {
    display: flex;
    gap: 4px;
  }
  .year-tab {
    font: inherit;
    font-weight: 600;
    background: transparent;
    color: var(--secondary-text-color);
    border: 1px solid var(--divider-color);
    border-radius: 999px;
    padding: 4px 12px;
    cursor: pointer;
    transition: all var(--fen-transition);
  }
  .year-tab.active {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: var(--text-primary-color, #fff);
  }
  .pick-hint {
    margin-bottom: 8px;
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 0.8rem;
    background: color-mix(in srgb, var(--primary-color) 12%, transparent);
    color: var(--primary-text-color);
  }
  .months {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 14px;
  }
  .month-name {
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 4px;
    text-transform: capitalize;
  }
  .month-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
  }
  .wd {
    font-size: 0.6rem;
    text-align: center;
  }
  .day {
    font: inherit;
    font-size: 0.7rem;
    font-variant-numeric: tabular-nums;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--primary-text-color);
    cursor: pointer;
    padding: 0;
    transition: background var(--fen-transition), transform var(--fen-transition);
  }
  .day:hover {
    background: color-mix(in srgb, var(--primary-color) 12%, transparent);
  }
  .day:active {
    transform: scale(0.9);
  }
  .day.weekend {
    color: var(--secondary-text-color);
  }
  .day.past {
    opacity: 0.35;
    cursor: default;
  }
  .day.holiday {
    background: color-mix(in srgb, var(--primary-color) 18%, transparent);
    font-weight: 700;
    cursor: default;
  }
  .day.range {
    box-shadow: inset 0 0 0 1px
      color-mix(in srgb, var(--primary-color) 35%, transparent);
  }
  .day.block {
    background: var(--fen-day-color);
    color: var(--text-primary-color, #fff);
    font-weight: 700;
  }
  .day.is-planned {
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
    font-weight: 700;
    box-shadow: inset 0 0 0 2px var(--card-background-color);
  }
  .day.selected {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }
  .day.today {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .legend {
    display: flex;
    gap: 16px;
    margin-top: 12px;
  }
  .legend .dot {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    margin-right: 5px;
  }
  .legend .block-dot {
    background: var(--primary-color);
    opacity: 0.75;
  }
  .legend .holiday-dot {
    background: color-mix(in srgb, var(--primary-color) 25%, transparent);
  }
  .legend .planned-dot {
    background: var(--primary-color);
  }
`;
```

(Achtung: der bestehende schließende Backtick von `cardStyles` wandert ans
Ende dieses Blocks.)

- [ ] **Step 4: Bauen und manuell verifizieren**

Run: `npm run build`
Expected: Build ohne Fehler.

Manueller Smoke-Test (empfohlen, sofern eine HA-Testinstanz erreichbar ist):
Integration + Karte in einer HA-Instanz installieren, `mode: year` setzen und
die vier Interaktionsregeln durchklicken (Block planen, Range wählen,
geplanten Eintrag entfernen, Budget-Anzeige). Alternativ mit den
chrome-devtools-Skills gegen die HA-UI prüfen.

- [ ] **Step 5: Commit**

```bash
git add src custom_components/fenstertage/www
git commit -m "feat: year-Modus — interaktiver Jahresurlaubsplaner"
```

---

### Task 15: CI-Workflows, Dependabot, README

**Files:**
- Create: `.github/workflows/validate.yml`
- Create: `.github/dependabot.yml`
- Create: `README.md`

**Interfaces:**
- Consumes: gesamte Repo-Struktur.
- Produces: CI mit vier Jobs (hassfest, HACS, pytest, Card-Build-Drift-Check).

- [ ] **Step 1: validate.yml schreiben**

`.github/workflows/validate.yml`:

```yaml
name: Validate

on:
  push:
  pull_request:
  schedule:
    - cron: "0 4 * * 1"
  workflow_dispatch:

jobs:
  hassfest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: home-assistant/actions/hassfest@master

  hacs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hacs/action@main
        with:
          category: integration

  tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.14"
      - run: pip install -r requirements_test.txt
      - run: python -m pytest tests/ -v

  card-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
      - run: npm ci
      - run: npm run build
      # Das eingecheckte Bundle muss dem Quellstand entsprechen —
      # sonst hat jemand src/ geändert ohne neu zu bauen.
      - run: git diff --exit-code custom_components/fenstertage/www
```

`.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: pip
    directory: /
    schedule:
      interval: weekly
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

- [ ] **Step 2: README.md schreiben**

`README.md` mit diesen Abschnitten (Texte ausformulieren, Deutsch,
Screenshots als TODO-Platzhalter-Kommentare markieren — echte Screenshots
nach dem ersten manuellen Test ergänzen):

```markdown
# Fenstertage HA

[![Validate](https://github.com/spiral023/fenstertage-ha/actions/workflows/validate.yml/badge.svg)](https://github.com/spiral023/fenstertage-ha/actions/workflows/validate.yml)

Home-Assistant-Integration für [fenstertage.com](https://fenstertage.com):
Feiertage, Werktags-Statistiken und Fenstertage (Brückentage) für
Österreich, Deutschland und die Schweiz — inklusive interaktiver
Lovelace-Karte zur Jahresurlaubsplanung mit Urlaubsbudget.

## Features
- 5 Sensoren (nächster/bester Fenstertag, verbleibende Werktage,
  Feiertage, Resturlaub) + 2 Binary-Sensoren (heute Feiertag /
  Fenstertag) — Tabelle mit allen Entities und Attributen.
- Urlaubsplanung: 4 Services (`fenstertage.plan_bridge_day`,
  `plan_vacation`, `remove_vacation`, `set_budget`) mit YAML-Beispielen
  für Automationen.
- Lovelace-Karte `custom:fenstertage-card` mit `mode: compact | list |
  year` — Konfigurations-Referenz (entity, mode, title, show_budget,
  levels) als Tabelle + YAML-Beispiel pro Modus.

## Installation
- via HACS (Custom Repository `spiral023/fenstertage-ha`, Kategorie
  Integration) und manuell; danach Neustart + Integration hinzufügen.
- Konfigurationsparameter (Land, Region) und Optionen (max_level,
  Vorschau-Jahre, Intervall, Urlaubsbudget) dokumentieren.

## Datenquelle & Update-Verhalten
- fenstertage.com, ein Call pro Jahr, Standard alle 12 h; Attribution.

## Entfernen
- Integration entfernen löscht auch die gespeicherten Planungen
  (`.storage/fenstertage.<entry_id>`).

## Bekannte Grenzen
- Planungen sind pro Land/Region-Entry (v1: eine Person).
- Freie Ranges max. 60 Tage; Jahre außerhalb der Vorschau nicht planbar.

## Troubleshooting
- Karte erscheint nicht → Lovelace-Resource prüfen (YAML-Modus:
  manuell `/fenstertage/fenstertage-card.js` als Modul eintragen).
- `cannot_connect` beim Einrichten → fenstertage.com erreichbar?
```

- [ ] **Step 3: Verifizieren**

Run: `python -c "import yaml,io; yaml.safe_load(io.open('.github/workflows/validate.yml',encoding='utf-8')); yaml.safe_load(io.open('.github/dependabot.yml',encoding='utf-8')); print('OK')"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add .github README.md
git commit -m "ci: Validate-Workflow, Dependabot und README"
```

---

### Task 16: Gesamtsuite, Coverage-Gate, Abschluss-Validierung

**Files:**
- Modify: nur Testlücken-Nachbesserungen, falls das Coverage-Gate reißt.

- [ ] **Step 1: Gesamtsuite mit Coverage-Gate laufen lassen**

Run: `python -m pytest tests/ -v`
Expected: alle Tests PASS **und** `Required test coverage of 90% reached`.

Falls unter 90 %: `python -m pytest tests/ --cov-report=term-missing` und
gezielt Tests für die gemeldeten Lücken nachziehen (typische Kandidaten:
Fehlerpfade in `card_registration.py`, `derive.py`-Randfälle,
`config_flow`-`unknown`-Fehlerzweig). KEINE `pragma: no cover`-Spraying —
nur echte Tests oder begründete Einzelfälle.

- [ ] **Step 2: mypy strict + ruff**

Run: `python -m mypy` und `python -m ruff check custom_components tests`
Expected: beide ohne Fehler. Typfehler beheben (nicht per ignore
wegdrücken, außer an den im Referenz-Repo dokumentierten HA-Versions-
Grenzen in `card_registration.py`).

- [ ] **Step 3: hassfest + HACS lokal grob prüfen**

Ein voller hassfest-Lauf passiert in CI; lokal mindestens:

Run: `python -c "import json; m=json.load(open('custom_components/fenstertage/manifest.json')); assert sorted(m) == sorted(['domain','name','after_dependencies','codeowners','config_flow','dependencies','documentation','integration_type','iot_class','issue_tracker','loggers','requirements','version']); print('manifest OK')"`
Expected: `manifest OK`

Run: `python -m pytest tests/ -q` (letzter Regressionslauf)
Expected: PASS.

- [ ] **Step 4: Docker-Verifikation (optional, wie im Auftrag vorgesehen)**

Falls lokal kein Python 3.14 verfügbar ist oder das Ergebnis abgesichert
werden soll:

```bash
docker run --rm -v "$PWD":/app -w /app python:3.14 \
  bash -c "pip install -r requirements_test.txt -q && python -m pytest tests/ -v"
```

Expected: identisches Ergebnis wie lokal.

- [ ] **Step 5: Abschluss-Commit + Zusammenfassung**

```bash
git add -A
git commit -m "test: Coverage-Lücken geschlossen, Abschluss-Validierung"
```

Danach: `superpowers:finishing-a-development-branch` verwenden (Merge/PR-
Entscheidung liegt beim User). GitHub-Repo `spiral023/fenstertage-ha`
existiert ggf. noch nicht — Push/Remote-Anlage nur nach Rückfrage.

---

## Nicht in diesem Plan (bewusst)

- `calendar.py`-Plattform, mehrere Personen, To-do-Buchung, automatische
  Urlaubsvorschläge — Ausbaupfad laut Spec §12, Architektur ist vorbereitet.
- Brands-PR (`home-assistant/brands`) für Logo/Icon — separat einreichen
  (`quality_scale.yaml`-Eintrag `brands: todo`).
- Screenshots im README — nach erstem manuellem Test in einer echten
  HA-Instanz ergänzen.
