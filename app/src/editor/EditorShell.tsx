/**
 * Top-level layout for the dashboard editor.
 * TopBar (fixed top) + EditableCanvas (center) + DataPanel sidebar (right).
 */

import { useEffect, useState } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { useEditorStore } from '../store/editorStore';
import { EditableCanvas } from './canvas/EditableCanvas';
import { deleteWidget } from './utils/specMutations';
import { LoadDialog } from './dialogs/LoadDialog';
import { DataPanel } from './sidebar/DataPanel';
import { ShapeConfigurer } from './sidebar/ShapeConfigurer';
import type { LoadableEntry } from './io/repoLoader';
import type { ActiveTool } from './types';
import type { GalyleoDashboard } from '../types/dashboard';
import { fetchGalyleoConfig } from './io/configCache';

const BLANK_SPEC: GalyleoDashboard = {
  fill: 'Color.white',
  tables: {}, views: {}, charts: {}, filters: {}, morphs: {}, numMorphs: 0,
};

export default function EditorShell() {
  const spec = useDashboardStore(s => s.spec);
  const loading = useDashboardStore(s => s.loading);
  const patchSpec = useDashboardStore(s => s.patchSpec);
  const loadDashboardFromSpec = useDashboardStore(s => s.loadDashboardFromSpec);

  const mode = useEditorStore(s => s.mode);
  const setMode = useEditorStore(s => s.setMode);
  const sidebarOpen = useEditorStore(s => s.sidebarOpen);
  const toggleSidebar = useEditorStore(s => s.toggleSidebar);
  const undo = useEditorStore(s => s.undo);
  const redo = useEditorStore(s => s.redo);
  const undoStack = useEditorStore(s => s.undoStack);
  const redoStack = useEditorStore(s => s.redoStack);
  const io = useEditorStore(s => s.io);
  const selectedId = useEditorStore(s => s.selectedId);
  const selectedKind = useEditorStore(s => s.selectedKind);
  const selectWidget = useEditorStore(s => s.selectWidget);
  const pushUndo = useEditorStore(s => s.pushUndo);
  const activeTool = useEditorStore(s => s.activeTool);
  const setActiveTool = useEditorStore(s => s.setActiveTool);

  const [showLoadDialog, setShowLoadDialog] = useState(false);
  // 'auto' = follow selection; 'data' / 'properties' = user explicitly chose
  const [sidebarPanel, setSidebarPanel] = useState<'data' | 'properties' | 'auto'>('auto');

  // Auto-switch to Properties when something is selected in edit mode.
  // Never auto-switch back — user stays on Properties (showing "nothing selected" placeholder)
  // until they explicitly click the Data tab.
  useEffect(() => {
    if (selectedId && mode === 'edit') setSidebarPanel('properties');
  }, [selectedId, mode]);

  // Derived: which panel to actually show
  const displayPanel: 'data' | 'properties' = sidebarPanel === 'auto' ? 'data' : sidebarPanel;

  // Auto-load a blank dashboard on first mount if nothing is loaded.
  // Skip in Jupyter iframe mode — the extension will push content via galyleo:loadContent.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('instanceId')) return;
    if (!useDashboardStore.getState().spec) {
      loadDashboardFromSpec(BLANK_SPEC);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Jupyter iframe bridge: announce readiness and receive content from the extension.
  // io is read via getState() inside the handler to avoid stale-closure issues.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const instanceId = params.get('instanceId');
    if (!instanceId) return;

    function handleMessage(evt: MessageEvent) {
      // Extension protocol: instanceId is at root, content is inside payload.
      // Message shape: { type, instanceId, payload: { content? } }
      const { type, instanceId: msgId, payload } = (evt.data ?? {}) as {
        type?: string;
        instanceId?: string;
        payload?: { content?: GalyleoDashboard };
      };
      if (msgId !== instanceId) return;

      if (type === 'galyleo:loadContent') {
        const content = payload?.content;
        // Suppress echoes of our own saves to prevent the
        // contentChanged → autosave → loadContent → reload → contentChanged loop.
        const currentIo = useEditorStore.getState().io;
        if (currentIo.isOwnEcho?.(content)) return;
        // New files arrive as {} — treat as a blank dashboard rather than
        // passing an empty object that would leave required spec fields undefined.
        const spec = content && Object.keys(content).length > 0 ? content : BLANK_SPEC;
        loadDashboardFromSpec(spec);
      }
    }

    window.addEventListener('message', handleMessage);
    // Extension protocol: instanceId at root, not inside payload.
    window.parent.postMessage(
      { type: 'galyleo:ready', instanceId },
      '*',
    );

    return () => window.removeEventListener('message', handleMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Escape') {
        if (activeTool !== 'select') { setActiveTool('select'); return; }
        selectWidget(null, null);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && selectedKind && mode === 'edit') {
        e.preventDefault();
        pushUndo();
        patchSpec(spec => deleteWidget(spec, selectedId, selectedKind));
        selectWidget(null, null);
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
        if (e.key === 's') { e.preventDefault(); handleSave(); }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectedKind, mode, activeTool, undo, redo, patchSpec, selectWidget, pushUndo, setActiveTool]);

  // ---- File I/O ----
  async function handleLoadEntry(entry: LoadableEntry) {
    try {
      let loaded;
      if (entry.ioPath) {
        loaded = await io.load(entry.ioPath);
      } else if (entry.fetchUrl) {
        const res = await fetch(entry.fetchUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        loaded = await res.json();
      } else {
        loaded = await io.load();
      }
      await loadDashboardFromSpec(loaded);
      const path = io.currentPath();
      document.title = path ? path.replace(/\.gd\.json$/, '') : entry.label;
    } catch (err) {
      alert(`Load failed: ${err}`);
    }
  }

  function handleNew() {
    if (spec && Object.keys(spec.charts).length + Object.keys(spec.filters).length > 0) {
      if (!confirm('Discard current dashboard and start a new one?')) return;
    }
    loadDashboardFromSpec({ ...BLANK_SPEC });
    document.title = 'New Dashboard';
  }

  async function handleSave() {
    const s = useDashboardStore.getState().spec;
    if (!s) return;
    try {
      await io.save(s);
    } catch {
      const name = prompt('Save as (filename):');
      if (!name) return;
      try { await io.saveAs(s, name); } catch (err) { alert(`Save failed: ${err}`); }
    }
  }

  async function handlePublish() {
    const s = useDashboardStore.getState().spec;
    if (!s) return;

    const params = new URLSearchParams(window.location.search);
    const galyleoServer = params.get('galyleo_server');

    if (galyleoServer) {
      // Running in Jupyter: publish to the configured publish server
      const config = await fetchGalyleoConfig(galyleoServer).catch(() => null);
      const publishServer = config?.publishServer ?? galyleoServer;
      const defaultName = io.currentPath()?.replace(/\.gd\.json$/, '') ?? 'dashboard';
      const name = prompt('Dashboard name:', defaultName);
      if (!name) return;
      try {
        const res = await fetch(`${publishServer}/publish`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, dashboard: s }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json().catch(() => ({})) as { object_key?: string };
        const objectKey = result.object_key ?? '';
        if (objectKey) {
          const viewUrl = `${publishServer}/static/published/index.html?dashboard=${encodeURIComponent(`${publishServer}/${objectKey}`)}`;
          if (confirm(`Published!\n${viewUrl}\n\nOpen in new tab?`)) {
            window.open(viewUrl, '_blank');
          }
        } else {
          alert('Published successfully.');
        }
      } catch (err) {
        alert(`Publish failed: ${err}`);
      }
      return;
    }

    // Fallback: config-based publish server
    let publishServer = '';
    try {
      const cfg = await fetch('/galyleo.config.json').then(r => r.json()) as { publishServer?: string };
      publishServer = cfg.publishServer ?? '';
    } catch { /* ignore */ }
    if (!publishServer) {
      alert('Set "publishServer" in public/galyleo.config.json or run in Jupyter to enable publishing.');
      return;
    }
    try {
      const res = await fetch(`${publishServer}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json().catch(() => ({})) as { viewUrl?: string };
      if (result.viewUrl) {
        if (confirm(`Published!\n${result.viewUrl}\n\nOpen in new tab?`)) {
          window.open(result.viewUrl, '_blank');
        }
      } else {
        alert('Published successfully.');
      }
    } catch (err) {
      alert(`Publish failed: ${err}`);
    }
  }

  // ---- Drawing tool buttons ----
  const tools: { id: ActiveTool; label: string; title: string }[] = [
    { id: 'rectangle', label: '□', title: 'Rectangle (click canvas to place)' },
    { id: 'ellipse',   label: '○', title: 'Ellipse' },
    { id: 'text',      label: 'T', title: 'Text label' },
    { id: 'image',     label: '⬜', title: 'Image' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      {showLoadDialog && (
        <LoadDialog io={io} onLoad={handleLoadEntry} onClose={() => setShowLoadDialog(false)} />
      )}

      {/* Top bar */}
      <div style={topBarStyle}>
        {/* File operations */}
        <button style={btnStyle} onClick={handleNew} title="New dashboard">New</button>
        <button style={btnStyle} onClick={() => setShowLoadDialog(true)}>Load</button>
        <button style={btnStyle} onClick={handleSave} disabled={!spec}>Save</button>

        <div style={dividerStyle} />

        {/* Drawing tools — only visible in edit mode */}
        {mode === 'edit' && tools.map(t => (
          <button
            key={t.id}
            title={t.title}
            style={{
              ...btnStyle,
              background: activeTool === t.id ? '#4A90D9' : '#f5f5f5',
              color: activeTool === t.id ? '#fff' : '#333',
              fontWeight: activeTool === t.id ? 700 : 400,
            }}
            onClick={() => setActiveTool(activeTool === t.id ? 'select' : t.id)}
          >
            {t.label}
          </button>
        ))}

        {mode === 'edit' && <div style={dividerStyle} />}

        <div style={{ flex: 1 }} />

        {/* Undo / Redo */}
        <button style={btnStyle} disabled={undoStack.length === 0} onClick={undo} title="Undo (Ctrl+Z)">↩</button>
        <button style={btnStyle} disabled={redoStack.length === 0} onClick={redo} title="Redo (Ctrl+Y)">↪</button>

        <div style={dividerStyle} />

        {/* Mode toggle */}
        <div style={{ display: 'flex', border: '1px solid #555', borderRadius: 4, overflow: 'hidden' }}>
          {(['interact', 'edit'] as const).map(m => (
            <button
              key={m}
              style={{
                ...btnStyle,
                background: mode === m ? '#4A90D9' : '#444',
                color: '#eee', borderRadius: 0, border: 'none',
              }}
              onClick={() => setMode(m)}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        <button style={btnStyle} onClick={handlePublish} disabled={!spec} title="Publish dashboard">Publish</button>
        <button style={btnStyle} onClick={() => window.open('https://engagelively.github.io/galyleo-user-docs/', '_blank')} title="Open user docs">Help</button>
        <button style={btnStyle} onClick={toggleSidebar} title="Toggle sidebar">
          {sidebarOpen ? '▶' : '◀'}
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Canvas area */}
        <div style={{ flex: 1, overflow: 'auto', background: '#e0e0e0' }}>
          {loading && <div style={centeredStyle}>Loading…</div>}
          {!loading && spec && <EditableCanvas />}
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <div style={sidebarStyle}>
            {/* Panel toggle */}
            <div style={panelTabsStyle}>
              {(['data', 'properties'] as const).map(p => (
                <button key={p} style={{ ...panelTabBtn, ...(displayPanel === p ? panelTabActive : {}) }}
                  onClick={() => setSidebarPanel(p)}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            {displayPanel === 'data'
              ? <DataPanel />
              : <ShapeConfigurer key={selectedId ?? 'none'} />}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Styles ----

const topBarStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4,
  padding: '4px 8px',
  background: '#2c2c2c', color: '#eee',
  height: 40, flexShrink: 0,
};

const btnStyle: React.CSSProperties = {
  padding: '3px 9px', fontSize: 13, cursor: 'pointer',
  border: '1px solid #ccc', borderRadius: 4,
  background: '#f5f5f5', color: '#333',
};

const dividerStyle: React.CSSProperties = {
  width: 1, height: 22, background: '#555', margin: '0 4px',
};

const centeredStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  height: '100%', color: '#555',
};

const sidebarStyle: React.CSSProperties = {
  width: 240, flexShrink: 0,
  borderLeft: '1px solid #ccc',
  background: '#fafafa',
  display: 'flex', flexDirection: 'column',
  overflow: 'hidden',
};

const panelTabsStyle: React.CSSProperties = {
  display: 'flex', borderBottom: '1px solid #ddd', flexShrink: 0,
};

const panelTabBtn: React.CSSProperties = {
  flex: 1, padding: '5px 2px', fontSize: 12,
  border: 'none', background: 'none', cursor: 'pointer',
  borderBottom: '2px solid transparent', color: '#666',
};

const panelTabActive: React.CSSProperties = {
  color: '#4A90D9', borderBottom: '2px solid #4A90D9', fontWeight: 600,
};
