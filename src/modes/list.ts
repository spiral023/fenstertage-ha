// src/modes/list.ts — Platzhalter, wird in Task 13 ersetzt.
// Parameter mit _-Präfix: tsconfig noUnusedParameters ignoriert nur _-Namen.
import { html, type TemplateResult } from "lit";
import type { CardCtx } from "../types";
import type { FenstertageCard } from "../fenstertage-card";

export function renderList(
  _ctx: CardCtx,
  _card: FenstertageCard,
): TemplateResult {
  return html`<div class="hint">list mode: Task 13</div>`;
}
