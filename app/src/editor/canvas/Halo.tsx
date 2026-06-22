/**
 * Selection overlay rendered over the currently selected widget in edit mode.
 *
 * Draws a blue selection border and positions resize handles, a move handle,
 * a trash handle, and a z-order context menu handle around the widget.
 * All coordinates are relative to the EditableCanvas overlay div, which shares
 * the same top-left origin as DashboardViewer's canvas div.
 */

import { useState } from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { getMorphicProps } from '../../store/editorStore';
import type { WidgetKind, ResizeHandle } from '../types';
import { ResizeHaloHandle, MoveHaloHandle, TrashHaloHandle, MenuHaloHandle, RotateHaloHandle } from './HaloHandle';

const RESIZE_HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

interface Props {
  id: string;
  kind: WidgetKind;
}

export function Halo({ id, kind }: Props) {
  const spec = useDashboardStore(s => s.spec);
  const [menuOpen, setMenuOpen] = useState(false);

  if (!spec) return null;

  const mp = getMorphicProps(spec, id, kind);
  if (!mp) return null;

  const x = mp.position.x;
  const y = mp.position.y;
  const w = mp.extent.x;
  const h = mp.extent.y;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        pointerEvents: 'none',  // container passes through; handles re-enable
        zIndex: 1000,
      }}
      // Close context menu when clicking elsewhere
      onClick={() => setMenuOpen(false)}
    >
      {/* Selection border */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: '2px solid #4A90D9',
          borderRadius: 1,
          pointerEvents: 'none',
          boxSizing: 'border-box',
        }}
      />

      {/* Top action handles (above the widget) */}
      <MenuHaloHandle
        widgetId={id}
        kind={kind}
        showMenu={menuOpen}
        onToggleMenu={() => setMenuOpen(v => !v)}
      />
      <MoveHaloHandle widgetId={id} kind={kind} morphX={x} morphY={y} w={w} />
      <TrashHaloHandle widgetId={id} kind={kind} w={w} />

      {/* 8 resize handles */}
      {RESIZE_HANDLES.map(handle => (
        <ResizeHaloHandle
          key={handle}
          handle={handle}
          widgetId={id}
          kind={kind}
          w={w}
          h={h}
          morphX={x}
          morphY={y}
        />
      ))}

      {/* Rotate knob — bottom-right corner */}
      <RotateHaloHandle widgetId={id} kind={kind} w={w} h={h} rotation={mp.rotation ?? 0} />
    </div>
  );
}
