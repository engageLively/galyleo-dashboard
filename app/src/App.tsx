import { useEffect, lazy, Suspense } from 'react';
import { useGoogleCharts } from './hooks/useGoogleCharts';
import { useDashboardStore } from './store/dashboardStore';
import { DashboardViewer } from './components/DashboardViewer';

const EditorShell = lazy(() => import('./editor/EditorShell'));

export default function App() {
  useGoogleCharts();

  const loadDashboardFromURL = useDashboardStore(s => s.loadDashboardFromURL);
  const spec = useDashboardStore(s => s.spec);
  const loading = useDashboardStore(s => s.loading);

  const params = new URLSearchParams(window.location.search);
  // VITE_DEFAULT_MODE=edit is set at build time for the /editor/ deployment.
  // ?mode=edit overrides in either direction.
  const editMode = params.get('mode') === 'edit' ||
    (params.get('mode') !== 'interact' && import.meta.env.VITE_DEFAULT_MODE === 'edit');

  useEffect(() => {
    const dashboardUrl = params.get('dashboard');
    if (dashboardUrl) {
      loadDashboardFromURL(dashboardUrl);
      const name = dashboardUrl.split('/').pop()?.replace(/\.gd\.json$|\.json$/, '') ?? '';
      if (name) document.title = name;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadDashboardFromURL]);

  if (editMode) {
    return (
      <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#555' }}>Loading editor…</div>}>
        <EditorShell />
      </Suspense>
    );
  }

  if (!spec && !loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16, color: '#555' }}>
        <h2 style={{ margin: 0 }}>Galyleo Dashboard Viewer</h2>
        <p style={{ margin: 0, fontSize: 14 }}>
          Load a dashboard by appending <code>?dashboard=&lt;url&gt;</code> to this page.
        </p>
      </div>
    );
  }

  return <DashboardViewer />;
}
