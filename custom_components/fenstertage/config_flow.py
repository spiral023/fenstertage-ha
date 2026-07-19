"""Configuration and options flows for the Fenstertage integration."""
from __future__ import annotations

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

from .api import (
    FenstertageApiClient,
    FenstertageApiError,
    FenstertageConnectionError,
)
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


def _options_schema(defaults: Mapping[str, Any]) -> vol.Schema:
    """Build the options form with current values as defaults."""
    return vol.Schema(
        {
            vol.Required(
                CONF_MAX_LEVEL,
                default=defaults.get(CONF_MAX_LEVEL, DEFAULT_MAX_LEVEL),
            ): NumberSelector(
                NumberSelectorConfig(
                    min=1,
                    max=5,
                    step=1,
                    mode=NumberSelectorMode.SLIDER,
                )
            ),
            vol.Required(
                CONF_PREVIEW_YEARS,
                default=defaults.get(
                    CONF_PREVIEW_YEARS,
                    DEFAULT_PREVIEW_YEARS,
                ),
            ): NumberSelector(
                NumberSelectorConfig(
                    min=0,
                    max=3,
                    step=1,
                    mode=NumberSelectorMode.SLIDER,
                )
            ),
            vol.Required(
                CONF_UPDATE_INTERVAL_HOURS,
                default=defaults.get(
                    CONF_UPDATE_INTERVAL_HOURS,
                    DEFAULT_UPDATE_INTERVAL_HOURS,
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
                    CONF_VACATION_BUDGET,
                    DEFAULT_VACATION_BUDGET,
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
    """Handle country and optional subdivision configuration."""

    VERSION = 1
    MINOR_VERSION = 1

    def __init__(self) -> None:
        """Initialize the flow with the default country."""
        self._country = "AT"

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: ConfigEntry,
    ) -> FenstertageOptionsFlow:
        """Return the options flow handler for an entry."""
        return FenstertageOptionsFlow()

    async def async_step_user(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> ConfigFlowResult:
        """Select a country and branch where regions are available."""
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
                                SelectOptionDict(value=country, label=country)
                                for country in COUNTRIES
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
        self,
        user_input: dict[str, Any] | None = None,
    ) -> ConfigFlowResult:
        """Select a region or a country-wide result for DE and CH."""
        errors: dict[str, str] = {}
        if user_input is not None:
            raw = str(user_input.get(CONF_SUBDIVISION, ""))
            subdivision = (
                None if raw == SUBDIVISION_NATIONWIDE else raw
            )
            result = await self._async_try_create(subdivision, errors)
            if result is not None:
                return result

        options = [
            SelectOptionDict(
                value=SUBDIVISION_NATIONWIDE,
                label=SUBDIVISION_NATIONWIDE,
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
                        CONF_SUBDIVISION,
                        default=SUBDIVISION_NATIONWIDE,
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
        self,
        subdivision: str | None,
        errors: dict[str, str],
    ) -> ConfigFlowResult | None:
        """Ensure uniqueness and probe the upstream API before creation."""
        await self.async_set_unique_id(
            f"{self._country}_{subdivision or 'none'}"
        )
        self._abort_if_unique_id_configured()

        client = FenstertageApiClient(async_get_clientsession(self.hass))
        try:
            await client.async_get_metrics(
                self._country,
                dt_util.now().date().year,
                subdivision,
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
    """Configure data loading and vacation planning options."""

    async def async_step_init(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> ConfigFlowResult:
        """Show the options form or save validated option values."""
        if user_input is not None:
            return self.async_create_entry(
                data={
                    CONF_MAX_LEVEL: int(user_input[CONF_MAX_LEVEL]),
                    CONF_PREVIEW_YEARS: int(
                        user_input[CONF_PREVIEW_YEARS]
                    ),
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
            step_id="init",
            data_schema=_options_schema(config),
        )
