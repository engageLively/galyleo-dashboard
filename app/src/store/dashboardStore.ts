/**
 * Zustand store — single source of truth for the loaded dashboard.
 *
 * All components subscribe to slices of this store. The store owns:
 * - The parsed dashboard spec (`GalyleoDashboard`)
 * - The live `GalyleoDataManager` (tables + views)
 * - The current `filterValues` map (what every filter widget / chart has selected)
 * - Loading / error state
 * - The `googleChartsReady` flag set by `useGoogleCharts`
 */

import { create } from 'zustand';
import { GalyleoDataManager } from '../data/galyleo-data';
import type { FilterDictionary, FilterSpec } from '../data/galyleo-data';
import type {
  GalyleoDashboard,
  GalyleoFilterSpec,
  SelectFilterSavedForm,
  RangeFilterSavedForm,
  SliderFilterSavedForm,
  BooleanFilterSavedForm,
} from '../types/dashboard';

// ---- Initial filter value from savedForm ----

/**
 * Derives the initial `FilterSpec` from a filter widget's `savedForm`.
 * Returns `undefined` for filter types that don't have a meaningful initial value
 * (e.g. an empty list selection).
 */
function initialFilterValue(filterSpec: GalyleoFilterSpec): FilterSpec | undefined {
  const sf = filterSpec.savedForm as Record<string, unknown>;
  const filterType = sf.filterType as string;
  const columnName = sf.columnName as string;

  if (filterType === 'Select' || filterType === 'NumericSelect' || filterType === 'List') {
    const rsf = sf as unknown as SelectFilterSavedForm;
    const sel = rsf.selection;
    const values = Array.isArray(sel) ? sel : sel !== undefined ? [sel] : [];
    return { operator: 'IN_LIST', column: columnName, values };
  }
  if (filterType === 'Range' || filterType === 'DoubleSlider') {
    const rsf = sf as unknown as RangeFilterSavedForm;
    const min_val = rsf.min_val ?? rsf.minVal ?? 0;
    const max_val = rsf.max_val ?? rsf.maxVal ?? 1;
    return { operator: 'IN_RANGE', column: columnName, min_val, max_val };
  }
  if (filterType === 'Slider') {
    const ssf = sf as unknown as SliderFilterSavedForm;
    return { operator: 'IN_LIST', column: columnName, values: [ssf.selection ?? ssf.min_val] };
  }
  if (filterType === 'Boolean') {
    const bsf = sf as unknown as BooleanFilterSavedForm;
    return { operator: 'IN_LIST', column: columnName, values: [bsf.selection ?? true] };
  }
  return undefined;
}

// ---- Store ----

interface DashboardState {
  /** The parsed dashboard spec, or null before a dashboard is loaded. */
  spec: GalyleoDashboard | null;
  /** The live data manager holding all tables and views, or null before load. */
  dataManager: GalyleoDataManager | null;
  /**
   * Current filter values keyed by filter name or chart name.
   * Updated by filter widgets (via `setFilterValue`) and chart click handlers.
   */
  filterValues: FilterDictionary;
  /** True once the Google Charts API has fully initialized. */
  googleChartsReady: boolean;
  loading: boolean;
  error: string | null;

  /** Fetches a `.gd.json` file from `url` and loads it. */
  loadDashboardFromURL: (url: string) => Promise<void>;
  /** Builds the data manager and seeds initial filter values from `spec`. */
  loadDashboardFromSpec: (spec: GalyleoDashboard) => Promise<void>;
  /**
   * Sets or updates the filter value for `name`.
   * Triggers a re-render of all charts subscribed to `filterValues`.
   */
  setFilterValue: (name: string, value: FilterSpec) => void;
  /** Called by `useGoogleCharts` once `google.visualization` is available. */
  setGoogleChartsReady: () => void;
  /**
   * Applies a pure transformation to the current spec without rebuilding the
   * data manager. Use this for position, style, text, and image mutations.
   * For structural changes (add/remove tables or views), use loadDashboardFromSpec.
   */
  patchSpec: (updater: (spec: GalyleoDashboard) => GalyleoDashboard) => void;
}

export const useDashboardStore = create<DashboardState>()((set, get) => ({
  spec: null,
  dataManager: null,
  filterValues: {},
  googleChartsReady: false,
  loading: false,
  error: null,

  setGoogleChartsReady: () => set({ googleChartsReady: true }),

  patchSpec: (updater) =>
    set(state => state.spec ? { spec: updater(state.spec) } : {}),

  setFilterValue: (name, value) =>
    set(state => ({ filterValues: { ...state.filterValues, [name]: value } })),

  loadDashboardFromURL: async (url) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status} loading ${url}`);
      const spec: GalyleoDashboard = await res.json();
      await get().loadDashboardFromSpec(spec);
    } catch (err) {
      set({ loading: false, error: String(err) });
    }
  },

  loadDashboardFromSpec: async (spec) => {
    set({ loading: true, error: null, spec });

    const dataManager = new GalyleoDataManager();

    // Load tables sequentially (order matters for schema validation)
    for (const [name, tableSpec] of Object.entries(spec.tables ?? {})) {
      await dataManager.addTable(name, tableSpec);
    }

    // Add views
    for (const [name, viewSpec] of Object.entries(spec.views ?? {})) {
      dataManager.addView(name, viewSpec);
    }

    // Build initial filter values from savedForms
    const filterValues: FilterDictionary = {};
    for (const [name, filterSpec] of Object.entries(spec.filters ?? {})) {
      const val = initialFilterValue(filterSpec);
      if (val) filterValues[name] = val;
    }

    // Initialize chart-based filters (charts whose names appear in view
    // filterNames but have no savedForm). Without this, views that depend
    // only on a chart selection show unfiltered data on first load.
    for (const viewSpec of Object.values(spec.views ?? {})) {
      for (const filterName of viewSpec.filterNames) {
        if (filterName in filterValues) continue;
        if (!(filterName in spec.charts)) continue;
        const chartSpec = spec.charts[filterName];
        const view = dataManager.views[chartSpec.viewOrTable];
        if (!view) continue;
        const fullCols = view.fullColumns(dataManager.tables);
        if (!fullCols || fullCols.length === 0) continue;
        const rows = await view.getData(filterValues, dataManager.tables);
        if (!rows || rows.length === 0) continue;
        filterValues[filterName] = {
          operator: 'IN_LIST',
          column: fullCols[0].name,
          values: [rows[0][0]],
        };
      }
    }

    set({ dataManager, filterValues, loading: false });
  },
}));
