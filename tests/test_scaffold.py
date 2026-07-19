"""Tests for the repository scaffold."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_manifest_and_hacs_metadata_are_valid_json() -> None:
    """The integration metadata is parseable JSON."""
    manifest = json.loads(
        (ROOT / "custom_components" / "fenstertage" / "manifest.json").read_text(
            encoding="utf-8"
        )
    )
    hacs = json.loads((ROOT / "hacs.json").read_text(encoding="utf-8"))

    assert manifest["domain"] == "fenstertage"
    assert hacs["name"] == "Fenstertage HA"


def test_constants_expose_supported_subdivision_counts() -> None:
    """The constants module declares the supported countries and subdivisions."""
    from custom_components.fenstertage import const

    assert const.DOMAIN == "fenstertage"
    assert len(const.SUBDIVISIONS["DE"]) == 16
    assert len(const.SUBDIVISIONS["CH"]) == 26
