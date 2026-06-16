// Port of galyleo-data.js to TypeScript.
// Replaces lively.resources with native fetch(); removes all lively.next dependencies.

import type { GalyleoColumn, ColumnType, GalyleoTableSpec, GalyleoViewSpec } from '../types/dashboard';

function createBadDashboardError(msg: string): never {
  throw new Error(msg);
}

// ---- Filter specs ----

export interface InListFilterSpec {
  operator: 'IN_LIST';
  column: string;
  values: unknown[];
}

export interface InRangeFilterSpec {
  operator: 'IN_RANGE';
  column: string;
  max_val: number;
  min_val: number;
}

export interface BooleanFilterSpec {
  operator: 'ALL' | 'ANY' | 'NONE';
  arguments: FilterSpec[];
}

export type FilterSpec = InListFilterSpec | InRangeFilterSpec | BooleanFilterSpec;

export type FilterDictionary = Record<string, FilterSpec | undefined>;

// ---- Filter classes ----

abstract class Filter {
  constructor(public table: GalyleoTable) {}

  abstract _getRows_(rows: unknown[][]): number[];

  getRows(rows: unknown[][]): unknown[][] {
    return this._getRows_(rows).map(i => rows[i]);
  }

  equals(other: Filter): boolean {
    return this.table === other.table;
  }
}

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

class AnyFilter extends BooleanFilter {
  _getRows_(rows: unknown[][]): number[] {
    const result = new Set<number>();
    for (const f of this.args) f._getRows_(rows).forEach(i => result.add(i));
    return [...result].sort((a, b) => a - b);
  }
  equals(other: Filter): boolean { return other instanceof AnyFilter && super.equals(other); }
}

class NoneFilter extends BooleanFilter {
  _getRows_(rows: unknown[][]): number[] {
    const inverse = new Set(this.args[0]._getRows_(rows));
    return Array.from({ length: rows.length }, (_, i) => i).filter(i => !inverse.has(i));
  }
  equals(other: Filter): boolean { return other instanceof NoneFilter && super.equals(other); }
}

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

export function convertSDMLRow(values: unknown[], columns: GalyleoColumn[]): unknown[] {
  return values.map((v, i) => convertSDMLValue(v, columns[i].type));
}

// ---- URLFetcher (replaces lively.resources resource()) ----

class URLFetcher {
  headers: Record<string, string> = {};
  body: unknown = null;

  constructor(public url: string, public tableName: string) {}

  addHeader(key: string, value: string): void { this.headers[key] = value; }

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

  async readJson(): Promise<unknown> {
    const res = await fetch(this.url, { method: 'GET', mode: 'cors', headers: this.headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}

// ---- GalyleoTable (abstract) ----

export abstract class GalyleoTable {
  updateListeners = new Set<{ tableUpdated: (t: GalyleoTable) => void }>();

  constructor(public columns: GalyleoColumn[], public tableName: string) {}

  get columnNames(): string[] { return this.columns.map(c => c.name); }

  getColumnIndex(name: string): number { return this.columns.findIndex(c => c.name === name); }

  getColumnType(name: string): ColumnType | null {
    const i = this.getColumnIndex(name);
    return i < 0 ? null : this.columns[i].type;
  }

  getColumnsOfTypes(typeList: ColumnType[]): string[] {
    return this.columns
      .filter(c => typeList.length === 0 || typeList.includes(c.type))
      .map(c => c.name);
  }

  registerUpdateListener(l: { tableUpdated: (t: GalyleoTable) => void }): void {
    this.updateListeners.add(l);
  }
  deregisterUpdateListener(l: { tableUpdated: (t: GalyleoTable) => void }): void {
    this.updateListeners.delete(l);
  }
  dataUpdated(): void {
    this.updateListeners.forEach(l => l.tableUpdated(this));
  }

  abstract getRows(): Promise<unknown[][]>;
  abstract getFilteredRows(filterSpec?: FilterSpec | null): Promise<unknown[][]>;

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

export class GalyleoView {
  tableName: string;
  columns: string[];
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

  fullColumns(tableDictionary: Record<string, GalyleoTable>): GalyleoColumn[] | undefined {
    const table = tableDictionary[this.tableName];
    if (!table) return undefined;
    return this._getColumnIndexes(table).map(i => table.columns[i]);
  }

  private _getFilter(filterSpecs: FilterDictionary, table: GalyleoTable): FilterSpec | null {
    const specs = this.filterNames
      .map(n => filterSpecs[n])
      .filter((s): s is FilterSpec => checkSpecValid(table, s ?? null));
    if (specs.length === 0) return null;
    if (specs.length === 1) return specs[0];
    return { operator: 'ALL', arguments: specs };
  }

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

export class GalyleoDataManager {
  tables: Record<string, GalyleoTable> = {};
  views: Record<string, GalyleoView> = {};

  constructor(public updateListener: { tableUpdated: (t: GalyleoTable) => void } | null = null) {}

  clear(): void { this.tables = {}; this.views = {}; }

  get tableNames(): string[] { return Object.keys(this.tables); }
  get viewNames(): string[] { return Object.keys(this.views); }

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

  addView(name: string, spec: GalyleoViewSpec): void {
    this.views[name] = new GalyleoView(spec);
  }

  removeTable(name: string): void {
    if (name in this.tables) {
      delete this.tables[name];
      Object.keys(this.views).forEach(v => {
        if (this.views[v].tableName === name) this.removeView(v);
      });
    }
  }

  removeView(name: string): void { delete this.views[name]; }

  private _matchingTables(columnName: string, types: Set<ColumnType>, tableName?: string): GalyleoTable[] {
    const names = tableName ? [tableName] : Object.keys(this.tables);
    return names
      .map(n => this.tables[n])
      .filter(Boolean)
      .filter(t => t.getColumnIndex(columnName) >= 0)
      .filter(t => types.size === 0 || types.has(t.columns[t.getColumnIndex(columnName)].type));
  }

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

  getColumnsOfTypes(typeList: ColumnType[], tableName?: string): string[] {
    if (tableName && this.tables[tableName]) return this.tables[tableName].getColumnsOfTypes(typeList);
    const result: string[] = [];
    Object.values(this.tables).forEach(t => {
      t.getColumnsOfTypes(typeList).forEach(c => { if (!result.includes(c)) result.push(c); });
    });
    return result;
  }

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
