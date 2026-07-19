import { css } from "lit";

/**
 * Effizienz-Farbrampe: neutral (niedrig) → kräftiges Teal (hoch).
 * Bewusst keine Ampel — Effizienz ist kein Alarm, sondern eine Güte.
 * Werte via color-mix aus der Theme-Primärfarbe abgeleitet, damit die
 * Karte in jedem Theme (hell/dunkel) stimmig bleibt.
 */
export function efficiencyColor(eff: number): string {
  // eff ist praktisch 1.0 … 4.0+; auf 0..1 normieren.
  const t = Math.max(0, Math.min(1, (eff - 1) / 3));
  const pct = Math.round(25 + t * 75); // 25 % … 100 % Primärfarbanteil
  return `color-mix(in srgb, var(--primary-color) ${pct}%, var(--secondary-text-color) ${100 - pct}%)`;
}

export const cardStyles = css`
  :host {
    --fen-radius: 10px;
    --fen-transition: 180ms ease;
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
`;
