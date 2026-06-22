/**
 * Minimal first-step dialog for adding a new chart.
 * Collects name + data source, then the caller opens the Google Chart Editor.
 */

import { useState } from 'react';
import type { GalyleoDashboard } from '../../types/dashboard';
import {
  overlayStyle, dialogStyle, headerStyle, closeBtnStyle,
  fieldStyle, labelStyle, inputStyle, selectStyle,
  cancelBtnStyle, okBtnStyle, footerStyle,
} from './dialogStyles';

interface Props {
  spec: GalyleoDashboard;
  onPick: (name: string, viewOrTable: string) => void;
  onClose: () => void;
}

export function ChartSourcePicker({ spec, onPick, onClose }: Props) {
  const [name, setName] = useState('');
  const [viewOrTable, setViewOrTable] = useState('');

  const sources = [
    ...Object.keys(spec.views).map(n => ({ value: n, label: `${n} (view)` })),
    ...Object.keys(spec.tables).map(n => ({ value: n, label: `${n} (table)` })),
  ];

  function handleOk() {
    const n = name.trim();
    if (!n) { alert('Chart name is required'); return; }
    if (!viewOrTable) { alert('Select a data source'); return; }
    if (spec.charts[n]) { alert(`Chart "${n}" already exists`); return; }
    onPick(n, viewOrTable);
    onClose();
  }

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={dialogStyle}>
        <div style={headerStyle}>
          <span style={{ fontWeight: 600 }}>Add Chart</span>
          <button style={closeBtnStyle} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)}
              placeholder="chart_name" autoFocus />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Data source</label>
            <select style={selectStyle} value={viewOrTable} onChange={e => setViewOrTable(e.target.value)}>
              <option value="">— select view or table —</option>
              {sources.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {Object.keys(spec.views).length === 0 && (
              <p style={{ margin: 0, fontSize: 11, color: '#e08000' }}>
                No views defined — charts that use filters require a view.
              </p>
            )}
          </div>

          <p style={{ margin: 0, fontSize: 12, color: '#666' }}>
            The Google Chart Editor will open next to choose chart type and options.
          </p>
        </div>

        <div style={footerStyle}>
          <button style={cancelBtnStyle} onClick={onClose}>Cancel</button>
          <button style={okBtnStyle} onClick={handleOk}>Open Chart Editor →</button>
        </div>
      </div>
    </div>
  );
}
