/**
 * Google Charts implementation of {@link ChartRendererProps}.
 *
 * Manages a single `google.visualization.ChartWrapper` per component instance.
 * The wrapper is created once and reused (with updated data/options) on subsequent
 * renders, avoiding full chart teardown on each filter change.
 *
 * **Select handling**: We listen for `select` on the ChartWrapper itself, which
 * re-fires the event from the underlying chart for all chart types including
 * GeoChart. This avoids the `ready`+`getChart()` timing issues that can arise
 * with SVG-based charts.
 *
 * **onSelect ref**: We keep an `onSelectRef` that is updated on every render so
 * the listener always calls the current callback, never a stale captured copy.
 */

import { useEffect, useRef } from 'react';
import type { ChartRendererProps } from './types';

export function GoogleChartsRenderer({ chartType, options, data, containerId, onSelect }: ChartRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapperRef = useRef<any>(null);
  // Cached chart object — getChart() returns null at select time for GeoChart,
  // so we capture it in the ready handler and use it in the select handler
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  // Always-current — avoids stale closure inside the select listener
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current || !window.google?.visualization) return;
    const viz = window.google.visualization!;

    const dt = new viz.DataTable({ cols: data.columns.map(c => ({ id: c.name, label: c.name, type: c.type })) });
    dt.addRows(data.rows as unknown[][]);

    const mergedOptions = { ...options, width: '100%', height: '100%' };

    if (!wrapperRef.current) {
      wrapperRef.current = new viz.ChartWrapper({ chartType, options: mergedOptions });
      wrapperRef.current.setContainerId(containerId);

      // Cache the chart object when ready — getChart() returns null at select time for GeoChart
      viz.events.addListener(wrapperRef.current, 'ready', () => {
        const chart = wrapperRef.current?.getChart();
        if (chart) chartRef.current = chart;
      });

      viz.events.addListener(wrapperRef.current, 'select', () => {
        const chart = chartRef.current;
        if (!chart) return;
        const sel = chart.getSelection();
        if (!sel || sel.length === 0 || sel[0].row == null) return;
        const currentDt = wrapperRef.current!.getDataTable();
        const value = currentDt.getValue(sel[0].row, 0);
        const colName = currentDt.getColumnLabel(0);
        onSelectRef.current?.(colName, value);
      });
    } else {
      (wrapperRef.current as unknown as { setOptions: (o: object) => void }).setOptions(mergedOptions);
    }

    wrapperRef.current.setDataTable(dt);
    wrapperRef.current.draw();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, options, chartType]);

  return <div id={containerId} ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
