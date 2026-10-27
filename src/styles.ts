import { css } from "lit";

/**
 * Effizienz-Farbrampe: helles Blau (niedrig) → kräftiges Blau (hoch).
 * Bleibt in der Fenstertag-Blaufamilie des Originals statt der
 * Theme-Primärfarbe zu folgen — die Kartenfarben sollen als Marke
 * wiedererkennbar sein, unabhängig vom gewählten HA-Theme.
 */
export function efficiencyColor(eff: number): string {
  // eff ist praktisch 1.0 … 4.0+; auf 0..1 normieren.
  const t = Math.max(0, Math.min(1, (eff - 1) / 3));
  const pct = Math.round(35 + t * 65); // 35 % … 100 % kräftiges Blau
  return `color-mix(in srgb, var(--fen-blue-deep) ${pct}%, var(--fen-blue-light) ${100 - pct}%)`;
}

export const cardStyles = css`
  :host {
    --fen-radius: 10px;
    --fen-transition: 180ms ease;

    /* Markenfarben — bewusst fix statt vom HA-Theme abgeleitet, damit
       Feiertag/Fenstertag/Urlaub/Heute wie auf fenstertage.com immer
       dieselbe Bedeutung tragen, gleich in welchem Dashboard-Theme. */
    --fen-red: #ef4444;
    --fen-blue-deep: #1d4ed8;
    --fen-blue-light: #93c5fd;
    --fen-blue: #3b82f6;
    --fen-green: #22c55e;
    --fen-amber: #f59e0b;
  }
  ha-card {
    padding: 16px;
  }
  .title {
    font-size: 1.05rem;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--primary-text-color);
  }
  .muted {
    color: var(--secondary-text-color);
  }
  .num {
    font-variant-numeric: tabular-nums;
  }

  /* Budget-Balken */
  .budget {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
    font-size: 0.85rem;
  }
  .budget .bar {
    flex: 1;
    height: 6px;
    border-radius: 3px;
    background: var(--divider-color);
    overflow: hidden;
  }
  .budget .bar > div {
    height: 100%;
    border-radius: 3px;
    background: var(--primary-color);
    transition: width var(--fen-transition);
  }
  .budget.over .bar > div {
    background: var(--error-color, #d32f2f);
  }

  /* Badges */
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-primary-color, #fff);
  }

  /* Dialog-Overlay */
  .overlay {
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, var(--card-background-color) 55%, transparent);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--ha-card-border-radius, 12px);
    z-index: 2;
  }
  .dialog {
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: var(--fen-radius);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.25);
    padding: 16px;
    max-width: 320px;
    width: calc(100% - 48px);
  }
  .dialog h3 {
    margin: 0 0 8px;
    font-size: 1rem;
  }
  .dialog .row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 0.85rem;
    padding: 3px 0;
  }
  .dialog .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 14px;
  }
  button.fen {
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    padding: 8px 14px;
    cursor: pointer;
    transition: filter var(--fen-transition), transform var(--fen-transition);
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
  }
  button.fen.ghost {
    background: transparent;
    color: var(--primary-text-color);
    border: 1px solid var(--divider-color);
  }
  button.fen.danger {
    background: var(--error-color, #d32f2f);
  }
  button.fen:hover {
    filter: brightness(1.08);
  }
  button.fen:active {
    transform: scale(0.97);
  }

  .hint {
    padding: 12px;
    border: 1px dashed var(--divider-color);
    border-radius: var(--fen-radius);
    color: var(--secondary-text-color);
    font-size: 0.9rem;
  }

  /* list-Modus */
  .list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .list-row {
    display: grid;
    grid-template-columns: 1fr auto auto 20px;
    align-items: center;
    gap: 10px;
    width: 100%;
    text-align: left;
    font: inherit;
    color: var(--primary-text-color);
    background: transparent;
    border: none;
    border-radius: 8px;
    padding: 8px 10px;
    cursor: pointer;
    transition: background var(--fen-transition);
  }
  .list-row:hover {
    background: color-mix(in srgb, var(--primary-color) 8%, transparent);
  }
  .list-row.planned {
    background: color-mix(in srgb, var(--primary-color) 14%, transparent);
  }
  .list-row .when {
    display: flex;
    flex-direction: column;
  }
  .list-row .date {
    font-weight: 600;
  }
  .small {
    font-size: 0.75rem;
  }
  .list-row .mark {
    color: var(--primary-color);
    font-weight: 700;
    text-align: center;
  }

  /* compact-Modus */
  .compact .when {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .compact .date {
    font-size: 1.3rem;
    font-weight: 700;
  }
  .compact .what {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 6px;
  }

  /* year-Modus */
  .year-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 12px;
  }
  .year-head .budget {
    margin-top: 0;
    min-width: 180px;
    flex: 1;
  }
  .year-tabs {
    display: flex;
    gap: 4px;
  }
  .year-tab {
    font: inherit;
    font-weight: 600;
    background: transparent;
    color: var(--secondary-text-color);
    border: 1px solid var(--divider-color);
    border-radius: 999px;
    padding: 4px 12px;
    cursor: pointer;
    transition: all var(--fen-transition);
  }
  .year-tab.active {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: var(--text-primary-color, #fff);
  }
  .pick-hint {
    margin-bottom: 8px;
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 0.8rem;
    background: color-mix(in srgb, var(--primary-color) 12%, transparent);
    color: var(--primary-text-color);
  }
  .months {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 16px;
  }
  .month {
    background: color-mix(in srgb, var(--primary-text-color) 4%, var(--card-background-color));
    border: 1px solid var(--divider-color);
    border-radius: 12px;
    padding: 12px;
  }
  .month-name {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
    text-transform: uppercase;
    color: var(--secondary-text-color);
  }
  .month-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }
  .wd {
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    text-align: center;
    padding-bottom: 4px;
  }
  .day {
    font: inherit;
    font-size: 0.72rem;
    font-variant-numeric: tabular-nums;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--primary-text-color);
    cursor: pointer;
    padding: 0;
    transition: background var(--fen-transition), transform var(--fen-transition);
  }
  .day:hover {
    background: color-mix(in srgb, var(--primary-color) 12%, transparent);
  }
  .day:active {
    transform: scale(0.96);
  }
  .day.weekend {
    color: var(--secondary-text-color);
  }
  .day.past {
    opacity: 0.65;
    cursor: default;
  }
  .day.holiday {
    background: var(--fen-red);
    color: #fff;
    font-weight: 700;
    cursor: default;
  }
  .day.range {
    box-shadow: inset 0 0 0 1px
      color-mix(in srgb, var(--fen-blue) 45%, transparent);
  }
  .day.block {
    background: var(--fen-day-color);
    color: #fff;
    font-weight: 700;
  }
  .day.is-planned {
    background: var(--fen-green);
    color: #fff;
    font-weight: 700;
  }
  .day.selected {
    outline: 2px solid var(--fen-blue);
    outline-offset: 1px;
  }
  .day.today {
    box-shadow: inset 0 0 0 2px var(--fen-amber);
  }
  .day.today:not(.holiday):not(.block):not(.is-planned) {
    background: var(--fen-amber);
    color: #221503;
    font-weight: 700;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-top: 14px;
  }
  .legend .dot {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    margin-right: 5px;
  }
  .legend .holiday-dot {
    background: var(--fen-red);
  }
  .legend .block-dot {
    background: var(--fen-blue);
  }
  .legend .planned-dot {
    background: var(--fen-green);
  }
  .legend .weekend-dot {
    background: var(--secondary-text-color);
    opacity: 0.5;
  }
  .legend .today-dot {
    background: var(--fen-amber);
  }
`;
