# Design: Fenstertage HA — HACS-Integration für Home Assistant

**Datum:** 2026-07-19
**Repo:** https://github.com/spiral023/fenstertage-ha
**Domain:** `fenstertage` · **Name:** "Fenstertage" · **Codeowner:** `@spiral023`
**Referenz-Architektur:** `linz-linien-austria` (lokal: `C:\Users\asi\Documents\GitHub\linz-linien-austria`)

## 1. Ziel und Scope

Eigenständige, über HACS installierbare Home-Assistant-Integration für die
öffentliche API **fenstertage.com** (Feiertage, Werktags-Statistiken,
Fenstertage/Brückentage für AT/DE/CH), plus eine Lovelace-Karte mit drei Modi
(`compact`, `list`, `year`). Der `year`-Modus ist ein **interaktiver
Jahresurlaubsplaner**: Fenstertag-Blöcke und freie Datums-Ranges können als
Urlaub geplant werden, mit Urlaubsbudget pro Jahr. Planungen werden
serverseitig (HA Storage) persistiert und über Services geschrieben.

Architektur-Leitplanke: v1 legt das Fundament für einen späteren vollen
Urlaubsplaner (Kalender-Plattform, mehrere Personen, To-do-Buchung), ohne ihn
umzusetzen. Nichts in v1 darf diesen Ausbau zu einem Rewrite zwingen.

**Nicht in v1:** `calendar.py`-Plattform, mehrere Personen pro Entry,
To-do-Listen-Anbindung, automatische Urlaubsvorschläge über die API-Blöcke
hinaus.

## 2. API-Vertrag (fenstertage.com)

- Basis-URL `https://fenstertage.com`, kein Auth, kein API-Key.
- Es wird **ausschließlich `/api/metrics`** genutzt — kombiniert holidays,
  stats und bridge-days; genau **ein HTTP-Call pro benötigtem Jahr**.
- Query-Parameter: `country` (ISO-3166-1 Alpha-2, def. `AT`), `year`
  (1970–2100), `subdivision` (nur DE/CH), `maxLevel` (1–5, def. 5).
- Antwortfelder (verifiziert am 2026-07-19 gegen die Live-API):
  `country`, `subdivision`, `year`, `workdays`, `weekendDays`, `holidayDays`,
  `holidays[]`, `bridgeDaysByLevel.level1..5` (`blocks`, `vacationDays`,
  `freeDays`, `freeDaysWithoutWeekend`, `averageEfficiency`),
  `bridgeDayBlocks[]` (`level`, `vacationDates`, `vacationDayWeekdays`,
  `vacationDays`, `freeDays`, `freeDaysWithoutWeekend`, `efficiency`,
  `freeRangeStart`, `freeRangeEnd`, `holidays[]`),
  `suggestionLevelEvaluated`, `generatedAt`.
- **Bekannter API-Makel:** `localName` der Feiertage kommt teils doppelt
  UTF-8-kodiert an (`"Heilige Drei KÃ¶nige"`). Der Client repariert das
  defensiv (latin-1-Roundtrip nur bei erkannten Mojibake-Mustern).
- Die API bittet um Caching/Rate-Rücksicht → langes Poll-Intervall (s. u.),
  aussagekräftiger User-Agent (`fenstertage-ha/<version>`).

## 3. Repo-Struktur

```
fenstertage-ha/
├── custom_components/fenstertage/
│   ├── __init__.py          # setup_entry, Service-Registrierung, Card-Reg.
│   ├── api.py               # aiohttp-Client, dataclasses, Exceptions
│   ├── card_registration.py # Lovelace-Resource-Registrierung (aus Referenz)
│   ├── config_flow.py       # ConfigFlow + OptionsFlow
│   ├── const.py             # Domain, Defaults, DE/CH-Subdivision-Listen
│   ├── coordinator.py       # DataUpdateCoordinator (Mehrjahres-Fetch)
│   ├── planner.py           # PlannerStore: HA Store, Budget, Validierung
│   ├── services.py          # Service-Handler (plan/remove/set_budget)
│   ├── sensor.py            # 5 Sensoren
│   ├── binary_sensor.py     # 2 Binary-Sensoren
│   ├── diagnostics.py
│   ├── icons.json, translations/{en,de}.json
│   ├── services.yaml
│   ├── manifest.json, quality_scale.yaml, py.typed
│   └── www/fenstertage-card.js   # Rollup-Build-Artefakt
├── src/                     # Card-Quellcode (TypeScript + Lit)
│   ├── fenstertage-card.ts, editor.ts, const.ts, types.ts, styles.ts
│   ├── modes/{compact,list,year}.ts
│   └── localize/…
├── tests/                   # pytest + PHACC
├── .github/workflows/validate.yml, dependabot.yml
├── hacs.json, pyproject.toml, pytest.ini, requirements_test.txt
├── package.json, rollup.config.mjs, tsconfig.json
└── README.md, LICENSE
```

`manifest.json`: `iot_class: cloud_polling`, `integration_type: service`,
`requirements: []`, `config_flow: true`,
`after_dependencies: ["frontend", "http", "lovelace"]`,
`documentation`/`issue_tracker` → `spiral023/fenstertage-ha`.

## 4. api.py — Client und Datenmodell

- Eine Methode: `async_get_metrics(country, year, subdivision, max_level) -> YearMetrics`.
- `aiohttp.ClientSession` wird injiziert (`inject-websession`), Timeout 30 s.
- Typisierte, frozen `dataclasses`:
  - `Holiday(date, local_name, name, types)`
  - `BridgeDayBlock(block_id, level, vacation_dates, vacation_day_weekdays,
    vacation_days, free_days, free_days_without_weekend, efficiency,
    free_range_start, free_range_end, holidays)`
  - `LevelSummary(blocks, vacation_days, free_days,
    free_days_without_weekend, average_efficiency)`
  - `YearMetrics(country, subdivision, year, workdays, weekend_days,
    holiday_days, holidays, levels: dict[int, LevelSummary],
    blocks: list[BridgeDayBlock], generated_at)`
- **`block_id`** wird clientseitig deterministisch erzeugt:
  `f"{vacation_dates[0]}_{vacation_days}d"` (z. B. `2026-05-15_1d`) —
  stabil über Refreshes, referenzierbar aus Planungen.
- Exceptions: `FenstertageApiError` (Basis) → `FenstertageConnectionError`
  (Netzwerk/Timeout), `FenstertageResponseError` (HTTP ≥ 400, trägt Status),
  `FenstertageDataError` (JSON/Schema unbrauchbar).

## 5. coordinator.py

- `FenstertageCoordinator(DataUpdateCoordinator[FenstertageData])`,
  `FenstertageData = {"years": dict[int, YearMetrics]}` (als dataclass).
- `_async_update_data`: holt aktuelles Jahr + `preview_years` Folgejahre
  sequenziell. Fehlerpolitik:
  - Aktuelles Jahr scheitert → `UpdateFailed` (bzw.
    `ConfigEntryAuthFailed` entfällt, kein Auth) — vorhandene Daten bleiben
    über das Standard-Coordinator-Verhalten erhalten.
  - Vorschau-Jahr scheitert → Log-Warning, zuletzt bekannte Daten dieses
    Jahres werden weiterverwendet; kein Update-Fehler.
- Poll-Intervall: Default **12 h**, per Options 1–48 h.
- Zusätzlich `async_track_time_change`-Listener um 00:00:05 lokale Zeit:
  ruft nur `async_update_listeners()` auf (Neuberechnung abgeleiteter
  Zustände wie `is_holiday_today` aus dem Cache, **kein** API-Call).
- Beim Jahreswechsel liefert der nächste reguläre Refresh automatisch das
  neue "aktuelle Jahr"; alte Jahre werden aus `years` entfernt, wenn sie
  weder aktuell noch Vorschau sind **und** keine Planungen mehr referenzieren.

## 6. config_flow.py

- **Schritt `user`:** `country` als `SelectSelector` (AT/DE/CH, übersetzte
  Labels). Bei DE/CH folgt Schritt `subdivision` (SelectSelector mit den 16
  DE- bzw. 26 CH-ISO-3166-2-Codes aus `const.py`, plus Option "landesweit");
  bei AT wird der Schritt übersprungen.
- Vor `async_create_entry`: ein Validierungs-Call `/api/metrics` mit den
  gewählten Parametern (`test-before-configure`). Fehler-Mapping:
  `FenstertageConnectionError` → `cannot_connect`, sonst → `unknown`.
- `unique_id = f"{country}_{subdivision or 'none'}"`, `_abort_if_unique_id_configured`.
- Entry-Titel: z. B. "Fenstertage AT", "Fenstertage DE-BY".
- **OptionsFlow** (alles nachträglich änderbar):
  - `max_level`: 1–5, Default 5
  - `preview_years`: 0–3, Default 1
  - `update_interval_hours`: 1–48, Default 12
  - `vacation_budget`: 0–100 Tage, Default 25 (Default-Budget je Jahr,
    per Service pro Jahr überschreibbar)
- Options-Änderung → `async_reload_entry` (Standard-Listener).

## 7. planner.py — Urlaubsplanung (Storage)

- `PlannerStore` je Config-Entry: `homeassistant.helpers.storage.Store`
  unter Key `fenstertage.<entry_id>`, `version=1` mit Migrationshook.
- Schema:

```json
{
  "budgets": {"2026": 25},
  "items": [
    {
      "id": "<uuid4-kurz>",
      "start": "2026-05-15",
      "end": "2026-05-15",
      "vacation_dates": ["2026-05-15"],
      "source": "bridge_day",
      "block_id": "2026-05-15_1d",
      "created_at": "2026-07-19T10:00:00+00:00"
    }
  ]
}
```

- `source` ∈ {`bridge_day`, `manual`}; `block_id` nur bei `bridge_day`.
- **`vacation_dates` berechnet der Server beim Anlegen**: alle Tage der
  Range minus Wochenenden minus Feiertage (aus Coordinator-Daten des
  jeweiligen Jahres). Nur diese Tage zählen gegen das Budget. Ranges, deren
  `vacation_dates` leer wären, werden mit `ServiceValidationError` abgelehnt.
- **Jahreswechsel:** eine Range über den 31.12. hinweg wird als *ein* Item
  gespeichert; die Budget-Anrechnung zählt `vacation_dates` je Kalenderjahr.
- **Überlappung:** neue Items dürfen sich mit bestehenden nicht
  überschneiden (Datums-Range-Vergleich) → `ServiceValidationError`.
- **Budget:** `budgets[year]`, Fallback auf Options-`vacation_budget`.
  Überbuchung ist erlaubt (Restbudget wird negativ); Sensor + Karte zeigen
  das an, es wird nichts blockiert.
- Fehlt das Metrics-Jahr einer manuellen Range (z. B. Planung 2 Jahre
  voraus ohne Vorschau-Jahr), wird die Range abgelehnt mit Hinweis,
  `preview_years` zu erhöhen — bewusst konservativ statt Feiertage zu raten.
- Beim Entfernen des Config-Entries (`async_remove_entry`) wird der Store
  gelöscht.

## 8. services.py

Registrierung in `async_setup` (domain-weit), Ziel-Entry über
`config_entry_id`-Feld (`ConfigEntrySelector`). Alle in `services.yaml`
mit Selektoren + Übersetzungen.

| Service | Felder | Verhalten |
|---|---|---|
| `fenstertage.plan_bridge_day` | `config_entry_id`, `block_id` | Block suchen (alle geladenen Jahre); Range = dessen `vacation_dates`; `source="bridge_day"`. Unbekannte `block_id` → `ServiceValidationError`. |
| `fenstertage.plan_vacation` | `config_entry_id`, `start` (date), `end` (date) | freie Range planen, `source="manual"`; `end ≥ start`, max. 60 Tage. |
| `fenstertage.remove_vacation` | `config_entry_id`, `item_id` | Item löschen; unbekannte ID → `ServiceValidationError`. |
| `fenstertage.set_budget` | `config_entry_id`, `year`, `days` (0–100) | `budgets[year]` setzen. |

Nach jedem erfolgreichen Call: Store speichern +
`coordinator.async_update_listeners()` → Entities/Karte aktualisieren sofort.

## 9. Entities

Ein Device pro Entry (`entry_type=service`, Name = Entry-Titel). Alle
Entities mit `translation_key`, `has_entity_name=True`; EntityDescriptions.

| Entity | State | Attribute |
|---|---|---|
| `sensor.<x>_next_bridge_day` | Startdatum (`device_class: date`) des nächsten Blocks (erster `vacation_dates`-Tag ≥ heute) | `days_until`, Block-Detail (level, vacation_dates, free_range, efficiency, holidays), `blocks`: alle kommenden Blöcke aller geladenen Jahre (für Karte/Templates) |
| `sensor.<x>_best_bridge_day` | Startdatum des kommenden Blocks mit höchster `efficiency` (Tiebreak: früheres Datum) | Block-Detail, `efficiency` |
| `sensor.<x>_workdays_remaining` | int; verbleibende Werktage (Mo–Fr, kein Feiertag) ab heute (exkl. heute, wenn heute kein Werktag; inkl. heute sonst) bis 31.12., **lokal berechnet** | `workdays_total`, `weekend_days`, `holiday_days` (API-Jahreswerte) |
| `sensor.<x>_holidays_this_year` | int, Anzahl Feiertage aktuelles Jahr | `holidays` (Liste date+local_name), `next_holiday`, `next_holiday_date` |
| `sensor.<x>_vacation_budget` | int, Restbudget aktuelles Jahr = Budget − verplante `vacation_dates` im Jahr | `budget_total`, `planned_days`, `planned_items` (volle Item-Liste inkl. Folgejahre), `budgets` je Jahr |
| `binary_sensor.<x>_holiday_today` | on, wenn heute Feiertag | `holiday_name` |
| `binary_sensor.<x>_bridge_day_today` | on, wenn heute in `free_range_start..free_range_end` irgendeines Blocks liegt | Block-Detail |

Kein Block mehr übrig (Jahresende) → `next_bridge_day`/`best_bridge_day`
nehmen Blöcke der Vorschau-Jahre; gibt es gar keine, State `unknown`.

## 10. Lovelace-Karte `fenstertage-card`

- TypeScript + Lit, Rollup-Build nach `custom_components/fenstertage/www/`,
  Registrierung via `card_registration.py` (Storage-vs-YAML-Handling aus der
  Referenz übernommen). GUI-Editor (`editor.ts`) mit Modus-Umschalter.
- **Card-Config:** `entity` (ein beliebiger Sensor des Entries als Anker;
  Karte findet die Geschwister-Entities über das Device), `mode`
  (`compact`|`list`|`year`, Default `list`), `show_budget` (bool, Default
  true), `levels` (Liste 1–5, Default alle), `title` (optional).
- **Datenfluss:** lesen aus `next_bridge_day.attributes.blocks` und
  `vacation_budget.attributes` über den normalen `hass`-State-Push;
  schreiben ausschließlich via `hass.callService()` auf die vier Services.
- **`compact`:** Kachel — nächster Block (Datum, Countdown, "1 UT → 4 freie
  Tage"), Budget-Fortschrittsbalken.
- **`list`:** Tabelle kommender Blöcke (Datum, UT, freie Tage,
  Effizienz-Badge); geplante Blöcke markiert; Klick auf Zeile plant/entplant
  (mit Bestätigung beim Entplanen).
- **`year`:** 12 Monats-Grids, responsive 2/3/4 Spalten (Container-Breite).
  Tagesfärbung: Wochenende, Feiertag, Fenstertag-Block (nach Effizienz
  abgestuft), geplanter Urlaub. Interaktion:
  - Tap auf Block-Tag → Detail-Popup (Level, UT, freie Range, beteiligte
    Feiertage, Effizienz) mit "Planen"/"Entfernen".
  - Tap auf freien Werktag → Range-Auswahl-Modus (zweiter Tap = Ende) →
    Bestätigungs-Popup mit serverseitig zu buchender Range und
    voraussichtlichen Urlaubstagen (Karte zeigt Schätzung, Server rechnet
    verbindlich).
  - Tap auf geplantes Item → Popup mit "Entfernen".
  - Kopfzeile: Jahr-Umschalter (nur geladene Jahre), Budget-Anzeige
    ("8/25 verplant", Warnfarbe bei Überbuchung).
- **Design:** Farben aus HA-Theme-Variablen (Light/Dark), Effizienz-Skala
  als definierte Farbrampe statt Ampel-Klischee, Micro-Interactions bei
  Plan/Unplan. Bei der Implementierung werden die Skills `frontend-design`
  und `make-interfaces-feel-better` angewendet.
- Fehlerzustände: Entity nicht gefunden / Integration nicht geladen →
  Hinweis-Karte; Service-Fehler → Toast mit übersetzter Meldung.
- Lokalisierung der Karte: `src/localize/` mit `de`/`en` wie Referenz.

## 11. Tests & Qualität

- **TDD durchgängig:** Tests zuerst, dann Implementierung.
- `tests/test_api.py`: reine Unit-Tests ohne HA — Parsing der echten
  Metrics-Struktur (Fixture aus Live-Antwort), Mojibake-Reparatur,
  `block_id`-Determinismus, Fehler-Mapping (Timeout, HTTP 500, kaputtes JSON).
- PHACC-Tests (Docker, wie Referenz-Repo): Config-Flow (AT ohne
  Subdivision, DE/CH mit, unique_id-Abort, cannot_connect), OptionsFlow,
  Coordinator (Mehrjahres-Fetch, Vorschau-Jahr-Teilfehler, UpdateFailed),
  alle 7 Entities (inkl. Jahresend-Fallback), Services (Überlappung,
  Jahreswechsel-Split der Budget-Anrechnung, Budget-Überbuchung, leere
  Ranges, unbekannte IDs), `planner.py`-Storage (Persistenz, Migration,
  Entry-Removal), `card_registration`, Diagnostics (Redaction nicht nötig,
  keine sensiblen Daten).
- Coverage-Gate `fail-under=90` in `pyproject.toml`.
- `quality_scale.yaml` ab dem ersten Commit: Bronze + Silver vollständig;
  Gold: `devices`, `diagnostics`, `docs-*`; Platinum: `strict-typing`,
  `inject-websession`, `async-dependency`.
- CI `.github/workflows/validate.yml`: hassfest, HACS-Action, pytest-Job
  (Python passend zum aktuellen HA-Core-Floor), Card-Build-Check
  (`npm ci && npm run build`, Diff gegen eingechecktes `www/`-Artefakt).

## 12. Ausbaupfad (nicht v1, aber vorbereitet)

- **`calendar.py`:** liest Feiertage, Blöcke und geplante Items direkt aus
  `FenstertageData` + `PlannerStore` — keine Änderung an api/coordinator/
  Storage nötig.
- **Mehrere Personen:** heute 1 Entry = 1 Land/Region; später zusätzliche
  Entries oder `person`-Feld im Item-Schema (Storage-Version-Migration
  vorgesehen).
- **To-do-Buchung:** zusätzlicher Service, der ein geplantes Item in eine
  To-do-Liste spiegelt.
- **Urlaubsvorschläge:** eigene Logik über `blocks` + Budget — reine
  Ergänzung in neuen Modulen.
