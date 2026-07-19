"""Config and options flow tests."""
from __future__ import annotations

from unittest.mock import patch

from homeassistant.config_entries import SOURCE_USER
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.fenstertage.api import FenstertageConnectionError
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
from tests.conftest import default_metrics, setup_entry


def _patch_probe(**kwargs: object):
    """Patch the config-flow validation request."""
    return patch(
        "custom_components.fenstertage.config_flow."
        "FenstertageApiClient.async_get_metrics",
        **kwargs,
    )


def _patch_setup():
    """Prevent config entry setup from performing a coordinator refresh."""
    return patch(
        "custom_components.fenstertage.async_setup_entry",
        return_value=True,
    )


async def test_at_flow_creates_entry_without_subdivision(
    hass: HomeAssistant,
) -> None:
    """The Austrian flow skips the subdivision step."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": SOURCE_USER},
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"

    with (
        _patch_probe(return_value=default_metrics(2026)) as probe,
        _patch_setup(),
    ):
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            {CONF_COUNTRY: "AT"},
        )

    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Fenstertage AT"
    assert result["data"] == {CONF_COUNTRY: "AT", CONF_SUBDIVISION: None}
    assert result["result"].unique_id == "AT_none"
    assert probe.called


async def test_de_flow_asks_for_subdivision(hass: HomeAssistant) -> None:
    """Germany requires a region selection before validation."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": SOURCE_USER},
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {CONF_COUNTRY: "DE"},
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "subdivision"

    with _patch_probe(return_value=default_metrics(2026)), _patch_setup():
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            {CONF_SUBDIVISION: "DE-BY"},
        )

    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Fenstertage DE-BY"
    assert result["data"] == {CONF_COUNTRY: "DE", CONF_SUBDIVISION: "DE-BY"}
    assert result["result"].unique_id == "DE_DE-BY"


async def test_de_flow_nationwide_maps_to_none(hass: HomeAssistant) -> None:
    """The nationwide selector value becomes a missing subdivision filter."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": SOURCE_USER},
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {CONF_COUNTRY: "DE"},
    )
    with _patch_probe(return_value=default_metrics(2026)), _patch_setup():
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            {CONF_SUBDIVISION: SUBDIVISION_NATIONWIDE},
        )

    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["data"] == {CONF_COUNTRY: "DE", CONF_SUBDIVISION: None}
    assert result["result"].unique_id == "DE_none"


async def test_duplicate_entry_aborts(hass: HomeAssistant) -> None:
    """A configured country and region combination cannot be added twice."""
    MockConfigEntry(
        domain=DOMAIN,
        data={CONF_COUNTRY: "AT", CONF_SUBDIVISION: None},
        unique_id="AT_none",
    ).add_to_hass(hass)
    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": SOURCE_USER},
    )
    with _patch_probe(return_value=default_metrics(2026)):
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            {CONF_COUNTRY: "AT"},
        )

    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "already_configured"


async def test_cannot_connect_shows_error_then_recovers(
    hass: HomeAssistant,
) -> None:
    """A failed live probe returns a recoverable form error."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": SOURCE_USER},
    )
    with _patch_probe(side_effect=FenstertageConnectionError("down")):
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            {CONF_COUNTRY: "AT"},
        )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": "cannot_connect"}

    with _patch_probe(return_value=default_metrics(2026)), _patch_setup():
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"],
            {CONF_COUNTRY: "AT"},
        )
    assert result["type"] is FlowResultType.CREATE_ENTRY


async def test_options_flow_roundtrip(
    hass: HomeAssistant,
    mock_api: object,
    mock_config_entry: MockConfigEntry,
    freezer: object,
) -> None:
    """The options flow saves all coordinator and planner options."""
    freezer.move_to("2026-07-19")
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
