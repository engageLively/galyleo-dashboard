/**
 * Dispatcher component for filter widgets.
 *
 * Reads `filterType` from `savedForm` and renders the appropriate filter
 * sub-component. Unknown filter types (Boolean, Slider, Date) fall back to
 * a plain text label so the widget's space on the canvas is visible.
 */

import { morphicToCSS } from '../../utils/morphicStyles';
import { SelectFilter } from './SelectFilter';
import { RangeFilter } from './RangeFilter';
import type {
  GalyleoFilterSpec,
  SelectFilterSavedForm,
  RangeFilterSavedForm,
} from '../../types/dashboard';

interface Props {
  /** The filter's key in `dashboard.filters` — used as the store key. */
  filterName: string;
  spec: GalyleoFilterSpec;
}

/**
 * Positions a filter widget on the canvas and delegates rendering to the
 * appropriate sub-component based on `savedForm.filterType`.
 */
export function FilterWidget({ filterName, spec }: Props) {
  const { savedForm } = spec;
  const sf = savedForm as Record<string, unknown>;
  const filterType = sf.filterType as string;

  const style = morphicToCSS(spec.morphicProperties);

  let inner: React.ReactNode = null;

  if (filterType === 'Select' || filterType === 'NumericSelect') {
    inner = <SelectFilter filterName={filterName} savedForm={savedForm as SelectFilterSavedForm} />;
  } else if (filterType === 'Range' || filterType === 'DoubleSlider') {
    inner = <RangeFilter filterName={filterName} savedForm={savedForm as RangeFilterSavedForm} />;
  } else if (filterType === 'List') {
    // Multi-select list — rendered as a <select multiple> for now
    inner = <SelectFilter filterName={filterName} savedForm={savedForm as SelectFilterSavedForm} />;
  } else {
    // Fallback for Boolean, Slider, Date — render a label so the widget is visible
    inner = (
      <div style={{ fontSize: 11, padding: 2, overflow: 'hidden' }}>
        {filterName} ({filterType})
      </div>
    );
  }

  return <div style={style}>{inner}</div>;
}
