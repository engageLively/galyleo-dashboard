/**
 * Dialog for creating or editing a filter widget.
 * Produces a GalyleoFilterSpec at a default canvas position.
 */

import { useState, useEffect } from 'react';
import type { GalyleoDashboard, GalyleoFilterSpec, FilterChoice } from '../../types/dashboard';
import { overlayStyle, dialogStyle, headerStyle, closeBtnStyle, fieldStyle, labelStyle, inputStyle, selectStyle, cancelBtnStyle, okBtnStyle, footerStyle } from './dialogStyles';

interface Props {
  spec: GalyleoDashboard;
  /** Existing filter name when editing; null when creating */
  editName?: string | null;
  onCommit: (name: string, filterSpec: GalyleoFilterSpec) => void;
  onClose: () => void;
}

type FilterType = 'Select' | 'Range' | 'Slider' | 'Boolean' | 'List';

const FILTER_TYPES: FilterType[] = ['Select', 'Range', 'Slider', 'Boolean', 'List'];

function getColumnChoices(spec: GalyleoDashboard, tableName: string, columnName: string): FilterChoice[] {
  const table = spec.tables[tableName];
  if (!table?.rows) return [];
  const colIdx = table.columns.findIndex(c => c.name === columnName);
  if (colIdx < 0) return [];
  const seen = new Set<unknown>();
  const values: unknown[] = [];
  for (const row of table.rows) {
    const v = row[colIdx];
    if (!seen.has(v)) { seen.add(v); values.push(v); }
  }
  values.sort((a, b) => String(a).localeCompare(String(b)));
  return values.map(v => ({ isListItem: true, string: String(v), value: v }));
}

export function FilterEditor({ spec, editName, onCommit, onClose }: Props) {
  const existing = editName ? spec.filters[editName] : null;
  const existingForm = existing?.savedForm as Record<string, unknown> | undefined;

  const [name, setName] = useState(editName ?? '');
  const [tableName, setTableName] = useState((existingForm?.tableName as string) ?? '');
  const [columnName, setColumnName] = useState((existingForm?.columnName as string) ?? '');
  const [filterType, setFilterType] = useState<FilterType>((existingForm?.filterType as FilterType) ?? 'Select');

  const tableNames = Object.keys(spec.tables);
  const columns = tableName ? spec.tables[tableName]?.columns ?? [] : [];

  useEffect(() => {
    if (tableName && columns.length > 0 && !columns.find(c => c.name === columnName)) {
      setColumnName(columns[0].name);
    }
  }, [tableName, columns, columnName]);

  const selectedColumn = columns.find(c => c.name === columnName);
  const isNumeric = selectedColumn?.type === 'number';
  const isBoolean = selectedColumn?.type === 'boolean';

  function buildSavedForm() {
    const choices = getColumnChoices(spec, tableName, columnName);
    const isString = selectedColumn?.type === 'string';

    if (filterType === 'Select') {
      return {
        filterType: 'Select' as const,
        columnName, tableName,
        isString,
        selection: choices[0]?.value ?? null,
        choices,
        part: null,
      };
    }
    if (filterType === 'List') {
      return {
        filterType: 'List' as const,
        columnName, tableName,
        isString,
        selection: [],
        choices,
        part: null,
      };
    }
    if (filterType === 'Range') {
      return {
        filterType: 'Range' as const,
        columnName, tableName,
        min_val: 0, max_val: 100,
        low_selection: 0, high_selection: 100,
        part: null,
      };
    }
    if (filterType === 'Slider') {
      return {
        filterType: 'Slider' as const,
        columnName, tableName,
        min_val: 0, max_val: 100,
        selection: 0,
        part: null,
      };
    }
    // Boolean
    return {
      filterType: 'Boolean' as const,
      columnName, tableName,
      selection: true,
      part: null,
    };
  }

  function handleOk() {
    const n = name.trim();
    if (!n) { alert('Filter name is required'); return; }
    if (!tableName) { alert('Select a table'); return; }
    if (!columnName) { alert('Select a column'); return; }
    if (!editName && spec.filters[n]) { alert(`Filter "${n}" already exists`); return; }

    const mp = existing?.morphicProperties ?? {
      position: { x: 20, y: 20 },
      extent: { x: 200, y: 36 },
      rotation: 0, scale: 1, opacity: 1,
      clipMode: 'visible' as const,
      fill: 'rgba(255,255,255,1)',
      border: { style: 'solid', width: 1, color: { all: 'rgba(200,200,200,1)' }, radius: 4 },
      origin: { x: 0, y: 0 },
    };

    onCommit(n, {
      savedForm: buildSavedForm(),
      morphIndex: existing?.morphIndex ?? 0,
      morphicProperties: mp,
    });
    onClose();
  }

  // Auto-suggest appropriate filter type based on column type
  useEffect(() => {
    if (isBoolean) setFilterType('Boolean');
    else if (isNumeric && filterType === 'Select') setFilterType('Range');
    else if (!isNumeric && !isBoolean && (filterType === 'Range' || filterType === 'Slider')) setFilterType('Select');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnName]);

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={dialogStyle}>
        <div style={headerStyle}>
          <span style={{ fontWeight: 600 }}>{editName ? 'Edit Filter' : 'Add Filter'}</span>
          <button style={closeBtnStyle} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)}
              placeholder="filter_name" readOnly={!!editName} />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Table</label>
            <select style={selectStyle} value={tableName} onChange={e => setTableName(e.target.value)}>
              <option value="">— select table —</option>
              {tableNames.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Column</label>
            <select style={selectStyle} value={columnName} onChange={e => setColumnName(e.target.value)}
              disabled={!tableName}>
              <option value="">— select column —</option>
              {columns.map(c => <option key={c.name} value={c.name}>{c.name} ({c.type})</option>)}
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Filter type</label>
            <select style={selectStyle} value={filterType}
              onChange={e => setFilterType(e.target.value as FilterType)}>
              {FILTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {columnName && tableName && (
            <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
              {getColumnChoices(spec, tableName, columnName).length > 0
                ? `${getColumnChoices(spec, tableName, columnName).length} distinct values found in table`
                : 'Remote/static table — choices populated at runtime'}
            </p>
          )}
        </div>

        <div style={footerStyle}>
          <button style={cancelBtnStyle} onClick={onClose}>Cancel</button>
          <button style={okBtnStyle} onClick={handleOk}>
            {editName ? 'Update' : 'Add Filter'}
          </button>
        </div>
      </div>
    </div>
  );
}
