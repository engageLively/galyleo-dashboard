/**
 * Dialog for adding a table — either a remote SDTP connector or an inline table
 * with a manually-defined schema.
 */

import { useState, useEffect } from 'react';
import type { GalyleoDashboard, GalyleoTableSpec, GalyleoColumn, ColumnType } from '../../types/dashboard';
import {
  overlayStyle, dialogStyle, headerStyle, closeBtnStyle,
  fieldStyle, labelStyle, inputStyle, selectStyle,
  cancelBtnStyle, okBtnStyle, footerStyle,
} from './dialogStyles';

interface Props {
  spec: GalyleoDashboard;
  editName?: string | null;
  /** Configured SDTP server URLs from /config — shown as a dropdown. */
  tableServers?: string[];
  onCommit: (name: string, tableSpec: GalyleoTableSpec) => void;
  onClose: () => void;
}

type TableKind = 'remote' | 'inline';
const COLUMN_TYPES: ColumnType[] = ['string', 'number', 'boolean', 'date', 'datetime', 'timeofday'];

export function TableEditor({ spec, editName, tableServers, onCommit, onClose }: Props) {
  const existing = editName ? spec.tables[editName] : null;
  const existingKind: TableKind = existing?.connector ? 'remote' : 'inline';

  const [name, setName] = useState(editName ?? '');
  const [kind, setKind] = useState<TableKind>(existing ? existingKind : 'remote');

  const [url, setUrl] = useState(existing?.connector?.url ?? tableServers?.[0] ?? '');
  const [remoteName, setRemoteName] = useState(existing?.connector?.remoteName ?? '');
  const [fetching, setFetching] = useState(false);

  // If tableServers arrives after mount (async config fetch), seed url from it
  useEffect(() => {
    if (!url && tableServers && tableServers.length > 0) setUrl(tableServers[0]);
  }, [tableServers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Table names from the currently selected server
  const [serverTableNames, setServerTableNames] = useState<string[]>([]);

  useEffect(() => {
    if (!url || kind !== 'remote') return;
    setServerTableNames([]);
    setRemoteName('');
    fetch(`${url}/get_table_names`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then((names: unknown) => {
        if (Array.isArray(names)) setServerTableNames(names as string[]);
      })
      .catch(() => { /* silently ignore — user can still type manually */ });
  }, [url, kind]);

  // Inline / shared schema
  const [columns, setColumns] = useState<GalyleoColumn[]>(
    existing?.columns?.length ? existing.columns : [{ name: '', type: 'string' }]
  );

  async function handleFetchSchema() {
    const baseUrl = url.replace(/\/$/, '');
    const rn = remoteName.trim() || name.trim();
    if (!baseUrl || !rn) { alert('Enter URL and table name first'); return; }
    setFetching(true);
    try {
      const res = await fetch(
        `${baseUrl}/get_table_schema?table_name=${encodeURIComponent(rn)}`,
        { credentials: 'include' },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { schema?: GalyleoColumn[]; columns?: GalyleoColumn[] };
      const fetched = data.schema ?? data.columns;
      if (Array.isArray(fetched) && fetched.length > 0) {
        setColumns(fetched);
      } else {
        alert('Schema response did not contain a column list');
      }
    } catch (err) {
      alert(`Schema fetch failed: ${err}`);
    } finally {
      setFetching(false);
    }
  }

  function addColumn() {
    setColumns(prev => [...prev, { name: '', type: 'string' }]);
  }

  function removeColumn(i: number) {
    setColumns(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateColumn(i: number, patch: Partial<GalyleoColumn>) {
    setColumns(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  }

  function handleOk() {
    const n = name.trim();
    if (!n) { alert('Table name is required'); return; }
    if (!editName && spec.tables[n]) { alert(`Table "${n}" already exists`); return; }

    const validCols = columns.filter(c => c.name.trim());
    if (validCols.length === 0) { alert('Add at least one column'); return; }

    if (kind === 'remote') {
      if (!url.trim()) { alert('Enter the server URL'); return; }
      onCommit(n, {
        columns: validCols,
        connector: {
          url: url.trim(),
          remoteName: remoteName.trim() || n,
        },
      });
    } else {
      onCommit(n, { columns: validCols, rows: [] });
    }
    onClose();
  }

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...dialogStyle, width: 480 }}>
        <div style={headerStyle}>
          <span style={{ fontWeight: 600 }}>{editName ? 'Edit Table' : 'Add Table'}</span>
          <button style={closeBtnStyle} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)}
              placeholder="table_name" readOnly={!!editName} />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Type</label>
            <select style={selectStyle} value={kind} onChange={e => setKind(e.target.value as TableKind)}>
              <option value="remote">Remote (SDTP server)</option>
              <option value="inline">Inline (static data)</option>
            </select>
          </div>

          {kind === 'remote' && (
            <>
              <div style={fieldStyle}>
                <label style={labelStyle}>Server URL</label>
                {tableServers && tableServers.length > 0 ? (
                  <select style={selectStyle} value={url} onChange={e => setUrl(e.target.value)}>
                    {tableServers.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <input style={inputStyle} value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://example.com/services/galyleo"
                  />
                )}
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Remote table name</label>
                <input
                  style={inputStyle}
                  value={remoteName}
                  onChange={e => setRemoteName(e.target.value)}
                  placeholder={name || 'same as name'}
                  list="sdtp-table-names"
                />
                <datalist id="sdtp-table-names">
                  {serverTableNames.map(n => <option key={n} value={n} />)}
                </datalist>
              </div>
              <button
                style={{ ...cancelBtnStyle, alignSelf: 'flex-start' }}
                onClick={handleFetchSchema}
                disabled={fetching}
              >
                {fetching ? 'Fetching…' : 'Fetch schema from server'}
              </button>
            </>
          )}

          <div style={fieldStyle}>
            <label style={labelStyle}>Columns</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {columns.map((col, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    style={{ ...inputStyle, flex: 2 }}
                    value={col.name}
                    onChange={e => updateColumn(i, { name: e.target.value })}
                    placeholder="column_name"
                  />
                  <select
                    style={{ ...selectStyle, flex: 1 }}
                    value={col.type}
                    onChange={e => updateColumn(i, { type: e.target.value as ColumnType })}
                  >
                    {COLUMN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button
                    style={{ ...closeBtnStyle, fontSize: 14, padding: '0 4px' }}
                    onClick={() => removeColumn(i)}
                    title="Remove column"
                  >✕</button>
                </div>
              ))}
              <button style={{ ...cancelBtnStyle, alignSelf: 'flex-start', marginTop: 2 }}
                onClick={addColumn}>
                + Add column
              </button>
            </div>
          </div>
        </div>

        <div style={footerStyle}>
          <button style={cancelBtnStyle} onClick={onClose}>Cancel</button>
          <button style={okBtnStyle} onClick={handleOk}>{editName ? 'Update' : 'Add Table'}</button>
        </div>
      </div>
    </div>
  );
}
