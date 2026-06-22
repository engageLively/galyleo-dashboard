/**
 * Dialog for creating a new chart widget.
 */

import { useState } from 'react';
import type { GalyleoDashboard, GalyleoChartSpec } from '../../types/dashboard';
import {
  overlayStyle, dialogStyle, headerStyle, closeBtnStyle,
  fieldStyle, labelStyle, inputStyle, selectStyle,
  cancelBtnStyle, okBtnStyle, footerStyle,
} from './dialogStyles';

interface Props {
  spec: GalyleoDashboard;
  editName?: string | null;
  onCommit: (name: string, chartSpec: GalyleoChartSpec) => void;
  onClose: () => void;
}

const CHART_TYPES = [
  'BarChart', 'ColumnChart', 'LineChart', 'AreaChart',
  'PieChart', 'DonutChart', 'ScatterChart', 'BubbleChart',
  'GeoChart', 'Table',
];

export function ChartCreator({ spec, editName, onCommit, onClose }: Props) {
  const existing = editName ? spec.charts[editName] : null;
  const [name, setName] = useState(editName ?? '');
  const [viewOrTable, setViewOrTable] = useState(existing?.viewOrTable ?? '');
  const [chartType, setChartType] = useState(existing?.chartType ?? 'BarChart');

  const viewNames = Object.keys(spec.views);
  const tableNames = Object.keys(spec.tables);
  const sources = [
    ...viewNames.map(n => ({ value: n, label: `${n} (view)` })),
    ...tableNames.map(n => ({ value: n, label: `${n} (table)` })),
  ];

  function handleOk() {
    const n = name.trim();
    if (!n) { alert('Chart name is required'); return; }
    if (!viewOrTable) { alert('Select a view or table'); return; }
    if (!editName && spec.charts[n]) { alert(`Chart "${n}" already exists`); return; }

    onCommit(n, {
      chartType,
      viewOrTable,
      morphIndex: 0,
      options: { legend: { position: 'bottom' } },
      morphicProperties: {
        position: { x: 40, y: 100 },
        extent: { x: 400, y: 300 },
        rotation: 0, scale: 1, opacity: 1,
        clipMode: 'visible',
        fill: 'rgba(255,255,255,0)',
        border: { style: 'solid', width: 0, color: {}, radius: 0 },
        origin: { x: 0, y: 0 },
      },
    });
    onClose();
  }

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={dialogStyle}>
        <div style={headerStyle}>
          <span style={{ fontWeight: 600 }}>{editName ? 'Edit Chart' : 'Add Chart'}</span>
          <button style={closeBtnStyle} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)}
              placeholder="chart_name" readOnly={!!editName} />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Data source (view or table)</label>
            <select style={selectStyle} value={viewOrTable} onChange={e => setViewOrTable(e.target.value)}>
              <option value="">— select source —</option>
              {sources.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {viewNames.length === 0 && (
              <p style={{ margin: 0, fontSize: 11, color: '#e08000' }}>
                No views defined — charts that use filters require a view.
              </p>
            )}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Chart type</label>
            <select style={selectStyle} value={chartType} onChange={e => setChartType(e.target.value)}>
              {CHART_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div style={footerStyle}>
          <button style={cancelBtnStyle} onClick={onClose}>Cancel</button>
          <button style={okBtnStyle} onClick={handleOk}>{editName ? 'Update' : 'Add Chart'}</button>
        </div>
      </div>
    </div>
  );
}
