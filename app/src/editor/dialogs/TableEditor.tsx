import { useState, useEffect } from 'react';
import type { GalyleoDashboard, GalyleoTableSpec, GalyleoColumn } from '../../types/dashboard';
import {
  overlayStyle, dialogStyle, headerStyle, closeBtnStyle,
  fieldStyle, labelStyle, inputStyle, selectStyle,
  cancelBtnStyle, okBtnStyle, footerStyle,
} from './dialogStyles';

interface Props {
  spec: GalyleoDashboard;
  editName?: string | null;
  tableServers?: string[];
  onCommit: (name: string, tableSpec: GalyleoTableSpec) => void;
  onClose: () => void;
}

export function TableEditor({ spec, editName, tableServers, onCommit, onClose }: Props) {
  const existing = editName ? spec.tables[editName] : null;

  const [url, setUrl] = useState(existing?.connector?.url ?? tableServers?.[0] ?? '');
  const [remoteName, setRemoteName] = useState(existing?.connector?.remoteName ?? '');
  const [name, setName] = useState(editName ?? '');
  const [serverTableNames, setServerTableNames] = useState<string[]>([]);
  const [columns, setColumns] = useState<GalyleoColumn[]>(existing?.columns ?? []);
  const [fetching, setFetching] = useState(false);

  // If tableServers arrives after mount (async config fetch), seed url
  useEffect(() => {
    if (!url && tableServers && tableServers.length > 0) setUrl(tableServers[0]);
  }, [tableServers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch table names when server URL changes
  useEffect(() => {
    if (!url) return;
    setServerTableNames([]);
    setRemoteName('');
    setColumns([]);
    fetch(`${url}/get_table_names`)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then((names: unknown) => {
        if (Array.isArray(names)) setServerTableNames(names as string[]);
      })
      .catch(err => console.warn('get_table_names failed:', err));
  }, [url]);

  // Auto-populate local name from remote table name
  useEffect(() => {
    if (!editName && remoteName) setName(remoteName);
  }, [remoteName]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFetchSchema() {
    const rn = remoteName.trim();
    if (!url || !rn) { alert('Select a table first'); return; }
    setFetching(true);
    try {
      const res = await fetch(`${url.replace(/\/$/, '')}/get_table_schema?table_name=${encodeURIComponent(rn)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as unknown;
      const fetched = Array.isArray(data) ? data
        : (data as { schema?: GalyleoColumn[]; columns?: GalyleoColumn[] }).schema
          ?? (data as { schema?: GalyleoColumn[]; columns?: GalyleoColumn[] }).columns;
      if (Array.isArray(fetched) && fetched.length > 0) {
        setColumns(fetched as GalyleoColumn[]);
      } else {
        alert('Schema response did not contain a column list');
      }
    } catch (err) {
      alert(`Schema fetch failed: ${err}`);
    } finally {
      setFetching(false);
    }
  }

  function handleOk() {
    const n = name.trim();
    if (!n) { alert('Table name is required'); return; }
    if (!editName && spec.tables[n]) { alert(`Table "${n}" already exists`); return; }
    if (!url.trim()) { alert('Select a server'); return; }
    if (!remoteName.trim()) { alert('Select a remote table'); return; }
    if (columns.length === 0) { alert('Fetch the schema first'); return; }
    onCommit(n, {
      columns,
      connector: { url: url.trim(), remoteName: remoteName.trim() },
    });
    onClose();
  }

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...dialogStyle, width: 440 }}>
        <div style={headerStyle}>
          <span style={{ fontWeight: 600 }}>{editName ? 'Edit Table' : 'Add Table'}</span>
          <button style={closeBtnStyle} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>

          <div style={fieldStyle}>
            <label style={labelStyle}>Server URL</label>
            {tableServers && tableServers.length > 0 ? (
              <select style={selectStyle} value={url} onChange={e => setUrl(e.target.value)}>
                {tableServers.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input style={inputStyle} value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com/services/galyleo" />
            )}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Remote table</label>
            {serverTableNames.length > 0 ? (
              <select style={selectStyle} value={remoteName} onChange={e => setRemoteName(e.target.value)}>
                <option value="">— select a table —</option>
                {serverTableNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            ) : (
              <input style={inputStyle} value={remoteName} onChange={e => setRemoteName(e.target.value)}
                placeholder="table_name" />
            )}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Local name</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)}
              placeholder="table_name" readOnly={!!editName} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button style={{ ...cancelBtnStyle, alignSelf: 'flex-start' }}
              onClick={handleFetchSchema} disabled={fetching || !remoteName}>
              {fetching ? 'Fetching…' : 'Fetch schema'}
            </button>
            {columns.length > 0 && (
              <span style={{ fontSize: 12, color: '#666' }}>
                {columns.length} column{columns.length !== 1 ? 's' : ''}: {columns.map(c => c.name).join(', ')}
              </span>
            )}
          </div>

        </div>

        <div style={footerStyle}>
          <button style={cancelBtnStyle} onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,.sdml';
            input.onchange = () => {
              const file = input.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  const sdml = JSON.parse(reader.result as string) as Record<string, unknown>;
                  const tableName = (sdml.name as string | undefined) ?? file.name.replace(/\.[^.]+$/, '');
                  if (!Array.isArray(sdml.columns) || sdml.columns.length === 0) {
                    alert(`${file.name}: no columns found`); return;
                  }
                  if (!editName && spec.tables[tableName]) {
                    alert(`Table "${tableName}" already exists`); return;
                  }
                  onCommit(tableName, {
                    columns: sdml.columns as import('../../types/dashboard').GalyleoColumn[],
                    rows: Array.isArray(sdml.rows) ? sdml.rows as unknown[][] : undefined,
                  });
                  onClose();
                } catch { alert(`${file.name} is not valid JSON`); }
              };
              reader.readAsText(file);
            };
            input.click();
          }}>
            Load from file…
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={cancelBtnStyle} onClick={onClose}>Cancel</button>
            <button style={okBtnStyle} onClick={handleOk}>{editName ? 'Update' : 'Add Table'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
