import { part } from 'lively.morphic';
import { LivelyWorld } from 'lively.ide/world.js';

// part(GalyleoDashboardStudio).openInWindow()

export async function main () {
  const { GalyleoDashboardStudio } = await System.import('galyleo-dashboard/studio/int/en');
  const dashboard = part(GalyleoDashboardStudio);
  dashboard.respondsToVisibleWindow = true;
  $world.addMorph(dashboard);
  dashboard.relayout();
}

export const TITLE = 'Galyleo Dashboard Studio';

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
