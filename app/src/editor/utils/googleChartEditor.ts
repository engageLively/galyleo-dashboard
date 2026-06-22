/**
 * Opens the native google.visualization.ChartEditor modal for a chart.
 *
 * This is intentionally imperative rather than a React component — the Google
 * Chart Editor creates its own modal overlay outside the React tree.
 *
 * Requires the 'charteditor' package to be included in the google.charts.load()
 * call (done in useGoogleCharts.ts).
 */

import type { GalyleoChartSpec } from '../../types/dashboard';
import type { GalyleoDataManager, FilterDictionary } from '../../data/galyleo-data';
import { prepareChartData } from '../../utils/chartData';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GViz = any;

export async function openGoogleChartEditor(
  chartSpec: GalyleoChartSpec,
  dataManager: GalyleoDataManager,
  filterValues: FilterDictionary,
  onCommit: (chartType: string, options: Record<string, unknown>) => void,
): Promise<void> {
  const viz: GViz = (window as GViz).google?.visualization;
  if (!viz?.ChartEditor) {
    alert('Google Chart Editor is not ready yet — try again in a moment.');
    return;
  }

  const chartData = await prepareChartData(chartSpec.viewOrTable, filterValues, dataManager);
  if (!chartData) {
    alert(`No data found for "${chartSpec.viewOrTable}". Check that the view or table exists.`);
    return;
  }

  // Build a DataTable from the chart's current data
  const dt = new viz.DataTable({
    cols: chartData.columns.map((c: { name: string; type: string }) => ({
      id: c.name, label: c.name, type: c.type,
    })),
  });
  dt.addRows(chartData.rows as unknown[][]);

  // Wrap current chart state
  const wrapper = new viz.ChartWrapper({
    chartType: chartSpec.chartType,
    dataTable: dt,
    options: { ...chartSpec.options, width: 800, height: 500 },
  });

  const editor = new viz.ChartEditor();
  viz.events.addListener(editor, 'ok', () => {
    const result = editor.getResult();
    onCommit(
      result.getChartType() as string,
      (result.getOptions() ?? {}) as Record<string, unknown>,
    );
  });
  editor.openDialog(wrapper, {});
}
