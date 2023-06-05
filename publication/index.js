import { part, config } from 'lively.morphic';
import { LivelyWorld } from 'lively.ide/world.js';

// part(GalyleoDashboardPublication).openInWindow()

export async function main () {
  config.ide.studio.canvasModeEnabled = false;
  const { GalyleoDashboardPublication } = await System.import('galyleo-dashboard/publication/int/en');
  const dashboard = part(GalyleoDashboardPublication);
  dashboard.respondsToVisibleWindow = true;
  $world.addMorph(dashboard);
  dashboard.relayout();
}

export const TITLE = 'Galyleo Dashboard';

export const WORLD_CLASS = LivelyWorld;

export const EXCLUDED_MODULES = [
  'pouchdb',
  'pouchdb-adapter-mem',
  'rollup',
  'lively.freezer',
  'lively.modules',
  'lively.storage',
  'lively.user'
];
