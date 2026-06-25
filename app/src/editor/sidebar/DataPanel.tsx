/**
 * Four-tab sidebar panel for managing Tables, Filters, Views, Charts.
 * Each tab shows a scrollable list with per-item edit (✏) and delete (🗑) buttons
 * and an "+ Add" button at the bottom.
 */

import { useState, useEffect } from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { useEditorStore } from '../../store/editorStore';
import {
  addFilter, addView, addChart, addTable,
  removeFilter, removeView, removeChart, removeTable,
  updateChart,
} from '../utils/specMutations';
import { openGoogleChartEditor } from '../utils/googleChartEditor';
import { fetchGalyleoConfig } from '../io/configCache';
import { FilterEditor } from '../dialogs/FilterEditor';
import { ViewEditor } from '../dialogs/ViewEditor';
import { ChartSourcePicker } from '../dialogs/ChartSourcePicker';
import { TableEditor } from '../dialogs/TableEditor';
import type {
  GalyleoFilterSpec, GalyleoViewSpec,
  GalyleoChartSpec, GalyleoTableSpec,
} from '../../types/dashboard';

type Tab = 'tables' | 'filters' | 'views' | 'charts';

const TABS: { id: Tab; label: string }[] = [
  { id: 'tables',  label: 'Tables'  },
  { id: 'filters', label: 'Filters' },
  { id: 'views',   label: 'Views'   },
  { id: 'charts',  label: 'Charts'  },
];

export function DataPanel() {
  const spec                  = useDashboardStore(s => s.spec);
  const patchSpec             = useDashboardStore(s => s.patchSpec);
  const loadDashboardFromSpec = useDashboardStore(s => s.loadDashboardFromSpec);
  const dataManager           = useDashboardStore(s => s.dataManager);
  const filterValues          = useDashboardStore(s => s.filterValues);
  const activeTab             = useEditorStore(s => s.sidebarTab);
  const setTab                = useEditorStore(s => s.setSidebarTab);
  const pushUndo              = useEditorStore(s => s.pushUndo);

  // When running in Jupyter, the Hub galyleo service URL is passed as a URL param
  const galyleoServer = new URLSearchParams(window.location.search).get('galyleo_server') ?? undefined;

  const [tableServers, setTableServers] = useState<string[]>([]);
  useEffect(() => {
    if (!galyleoServer) return;
    fetchGalyleoConfig(galyleoServer).then(cfg => setTableServers(cfg.tableServers));
  }, [galyleoServer]);

  // Dialog state — null = closed, string = editing that name, true = adding new
  const [filterDialog, setFilterDialog] = useState<string | true | null>(null);
  const [viewDialog,   setViewDialog]   = useState<string | true | null>(null);
  const [chartDialog,  setChartDialog]  = useState<true | null>(null); // create only; edit uses GCE
  const [tableDialog,  setTableDialog]  = useState<string | true | null>(null);

  if (!spec) return <p style={emptyStyle}>No dashboard loaded.</p>;

  // ---- Commit helpers ----

  async function commit(newSpec: ReturnType<typeof addFilter>) {
    pushUndo();
    await loadDashboardFromSpec(newSpec);
  }

  async function commitFilter(name: string, fs: GalyleoFilterSpec) {
    await commit(addFilter(spec!, name, fs));
  }

  async function commitView(name: string, vs: GalyleoViewSpec) {
    await commit(addView(spec!, name, vs));
  }

  async function handleChartSourcePicked(name: string, viewOrTable: string) {
    if (!dataManager) { alert('Data not ready — try again in a moment.'); return; }

    // Seed the GCE with a BarChart so there's a sensible default to start from
    const tempSpec: GalyleoChartSpec = {
      chartType: 'BarChart',
      viewOrTable,
      morphIndex: spec!.numMorphs ?? 0,
      options: {},
      morphicProperties: {
        position: { x: 40, y: 100 },
        extent: { x: 400, y: 300 },
        rotation: 0, scale: 1, opacity: 1,
        clipMode: 'visible',
        fill: 'rgba(255,255,255,0)',
        border: { style: 'solid', width: 0, color: {}, radius: 0 },
        origin: { x: 0, y: 0 },
      },
    };

    await openGoogleChartEditor(tempSpec, dataManager, filterValues, async (chartType, options) => {
      await commit(addChart(spec!, name, { ...tempSpec, chartType, options }));
    });
  }

  async function commitTable(name: string, ts: GalyleoTableSpec) {
    await commit(addTable(spec!, name, ts));
  }

  // ---- Delete ----

  async function deleteItem(kind: Tab, name: string) {
    if (!confirm(`Delete ${kind.slice(0, -1)} "${name}"?`)) return;
    pushUndo();
    const fn =
      kind === 'filters' ? removeFilter
      : kind === 'views'  ? removeView
      : kind === 'charts' ? removeChart
      :                     removeTable;
    await loadDashboardFromSpec(fn(spec!, name));
  }

  // ---- Items for active tab ----

  const items: string[] =
    activeTab === 'tables'  ? Object.keys(spec.tables)
    : activeTab === 'filters' ? Object.keys(spec.filters)
    : activeTab === 'views'   ? Object.keys(spec.views)
    :                           Object.keys(spec.charts);

  function openAdd() {
    if (activeTab === 'filters') setFilterDialog(true);
    else if (activeTab === 'views')   setViewDialog(true);
    else if (activeTab === 'charts')  setChartDialog(true);
    else                              setTableDialog(true);
  }

  async function openEdit(name: string) {
    if (activeTab === 'filters') { setFilterDialog(name); return; }
    if (activeTab === 'views')   { setViewDialog(name);   return; }
    if (activeTab === 'tables')  { setTableDialog(name);  return; }

    // Charts: open the native Google Chart Editor
    if (!dataManager) { alert('Data not ready — try again in a moment.'); return; }
    const chartSpec = spec!.charts[name];
    if (!chartSpec) return;
    await openGoogleChartEditor(chartSpec, dataManager, filterValues, (chartType, options) => {
      pushUndo();
      patchSpec(s => updateChart(s, name, { chartType, options }));
    });
  }

  return (
    <div style={panelStyle}>
      {/* Tab strip */}
      <div style={tabStripStyle}>
        {TABS.map(t => (
          <button
            key={t.id}
            style={{ ...tabBtnStyle, ...(activeTab === t.id ? tabActiveStyle : {}) }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Scrollable list */}
      <div style={listStyle}>
        {items.length === 0 && (
          <p style={emptyStyle}>No {activeTab} defined.</p>
        )}
        {items.map(name => (
          <div key={name} style={itemStyle}>
            <span style={itemLabelStyle} title={name}>{name}</span>
            <div style={{ display: 'flex', gap: 1 }}>
              <button style={iconBtnStyle} title={`Edit ${name}`}
                onClick={() => openEdit(name)}>✏</button>
              <button style={{ ...iconBtnStyle, color: '#c00' }} title={`Delete ${name}`}
                onClick={() => deleteItem(activeTab, name)}>🗑</button>
            </div>
          </div>
        ))}
      </div>

      {/* Add button */}
      <div style={{ padding: '6px 8px', borderTop: '1px solid #e0e0e0', flexShrink: 0 }}>
        <button style={addBtnStyle} onClick={openAdd}>
          + Add {activeTab.slice(0, -1)}
        </button>
      </div>

      {/* Dialogs */}
      {filterDialog !== null && (
        <FilterEditor
          spec={spec}
          editName={typeof filterDialog === 'string' ? filterDialog : null}
          onCommit={commitFilter}
          onClose={() => setFilterDialog(null)}
        />
      )}
      {viewDialog !== null && (
        <ViewEditor
          spec={spec}
          editName={typeof viewDialog === 'string' ? viewDialog : null}
          onCommit={commitView}
          onClose={() => setViewDialog(null)}
        />
      )}
      {chartDialog !== null && (
        <ChartSourcePicker
          spec={spec}
          onPick={(name, viewOrTable) => handleChartSourcePicked(name, viewOrTable)}
          onClose={() => setChartDialog(null)}
        />
      )}
      {tableDialog !== null && (
        <TableEditor
          spec={spec}
          editName={typeof tableDialog === 'string' ? tableDialog : null}
          galyleoServer={galyleoServer}
          tableServers={tableServers}
          onCommit={commitTable}
          onClose={() => setTableDialog(null)}
        />
      )}
    </div>
  );
}

// ---- Styles ----
// flex:1 + minHeight:0 is the correct pattern for a scrollable flex child
// (height:'100%' doesn't resolve reliably inside flex-stretch containers)

const panelStyle: React.CSSProperties = {
  flex: 1, minHeight: 0,
  display: 'flex', flexDirection: 'column',
  fontFamily: 'sans-serif', fontSize: 13, overflow: 'hidden',
};

const tabStripStyle: React.CSSProperties = {
  display: 'flex', borderBottom: '1px solid #ddd', flexShrink: 0,
};

const tabBtnStyle: React.CSSProperties = {
  flex: 1, padding: '6px 2px', fontSize: 12,
  border: 'none', background: 'none', cursor: 'pointer',
  borderBottom: '2px solid transparent', color: '#555',
};

const tabActiveStyle: React.CSSProperties = {
  color: '#4A90D9', borderBottom: '2px solid #4A90D9', fontWeight: 600,
};

const listStyle: React.CSSProperties = {
  flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 0',
};

const itemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '4px 8px', borderBottom: '1px solid #f0f0f0',
};

const itemLabelStyle: React.CSSProperties = {
  flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  fontSize: 13, color: '#222',
};

const iconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 13, padding: '2px 4px', color: '#555',
};

const addBtnStyle: React.CSSProperties = {
  width: '100%', padding: '5px', fontSize: 12,
  border: '1px dashed #aaa', borderRadius: 4,
  background: '#fafafa', cursor: 'pointer', color: '#444',
};

const emptyStyle: React.CSSProperties = {
  padding: '12px 8px', color: '#999', fontSize: 12, margin: 0,
};
