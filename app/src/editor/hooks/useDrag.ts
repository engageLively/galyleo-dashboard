/**
 * Pointer-capture drag hook for resize and move handles.
 *
 * Attaches pointermove/pointerup/pointercancel listeners to the element that
 * receives the initial pointerdown, using setPointerCapture so events keep
 * firing even when the pointer leaves the element. No window-level listeners.
 */

import { useCallback, useRef } from 'react';

interface DragOptions {
  /** Called on each pointermove with the total delta from the drag origin. */
  onMove: (dx: number, dy: number) => void;
  /** Called on pointerup with the final delta. */
  onEnd: (dx: number, dy: number) => void;
  /** Called on pointercancel — should restore original state. */
  onCancel?: () => void;
}

/**
 * Returns an `onPointerDown` handler that starts a pointer-capture drag.
 * Attach it to a handle element: `<div onPointerDown={startDrag} />`.
 * The `options` object is read from a ref so it can change each render
 * without recreating the handler.
 */
export function useDrag(options: DragOptions): (e: React.PointerEvent<HTMLElement>) => void {
  const opts = useRef(options);
  opts.current = options;

  return useCallback((e: React.PointerEvent<HTMLElement>) => {
    e.stopPropagation();
    e.preventDefault();

    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);

    const originX = e.clientX;
    const originY = e.clientY;

    function onMove(moveE: PointerEvent) {
      opts.current.onMove(moveE.clientX - originX, moveE.clientY - originY);
    }

    function onUp(upE: PointerEvent) {
      cleanup();
      opts.current.onEnd(upE.clientX - originX, upE.clientY - originY);
    }

    function onCancel() {
      cleanup();
      opts.current.onCancel?.();
    }

    function cleanup() {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
    }

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);
  }, []);
}
