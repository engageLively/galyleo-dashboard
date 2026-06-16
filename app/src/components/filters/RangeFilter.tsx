import { useDashboardStore } from '../../store/dashboardStore';
import type { RangeFilterSavedForm } from '../../types/dashboard';
import type { InRangeFilterValue } from '../../types/dashboard';

interface Props {
  filterName: string;
  savedForm: RangeFilterSavedForm;
}

export function RangeFilter({ filterName, savedForm }: Props) {
  const filterValues = useDashboardStore(s => s.filterValues);
  const setFilterValue = useDashboardStore(s => s.setFilterValue);

  const minBound = savedForm.min_val ?? savedForm.minVal ?? 0;
  const maxBound = savedForm.max_val ?? savedForm.maxVal ?? 100;

  const current = filterValues[filterName] as InRangeFilterValue | undefined;
  const lo = current?.min_val ?? (savedForm.low_selection ?? minBound);
  const hi = current?.max_val ?? (savedForm.high_selection ?? maxBound);

  function setLo(v: number) {
    setFilterValue(filterName, {
      operator: 'IN_RANGE',
      column: savedForm.columnName,
      min_val: Math.min(v, hi),
      max_val: hi,
    });
  }
  function setHi(v: number) {
    setFilterValue(filterName, {
      operator: 'IN_RANGE',
      column: savedForm.columnName,
      min_val: lo,
      max_val: Math.max(v, lo),
    });
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, padding: '0 4px', boxSizing: 'border-box', fontSize: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{lo}</span><span>{hi}</span>
      </div>
      <input type="range" min={minBound} max={maxBound} value={lo}
        onChange={e => setLo(Number(e.target.value))} style={{ width: '100%' }} />
      <input type="range" min={minBound} max={maxBound} value={hi}
        onChange={e => setHi(Number(e.target.value))} style={{ width: '100%' }} />
    </div>
  );
}
