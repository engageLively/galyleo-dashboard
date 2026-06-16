// Prepares framework-agnostic ChartData from the store's dataManager and filterValues.

import type { FilterDictionary } from '../data/galyleo-data';
import { GalyleoDataManager } from '../data/galyleo-data';
import type { ChartData } from '../renderers/types';

export async function prepareChartData(
  viewOrTable: string,
  filterValues: FilterDictionary,
  dataManager: GalyleoDataManager,
): Promise<ChartData | null> {
  if (dataManager.tableNames.includes(viewOrTable)) {
    const table = dataManager.tables[viewOrTable];
    const columns = table.columns.map(c => ({ name: c.name, type: c.type }));
    const rows = await table.getRows();
    return { columns, rows };
  }

  if (dataManager.viewNames.includes(viewOrTable)) {
    const view = dataManager.views[viewOrTable];
    const fullCols = view.fullColumns(dataManager.tables);
    if (!fullCols) return null;
    const columns = fullCols.map(c => ({ name: c.name, type: c.type }));
    const rows = await view.getData(filterValues, dataManager.tables);
    return { columns, rows: rows ?? [] };
  }

  return null;
}

// Returns the name of the first column for a given view or table — used as the
// chart's drill-through filter column when a row is selected.
export function getFirstColumn(viewOrTable: string, dataManager: GalyleoDataManager): string | null {
  const view = dataManager.views[viewOrTable];
  if (view) return view.columns[0] ?? null;
  const table = dataManager.tables[viewOrTable];
  if (table) return table.columns[0]?.name ?? null;
  return null;
}
