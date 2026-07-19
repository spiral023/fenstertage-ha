# Implementierungsplan – Aufgaben

Quelle: `docs/superpowers/plans/2026-07-19-fenstertage-ha.md`.

Den Fortschritt pflegen wir hier während der Umsetzung. Eine Aufgabe wird erst
nach erfolgreicher Prüfung als erledigt markiert.

Recherche (2026-07-19) für die anstehende HACS-Integration und Lovelace-Karte:
Die Home-Assistant-Entwicklerdokumentation verlangt bei Custom Integrations
vollständige Sprachdateien unter `custom_components/<domain>/translations/`
und rät ausdrücklich von `strings.json` ab. Aufgabe 6 verwendet daher
`translations/en.json` und `translations/de.json`. Keine
Implementierungsaufgabe wurde durch diese Recherche als erledigt markiert.

- [x] 1. Repo-Grundgerüst (manifest, hacs.json, const.py, Tooling)
- [x] 2. `api.py` — Client, Dataclasses, Exceptions, Mojibake-Fix
- [x] 3. `planner.py` — PlannerStore, Budget, Validierung
- [x] 4. `derive.py` — pure Ableitungen + Test-Factories
- [ ] 5. `coordinator.py` + `__init__.py` + `conftest` — Mehrjahres-Fetch und Entry-Lifecycle
- [ ] 6. `config_flow.py` + Übersetzungen
- [ ] 7. `entity.py` + `sensor.py` — die fünf Sensoren
- [ ] 8. `binary_sensor.py` — `holiday_today`, `bridge_day_today`
- [ ] 9. `services.py` + `services.yaml` — die vier Planungs-Services
- [ ] 10. `diagnostics.py` + `quality_scale.yaml`
- [ ] 11. `card_registration.py` + Verdrahtung in `__init__.py`
- [ ] 12. Karten-Grundgerüst — Build-Setup, Typen, Lokalisierung, Styles, compact-Modus, Editor
- [ ] 13. list-Modus der Karte
- [ ] 14. year-Modus — der interaktive Jahresurlaubsplaner
- [ ] 15. CI-Workflows, Dependabot, README
- [ ] 16. Gesamtsuite, Coverage-Gate, Abschluss-Validierung
