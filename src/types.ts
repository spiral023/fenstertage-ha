export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  locale?: { language: string };
  language?: string;
  callService(
    domain: string,
    service: string,
    data: Record<string, unknown>,
  ): Promise<unknown>;
}

export type CardMode = "compact" | "list" | "year";

export interface FenstertageCardConfig {
  type: string;
  entity: string;
  mode?: CardMode | undefined;
  title?: string | undefined;
  show_budget?: boolean | undefined;
  levels?: number[] | undefined;
}

export interface HolidayData {
  date: string;
  local_name: string;
}

export interface BlockData {
  block_id: string;
  level: number;
  vacation_dates: string[];
  vacation_day_weekdays: string[];
  vacation_days: number;
  free_days: number;
  free_days_without_weekend: number;
  efficiency: number;
  free_range_start: string;
  free_range_end: string;
  holidays: { date: string; local_name: string; name: string }[];
}

export interface PlannedItemData {
  id: string;
  start: string;
  end: string;
  vacation_dates: string[];
  source: string;
  block_id: string | null;
}

export interface YearData {
  holidays: HolidayData[];
  blocks: BlockData[];
}

export interface BudgetInfo {
  remaining: number;
  total: number;
  planned: number;
}

export type DialogState =
  | { kind: "block"; block: BlockData }
  | { kind: "item"; item: PlannedItemData }
  | { kind: "range"; start: string; end: string };

export interface CardCtx {
  hass: HomeAssistant;
  config: FenstertageCardConfig & {
    mode: CardMode;
    show_budget: boolean;
  };
  entryId: string;
  /** Kommende Blöcke, nach `levels` gefiltert, datumssortiert. */
  blocks: BlockData[];
  /** Voller Jahres-Datensatz für den year-Modus. */
  years: Record<string, YearData>;
  planned: PlannedItemData[];
  plannedBlockIds: Set<string>;
  budget: BudgetInfo | null;
  t: (key: string, vars?: Record<string, string | number>) => string;
}
