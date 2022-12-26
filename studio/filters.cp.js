import { Morph, Icon, TilingLayout, Label } from 'lively.morphic';
import { signal, noUpdate, connect } from 'lively.bindings/index.js';
import { arr, fun } from 'lively.lang';
import { component, part, add } from 'lively.morphic/components/core.js';
import { Color, pt } from 'lively.graphics';
import { Toggle } from './inputs/toggle.cp.js';
import { DatePicker } from './inputs/date.cp.js';
import { DoubleSliderWithValues, SliderWithValue } from './inputs/slider.cp.js';
import { GalyleoDropDownList, GalyleoNumberInput, GalyleoDropDown, galyleoFont } from './shared.cp.js';
import { rect } from 'lively.graphics/geometry-2d.js';

// fixme: turn this into a transparent filter?
// VisualFilter.openInWorld()
const VisualFilter = component({
  name: 'visual filter',
  borderColor: Color.rgb(128, 128, 128),
  borderRadius: 10,
  borderWidth: 1,
  nativeCursor: 'drag',
  draggable: true,
  dropShadow: false,
  extent: pt(103, 44),
  fill: Color.rgba(0, 0, 0, 0.05),
  position: pt(64.9, 294.1),
  reactsToPointer: false,
  layout: new TilingLayout({
    autoResize: true,
    axisAlign: 'center',
    align: 'top',
    // direction: 'topToBottom',
    axis: 'column',
    hugContentsVertically: true,
    hugContentsHorizontally: true,
    orderByIndex: true,
    padding: rect(0, 0, 0, 0),
    resizeSubmorphs: false,
    spacing: 0,
    wrapSubmorphs: false
  })
});

/**
 * A Booleanfilter.  This implements the filter interface, namely:
 * 1.  Signal when the filter is changed through the filterChanged property
 * 2. Have a read-only filter propery which gives the filter itself,
 *    as a JavaScript object, in a form that can be used by
 *    GoogleDataTable.getFilteredRows().  This implements the filter
 *    with a value property.  See:
 *    https://developers.google.com/chart/interactive/docs/reference#methods
 *
 * Properties:
 * 1. filterChanged: fires when the filter has changed value.
 * 2. columnName: the name of the column over which the filter is defined.
 *    Note that the table is not necessarily specified.
 * 3. tableName: the name of the table over which the filter is defined.  Used
 *    for serialization and may be null.
 * This filter is created and initialized in Dashboard.makeFilterMorph
 */
export class BooleanFilterMorph extends Morph {
  static get properties () {
    return {
      columnName: { defaultValue: null },
      tableName: { defaultValue: null },
      filterType: {
        serialize: false,
        get () {
          return 'Boolean';
        }
      },
      widgetType: {
        serialize: false,
        get () {
          return 'toggle';
        }
      },
      part: {
        serialize: false,
        get () {
          return BooleanFilter[Symbol.for('lively-module-meta')]; // eslint-disable-line no-use-before-define
        }
      }
    };
  }

  /**
   * Called as soon as the filter is created.  The
   * columnName and tableName properties is set.
   * @param { string } columnName - The name of the column this filter is over.
   * @param { string } [tableName] - The name of the table used for this list, which could be null. Only used in serialization (persistentForm).
   */
  init (columnName, tableName) {
    this.columnName = columnName;
    this.tableName = tableName;
    const toggle = this.getSubmorphNamed('toggle');
    toggle.state = true;
    connect(toggle, 'state', this, 'signalFilterChanged');
  }

  /**
   * Fire the filterChanged property.  This is called (hardcoded connection) when
   * the pulldown selection changes.
   */
  signalFilterChanged () {
    signal(this, 'filterChanged');
  }

  /**
   * Return the filter as a JavaScript object.  Per the requirement in
   * GoogleDataTable.getFilteredRows(), this must have a value field.  It also
   * has a columnName field, which processing in the Dashboard (see
   * __prepareFilters__) turns into a columnIndex given the identity of the table
   * being used for the filter.
   */
  get filter () {
    return { columnName: this.columnName, value: this.getSubmorphNamed('toggle').state };
  }

  /**
   * Return the filter as a JavaScript object.  Per the requirement in
   * GoogleDataTable.getFilteredRows(), this must have a value field.  It also
   * has a columnName field, which processing in the Dashboard (see
   * _prepareFilters) turns into a columnIndex given the identity of the table
   * being used for the filter.
   */

  get dataManagerFilter () {
    return { column: this.columnName, operator: 'IN_LIST', values: [this.getSubmorphNamed('toggle').state] };
  }

  /**
   * Return a short string describing the filter.  This is used to show the
   * action of the filter in chart titles, etc.
   */
  get filterString () {
    return `${this.columnName} = ${this.getSubmorphNamed('toggle').state}`;
  }

  /**
   * Return the storable version of this filter, for later restoration.  This
   * is used in dashboard store.  Just the parameters to init plus the
   * current selection and the part
   */
  get persistentForm () {
    return {
      part: this.part,
      filterType: this.filterType,
      columnName: this.columnName,
      tableName: this.tableName,
      state: this.getSubmorphNamed('toggle').state
    };
  }

  /**
   * restore from a saved form created in persistentForm, immediately above.
   * This is used in dashboard load.  The sole parameter is an object of the
   * form created in persistentForm.
   * @param { StoredBooleanFilter } savedForm - Persistet form of a boolean filter.
   * @param { string } savedForm.columnName
   * @param { string } savedForm.tabelName
   * @param { boolean } savedForm.state
   */
  restoreFromSavedForm (savedForm) {
    this.init(savedForm.columnName, savedForm.tableName);
    this.signalEnabled = false;
    this.getSubmorphNamed('toggle').state = savedForm.state;
    this.signalEnabled = true;
  }
}

// part(BooleanFilter).openInWorld()
const BooleanFilter = component(VisualFilter, {
  name: 'boolean filter',
  type: BooleanFilterMorph,
  nativeCursor: 'grab',
  submorphs: [
    add(part(Toggle, { name: 'toggle' }))
  ]
});

/**
 * A DateFilter.  This implements the filter interface, namely:
 * 1. Signal when the filter is changed through the filterChanged property
 * 2. Have a read-only filter propery which gives the filter itself,
 *    as a JavaScript object, in a form that can be used by
 *    GoogleDataTable.getFilteredRows().  This implements the filter
 *    with a value property.  See:
 *    https://developers.google.com/chart/interactive/docs/reference#methods
 *
 * Properties:
 * 1. filterChanged: fires when the filter has changed value.
 * 2. columnName: the name of the column over which the filter is defined.
 *    Note that the table is not necessarily specified.
 * 3. tableName: the name of the table over which the filter is defined.  Used
 *    for serialization and may be null.
 * columnName and tableName
 * This filter is created and initialized in Dashboard.makeFilterMorph
 */
export class DateFilterMorph extends Morph {
  static get properties () {
    return {
      columnName: { defaultValue: null },
      tableName: { defaultValue: null },
      filterType: {
        serialize: false,
        get () {
          return 'DateSelect';
        }
      },
      widgetType: {
        serialize: false,
        get () {
          return 'DatePicker';
        }
      },
      part: {
        serialize: false,
        get () {
          return DateFilter[Symbol.for('lively-module-meta')]; // eslint-disable-line no-use-before-define
        }
      }
    };
  }

  /**
   * Called as soon as the filter is created.  The
   * columnName and tableName are set.
   * When the selected date changes, the filterChange signal should in general
   * fire.  This is not the case when we are initializing the date picker, and so
   * to prevent false signals we disable this through the instance variable
   * this.signalEnabled. filterChange only fires when this.signalEnabled = true.
   * So we set to false at the start of this method and set to true when done.
   * @param { string } columnName - the name of the column this filter is over.
   * @param { string } [tableName] - the name of the table used for this list, which could be null. Only used in serialization (persistentForm)
   */
  init (columnName, tableName) {
    this.signalEnabled = false;
    const selector = this.datePicker;
    this.columnName = columnName;
    this.tableName = tableName;
    selector.setDate(new Date());
    this.signalEnabled = true;
  }

  // Called when the selected date changes, through a hardcoded connection

  dateChanged () {
    signal(this, 'filterChanged');
  }

  get datePicker () { return this.getSubmorphNamed('date picker').viewModel; }

  /**
   * Return the filter as a JavaScript object.  Per the requirement in
   * GoogleDataTable.getFilteredRows(), this must have a value field
   * It also has a columnName field, which processing
   * in the Dashboard (see __prepareFilters__) turns into a columnIndex
   * given the identity of the table being used for the filter.
   */
  get filter () {
    return { columnName: this.columnName, value: this.datePicker.selectedDate };
  }

  /**
   * Return the filter as a JavaScript object.  Per the requirement in
   * GoogleDataTable.getFilteredRows(), this must have a value field.  It also
   * has a columnName field, which processing in the Dashboard (see
   * _prepareFilters) turns into a columnIndex given the identity of the table
   * being used for the filter.
   */
  get dataManagerFilter () {
    return { column: this.columnName, operator: 'IN_LIST', values: [this.datePicker.selectedDate] };
  }

  /**
   * Return a short string describing the filter.  This is used to show the
   * action of the filter in chart titles, etc.
   */
  get filterString () {
    return `${this.columnName} == ${this.datePicker.selectedDate}`;
  }

  /**
   * Return the storable version of this filter, for later restoration.  This
   * is used in dashboard store.  Just the parameters to init plus the
   * part and the current choices for min and max
   */
  get persistentForm () {
    return {
      part: this.part,
      tableName: this.tableName,
      filterType: this.filterType,
      columnName: this.columnName,
      selectedDate: this.datePicker.selectedDate
    };
  }

  /**
   * Restore from a saved form created in persistentForm, immediately above.
   * This is used in dashboard load.  The sole parameter is an object of the
   * form created in persistentForm.
   * @param { StoredDateFilter } savedForm - The persistent form of a date filter.
   */
  restoreFromSavedForm (savedForm) {
    this.init(savedForm.columnName, savedForm.tableName);
    const { datePicker } = this;
    noUpdate(() => {
      datePicker.value = datePicker.value;
    });
  }
}

// part(DateFilter).openInWorld()
const DateFilter = component(VisualFilter, {
  name: 'date filter',
  type: DateFilterMorph,
  submorphs: [
    add(part(DatePicker, { name: 'date picker' }))
  ]
});

/**
 * A Slider with a min/max value.  This implements the filter interface, namely:
 * 1. Signal when the filter is changed through the filterChanged property
 * 2. Have a read-only filter propery which gives the filter itself,
 *    as a JavaScript object, in a form that can be used by
 *    GoogleDataTable.getFilteredRows().  This implements the filter
 *    with a minValue and maxValue property.  See:
 *    https://developers.google.com/chart/interactive/docs/reference#methods
 *
 * Properties:
 * 1. filterChanged: fires when the filter has changed value.
 * 2. columnName: the name of the column over which the filter is defined.
 *    Note that the table is not necessarily specified.
 * 3. tableName: the name of the table over which the filter is defined.  Used
 *    for serialization and may be null.
 * 4. minVal:  The minimum value that appears in columns with this name.
 * 5. maxVal: The maximum value that appears in columns with this name.
 * columnName, tableName, minVal, and maxVal are set on initialization.
 * This filter is created and initialized in Dashboard.makeFilterMorph
 */
export class DoubleSliderFilterMorph extends Morph {
  static get properties () {
    return {
      filterChanged: { derived: true, readOnly: true, isSignal: true },
      columnName: { defaultValue: null },
      tableName: { defaultValue: null },
      minValue: { defaultValue: null },
      maxValue: { defaultValue: null },
      signalEnabled: { defaultValue: false },
      filterType: {
        serialize: false,
        get () {
          return 'Range';
        }
      },
      widgetType: {
        serialize: false,
        get () {
          return 'doubleSlider';
        }
      },
      part: {
        serialize: false,
        get () {
          return DoubleSliderFilter[Symbol.for('lively-module-meta')]; // eslint-disable-line no-use-before-define
        }
      }
    };
  }

  get doubleSlider () { return this.getSubmorphNamed('double slider'); }

  /**
   * Called as soon as the filter is created.  The
   * columnName, minVal, and maxVal properties are set.  The two
   * input parts (currently spinners, see part://SystemWidgets/numberField/dark)
   * have their limits set, and initial values set.  The initial value of the
   * min field is the minimum possible value, the initial value of the max field
   * is the maximum possible value.  Finally, the columnName label is set to
   * columnName.
   * When inputs change, the filterChange signal should in general fire.  This
   * is not the case when we are initializing the input fields, and so to prevent
   * false signals we disable this through the instance variable this.signalEnabled.
   * filterChange only fires when this.signalEnabled = true.  So we set to false
   * at the start of this method and set to true when done.
   * @param { string } columnName - The name of the column this filter is over.
   * @param { string|null } tableName - The name of the table used for this list, which could be null.
   * @param { number } minVal - The minimum value this filter can take.
   * @param { number } maxVal -The maximum value this filter can take.
   * @param { number } increment - The amount this slider increments on a move.
   */
  init (columnName, tableName, minVal, maxVal, increment) {
    this.signalEnabled = false;
    const { doubleSlider } = this;
    this.minValue = doubleSlider.minValue = minVal;
    this.maxValue = doubleSlider.maxValue = maxVal;
    this.increment = doubleSlider.increment = increment;
    doubleSlider.range = { min: minVal, max: maxVal };
    this.columnName = columnName;
    this.tableName = tableName;
    this.signalEnabled = true;
    connect(doubleSlider, 'rangeChanged', this, 'signalRangeChanged');
  }

  /**
   * Called when the range on the slider changes, through a hardcoded
   * connection.  Very simple -- just checks to see if the signal is enabled, and
   * if it is, signals that the filter has changed.
   * @todo check to see if we need to add a delay of a few ms to avoid too
   * many events.  The idea would be to set signalEnabled to false, then set a
   * timeout of a few ms, and at the end of that change signalEnabled to true and
   * fire the signal.
   */
  signalRangeChanged () {
    if (this.signalEnabled) {
      this.signalEnabled = false;
      setTimeout(_ => {
        signal(this, 'filterChanged');
        this.signalEnabled = true;
      }, 100);
      // signal(this, 'filterChanged');
    }
  }

  /**
   * Return the filter as a JavaScript object.  Per the requirement in
   * GoogleDataTable.getFilteredRows(), this must have a minValue and a
   * maxValue field.  It also has a columnName field, which processing
   * in the Dashboard (see __prepareFilters__) turns into a columnIndex
   * given the identity of the table being used for the filter.
   */
  get filter () {
    const range = this.doubleSlider.range;
    return { columnName: this.columnName, maxValue: range.max, minValue: range.min };
  }

  /**
   * Return the filter as a JavaScript object to be used by the DataManager.
   * Per the requirement in GalyleoFilter, this must have a min_val and a
   * max_val field.  It also has a column field, with the column name.  The
   * operator is IN_RANGE
   */

  get dataManagerFilter () {
    const range = this.doubleSlider.range;
    return { operator: 'IN_RANGE', column: this.columnName, max_val: range.max, min_val: range.min };
  }

  /**
   * Return a short string describing the filter.  This is used to show the
   * action of the filter in chart titles, etc.
   */
  get filterString () {
    const range = this.doubleSlider.range;
    return `${range.max} >= ${this.columnName} >= ${range.min}`;
  }

  /**
   * Return the storable version of this filter, for later restoration.  This
   * is used in dashboard store.  Just the parameters to init plus the
   * part and the current choices for min and max
   */
  get persistentForm () {
    const { doubleSlider } = this;
    const range = doubleSlider.range;
    return {
      part: this.part,
      tableName: this.tableName,
      filterType: this.filterType,
      columnName: this.columnName,
      minVal: doubleSlider.minValue,
      maxVal: doubleSlider.maxValue,
      min: range.min,
      max: range.max,
      increment: doubleSlider.increment
    };
  }

  /**
   * restore from a saved form created in persistentForm, immediately above.
   * This is used in dashboard load.  The sole parameter is an object of the
   * form created in persistentForm.
   * @param { StoredDoubleSliderFilter } savedForm - The persistent form of a double slider filter.
   */
  restoreFromSavedForm (savedForm) {
    this.init(savedForm.columnName, savedForm.tableName, savedForm.minVal, savedForm.maxVal, savedForm.increment);
    // disable signaling before each set, in case the change handlers
    // re-enable
    this.signalEnabled = false;
    this.increment = savedForm.increment;
    this.doubleSlider.range = { min: savedForm.min, max: savedForm.max };
    this.signalEnabled = true;
  }
}

// part(DoubleSliderFilter).openInWorld()
const DoubleSliderFilter = component(VisualFilter, {
  name: 'double slider filter',
  type: DoubleSliderFilterMorph,
  submorphs: [
    add(part(DoubleSliderWithValues, { name: 'double slider' }))
  ]
});

/**
 * A ListFilter, which implements a Select.
 * This implements the filter interface, namely:
 * 1.  Signal when the filter is changed through the filterChanged property
 * 2. Have a read-only filter propery which gives the filter itself,
 *    as a JavaScript object, in a form that can be used by
 *    GoogleDataTable.getFilteredRows().  This implements the filter
 *    with a value property.  See:
 *    https://developers.google.com/chart/interactive/docs/reference#methods
 *
 * Properties:
 * 1. filterChanged: fires when the filter has changed value.
 * 2. columnName: the name of the column over which the filter is defined.
 *    Note that the table is not necessarily specified.
 * 3. tableName: the name of the table over which the filter is defined.  Used
 *    for serialization and may be null.
 * This filter is created and initialized in Dashboard.makeFilterMorph
 */
export class ListFilterMorph extends Morph {
  static get properties () {
    return {
      tableName: { defaultValue: null },
      columnName: { defaultValue: null },
      filterType: {
        serialize: false,
        get () {
          return 'Select';
        }
      },
      widgetType: {
        serialize: false,
        get () {
          return 'list';
        }
      },
      part: {
        serialize: false,
        get () {
          return ListFilter[Symbol.for('lively-module-meta')]; // eslint-disable-line no-use-before-define
        }
      }
    };
  }

  get valueList () { return this.getSubmorphNamed('value list'); }

  /**
   * Called as soon as the filter is created.  The
   * columnName property is set.  There is one input part, a pulldown valueList, and
   * it is populated with the possible values for the column.  The third parameter,
   * isString, tells us whether the choices in the underlying database columns are
   * strings.  If they are, then in the filter structure returned by this.filter,
   * the chosen value is quoted.
   * Note this is reliant on the choices parameter being non-null (not checked for)
   * @param { string } columnName - The name of the column this filter is over.
   * @param { *[] } choices - All possible values in the column, which populates the pulldown.
   * @param { string|null } tableName - The name of the table used for this list, which could be null.
   * @param { boolean } isString - if true, then the underlying column is of type string and the value should be quoted in this.filter.
   */
  init (columnName, choices, tableName, isString = true) {
    this.columnName = columnName;
    this.tableName = tableName;
    this.valueList.items = choices;
    this.isString = isString;
    this.valueList.selection = choices[0];
    connect(this.valueList, 'selection', this, 'signalFilterChanged');
  }

  /**
   * Fire the filterChanged property.  This is called (hardcoded connection) when
   * the pulldown selection changes.
   */
  signalFilterChanged () {
    signal(this, 'filterChanged');
  }

  /**
   * Return the filter as a JavaScript object.  Per the requirement in
   * GoogleDataTable.getFilteredRows(), this must have a value field, which
   * is quoted if the value is a string.  It also has a columnName field, which
   * processing in the Dashboard (see __prepareFilters__) turns into a columnIndex
   * given the identity of the table being used for the filter.
   */
  get filter () {
    const valueField = this.valueList.selection;
    const valueValue = this.isString ? `"${valueField}"` : valueField;
    return { columnName: this.columnName, value: valueValue };
  }

  /**
   * Return the filter as a JavaScript object for use with the data manager.
   * Per the requirement in galyleo-data.InListFilter, returns an
   * object with operator 'IN_LIST', column: this.columnName, values: [this.valueField]
   */

  get dataManagerFilter () {
    const valueField = this.valueList.selection;
    const valueValue = this.isString ? `"${valueField}"` : valueField;
    return { operator: 'IN_LIST', column: this.columnName, values: [valueValue] };
  }

  get filterString () {
    return `${this.columnName} = ${this.valueList.selection}`;
  }

  /**
   * Return the storable version of this filter, for later restoration.  This
   * is used in dashboard store.  Just the parameters to init plus the
   * current selection the part, and the filterType
   */
  get persistentForm () {
    return {
      part: this.part,
      columnName: this.columnName,
      choices: this.valueList.items,
      selection: this.valueList.selection,
      isString: this.isString,
      tableName: this.tableName,
      type: this.filterType
    };
  }

  /**
   * Restore from a saved form created in persistentForm, immediately above.
   * This is used in dashboard load.  The sole parameter is an object of the
   * form created in persistentForm.
   * @param { StoredListFilter } savedForm - The persistent form of a list filter.
   */
  restoreFromSavedForm (savedForm) {
    this.init(savedForm.columnName, savedForm.choices, savedForm.tableName, savedForm.isString);
    this.signalEnabled = false;
    this.valueList.selection = savedForm.selection;
    this.signalEnabled = true;
  }
}

// part(ListFilter).openInWorld()
const ListFilter = component(VisualFilter, {
  name: 'list filter',
  type: ListFilterMorph,
  submorphs: [
    add(part(GalyleoDropDownList, { name: 'value list', viewModel: { openListInWorld: true } }))
  ]
});

export class NamedFilterMorph extends Morph {
  /**
   * A NamedFilter -- this is a Filter that appears as a widget on the dashboard.
   * It contains a Filter as one of its two submorphs, which is in the property
   * filterMorph.  All this is is a wrapper around the underlying filter, with
   * a name that is used to index the filter in the dashboard's filter table.  The
   * name is also displayed in the second submorph, a label.
   * This implements the Filter interface, namely having a signal filterChanged,
   * which is tied to the underlying filter's filterChanged signal, and a filter
   * read-only property, which simply is a pass through to the underlying filter.
   * properties:
   *     filterChanged: a signal that fires when the value of the filter changes
   *     filterMorph: the embedded filter (currently, an instance of SelectFilter
   *         or RangeFilter)
   */
  static get properties () {
    return {
      filterMorph: {
        defaultValue: null
      }
    };
  }

  /**
   * This is called from ExternalFilterCreator.createFilter after
   * this part is instantiated.  The underlying filterMorph asnd  the filterName are
   * passed in.  All this does is initialize the filterMorph property, set the
   * name in the label to filterName, set the name of this to filterName (this
   * is one of the rules of the Dashboard -- the morph containing a chart or
   * a filter has the same name as the name of the chart or the filter),
   * positions the submorphs vertically, filter above name, and, finally,
   * connects the underlying morph's filterChanged signal to the method
   * here which fire this morph's filterChanged Signal.
   * @param { Morph } filterMorph - The filter morph to be wrapped.
   * @param { string } filterName - The name that is to be displayed next to the filter.
   */
  init (filterMorph, filterName) {
    this.removeAllMorphs();
    this.name = filterName;
    this.addMorph(filterMorph);
    this.filterMorph = filterMorph;
    connect(filterMorph, 'filterChanged', this, 'signalFilterChanged');
  }

  /**
   * Implement the filter property, which just pulls the filter property
   * from the embedded filterMorph
   */
  get filter () {
    return this.filterMorph.filter;
  }

  /**
   * Implement the dataManagerFilter property, which just pulls the dataManagerFilter property
   * from the embedded filterMorph
   */

  get dataManagerFilter () {
    return this.filterMorph.dataManagerFilter;
  }

  /**
   * Return the columnName, which is just reflected from the contained
   * filter
   */
  get columnName () {
    return this.filterMorph.columnName;
  }

  /**
   * Fire the signal changed method; this is only called in response to the
   * connection set up in init
   */
  signalFilterChanged () {
    signal(this, 'filterChanged');
  }

  /**
   * A read-only property which permits the dashboard code to see that this
   * morph is a filter.  This is used for morph and filter management in
   * the dashboard.
   */
  get isFilter () {
    return true;
  }

  get filterString () {
    return this.filterMorph.filterString;
  }
}

// NamedFilter.openInWorld()
const NamedFilter = component(VisualFilter, {
  type: NamedFilterMorph,
  fill: Color.white,
  borderWidth: 0,
  reactsToPointer: false,
  submorphs: [
    add({
      type: Label,
      name: 'column name',
      fontColor: Color.rgb(81, 90, 90),
      fontFamily: galyleoFont,
      fontSize: 15,
      textAndAttributes: ['I am a label!', null],
      visible: false
    })
  ]
});

/**
 * A RangeFilter.  This implements the filter interface, namely:
 * 1.  Signal when the filter is changed through the filterChanged property
 * 2. Have a read-only filter propery which gives the filter itself,
 *    as a JavaScript object, in a form that can be used by
 *    GoogleDataTable.getFilteredRows().  This implements the filter
 *    with a minValue and maxValue property.  See:
 *    https://developers.google.com/chart/interactive/docs/reference#methods
 *
 * Properties:
 * 1. filterChanged: fires when the filter has changed value.
 * 2. columnName: the name of the column over which the filter is defined.
 *    Note that the table is not necessarily specified.
 * 3. tableName: the name of the table over which the filter is defined.  Used
 *    for serialization and may be null.
 * 4. minVal:  The minimum value that appears in columns with this name.
 * 5. maxVal: The maximum value that appears in columns with this name.
 * columnName, tableName, minVal, and maxVal are set on initialization.
 * This filter is created and initialized in Dashboard.makeFilterMorph
 */
export class RangeFilterMorph extends Morph {
  static get properties () {
    return {
      columnName: { defaultValue: null },
      tableName: { defaultValue: null },
      minVal: { defaultValue: null },
      maxVal: { defaultValue: null },
      signalEnabled: { defaultValue: false },
      filterType: {
        serialize: false,
        get () {
          return 'Range';
        }
      },
      widgetType: {
        serialize: false,
        get () {
          return 'minMax';
        }
      },
      part: {
        serialize: false,
        get () {
          return RangeFilter[Symbol.for('lively-module-meta')]; // eslint-disable-line no-use-before-define
        }
      },
      bindings: {
        get () {
          return [
            { target: 'max', signal: 'numberChanged', handler: 'entryChanged' },
            { target: 'min', signal: 'numberChanged', handler: 'entryChanged' }
          ];
        }
      }
    };
  }

  /**
   * Set the minimum/maximum/initial value for a number widget.  Because
   * these widgets have a bug (reported to the Lively team) we need
   * to set the min/max for both the widget and its value submorph.
   * When the Lively bug is fixed remove this patch
   */
  _setMaxAndMin (numberWidget, min, max, initVal) {
    const valueInput = numberWidget.getSubmorphNamed('value');
    numberWidget.min = valueInput.min = min;
    numberWidget.max = valueInput.max = max;
    numberWidget.number = initVal;
  }

  /**
   * Called as soon as the filter is created.  The
   * columnName, minVal, and maxVal properties are set.  The two
   * input parts (currently spinners, see part://SystemWidgets/numberField/dark)
   * have their limits set, and initial values set.  The initial value of the
   * min field is the minimum possible value, the initial value of the max field
   * is the maximum possible value.  Finally, the columnName label is set to
   * columnName.
   * When inputs change, the filterChange signal should in general fire.  This
   * is not the case when we are initializing the input fields, and so to prevent
   * false signals we disable this through the instance variable this.signalEnabled.
   * filterChange only fires when this.signalEnabled = true.  So we set to false
   * at the start of this method and set to true when done.
   * @param { string } columnName - The name of the column this filter is over.
   * @param { string|null } tableName - The name of the table used for this list, which could be null.
   * @param { number } minVal - The minimum value this filter can take.
   * @param { number } maxVal - The maximum value this filter can take.
   * @param { number } increment - Desired increment for this filter (currently unused).
   */
  init (columnName, tableName, minVal, maxVal, increment) {
    this.signalEnabled = false;
    this.minVal = minVal;
    this.maxVal = maxVal;

    const maxInput = this.getSubmorphNamed('max');
    this._setMaxAndMin(maxInput, minVal, maxVal, maxVal);
    const minInput = this.getSubmorphNamed('min');
    this._setMaxAndMin(minInput, minVal, maxVal, minVal);

    // setup connections
    /* connect(minInput, 'numberChanged', this, 'entryChanged');
    connect(maxInput, 'numberChanged', this, 'entryChanged'); */

    this.columnName = columnName;
    this.tableName = tableName;
    this.signalEnabled = true;
  }

  /**
   * Ensure that the numbers haven't busted the bounds.  Used internally only...
   */
  _ensureWithinBounds () {
    const minInput = this.getSubmorphNamed('min');
    const maxInput = this.getSubmorphNamed('max');
    const doSignal = this.signalEnabled;
    this.signalEnabled = false;

    if (maxInput.number > this.maxVal) {
      maxInput.number = this.maxVal;
    }
    if (minInput.number < this.minVal) {
      minInput.number = this.minVal;
    }
    if (minInput.number >= maxInput.number) {
      minInput.number = maxInput.number;
    }
    this.signalEnabled = doSignal;
  }

  /**
   * Called when the maximum or minimum input entry is changed, through a connection
   * which was set up when the part was designed.  The maximum input is
   * changed either through user action, the init() or minChange() methods above
   * If it is changed through user action, this.signalEnabled == true.
   * In this case, there are two actions.  First, we must check to see if
   * minInput.number > maxInput.number.  If it is we disable
   * signaling,  to prevent a bogus signal from being fired then set
   *  maxInput.number = minInput.number and re-enable signaling.  Second, we
   * must fire the signal due to the user action.
   * If this was not changed through user action, this.signalEnabled == false,
   * and no action need be taken.
   */
  entryChanged () {
    this._ensureWithinBounds();
    if (this.signalEnabled) {
      signal(this, 'filterChanged');
    }
  }

  /**
   * A utility to get the input value of one of the input submorphs,
   * either max or min, called from filter, fitlerString, and get persistentForm
   * Handles accessing the morph, digging out its number property, and casting
   * it to a number.
   * @param { string } submorphName - name of the morph, either max or min.
   */
  _inputValue (submorphName /* max or min */) {
    const inputMorph = this.getSubmorphNamed(submorphName);
    return Number(inputMorph.number);
  }

  /**
   * return the actual min and max values, ordered
   */
  _minMax () {
    const inputMin = this._inputValue('min');
    const inputMax = this._inputValue('max');
    return { min: Math.min(inputMin, inputMax), max: Math.max(inputMin, inputMax) };
  }

  /**
   * Return the filter as a JavaScript object.  Per the requirement in
   * GoogleDataTable.getFilteredRows(), this must have a minValue and a
   * maxValue field.  It also has a columnName field, which processing
   * in the Dashboard (see __prepareFilters__) turns into a columnIndex
   * given the identity of the table being used for the filter.
   */
  get filter () {
    const minMax = this._minMax();
    return { columnName: this.columnName, maxValue: minMax.max, minValue: minMax.min };
  }

  /**
   * Return the filter as a JavaScript object for use with the dataManager.
   * Per the requirement in galyleo-data.RangeFilter, returns an
   * object with operator 'IN_RANGE', column: this.columnName,
   * max_val, min_val.
   */

  get dataManagerFilter () {
    const minMax = this._minMax();
    return { operator: 'IN_RANGE', column: this.columnName, max_val: minMax.max, min_val: minMax.min };
  }

  /**
   * Return a short string describing the filter.  This is used to show the
   * action of the filter in chart titles, etc.
   */
  get filterString () {
    const minMax = this._minMax();
    return `${minMax.max} >= ${this.columnName} >= ${minMax.min}`;
  }

  /**
   * Return the storable version of this filter, for later restoration.  This
   * is used in dashboard store.  Just the parameters to init plus the
   * part and the current choices for min and max
   */
  get persistentForm () {
    return {
      part: this.part,
      tableName: this.tableName,
      filterType: this.filterType,
      columnName: this.columnName,
      minVal: this.minVal,
      maxVal: this.maxVal,
      min: this._inputValue('min'),
      max: this._inputValue('max')
    };
  }

  /**
   * Restore from a saved form created in persistentForm, immediately above.
   * This is used in dashboard load.  The sole parameter is an object of the
   * form created in persistentForm.
   * @param { StoredRangeFilter } savedForm - Persistent form of a range filter.
   */
  restoreFromSavedForm (savedForm) {
    this.init(savedForm.columnName, savedForm.tableName, savedForm.min, savedForm.max);
    const minInput = this.getSubmorphNamed('min');
    const maxInput = this.getSubmorphNamed('max');
    // disable signaling before each set, in case the change handlers
    // re-enable
    this.signalEnabled = false;
    minInput.number = savedForm.min;
    this.signalEnabled = false;
    maxInput.number = savedForm.max;
    this.signalEnabled = true;
  }
}

// part(RangeFilter).openInWorld()
const RangeFilter = component(VisualFilter, {
  name: 'range filter',
  type: RangeFilterMorph,
  extent: pt(141.6, 142.7),
  submorphs: [
    add({
      name: 'controls',
      extent: pt(129.8, 89),
      layout: new TilingLayout({
        hugContentsVertically: true,
        justifySubmorphs: 'spaced',
        orderByIndex: true,
        padding: rect(5, 5, 0, 0),
        spacing: 10
      }),
      fill: Color.transparent,
      submorphs: [
        {
          type: Label,
          name: 'max label',
          fontColor: Color.rgb(48, 48, 48),
          fontFamily: galyleoFont,
          fontWeight: 800,
          fontSize: 14,
          textAndAttributes: ['Max:', null]
        },
        part(GalyleoNumberInput, {
          name: 'max',
          submorphs: [{
            name: 'interactive label',
            fontColor: Color.rgba(0, 0, 0, 0.4965358231707328),
            textAndAttributes: Icon.textAttribute('sort-amount-up')
          }]
        }),
        {
          type: Label,
          name: 'min label',
          fontColor: Color.rgb(48, 48, 48),
          fontFamily: galyleoFont,
          fontSize: 14,
          fontWeight: 800,
          textAndAttributes: ['Min:', null]
        },
        part(GalyleoNumberInput, {
          name: 'min',
          submorphs: [{
            name: 'interactive label',
            fontColor: Color.rgba(0, 0, 0, 0.4965358231707328),
            textAndAttributes: Icon.textAttribute('sort-amount-down')
          }]
        })
      ]
    })
  ]
});

/**
 * A Select.  This implements the filter interface, namely:
 * 1.  Signal when the filter is changed through the filterChanged property
 * 2. Have a read-only filter propery which gives the filter itself,
 *    as a JavaScript object, in a form that can be used by
 *    GoogleDataTable.getFilteredRows().  This implements the filter
 *    with a value property.  See:
 *    https://developers.google.com/chart/interactive/docs/reference#methods
 *
 * Properties:
 * 1. filterChanged: fires when the filter has changed value.
 * 2. columnName: the name of the column over which the filter is defined.
 *    Note that the table is not necessarily specified.
 * 3. tableName: the name of the table over which the filter is defined.  Used
 *    for serialization and may be null.
 * This filter is created and initialized in Dashboard.makeFilterMorph
 */
export class SelectFilterMorph extends Morph {
  static get properties () {
    return {
      columnName: { defaultValue: null },
      tableName: { defaultValue: null },
      filterType: {
        serialize: false,
        get () {
          return 'Select';
        }
      },
      widgetType: {
        serialize: false,
        get () {
          return 'dropdown';
        }
      },
      part: {
        serialize: false,
        get () {
          return SelectFilter[Symbol.for('lively-module-meta')]; // eslint-disable-line no-use-before-define
        }
      }
    };
  }

  get valueList () { return this.getSubmorphNamed('value list').viewModel; }

  /**
   * init.  Called as soon as the filter is created.  The
   * columnName property is set.  There is one input part, a pulldown valueList, and
   * it is populated with the possible values for the column.  The third parameter,
   * isString, tells us whether the choices in the underlying database columns are
   * strings.  If they are, then in the filter structure returned by this.filter,
   * the chosen value is quoted.
   * Note this is reliant on the choices parameter being non-null (not checked for)
   * @param { string } columnName - The name of the column this filter is over.
   * @param { *[] } choices - All possible values in the column, which populates the pulldown
   * @param { string|null } tableName - The name of the table used for this list, which could be null.
   * @param { boolean } isString - if true, then the underlying column is of type string and the value should be quoted in this.filter
   */
  init (columnName, choices, tableName, isString = true) {
    this.columnName = columnName;
    this.tableName = tableName;
    this.valueList.items = arr.compact(choices);
    this.isString = isString;
    this.valueList.selection = choices[0];
    connect(this.valueList, 'selection', this, 'signalFilterChanged');
  }

  /**
   * Fire the filterChanged property.  This is called (hardcoded connection) when
   * the pulldown selection changes.
   */
  signalFilterChanged () {
    signal(this, 'filterChanged');
  }

  /**
   * Return the filter as a JavaScript object.  Per the requirement in
   * GoogleDataTable.getFilteredRows(), this must have a value field, which
   * is quoted if the value is a string.  It also has a columnName field, which
   * processing in the Dashboard (see __prepareFilters__) turns into a columnIndex
   * given the identity of the table being used for the filter.
   */
  get filter () {
    const valueField = this.valueList.selection;
    const valueValue = this.isString ? `"${valueField}"` : valueField;
    return { columnName: this.columnName, value: valueValue };
  }

  /**
   * Return the filter as a JavaScript object for use with the dataManager.
   * Per the requirement in galyleo-data.InListFilter, returns an
   * object with operator 'IN_LIST', column: this.columnName,
   * values = [this.valueList.selection]
   */

  get dataManagerFilter () {
    const valueField = this.valueList.selection;
    const valueValue = this.isString ? `"${valueField}"` : valueField;
    return { operator: 'IN_LIST', column: this.columnName, values: [valueValue] };
  }

  /**
   * Return a short string describing the filter.  This is used to show the
   * action of the filter in chart titles, etc.
   */
  get filterString () {
    return `${this.columnName} = ${this.valueList.selection}`;
  }

  /**
   * Return the storable version of this filter, for later restoration.  This
   * is used in dashboard store. Just the parameters to init plus the
   * current selection and the part
   */
  get persistentForm () {
    return {
      part: this.part,
      filterType: this.filterType,
      columnName: this.columnName,
      tableName: this.tableName,
      choices: this.valueList.items,
      selection: this.valueList.selection,
      isString: this.isString
    };
  }

  /**
   * Restore from a saved form created in persistentForm, immediately above.
   * This is used in dashboard load.  The sole parameter is an object of the
   * form created in persistentForm.
   * @param { StoredSelectFilter } savedForm - Persistet form of a select filter.
   */
  restoreFromSavedForm (savedForm) {
    this.init(savedForm.columnName, savedForm.choices, savedForm.tableName, savedForm.isString);
    this.signalEnabled = false;
    this.valueList.selection = savedForm.selection;
    this.signalEnabled = true;
  }
}

// part(SelectFilter).openInWorld()
const SelectFilter = component(VisualFilter, {
  name: 'select filter',
  type: SelectFilterMorph,
  submorphs: [
    add(part(GalyleoDropDown, { name: 'value list', viewModel: { openListInWorld: true } }))
  ]
});

/**
 * A Slider.  This implements the filter interface, namely:
 * 1. Signal when the filter is changed through the filterChanged property
 * 2. Have a read-only filter propery which gives the filter itself,
 *    as a JavaScript object, in a form that can be used by
 *    GoogleDataTable.getFilteredRows().  This implements the filter
 *    with a value property.  See:
 *    https://developers.google.com/chart/interactive/docs/reference#methods
 *
 * Properties:
 * 1. filterChanged: fires when the filter has changed value.
 * 2. columnName: the name of the column over which the filter is defined.
 *    Note that the table is not necessarily specified.
 * 3. tableName: the name of the table over which the filter is defined.  Used
 *    for serialization and may be null.
 * 4. minVal:  The minimum value that appears in columns with this name.
 * 5. maxVal: The maximum value that appears in columns with this name.
 * columnName, tableName, minVal, and maxVal are set on initialization.
 * This filter is created and initialized in Dashboard.makeFilterMorph
 */
export class SliderFilterMorph extends Morph {
  static get properties () {
    return {
      filterChanged: { derived: true, readOnly: true, isSignal: true },
      columnName: { defaultValue: null },
      tableName: { defaultValue: null },
      minVal: { defaultValue: null },
      maxVal: { defaultValue: null },
      signalEnabled: { defaultValue: false },
      filterType: {
        serialize: false,
        get () {
          return 'NumericSelect';
        }
      },
      widgetType: {
        serialize: false,
        get () {
          return 'SliderWithValue';
        }
      },
      part: {
        serialize: false,
        get () {
          return SliderFilter[Symbol.for('lively-module-meta')]; // eslint-disable-line no-use-before-define
        }
      }
    };
  }

  get slider () { return this.getSubmorphNamed('slider'); }

  /**
   * Called as soon as the filter is created.  The
   * columnName, minVal, and maxVal properties are set.   The initial value of the
   * min field is the minimum possible value, the initial value of the max field
   * is the maximum possible value.
   * When slider value changes, the filterChange signal should in general fire.  This
   * is not the case when we are initializing the slider, and so to prevent
   * false signals we disable this through the instance variable this.signalEnabled.
   * filterChange only fires when this.signalEnabled = true.  So we set to false
   * at the start of this method and set to true when done.
   * @param { string } columnName - the name of the column this filter is over.
   * @param { string|null } tableName - the name of the table used for this list, which could be null. Only used in serialization (persistentForm).
   * @param { number } minVal - the minimum value this filter can take.
   * @param { number } maxVal - the maximum value this filter can take.
   * @param { number } increment - the increment between two slider positions.
   */
  init (columnName, tableName, minVal, maxVal, increment) {
    this.signalEnabled = false;
    const { slider } = this;
    slider.minValue = this.minValue = minVal;
    slider.maxValue = this.maxValue = maxVal;
    slider.increment = increment;
    slider.value = (maxVal - minVal) / 2 + minVal;
    slider.viewModel.updateValue();
    this.columnName = columnName;
    this.tableName = tableName;
    this.signalEnabled = true;
    connect(slider, 'valueChanged', this, 'valueChanged');
    // connect(slider.model, 'valueChanged', this, 'valueChanged');
  }

  /**
   * Called when the value on the slider changes, through a hardcoded
   * connection.  Very simple -- just checks to see if the signal is enabled, and
   * if it is, signals that the filter has changed.
   */
  valueChanged () {
    fun.debounceNamed('filterChanged-' + this.id, 50, () => {
      signal(this, 'filterChanged');
    })();
  }

  /**
   * Return the filter as a JavaScript object.  Per the requirement in
   * GoogleDataTable.getFilteredRows(), this must have a value field
   * It also has a columnName field, which processing
   * in the Dashboard (see __prepareFilters__) turns into a columnIndex
   * given the identity of the table being used for the filter.
   */
  get filter () {
    return { columnName: this.columnName, value: this.slider.value };
  }

  /**
   * Return the filter as a JavaScript object for use with the dataManager.
   * Per the requirement in galyleo-data.InListFilter, returns an
   * object with operator 'IN_LIST', column: this.columnName,
   * values = [slider.value]
   */

  get dataManagerFilter () {
    return { operator: 'IN_LIST', column: this.columnName, values: [this.getSubmorphNamed('slider').value] };
  }

  /**
   * Return a short string describing the filter.  This is used to show the
   * action of the filter in chart titles, etc.
   */
  get filterString () {
    return `${this.columnName} == ${this.slider.value}`;
  }

  /**
   * Return the storable version of this filter, for later restoration.  This
   * is used in dashboard store.  Just the parameters to init plus the
   * part and the current choices for min and max
   */
  get persistentForm () {
    const { slider } = this;
    return {
      part: this.part,
      tableName: this.tableName,
      filterType: this.filterType,
      columnName: this.columnName,
      minVal: slider.minValue,
      maxVal: slider.maxValue,
      value: slider.value,
      increment: slider.increment
    };
  }

  /**
   * Restore from a saved form created in persistentForm, immediately above.
   * This is used in dashboard load.  The sole parameter is an object of the
   * form created in persistentForm.
   * @param { StoredSliderFilter } savedForm - The persistent form of a slider filter.
   */
  restoreFromSavedForm (savedForm) {
    this.init(savedForm.columnName, savedForm.tableName, savedForm.minVal, savedForm.maxVal, savedForm.increment);
    this.signalEnabled = false;
    const { slider } = this;
    // disable signaling before each set, in case the change handlers
    // re-enable
    slider.value = savedForm.value;
    this.signalEnabled = true;
  }
}

// part(SliderFilter).openInWorld()
const SliderFilter = component(VisualFilter, {
  name: 'slider filter',
  type: SliderFilterMorph,
  submorphs: [
    add(part(SliderWithValue, { name: 'slider' }))
  ]
});

export { VisualFilter, NamedFilter, BooleanFilter, DateFilter, DoubleSliderFilter, ListFilter, RangeFilter, SelectFilter, SliderFilter };
