declare global {
  interface Window {
    google?: {
      charts: {
        load: (version: string, options: object) => void;
        setOnLoadCallback: (callback: () => void) => void;
      };
      visualization?: {
        DataTable: new (spec?: object) => GoogleDataTable;
        ChartWrapper: new (spec: GoogleChartWrapperSpec) => GoogleChartWrapper;
        events: {
          addListener: (obj: unknown, event: string, handler: (...args: unknown[]) => void) => void;
        };
      };
    };
  }
}

export interface GoogleDataTable {
  addRows: (rows: unknown[][]) => void;
  getValue: (row: number, col: number) => unknown;
  getNumberOfRows: () => number;
  getNumberOfColumns: () => number;
}

export interface GoogleChartWrapperSpec {
  chartType: string;
  options?: object;
  containerId?: string | HTMLElement;
}

export interface GoogleChartWrapper {
  setDataTable: (table: GoogleDataTable) => void;
  setContainerId: (id: string | HTMLElement) => void;
  draw: () => void;
  getChart: () => GoogleChart | null;
  getDataTable: () => GoogleDataTable;
  getType: () => string;
}

export interface GoogleChart {
  getSelection: () => Array<{ row: number | null; col: number | null }>;
}
