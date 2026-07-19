import { LitElement, html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { EDITOR_TAG } from "./const";
import type { FenstertageCardConfig, HomeAssistant } from "./types";

const SCHEMA = [
  { name: "entity", required: true, selector: { entity: { domain: "sensor" } } },
  {
    name: "mode",
    selector: {
      select: {
        mode: "dropdown",
        options: [
          { value: "compact", label: "Compact" },
          { value: "list", label: "List" },
          { value: "year", label: "Year planner" },
        ],
      },
    },
  },
  { name: "title", selector: { text: {} } },
  { name: "show_budget", selector: { boolean: {} } },
  {
    name: "levels",
    selector: {
      select: {
        multiple: true,
        options: ["1", "2", "3", "4", "5"].map((v) => ({
          value: v,
          label: `Level ${v}`,
        })),
      },
    },
  },
];

@customElement(EDITOR_TAG)
export class FenstertageCardEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: FenstertageCardConfig;

  public setConfig(config: FenstertageCardConfig): void {
    this._config = config;
  }

  protected override render(): TemplateResult | typeof nothing {
    if (!this.hass || !this._config) {
      return nothing;
    }
    // levels als Strings für den Multi-Select spiegeln:
    const data = {
      ...this._config,
      levels: (this._config.levels ?? []).map(String),
    };
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${SCHEMA}
        .computeLabel=${(s: { name: string }) => s.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const value = ev.detail.value as FenstertageCardConfig & {
      levels?: string[];
    };
    const { levels: rawLevels, ...rest } = value;
    const config: FenstertageCardConfig = rawLevels?.length
      ? { ...rest, levels: rawLevels.map(Number) }
      : rest;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [EDITOR_TAG]: FenstertageCardEditor;
  }
}
