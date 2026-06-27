/**
 * Modal dialog that shows all available dashboards from configured repos
 * and the active IO backend (DevIO in dev mode, empty for LocalIO).
 *
 * On selection, calls onLoad with either a fetchUrl (for repo entries)
 * or an ioPath (for IO-layer entries), then closes.
 */

import { useEffect, useState } from 'react';
import type { LoadableEntry } from '../io/repoLoader';
import { listAllDashboards } from '../io/repoLoader';
import type { DashboardIO } from '../io/ioInterface';
import type { GalyleoDashboard } from '../../types/dashboard';

interface Props {
  io: DashboardIO;
  onLoad: (entry: LoadableEntry) => void;
  onLoadDirect: (spec: GalyleoDashboard) => void;
  onClose: () => void;
}

type Status = 'loading' | 'ready' | 'error';

export function LoadDialog({ io, onLoad, onLoadDirect, onClose }: Props) {
  const [entries, setEntries] = useState<LoadableEntry[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const ioEntries = await io.listDashboards();
        if (cancelled) return;
        const all = await listAllDashboards(ioEntries);
        if (cancelled) return;
        setEntries(all);
        setStatus('ready');
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(String(err));
          setStatus('error');
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [io]);

  // Group entries by source
  const grouped = entries.reduce<Record<string, LoadableEntry[]>>((acc, e) => {
    (acc[e.source] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={dialogStyle}>
        <div style={headerStyle}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Load Dashboard</span>
          <button style={closeBtnStyle} onClick={onClose} title="Close">✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {status === 'loading' && (
            <p style={hintStyle}>Loading dashboard list…</p>
          )}
          {status === 'error' && (
            <p style={{ ...hintStyle, color: '#c00' }}>Error: {errorMsg}</p>
          )}
          {status === 'ready' && entries.length === 0 && (
            <p style={hintStyle}>No dashboards found. Add repos to <code>galyleo.config.json</code>.</p>
          )}
          {status === 'ready' && Object.entries(grouped).map(([source, group]) => (
            <div key={source}>
              <div style={groupHeaderStyle}>{source}</div>
              {group.map((entry, i) => (
                <button
                  key={i}
                  style={entryStyle}
                  onClick={() => { onLoad(entry); onClose(); }}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #ddd', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button style={cancelBtnStyle} onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,.gd.json';
            input.onchange = () => {
              const file = input.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  onLoadDirect(JSON.parse(reader.result as string) as GalyleoDashboard);
                  onClose();
                } catch { alert(`${file.name} is not valid JSON`); }
              };
              reader.readAsText(file);
            };
            input.click();
          }}>
            Browse files…
          </button>
          <button style={cancelBtnStyle} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000,
};

const dialogStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 6,
  boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
  width: 420,
  maxHeight: '70vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '10px 14px',
  borderBottom: '1px solid #ddd',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 16, color: '#666', lineHeight: 1,
};

const groupHeaderStyle: React.CSSProperties = {
  padding: '6px 14px 2px',
  fontSize: 11,
  fontWeight: 700,
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const entryStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '7px 20px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
  color: '#222',
};

const hintStyle: React.CSSProperties = {
  padding: '16px 20px',
  color: '#666',
  fontSize: 13,
  margin: 0,
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '4px 14px',
  fontSize: 13,
  cursor: 'pointer',
  border: '1px solid #ccc',
  borderRadius: 4,
  background: '#f5f5f5',
};
