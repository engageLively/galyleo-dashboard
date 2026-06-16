import { useEffect } from 'react';
import { useGoogleCharts } from './hooks/useGoogleCharts';
import { useDashboardStore } from './store/dashboardStore';
import { DashboardViewer } from './components/DashboardViewer';

export default function App() {
  useGoogleCharts();

  const loadDashboardFromURL = useDashboardStore(s => s.loadDashboardFromURL);
  const spec = useDashboardStore(s => s.spec);
  const loading = useDashboardStore(s => s.loading);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dashboardUrl = params.get('dashboard');
    if (dashboardUrl) {
      loadDashboardFromURL(dashboardUrl);
      const name = dashboardUrl.split('/').pop()?.replace(/\.gd\.json$|\.json$/, '') ?? '';
      if (name) document.title = name;
    }
  }, [loadDashboardFromURL]);

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
