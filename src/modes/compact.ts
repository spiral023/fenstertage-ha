import { html, nothing, type TemplateResult } from "lit";
import { efficiencyColor } from "../styles";
import type { CardCtx } from "../types";
import { daysUntil, formatDate, renderBudget } from "../shared";

export function renderCompact(ctx: CardCtx): TemplateResult {
  const next = ctx.blocks[0];
  if (!next) {
    return html`<div class="hint">${ctx.t("no_blocks")}</div>`;
  }
  const days = daysUntil(next.vacation_dates[0]!);
  return html`
    <div class="compact">
      <div class="when">
        <span class="date">${formatDate(ctx, next.vacation_dates[0]!)}</span>
        <span class="muted"
          >${days === 0 ? ctx.t("today") : ctx.t("in_days", { days })}</span
        >
      </div>
      <div class="what">
        <span
          class="badge"
          style="background:${efficiencyColor(next.efficiency)}"
          >×${next.efficiency.toFixed(1)}</span
        >
        <span class="num"
          >${next.vacation_days} ${ctx.t("vacation_days_short")} →
          ${next.free_days} ${ctx.t("free_days_short")}</span
        >
        ${ctx.plannedBlockIds.has(next.block_id)
          ? html`<span class="muted">✓ ${ctx.t("planned")}</span>`
          : nothing}
      </div>
      ${ctx.config.show_budget ? renderBudget(ctx) : nothing}
    </div>
  `;
}
