// Google Charts implementation of ChartRendererProps.
// All Google-specific API usage is confined to this file.

import { useEffect, useRef } from 'react';
import type { ChartRendererProps } from './types';

export function GoogleChartsRenderer({ chartType, options, data, containerId, onSelect }: ChartRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapperRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attachedChartRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || !window.google?.visualization) return;
    const viz = window.google.visualization!;

    // Convert framework-agnostic ChartData to a Google DataTable
    const dt = new viz.DataTable({ cols: data.columns.map(c => ({ id: c.name, label: c.name, type: c.type })) });
    dt.addRows(data.rows as unknown[][]);

    const mergedOptions = { ...options, width: '100%', height: '100%' };

    if (!wrapperRef.current) {
      wrapperRef.current = new viz.ChartWrapper({ chartType, options: mergedOptions });
      wrapperRef.current.setContainerId(containerId);

      // 'ready' fires after every draw(). We attach the select listener to the
      // underlying chart there because getChart() returns null before 'ready'.
      // We track the chart instance so we don't accumulate listeners if the
      // chart is reused across redraws.
      if (onSelect) {
        viz.events.addListener(wrapperRef.current, 'ready', () => {
          const chart = wrapperRef.current?.getChart();
          if (!chart || chart === attachedChartRef.current) return;
          attachedChartRef.current = chart;
          viz.events.addListener(chart, 'select', () => {
            const sel = chart.getSelection();
            if (!sel || sel.length === 0 || sel[0].row == null) return;
            const currentDt = wrapperRef.current!.getDataTable();
            const value = currentDt.getValue(sel[0].row, 0);
            const colName = currentDt.getColumnLabel(0);
            onSelect(colName, value);
          });
        });
      }
    } else {
      (wrapperRef.current as unknown as { setOptions: (o: object) => void }).setOptions(mergedOptions);
    }

    wrapperRef.current.setDataTable(dt);
    wrapperRef.current.draw();
  });

  return <div id={containerId} ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
