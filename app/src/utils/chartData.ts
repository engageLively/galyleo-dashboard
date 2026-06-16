// Prepares framework-agnostic ChartData from the store's dataManager and filterValues.

import type { FilterDictionary } from '../data/galyleo-data';
import { GalyleoDataManager } from '../data/galyleo-data';
import type { ChartData } from '../renderers/types';

/**
 * Fetches and projects the data for a chart, applying the current filter state.
 *
 * Resolves `viewOrTable` against the data manager — first as a view (with filtering
 * and column projection), then as a bare table (no filtering, all columns).
 *
 * @param viewOrTable - The view or table name from `GalyleoChartSpec.viewOrTable`.
 * @param filterValues - The current filter dictionary from the dashboard store.
 * @param dataManager - The data manager holding all loaded tables and views.
 * @returns Framework-agnostic `ChartData`, or `null` if the name isn't found.
 */
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

/**
 * Returns the name of the first column for a view or table — used as the
 * filter column when a chart row is selected and no explicit column is provided.
 *
 * @param viewOrTable - The view or table name.
 * @param dataManager - The data manager to look up.
 * @returns The first column name, or `null` if the view/table isn't found.
 */
export function getFirstColumn(viewOrTable: string, dataManager: GalyleoDataManager): string | null {
  const view = dataManager.views[viewOrTable];
  if (view) return view.columns[0] ?? null;
  const table = dataManager.tables[viewOrTable];
  if (table) return table.columns[0]?.name ?? null;
  return null;
}
