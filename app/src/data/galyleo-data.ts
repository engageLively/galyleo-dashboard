// Port of galyleo-data.js to TypeScript.
// Replaces lively.resources with native fetch(); removes all lively.next dependencies.

import type { GalyleoColumn, ColumnType, GalyleoTableSpec, GalyleoViewSpec } from '../types/dashboard';

function createBadDashboardError(msg: string): never {
  throw new Error(msg);
}

// ---- Filter specs ----

/** A filter that passes rows where a column's value is in a given set. */
export interface InListFilterSpec {
  operator: 'IN_LIST';
  /** The column name to filter on. */
  column: string;
  /** The set of allowed values. */
  values: unknown[];
}

/** A filter that passes rows where a numeric column's value falls within [min_val, max_val]. */
export interface InRangeFilterSpec {
  operator: 'IN_RANGE';
  /** The column name to filter on. */
  column: string;
  max_val: number;
  min_val: number;
}

/** A boolean combination of other filters. */
export interface BooleanFilterSpec {
  operator: 'ALL' | 'ANY' | 'NONE';
  arguments: FilterSpec[];
}

/** Union of all filter specification types. */
export type FilterSpec = InListFilterSpec | InRangeFilterSpec | BooleanFilterSpec;

/**
 * A map from filter/chart name to its current FilterSpec.
 * Undefined values mean the filter is inactive.
 */
export type FilterDictionary = Record<string, FilterSpec | undefined>;

// ---- Filter classes ----

/**
 * Abstract base for all row filters.
 * Subclasses implement `_getRows_` which returns matching row indices.
 */
abstract class Filter {
  constructor(public table: GalyleoTable) {}

  abstract _getRows_(rows: unknown[][]): number[];

  /** Returns the subset of rows that pass this filter. */
  getRows(rows: unknown[][]): unknown[][] {
    return this._getRows_(rows).map(i => rows[i]);
  }

  equals(other: Filter): boolean {
    return this.table === other.table;
  }
}

/** A filter that combines child filters using boolean logic. */
abstract class BooleanFilter extends Filter {
  constructor(table: GalyleoTable, public args: Filter[]) {
    super(table);
  }

  equals(other: Filter): boolean {
    if (!(other instanceof BooleanFilter)) return false;
    if (!super.equals(other) || this.args.length !== other.args.length) return false;
    const findMatch = (f: Filter, list: Filter[]) => list.some(g => g.equals(f));
    return (
      this.args.every(f => findMatch(f, other.args)) &&
      other.args.every(f => findMatch(f, this.args))
    );
  }
}

/** Passes rows that satisfy ALL child filters (intersection). */
class AllFilter extends BooleanFilter {
  _getRows_(rows: unknown[][]): number[] {
    let result = Array.from({ length: rows.length }, (_, i) => i);
    for (const f of this.args) {
      const inner = new Set(f._getRows_(rows));
      result = result.filter(i => inner.has(i));
    }
    return result;
  }
  equals(other: Filter): boolean { return other instanceof AllFilter && super.equals(other); }
}

/** Passes rows that satisfy ANY child filter (union). */
class AnyFilter extends BooleanFilter {
  _getRows_(rows: unknown[][]): number[] {
    const result = new Set<number>();
    for (const f of this.args) f._getRows_(rows).forEach(i => result.add(i));
    return [...result].sort((a, b) => a - b);
  }
  equals(other: Filter): boolean { return other instanceof AnyFilter && super.equals(other); }
}

/** Passes rows that do NOT satisfy the child filter (complement). */
class NoneFilter extends BooleanFilter {
  _getRows_(rows: unknown[][]): number[] {
    const inverse = new Set(this.args[0]._getRows_(rows));
    return Array.from({ length: rows.length }, (_, i) => i).filter(i => !inverse.has(i));
  }
  equals(other: Filter): boolean { return other instanceof NoneFilter && super.equals(other); }
}

/**
 * A filter that tests a single column value per row.
 * Subclasses implement `_filterValue_`.
 */
abstract class PrimitiveFilter extends Filter {
  constructor(table: GalyleoTable, public column: number) {
    super(table);
  }

  abstract _filterValue_(value: unknown): boolean;

  _getRows_(rows: unknown[][]): number[] {
    return rows
      .map((row, i) => (this._filterValue_(row[this.column]) ? i : -1))
      .filter(i => i >= 0);
  }

  equals(other: Filter): boolean {
    return super.equals(other) && other instanceof PrimitiveFilter && other.column === this.column;
  }
}

/** Passes rows where the column value is a member of a fixed set. */
class InListFilter extends PrimitiveFilter {
  valueSet: Set<unknown>;
  constructor(table: GalyleoTable, column: number, valueList: unknown[]) {
    super(table, column);
    this.valueSet = new Set(valueList);
  }
  _filterValue_(value: unknown): boolean { return this.valueSet.has(value); }
  equals(other: Filter): boolean {
    if (!(other instanceof InListFilter) || !super.equals(other)) return false;
    return this.valueSet.size === other.valueSet.size &&
      this.valueSet.size === new Set([...this.valueSet, ...other.valueSet]).size;
  }
}

/** Passes rows where a numeric column value falls within [minVal, maxVal]. */
class InRangeFilter extends PrimitiveFilter {
  constructor(table: GalyleoTable, column: number, public maxVal: number, public minVal: number) {
    super(table, column);
  }
  _filterValue_(value: unknown): boolean {
    const n = Number(value);
    return !isNaN(n) && n <= this.maxVal && n >= this.minVal;
  }
  equals(other: Filter): boolean {
    return other instanceof InRangeFilter && super.equals(other) &&
      this.maxVal === other.maxVal && this.minVal === other.minVal;
  }
}

// ---- checkSpecValid & constructFilter ----

/**
 * Returns true if `filterSpec` is valid for `table` — i.e. the referenced
 * column exists and (for IN_RANGE) is numeric.
 *
 * @param table - The table to validate against.
 * @param filterSpec - The filter specification to check, or null/undefined.
 */
export function checkSpecValid(table: GalyleoTable, filterSpec: FilterSpec | undefined | null): boolean {
  if (!filterSpec) return false;
  try {
    if (filterSpec.operator === 'IN_RANGE' || filterSpec.operator === 'IN_LIST') {
      const index = table.getColumnIndex(filterSpec.column);
      if (index < 0) return false;
      return filterSpec.operator === 'IN_RANGE' ? table.columns[index].type === 'number' : true;
    }
    return (filterSpec as BooleanFilterSpec).arguments.every(s => checkSpecValid(table, s));
  } catch {
    return false;
  }
}

/**
 * Builds a runnable `Filter` object from a `FilterSpec`.
 *
 * @param table - The table whose rows will be filtered.
 * @param filterSpec - The specification to compile.
 */
export function constructFilter(table: GalyleoTable, filterSpec: FilterSpec): Filter {
  if (filterSpec.operator === 'IN_RANGE') {
    return new InRangeFilter(table, table.getColumnIndex(filterSpec.column), filterSpec.max_val, filterSpec.min_val);
  }
  if (filterSpec.operator === 'IN_LIST') {
    return new InListFilter(table, table.getColumnIndex(filterSpec.column), filterSpec.values);
  }
  const args = (filterSpec as BooleanFilterSpec).arguments.map(s => constructFilter(table, s));
  if (filterSpec.operator === 'NONE') return new NoneFilter(table, args);
  if (filterSpec.operator === 'ALL') return new AllFilter(table, args);
  return new AnyFilter(table, args);
}

// ---- Value conversion ----

/**
 * Coerces a raw SDML value to the correct JavaScript type for a given column type.
 *
 * @param value - The raw value from an SDML row.
 * @param sdmlType - The target column type.
 */
export function convertSDMLValue(value: unknown, sdmlType: ColumnType): unknown {
  if (sdmlType === 'string') {
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
  if (sdmlType === 'number') return Number(value);
  if (sdmlType === 'boolean') {
    const v = typeof value === 'string' ? JSON.parse(value) : value;
    return !!v;
  }
  const str = String(value).trim();
  try { return new Date(str); } catch { return new Date('1970-01-01T00:00:00'); }
}

/**
 * Converts an entire SDML row by coercing each value to its column's type.
 *
 * @param values - Raw row values.
 * @param columns - Column schema describing each value's type.
 */
export function convertSDMLRow(values: unknown[], columns: GalyleoColumn[]): unknown[] {
  return values.map((v, i) => convertSDMLValue(v, columns[i].type));
}

// ---- URLFetcher (replaces lively.resources resource()) ----

/**
 * Minimal HTTP helper used by `RemoteGalyleoTable`.
 * Wraps `fetch()` with JSON serialization and CORS headers.
 */
class URLFetcher {
  headers: Record<string, string> = {};
  body: unknown = null;

  constructor(public url: string, public tableName: string) {}

  addHeader(key: string, value: string): void { this.headers[key] = value; }

  /** POSTs `this.body` as JSON and returns the parsed response array. */
  async post(): Promise<unknown[][]> {
    const res = await fetch(this.url, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', ...this.headers },
      body: JSON.stringify(this.body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  /** GETs the URL and returns the parsed JSON response. */
  async readJson(): Promise<unknown> {
    const res = await fetch(this.url, { method: 'GET', mode: 'cors', headers: this.headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}

// ---- GalyleoTable (abstract) ----

/**
 * Abstract base for all Galyleo table types.
 *
 * A table has a fixed column schema and provides two core async operations:
 * `getRows()` (all rows) and `getFilteredRows(filterSpec)` (filtered rows).
 * Update listeners can be registered to react to live data changes.
 */
export abstract class GalyleoTable {
  updateListeners = new Set<{ tableUpdated: (t: GalyleoTable) => void }>();

  constructor(public columns: GalyleoColumn[], public tableName: string) {}

  /** Column names in declaration order. */
  get columnNames(): string[] { return this.columns.map(c => c.name); }

  /** Returns the zero-based index of a column by name, or -1 if not found. */
  getColumnIndex(name: string): number { return this.columns.findIndex(c => c.name === name); }

  /** Returns the type of a column by name, or null if the column doesn't exist. */
  getColumnType(name: string): ColumnType | null {
    const i = this.getColumnIndex(name);
    return i < 0 ? null : this.columns[i].type;
  }

  /**
   * Returns the names of columns whose types are in `typeList`.
   * Pass an empty array to get all columns.
   */
  getColumnsOfTypes(typeList: ColumnType[]): string[] {
    return this.columns
      .filter(c => typeList.length === 0 || typeList.includes(c.type))
      .map(c => c.name);
  }

  /** Registers a listener that is called whenever the table's data changes. */
  registerUpdateListener(l: { tableUpdated: (t: GalyleoTable) => void }): void {
    this.updateListeners.add(l);
  }

  /** Removes a previously registered update listener. */
  deregisterUpdateListener(l: { tableUpdated: (t: GalyleoTable) => void }): void {
    this.updateListeners.delete(l);
  }

  /** Notifies all registered listeners that the table data has changed. */
  dataUpdated(): void {
    this.updateListeners.forEach(l => l.tableUpdated(this));
  }

  /** Returns all rows in the table. */
  abstract getRows(): Promise<unknown[][]>;

  /**
   * Returns rows that satisfy `filterSpec`.
   * If `filterSpec` is null or undefined, all rows are returned.
   */
  abstract getFilteredRows(filterSpec?: FilterSpec | null): Promise<unknown[][]>;

  /**
   * Returns the sorted unique values present in `columnName`.
   * Numeric columns are sorted numerically; others lexicographically.
   */
  async getAllValues(columnName: string): Promise<unknown[]> {
    const index = this.getColumnIndex(columnName);
    const rows = await this.getRows();
    const vals = [...new Set(rows.map(r => r[index]))];
    if (this.columns[index]?.type === 'number') {
      vals.sort((a, b) => Number(a) - Number(b));
    } else {
      vals.sort();
    }
    return vals;
  }

  /**
   * Returns `{ min_val, max_val, increment }` for a numeric column,
   * where `increment` is the smallest positive difference between adjacent values.
   */
  async getNumericSpec(columnName: string): Promise<{ min_val: number; max_val: number; increment: number }> {
    const values = (await this.getAllValues(columnName)).map(Number);
    const shifted = values.slice(1);
    const deltas = shifted.map((v, i) => v - values[i]);
    const minPositive = (a: number, b: number) => a <= 0 ? b : b <= 0 ? a : Math.min(a, b);
    const incr = deltas.slice(1).reduce(minPositive, deltas[0] ?? 1);
    return { min_val: values[0] ?? 0, max_val: values[values.length - 1] ?? 0, increment: incr };
  }
}

// ---- ExplicitGalyleoTable ----

/**
 * A table whose rows are held entirely in memory and filtered client-side.
 *
 * Created from a `spec.rows` array or by fetching a `spec.staticUrl` SDML file.
 * No server is needed at query time.
 */
export class ExplicitGalyleoTable extends GalyleoTable {
  tableType = 'ExplicitGalyleoTable';
  constructor(columns: GalyleoColumn[], tableName: string, public rows: unknown[][]) {
    super(columns, tableName);
  }

  async getRows(): Promise<unknown[][]> { return this.rows; }

  async getFilteredRows(filterSpec?: FilterSpec | null): Promise<unknown[][]> {
    if (!filterSpec) return this.rows;
    return constructFilter(this, filterSpec).getRows(this.rows);
  }

  toDictionary() { return { columns: this.columns, rows: this.rows }; }
}

// ---- RemoteGalyleoTable ----

/**
 * A table backed by a remote SDTP server.
 *
 * Queries are delegated to the server via:
 * - `POST /get_filtered_rows` — filtered row fetch
 * - `GET /get_all_values` — distinct column values
 * - `GET /get_range_spec` — numeric min/max
 *
 * If `connector.interval` is set, the table polls for updates at that interval (seconds)
 * and notifies its listeners on each tick.
 */
export class RemoteGalyleoTable extends GalyleoTable {
  tableType = 'RemoteGalyleoTable';
  url: string;
  remoteName: string;
  interval?: number;

  constructor(columns: GalyleoColumn[], tableName: string, connector: { url: string; remoteName?: string; interval?: number }) {
    super(columns, tableName.startsWith('tables/') ? tableName.slice('tables/'.length) : tableName);
    this.url = connector.url;
    this.remoteName = connector.remoteName ?? tableName;
    if (connector.interval && !isNaN(connector.interval) && connector.interval >= 1) {
      this.interval = connector.interval;
      setInterval(() => this.dataUpdated(), 1000 * connector.interval);
    }
  }

  private _makeURLFetcher(url: string): URLFetcher {
    return new URLFetcher(url, this.remoteName);
  }

  private _makeURL(method: string): string {
    return this.url.endsWith('/') ? `${this.url}${method}` : `${this.url}/${method}`;
  }

  async getRows(): Promise<unknown[][]> { return this.getFilteredRows(null); }

  async getFilteredRows(filterSpec?: FilterSpec | null): Promise<unknown[][]> {
    const fetcher = this._makeURLFetcher(this._makeURL('get_filtered_rows'));
    const body: Record<string, unknown> = { table: this.remoteName };
    if (filterSpec) body.filter = filterSpec;
    fetcher.body = body;
    fetcher.addHeader('Accept', 'application/json');
    fetcher.addHeader('Content-Type', 'application/json');
    try {
      const result = await fetcher.post();
      return result.map(row => convertSDMLRow(row, this.columns));
    } catch {
      return [];
    }
  }

  async getAllValues(columnName: string): Promise<unknown[]> {
    const fetcher = this._makeURLFetcher(
      `${this._makeURL('get_all_values')}?column=${columnName}&table=${this.tableName}`
    );
    const values = await fetcher.readJson() as unknown[];
    const colType = this.getColumnType(columnName)!;
    return values.map(v => convertSDMLValue(v, colType));
  }

  async getNumericSpec(columnName: string): Promise<{ min_val: number; max_val: number; increment: number }> {
    const fetcher = this._makeURLFetcher(
      `${this._makeURL('get_range_spec')}?column=${columnName}&table=${this.tableName}`
    );
    const values = await fetcher.readJson() as unknown[];
    const colType = this.getColumnType(columnName)!;
    const [min_val, max_val] = values.map(v => Number(convertSDMLValue(v, colType)));
    return { min_val, max_val, increment: 1 };
  }

  toDictionary() {
    const connector: Record<string, unknown> = { url: this.url, remoteName: this.remoteName };
    if (this.interval) connector.interval = this.interval;
    return { columns: this.columns, connector };
  }
}

// ---- constructGalyleoTable ----

/**
 * Factory that creates the appropriate `GalyleoTable` subclass from a dashboard table spec.
 *
 * Resolution order:
 * 1. `spec.rows` present → `ExplicitGalyleoTable` (inline data)
 * 2. `spec.staticUrl` present → fetches an SDML JSON file → `ExplicitGalyleoTable`
 * 3. `spec.connector` present → `RemoteGalyleoTable` (live SDTP server)
 *
 * Returns `null` if the spec has none of the above.
 *
 * @param name - The logical name for the table (key from `dashboard.tables`).
 * @param spec - The table specification from the dashboard JSON.
 */
export async function constructGalyleoTable(name: string, spec: GalyleoTableSpec): Promise<GalyleoTable | null> {
  if (spec.rows != null) {
    return new ExplicitGalyleoTable(spec.columns, name, spec.rows as unknown[][]);
  }
  if (spec.staticUrl != null) {
    const res = await fetch(spec.staticUrl, { mode: 'cors' });
    if (!res.ok) throw new Error(`Failed to fetch ${spec.staticUrl}: HTTP ${res.status}`);
    const sdml = await res.json() as { schema: GalyleoColumn[]; rows: unknown[][] };
    return new ExplicitGalyleoTable(sdml.schema, name, sdml.rows);
  }
  if (spec.connector != null) {
    const table = new RemoteGalyleoTable(spec.columns, name, spec.connector);
    try {
      const fetcher = new URLFetcher(`${table.url}/get_table_schema?table=${table.remoteName}`, table.remoteName);
      await fetcher.readJson();
    } catch {
      console.warn(`Schema validation failed for table "${name}" — proceeding anyway`);
    }
    return table;
  }
  return null;
}

// ---- GalyleoView ----

/**
 * A named projection of a table's columns, optionally filtered by a set of named filters.
 *
 * Views are the data source for charts. A view selects a subset of columns from its
 * backing table and applies any active filters from `filterNames` before returning rows.
 *
 * Filters can come from either filter widgets (in `dashboard.filters`) or from chart
 * selections (where the chart name is the filter key in `FilterDictionary`).
 */
export class GalyleoView {
  tableName: string;
  /** The projected column names (subset of the backing table's columns). */
  columns: string[];
  /**
   * Names of filters that apply to this view.
   * Each name is looked up in the `FilterDictionary` at query time.
   */
  filterNames: string[];

  constructor(spec: GalyleoViewSpec) {
    this.tableName = spec.table;
    this.columns = spec.columns;
    this.filterNames = spec.filterNames;
  }

  toDictionary(): GalyleoViewSpec {
    return { table: this.tableName, columns: this.columns, filterNames: this.filterNames };
  }

  private _getColumnIndexes(table: GalyleoTable): number[] {
    return this.columns.map(c => table.getColumnIndex(c)).filter(i => i >= 0);
  }

  /**
   * Returns the full `GalyleoColumn` descriptors for this view's projected columns.
   * Returns `undefined` if the backing table isn't in `tableDictionary`.
   */
  fullColumns(tableDictionary: Record<string, GalyleoTable>): GalyleoColumn[] | undefined {
    const table = tableDictionary[this.tableName];
    if (!table) return undefined;
    return this._getColumnIndexes(table).map(i => table.columns[i]);
  }

  /**
   * Combines the active filter specs for this view into a single `FilterSpec`.
   * Filters that are invalid for the backing table are silently skipped.
   * Returns `null` if no filters are active.
   */
  private _getFilter(filterSpecs: FilterDictionary, table: GalyleoTable): FilterSpec | null {
    const specs = this.filterNames
      .map(n => filterSpecs[n])
      .filter((s): s is FilterSpec => checkSpecValid(table, s ?? null));
    if (specs.length === 0) return null;
    if (specs.length === 1) return specs[0];
    return { operator: 'ALL', arguments: specs };
  }

  /**
   * Returns the filtered, projected rows for this view.
   *
   * @param filterSpecs - The current filter dictionary from the dashboard store.
   * @param tableDictionary - The loaded tables from the data manager.
   * @returns Rows with columns projected in `this.columns` order, or `undefined`
   *          if the backing table is missing.
   */
  async getData(filterSpecs: FilterDictionary, tableDictionary: Record<string, GalyleoTable>): Promise<unknown[][] | undefined> {
    const table = tableDictionary[this.tableName];
    if (!table) return undefined;
    const indexes = this._getColumnIndexes(table);
    if (indexes.length === 0) return undefined;
    const reorder = (row: unknown[]) => indexes.map(i => row[i]);
    const filter = this._getFilter(filterSpecs, table);
    const rows = await table.getFilteredRows(filter);
    return rows.map(reorder);
  }
}

// ---- GalyleoDataManager ----

/**
 * Central registry for all tables and views in a loaded dashboard.
 *
 * Holds the live instances created from the dashboard spec and provides
 * cross-table helpers (`getAllValues`, `getNumericSpec`, etc.) used by
 * filter widgets to populate their choices.
 */
export class GalyleoDataManager {
  /** All loaded tables, keyed by table name. */
  tables: Record<string, GalyleoTable> = {};
  /** All defined views, keyed by view name. */
  views: Record<string, GalyleoView> = {};

  constructor(public updateListener: { tableUpdated: (t: GalyleoTable) => void } | null = null) {}

  /** Clears all tables and views. */
  clear(): void { this.tables = {}; this.views = {}; }

  get tableNames(): string[] { return Object.keys(this.tables); }
  get viewNames(): string[] { return Object.keys(this.views); }

  /**
   * Constructs a `GalyleoTable` from `spec` and registers it.
   * Errors during construction are caught and logged; the table is skipped.
   */
  async addTable(name: string, spec: GalyleoTableSpec): Promise<void> {
    try {
      const table = await constructGalyleoTable(name, spec);
      if (!table) return;
      this.tables[table.tableName] = table;
      if (this.updateListener) table.registerUpdateListener(this.updateListener);
    } catch (err) {
      console.error(`Error adding table "${name}":`, err);
    }
  }

  /** Creates a `GalyleoView` from `spec` and registers it by `name`. */
  addView(name: string, spec: GalyleoViewSpec): void {
    this.views[name] = new GalyleoView(spec);
  }

  /** Removes a table and any views that depend on it. */
  removeTable(name: string): void {
    if (name in this.tables) {
      delete this.tables[name];
      Object.keys(this.views).forEach(v => {
        if (this.views[v].tableName === name) this.removeView(v);
      });
    }
  }

  /** Removes a view by name. */
  removeView(name: string): void { delete this.views[name]; }

  private _matchingTables(columnName: string, types: Set<ColumnType>, tableName?: string): GalyleoTable[] {
    const names = tableName ? [tableName] : Object.keys(this.tables);
    return names
      .map(n => this.tables[n])
      .filter(Boolean)
      .filter(t => t.getColumnIndex(columnName) >= 0)
      .filter(t => types.size === 0 || types.has(t.columns[t.getColumnIndex(columnName)].type));
  }

  /**
   * Returns the sorted union of distinct values for `columnName` across all
   * matching tables (or a specific table if `tableName` is given).
   */
  async getAllValues(columnName: string, tableName?: string): Promise<unknown[]> {
    const tables = this._matchingTables(columnName, new Set(), tableName);
    if (tables.length === 0) return [];
    let result = await tables[0].getAllValues(columnName);
    for (let i = 1; i < tables.length; i++) {
      result = result.concat(await tables[i].getAllValues(columnName));
    }
    result = [...new Set(result)];
    const allNumbers = tables.every(t => t.getColumnType(columnName) === 'number');
    return allNumbers ? result.sort((a, b) => Number(a) - Number(b)) : result.sort();
  }

  /**
   * Returns `{ min_val, max_val, increment }` for a numeric column across all
   * matching tables (or a specific table if `tableName` is given).
   * Returns `null` if no matching numeric column is found.
   */
  async getNumericSpec(columnName: string, tableName?: string): Promise<{ min_val: number; max_val: number; increment: number } | null> {
    const tables = this._matchingTables(columnName, new Set(['number']), tableName);
    if (tables.length === 0) return null;
    const result = await tables[0].getNumericSpec(columnName);
    for (let i = 1; i < tables.length; i++) {
      const r = await tables[i].getNumericSpec(columnName);
      result.max_val = Math.max(result.max_val, r.max_val);
      result.min_val = Math.min(result.min_val, r.min_val);
      result.increment = Math.min(result.increment, r.increment);
    }
    return result;
  }

  /**
   * Returns column names of the given types across all tables,
   * or from a specific table if `tableName` is provided.
   * Pass an empty array to get all column names.
   */
  getColumnsOfTypes(typeList: ColumnType[], tableName?: string): string[] {
    if (tableName && this.tables[tableName]) return this.tables[tableName].getColumnsOfTypes(typeList);
    const result: string[] = [];
    Object.values(this.tables).forEach(t => {
      t.getColumnsOfTypes(typeList).forEach(c => { if (!result.includes(c)) result.push(c); });
    });
    return result;
  }

  /**
   * Returns the column types for `columnName` across all tables,
   * or from a specific table if `tableName` is provided.
   */
  getTypes(columnName: string, tableName?: string): ColumnType[] {
    if (tableName && this.tables[tableName]) {
      const t = this.tables[tableName].getColumnType(columnName);
      return t ? [t] : [];
    }
    const result: ColumnType[] = [];
    Object.values(this.tables).forEach(t => {
      const type = t.getColumnType(columnName);
      if (type && !result.includes(type)) result.push(type);
    });
    return result;
  }
}
