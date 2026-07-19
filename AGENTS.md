# Arbeitsweise

Wir arbeiten die Aufgaben des Implementierungsplans schrittweise ab.

Die Umsetzung erfolgt direkt auf dem Branch `main`; für Aufgaben dieses
Repositories werden keine Git-Worktrees angelegt.

Den aktuellen Fortschritt dokumentieren und aktualisieren wir in `TASKS.md`. Eine Aufgabe wird dort erst als erledigt markiert, wenn ihre Umsetzung geprüft wurde.

## Commits

Nach jeder erfolgreich geprüften Aufgabe wird ein fokussierter Commit erstellt.
Commit-Nachrichten folgen Conventional Commits im Imperativ:
`<typ>: <kurze Beschreibung>` (optional `<typ>(<bereich>): <kurze Beschreibung>`).
Zulässige Typen sind mindestens `feat`, `fix`, `test`, `docs`, `ci`, `chore`
und `refactor`; Beispiele: `feat: Urlaubsplanung hinzufügen` oder
`docs: Übersetzungsstrategie präzisieren`.

## Releases

Nach jeder für Nutzer sichtbaren Änderung (neues Feature, Karten-Update,
Bugfix) wird ein echter GitHub Release erstellt — nur so zeigt Home
Assistant/HACS im Update-Dialog lesbare Versionshinweise statt rohe
Commit-Hashes an. Kleine interne Aufräumarbeiten ohne Nutzer-Auswirkung
brauchen keinen eigenen Release.

Ablauf:

1. `custom_components/fenstertage/manifest.json` → `version` erhöhen
   (SemVer, ohne `v`-Präfix). Hat sich die Karte inhaltlich geändert,
   zusätzlich `CARD_VERSION` in `const.py` **und** `src/const.ts` synchron
   mit hochziehen (Cache-Busting) und `npm run build` laufen lassen.
2. Commit + Push auf `main`.
3. Git-Tag exakt gleich der `manifest.json`-Version setzen und pushen:
   `git tag -a X.Y.Z -m "X.Y.Z" && git push origin X.Y.Z`.
4. GitHub Release erstellen:
   `gh release create X.Y.Z --title "X.Y.Z — <Kurzbeschreibung>" --notes-file <datei>`.
   Notizen-Struktur:
   - Ein einleitender Satz, was das Release aus Nutzersicht bringt.
   - `## 🎉 Features` — neue, sichtbare Funktionen (Nutzerperspektive, nicht
     Implementierungsdetails).
   - `## 🛠 Verbesserungen & Fixes` — Bugfixes, Robustheit, CI.
   - Nur Abschnitte mit tatsächlichem Inhalt aufnehmen; leere Abschnitte weglassen.
5. Bekannte HACS-Falle: `async_release_notes()` liefert in HACS' eigenem
   Update-Entity so lange `None` (leerer Änderungstext im Dialog, ganz ohne
   Fehlermeldung), wie für die Integration noch ein Neustart aussteht
   (`pending_restart`). Nach dem Klick auf „Aktualisieren“ muss Home
   Assistant einmal komplett neu gestartet werden, erst danach zeigt der
   Dialog die Versionshinweise zuverlässig an.

# Entwicklungskonventionen

## HACS-Integration

- Die Integration liegt vollständig unter `custom_components/fenstertage/`.
  HACS verwaltet in diesem Repository genau diese eine Integration.
- `manifest.json` muss für die Custom Integration eine gültige `version`
  enthalten. `config_flow: true` setzt eine `config_flow.py` voraus.
- Konfiguration erfolgt über einen Config Flow, nicht über manuell anzulegende
  YAML-Konfiguration. Laufzeitdaten gehören nach `ConfigEntry.runtime_data`.
- API-Abrufe werden über einen `DataUpdateCoordinator` koordiniert; Setup,
  Aktualisierungsfehler und das Entladen eines Config Entries müssen sauber
  behandelt und getestet werden.
- Persistente Integrationsdaten nur über die offizielle Home-Assistant-
  `Store`-Abstraktion schreiben. Niemals Dateien in `.storage` direkt ändern.

## Übersetzungen, Services und Qualität

- Für diese Custom Integration **kein** `strings.json` verwenden. Alle
  sichtbaren Texte werden vollständig in
  `custom_components/fenstertage/translations/en.json` und `de.json`
  gepflegt, einschließlich Config-/Options-Flow und Service-Texten.
- `services.yaml` beschreibt ausschließlich Felder und Selector-Schemata;
  Namen und Beschreibungen der Services/Felder gehören in die
  Übersetzungsdateien.
- Bei Diagnostics dürfen keine sensiblen Daten ausgegeben werden; bei Bedarf
  `async_redact_data` verwenden.
- Jede Aufgabe testgetrieben bearbeiten und erst nach passender Verifikation
  in `TASKS.md` abhaken. Vor dem Abschluss mindestens pytest, Ruff, mypy,
  Hassfest, HACS-Validierung und den Karten-Build-Drift prüfen.

## Lovelace-Karte

- Die Karte wird als gebündeltes ES-Modul im Integration-Verzeichnis
  ausgeliefert und als `custom:fenstertage-card` registriert.
- `setConfig()` validiert die Konfiguration; die Karte liest Zustände über
  `hass` und löst Änderungen ausschließlich über die vorgesehenen
  Home-Assistant-APIs bzw. `hass.callService()` aus.
- `window.customCards` registriert Name, Beschreibung und Dokumentationslink
  für den Card Picker. Eine sinnvolle Standardkonfiguration kommt aus
  `getStubConfig()`.
- Für Sections-Views `getGridOptions()` implementieren; Standardspalten als
  Vielfache von drei wählen. Den visuellen Editor als `getConfigForm()` oder
  eigenen `getConfigElement()` umsetzen.
- Die automatische Lovelace-Resource-Registrierung muss Storage- und
  YAML-Modus sowie Unload abdecken. Der dokumentierte manuelle
  Resource-Fallback bleibt erhalten.
