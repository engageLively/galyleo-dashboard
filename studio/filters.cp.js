import { Morph } from 'lively.morphic';
import { signal, connect } from 'lively.bindings/index.js';
import { arr } from 'lively.lang';

export class BooleanFilter extends Morph {
  /*
  ** A Booleanfilter.  This implements the filter interface, namely:
  ** 1.  Signal when the filter is changed through the filterChanged property
  ** 2. Have a read-only filter propery which gives the filter itself,
  **    as a JavaScript object, in a form that can be used by
  **    GoogleDataTable.getFilteredRows().  This implements the filter
  **    with a value property.  See:
  **    https://developers.google.com/chart/interactive/docs/reference#methods
  **
  ** Properties:
  ** 1. filterChanged: fires when the filter has changed value.
  ** 2. columnName: the name of the column over which the filter is defined.
  **    Note that the table is not necessarily specified.
  ** 3. tableName: the name of the table over which the filter is defined.  Used
  **    for serialization and may be null.
  ** This filter is created and initialized in Dashboard.makeFilterMorph
  */
  static get properties () {
    return {
      filterChanged: { derived: true, readOnly: true, isSignal: true },
      columnName: { defaultValue: null },
      tableName: { defaultValue: null }
    };
  }

  // type of the filter.  This is a Select filter

  get filterType () {
    return 'Boolean';
  }

  get widgetType () {
    return 'toggle';
  }

  get part () {
    return 'part://Dashboard Studio Development/galyleo/booleanFilter';
  }

  // init.  Called as soon as the filter is created.  The
  // columnName and tableName properties is set.
  //
  // parameters:
  //    columnName -- the name of the column this filter is over.
  //    tableName -- the name of the table used for this list, which could be null.
  //                 Only used in serialization (persistentForm)
  init (columnName, tableName) {
    this.columnName = columnName;
    this.tableName = tableName;
    this.getSubmorphNamed('aToggle').state = true;
  }

  // Fire the filterChanged property.  This is called (hardcoded connection) when
  // the pulldown selection changes.

  signalFilterChanged () {
    signal(this, 'filterChanged');
  }

  // Return the filter as a JavaScript object.  Per the requirement in
  // GoogleDataTable.getFilteredRows(), this must have a value field.  It also
  // has a columnName field, which processing in the Dashboard (see
  // __prepareFilters__) turns into a columnIndex given the identity of the table
  // being used for the filter.

  get filter () {
    return { columnName: this.columnName, value: this.getSubmorphNamed('aToggle').state };
  }

  // Return a short string describing the filter.  This is used to show the
  // action of the filter in chart titles, etc.

  get filterString () {
    return `${this.columnName} = ${this.getSubmorphNamed('aToggle').state}`;
  }

  // Return the storable version of this filter, for later restoration.  This
  // is used in dashboard store.  Just the parameters to init plus the
  // current selection and the part

  get persistentForm () {
    return {
      part: this.part,
      filterType: this.filterType,
      columnName: this.columnName,
      tableName: this.tableName,
      state: this.getSubmorphNamed('aToggle').state
    };
  }

  // restore from a saved form created in persistentForm, immediately above.
  // This is used in dashboard load.  The sole parameter is an object of the
  // form created in persistentForm.

  restoreFromSavedForm (savedForm) {
    this.init(savedForm.columnName, savedForm.tableName);
    this.signalEnabled = false;
    this.getSubmorphNamed('aToggle').state = savedForm.state;
    this.signalEnabled = true;
  }
}

export class DateFilter extends Morph {
  /*
  ** A DateFilter.  This implements the filter interface, namely:
  ** 1. Signal when the filter is changed through the filterChanged property
  ** 2. Have a read-only filter propery which gives the filter itself,
  **    as a JavaScript object, in a form that can be used by
  **    GoogleDataTable.getFilteredRows().  This implements the filter
  **    with a value property.  See:
  **    https://developers.google.com/chart/interactive/docs/reference#methods
  **
  ** Properties:
  ** 1. filterChanged: fires when the filter has changed value.
  ** 2. columnName: the name of the column over which the filter is defined.
  **    Note that the table is not necessarily specified.
  ** 3. tableName: the name of the table over which the filter is defined.  Used
  **    for serialization and may be null.
  ** columnName and tableName
  ** This filter is created and initialized in Dashboard.makeFilterMorph
  */
  static get properties () {
    return {
      filterChanged: { derived: true, readOnly: true, isSignal: true },
      columnName: { defaultValue: null },
      tableName: { defaultValue: null }

    };
  }

  // the filterType.  This is a Range filter
  get filterType () {
    return 'DateSelect';
  }

  get widgetType () {
    return 'DatePicker';
  }

  get part () {
    return 'part://Dashboard Studio Development/galyleo/DateFilter';
  }

  // init.  Called as soon as the filter is created.  The
  // columnName and tableName are set.
  // When the selected date changes, the filterChange signal should in general
  // fire.  This is not the case when we are initializing the date picker, and so
  // to prevent false signals we disable this through the instance variable
  // this.signalEnabled. filterChange only fires when this.signalEnabled = true.
  // So we set to false at the start of this method and set to true when done.
  // parameters:
  //    columnName -- the name of the column this filter is over.
  //    tableName -- the name of the table used for this list, which could be null.
  //                 Only used in serialization (persistentForm)

  init (columnName, tableName) {
    this.signalEnabled = false;
    const selector = this.getSubmorphNamed('aDateSelector');
    this.columnName = columnName;
    this.tableName = tableName;
    selector.setDate(new Date());
    this.signalEnabled = true;
  }

  // Called when the selected date changes, through a hardcoded connection

  dateChanged () {
    if (this.signalEnabled) {
      /* this.signalEnabled = false;
      setTimeout(_ => {

        signal(this, 'filterChanged');
        this.signalEnabled = true;
      }, 10); */
      signal(this, 'filterChanged');
    }
  }

  // Return the filter as a JavaScript object.  Per the requirement in
  // GoogleDataTable.getFilteredRows(), this must have a value field
  // It also has a columnName field, which processing
  // in the Dashboard (see __prepareFilters__) turns into a columnIndex
  // given the identity of the table being used for the filter.

  get filter () {
    return { columnName: this.columnName, value: this.getSubmorphNamed('aDateSelectior').selectedDate };
  }

  // Return a short string describing the filter.  This is used to show the
  // action of the filter in chart titles, etc.

  get filterString () {
    return `${this.columnName} == ${this.getSubmorphNamed('aDateSelectior').selectedDate}`;
  }

  // Return the storable version of this filter, for later restoration.  This
  // is used in dashboard store.  Just the parameters to init plus the
  // part and the current choices for min and max

  get persistentForm () {
    const slider = this.getSubmorphNamed('slider');
    return {
      part: this.part,
      tableName: this.tableName,
      filterType: this.filterType,
      columnName: this.columnName,
      selectedDate: this.getSubmorphNamed('aDateSelectior').selectedDate
    };
  }

  // restore from a saved form created in persistentForm, immediately above.
  // This is used in dashboard load.  The sole parameter is an object of the
  // form created in persistentForm.

  restoreFromSavedForm (savedForm) {
    this.init(savedForm.columnName, savedForm.tableName);
    this.signalEnabled = false;
    const datePicker = this.getSubmorphNamed('aDateSelectior');
    // disable signaling before each set, in case the change handlers
    // re-enable

    datePicker.value = datePicker.value;
    this.signalEnabled = true;
  }
}

export class DoubleSliderFilter extends Morph {
  /*
  ** A Slider with a min/max value.  This implements the filter interface, namely:
  ** 1. Signal when the filter is changed through the filterChanged property
  ** 2. Have a read-only filter propery which gives the filter itself,
  **    as a JavaScript object, in a form that can be used by
  **    GoogleDataTable.getFilteredRows().  This implements the filter
  **    with a minValue and maxValue property.  See:
  **    https://developers.google.com/chart/interactive/docs/reference#methods
  **
  ** Properties:
  ** 1. filterChanged: fires when the filter has changed value.
  ** 2. columnName: the name of the column over which the filter is defined.
  **    Note that the table is not necessarily specified.
  ** 3. tableName: the name of the table over which the filter is defined.  Used
  **    for serialization and may be null.
  ** 4. minVal:  The minimum value that appears in columns with this name.
  ** 5. maxVal: The maximum value that appears in columns with this name.
  ** columnName, tableName, minVal, and maxVal are set on initialization.
  ** This filter is created and initialized in Dashboard.makeFilterMorph
  */
  static get properties () {
    return {
      filterChanged: { derived: true, readOnly: true, isSignal: true },
      columnName: { defaultValue: null },
      tableName: { defaultValue: null },
      minVal: { defaultValue: null },
      maxVal: { defaultValue: null },
      signalEnabled: { defaultValue: false }
    };
  }

  // the filterType.  This is a Range filter
  get filterType () {
    return 'Range';
  }

  get widgetType () {
    return 'doubleSliderWithValues';
  }

  get part () {
    return 'part://Dashboard Studio Development/galyleo/doubleSliderFilter';
  }

  // init.  Called as soon as the filter is created.  The
  // columnName, minVal, and maxVal properties are set.  The two
  // input parts (currently spinners, see part://SystemWidgets/numberField/dark)
  // have their limits set, and initial values set.  The initial value of the
  // min field is the minimum possible value, the initial value of the max field
  // is the maximum possible value.  Finally, the columnName label is set to
  // columnName.
  // When inputs change, the filterChange signal should in general fire.  This
  // is not the case when we are initializing the input fields, and so to prevent
  // false signals we disable this through the instance variable this.signalEnabled.
  // filterChange only fires when this.signalEnabled = true.  So we set to false
  // at the start of this method and set to true when done.
  // parameters:
  //    columnName -- the name of the column this filter is over.
  //    tableName -- the name of the table used for this list, which could be null.
  //                 Only used in serialization (persistentForm)
  //    minVal -- the minimum value this filter can take
  //    maxVal -- the maximum value this filter can take
  //    increment -- the amount this slider increments on a move

  init (columnName, tableName, minVal, maxVal, increment) {
    this.signalEnabled = false;
    const doubleSlider = this.getSubmorphNamed('doubleSlider');
    doubleSlider.minValue = minVal;
    doubleSlider.maxValue = maxVal;
    doubleSlider.increment = increment;
    doubleSlider.range = { min: minVal, max: maxVal };
    this.columnName = columnName;
    this.tableName = tableName;
    this.signalEnabled = true;
  }

  // Called when the range on the slider changes, through a hardcoded
  // connection.  Very simple -- just checks to see if the signal is enabled, and
  // if it is, signals that the filter has changed.
  // TODO -- check to see if we need to add a delay of a few ms to avoid too
  // many events.  The idea would be to set signalEnabled to false, then set a
  // timeout of a few ms, and at the end of that change signalEnabled to true and
  // fire the signal.

  rangeChanged () {
    if (this.signalEnabled) {
      this.signalEnabled = false;
      setTimeout(_ => {
        signal(this, 'filterChanged');
        this.signalEnabled = true;
      }, 100);
      // signal(this, 'filterChanged');
    }
  }

  // Return the filter as a JavaScript object.  Per the requirement in
  // GoogleDataTable.getFilteredRows(), this must have a minValue and a
  // maxValue field.  It also has a columnName field, which processing
  // in the Dashboard (see __prepareFilters__) turns into a columnIndex
  // given the identity of the table being used for the filter.

  get filter () {
    const range = this.getSubmorphNamed('doubleSlider').range;
    return { columnName: this.columnName, maxValue: range.max, minValue: range.min };
  }

  // Return a short string describing the filter.  This is used to show the
  // action of the filter in chart titles, etc.

  get filterString () {
    const range = this.getSubmorphNamed('doubleSlider').range;
    return `${range.max} >= ${this.columnName} >= ${range.min}`;
  }

  // Return the storable version of this filter, for later restoration.  This
  // is used in dashboard store.  Just the parameters to init plus the
  // part and the current choices for min and max

  get persistentForm () {
    const range = this.getSubmorphNamed('doubleSlider').range;
    const doubleSlider = this.getSubmorphNamed('doubleSlider');
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

  // restore from a saved form created in persistentForm, immediately above.
  // This is used in dashboard load.  The sole parameter is an object of the
  // form created in persistentForm.

  restoreFromSavedForm (savedForm) {
    this.init(savedForm.columnName, savedForm.tableName, savedForm.minVal, savedForm.maxVal, savedForm.increment);
    const range = this.getSubmorphNamed('doubleSlider').range;
    // disable signaling before each set, in case the change handlers
    // re-enable
    this.signalEnabled = false;
    this.getSubmorphNamed('doubleSlider').range = { min: savedForm.min, max: savedForm.max };
    this.signalEnabled = true;
  }
}

export class ListFilter extends Morph {
  /*
  ** A ListFilter, which implements a Select.
  ** This implements the filter interface, namely:
  ** 1.  Signal when the filter is changed through the filterChanged property
  ** 2. Have a read-only filter propery which gives the filter itself,
  **    as a JavaScript object, in a form that can be used by
  **    GoogleDataTable.getFilteredRows().  This implements the filter
  **    with a value property.  See:
  **    https://developers.google.com/chart/interactive/docs/reference#methods
  **
  ** Properties:
  ** 1. filterChanged: fires when the filter has changed value.
  ** 2. columnName: the name of the column over which the filter is defined.
  **    Note that the table is not necessarily specified.
  ** 3. tableName: the name of the table over which the filter is defined.  Used
  **    for serialization and may be null.
  ** This filter is created and initialized in Dashboard.makeFilterMorph
  */
  static get properties () {
    return {
      filterChanged: { derived: true, readOnly: true, isSignal: true },
      tableName: { defaultValue: null },
      columnName: { defaultValue: null }
    };
  }

  // the filterType.  This is a Select fitler
  get filterType () {
    return 'Select';
  }

  get widgetType () {
    return 'list';
  }

  get part () {
    return 'part://Dashboard Studio Development/galyleo/list filter';
  }

  // init.  Called as soon as the filter is created.  The
  // columnName property is set.  There is one input part, a pulldown valueList, and
  // it is populated with the possible values for the column.  The third parameter,
  // isString, tells us whether the choices in the underlying database columns are
  // strings.  If they are, then in the filter structure returned by this.filter,
  // the chosen value is quoted.
  // Note this is reliant on the choices parameter being non-null (not checked for)
  // parameters:
  //    columnName -- the name of the column this filter is over.
  //    choices -- All possible values in the column, which populates the pulldown
  //    tableName -- the name of the table used for this list, which could be null.
  //                 Only used in serialization (persistentForm)
  //    isString (default true) -- if true, then the underlying column is of type
  //          string and the value should be quoted in this.filter

  init (columnName, choices, tableName, isString = true) {
    this.columnName = columnName;
    this.tableName = tableName;
    this.valueList = this.getSubmorphNamed('valueList');
    this.valueList.items = choices;
    this.isString = isString;
    this.valueList.selection = choices[0];
  }

  // Fire the filterChanged property.  This is called (hardcoded connection) when
  // the pulldown selection changes.

  signalFilterChanged () {
    signal(this, 'filterChanged');
  }

  // Return the filter as a JavaScript object.  Per the requirement in
  // GoogleDataTable.getFilteredRows(), this must have a value field, which
  // is quoted if the value is a string.  It also has a columnName field, which
  // processing in the Dashboard (see __prepareFilters__) turns into a columnIndex
  // given the identity of the table being used for the filter.

  get filter () {
    const valueField = this.valueList.selection;
    const valueValue = this.isString ? `"${valueField}"` : valueField;
    return { columnName: this.columnName, value: valueField };
  }

  get filterString () {
    return `${this.columnName} = ${this.valueList.selection}`;
  }

  // Return the storable version of this filter, for later restoration.  This
  // is used in dashboard store.  Just the parameters to init plus the
  // current selection the part, and the filterType

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

  // restore from a saved form created in persistentForm, immediately above.
  // This is used in dashboard load.  The sole parameter is an object of the
  // form created in persistentForm.

  restoreFromSavedForm (savedForm) {
    this.init(savedForm.columnName, savedForm.choices, savedForm.tableName, savedForm.isString);
    this.signalEnabled = false;
    this.valueList.selection = savedForm.selection;
    this.signalEnabled = true;
  }
}

export class NamedFilter extends Morph {
  /*
  ** A NamedFilter -- this is a Filter that appears as a widget on the dashboard.
  ** It contains a Filter as one of its two submorphs, which is in the property
  ** filterMorph.  All this is is a wrapper around the underlying filter, with
  ** a name that is used to index the filter in the dashboard's filter table.  The
  ** name is also displayed in the second submorph, a label.
  ** This implements the Filter interface, namely having a signal filterChanged,
  ** which is tied to the underlying filter's filterChanged signal, and a filter
  ** read-only property, which simply is a pass through to the underlying filter.
  ** properties:
  **     filterChanged: a signal that fires when the value of the filter changes
  **     filterMorph: the embedded filter (currently, an instance of SelectFilter
  **         or RangeFilter)
  */
  static get properties () {
    return {
      filterChanged: {
        derived: true, readOnly: true, isSignal: true
      },
      filterMorph: {
        defaultValue: null
      }
    };
  }

  // initialize.  This is called from ExternalFilterCreator.createFilter after
  // this part is instantiated.  The underlying filterMorph asnd  the filterName are
  // passed in.  All this does is initialize the filterMorph property, set the
  // name in the label to filterName, set the name of this to filterName (this
  // is one of the rules of the Dashboard -- the morph containing a chart or
  // a filter has the same name as the name of the chart or the filter),
  // positions the submorphs vertically, filter above name, and, finally,
  // connects the underlying morph's filterChanged signal to the method
  // here which fire this morph's filterChanged Signal.

  init (filterMorph, filterName) {
    this.removeAllMorphs();
    this.name = filterName;
    this.addMorph(filterMorph);
    this.filterMorph = filterMorph;
    connect(filterMorph, 'filterChanged', this, 'signalFilterChanged');
  }

  // Implement the filter property, which just pulls the filter property
  // from the embedded filterMorph

  get filter () {
    return this.filterMorph.filter;
  }

  // return the columnName, which is just reflected from the contained
  // filter
  get columnName () {
    return this.filterMorph.columnName;
  }

  // Fire the signal changed method; this is only called in response to the
  // connection set up in init

  signalFilterChanged () {
    signal(this, 'filterChanged');
  }

  // A read-only property which permits the dashboard code to see that this
  // morph is a filter.  This is used for morph and filter management in
  // the dashboard.

  get isFilter () {
    return true;
  }

  get filterString () {
    return this.filterMorph.filterString;
  }
}

export class RangeFilter extends Morph {
  /*
  ** A RangeFilter.  This implements the filter interface, namely:
  ** 1.  Signal when the filter is changed through the filterChanged property
  ** 2. Have a read-only filter propery which gives the filter itself,
  **    as a JavaScript object, in a form that can be used by
  **    GoogleDataTable.getFilteredRows().  This implements the filter
  **    with a minValue and maxValue property.  See:
  **    https://developers.google.com/chart/interactive/docs/reference#methods
  **
  ** Properties:
  ** 1. filterChanged: fires when the filter has changed value.
  ** 2. columnName: the name of the column over which the filter is defined.
  **    Note that the table is not necessarily specified.
  ** 3. tableName: the name of the table over which the filter is defined.  Used
  **    for serialization and may be null.
  ** 4. minVal:  The minimum value that appears in columns with this name.
  ** 5. maxVal: The maximum value that appears in columns with this name.
  ** columnName, tableName, minVal, and maxVal are set on initialization.
  ** This filter is created and initialized in Dashboard.makeFilterMorph
  */
  static get properties () {
    return {
      filterChanged: { derived: true, readOnly: true, isSignal: true },
      columnName: { defaultValue: null },
      tableName: { defaultValue: null },
      minVal: { defaultValue: null },
      maxVal: { defaultValue: null },
      signalEnabled: { defaultValue: false }
    };
  }

  // the filterType.  This is a Range filter
  get filterType () {
    return 'Range';
  }

  get widgetType () {
    return 'minMax';
  }

  get part () {
    return 'part://Dashboard Studio Development/galyleo/range filter';
  }

  // init.  Called as soon as the filter is created.  The
  // columnName, minVal, and maxVal properties are set.  The two
  // input parts (currently spinners, see part://SystemWidgets/numberField/dark)
  // have their limits set, and initial values set.  The initial value of the
  // min field is the minimum possible value, the initial value of the max field
  // is the maximum possible value.  Finally, the columnName label is set to
  // columnName.
  // When inputs change, the filterChange signal should in general fire.  This
  // is not the case when we are initializing the input fields, and so to prevent
  // false signals we disable this through the instance variable this.signalEnabled.
  // filterChange only fires when this.signalEnabled = true.  So we set to false
  // at the start of this method and set to true when done.
  // parameters:
  //    columnName -- the name of the column this filter is over.
  //    tableName -- the name of the table used for this list, which could be null.
  //                 Only used in serialization (persistentForm)
  //    minVal -- the minimum value this filter can take
  //    maxVal -- the maximum value this filter can take
  //    increment -- desired increment for this filter (currently unused)

  init (columnName, tableName, minVal, maxVal, increment) {
    this.signalEnabled = false;

    const maxInput = this.getSubmorphNamed('max');
    const minInput = this.getSubmorphNamed('min');
    minInput.min = maxInput.min = this.minVal = minInput.number = minVal;
    minInput.max = maxInput.max = this.maxVal = maxInput.number = maxVal;

    this.columnName = columnName;
    this.tableName = tableName;
    this.signalEnabled = true;
  }

  // Called when the maximum input entry is changed, through a connection
  // which was set up when the part was designed.  The maximum input is
  // changed either through user action, the init() or minChange() methods above
  // If it is changed through user action, this.signalEnabled == true.
  // In this case, there are two actions.  First, we must check to see if
  // minInput.number > maxInput.number.  If it is we disable
  // signaling,  to prevent a bogus signal from being fired then set
  //  maxInput.number = minInput.number and re-enable signaling.  Second, we
  // must fire the signal due to the user action.
  // If this was not changed through user action, this.signalEnabled == false,
  // and no action need be taken.

  minChanged () {
    const minInput = this.getSubmorphNamed('min');
    const maxInput = this.getSubmorphNamed('max');
    if (this.signalEnabled) {
      if (minInput.number > maxInput.number) {
        this.signalEnabled = false;
        maxInput.number = minInput.number;
        this.signalEnabled = true;
      }
      signal(this, 'filterChanged');
    }
  }

  // Called when the minimum input entry is changed, through a connection
  // which was set up when the part was designed.  The minimum input is
  // changed either through user action, the init method above, or maxChanged()
  // below.  If it is changed through user action, this.signalEnabled == true.
  // In this case, there are two actions.  First, we must check to see if
  // minInput.number > maxInput.number.  If it is we disable
  // signaling,  to prevent a bogus signal from being fired then set
  //  maxInput.number = minInput.number and re-enable signaling.  Second, we
  // must fire the signal due to the user action.
  // If this was not changed through user action, this.signalEnabled == false,
  // and no action need be taken.

  maxChanged () {
    const minInput = this.getSubmorphNamed('min');
    const maxInput = this.getSubmorphNamed('max');
    if (this.signalEnabled) {
      if (minInput.number > maxInput.number) {
        this.signalEnabled = false;
        minInput.number = maxInput.number;
        this.signalEnabled = true;
      }
      signal(this, 'filterChanged');
    }
  }

  // A utility to get the input value of one of the input submorphs,
  // either max or min, called from filter, fitlerString, and get persistentForm
  // Handles accessing the morph, digging out its number property, and casting
  // it to a number
  // parameters:
  //   submorphName -- name of the morph, either max or min.

  _inputValue (submorphName /* max or min */) {
    const inputMorph = this.getSubmorphNamed(submorphName);
    return Number(inputMorph.number);
  }

  // Return the filter as a JavaScript object.  Per the requirement in
  // GoogleDataTable.getFilteredRows(), this must have a minValue and a
  // maxValue field.  It also has a columnName field, which processing
  // in the Dashboard (see __prepareFilters__) turns into a columnIndex
  // given the identity of the table being used for the filter.

  get filter () {
    const min = this._inputValue('min');
    const max = this._inputValue('max');
    return { columnName: this.columnName, maxValue: max, minValue: min };
  }

  // Return a short string describing the filter.  This is used to show the
  // action of the filter in chart titles, etc.

  get filterString () {
    const min = this._inputValue('min');
    const max = this._inputValue('max');
    return `${max} >= ${this.columnName} >= ${min}`;
  }

  // Return the storable version of this filter, for later restoration.  This
  // is used in dashboard store.  Just the parameters to init plus the
  // part and the current choices for min and max

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

  // restore from a saved form created in persistentForm, immediately above.
  // This is used in dashboard load.  The sole parameter is an object of the
  // form created in persistentForm.

  restoreFromSavedForm (savedForm) {
    this.init(savedForm.columnName, savedForm.tableName, savedForm.minVal, savedForm.maxVal);
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

export class SelectFilter extends Morph {
  /*
  ** A Select.  This implements the filter interface, namely:
  ** 1.  Signal when the filter is changed through the filterChanged property
  ** 2. Have a read-only filter propery which gives the filter itself,
  **    as a JavaScript object, in a form that can be used by
  **    GoogleDataTable.getFilteredRows().  This implements the filter
  **    with a value property.  See:
  **    https://developers.google.com/chart/interactive/docs/reference#methods
  **
  ** Properties:
  ** 1. filterChanged: fires when the filter has changed value.
  ** 2. columnName: the name of the column over which the filter is defined.
  **    Note that the table is not necessarily specified.
  ** 3. tableName: the name of the table over which the filter is defined.  Used
  **    for serialization and may be null.
  ** This filter is created and initialized in Dashboard.makeFilterMorph
  */
  static get properties () {
    return {
      filterChanged: { derived: true, readOnly: true, isSignal: true },
      columnName: { defaultValue: null },
      tableName: { defaultValue: null }
    };
  }

  // type of the filter.  This is a Select filter

  get filterType () {
    return 'Select';
  }

  get widgetType () {
    return 'dropdown';
  }

  get part () {
    return 'part://Dashboard Studio Development/galyleo/select filter';
  }

  // init.  Called as soon as the filter is created.  The
  // columnName property is set.  There is one input part, a pulldown valueList, and
  // it is populated with the possible values for the column.  The third parameter,
  // isString, tells us whether the choices in the underlying database columns are
  // strings.  If they are, then in the filter structure returned by this.filter,
  // the chosen value is quoted.
  // Note this is reliant on the choices parameter being non-null (not checked for)
  // parameters:
  //    columnName -- the name of the column this filter is over.
  //    choices -- All possible values in the column, which populates the pulldown
  //    tableName -- the name of the table used for this list, which could be null.
  //                 Only used in serialization (persistentForm)
  //    isString (default true) -- if true, then the underlying column is of type
  //          string and the value should be quoted in this.filter

  init (columnName, choices, tableName, isString = true) {
    this.columnName = columnName;
    this.tableName = tableName;
    this.valueList = this.getSubmorphNamed('valueList');
    this.valueList.items = arr.compact(choices);
    this.isString = isString;
    this.valueList.selection = choices[0];
  }

  // Fire the filterChanged property.  This is called (hardcoded connection) when
  // the pulldown selection changes.

  signalFilterChanged () {
    signal(this, 'filterChanged');
  }

  // Return the filter as a JavaScript object.  Per the requirement in
  // GoogleDataTable.getFilteredRows(), this must have a value field, which
  // is quoted if the value is a string.  It also has a columnName field, which
  // processing in the Dashboard (see __prepareFilters__) turns into a columnIndex
  // given the identity of the table being used for the filter.

  get filter () {
    const valueField = this.valueList.selection;
    const valueValue = this.isString ? `"${valueField}"` : valueField;
    return { columnName: this.columnName, value: valueField };
  }

  // Return a short string describing the filter.  This is used to show the
  // action of the filter in chart titles, etc.

  get filterString () {
    return `${this.columnName} = ${this.valueList.selection}`;
  }

  // Return the storable version of this filter, for later restoration.  This
  // is used in dashboard store.  Just the parameters to init plus the
  // current selection and the part

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

  // restore from a saved form created in persistentForm, immediately above.
  // This is used in dashboard load.  The sole parameter is an object of the
  // form created in persistentForm.

  restoreFromSavedForm (savedForm) {
    this.init(savedForm.columnName, savedForm.choices, savedForm.tableName, savedForm.isString);
    this.signalEnabled = false;
    this.valueList.selection = savedForm.selection;
    this.signalEnabled = true;
  }
}

export class SliderFilter extends Morph {
  /*
  ** A Slider.  This implements the filter interface, namely:
  ** 1. Signal when the filter is changed through the filterChanged property
  ** 2. Have a read-only filter propery which gives the filter itself,
  **    as a JavaScript object, in a form that can be used by
  **    GoogleDataTable.getFilteredRows().  This implements the filter
  **    with a value property.  See:
  **    https://developers.google.com/chart/interactive/docs/reference#methods
  **
  ** Properties:
  ** 1. filterChanged: fires when the filter has changed value.
  ** 2. columnName: the name of the column over which the filter is defined.
  **    Note that the table is not necessarily specified.
  ** 3. tableName: the name of the table over which the filter is defined.  Used
  **    for serialization and may be null.
  ** 4. minVal:  The minimum value that appears in columns with this name.
  ** 5. maxVal: The maximum value that appears in columns with this name.
  ** columnName, tableName, minVal, and maxVal are set on initialization.
  ** This filter is created and initialized in Dashboard.makeFilterMorph
  */
  static get properties () {
    return {
      filterChanged: { derived: true, readOnly: true, isSignal: true },
      columnName: { defaultValue: null },
      tableName: { defaultValue: null },
      minVal: { defaultValue: null },
      maxVal: { defaultValue: null },
      signalEnabled: { defaultValue: false }
    };
  }

  // the filterType.  This is a Range filter
  get filterType () {
    return 'NumericSelect';
  }

  get widgetType () {
    return 'SliderWithValue';
  }

  get part () {
    return 'part://Dashboard Studio Development/galyleo/SliderFilter';
  }

  // init.  Called as soon as the filter is created.  The
  // columnName, minVal, and maxVal properties are set.   The initial value of the
  // min field is the minimum possible value, the initial value of the max field
  // is the maximum possible value.
  // When slider value changes, the filterChange signal should in general fire.  This
  // is not the case when we are initializing the slider, and so to prevent
  // false signals we disable this through the instance variable this.signalEnabled.
  // filterChange only fires when this.signalEnabled = true.  So we set to false
  // at the start of this method and set to true when done.
  // parameters:
  //    columnName -- the name of the column this filter is over.
  //    tableName -- the name of the table used for this list, which could be null.
  //                 Only used in serialization (persistentForm)
  //    minVal -- the minimum value this filter can take
  //    maxVal -- the maximum value this filter can take
  //    increment -- the increment between two slider positions

  init (columnName, tableName, minVal, maxVal, increment) {
    this.signalEnabled = false;
    const slider = this.getSubmorphNamed('slider');
    slider.minValue = this.minValue = minVal;
    slider.maxValue = this.maxValue = maxVal;
    slider.increment = increment;
    slider.value = (maxVal - minVal) / 2 + minVal;
    this.columnName = columnName;
    this.tableName = tableName;
    this.signalEnabled = true;
  }

  // Called when the value on the slider changes, through a hardcoded
  // connection.  Very simple -- just checks to see if the signal is enabled, and
  // if it is, signals that the filter has changed.
  // TODO -- check to see if we need to add a delay of a few ms to avoid too
  // many events.  The idea would be to set signalEnabled to false, then set a
  // timeout of a few ms, and at the end of that change signalEnabled to true and
  // fire the signal.

  valueChanged () {
    if (this.signalEnabled) {
      this.signalEnabled = false;
      setTimeout(_ => {
        signal(this, 'filterChanged');
        this.signalEnabled = true;
      }, 50);
      // signal(this, 'filterChanged');
    }
  }

  // Return the filter as a JavaScript object.  Per the requirement in
  // GoogleDataTable.getFilteredRows(), this must have a value field
  // It also has a columnName field, which processing
  // in the Dashboard (see __prepareFilters__) turns into a columnIndex
  // given the identity of the table being used for the filter.

  get filter () {
    return { columnName: this.columnName, value: this.getSubmorphNamed('slider').value };
  }

  // Return a short string describing the filter.  This is used to show the
  // action of the filter in chart titles, etc.

  get filterString () {
    return `${this.columnName} == ${this.getSubmorphNamed('slider').value}`;
  }

  // Return the storable version of this filter, for later restoration.  This
  // is used in dashboard store.  Just the parameters to init plus the
  // part and the current choices for min and max

  get persistentForm () {
    const slider = this.getSubmorphNamed('slider');
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

  // restore from a saved form created in persistentForm, immediately above.
  // This is used in dashboard load.  The sole parameter is an object of the
  // form created in persistentForm.

  restoreFromSavedForm (savedForm) {
    this.init(savedForm.columnName, savedForm.tableName, savedForm.minVal, savedForm.maxVal, savedForm.increment);
    this.signalEnabled = false;
    const slider = this.getSubmorphNamed('slider');
    // disable signaling before each set, in case the change handlers
    // re-enable

    slider.value = savedForm.value;
    this.signalEnabled = true;
  }
}

export class ToggleFilter extends Morph {
  /*
  ** A Toggle.  This implements the filter interface, namely:
  ** 1.  Signal when the filter is changed through the filterChanged property
  ** 2. Have a read-only filter propery which gives the filter itself,
  **    as a JavaScript object, in a form that can be used by
  **    GoogleDataTable.getFilteredRows().  This implements the filter
  **    with a value property.  See:
  **    https://developers.google.com/chart/interactive/docs/reference#methods
  **
  ** Properties:
  ** 1. filterChanged: fires when the filter has changed value.
  ** 2. columnName: the name of the column over which the filter is defined.
  **    Note that the table is not necessarily specified.
  ** This filter is created and initialized in Dashboard.makeFilterMorph
  */
  static get properties () {
    return {
      filterChanged: { derived: true, readOnly: true, isSignal: true },
      columnName: { defaultValue: null }
    };
  }

  // type of the filter.  This is a Select filter (Select here refers
  // to the type of filter function -- a Select Filter calls a single value)

  get filterType () {
    return 'Select';
  }

  // init.  Called as soon as the filter is created.  The
  // columnName property is set.  There is one input part, a slider, and
  // it is initialized with the min, max, and increment values for the
  // slider.
  // Note this is reliant on the choices parameter being non-null (not checked for)
  // parameters:
  //    columnName -- the name of the column this filter is over.

  init (columnName) {
    this.columnName = columnName;
    this.getSubmorphNamed('columnName').textString = columnName;
  }

  // Fire the filterChanged property.  This is called (hardcoded connection) when
  // the toggle state changes.

  signalFilterChanged () {
    signal(this, 'filterChanged');
  }

  // Return the filter as a JavaScript object.  Per the requirement in
  // GoogleDataTable.getFilteredRows(), this must have a value field, which
  // is quoted if the value is a string.  It also has a columnName field, which
  // processing in the Dashboard (see __prepareFilters__) turns into a columnIndex
  // given the identity of the table being used for the filter.

  get filter () {
    return { columnName: this.columnName, value: this.getSubmorphNamed('toggle').state };
  }

  // Return a short string describing the filter.  This is used to show the
  // action of the filter in chart titles, etc.

  get filterString () {
    return `${this.columnName} is ${this.getSubmorphNamed('toggle').state}`;
  }
}
