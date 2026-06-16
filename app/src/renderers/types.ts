/**
 * Renderer abstraction — any charting library implements this interface.
 *
 * To swap Google Charts for ECharts, Vega-Lite, Recharts, etc.:
 * 1. Create a new renderer component implementing `ChartRendererProps`.
 * 2. Point `ACTIVE_RENDERER` in `registry.ts` at the new component.
 * 3. Replace `useGoogleCharts` in `App.tsx` with whatever loader your library needs.
 */

import type { ChartOptions } from '../types/dashboard';

/** A single column descriptor in a framework-agnostic chart dataset. */
export interface ChartColumn {
  name: string;
  type: string;
}

/** Framework-agnostic chart data: column schema + row matrix. */
export interface ChartData {
  columns: ChartColumn[];
  rows: unknown[][];
}

/**
 * Props that every chart renderer component must accept.
 *
 * The renderer is responsible for:
 * - Drawing the chart inside the DOM element identified by `containerId`.
 * - Calling `onSelect(column, value)` when the user clicks a data point,
 *   so the clicked value can be used as a filter for other charts/views.
 */
export interface ChartRendererProps {
  /** Library-specific chart type string (e.g. `'BarChart'`, `'GeoChart'`). */
  chartType: string;
  /** Library-specific options object (titles, colours, axes, etc.). */
  options: ChartOptions;
  /** The data to render. */
  data: ChartData;
  /** ID of the DOM element the renderer should draw into. */
  containerId: string;
  /**
   * Called when the user selects a data point.
   * @param column - The name of the selected column (usually the first / domain column).
   * @param value - The value of that column in the selected row.
   */
  onSelect?: (column: string, value: unknown) => void;
}
