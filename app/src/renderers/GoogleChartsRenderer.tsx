// Google Charts implementation of ChartRendererProps.
// All Google-specific API usage is confined to this file.

import { useEffect, useRef } from 'react';
import type { ChartRendererProps } from './types';

export function GoogleChartsRenderer({ chartType, options, data, containerId, onSelect }: ChartRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapperRef = useRef<any>(null);
  // Track whether the select listener has been attached to the underlying chart
  const listenerAttached = useRef(false);

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
    } else {
      (wrapperRef.current as unknown as { setOptions: (o: object) => void }).setOptions(mergedOptions);
    }

    wrapperRef.current.setDataTable(dt);

    if (!listenerAttached.current) {
      listenerAttached.current = true;
      viz.events.addListener(wrapperRef.current, 'ready', () => {
        const chart = wrapperRef.current?.getChart();
        if (!chart || !onSelect) return;
        viz.events.addListener(chart, 'select', () => {
          const sel = chart.getSelection();
          if (!sel || sel.length === 0 || sel[0].row == null) return;
          const row = sel[0].row;
          const table = wrapperRef.current!.getDataTable();
          const value = table.getValue(row, 0);
          onSelect(data.columns[0]?.name ?? '', value);
        });
      });
    }

    wrapperRef.current.draw();
  });

  return <div id={containerId} ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
