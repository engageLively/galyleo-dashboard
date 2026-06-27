/**
 * Pure functions that produce a new GalyleoDashboard from the current one.
 *
 * None of these functions mutate their input. All return a structurally-shared
 * copy (only the changed subtree is cloned). Call via dashboardStore.patchSpec()
 * for position/style/content changes; use loadDashboardFromSpec() after
 * mutations that add or remove tables or views (data manager must rebuild).
 */

import type {
  GalyleoDashboard,
  GalyleoChartSpec,
  GalyleoFilterSpec,
  GalyleoTableSpec,
  GalyleoViewSpec,
  MorphDescriptor,
  MorphicProperties,
} from '../../types/dashboard';
import type { WidgetKind } from '../types';

// ---- Morph dict helpers ----

/** Normalise spec.morphs to a name-keyed dict (handles both array and dict). */
export function morphsAsDict(spec: GalyleoDashboard): Record<string, MorphDescriptor> {
  const m = spec.morphs;
  if (!m) return {};
  if (Array.isArray(m)) {
    const dict: Record<string, MorphDescriptor> = {};
    for (const item of m) dict[item.name] = item;
    return dict;
  }
  return m as Record<string, MorphDescriptor>;
}

// ---- MorphicProperties patch ----

/** Shallow-merge `patch` into the morphicProperties of the named widget. */
export function updateMorphicProps(
  spec: GalyleoDashboard,
  id: string,
  kind: WidgetKind,
  patch: Partial<MorphicProperties>,
): GalyleoDashboard {
  if (kind === 'chart') {
    const item = spec.charts[id];
    if (!item) return spec;
    return {
      ...spec,
      charts: { ...spec.charts, [id]: { ...item, morphicProperties: { ...item.morphicProperties, ...patch } } },
    };
  }
  if (kind === 'filter') {
    const item = spec.filters[id];
    if (!item) return spec;
    return {
      ...spec,
      filters: { ...spec.filters, [id]: { ...item, morphicProperties: { ...item.morphicProperties, ...patch } } },
    };
  }
  const dict = morphsAsDict(spec);
  const item = dict[id];
  if (!item) return spec;
  return { ...spec, morphs: { ...dict, [id]: { ...item, morphicProperties: { ...item.morphicProperties, ...patch } } } };
}

// ---- Position / size / rotation ----

export function moveWidget(
  spec: GalyleoDashboard, id: string, kind: WidgetKind, x: number, y: number,
): GalyleoDashboard {
  return updateMorphicProps(spec, id, kind, { position: { x, y } });
}

export function resizeWidget(
  spec: GalyleoDashboard, id: string, kind: WidgetKind,
  w: number, h: number, x?: number, y?: number,
): GalyleoDashboard {
  const patch: Partial<MorphicProperties> = { extent: { x: w, y: h } };
  if (x !== undefined && y !== undefined) patch.position = { x, y };
  return updateMorphicProps(spec, id, kind, patch);
}

export function rotateWidget(
  spec: GalyleoDashboard, id: string, kind: WidgetKind, angle: number,
): GalyleoDashboard {
  return updateMorphicProps(spec, id, kind, { rotation: angle });
}

// ---- Widget deletion ----

export function deleteWidget(
  spec: GalyleoDashboard, id: string, kind: WidgetKind,
): GalyleoDashboard {
  if (kind === 'chart') {
    const { [id]: _, ...charts } = spec.charts;
    return { ...spec, charts };
  }
  if (kind === 'filter') {
    const { [id]: _, ...filters } = spec.filters;
    return { ...spec, filters };
  }
  const dict = morphsAsDict(spec);
  const { [id]: _, ...rest } = dict;
  return { ...spec, morphs: rest };
}

// ---- Z-ordering (morphs only; charts/filters have no explicit z-order) ----

function reorderMorphs(
  dict: Record<string, MorphDescriptor>,
  id: string,
  toFront: boolean,
): Record<string, MorphDescriptor> {
  const entries = Object.entries(dict);
  const idx = entries.findIndex(([k]) => k === id);
  if (idx < 0) return dict;
  const [entry] = entries.splice(idx, 1);
  if (toFront) entries.push(entry); else entries.unshift(entry);
  return Object.fromEntries(entries);
}

export function bringToFront(spec: GalyleoDashboard, id: string): GalyleoDashboard {
  return { ...spec, morphs: reorderMorphs(morphsAsDict(spec), id, true) };
}

export function sendToBack(spec: GalyleoDashboard, id: string): GalyleoDashboard {
  return { ...spec, morphs: reorderMorphs(morphsAsDict(spec), id, false) };
}

// ---- Morph add / update ----

export function addMorphDescriptor(
  spec: GalyleoDashboard, morph: MorphDescriptor,
): GalyleoDashboard {
  const dict = morphsAsDict(spec);
  return { ...spec, morphs: { ...dict, [morph.name]: morph } };
}

export function updateMorphDescriptor(
  spec: GalyleoDashboard, name: string, patch: Partial<MorphDescriptor>,
): GalyleoDashboard {
  const dict = morphsAsDict(spec);
  if (!dict[name]) return spec;
  return { ...spec, morphs: { ...dict, [name]: { ...dict[name], ...patch } } };
}

// ---- Charts ----

export function addChart(
  spec: GalyleoDashboard, name: string, chartSpec: GalyleoChartSpec,
): GalyleoDashboard {
  return { ...spec, charts: { ...spec.charts, [name]: chartSpec } };
}

export function removeChart(spec: GalyleoDashboard, name: string): GalyleoDashboard {
  const { [name]: _, ...charts } = spec.charts;
  return { ...spec, charts };
}

export function updateChart(
  spec: GalyleoDashboard, name: string, patch: Partial<GalyleoChartSpec>,
): GalyleoDashboard {
  const item = spec.charts[name];
  if (!item) return spec;
  return { ...spec, charts: { ...spec.charts, [name]: { ...item, ...patch } } };
}

// ---- Filters ----

export function addFilter(
  spec: GalyleoDashboard, name: string, filterSpec: GalyleoFilterSpec,
): GalyleoDashboard {
  return { ...spec, filters: { ...spec.filters, [name]: filterSpec } };
}

export function removeFilter(spec: GalyleoDashboard, name: string): GalyleoDashboard {
  const { [name]: _, ...filters } = spec.filters;
  return { ...spec, filters };
}

export function updateFilter(
  spec: GalyleoDashboard, name: string, patch: Partial<GalyleoFilterSpec>,
): GalyleoDashboard {
  const item = spec.filters[name];
  if (!item) return spec;
  return { ...spec, filters: { ...spec.filters, [name]: { ...item, ...patch } } };
}

// ---- Views ----

export function addView(
  spec: GalyleoDashboard, name: string, viewSpec: GalyleoViewSpec,
): GalyleoDashboard {
  return { ...spec, views: { ...spec.views, [name]: viewSpec } };
}

export function removeView(spec: GalyleoDashboard, name: string): GalyleoDashboard {
  const { [name]: _, ...views } = spec.views;
  return { ...spec, views };
}

export function updateView(
  spec: GalyleoDashboard, name: string, patch: Partial<GalyleoViewSpec>,
): GalyleoDashboard {
  const item = spec.views[name];
  if (!item) return spec;
  return { ...spec, views: { ...spec.views, [name]: { ...item, ...patch } } };
}

// ---- Tables ----

export function addTable(
  spec: GalyleoDashboard, name: string, tableSpec: GalyleoTableSpec,
): GalyleoDashboard {
  return { ...spec, tables: { ...spec.tables, [name]: tableSpec } };
}

/**
 * Remove a table and all views that reference it.
 * Charts that reference removed views are also removed.
 */
export function removeTable(spec: GalyleoDashboard, name: string): GalyleoDashboard {
  const { [name]: _, ...tables } = spec.tables;

  const removedViews = new Set<string>();
  const views: Record<string, GalyleoViewSpec> = {};
  for (const [vname, vspec] of Object.entries(spec.views)) {
    if (vspec.table === name) removedViews.add(vname);
    else views[vname] = vspec;
  }

  const charts: Record<string, GalyleoChartSpec> = {};
  for (const [cname, cspec] of Object.entries(spec.charts)) {
    if (!removedViews.has(cspec.viewOrTable)) charts[cname] = cspec;
  }

  return { ...spec, tables, views, charts };
}

// ---- Morph factory helpers (for drawing tools) ----

let _morphCounter = 1;

function nextMorphName(prefix: string): string {
  return `${prefix}_${_morphCounter++}`;
}

function defaultMorphicProperties(
  x: number, y: number, w: number, h: number,
): MorphicProperties {
  return {
    position: { x, y },
    extent: { x: w, y: h },
    rotation: 0,
    scale: 1,
    opacity: 1,
    clipMode: 'visible',
    fill: 'rgba(255,255,255,0)',
    border: { style: 'solid', width: 0, color: {}, radius: 0 },
    origin: { x: 0, y: 0 },
  };
}

export function newRectangleMorph(x: number, y: number, w: number, h: number): MorphDescriptor {
  return {
    type: 'Rectangle',
    name: nextMorphName('rect'),
    morphIndex: 0,
    morphicProperties: {
      ...defaultMorphicProperties(x, y, w, h),
      fill: 'rgba(255,255,255,1)',
      border: { style: 'solid', width: 1, color: { all: 'rgba(0,0,0,1)' }, radius: 0 },
    },
  };
}

export function newEllipseMorph(x: number, y: number, w: number, h: number): MorphDescriptor {
  return {
    type: 'Ellipse',
    name: nextMorphName('ellipse'),
    morphIndex: 0,
    morphicProperties: {
      ...defaultMorphicProperties(x, y, w, h),
      fill: 'rgba(255,255,255,0)',
      border: { style: 'solid', width: 1, color: { all: 'rgba(0,0,0,1)' }, radius: 0 },
    },
  };
}

const PLACEHOLDER_IMAGE_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E" +
  "%3Crect width='400' height='300' fill='%23cccccc'/%3E" +
  "%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' " +
  "fill='%23666' font-size='28' font-family='sans-serif'%3EImage%3C/text%3E%3C/svg%3E";

export function newImageMorph(x: number, y: number, w: number, h: number): MorphDescriptor {
  return {
    type: 'Image',
    name: nextMorphName('image'),
    morphIndex: 0,
    imageUrl: PLACEHOLDER_IMAGE_URL,
    morphicProperties: defaultMorphicProperties(x, y, w, h),
  };
}

export function newTextMorph(x: number, y: number, w: number, h: number): MorphDescriptor {
  return {
    type: 'Text',
    name: nextMorphName('text'),
    morphIndex: 0,
    textString: 'Text',
    textProperties: { fontSize: 16, fontWeight: 'normal', fontStyle: 'normal', color: '#000000', textAlign: 'left', fontFamily: 'sans-serif' },
    morphicProperties: defaultMorphicProperties(x, y, w, h),
  };
}
