/**
 * Zustand store for dashboard editor state.
 *
 * Owns all transient editor state: mode, selection, drag/resize gestures,
 * undo/redo history, active dialog, and the active I/O backend.
 * The canonical spec lives in dashboardStore; this store mutates it via
 * dashboardStore.patchSpec() and dashboardStore.loadDashboardFromSpec().
 */

import { create } from 'zustand';
import { createIO } from '../editor/io/createIO';
import type { DashboardIO } from '../editor/io/ioInterface';
import type {
  ActiveTool,
  DialogId,
  ResizeHandle,
  WidgetKind,
  DragState,
  ResizeState,
} from '../editor/types';
import type { GalyleoDashboard } from '../types/dashboard';
import {
  moveWidget,
  resizeWidget,
  morphsAsDict,
} from '../editor/utils/specMutations';
import { useDashboardStore } from './dashboardStore';

const UNDO_LIMIT = 50;

interface EditorState {
  /** 'edit' = selection/drag active; 'interact' = filter widgets respond to clicks */
  mode: 'interact' | 'edit';
  selectedId: string | null;
  selectedKind: WidgetKind | null;

  sidebarTab: 'tables' | 'filters' | 'views' | 'charts';
  sidebarOpen: boolean;

  dragState: DragState | null;
  resizeState: ResizeState | null;

  undoStack: GalyleoDashboard[];
  redoStack: GalyleoDashboard[];

  activeDialog: DialogId | null;
  dialogContext: unknown;

  activeTool: ActiveTool;

  io: DashboardIO;

  // --- Actions ---

  setMode: (mode: 'interact' | 'edit') => void;
  setActiveTool: (tool: ActiveTool) => void;
  selectWidget: (id: string | null, kind: WidgetKind | null) => void;
  setSidebarTab: (tab: EditorState['sidebarTab']) => void;
  toggleSidebar: () => void;

  /** Push the current spec onto the undo stack before a mutation. */
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;

  beginDrag: (state: DragState) => void;
  updateDrag: (delta: { dx: number; dy: number }) => void;
  /** Commit the drag: write final position via patchSpec and push undo. */
  endDrag: () => void;
  cancelDrag: () => void;

  beginResize: (state: ResizeState) => void;
  updateResize: (delta: { dx: number; dy: number }) => void;
  /** Commit the resize: write final bounds via patchSpec and push undo. */
  endResize: () => void;
  cancelResize: () => void;

  openDialog: (id: DialogId, context?: unknown) => void;
  closeDialog: () => void;
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  mode: 'edit',
  selectedId: null,
  selectedKind: null,
  sidebarTab: 'charts',
  sidebarOpen: true,
  dragState: null,
  resizeState: null,
  undoStack: [],
  redoStack: [],
  activeDialog: null,
  dialogContext: null,
  activeTool: 'select',
  io: createIO(),

  setMode: (mode) => set({ mode, selectedId: null, selectedKind: null }),
  setActiveTool: (tool) => set({ activeTool: tool }),

  selectWidget: (id, kind) => set({ selectedId: id, selectedKind: kind }),

  setSidebarTab: (tab) => set({ sidebarTab: tab }),

  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

  pushUndo: () => {
    const spec = useDashboardStore.getState().spec;
    if (!spec) return;
    set(s => ({
      undoStack: [...s.undoStack.slice(-(UNDO_LIMIT - 1)), spec],
      redoStack: [],
    }));
  },

  undo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return;
    const currentSpec = useDashboardStore.getState().spec;
    const prev = undoStack[undoStack.length - 1];
    set(s => ({
      undoStack: s.undoStack.slice(0, -1),
      redoStack: currentSpec ? [...s.redoStack, currentSpec] : s.redoStack,
    }));
    useDashboardStore.getState().patchSpec(() => prev);
  },

  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return;
    const currentSpec = useDashboardStore.getState().spec;
    const next = redoStack[redoStack.length - 1];
    set(s => ({
      redoStack: s.redoStack.slice(0, -1),
      undoStack: currentSpec ? [...s.undoStack, currentSpec] : s.undoStack,
    }));
    useDashboardStore.getState().patchSpec(() => next);
  },

  beginDrag: (state) => set({ dragState: state }),

  updateDrag: ({ dx, dy }) => {
    const { dragState } = get();
    if (!dragState) return;
    const { widgetOrigin, widgetId, kind } = dragState;
    const x = widgetOrigin.x + dx;
    const y = widgetOrigin.y + dy;
    useDashboardStore.getState().patchSpec(spec =>
      moveWidget(spec, widgetId, kind, x, y)
    );
  },

  endDrag: () => {
    const { dragState } = get();
    if (!dragState) return;
    // Position has been applied live during updateDrag. Build the pre-drag
    // snapshot (widget at widgetOrigin) so undo can restore it.
    const { widgetId, kind, widgetOrigin } = dragState;
    const currentSpec = useDashboardStore.getState().spec;
    if (currentSpec) {
      const preDrag = moveWidget(currentSpec, widgetId, kind, widgetOrigin.x, widgetOrigin.y);
      set(s => ({
        dragState: null,
        undoStack: [...s.undoStack.slice(-(UNDO_LIMIT - 1)), preDrag],
        redoStack: [],
      }));
    } else {
      set({ dragState: null });
    }
  },

  cancelDrag: () => {
    const { dragState } = get();
    if (!dragState) return;
    const { widgetId, kind, widgetOrigin } = dragState;
    useDashboardStore.getState().patchSpec(spec =>
      moveWidget(spec, widgetId, kind, widgetOrigin.x, widgetOrigin.y)
    );
    set({ dragState: null });
  },

  beginResize: (state) => set({ resizeState: state }),

  updateResize: ({ dx, dy }) => {
    const { resizeState } = get();
    if (!resizeState) return;
    const { widgetId, kind, handle, widgetOrigin } = resizeState;
    const bounds = computeResizeBounds(widgetOrigin, handle, dx, dy);
    useDashboardStore.getState().patchSpec(spec =>
      applyBounds(spec, widgetId, kind, bounds)
    );
  },

  endResize: () => {
    const { resizeState } = get();
    if (!resizeState) return;
    const { widgetId, kind, widgetOrigin } = resizeState;
    const preDrag = useDashboardStore.getState().spec;
    if (preDrag) {
      const snapshot = applyBounds(preDrag, widgetId, kind, {
        x: widgetOrigin.x, y: widgetOrigin.y,
        w: widgetOrigin.w, h: widgetOrigin.h,
      });
      set(s => ({
        resizeState: null,
        undoStack: [...s.undoStack.slice(-(UNDO_LIMIT - 1)), snapshot],
        redoStack: [],
      }));
    } else {
      set({ resizeState: null });
    }
  },

  cancelResize: () => {
    const { resizeState } = get();
    if (!resizeState) return;
    const { widgetId, kind, widgetOrigin } = resizeState;
    useDashboardStore.getState().patchSpec(spec =>
      applyBounds(spec, widgetId, kind, {
        x: widgetOrigin.x, y: widgetOrigin.y,
        w: widgetOrigin.w, h: widgetOrigin.h,
      })
    );
    set({ resizeState: null });
  },

  openDialog: (id, context = null) => set({ activeDialog: id, dialogContext: context }),

  closeDialog: () => set({ activeDialog: null, dialogContext: null }),
}));

// ---- Internal helpers ----

export function getMorphicProps(spec: GalyleoDashboard, id: string, kind: WidgetKind) {
  if (kind === 'chart') return spec.charts[id]?.morphicProperties;
  if (kind === 'filter') return spec.filters[id]?.morphicProperties;
  return morphsAsDict(spec)[id]?.morphicProperties;
}

function applyBounds(
  spec: GalyleoDashboard,
  id: string,
  kind: WidgetKind,
  bounds: { x: number; y: number; w: number; h: number },
): GalyleoDashboard {
  return resizeWidget(spec, id, kind, bounds.w, bounds.h, bounds.x, bounds.y);
}

function computeResizeBounds(
  origin: { x: number; y: number; w: number; h: number },
  handle: ResizeHandle,
  dx: number,
  dy: number,
): { x: number; y: number; w: number; h: number } {
  let { x, y, w, h } = origin;
  const MIN = 20;

  if (handle.includes('e')) w = Math.max(MIN, w + dx);
  if (handle.includes('s')) h = Math.max(MIN, h + dy);
  if (handle.includes('w')) {
    const newW = Math.max(MIN, w - dx);
    x = x + w - newW;
    w = newW;
  }
  if (handle.includes('n')) {
    const newH = Math.max(MIN, h - dy);
    y = y + h - newH;
    h = newH;
  }

  return { x, y, w, h };
}

