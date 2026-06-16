// Renderer abstraction — any charting library implements this interface.
// To swap Google Charts for ECharts, Vega-Lite, Recharts, etc.:
//   1. Create a new renderer component implementing ChartRendererProps
//   2. Point ACTIVE_RENDERER in registry.ts at the new component

import type { ChartOptions } from '../types/dashboard';

export interface ChartColumn {
  name: string;
  type: string;
}

export interface ChartData {
  columns: ChartColumn[];
  rows: unknown[][];
}

export interface ChartRendererProps {
  chartType: string;
  options: ChartOptions;
  data: ChartData;
  containerId: string;
  onSelect?: (column: string, value: unknown) => void;
}
