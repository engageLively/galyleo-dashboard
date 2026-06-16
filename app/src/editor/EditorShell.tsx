/**
 * Top-level layout for the dashboard editor.
 *
 * Renders a three-zone layout: TopBar (fixed top), SideBar (collapsible right),
 * and EditableCanvas (fills the remaining space).
 */

import { useEffect } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { useEditorStore } from '../store/editorStore';
import { EditableCanvas } from './canvas/EditableCanvas';
import { deleteWidget } from './utils/specMutations';

export default function EditorShell() {
  const spec = useDashboardStore(s => s.spec);
  const loading = useDashboardStore(s => s.loading);
  const patchSpec = useDashboardStore(s => s.patchSpec);
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

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Escape') {
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
  }, [selectedId, selectedKind, mode, undo, redo, patchSpec, selectWidget, pushUndo]);

  // ---- File I/O ----
  async function handleLoad() {
    try {
      const loaded = await io.load();
      await useDashboardStore.getState().loadDashboardFromSpec(loaded);
      const path = io.currentPath();
      if (path) document.title = path.replace(/\.gd\.json$/, '');
    } catch (err) {
      alert(`Load failed: ${err}`);
    }
  }

  async function handleSave() {
    const s = useDashboardStore.getState().spec;
    if (!s) return;
    try {
      await io.save(s);
    } catch {
      const name = prompt('Save as (filename):');
      if (!name) return;
      try {
        await io.saveAs(s, name);
      } catch (err) {
        alert(`Save failed: ${err}`);
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      {/* Top bar */}
      <div style={topBarStyle}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={btnStyle} onClick={handleLoad}>Load</button>
          <button style={btnStyle} onClick={handleSave} disabled={!spec}>Save</button>
        </div>

        <div style={{ flex: 1 }} />

        <button style={btnStyle} disabled={undoStack.length === 0} onClick={undo} title="Undo (Ctrl+Z)">↩</button>
        <button style={btnStyle} disabled={redoStack.length === 0} onClick={redo} title="Redo (Ctrl+Y)">↪</button>

        {/* Mode toggle */}
        <div style={{ display: 'flex', border: '1px solid #555', borderRadius: 4, overflow: 'hidden' }}>
          <button
            style={{ ...btnStyle, background: mode === 'interact' ? '#4A90D9' : '#444', color: '#eee', borderRadius: 0, border: 'none' }}
            onClick={() => setMode('interact')}
          >
            Interact
          </button>
          <button
            style={{ ...btnStyle, background: mode === 'edit' ? '#4A90D9' : '#444', color: '#eee', borderRadius: 0, border: 'none' }}
            onClick={() => setMode('edit')}
          >
            Edit
          </button>
        </div>

        <button style={btnStyle} onClick={toggleSidebar} title="Toggle sidebar">
          {sidebarOpen ? '▶' : '◀'}
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Canvas */}
        <div style={{ flex: 1, overflow: 'auto', background: '#e0e0e0' }}>
          {loading && (
            <div style={centeredStyle}>Loading…</div>
          )}
          {!spec && !loading && (
            <div style={{ ...centeredStyle, flexDirection: 'column', gap: 12 }}>
              <p style={{ margin: 0 }}>No dashboard loaded.</p>
              <button style={btnStyle} onClick={handleLoad}>Load a dashboard</button>
            </div>
          )}
          {spec && <EditableCanvas />}
        </div>

        {/* Sidebar placeholder */}
        {sidebarOpen && (
          <div style={sidebarStyle}>
            <p style={{ margin: 0, fontSize: 12, color: '#888' }}>Sidebar — Phase 2d/2e</p>
          </div>
        )}
      </div>
    </div>
  );
}

const topBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 8px',
  background: '#2c2c2c',
  color: '#eee',
  height: 40,
  flexShrink: 0,
};

const btnStyle: React.CSSProperties = {
  padding: '3px 10px',
  fontSize: 13,
  cursor: 'pointer',
  border: '1px solid #ccc',
  borderRadius: 4,
  background: '#f5f5f5',
  color: '#333',
};

const centeredStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: '#555',
};

const sidebarStyle: React.CSSProperties = {
  width: 260,
  flexShrink: 0,
  borderLeft: '1px solid #ccc',
  background: '#fafafa',
  padding: 12,
  overflow: 'auto',
};
