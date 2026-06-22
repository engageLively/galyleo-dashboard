/**
 * Individual handle rendered by Halo.
 *
 * Handles fall into two categories:
 * - Resize handles (n, ne, e, se, s, sw, w, nw): start a resize gesture
 * - Action handles (move, trash, menu): trigger immediate actions
 *
 * All are absolutely positioned within the Halo container, which is itself
 * absolutely positioned over the selected widget.
 */

import { useRef } from 'react';
import type { ResizeHandle, WidgetKind } from '../types';
import { useDrag } from '../hooks/useDrag';
import { useEditorStore } from '../../store/editorStore';
import { useDashboardStore } from '../../store/dashboardStore';
import { deleteWidget, bringToFront, sendToBack, rotateWidget } from '../utils/specMutations';

const HANDLE_SIZE = 8;
const HANDLE_BORDER = '2px solid #4A90D9';

/** CSS cursor for each resize handle direction. */
const RESIZE_CURSORS: Record<ResizeHandle, string> = {
  n: 'n-resize', ne: 'ne-resize', e: 'e-resize', se: 'se-resize',
  s: 's-resize', sw: 'sw-resize', w: 'w-resize', nw: 'nw-resize',
};

/** Absolute CSS positioning for resize handles relative to the selection border div. */
function resizeHandleStyle(h: ResizeHandle, w: number, height: number): React.CSSProperties {
  const cx = h.includes('e') ? w : h.includes('w') ? 0 : w / 2;
  const cy = h.includes('s') ? height : h.includes('n') ? 0 : height / 2;
  return {
    position: 'absolute',
    left: cx,
    top: cy,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    transform: 'translate(-50%, -50%)',
    background: '#fff',
    border: HANDLE_BORDER,
    borderRadius: 1,
    cursor: RESIZE_CURSORS[h],
    pointerEvents: 'all',
    zIndex: 1,
  };
}

// ---- Resize handle ----

interface ResizeHandleProps {
  handle: ResizeHandle;
  widgetId: string;
  kind: WidgetKind;
  /** Widget width in pixels. */
  w: number;
  /** Widget height in pixels. */
  h: number;
  morphX: number;
  morphY: number;
}

export function ResizeHaloHandle({ handle, widgetId, kind, w, h, morphX, morphY }: ResizeHandleProps) {
  const beginResize = useEditorStore(s => s.beginResize);
  const updateResize = useEditorStore(s => s.updateResize);
  const endResize = useEditorStore(s => s.endResize);
  const cancelResize = useEditorStore(s => s.cancelResize);

  const startDrag = useDrag({
    onMove: (dx, dy) => updateResize({ dx, dy }),
    onEnd: () => endResize(),
    onCancel: () => cancelResize(),
  });

  function onPointerDown(e: React.PointerEvent<HTMLElement>) {
    beginResize({ widgetId, kind, handle, pointerOrigin: { x: e.clientX, y: e.clientY }, widgetOrigin: { x: morphX, y: morphY, w, h } });
    startDrag(e);
  }

  return <div style={resizeHandleStyle(handle, w, h)} onPointerDown={onPointerDown} />;
}

// ---- Move handle ----

interface MoveHandleProps {
  widgetId: string;
  kind: WidgetKind;
  morphX: number;
  morphY: number;
  w: number;
}

export function MoveHaloHandle({ widgetId, kind, morphX, morphY, w }: MoveHandleProps) {
  const beginDrag = useEditorStore(s => s.beginDrag);
  const updateDrag = useEditorStore(s => s.updateDrag);
  const endDrag = useEditorStore(s => s.endDrag);
  const cancelDrag = useEditorStore(s => s.cancelDrag);

  const startDrag = useDrag({
    onMove: (dx, dy) => updateDrag({ dx, dy }),
    onEnd: () => endDrag(),
    onCancel: () => cancelDrag(),
  });

  function onPointerDown(e: React.PointerEvent<HTMLElement>) {
    beginDrag({ widgetId, kind, pointerOrigin: { x: e.clientX, y: e.clientY }, widgetOrigin: { x: morphX, y: morphY } });
    startDrag(e);
  }

  return (
    <div
      onPointerDown={onPointerDown}
      title="Move"
      style={{
        position: 'absolute',
        left: w / 2,
        top: 0,
        transform: 'translate(-50%, -100%)',
        width: 20,
        height: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#4A90D9',
        borderRadius: 3,
        cursor: 'move',
        color: '#fff',
        fontSize: 13,
        pointerEvents: 'all',
        userSelect: 'none',
        marginTop: -2,
      }}
    >
      ✥
    </div>
  );
}

// ---- Trash handle ----

interface TrashHandleProps {
  widgetId: string;
  kind: WidgetKind;
  w: number;
}

export function TrashHaloHandle({ widgetId, kind, w }: TrashHandleProps) {
  const selectWidget = useEditorStore(s => s.selectWidget);
  const pushUndo = useEditorStore(s => s.pushUndo);
  const patchSpec = useDashboardStore(s => s.patchSpec);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    pushUndo();
    patchSpec(spec => deleteWidget(spec, widgetId, kind));
    selectWidget(null, null);
  }

  return (
    <div
      onClick={handleClick}
      title="Delete"
      style={{
        position: 'absolute',
        left: w,
        top: 0,
        transform: 'translate(4px, -100%)',
        width: 20,
        height: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#e53935',
        borderRadius: 3,
        cursor: 'pointer',
        color: '#fff',
        fontSize: 13,
        pointerEvents: 'all',
        userSelect: 'none',
        marginTop: -2,
      }}
    >
      🗑
    </div>
  );
}

// ---- Context menu handle (z-order) ----

interface MenuHandleProps {
  widgetId: string;
  kind: WidgetKind;
  showMenu: boolean;
  onToggleMenu: () => void;
}

export function MenuHaloHandle({ widgetId, kind, showMenu, onToggleMenu }: MenuHandleProps) {
  const pushUndo = useEditorStore(s => s.pushUndo);
  const patchSpec = useDashboardStore(s => s.patchSpec);

  function handleOrder(action: 'front' | 'back') {
    if (kind !== 'morph') return;
    pushUndo();
    patchSpec(spec => action === 'front' ? bringToFront(spec, widgetId) : sendToBack(spec, widgetId));
    onToggleMenu();
  }

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transform: 'translate(-100%, -100%)', pointerEvents: 'all', marginTop: -2 }}>
      <div
        onClick={e => { e.stopPropagation(); onToggleMenu(); }}
        title="Order"
        style={{
          width: 20, height: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#555', borderRadius: 3, cursor: 'pointer',
          color: '#fff', fontSize: 11, userSelect: 'none',
        }}
      >
        ☰
      </div>
      {showMenu && (
        <div style={{
          position: 'absolute', top: 22, left: 0,
          background: '#fff', border: '1px solid #ccc', borderRadius: 4,
          boxShadow: '0 2px 8px rgba(0,0,0,.2)', zIndex: 10,
          minWidth: 120, fontSize: 12,
        }}>
          {kind === 'morph' && (
            <>
              <MenuItem label="Bring to Front" onClick={() => handleOrder('front')} />
              <MenuItem label="Send to Back" onClick={() => handleOrder('back')} />
            </>
          )}
          {kind !== 'morph' && (
            <div style={{ padding: '6px 10px', color: '#999' }}>No order options</div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Rotate handle ----

interface RotateHandleProps {
  widgetId: string;
  kind: WidgetKind;
  w: number;
  h: number;
  rotation: number;
}

export function RotateHaloHandle({ widgetId, kind, w, h, rotation }: RotateHandleProps) {
  const patchSpec = useDashboardStore(s => s.patchSpec);
  const divRef = useRef<HTMLDivElement>(null);

  const deg = Math.round(((rotation * 180 / Math.PI) % 360 + 360) % 360);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.preventDefault();

    // Snapshot pre-rotation spec for undo (pushed at gesture end)
    const preRotateSpec = useDashboardStore.getState().spec!;

    // Center of the halo = center of the widget in client coords
    const haloEl = divRef.current?.parentElement;
    if (!haloEl) return;
    const rect = haloEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
    const startRotation = rotation;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    function onMove(ev: PointerEvent) {
      const a = Math.atan2(ev.clientY - cy, ev.clientX - cx);
      patchSpec(s => rotateWidget(s, widgetId, kind, startRotation + (a - startAngle)));
    }

    function onUp() {
      // Push pre-rotate snapshot to undo stack (mirrors endDrag pattern)
      useEditorStore.setState(s => ({
        undoStack: [...s.undoStack.slice(-49), preRotateSpec],
        redoStack: [],
      }));
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  return (
    <div
      ref={divRef}
      onPointerDown={onPointerDown}
      title="Rotate"
      style={{
        position: 'absolute',
        left: w,
        top: h,
        transform: 'translate(4px, 4px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'crosshair',
        pointerEvents: 'all',
        userSelect: 'none',
        zIndex: 2,
      }}
    >
      <div style={{ fontSize: 8, color: '#4A90D9', lineHeight: 1, marginBottom: 2 }}>{deg}°</div>
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        background: '#4A90D9', border: '2px solid #fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 11,
        boxShadow: '0 1px 3px rgba(0,0,0,.3)',
      }}>↻</div>
    </div>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div
      onClick={e => { e.stopPropagation(); onClick(); }}
      style={{ padding: '6px 10px', cursor: 'pointer' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#f0f4ff')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      {label}
    </div>
  );
}
