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
- [x] 5. `coordinator.py` + `__init__.py` + `conftest` — Mehrjahres-Fetch und Entry-Lifecycle
- [x] 6. `config_flow.py` + Übersetzungen
- [x] 7. `entity.py` + `sensor.py` — die fünf Sensoren
- [x] 8. `binary_sensor.py` — `holiday_today`, `bridge_day_today`
- [x] 9. `services.py` + `services.yaml` — die vier Planungs-Services
- [x] 10. `diagnostics.py` + `quality_scale.yaml`
- [x] 11. `card_registration.py` + Verdrahtung in `__init__.py`
- [x] 12. Karten-Grundgerüst — Build-Setup, Typen, Lokalisierung, Styles, compact-Modus, Editor
- [x] 13. list-Modus der Karte
- [x] 14. year-Modus — der interaktive Jahresurlaubsplaner
- [x] 15. CI-Workflows, Dependabot, README
- [x] 16. Gesamtsuite, Coverage-Gate, Abschluss-Validierung

## Zusatzaufgaben

- [x] App-Icon für Fenstertage (Kalender, Brücke und Alpenraum) mit transparentem Hintergrund erstellt und visuell geprüft.

## Wartung — 2026-10-27

- [x] Fehler auf unverändertem main frisch nachgestellt: veralteter Geräte-Lookup,
  1 fehlgeschlagener / 97 bestandene Tests. Bestehenden Lifecycle-Test auf den
  Config-Entry-bezogenen Lookup umgestellt; alle 98 Tests unter HA 2026.10.4
  bestanden, Coverage 94,67 %.
- [x] Ruff-Befunde in Test-Typen/Imports und überholte Noqa-Hinweise bereinigt.
  mypy prüft die tatsächlichen Probatio-Typen des aktuellen HA-Shims; die
  Voluptuous-Runtime-Imports für ältere HA-Versionen bleiben erhalten. Ruff und
  mypy sind nun auch Teil der CI. Doppelte Push-/PR-Läufe derselben Änderung
  vermieden und Pip-Cache aktiviert.
- [x] TypeScript-7-PR #4 untersucht: reproduzierbarer Build-Abbruch in
  @rollup/plugin-typescript (`ScriptTarget.ES2015` fehlt), auch mit Plugin 12.3.0.
  Auf Philipps Entscheidung bleibt TypeScript 6; Version 7 wird vorerst von
  Dependabot ausgenommen.
- [x] Die Python-/Actions-PRs #2, #3, #6, #8, #39, #42 und #45 nach frischen
  Prüfungen übernommen. Konflikte durch benachbarte Versionszeilen aufgelöst
  und die betroffenen PRs erneut vollständig geprüft.
- [ ] TypeScript 7 erneut bewerten, sobald der Rollup-TypeScript-Adapter die
  neue Compiler-API unterstützt; keine Abschaltung von Build-/Typprüfungen.

- [x] Gekoppelte Karten-Build-Updates zusammen geprüft: Rollup 4.65.1,
  TypeScript-Plugin 12.3.1, Terser-Plugin 1.0.2; TypeScript bleibt 6.0.3.
  serialize-javascript innerhalb seines bestehenden Bereichs auf einen
  gepatchten Stand gebracht; vollständiger npm-Audit ohne bekannte Befunde.
  Karten-Bundle neu erzeugt, Integration-/Karten-Version 0.3.1 vorbereitet;
  98 Tests, Ruff und mypy erneut grün. PRs #41/#43/#44 sind damit inhaltlich
  übernommen und von Dependabot geschlossen; GitHub-Prüfungen bestanden.
- [x] Patchrelease 0.3.1 nach grüner finaler GitHub-CI veröffentlicht:
  Tag und Release zeigen auf `9f8efad64b24fac9ae79252620c2e56cea912b23`.
  Alle vier Jobs (Hassfest, HACS, Python-Qualität/98 Tests, Karten-Build ohne
  Drift) erfolgreich. Die sechs Renovate-Repos haben ebenfalls keine offenen
  PRs (Kontrolle am 2026-10-27). Keine Änderung an der laufenden HA-Installation.
