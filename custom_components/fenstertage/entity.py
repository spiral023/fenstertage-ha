"""Base entity for Fenstertage."""
from __future__ import annotations

from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import ATTRIBUTION, DOMAIN
from .coordinator import FenstertageConfigEntry, FenstertageCoordinator


class FenstertageEntity(CoordinatorEntity[FenstertageCoordinator]):
    """Common base: device info, unique_id, translation_key."""

    _attr_has_entity_name = True
    _attr_attribution = ATTRIBUTION

    def __init__(
        self,
        coordinator: FenstertageCoordinator,
        entry: FenstertageConfigEntry,
        key: str,
    ) -> None:
        super().__init__(coordinator)
        self._entry = entry
        # KEEP THIS FORMAT STABLE — changes wipe existing registry rows.
        self._attr_unique_id = f"{entry.entry_id}_{key}"
        self._attr_translation_key = key
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=entry.title,
            manufacturer="fenstertage.com",
            entry_type=DeviceEntryType.SERVICE,
            configuration_url="https://fenstertage.com",
        )
