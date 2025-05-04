/* global google */
import { part, config } from 'lively.morphic';
import { LivelyWorld } from 'lively.ide/world.js';
import { GalyleoStudioWorld } from './ui.cp.js';
import { loadViaScript } from 'lively.resources/index.js';
import { loadGoogleChartsAndExecute } from '../utils.js';

export async function main () {
  // take this out when we figure out how to write the html head
  // really should be a script tag in <head>

  config.ide.studio.canvasModeEnabled = false;
  const { GalyleoDashboardStudio } = await System.import('engageLively--galyleo-dashboard/studio/int/en/index.js');
  const dashboard = part(GalyleoDashboardStudio);
  // dashboard.openInWorld()
  dashboard.respondsToVisibleWindow = true;
  $world.addMorph(dashboard);
  dashboard.relayout();

  // loadGoogleChartsAndExecute(_ => finishLoad());
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
