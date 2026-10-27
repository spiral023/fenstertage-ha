import { html, nothing, type TemplateResult } from "lit";
import type { FenstertageCard } from "../fenstertage-card";
import { renderBudget } from "../shared";
import { efficiencyColor } from "../styles";
import type {
  BlockData,
  CardCtx,
  PlannedItemData,
} from "../types";

const MS_PER_DAY = 86400000;

interface DayCell {
  iso: string;
  day: number;
  weekend: boolean;
  past: boolean;
  holidayName?: string | undefined;
  block?: BlockData | undefined;
  inFreeRange: boolean;
  planned?: PlannedItemData | undefined;
  selected: boolean;
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(
    day,
  ).padStart(2, "0")}`;
}

function todayIso(): string {
  const now = new Date();
  return iso(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Lookup-Tabellen einmal pro Render bauen — O(1) pro Tageszelle. */
function buildLookups(ctx: CardCtx, year: string) {
  const data = ctx.years[year];
  const holidayByIso = new Map<string, string>();
  const blockByVacationIso = new Map<string, BlockData>();
  const freeRangeIso = new Set<string>();
  for (const h of data?.holidays ?? []) {
    holidayByIso.set(h.date, h.local_name);
  }
  const levels = ctx.config.levels;
  for (const b of data?.blocks ?? []) {
    if (levels?.length && !levels.includes(b.level)) {
      continue;
    }
    for (const d of b.vacation_dates) {
      blockByVacationIso.set(d, b);
    }
    const start = new Date(`${b.free_range_start}T00:00:00`);
    const end = new Date(`${b.free_range_end}T00:00:00`);
    for (
      let t = start.getTime();
      t <= end.getTime();
      t += MS_PER_DAY
    ) {
      const d = new Date(t);
      freeRangeIso.add(iso(d.getFullYear(), d.getMonth(), d.getDate()));
    }
  }
  const plannedByIso = new Map<string, PlannedItemData>();
  for (const item of ctx.planned) {
    for (const d of item.vacation_dates) {
      plannedByIso.set(d, item);
    }
  }
  return { holidayByIso, blockByVacationIso, freeRangeIso, plannedByIso };
}

function monthName(ctx: CardCtx, year: number, month: number): string {
  const lang = ctx.hass.locale?.language ?? "en";
  return new Date(year, month, 1).toLocaleDateString(lang, {
    month: "short",
  });
}

function weekdayInitials(ctx: CardCtx): string[] {
  const lang = ctx.hass.locale?.language ?? "en";
  // 2024-01-01 war ein Montag. Zweistellig statt "narrow" — im
  // Deutschen sind Mo/Di/Mi/Do sonst nicht unterscheidbar.
  return Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i)
      .toLocaleDateString(lang, { weekday: "short" })
      .replace(/[^\p{L}]/gu, "")
      .slice(0, 2),
  );
}

function onDayClick(
  card: FenstertageCard,
  cell: DayCell,
): void {
  if (cell.planned) {
    card.openDialog({ kind: "item", item: cell.planned });
    return;
  }
  if (cell.block) {
    card.openDialog({ kind: "block", block: cell.block });
    return;
  }
  if (cell.weekend || cell.holidayName || cell.past) {
    return;
  }
  if (!card.selStart) {
    card.selStart = cell.iso;
    return;
  }
  const [start, end] =
    card.selStart <= cell.iso
      ? [card.selStart, cell.iso]
      : [cell.iso, card.selStart];
  card.openDialog({ kind: "range", start, end });
}

function renderMonth(
  ctx: CardCtx,
  card: FenstertageCard,
  year: number,
  month: number,
  lookups: ReturnType<typeof buildLookups>,
): TemplateResult {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Mo-basierter Offset der ersten Zelle (0 = Montag).
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const today = todayIso();
  const cells: (DayCell | null)[] = Array.from(
    { length: firstWeekday },
    () => null,
  );
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayIso = iso(year, month, day);
    const weekday = (firstWeekday + day - 1) % 7;
    cells.push({
      iso: dayIso,
      day,
      weekend: weekday >= 5,
      past: dayIso < today,
      holidayName: lookups.holidayByIso.get(dayIso),
      block: lookups.blockByVacationIso.get(dayIso),
      inFreeRange: lookups.freeRangeIso.has(dayIso),
      planned: lookups.plannedByIso.get(dayIso),
      selected: card.selStart === dayIso,
    });
  }
  return html`
    <div class="month">
      <div class="month-name">${monthName(ctx, year, month)}</div>
      <div class="month-grid">
        ${weekdayInitials(ctx).map(
          (w) => html`<span class="wd muted">${w}</span>`,
        )}
        ${cells.map((cell) => {
          if (cell === null) {
            return html`<span></span>`;
          }
          const classes = [
            "day",
            cell.weekend ? "weekend" : "",
            cell.past ? "past" : "",
            cell.holidayName ? "holiday" : "",
            cell.inFreeRange && !cell.block ? "range" : "",
            cell.block ? "block" : "",
            cell.planned ? "is-planned" : "",
            cell.selected ? "selected" : "",
            cell.iso === todayIso() ? "today" : "",
          ]
            .filter(Boolean)
            .join(" ");
          const style = cell.block
            ? `--fen-day-color:${efficiencyColor(cell.block.efficiency)}`
            : "";
          return html`
            <button
              class=${classes}
              style=${style}
              title=${cell.holidayName ?? ""}
              @click=${() => onDayClick(card, cell)}
            >
              ${cell.day}
            </button>
          `;
        })}
      </div>
    </div>
  `;
}

export function renderYear(
  ctx: CardCtx,
  card: FenstertageCard,
): TemplateResult {
  const yearKeys = Object.keys(ctx.years).sort();
  if (!yearKeys.length) {
    return html`<div class="hint">${ctx.t("no_blocks")}</div>`;
  }
  const active = card.activeYear ?? yearKeys[0]!;
  const year = Number(active);
  const lookups = buildLookups(ctx, active);
  return html`
    <div class="year-head">
      <div class="year-tabs" role="tablist">
        ${yearKeys.map(
          (y) => html`
            <button
              class="year-tab ${y === active ? "active" : ""}"
              role="tab"
              @click=${() => {
                card.activeYear = y;
                card.selStart = undefined;
              }}
            >
              ${y}
            </button>
          `,
        )}
      </div>
      ${ctx.config.show_budget ? renderBudget(ctx, year) : nothing}
    </div>
    ${card.selStart
      ? html`<div class="pick-hint">${ctx.t("pick_end")}</div>`
      : nothing}
    <div class="months">
      ${Array.from({ length: 12 }, (_, month) =>
        renderMonth(ctx, card, year, month, lookups),
      )}
    </div>
    <div class="legend muted small">
      <span><i class="dot holiday-dot"></i>${ctx.t("holidays")}</span>
      <span><i class="dot block-dot"></i>${ctx.t("bridge_day")}</span>
      <span><i class="dot planned-dot"></i>${ctx.t("vacation")}</span>
      <span><i class="dot weekend-dot"></i>${ctx.t("weekend")}</span>
      <span><i class="dot today-dot"></i>${ctx.t("today")}</span>
    </div>
  `;
}
