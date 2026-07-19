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

export function renderBudget(ctx: CardCtx): TemplateResult | typeof nothing {
  if (!ctx.budget) {
    return nothing;
  }
  const { total, planned } = ctx.budget;
  const over = planned > total;
  const pct = total > 0 ? Math.min(100, (planned / total) * 100) : 0;
  return html`
    <div class="budget ${over ? "over" : ""}">
      <span class="num">${planned}/${total}</span>
      <div class="bar"><div style="width:${pct}%"></div></div>
      <span class="muted"
        >${over
          ? `${planned - total} ${ctx.t("over_budget")}`
          : ctx.t("of_budget_planned")}</span
      >
    </div>
  `;
}
