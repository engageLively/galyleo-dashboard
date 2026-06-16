/**
 * Shared types for the dashboard editor (not used by the viewer).
 */

import type { GalyleoDashboard } from '../types/dashboard';

export type DialogId =
  | 'filterEditor'
  | 'viewCreator'
  | 'viewEditor'
  | 'chartCreator'
  | 'bugReport'
  | 'publish'
  | 'fileLoad'
  | 'fileSaveAs'
  | 'fileRename';

/** Which edge or corner a resize handle represents. */
export type ResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

/** Which collection a selected widget lives in. */
export type WidgetKind = 'chart' | 'filter' | 'morph';

/** State captured at the start of a drag-to-move gesture. */
export interface DragState {
  widgetId: string;
  kind: WidgetKind;
  /** Pointer position when the drag started, in canvas coords. */
  pointerOrigin: { x: number; y: number };
  /** Widget position when the drag started. */
  widgetOrigin: { x: number; y: number };
}

/** State captured at the start of a resize gesture. */
export interface ResizeState {
  widgetId: string;
  kind: WidgetKind;
  handle: ResizeHandle;
  pointerOrigin: { x: number; y: number };
  /** Widget bounds when the resize started. */
  widgetOrigin: { x: number; y: number; w: number; h: number };
}

/** Undo/redo snapshot entry. */
export interface HistoryEntry {
  spec: GalyleoDashboard;
}
