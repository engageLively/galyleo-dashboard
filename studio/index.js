/* global google */
import { part, config } from 'lively.morphic';
import { LivelyWorld } from 'lively.ide/world.js';
import { GalyleoStudioWorld } from './ui.cp.js';
import { loadViaScript } from 'lively.resources/index.js';

/**
  * Load the Google chart packages.
  * Note: we're going to have to drop the mapsApiKey at some point.
  * @param { string[] } packageList - The packages to be loaded. Default is the core chart package, the map package, and the chart editor..
  */
export async function loadGoogleChartPackages (packageList = ['corechart', 'map', 'charteditor', 'visualization']) {
  // await promise.waitFor(20 * 1000, () => !!window.google);
  console.log('A1');
  while (!window.google || !window.google.charts) {
    await loadViaScript('https://www.gstatic.com/charts/loader.js');
  }
  console.log('B1');
  while (!window.google.visualization) {
    console.log('B2');
    await window.google.charts.load('50', { packages: packageList, mapsApiKey: 'AIzaSyA4uHMmgrSNycQGwdF3PSkbuNW49BAwN1I' });
    console.log('B3');
  }
}
const finishLoad = async () => {
  console.log('baz!');
  const { GalyleoDashboardStudio } = await System.import('engageLively--galyleo-dashboard/studio/int/en/index.js');
  /* while (!window.google || !window.google.charts || !window.google.visualization) {
    await loadGoogleChartPackages();
  }
  // const { GalyleoDashboardStudio } = await System.import('galyleo-dashboard/studio/int/jp/index.cp.js'); */

  const dashboard = part(GalyleoDashboardStudio);
  // dashboard.openInWorld()
  dashboard.respondsToVisibleWindow = true;
  $world.addMorph(dashboard);
  dashboard.relayout();
};

export async function main () {
  // take this out when we figure out how to write the html head
  // really should be a script tag in <head>
  await loadViaScript('https://www.gstatic.com/charts/loader.js');
  const packageList = ['corechart', 'map', 'charteditor', 'visualization'];
  google.charts.load('50', { packages: packageList, mapsApiKey: 'AIzaSyA4uHMmgrSNycQGwdF3PSkbuNW49BAwN1I' });
  config.ide.studio.canvasModeEnabled = false;
  const check = _ => {
    console.log('foo!');
    if (google.visualization) {
      finishLoad();
    } else {
      setTimeout(check, 100);
    }
  };
  setTimeout(check, 100);
  /* google.charts.setOnLoadCallback(async _ => {
    config.ide.studio.canvasModeEnabled = false;
    console.log('foo!');
    const { GalyleoDashboardStudio } = await System.import('engageLively--galyleo-dashboard/studio/int/en/index.js');
    const dashboard = part(GalyleoDashboardStudio);
    dashboard.respondsToVisibleWindow = true;
    $world.addMorph(dashboard);
    dashboard.relayout();
  }); */
  console.log('Bar!');
}

export const TITLE = 'Galyleo Dashboard Studio';

export const WORLD_CLASS = GalyleoStudioWorld;

export const EXCLUDED_MODULES = [
  'pouchdb',
  'pouchdb-adapter-mem',
  'rollup',
  'lively.freezer',
  'lively.modules',
  'lively.storage',
  'lively.user'
];
