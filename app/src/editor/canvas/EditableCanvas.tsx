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
import { morphsAsDict } from '../utils/specMutations';
import { computeCanvasBounds } from '../../utils/morphicStyles';
import type { MorphicProperties, MorphDescriptor } from '../../types/dashboard';
import type { WidgetKind } from '../types';

export function EditableCanvas() {
  const spec = useDashboardStore(s => s.spec);
  const mode = useEditorStore(s => s.mode);
  const selectedId = useEditorStore(s => s.selectedId);
  const selectedKind = useEditorStore(s => s.selectedKind);
  const selectWidget = useEditorStore(s => s.selectWidget);

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
          }}
          onClick={() => selectWidget(null, null)}
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
