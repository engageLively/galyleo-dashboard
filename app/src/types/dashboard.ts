// TypeScript types for the Galyleo Dashboard intermediate JSON format (.gd.json)

export type ColumnType = 'number' | 'string' | 'boolean' | 'date' | 'datetime' | 'timeofday';

export interface GalyleoColumn {
  name: string;
  type: ColumnType;
}

export interface TableConnector {
  url: string;
  remoteName: string;
  interval?: number;
}

export interface GalyleoTableSpec {
  columns: GalyleoColumn[];
  connector?: TableConnector;
  rows?: unknown[][];
  staticUrl?: string;
}

export interface GalyleoViewSpec {
  table: string;
  columns: string[];
  filterNames: string[];
}

// ---- Morphic property types ----

export interface MorphicColorRGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type MorphicColor = string | MorphicColorRGBA;

export interface MorphicBorder {
  style: Record<string, string> | string;
  width: Record<string, number> | number;
  color: Record<string, MorphicColor>;
  radius: Record<string, number> | number;
  borderRadius?: number;
}

export interface MorphicProperties {
  rotation: number;
  scale: number;
  clipMode: 'hidden' | 'visible' | 'auto' | 'scroll';
  opacity: number;
  position: { x: number; y: number };
  extent: { x: number; y: number };
  fill: MorphicColor;
  border: MorphicBorder;
  origin: { x: number; y: number };
  dropShadow?: unknown;
}

// ---- Chart types ----

export interface ChartOptions {
  title?: string;
  width?: string | number;
  height?: string | number;
  [key: string]: unknown;
}

export interface GalyleoChartSpec {
  chartType: string;
  options: ChartOptions;
  viewOrTable: string;
  morphIndex: number;
  morphicProperties: MorphicProperties;
}

// ---- Filter types ----

export interface FilterChoice {
  isListItem: boolean;
  string: string;
  value: unknown;
}

export interface SelectFilterSavedForm {
  filterType: 'Select' | 'NumericSelect';
  columnName: string;
  tableName: string;
  choices: FilterChoice[];
  selection: unknown;
  isString: boolean;
  part: unknown;
}

export interface RangeFilterSavedForm {
  filterType: 'Range' | 'DoubleSlider';
  columnName: string;
  tableName: string;
  min_val?: number;
  max_val?: number;
  minVal?: number;
  maxVal?: number;
  low_selection?: number;
  high_selection?: number;
  part: unknown;
}

export interface SliderFilterSavedForm {
  filterType: 'Slider';
  columnName: string;
  tableName: string;
  min_val: number;
  max_val: number;
  selection: number;
  part: unknown;
}

export interface BooleanFilterSavedForm {
  filterType: 'Boolean';
  columnName: string;
  tableName: string;
  selection: boolean;
  part: unknown;
}

export interface ListFilterSavedForm {
  filterType: 'List';
  columnName: string;
  tableName: string;
  choices: FilterChoice[];
  selection: unknown[];
  part: unknown;
}

export type FilterSavedForm =
  | SelectFilterSavedForm
  | RangeFilterSavedForm
  | SliderFilterSavedForm
  | BooleanFilterSavedForm
  | ListFilterSavedForm
  | Record<string, unknown>;

export interface GalyleoFilterSpec {
  savedForm: FilterSavedForm;
  morphIndex: number;
  morphicProperties: MorphicProperties;
}

// ---- Static morphs (Image, Text, etc.) ----

export interface MorphDescriptor {
  type: string;
  name: string;
  morphIndex: number;
  morphicProperties: MorphicProperties;
  imageUrl?: string;
  textProperties?: Record<string, unknown>;
  complexTextProperties?: Record<string, unknown>;
  textString?: string;
}

// ---- Top-level dashboard spec ----

export interface GalyleoDashboard {
  fill?: string;
  tables: Record<string, GalyleoTableSpec>;
  views: Record<string, GalyleoViewSpec>;
  charts: Record<string, GalyleoChartSpec>;
  filters: Record<string, GalyleoFilterSpec>;
  morphs?: MorphDescriptor[] | Record<string, MorphDescriptor>;
  numMorphs?: number;
}

// ---- Filter value types (runtime state, keyed by filter/chart name) ----

export interface InListFilterValue {
  operator: 'IN_LIST';
  column: string;
  values: unknown[];
}

export interface InRangeFilterValue {
  operator: 'IN_RANGE';
  column: string;
  max_val: number;
  min_val: number;
}

export type FilterValue = InListFilterValue | InRangeFilterValue;
