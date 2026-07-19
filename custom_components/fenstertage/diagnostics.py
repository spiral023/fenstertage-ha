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
