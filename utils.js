import { loadViaScript } from 'lively.resources';

'format esm';
export const loadGoogleChartsAndExecute = async (callback) => {
  const packageList = ['corechart', 'geochart', 'charteditor', 'table', 'controls'];

  while (!window.google || !window.google.charts) {
    await loadViaScript('https://www.gstatic.com/charts/loader.js');
  }
  const check = _ => {
    if (window.google?.visualization?.ChartEditor) {
      callback();
    } else {
      setTimeout(check, 25);
    }
  };
  window.google.charts.load('current', { packages: packageList, mapsApiKey: 'AIzaSyA4uHMmgrSNycQGwdF3PSkbuNW49BAwN1I' });
  check();
};

class GoogleChartLoader {
  constructor () {
    this.queuedCharts = [];
    this.chartsReady = false;
    loadGoogleChartsAndExecute(_ => {
      this.googleChartLoaderFinished();
    });
  }

  queueChart (dashboard, chartName) {
    this.queuedCharts.push({
      dashboard: dashboard,
      chartName: chartName
    });
  }

  googleChartLoaderFinished () {
    this.chartsReady = true;
    this.queuedCharts.forEach(chartObject => chartObject.dashboard.drawChart(chartObject.chartName));
  }
}
export const GOOGLE_CHART_LOADER = new GoogleChartLoader();
