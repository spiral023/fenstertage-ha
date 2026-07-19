import { html, nothing, type TemplateResult } from "lit";
import type { CardCtx } from "./types";

export function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${iso}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function formatDate(ctx: CardCtx, iso: string): string {
  const lang = ctx.hass.locale?.language ?? "en";
  return new Date(`${iso}T00:00:00`).toLocaleDateString(lang, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Vollständiges numerisches Datum (z. B. 08.12.2026) für Dialoge/Detailansichten. */
export function formatDateNumeric(ctx: CardCtx, iso: string): string {
  const lang = ctx.hass.locale?.language ?? "en";
  return new Date(`${iso}T00:00:00`).toLocaleDateString(lang, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Budget-Balken für ein bestimmtes Jahr. Planned-Tage werden clientseitig aus
 * ctx.planned gezählt (nicht aus dem Sensor-Snapshot, der nur das laufende
 * Jahr abdeckt) — so stimmt die Anzeige auch im year-Modus mit dem gerade
 * gewählten Jahres-Tab überein, statt immer nur "heute" zu meinen.
 */
export function renderBudget(
  ctx: CardCtx,
  year: number,
): TemplateResult | typeof nothing {
  const budget = ctx.budget;
  if (!budget) {
    return nothing;
  }
  const total = budget.budgets[String(year)] ?? budget.defaultTotal;
  const planned = ctx.planned.reduce(
    (sum, item) =>
      sum +
      item.vacation_dates.filter((d) => d.startsWith(`${year}-`)).length,
    0,
  );
  const over = planned > total;
  const pct = total > 0 ? Math.min(100, (planned / total) * 100) : 0;
  return html`
    <div class="budget ${over ? "over" : ""}">
      <span class="num">${year}: ${planned}/${total}</span>
      <div class="bar"><div style="width:${pct}%"></div></div>
      <span class="muted"
        >${over
          ? `${planned - total} ${ctx.t("over_budget")}`
          : ctx.t("of_budget_planned")}</span
      >
    </div>
  `;
}
