/**
 * Canvas wrapper that adds selection and editing on top of DashboardViewer.
 *
 * In interact mode: DashboardViewer handles all events normally.
 * In edit mode: a transparent overlay captures clicks on each widget (hit zones)
 * to select them, and the Halo renders over the selected widget.
 * Clicking empty canvas deselects.
 *
 * DashboardViewer is left completely unmodified — pointer events are simply
 * disabled on it in edit mode so the overlay layer takes over.
 */

import { useMemo } from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { useEditorStore } from '../../store/editorStore';
import { DashboardViewer } from '../../components/DashboardViewer';
import { Halo } from './Halo';
import {
  morphsAsDict,
  addMorphDescriptor,
  newRectangleMorph,
  newEllipseMorph,
  newTextMorph,
  newImageMorph,
} from '../utils/specMutations';
import { computeCanvasBounds } from '../../utils/morphicStyles';
import type { MorphicProperties, MorphDescriptor } from '../../types/dashboard';
import type { WidgetKind } from '../types';

export function EditableCanvas() {
  const spec = useDashboardStore(s => s.spec);
  const patchSpec = useDashboardStore(s => s.patchSpec);
  const mode = useEditorStore(s => s.mode);
  const selectedId = useEditorStore(s => s.selectedId);
  const selectedKind = useEditorStore(s => s.selectedKind);
  const selectWidget = useEditorStore(s => s.selectWidget);
  const activeTool = useEditorStore(s => s.activeTool);
  const setActiveTool = useEditorStore(s => s.setActiveTool);

  // Compute the same canvas size DashboardViewer uses, so the overlay matches
  const canvasSize = useMemo(() => {
    if (!spec) return { width: 0, height: 0 };
    const allProps: MorphicProperties[] = [
      ...Object.values(spec.charts).map(c => c.morphicProperties),
      ...Object.values(spec.filters).map(f => f.morphicProperties),
      ...Object.values(morphsAsDict(spec)).map((m: MorphDescriptor) => m.morphicProperties),
    ];
    return computeCanvasBounds(allProps);
  }, [spec]);

  const editMode = mode === 'edit';
  const drawingActive = editMode && activeTool !== 'select';

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (drawingActive) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.round(e.clientX - rect.left);
      const y = Math.round(e.clientY - rect.top);
      const morph = activeTool === 'rectangle' ? newRectangleMorph(x, y, 200, 100)
        : activeTool === 'ellipse'   ? newEllipseMorph(x, y, 100, 100)
        : activeTool === 'text'      ? newTextMorph(x, y, 200, 40)
        :                              newImageMorph(x, y, 200, 150);
      patchSpec(spec => addMorphDescriptor(spec, morph));
      selectWidget(morph.name, 'morph');
      setActiveTool('select');
      return;
    }
    selectWidget(null, null);
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Viewer — pointer events disabled in edit mode so the overlay takes over */}
      <div style={{ pointerEvents: editMode ? 'none' : 'auto' }}>
        <DashboardViewer />
      </div>

      {editMode && spec && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: Math.max(canvasSize.width, window.innerWidth),
            height: Math.max(canvasSize.height, window.innerHeight),
            cursor: drawingActive ? 'crosshair' : 'default',
          }}
          onClick={handleCanvasClick}
        >
          {/* Chart hit zones */}
          {Object.entries(spec.charts).map(([name, chartSpec]) => (
            <WidgetHitZone
              key={name}
              id={name}
              kind="chart"
              mp={chartSpec.morphicProperties}
              isSelected={selectedId === name && selectedKind === 'chart'}
              onSelect={selectWidget}
            />
          ))}

          {/* Filter hit zones */}
          {Object.entries(spec.filters).map(([name, filterSpec]) => (
            <WidgetHitZone
              key={name}
              id={name}
              kind="filter"
              mp={filterSpec.morphicProperties}
              isSelected={selectedId === name && selectedKind === 'filter'}
              onSelect={selectWidget}
            />
          ))}

          {/* Morph hit zones */}
          {Object.entries(morphsAsDict(spec)).map(([name, morph]) => (
            <WidgetHitZone
              key={name}
              id={name}
              kind="morph"
              mp={morph.morphicProperties}
              isSelected={selectedId === name && selectedKind === 'morph'}
              onSelect={selectWidget}
            />
          ))}

          {/* Halo renders on top of everything */}
          {selectedId && selectedKind && (
            <Halo id={selectedId} kind={selectedKind} />
          )}
        </div>
      )}
    </div>
  );
}

// ---- Hit zone ----

interface HitZoneProps {
  id: string;
  kind: WidgetKind;
  mp: MorphicProperties;
  isSelected: boolean;
  onSelect: (id: string, kind: WidgetKind) => void;
}

function WidgetHitZone({ id, kind, mp, isSelected, onSelect }: HitZoneProps) {
  const { position, extent } = mp;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    onSelect(id, kind);
  }

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: extent.x,
        height: extent.y,
        cursor: 'pointer',
        // Subtle highlight on hover to show the widget is clickable
        outline: isSelected ? 'none' : undefined,
      }}
      onMouseEnter={e => {
        if (!isSelected) (e.currentTarget as HTMLElement).style.outline = '1px dashed rgba(74,144,217,0.5)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.outline = '';
      }}
    />
  );
}
