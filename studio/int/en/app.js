import { part, config } from 'lively.morphic';
import { LivelyWorld } from 'lively.ide/world.js';
import { GalyleoStudioWorld } from '../../ui.cp.js';

export async function main () {
  config.ide.studio.canvasModeEnabled = false;
  const { GalyleoDashboardStudio } = await System.import('engageLively--galyleo-dashboard/studio/int/en/index.js');
  const dashboard = part(GalyleoDashboardStudio);
  dashboard.respondsToVisibleWindow = true;
  $world.addMorph(dashboard);
  dashboard.relayout();
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
