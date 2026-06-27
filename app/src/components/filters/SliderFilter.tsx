import { useState, useEffect } from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import type { SliderFilterSavedForm } from '../../types/dashboard';

interface Props {
  filterName: string;
  savedForm: SliderFilterSavedForm;
}

export function SliderFilter({ filterName, savedForm }: Props) {
  const filterValues = useDashboardStore(s => s.filterValues);
  const setFilterValue = useDashboardStore(s => s.setFilterValue);

  const minBound = savedForm.min_val ?? 0;
  const maxBound = savedForm.max_val ?? 100;

  const current = filterValues[filterName] as { max_val?: number } | undefined;
  const committedValue = current?.max_val ?? savedForm.selection ?? maxBound;

  // Local state tracks the display value while dragging; only commit on release
  const [displayValue, setDisplayValue] = useState(committedValue);

  // Sync display if committed value changes from outside (e.g. reset)
  useEffect(() => { setDisplayValue(committedValue); }, [committedValue]);

  function commitValue(v: number) {
    setFilterValue(filterName, {
      operator: 'IN_RANGE',
      column: savedForm.columnName,
      min_val: minBound,
      max_val: v,
    });
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, padding: '0 4px', boxSizing: 'border-box', fontSize: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{minBound}</span>
        <span style={{ fontWeight: 600 }}>{displayValue}</span>
        <span>{maxBound}</span>
      </div>
      <input
        type="range"
        min={minBound}
        max={maxBound}
        value={displayValue}
        step={savedForm.step ?? 1}
        onChange={e => setDisplayValue(Number(e.target.value))}
        onMouseUp={e => commitValue(Number((e.target as HTMLInputElement).value))}
        onTouchEnd={e => commitValue(Number((e.target as HTMLInputElement).value))}
        style={{ width: '100%' }}
      />
    </div>
  );
}
