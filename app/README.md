# Galyleo Dashboard Viewer

A React + TypeScript + Vite app that loads and renders Galyleo dashboards (`.gd.json` files) in the browser. Dashboards are read-only viewers; editing is handled by the separate Galyleo studio.

## Running locally

```bash
cd app
npm install
npm run dev        # dev server on http://localhost:3000
```

Load a dashboard by appending `?dashboard=<url>` to the page URL. The dev server proxies `/services/galyleo` to a local SDTP server on port 5001 (see `../sdtp_server/`).

## How a dashboard loads

```
URL param ?dashboard=<url>
  → App.tsx fetches the .gd.json file
  → dashboardStore.loadDashboardFromSpec()
      → builds GalyleoDataManager (tables + views)
      → seeds initial filter values from savedForms
      → seeds chart-based filter values (first row of view data)
  → DashboardViewer renders charts, filters, and morphs
```

## File map

```
src/
  App.tsx                     Entry point. Reads ?dashboard= param, kicks off load.
  main.tsx                    React root mount.

  store/
    dashboardStore.ts         Zustand store. Single source of truth for:
                                - loaded dashboard spec
                                - GalyleoDataManager instance
                                - filterValues (what every filter/chart has selected)
                              All components read and write through this store.

  data/
    galyleo-data.ts           Data layer (ported from original galyleo-data.js).
                                - GalyleoTable (abstract) — getRows / getFilteredRows
                                - ExplicitGalyleoTable — rows stored in memory, filtered client-side
                                - RemoteGalyleoTable — rows fetched from an SDTP server
                                - GalyleoView — projects columns and applies filters from filterValues
                                - GalyleoDataManager — registry of tables and views
                                - constructGalyleoTable — creates the right table type from a spec:
                                    spec.rows       → ExplicitGalyleoTable
                                    spec.staticUrl  → fetch SDML file → ExplicitGalyleoTable
                                    spec.connector  → RemoteGalyleoTable (live SDTP server)

  types/
    dashboard.ts              TypeScript types for the .gd.json format:
                                GalyleoDashboard, GalyleoTableSpec, GalyleoViewSpec,
                                GalyleoChartSpec, GalyleoFilterSpec, MorphDescriptor, etc.

  hooks/
    useGoogleCharts.ts        Injects the Google Charts loader script once, calls
                              setGoogleChartsReady() when the API is available.
                              If you swap renderers, replace this hook.

  components/
    DashboardViewer.tsx       Top-level canvas. Computes canvas size from all morph
                              positions, renders morphs / filters / charts in z-order.

    ChartWidget.tsx           Wrapper for a single chart.
                                - Subscribes to filterValues; re-fetches view data on change.
                                - Computes a dynamic title ("col2 v col1 where F = v").
                                - Passes onSelect back to the renderer; clicking a chart
                                  element calls setFilterValue(chartName, filter) so the
                                  chart itself acts as a filter for other views.

    ImageWidget.tsx           Renders an Image MorphDescriptor.
    TextWidget.tsx            Renders a Text MorphDescriptor with morphic text properties.

    filters/
      FilterWidget.tsx        Dispatches to the right filter component by filterType.
      SelectFilter.tsx        Dropdown for Select / NumericSelect / List filters.
      RangeFilter.tsx         Slider for Range / DoubleSlider filters.

  renderers/
    registry.ts               Exports ACTIVE_RENDERER. Change this one import to swap
                              the entire charting library.
    types.ts                  ChartRendererProps interface — the contract any renderer must satisfy.
    GoogleChartsRenderer.tsx  Google Charts implementation. Manages a ChartWrapper lifecycle,
                              attaches a select listener in the 'ready' event (getChart()
                              returns null before ready fires).

  utils/
    chartData.ts              prepareChartData() — pulls rows from a view or table given
                              current filterValues and returns framework-agnostic ChartData.
    morphicStyles.ts          Converts lively.next MorphicProperties (position, extent,
                              fill, border, …) to React CSSProperties.
```

## Data flow for a filter change

```
User interacts with a FilterWidget or clicks a chart
  → setFilterValue(filterName, { operator, column, values })  [dashboardStore]
  → filterValues object reference changes  [Zustand]
  → every ChartWidget re-renders (subscribed to filterValues)
  → prepareChartData() calls view.getData(filterValues, tables)
  → GalyleoView._getFilter() picks the relevant FilterSpecs by filterNames
  → table.getFilteredRows(combinedFilter) returns matching rows
  → ChartWidget passes new ChartData to the renderer → chart redraws
```

## Table types

| Type | When used | Filtering |
|---|---|---|
| `ExplicitGalyleoTable` | `spec.rows` present, or `spec.staticUrl` fetched | Client-side, in memory |
| `RemoteGalyleoTable` | `spec.connector` present | Server-side via SDTP `POST /get_filtered_rows` |

## Adding a new chart renderer

1. Create `src/renderers/MyRenderer.tsx` implementing `ChartRendererProps` from `types.ts`.
2. Change the one line in `src/renderers/registry.ts` to point at it.
3. Replace `useGoogleCharts` in `App.tsx` with whatever loader your library needs.

## Deploying to GitHub Pages

Push to `main` or `feature/static-gcs-deploy`. The workflow in `.github/workflows/deploy.yml` runs `npm ci && npm run build` with `VITE_BASE_URL=/galyleo-dashboard/` and pushes `app/dist` to the `gh-pages` branch.

The deployed viewer is at `https://engagelively.github.io/galyleo-dashboard/`.

Load a published dashboard:
```
https://engagelively.github.io/galyleo-dashboard/?dashboard=<url-to-.gd.json>
```
