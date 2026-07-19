"""Pure unit tests for derive.py."""
from __future__ import annotations

import datetime as dt
from dataclasses import replace

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


def test_upcoming_block_helpers_skip_blocks_without_vacation_dates() -> None:
    empty = replace(make_block("2026-01-02"), vacation_dates=())
    future = make_block("2026-05-15", efficiency=4.0)
    years = {2026: make_metrics(2026, blocks=(empty, future))}

    assert upcoming_blocks(years, D(2026, 1, 1)) == [future]
    assert next_block(years, D(2026, 1, 1)) == future
    assert best_block(years, D(2026, 1, 1)) == future


def test_block_helpers_use_canonical_order_for_equal_blocks() -> None:
    first = make_block("2026-05-15", vacation_days=1)
    second = make_block("2026-05-15", vacation_days=2)
    forward = {
        2026: make_metrics(2026, blocks=(second, first)),
        2027: make_metrics(2027),
    }
    reversed_order = {
        2027: make_metrics(2027),
        2026: make_metrics(2026, blocks=(first, second)),
    }

    for years in (forward, reversed_order):
        assert [block.block_id for block in upcoming_blocks(years, D(2026, 1, 1))] == [
            first.block_id,
            second.block_id,
        ]
        assert next_block(years, D(2026, 1, 1)) == first
        assert best_block(years, D(2026, 1, 1)) == first


def test_block_helpers_order_colliding_block_ids_deterministically() -> None:
    first = make_block(
        "2026-05-15",
        level=1,
        free_range=("2026-05-01", "2026-05-31"),
    )
    second = make_block(
        "2026-05-15",
        level=2,
        free_range=("2026-05-10", "2026-05-20"),
    )
    assert first.block_id == second.block_id
    forward = {
        2026: make_metrics(2026, blocks=(second, first)),
        2027: make_metrics(2027),
    }
    reversed_order = {
        2027: make_metrics(2027),
        2026: make_metrics(2026, blocks=(first, second)),
    }

    for years in (forward, reversed_order):
        assert [block.level for block in upcoming_blocks(years, D(2026, 1, 1))] == [
            first.level,
            second.level,
        ]
        assert next_block(years, D(2026, 1, 1)) == first
        assert best_block(years, D(2026, 1, 1)) == first
        assert block_covering(years, D(2026, 5, 15)) == first


def test_next_block_and_empty() -> None:
    assert next_block(_years(), D(2026, 5, 1)).block_id == "2026-05-15_1d"
    assert next_block({}, D(2026, 5, 1)) is None
    assert next_block(_years(), D(2028, 1, 1)) is None


def test_best_block_prefers_efficiency_then_earlier_date() -> None:
    assert best_block(_years(), D(2026, 5, 1)).block_id == "2027-05-14_1d"
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
    metrics = make_metrics(2026)
    assert workdays_remaining(metrics, D(2026, 12, 30)) == 2
    metrics2 = make_metrics(2026, holidays=(make_holiday("2026-12-31"),))
    assert workdays_remaining(metrics2, D(2026, 12, 30)) == 1
    assert workdays_remaining(metrics, D(2027, 1, 5)) == 0


def test_holiday_on() -> None:
    metrics = _years()[2026]
    assert holiday_on(metrics, D(2026, 5, 14)).local_name == "Christi Himmelfahrt"
    assert holiday_on(metrics, D(2026, 5, 15)) is None


def test_block_covering_uses_free_range() -> None:
    years = _years()
    assert block_covering(years, D(2026, 5, 16)).block_id == "2026-05-15_1d"
    assert block_covering(years, D(2026, 7, 1)) is None


def test_block_covering_uses_canonical_order_for_overlaps() -> None:
    first = make_block("2026-05-15", free_range=("2026-05-01", "2026-05-31"))
    second = make_block("2026-05-16", free_range=("2026-05-01", "2026-05-31"))
    forward = {
        2026: make_metrics(2026, blocks=(second, first)),
        2027: make_metrics(2027),
    }
    reversed_order = {
        2027: make_metrics(2027),
        2026: make_metrics(2026, blocks=(first, second)),
    }

    assert block_covering(forward, D(2026, 5, 20)) == first
    assert block_covering(reversed_order, D(2026, 5, 20)) == first


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
