import { useMemo } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { computeCanvasBounds, parseMorphicColor } from '../utils/morphicStyles';
import { ChartWidget } from './ChartWidget';
import { FilterWidget } from './filters/FilterWidget';
import { ImageWidget } from './ImageWidget';
import { TextWidget } from './TextWidget';
import type { MorphDescriptor, MorphicProperties } from '../types/dashboard';

export function DashboardViewer() {
  const spec = useDashboardStore(s => s.spec);
  const loading = useDashboardStore(s => s.loading);
  const error = useDashboardStore(s => s.error);

  const canvasSize = useMemo(() => {
    if (!spec) return { width: 0, height: 0 };
    const allProps: MorphicProperties[] = [
      ...Object.values(spec.charts).map(c => c.morphicProperties),
      ...Object.values(spec.filters).map(f => f.morphicProperties),
      ...(Array.isArray(spec.morphs)
        ? spec.morphs.map((m: MorphDescriptor) => m.morphicProperties)
        : Object.values(spec.morphs ?? {}).map((m: MorphDescriptor) => m.morphicProperties)),
    ];
    return computeCanvasBounds(allProps);
  }, [spec]);

  if (loading) return <div style={loadingStyle}>Loading dashboard…</div>;
  if (error) return <div style={errorStyle}>Error: {error}</div>;
  if (!spec) return null;

  const bgColor = parseMorphicColor(spec.fill ?? 'Color.white', '#ffffff');

  // Normalise morphs to an array regardless of whether stored as array or dict
  const morphArray: MorphDescriptor[] = Array.isArray(spec.morphs)
    ? spec.morphs
    : Object.values(spec.morphs ?? {});

  return (
    <div
      style={{
        position: 'relative',
        width: Math.max(canvasSize.width, window.innerWidth),
        height: Math.max(canvasSize.height, window.innerHeight),
        backgroundColor: bgColor,
        overflow: 'hidden',
      }}
    >
      {/* Static morphs (images, text) */}
      {morphArray.map((m, i) => {
        if (m.type === 'Image' || m.imageUrl) return <ImageWidget key={i} descriptor={m} />;
        if (m.type === 'Text') return <TextWidget key={i} descriptor={m} />;
        return null;
      })}

      {/* Filter widgets */}
      {Object.entries(spec.filters).map(([name, filterSpec]) => (
        <FilterWidget key={name} filterName={name} spec={filterSpec} />
      ))}

      {/* Charts */}
      {Object.entries(spec.charts).map(([name, chartSpec]) => (
        <ChartWidget key={name} chartName={name} spec={chartSpec} />
      ))}
    </div>
  );
}

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
  fontSize: 18,
  color: '#555',
};

const errorStyle: React.CSSProperties = {
  ...loadingStyle,
  color: '#c00',
};
