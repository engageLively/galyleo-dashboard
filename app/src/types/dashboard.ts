// TypeScript types for the Galyleo Dashboard intermediate JSON format (.gd.json)

/** Scalar column types supported by SDML tables. */
export type ColumnType = 'number' | 'string' | 'boolean' | 'date' | 'datetime' | 'timeofday';

/** A single column descriptor used in table schemas and view projections. */
export interface GalyleoColumn {
  name: string;
  type: ColumnType;
}

/** Connection details for a live SDTP server-backed table. */
export interface TableConnector {
  /** Base URL of the SDTP server (e.g. `https://example.com/services/galyleo`). */
  url: string;
  /** The table name as known to the server (may include a namespace path). */
  remoteName: string;
  /** Optional polling interval in seconds for live tables. */
  interval?: number;
}

/**
 * Specification for a single table in the dashboard.
 *
 * Exactly one of `rows`, `staticUrl`, or `connector` should be present:
 * - `rows` — inline data embedded in the dashboard JSON.
 * - `staticUrl` — URL of an SDML file fetched at load time (client-side filtering).
 * - `connector` — live SDTP server (server-side filtering).
 */
export interface GalyleoTableSpec {
  /** Column schema. Always present. */
  columns: GalyleoColumn[];
  /** Live server connector. */
  connector?: TableConnector;
  /** Inline row data. */
  rows?: unknown[][];
  /** URL of a static SDML file to fetch at load time. */
  staticUrl?: string;
}

/**
 * A named projection of a table.
 * Charts bind to views, not tables directly.
 */
export interface GalyleoViewSpec {
  /** The backing table name. */
  table: string;
  /** The subset of columns to project (in display order). */
  columns: string[];
  /**
   * Names of filters that apply to this view.
   * Each name is looked up in the runtime `FilterDictionary` at query time.
   * Can be a filter widget name or a chart name (chart-as-filter).
   */
  filterNames: string[];
}

// ---- Morphic property types ----

/** An RGBA colour with components in [0, 1]. */
export interface MorphicColorRGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * A colour value — either a CSS string / lively `Color.*` expression,
 * or an RGBA object with components in [0, 1].
 */
export type MorphicColor = string | MorphicColorRGBA;

/** Border styling from a lively.next morph. */
export interface MorphicBorder {
  /** Per-side or uniform border style (e.g. `'solid'`). */
  style: Record<string, string> | string;
  /** Per-side or uniform border width in pixels. */
  width: Record<string, number> | number;
  /** Per-side border colour. */
  color: Record<string, MorphicColor>;
  /** Per-side or uniform border radius in pixels. */
  radius: Record<string, number> | number;
  borderRadius?: number;
}

/** The full set of layout and visual properties carried by a lively.next morph. */
export interface MorphicProperties {
  rotation: number;
  scale: number;
  clipMode: 'hidden' | 'visible' | 'auto' | 'scroll';
  opacity: number;
  /** Top-left position on the canvas in pixels. */
  position: { x: number; y: number };
  /** Width and height in pixels. */
  extent: { x: number; y: number };
  fill: MorphicColor;
  border: MorphicBorder;
  origin: { x: number; y: number };
  dropShadow?: unknown;
}

// ---- Chart types ----

/** Chart-library-specific options passed directly to the renderer. */
export interface ChartOptions {
  title?: string;
  width?: string | number;
  height?: string | number;
  [key: string]: unknown;
}

/**
 * Specification for a single chart widget in the dashboard.
 *
 * `viewOrTable` names the view (or table) that supplies the chart's data.
 * When the user clicks a data point, the chart name is used as the filter key
 * in `FilterDictionary`, allowing other charts/views to react.
 */
export interface GalyleoChartSpec {
  /** Google Charts chart type string (e.g. `'BarChart'`, `'GeoChart'`). */
  chartType: string;
  /** Chart-library options (titles, colours, axes, etc.). */
  options: ChartOptions;
  /** The view or table name that supplies this chart's data. */
  viewOrTable: string;
  morphIndex: number;
  morphicProperties: MorphicProperties;
}

// ---- Filter types ----

/** A single choice item in a Select or List filter. */
export interface FilterChoice {
  isListItem: boolean;
  /** Display label. */
  string: string;
  value: unknown;
}

/** Saved state for a dropdown (Select / NumericSelect) filter. */
export interface SelectFilterSavedForm {
  filterType: 'Select' | 'NumericSelect';
  columnName: string;
  tableName: string;
  choices: FilterChoice[];
  selection: unknown;
  /** True if the column holds string values (affects numeric coercion on change). */
  isString: boolean;
  part: unknown;
}

/** Saved state for a dual-handle range (Range / DoubleSlider) filter. */
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

/** Saved state for a single-value slider filter. */
export interface SliderFilterSavedForm {
  filterType: 'Slider';
  columnName: string;
  tableName: string;
  min_val: number;
  max_val: number;
  selection: number;
  part: unknown;
}

/** Saved state for a boolean toggle filter. */
export interface BooleanFilterSavedForm {
  filterType: 'Boolean';
  columnName: string;
  tableName: string;
  selection: boolean;
  part: unknown;
}

/** Saved state for a multi-select list filter. */
export interface ListFilterSavedForm {
  filterType: 'List';
  columnName: string;
  tableName: string;
  choices: FilterChoice[];
  selection: unknown[];
  part: unknown;
}

/** Union of all filter saved-form types. */
export type FilterSavedForm =
  | SelectFilterSavedForm
  | RangeFilterSavedForm
  | SliderFilterSavedForm
  | BooleanFilterSavedForm
  | ListFilterSavedForm
  | Record<string, unknown>;

/**
 * Specification for a single filter widget in the dashboard.
 * `savedForm` carries the filter type, column binding, and initial selection.
 */
export interface GalyleoFilterSpec {
  savedForm: FilterSavedForm;
  morphIndex: number;
  morphicProperties: MorphicProperties;
}

// ---- Static morphs (Image, Text, etc.) ----

/**
 * A non-interactive morph placed on the dashboard canvas —
 * currently `'Image'` or `'Text'`.
 */
export interface MorphDescriptor {
  /** Morph type discriminator (`'Image'`, `'Text'`, etc.). */
  type: string;
  name: string;
  morphIndex: number;
  morphicProperties: MorphicProperties;
  /** Image URL (for Image morphs). */
  imageUrl?: string;
  /** Text styling properties (fontSize, fontWeight, textAlign, color, fontFamily). */
  textProperties?: Record<string, unknown>;
  complexTextProperties?: Record<string, unknown>;
  /** The text content to display (for Text morphs). */
  textString?: string;
}

// ---- Top-level dashboard spec ----

/**
 * The top-level structure of a `.gd.json` dashboard file.
 *
 * A dashboard is a canvas of absolute-positioned widgets:
 * - **tables** — data sources (inline, static URL, or remote SDTP)
 * - **views** — named column projections with filter bindings
 * - **charts** — visualisations bound to views
 * - **filters** — interactive widgets that drive filter values
 * - **morphs** — static decorations (images, text labels)
 */
export interface GalyleoDashboard {
  /** Canvas background fill colour (lively `Color.*` expression or CSS string). */
  fill?: string;
  tables: Record<string, GalyleoTableSpec>;
  views: Record<string, GalyleoViewSpec>;
  charts: Record<string, GalyleoChartSpec>;
  filters: Record<string, GalyleoFilterSpec>;
  /** Static morphs — stored as an array or as a name-keyed dictionary. */
  morphs?: MorphDescriptor[] | Record<string, MorphDescriptor>;
  numMorphs?: number;
}

// ---- Filter value types (runtime state, keyed by filter/chart name) ----

/** Runtime filter value for an IN_LIST filter (produced by select widgets and chart clicks). */
export interface InListFilterValue {
  operator: 'IN_LIST';
  column: string;
  values: unknown[];
}

/** Runtime filter value for an IN_RANGE filter (produced by range/slider widgets). */
export interface InRangeFilterValue {
  operator: 'IN_RANGE';
  column: string;
  max_val: number;
  min_val: number;
}

/** Union of runtime filter value types stored in `FilterDictionary`. */
export type FilterValue = InListFilterValue | InRangeFilterValue;
