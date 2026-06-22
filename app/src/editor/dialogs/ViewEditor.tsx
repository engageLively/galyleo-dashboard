/**
 * Dialog for creating or editing a view.
 *
 * Columns are managed in two panels:
 *   Left: unselected columns (click + to add)
 *   Right: selected columns in order (↑↓ to reorder, × to remove)
 *
 * The first column in the ordered list becomes the label column for charts.
 */

import { useState } from 'react';
import type { GalyleoDashboard, GalyleoViewSpec } from '../../types/dashboard';
import {
  overlayStyle, dialogStyle, headerStyle, closeBtnStyle,
  fieldStyle, labelStyle, inputStyle, selectStyle,
  cancelBtnStyle, okBtnStyle, footerStyle,
} from './dialogStyles';

interface Props {
  spec: GalyleoDashboard;
  editName?: string | null;
  onCommit: (name: string, viewSpec: GalyleoViewSpec) => void;
  onClose: () => void;
}

export function ViewEditor({ spec, editName, onCommit, onClose }: Props) {
  const existing = editName ? spec.views[editName] : null;

  const [name, setName] = useState(editName ?? '');
  const [tableName, setTableName] = useState(existing?.table ?? '');
  const [selectedCols, setSelectedCols] = useState<string[]>(existing?.columns ?? []);
  const [selectedFilters, setSelectedFilters] = useState<string[]>(existing?.filterNames ?? []);

  const tableNames = Object.keys(spec.tables);
  const allColumns = tableName ? (spec.tables[tableName]?.columns ?? []) : [];
  const availableCols = allColumns.filter(c => !selectedCols.includes(c.name));
  // Both filter widgets and charts can act as filters in a view
  const filterEntries: { name: string; kind: 'filter' | 'chart' }[] = [
    ...Object.keys(spec.filters).map(n => ({ name: n, kind: 'filter' as const })),
    ...Object.keys(spec.charts).map(n => ({ name: n, kind: 'chart' as const })),
  ];

  function handleTableChange(t: string) {
    setTableName(t);
    setSelectedCols([]);
  }

  function addCol(colName: string) {
    setSelectedCols(prev => [...prev, colName]);
  }

  function removeCol(colName: string) {
    setSelectedCols(prev => prev.filter(c => c !== colName));
  }

  function moveUp(i: number) {
    if (i === 0) return;
    setSelectedCols(prev => {
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  }

  function moveDown(i: number) {
    setSelectedCols(prev => {
      if (i >= prev.length - 1) return prev;
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  }

  function toggleFilter(f: string) {
    setSelectedFilters(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );
  }

  function handleOk() {
    const n = name.trim();
    if (!n) { alert('View name is required'); return; }
    if (!tableName) { alert('Select a table'); return; }
    if (selectedCols.length < 2) { alert('Select at least 2 columns (label + value)'); return; }
    if (!editName && spec.views[n]) { alert(`View "${n}" already exists`); return; }

    onCommit(n, { table: tableName, columns: selectedCols, filterNames: selectedFilters });
    onClose();
  }

  const colType = (colName: string) =>
    allColumns.find(c => c.name === colName)?.type ?? '';

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...dialogStyle, width: 520 }}>
        <div style={headerStyle}>
          <span style={{ fontWeight: 600 }}>{editName ? 'Edit View' : 'Add View'}</span>
          <button style={closeBtnStyle} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)}
              placeholder="view_name" readOnly={!!editName} />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Table</label>
            <select style={selectStyle} value={tableName} onChange={e => handleTableChange(e.target.value)}>
              <option value="">— select table —</option>
              {tableNames.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {tableName && (
            <div style={fieldStyle}>
              <label style={labelStyle}>Columns</label>
              <div style={{ display: 'flex', gap: 8 }}>

                {/* Available columns */}
                <div style={colPanelStyle}>
                  <div style={colPanelHeader}>Available</div>
                  {availableCols.length === 0
                    ? <p style={colEmptyStyle}>All columns selected</p>
                    : availableCols.map(c => (
                      <div key={c.name} style={colItemStyle}>
                        <span style={{ flex: 1, fontSize: 12 }}>
                          {c.name}
                          <span style={{ color: '#aaa', marginLeft: 4 }}>({c.type})</span>
                        </span>
                        <button style={colActionBtn} onClick={() => addCol(c.name)} title="Add">+</button>
                      </div>
                    ))
                  }
                </div>

                {/* Selected columns (ordered) */}
                <div style={colPanelStyle}>
                  <div style={colPanelHeader}>Selected (in order)</div>
                  {selectedCols.length === 0
                    ? <p style={colEmptyStyle}>None selected</p>
                    : selectedCols.map((colName, i) => (
                      <div key={colName} style={colItemStyle}>
                        <span style={{ flex: 1, fontSize: 12 }}>
                          {i === 0 && <span style={{ color: '#4A90D9', marginRight: 3 }}>①</span>}
                          {colName}
                          <span style={{ color: '#aaa', marginLeft: 4 }}>({colType(colName)})</span>
                        </span>
                        <div style={{ display: 'flex', gap: 1 }}>
                          <button style={colActionBtn} onClick={() => moveUp(i)} disabled={i === 0} title="Move up">↑</button>
                          <button style={colActionBtn} onClick={() => moveDown(i)} disabled={i === selectedCols.length - 1} title="Move down">↓</button>
                          <button style={{ ...colActionBtn, color: '#c00' }} onClick={() => removeCol(colName)} title="Remove">×</button>
                        </div>
                      </div>
                    ))
                  }
                </div>

              </div>
              {selectedCols.length > 0 && (
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#888' }}>
                  ① = label column (first column). Chart series are the remaining columns.
                </p>
              )}
            </div>
          )}

          {filterEntries.length > 0 && (
            <div style={fieldStyle}>
              <label style={labelStyle}>Filters &amp; chart drilldowns (optional)</label>
              <div style={{ border: '1px solid #ccc', borderRadius: 4, padding: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {filterEntries.map(({ name, kind }) => (
                  <label key={name} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedFilters.includes(name)}
                      onChange={() => toggleFilter(name)} />
                    {name}
                    <span style={{ fontSize: 11, color: kind === 'chart' ? '#4A90D9' : '#888', marginLeft: 2 }}>
                      {kind === 'chart' ? '(chart)' : '(filter)'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={footerStyle}>
          <button style={cancelBtnStyle} onClick={onClose}>Cancel</button>
          <button style={okBtnStyle} onClick={handleOk}>{editName ? 'Update' : 'Add View'}</button>
        </div>
      </div>
    </div>
  );
}

// ---- Sub-panel styles ----

const colPanelStyle: React.CSSProperties = {
  flex: 1, border: '1px solid #ccc', borderRadius: 4,
  minHeight: 100, maxHeight: 180, overflowY: 'auto',
  display: 'flex', flexDirection: 'column',
};

const colPanelHeader: React.CSSProperties = {
  padding: '3px 6px', fontSize: 11, fontWeight: 700,
  color: '#666', background: '#f5f5f5',
  borderBottom: '1px solid #e0e0e0', flexShrink: 0,
};

const colItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', padding: '2px 6px',
  borderBottom: '1px solid #f0f0f0', gap: 4,
};

const colActionBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: '1px 3px', fontSize: 12, color: '#555',
};

const colEmptyStyle: React.CSSProperties = {
  padding: 8, color: '#aaa', fontSize: 11, margin: 0,
};
