import { useEffect, useState, useId, useCallback } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { prepareChartData, getFirstColumn } from '../utils/chartData';
import { morphicToCSS } from '../utils/morphicStyles';
import { ACTIVE_RENDERER } from '../renderers/registry';
import type { ChartData } from '../renderers/types';
import type { GalyleoChartSpec, InListFilterValue } from '../types/dashboard';

interface Props {
  chartName: string;
  spec: GalyleoChartSpec;
}

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

  const handleSelect = useCallback((column: string, value: unknown) => {
    const col = column || getFirstColumn(spec.viewOrTable, dataManager!) || '';
    const filter: InListFilterValue = { operator: 'IN_LIST', column: col, values: [value] };
    setFilterValue(chartName, filter);
  }, [chartName, spec.viewOrTable, dataManager, setFilterValue]);

  const outerStyle = morphicToCSS(spec.morphicProperties);
  const Renderer = ACTIVE_RENDERER;

  return (
    <div style={outerStyle}>
      {chartData && (
        <Renderer
          chartType={spec.chartType}
          options={spec.options}
          data={chartData}
          containerId={containerId}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}
