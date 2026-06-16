import type { SelectFilterSavedForm } from '../../types/dashboard';
import type { InListFilterValue } from '../../types/dashboard';
import { useDashboardStore } from '../../store/dashboardStore';

interface Props {
  filterName: string;
  savedForm: SelectFilterSavedForm;
}

export function SelectFilter({ filterName, savedForm }: Props) {
  const filterValues = useDashboardStore(s => s.filterValues);
  const setFilterValue = useDashboardStore(s => s.setFilterValue);

  const currentFilter = filterValues[filterName] as InListFilterValue | undefined;
  const currentValue = currentFilter?.values[0] ?? savedForm.selection;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const raw = e.target.value;
    const value = savedForm.isString ? raw : (isNaN(Number(raw)) ? raw : Number(raw));
    setFilterValue(filterName, {
      operator: 'IN_LIST',
      column: savedForm.columnName,
      values: [value],
    });
  }

  return (
    <select
      value={String(currentValue)}
      onChange={handleChange}
      style={{ width: '100%', height: '100%', fontSize: '13px', cursor: 'pointer' }}
    >
      {savedForm.choices.map(choice => (
        <option key={String(choice.value)} value={String(choice.value)}>
          {choice.string}
        </option>
      ))}
    </select>
  );
}
