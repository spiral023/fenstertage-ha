<div align="center">

<img src="docs/assets/logo.png" alt="Fenstertage HA" width="168">

# Fenstertage HA

**Feiertage, Werktage und Fenstertage (Brückentage) für 🇦🇹 🇩🇪 🇨🇭 —<br>mit interaktivem Jahresurlaubsplaner direkt in Lovelace.**

[![Validate](https://github.com/spiral023/fenstertage-ha/actions/workflows/validate.yml/badge.svg)](https://github.com/spiral023/fenstertage-ha/actions/workflows/validate.yml)
[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

Diese Integration bringt die Daten von [fenstertage.com](https://fenstertage.com)
nach Home Assistant: Feiertage, Werktags-Statistiken und die effizientesten
Brückentage. Dazu kommt eine mitgelieferte Lovelace-Karte, mit der sich Urlaub
per Klick planen lässt — inklusive Urlaubsbudget und Jahresübersicht, ganz ohne
Skripte oder Entwicklerwerkzeuge.

## Inhalt

- [Highlights](#highlights)
- [Sensoren](#sensoren)
- [Urlaubsplanung per Service](#urlaubsplanung-per-service)
- [Lovelace-Karte](#lovelace-karte)
- [Installation](#installation)
- [Konfiguration](#konfiguration)
- [Datenquelle & Update-Verhalten](#datenquelle--update-verhalten)
- [Entfernen](#entfernen)
- [Bekannte Grenzen](#bekannte-grenzen)
- [Troubleshooting](#troubleshooting)
- [Lizenz](#lizenz)

## Highlights

- **Ein Klick, ein Urlaubsblock.** Die effizientesten Brückentage werden
  vorgeschlagen und lassen sich direkt aus der Karte einplanen.
- **Interaktiver Jahresplaner** mit Monatsraster, Feiertagen, Vorschlägen und
  eigener Freihand-Auswahl.
- **Urlaubsbudget im Blick** — pro Jahr konfigurierbar, live gegengerechnet.
- **AT, DE (16 Bundesländer) und CH (26 Kantone)** oder jeweils landesweit.
- **Sparsam & sauber**: genau ein API-Call pro Jahr, `DataUpdateCoordinator`,
  Diagnostics, vollständige Übersetzungen und mypy-strict-Typisierung.

<!-- TODO: Screenshot der Karte im year-Modus einfügen (docs/assets/) -->
<!-- TODO: Screenshot der Karte im list-Modus einfügen (docs/assets/) -->

## Sensoren

Pro konfiguriertem Land/Region-Entry werden fünf Sensoren und zwei
Binary-Sensoren angelegt (Entity-IDs am Beispiel `AT`):

| Entity | Beschreibung | Wichtige Attribute |
| --- | --- | --- |
| `sensor.fenstertage_at_next_bridge_day` | Datum des ersten Urlaubstags des nächsten Fenstertage-Blocks | `block`, `blocks` (alle kommenden), `years` (Feiertage/Blöcke aller geladenen Jahre), `days_until` |
| `sensor.fenstertage_at_best_bridge_day` | Kommender Block mit dem besten Verhältnis freie Tage/Urlaubstag | `block`, `efficiency` |
| `sensor.fenstertage_at_workdays_remaining` | Verbleibende Werktage (Mo–Fr, ohne Feiertage) im laufenden Jahr | `workdays_total`, `weekend_days`, `holiday_days` |
| `sensor.fenstertage_at_holidays_this_year` | Anzahl Feiertage im laufenden Jahr | `holidays`, `next_holiday`, `next_holiday_date` |
| `sensor.fenstertage_at_vacation_budget` | Verbleibendes Urlaubsbudget des laufenden Jahres (kann negativ werden) | `budget_total`, `planned_days`, `planned_items`, `budgets` |
| `binary_sensor.fenstertage_at_holiday_today` | An, wenn heute ein Feiertag ist | `holiday_name` |
| `binary_sensor.fenstertage_at_bridge_day_today` | An, wenn heute innerhalb eines freien Zeitraums eines Fenstertage-Blocks liegt | `block` |

Die kartenrelevanten Attribute (`block`, `blocks`, `years`, `planned_items`)
sind vom Recorder ausgeschlossen — sie sind zu groß und zu volatil für die
Historie.

## Urlaubsplanung per Service

Vier Services verwalten die persistierte Urlaubsplanung eines Entries:

| Service | Felder | Zweck |
| --- | --- | --- |
| `fenstertage.plan_bridge_day` | `config_entry_id`, `block_id` | Einen von der API vorgeschlagenen Fenstertage-Block übernehmen |
| `fenstertage.plan_vacation` | `config_entry_id`, `start`, `end` | Einen frei gewählten Zeitraum planen (Wochenenden/Feiertage zählen nicht gegen das Budget) |
| `fenstertage.remove_vacation` | `config_entry_id`, `item_id` | Eine geplante Position wieder entfernen |
| `fenstertage.set_budget` | `config_entry_id`, `year`, `days` | Das Urlaubsbudget für ein bestimmtes Jahr überschreiben |

Beispiel-Automation, die den besten kommenden Fenstertage-Block jeden
Montagmorgen automatisch einplant:

```yaml
automation:
  - alias: Besten Fenstertag automatisch planen
    trigger:
      - platform: time
        at: "07:00:00"
    condition:
      - condition: time
        weekday:
          - mon
    action:
      - service: fenstertage.plan_bridge_day
        data:
          config_entry_id: !input fenstertage_entry
          block_id: "{{ state_attr('sensor.fenstertage_at_best_bridge_day', 'block').block_id }}"
```

## Lovelace-Karte

Die Karte `custom:fenstertage-card` zeigt Fenstertage, Feiertage und den
Urlaubsstatus direkt im Dashboard und plant Urlaub per Klick — ganz ohne
Skripte oder Entwicklerwerkzeuge. Bei Installation über HACS wird die
Ressource automatisch registriert.

| Option | Typ | Default | Beschreibung |
| --- | --- | --- | --- |
| `entity` | string | — (Pflichtfeld) | Einer der fünf Fenstertage-Sensoren desselben Entries |
| `mode` | `compact` \| `list` \| `year` | `list` | Darstellungsform (siehe unten) |
| `title` | string | — | Optionaler Kartentitel |
| `show_budget` | boolean | `true` | Budget-Balken einblenden |
| `levels` | number[] | alle | Nur Fenstertage-Blöcke dieser Effizienz-Level anzeigen (1–5) |

<table>
<tr>
<th><code>compact</code></th>
<th><code>list</code></th>
<th><code>year</code></th>
</tr>
<tr>
<td>Der nächste Fenstertage-Block als kompakte Kachel — ideal für Übersichts-Dashboards.</td>
<td>Alle kommenden Vorschläge als Liste; ein Klick öffnet den Planen/Entfernen-Dialog.</td>
<td>Der interaktive Jahresplaner: Monatsraster mit Feiertagen, Vorschlägen und Freihand-Auswahl.</td>
</tr>
</table>

**`compact`** — kompakte Kachel für den nächsten Block:

```yaml
type: custom:fenstertage-card
entity: sensor.fenstertage_at_next_bridge_day
mode: compact
```

**`list`** — alle kommenden Vorschläge als Liste, Klick öffnet einen Dialog
zum Planen/Entfernen:

```yaml
type: custom:fenstertage-card
entity: sensor.fenstertage_at_next_bridge_day
mode: list
levels: [1, 2]
```

**`year`** — der interaktive Jahresplaner: Monatsraster mit Feiertagen,
Fenstertage-Vorschlägen und eigener Urlaubsplanung per Freihand-Auswahl:

```yaml
type: custom:fenstertage-card
entity: sensor.fenstertage_at_next_bridge_day
mode: year
title: Urlaubsplaner 2026
```

Im `year`-Modus gilt: Tap auf einen geplanten Tag öffnet den
Entfernen-Dialog, Tap auf einen Fenstertage-Vorschlag den
Planen/Entfernen-Dialog, und zwei Taps auf freie Werktage (Wochenenden und
Feiertage sind nicht wählbar) spannen einen frei wählbaren Urlaubszeitraum
auf.

Die Karte lässt sich vollständig über den visuellen Editor konfigurieren
(Karte hinzufügen → „Fenstertage Card“ auswählen) — eine manuelle
YAML-Bearbeitung ist nicht nötig.

## Installation

### Über HACS (empfohlen)

1. HACS → Integrationen → Menü „Benutzerdefinierte Repositories“ →
   Repository `spiral023/fenstertage-ha`, Kategorie „Integration“ hinzufügen.
2. „Fenstertage HA“ installieren und Home Assistant neu starten.
3. Einstellungen → Geräte & Dienste → Integration hinzufügen →
   „Fenstertage“ suchen.

### Manuell

1. Inhalt von `custom_components/fenstertage/` nach
   `<config>/custom_components/fenstertage/` kopieren.
2. Home Assistant neu starten.
3. Einstellungen → Geräte & Dienste → Integration hinzufügen →
   „Fenstertage“ suchen.

## Konfiguration

Beim Einrichten wird zunächst das Land gewählt (AT, DE, CH); für DE und CH
kann zusätzlich ein Bundesland/Kanton oder „landesweit“ gewählt werden. Jede
Land/Region-Kombination erzeugt einen eigenen Config Entry mit eigenen
Sensoren, eigener Urlaubsplanung und eigenem Budget.

Über die Optionen (Einstellungen → Geräte & Dienste → Fenstertage →
Konfigurieren) lassen sich danach jederzeit anpassen:

| Option | Default | Bereich | Beschreibung |
| --- | --- | --- | --- |
| Maximales Level | 5 | 1–5 | Höchstes von der API berücksichtigtes Effizienz-Level für Fenstertage-Vorschläge |
| Vorschau-Jahre | 1 | 0–3 | Wie viele Jahre über das laufende Jahr hinaus zusätzlich geladen werden |
| Abfrageintervall | 12 h | 1–48 h | Wie oft neu bei fenstertage.com abgefragt wird |
| Urlaubsbudget | 25 Tage | 0–100 | Standard-Jahresbudget, pro Jahr über `fenstertage.set_budget` überschreibbar |

## Datenquelle & Update-Verhalten

Alle Daten stammen von der öffentlichen, unauthentifizierten API
[fenstertage.com/api/metrics](https://fenstertage.com/api/metrics). Pro
geladenem Jahr wird genau ein HTTP-Call ausgeführt (aktuelles Jahr plus die
konfigurierten Vorschau-Jahre), standardmäßig alle 12 Stunden. Ein
zusätzlicher Mitternachts-Tick ohne API-Call aktualisiert die von „heute“
abhängigen Sensoren (z. B. verbleibende Werktage) auch zwischen zwei
Abfragen. Alle Entities tragen die Attribution „Daten von fenstertage.com“.

## Entfernen

Wird der Config Entry entfernt, löscht Home Assistant auch die dazu gehörige
gespeicherte Urlaubsplanung (`.storage/fenstertage.<entry_id>`). Die
Lovelace-Ressource der Karte wird automatisch entfernt, sobald der letzte
Fenstertage-Entry gelöscht wurde.

## Bekannte Grenzen

- Urlaubsplanungen sind pro Land/Region-Entry gespeichert — für ein Familien-
  oder Mehrpersonen-Setup sind mehrere Entries nötig.
- Frei gewählte Urlaubszeiträume sind auf maximal 60 Tage begrenzt.
- Es lassen sich nur Zeiträume innerhalb der aktuell geladenen Jahre
  (laufendes Jahr + Vorschau-Jahre) planen.

## Troubleshooting

- **Karte erscheint nicht im Card-Picker oder auf dem Dashboard:** Die
  Lovelace-Ressource wird beim Start automatisch registriert (Storage-Modus).
  Im YAML-Modus muss sie manuell unter Einstellungen → Dashboards →
  Ressourcen als `/fenstertage/fenstertage-card.js` (Typ „JavaScript-Modul“)
  eingetragen werden. Nach einem Karten-Update ggf. den Browser-Cache mit
  Strg+Umschalt+R leeren.
- **`cannot_connect` beim Einrichten:** fenstertage.com ist von diesem
  Home-Assistant-Host aus nicht erreichbar — Internetverbindung bzw. DNS/Proxy
  prüfen.
- **Urlaubstage werden nicht wie erwartet vom Budget abgezogen:** Nur
  Mo–Fr-Tage ohne Feiertag zählen als Urlaubstag; Wochenenden und Feiertage
  innerhalb eines geplanten Zeitraums werden automatisch ausgeklammert.

## Lizenz

[MIT](LICENSE) © 2026 Philipp Asanger. Daten von
[fenstertage.com](https://fenstertage.com).
