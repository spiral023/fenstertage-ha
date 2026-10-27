import type { HomeAssistant } from "./types";

const STRINGS: Record<string, Record<string, string>> = {
  en: {
    next_bridge_day: "Next bridge day",
    no_blocks: "No upcoming bridge days",
    entity_missing: "Entity not found. Is the Fenstertage integration set up?",
    vacation_days_short: "d off",
    free_days_short: "d free",
    efficiency: "Efficiency",
    level: "Level",
    planned: "Planned",
    plan: "Plan",
    remove: "Remove",
    cancel: "Cancel",
    budget: "Budget",
    of_budget_planned: "planned",
    over_budget: "over budget",
    holidays: "Holidays",
    pick_end: "Tap the last day of your vacation",
    range_estimate: "Estimated vacation days",
    in_days: "in {days} days",
    today: "today",
    date_range: "Free range",
    year: "Year",
    bridge_day: "Bridge day",
    vacation: "Vacation",
    weekend: "Weekend",
  },
  de: {
    next_bridge_day: "Nächster Fenstertag",
    no_blocks: "Keine kommenden Fenstertage",
    entity_missing:
      "Entity nicht gefunden. Ist die Fenstertage-Integration eingerichtet?",
    vacation_days_short: "UT",
    free_days_short: "Tage frei",
    efficiency: "Effizienz",
    level: "Level",
    planned: "Geplant",
    plan: "Planen",
    remove: "Entfernen",
    cancel: "Abbrechen",
    budget: "Budget",
    of_budget_planned: "verplant",
    over_budget: "über Budget",
    holidays: "Feiertage",
    pick_end: "Tippe auf den letzten Urlaubstag",
    range_estimate: "Voraussichtliche Urlaubstage",
    in_days: "in {days} Tagen",
    today: "heute",
    date_range: "Freier Zeitraum",
    year: "Jahr",
    bridge_day: "Fenstertag",
    vacation: "Urlaub",
    weekend: "Wochenende",
  },
};

export function makeLocalize(
  hass?: HomeAssistant,
): (key: string, vars?: Record<string, string | number>) => string {
  const lang = (hass?.locale?.language ?? hass?.language ?? "en").split(
    "-",
  )[0];
  const table = STRINGS[lang ?? "en"] ?? STRINGS.en!;
  return (key, vars) => {
    let text = table[key] ?? STRINGS.en![key] ?? key;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replace(`{${name}}`, String(value));
      }
    }
    return text;
  };
}
