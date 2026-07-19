"""Tests for planner.py — PHACC's hass fixture, no config entry needed."""
from __future__ import annotations

import datetime as dt

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers.storage import Store

from custom_components.fenstertage.const import (
    DOMAIN,
    SOURCE_BRIDGE_DAY,
    SOURCE_MANUAL,
    STORAGE_VERSION,
)
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


async def test_explicit_empty_vacation_dates_are_rejected(
    hass: HomeAssistant,
) -> None:
    store = PlannerStore(hass, "entry_empty_dates", default_budget=25)
    await store.async_load()

    with pytest.raises(ServiceValidationError):
        await store.async_add_item(
            start=D(2026, 5, 15),
            end=D(2026, 5, 15),
            holidays=set(),
            source=SOURCE_BRIDGE_DAY,
            vacation_dates=(),
        )


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


async def test_load_migrates_legacy_store_version(hass: HomeAssistant) -> None:
    key = f"{DOMAIN}.entry_legacy"
    legacy_store: Store[dict[str, object]] = Store(hass, 0, key)
    await legacy_store.async_save(
        {
            "budgets": {"2026": 30},
            "items": [
                {
                    "id": "legacy",
                    "start": "2026-08-03",
                    "end": "2026-08-04",
                    "vacation_dates": ["2026-08-03", "2026-08-04"],
                    "source": SOURCE_MANUAL,
                    "block_id": None,
                    "created_at": "",
                }
            ],
        }
    )

    store = PlannerStore(hass, "entry_legacy", default_budget=25)
    await store.async_load()

    assert store.budget_for(2026) == 30
    assert [item.id for item in store.items] == ["legacy"]
    current_store: Store[dict[str, object]] = Store(hass, STORAGE_VERSION, key)
    assert await current_store.async_load() == {
        "budgets": {"2026": 30},
        "items": [
            {
                "id": "legacy",
                "start": "2026-08-03",
                "end": "2026-08-04",
                "vacation_dates": ["2026-08-03", "2026-08-04"],
                "source": SOURCE_MANUAL,
                "block_id": None,
                "created_at": "",
            }
        ],
    }


async def test_load_skips_items_with_invalid_source_or_block_id(
    hass: HomeAssistant,
) -> None:
    store = PlannerStore(hass, "entry_invalid_items", default_budget=25)
    await store._store.async_save(  # noqa: SLF001 — gezielter Whitebox-Test
        {
            "budgets": {},
            "items": [
                {
                    "id": "manual-with-block",
                    "start": "2026-08-03",
                    "end": "2026-08-03",
                    "vacation_dates": ["2026-08-03"],
                    "source": SOURCE_MANUAL,
                    "block_id": "2026-08-03_1d",
                    "created_at": "",
                },
                {
                    "id": "unknown-source",
                    "start": "2026-08-04",
                    "end": "2026-08-04",
                    "vacation_dates": ["2026-08-04"],
                    "source": "other",
                    "block_id": None,
                    "created_at": "",
                },
                {
                    "id": "bridge",
                    "start": "2026-08-05",
                    "end": "2026-08-05",
                    "vacation_dates": ["2026-08-05"],
                    "source": SOURCE_BRIDGE_DAY,
                    "block_id": "2026-08-05_1d",
                    "created_at": "",
                },
            ],
        }
    )

    await store.async_load()

    assert [item.id for item in store.items] == ["bridge"]


@pytest.mark.parametrize(
    ("source", "block_id"),
    [("other", None), (SOURCE_MANUAL, "2026-08-03_1d")],
)
async def test_add_rejects_invalid_internal_source_combinations(
    hass: HomeAssistant, source: str, block_id: str | None
) -> None:
    store = PlannerStore(hass, "entry_invalid_source", default_budget=25)
    await store.async_load()

    with pytest.raises(ValueError):
        await store.async_add_item(
            start=D(2026, 8, 3),
            end=D(2026, 8, 3),
            holidays=set(),
            source=source,
            block_id=block_id,
        )
