import { html, nothing, type TemplateResult } from "lit";
import type { FenstertageCard } from "../fenstertage-card";
import { daysUntil, formatDate, renderBudget } from "../shared";
import { efficiencyColor } from "../styles";
import type { CardCtx } from "../types";

export function renderList(
  ctx: CardCtx,
  card: FenstertageCard,
): TemplateResult {
  if (!ctx.blocks.length) {
    return html`<div class="hint">${ctx.t("no_blocks")}</div>`;
  }
  return html`
    <div class="list" role="list">
      ${ctx.blocks.map((block) => {
        const planned = ctx.plannedBlockIds.has(block.block_id);
        const days = daysUntil(block.vacation_dates[0]!);
        return html`
          <button
            class="list-row ${planned ? "planned" : ""}"
            role="listitem"
            @click=${() => card.openDialog({ kind: "block", block })}
          >
            <span class="when">
              <span class="date">${formatDate(ctx, block.vacation_dates[0]!)}</span>
              <span class="muted small">
                ${days === 0 ? ctx.t("today") : ctx.t("in_days", { days })}
              </span>
            </span>
            <span class="ratio num">
              ${block.vacation_days} ${ctx.t("vacation_days_short")} →
              ${block.free_days} ${ctx.t("free_days_short")}
            </span>
            <span
              class="badge"
              style="background:${efficiencyColor(block.efficiency)}"
              >×${block.efficiency.toFixed(1)}</span
            >
            <span class="mark">${planned ? "✓" : ""}</span>
          </button>
        `;
      })}
    </div>
    ${ctx.config.show_budget ? renderBudget(ctx) : nothing}
  `;
}
