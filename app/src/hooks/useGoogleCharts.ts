/**
 * Hook that injects the Google Charts loader script and signals when the API is ready.
 *
 * Loads the `corechart`, `geochart`, `table`, and `controls` packages.
 * The `mapsApiKey` is required for `GeoChart` (interactive region maps).
 *
 * The script is injected only once per page lifetime (`scriptInjected` flag).
 * On hot-reload the hook detects that `window.google.visualization` is already
 * present and calls `setReady()` immediately.
 *
 * Replace this hook (and update `App.tsx`) when switching to a different
 * charting library.
 */

import { useEffect } from 'react';
import { useDashboardStore } from '../store/dashboardStore';

const PACKAGES = ['corechart', 'geochart', 'table', 'controls'];
const MAPS_API_KEY = 'AIzaSyA4uHMmgrSNycQGwdF3PSkbuNW49BAwN1I';

let scriptInjected = false;

/**
 * Injects the Google Charts loader and marks the store ready once the
 * visualization API has fully initialized.
 *
 * @returns `true` once `google.visualization` is available, `false` while loading.
 */
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
      setReady();
    }
  }, [ready, setReady]);

  return ready;
}
