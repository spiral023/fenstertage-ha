import { LitElement, html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { CARD_TAG, CARD_VERSION, DOMAIN, EDITOR_TAG } from "./const";
import { makeLocalize } from "./localize";
import { renderCompact } from "./modes/compact";
import { formatDateNumeric } from "./shared";
import { cardStyles } from "./styles";
import type {
  BlockData,
  BudgetInfo,
  CardCtx,
  DialogState,
  FenstertageCardConfig,
  HassEntity,
  HomeAssistant,
  PlannedItemData,
  YearData,
} from "./types";

// Task 13/14 ersetzen diese Platzhalter durch echte Implementierungen:
import { renderList } from "./modes/list";
import { renderYear } from "./modes/year";

console.info(`%c FENSTERTAGE-CARD %c v${CARD_VERSION}`, "background:#222;color:#7fdbca", "");

declare global {
  interface Window {
    customCards?: unknown[];
  }
}
window.customCards = window.customCards ?? [];
window.customCards.push({
  type: CARD_TAG,
  name: "Fenstertage Card",
  description:
    "Bridge days, holidays and an interactive year vacation planner.",
  preview: true,
});

@customElement(CARD_TAG)
export class FenstertageCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: FenstertageCardConfig;

  /** year-Modus: erster Tap einer freien Range. */
  @state() public selStart?: string | undefined;

  /** year-Modus: angezeigtes Jahr (Default: erstes geladenes Jahr). */
  @state() public activeYear?: string | undefined;

  @state() private _dialog?: DialogState | undefined;

  static override styles = cardStyles;

  public setConfig(config: FenstertageCardConfig): void {
    if (!config.entity) {
      throw new Error("fenstertage-card: `entity` is required");
    }
    this._config = { mode: "list", show_budget: true, ...config };
    this.selStart = undefined;
    this.activeYear = undefined;
    this._dialog = undefined;
  }

  public getCardSize(): number {
    switch (this._config?.mode) {
      case "compact":
        return 2;
      case "year":
        return 8;
      default:
        return 4;
    }
  }

  public static getStubConfig(
    hass: HomeAssistant,
  ): Partial<FenstertageCardConfig> {
    const entity = Object.values(hass.states).find(
      (s) =>
        s.entity_id.startsWith("sensor.") &&
        Array.isArray(s.attributes["blocks"]) &&
        typeof s.attributes["config_entry_id"] === "string",
    );
    return { entity: entity?.entity_id ?? "", mode: "list" };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    // Editor ist im Bundle enthalten (inlineDynamicImports).
    await import("./editor");
    return document.createElement(EDITOR_TAG);
  }

  // ------------------------------------------------------------------
  // Kontext-Aufbau
  // ------------------------------------------------------------------

  private _buildCtx(): CardCtx | null {
    if (!this.hass || !this._config) {
      return null;
    }
    const anchor: HassEntity | undefined =
      this.hass.states[this._config.entity];
    if (!anchor) {
      return null;
    }
    const entryId = String(anchor.attributes["config_entry_id"] ?? "");
    const levels = this._config.levels;
    const allBlocks = (anchor.attributes["blocks"] ?? []) as BlockData[];
    const blocks = levels?.length
      ? allBlocks.filter((b) => levels.includes(b.level))
      : allBlocks;
    const years = (anchor.attributes["years"] ?? {}) as Record<
      string,
      YearData
    >;

    // Budget-Sensor desselben Entries über config_entry_id-Attribut finden.
    const budgetEntity = Object.values(this.hass.states).find(
      (s) =>
        s.attributes["config_entry_id"] === entryId &&
        typeof s.attributes["budget_total"] === "number",
    );
    let budget: BudgetInfo | null = null;
    let planned: PlannedItemData[] = [];
    if (budgetEntity) {
      planned = (budgetEntity.attributes["planned_items"] ??
        []) as PlannedItemData[];
      const budgetsRaw = (budgetEntity.attributes["budgets"] ??
        {}) as Record<string, number>;
      budget = {
        remaining: Number(budgetEntity.state),
        total: Number(budgetEntity.attributes["budget_total"]),
        planned: Number(budgetEntity.attributes["planned_days"]),
        budgets: budgetsRaw,
        defaultTotal: Number(budgetEntity.attributes["default_budget"]),
      };
    }
    return {
      hass: this.hass,
      config: this._config as CardCtx["config"],
      entryId,
      blocks,
      years,
      planned,
      plannedBlockIds: new Set(
        planned
          .filter((p) => p.block_id != null)
          .map((p) => p.block_id as string),
      ),
      budget,
      t: makeLocalize(this.hass),
    };
  }

  // ------------------------------------------------------------------
  // Aktionen (von allen Modi genutzt)
  // ------------------------------------------------------------------

  private async _call(
    service: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const ctx = this._buildCtx();
    if (!ctx) {
      return;
    }
    try {
      await ctx.hass.callService(DOMAIN, service, {
        config_entry_id: ctx.entryId,
        ...data,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.dispatchEvent(
        new CustomEvent("hass-notification", {
          detail: { message },
          bubbles: true,
          composed: true,
        }),
      );
    }
    this.closeDialog();
  }

  public planBlock(blockId: string): void {
    void this._call("plan_bridge_day", { block_id: blockId });
  }

  public removeItem(itemId: string): void {
    void this._call("remove_vacation", { item_id: itemId });
  }

  public planRange(start: string, end: string): void {
    void this._call("plan_vacation", { start, end });
  }

  public openDialog(dialog: DialogState): void {
    this._dialog = dialog;
  }

  public closeDialog(): void {
    this._dialog = undefined;
    this.selStart = undefined;
  }

  // ------------------------------------------------------------------
  // Rendering
  // ------------------------------------------------------------------

  protected override render(): TemplateResult | typeof nothing {
    if (!this._config) {
      return nothing;
    }
    const ctx = this._buildCtx();
    if (!ctx) {
      return html`<ha-card
        ><div class="hint">
          ${makeLocalize(this.hass)("entity_missing")}
        </div></ha-card
      >`;
    }
    let body: TemplateResult;
    switch (ctx.config.mode) {
      case "compact":
        body = renderCompact(ctx);
        break;
      case "year":
        body = renderYear(ctx, this);
        break;
      default:
        body = renderList(ctx, this);
    }
    return html`
      <ha-card style="position:relative">
        ${this._config.title
          ? html`<div class="title">${this._config.title}</div>`
          : nothing}
        ${body} ${this._renderDialog(ctx)}
      </ha-card>
    `;
  }

  private _renderDialog(ctx: CardCtx): TemplateResult | typeof nothing {
    const dialog = this._dialog;
    if (!dialog) {
      return nothing;
    }
    if (dialog.kind === "block") {
      const b = dialog.block;
      const isPlanned = ctx.plannedBlockIds.has(b.block_id);
      const plannedItem = ctx.planned.find((p) => p.block_id === b.block_id);
      return html`
        <div class="overlay" @click=${() => this.closeDialog()}>
          <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
            <h3>
              ${b.vacation_days} ${ctx.t("vacation_days_short")} →
              ${b.free_days} ${ctx.t("free_days_short")}
            </h3>
            <div class="row">
              <span class="muted">${ctx.t("date_range")}</span>
              <span class="num"
                >${formatDateNumeric(ctx, b.free_range_start)} –
                ${formatDateNumeric(ctx, b.free_range_end)}</span
              >
            </div>
            <div class="row">
              <span class="muted">${ctx.t("efficiency")}</span>
              <span class="num">×${b.efficiency.toFixed(2)}</span>
            </div>
            <div class="row">
              <span class="muted">${ctx.t("holidays")}</span>
              <span>${b.holidays.map((h) => h.local_name).join(", ")}</span>
            </div>
            <div class="actions">
              <button class="fen ghost" @click=${() => this.closeDialog()}>
                ${ctx.t("cancel")}
              </button>
              ${isPlanned && plannedItem
                ? html`<button
                    class="fen danger"
                    @click=${() => this.removeItem(plannedItem.id)}
                  >
                    ${ctx.t("remove")}
                  </button>`
                : html`<button
                    class="fen"
                    @click=${() => this.planBlock(b.block_id)}
                  >
                    ${ctx.t("plan")}
                  </button>`}
            </div>
          </div>
        </div>
      `;
    }
    if (dialog.kind === "item") {
      const item = dialog.item;
      return html`
        <div class="overlay" @click=${() => this.closeDialog()}>
          <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
            <h3>${ctx.t("planned")}</h3>
            <div class="row">
              <span class="muted">${ctx.t("date_range")}</span>
              <span class="num"
                >${formatDateNumeric(ctx, item.start)} –
                ${formatDateNumeric(ctx, item.end)}</span
              >
            </div>
            <div class="row">
              <span class="muted">${ctx.t("range_estimate")}</span>
              <span class="num">${item.vacation_dates.length}</span>
            </div>
            <div class="actions">
              <button class="fen ghost" @click=${() => this.closeDialog()}>
                ${ctx.t("cancel")}
              </button>
              <button
                class="fen danger"
                @click=${() => this.removeItem(item.id)}
              >
                ${ctx.t("remove")}
              </button>
            </div>
          </div>
        </div>
      `;
    }
    // kind === "range" — Bestätigung einer freien Auswahl.
    return html`
      <div class="overlay" @click=${() => this.closeDialog()}>
        <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
          <h3>${ctx.t("plan")}</h3>
          <div class="row">
            <span class="muted">${ctx.t("date_range")}</span>
            <span class="num"
              >${formatDateNumeric(ctx, dialog.start)} –
              ${formatDateNumeric(ctx, dialog.end)}</span
            >
          </div>
          <div class="actions">
            <button class="fen ghost" @click=${() => this.closeDialog()}>
              ${ctx.t("cancel")}
            </button>
            <button
              class="fen"
              @click=${() => this.planRange(dialog.start, dialog.end)}
            >
              ${ctx.t("plan")}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [CARD_TAG]: FenstertageCard;
  }
}
