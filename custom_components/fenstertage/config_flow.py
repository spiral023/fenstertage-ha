"""Config flow entry point for the Fenstertage integration."""
from __future__ import annotations

from homeassistant import config_entries

from .const import DOMAIN


class FenstertageConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Temporary entry point; Task 6 supplies the configuration steps."""

    VERSION = 1
