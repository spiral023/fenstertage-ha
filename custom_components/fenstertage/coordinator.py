"""DataUpdateCoordinator for Fenstertage metrics."""
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
    """Metrics grouped by every currently loaded year."""

    years: dict[int, YearMetrics]


@dataclass
class FenstertageRuntimeData:
    """Runtime objects attached to a loaded config entry."""

    coordinator: FenstertageCoordinator
    planner: PlannerStore


type FenstertageConfigEntry = ConfigEntry[FenstertageRuntimeData]


class FenstertageCoordinator(DataUpdateCoordinator[FenstertageData]):
    """Fetch metrics for the current and configured preview years."""

    config_entry: FenstertageConfigEntry

    def __init__(
        self, hass: HomeAssistant, entry: FenstertageConfigEntry
    ) -> None:
        """Initialize the coordinator from entry data and options."""
        config = {**entry.data, **entry.options}
        self._country = str(config[CONF_COUNTRY])
        self._subdivision = config.get(CONF_SUBDIVISION) or None
        self._max_level = int(config.get(CONF_MAX_LEVEL, DEFAULT_MAX_LEVEL))
        self._preview_years = int(
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
        """Fetch requested years while retaining stale preview metrics."""
        current_year = dt_util.now().date().year
        wanted_years = [
            current_year + offset for offset in range(self._preview_years + 1)
        ]
        previous = self.data.years if self.data else {}
        years: dict[int, YearMetrics] = {}

        for year in wanted_years:
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
