"""Constants for the Fenstertage integration."""
from __future__ import annotations

DOMAIN = "fenstertage"
NAME = "Fenstertage"
VERSION = "0.1.0"
CARD_VERSION = "0.2.0"

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

# Dropdown sentinel for a country-wide query without a subdivision filter.
SUBDIVISION_NATIONWIDE = "nationwide"

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
