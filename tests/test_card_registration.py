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
