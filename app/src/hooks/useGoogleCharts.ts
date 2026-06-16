// Loads the Google Charts script and marks the store as ready once the
// visualization API is available.  Only imported when GoogleChartsRenderer is the
// ACTIVE_RENDERER — other renderers supply their own loading hooks.

import { useEffect } from 'react';
import { useDashboardStore } from '../store/dashboardStore';

const PACKAGES = ['corechart', 'geochart', 'table', 'controls'];
const MAPS_API_KEY = 'AIzaSyA4uHMmgrSNycQGwdF3PSkbuNW49BAwN1I';

let scriptInjected = false;

export function useGoogleCharts(): boolean {
  const setReady = useDashboardStore(s => s.setGoogleChartsReady);
  const ready = useDashboardStore(s => s.googleChartsReady);

  useEffect(() => {
    if (ready) return;

    if (!scriptInjected) {
      scriptInjected = true;
      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/charts/loader.js';
      script.async = true;
      script.onload = () => {
        window.google!.charts.load('current', {
          packages: PACKAGES,
          mapsApiKey: MAPS_API_KEY,
        });
        window.google!.charts.setOnLoadCallback(() => setReady());
      };
      document.head.appendChild(script);
    } else if (window.google?.visualization) {
      // Script already ran (e.g. hot-reload)
      setReady();
    }
  }, [ready, setReady]);

  return ready;
}
