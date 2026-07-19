"""Coordinator tests for multi-year loading and refresh behavior."""
from __future__ import annotations

import datetime as dt
from collections.abc import Callable
from unittest.mock import AsyncMock, MagicMock, patch

from freezegun.api import FrozenDateTimeFactory
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
)

from custom_components.fenstertage.api import FenstertageConnectionError
from custom_components.fenstertage.const import CONF_PREVIEW_YEARS
from tests.conftest import default_metrics, setup_entry


async def test_fetches_current_plus_preview_year(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    """The coordinator loads the current and default preview year."""
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
    """A preview range of zero only loads the current calendar year."""
    freezer.move_to("2026-07-19")
    mock_config_entry.add_to_hass(hass)
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
    """Failure loading the current year defers entry setup for a retry."""
    freezer.move_to("2026-07-19")
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
    """A failed preview fetch retains cached data for that preview year."""
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
    assert 2027 in coordinator.data.years


async def test_midnight_tick_notifies_listeners_without_api_call(
    hass: HomeAssistant,
    mock_api: AsyncMock,
    mock_config_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    """The midnight tick refreshes derived states without a network call."""
    freezer.move_to("2026-07-19 23:50:00+00:00")
    midnight_tick: Callable[[dt.datetime], None] | None = None

    def _track_time_change(
        _hass: HomeAssistant,
        action: Callable[[dt.datetime], None],
        **_kwargs: object,
    ) -> Callable[[], None]:
        nonlocal midnight_tick
        midnight_tick = action
        return lambda: None

    with patch(
        "custom_components.fenstertage.async_track_time_change",
        side_effect=_track_time_change,
    ) as track_time_change:
        await setup_entry(hass, mock_config_entry)

    coordinator = mock_config_entry.runtime_data.coordinator
    calls_before = mock_api.call_count
    listener = MagicMock()
    unsub = coordinator.async_add_listener(listener)

    track_time_change.assert_called_once_with(
        hass,
        midnight_tick,
        hour=0,
        minute=0,
        second=5,
    )
    assert midnight_tick is not None
    midnight_tick(dt_util.utcnow())
    assert listener.called
    assert mock_api.call_count == calls_before
    unsub()
