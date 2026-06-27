/**
 * Wrapper component for a single chart on the dashboard canvas.
 *
 * Responsibilities:
 * - Subscribes to `filterValues` in the store and re-fetches view data on change.
 * - Computes a dynamic title from the view's columns and active filter values,
 *   matching the pattern written by the Galyleo editor: `"col2 v col1 where F = v"`.
 * - Passes an `onSelect` callback to the renderer so that clicking a chart data
 *   point calls `setFilterValue(chartName, filter)`, making the chart itself act
 *   as a filter for other views (chart-as-filter pattern).
 */

import { useEffect, useState, useId, useCallback, useMemo } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { prepareChartData, getFirstColumn } from '../utils/chartData';
import { morphicToCSS } from '../utils/morphicStyles';
import { ACTIVE_RENDERER } from '../renderers/registry';
import type { ChartData } from '../renderers/types';
import type { GalyleoChartSpec, InListFilterValue } from '../types/dashboard';
import type { InListFilterSpec } from '../data/galyleo-data';

interface Props {
  /** The chart's key in `dashboard.charts` — also used as the filter key on selection. */
  chartName: string;
  spec: GalyleoChartSpec;
}

/** Renders a single chart widget, bound to its view and reactive to filter changes. */
export function ChartWidget({ chartName, spec }: Props) {
  const uid = useId();
  const containerId = `gc-${uid.replace(/:/g, '')}-${chartName.replace(/[^a-zA-Z0-9]/g, '_')}`;

  const [chartData, setChartData] = useState<ChartData | null>(null);

  const googleChartsReady = useDashboardStore(s => s.googleChartsReady);
  const dataManager = useDashboardStore(s => s.dataManager);
  const filterValues = useDashboardStore(s => s.filterValues);
  const setFilterValue = useDashboardStore(s => s.setFilterValue);

  // Re-fetch data whenever filters or dataManager change
  useEffect(() => {
    if (!googleChartsReady || !dataManager) return;
    let cancelled = false;
    prepareChartData(spec.viewOrTable, filterValues, dataManager).then(data => {
      if (!cancelled) setChartData(data);
    });
    return () => { cancelled = true; };
  }, [googleChartsReady, dataManager, filterValues, spec.viewOrTable]);

  /**
   * Called by the renderer when the user clicks a data point.
   * Stores an IN_LIST filter under `chartName` so other views can react.
   */
  const handleSelect = useCallback((column: string, value: unknown) => {
    const col = column || getFirstColumn(spec.viewOrTable, dataManager!) || '';
    const filter: InListFilterValue = { operator: 'IN_LIST', column: col, values: [value] };
    setFilterValue(chartName, filter);
  }, [chartName, spec.viewOrTable, dataManager, setFilterValue]);

  /**
   * Builds a dynamic title of the form `"col2 v col1 where F = v"` from the
   * view's column list and the currently active IN_LIST filter values.
   * Matches the title format written by the Galyleo dashboard editor.
   */
  const dynamicTitle = useMemo(() => {
    if (!dataManager) return undefined;
    const view = dataManager.views[spec.viewOrTable];
    if (!view) return undefined;
    const cols = view.columns;
    const dataPart = cols.length > 1
      ? cols.slice(1).reverse().join(', ') + ' v ' + cols[0]
      : cols[0];
    const filterParts: string[] = [];
    for (const filterName of view.filterNames) {
      const fv = filterValues[filterName];
      if (!fv || fv.operator !== 'IN_LIST') continue;
      const listFv = fv as InListFilterSpec;
      if (listFv.values.length > 0) {
        filterParts.push(`${listFv.column} = ${listFv.values[0]}`);
      }
    }
    return filterParts.length > 0 ? `${dataPart} where ${filterParts.join(', ')}` : dataPart;
  }, [dataManager, spec.viewOrTable, filterValues]);

  const outerStyle = morphicToCSS(spec.morphicProperties);
  const Renderer = ACTIVE_RENDERER;
  const resolvedOptions = useMemo(
    () => dynamicTitle != null ? { ...spec.options, title: dynamicTitle } : spec.options,
    [spec.options, dynamicTitle],
  );

  return (
    <div style={outerStyle}>
      {chartData && (
        <Renderer
          chartType={spec.chartType}
          options={resolvedOptions}
          data={chartData}
          containerId={containerId}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}
