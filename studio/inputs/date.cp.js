import { signal } from 'lively.bindings/index.js';
import { component, ViewModel, part, ensureFont } from 'lively.morphic/components/core.js';
import { InputLine, Morph, TilingLayout, Icon, ShadowObject, Label } from 'lively.morphic';
import { Color, rect, pt } from 'lively.graphics/index.js';

import { arr, date } from 'lively.lang/index.js';

ensureFont({
  Barlow: 'https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap'
});

export class GalyleoDate extends Label {
  /*
  ** A Date -- a square morph that is a calendar day.  It has a dayNum, which is
  ** its day number on the calendar.  If the dayNum is <= 0, this is blank,
  ** otherwise it displays its dayNum.  this is set by dateArray.assignDates
  ** properties:
  ** dayNum -- the day of the month
  */
  static get properties () {
    return {
      dayNum: {
        after: ['autofit'],
        set (dayNum) {
          this.textString = dayNum > 9 ? dayNum : dayNum > 0 ? `  ${dayNum}` : '  ';
          this.setProperty('dayNum', dayNum);
        }
      }
    };
  }

  // mouseDown selects this day.  Just tell the owner about it.  Mousing down on
  // an empty day clears the selection globally.

  onMouseDown (evt) {
    if (this.dayNum && this.dayNum > 0) {
      this.owner.dateSelected(this);
    } else {
      this.owner.clearSelection();
    }
  }
}

export class DateArray extends Morph {
  /*
  ** An array of Dates, one of which may be selected.
  ** properties:
  ** selectedDates: the datemorphs which has been selected
  */
  static get properties () {
    return {
      rangeSelection: {
        defaultValue: false
      },
      renderedDates: {
        get () {
          return this.submorphs.filter(m => m.name !== 'selected line');
        }
      },
      selectedDates: {
        initialize () {
          this.selectedDates = [];
        }
      }
    };
  }

  // initialize the array.  The submorphs of this are all Dates, in order
  // left-right, bottom-top.  Top-left date is submorph 0, top-right is submorph 6,
  // etc.
  // parameters:
  //       numDates is the number of dates to assign days to,
  //       firstDate is the index of the first date, where 0 is top-left,
  //                 1 is top, next column, and 7 is second row.first colum
  assignDates (firstDate, numDates) {
    this.submorphs.forEach(dayMorph => dayMorph.dayNum = -1);
    const monthDates = this.submorphs.slice(firstDate, firstDate + numDates);
    monthDates.forEach((monthDate, index) => monthDate.dayNum = index + 1);
  }

  // draw the dates.  This just shows the highlighted date in blue, the rest
  // in black

  renderDates () {
    this.renderedDates.forEach((day, i) => {
      // day.extent = pt(19, 19);
      const isEmpty = day.value === '  ';
      if (this.selectedDates.includes(day) && !isEmpty) {
        return;
      }
      day.name = `day ${i}`;
      day.master = isEmpty ? DateDefault : { auto: DateDefault, hover: DateHover };
    });
    this.selectedDates.forEach(d => d.master = DateActive);
  }

  // Set the selected date from dayNum.  This is called by the owner when we have changed
  // months/years and/or the user has entered a date.  Takes in the day of the month
  // (1-31), finds the dateMorph corresponding to that, selects it, and renders.

  selectDateForDay (dayNum) {
    // this.selectDateForDay(9)
    const dates = this.submorphs.filter(dayMorph => dayMorph.dayNum === dayNum);
    if (dates.length !== 1) {
      return;
    }
    this.dateSelected(dates[0]);
  }

  // Set the selected date.  This is called by a submorph to indicate that it
  // should be selected

  dateSelected (date) {
    if (this.selectedDates.length > (this.rangeSelection ? 1 : 0)) {
      this.selectedDates = [];
    }
    this.selectedDates.push(date);
    if (this.selectedDates.length === 2) {
      const [startDate, endDate] = arr.sortBy(this.selectedDates, d => Number.parseInt(d.dayNum));
      this.highlightRange(startDate.dayNum, endDate.dayNum);
    } else {
      this.highlightRange();
    }
    signal(this, 'selectedDate');
    this.renderDates();
  }

  // visualize range by drawing a line from the beginning date to the end date
  async highlightRange (startDay, endDay) {
    const lineProto = part(SelectionBar, { name: 'selected line' });
    lineProto.master = false;
    this.getAllNamed('selected line').forEach(line => line.remove());
    const dateHeight = this.submorphs[0].height;

    Object.entries(
      arr.groupBy(
        this.submorphs.filter(d =>
          d.value !== '  ' && d.value >= startDay && d.value <= endDay), d => d.top)).forEach(([top, dates]) => {
      const left = arr.min(dates, d => d.left).left;
      const right = arr.max(dates, d => d.right).right;
      const line = lineProto.copy();
      this.addMorphBack(line);
      console.log(right, left);
      line.width = right - left;
      line.leftCenter = pt(left, Number.parseInt(top) + dateHeight / 2);
    });
  }

  // Set the selected dates.  This is called when the user clicks on a
  // blank square.

  clearSelection () {
    this.selectedDates = [];
    this.highlightRange();
    this.renderDates();
    signal(this, 'selectedDate');
  }
}

export class GalyleoDateInput extends InputLine {
  /* A DateInput.  This (obviously) extends InputLine to ensure that only Dates
  ** can be entered. Enforces this by using _checkDate_ to check if the entry is
  ** a Date (just checked by asking JavaScript to convert it to a date), and
  ** overriding acceptInput to only accept an input when it's a date.
  ** properties:
  **    date: the entered date.  updated as a side effect by acceptInput
  */
  static get properties () {
    return {
      date: {}
    };
  }

  // Check to see if the entered string is really a date, and returns the Date
  // if it is, null otherwise.  Called from acceptInput
  // parameters:
  //    dateString: the entered string
  // returns:
  //    the date represented by the string, if valid, null otherwise

  _checkDate_ (dateString) {
    const date = new Date(dateString);
    return date === 'Invalid Date' ? null : date;
  }

  // Override the acceptInput() method in the super.  Check to make sure the
  // input is a valid date; if it is, store it in the date property and call
  // super.acceptInput() to trigger any followon events, and then, finally,
  // show the formatted JavaScript date string.  If not, just show() in order to
  // indicate an error.

  acceptInput () {
    const date = this._checkDate_(this.input);
    if (date) {
      this.date = date;
      super.acceptInput();
      this.textString = this.date.toDateString();
    } else {
      this.show();
    }
  }
}

export default class DatePickerModel extends ViewModel {
  /*
  ** A DateSelector.  This is comprised of a DateArray, where the user selects
  ** the month byy clicking, four buttons used to go back a year, a month, forward
  ** a month, forward a year, and an date entry at the bottom that takes anything
  ** that Date will parse as a Date, and also serves as output.
  ** properties:
  ** 1. The month in range 1-12
  ** 2. The year
  ** 3. The selected date, which is found from this.month, this.year, and
  **    the date array's selected day.
  ** 4. dateChanged, a signal which is fired when the date changes.
  ** Setting the year and month also resets the date array.
  */
  static get properties () {
    return {
      // allows to cap the range of selectable dates to a minimum month
      minMonth: { defaultValue: false, min: 1, max: 12 },
      // allows to cap the range of selectable years to a minimum year
      minYear: { defaultValue: false },
      monthName: {
        readOnly: true,
        get () {
          return ['', 'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November',
            'December'][this.month];
        }
      },
      // The month.  Setting the month also calls this_.setMonthAndYear_ to reset
      // the date array.  First, ensure that month is an integer between 1 and 12,
      // returning with nothing done otherwise.  Then set the property month
      // so it is as requested.  Then make sure there is a year -- if not, set
      // the year to the current year.  If so, call _setMonthAndYear_ to set up
      // the date array.  Don't do this if we've set the year, because setting
      // the year will already do that, and when year is set the corresponding
      // code will see that month is set.
      month: {
        defaultValue: 1,
        set (month) {
          // month is 1 through 12

          if (isNaN(month)) {
            return;
          }
          let aMonth = Math.round(month);
          const minMonth = this.minMonth || 1;
          if (aMonth > 12) {
            return;
          }

          if (aMonth < minMonth) {
            aMonth = minMonth;
          }

          this.setProperty('month', aMonth);
          if (isNaN(this.year)) {
            this.year = new Date().getFullYear();
            // resetting the year calls _setMonthAndYear_
          } else {
            this._setMonthAndYear_();
          }
        }
      },
      year: {
        // Set the year.  Very similar to setting the month, so the comments
        // above that code apply here.  Check the bounds check; I am not
        // sure that JavaScript date does the Julian calendar appropriately, so
        // stick to 1753 to be safe (The last group to switch to Gregorian was in
        // 1752)
        defaultValue: 2020,
        set (year) {
          if (isNaN(year)) {
            return;
          }
          let aYear = Math.round(year);
          const minYear = this.minYear || 1753;
          if (aYear < minYear) {
            aYear = minYear;
          }
          this.setProperty('year', aYear);
          if (isNaN(this.month)) {
            this.month = 1;
            // resetting the month calls _setMonthAndYear_
          } else {
            this._setMonthAndYear_();
          }
        }
      },
      // The selectedDate is a date from the date array's dayNum selection.
      selectedDate: {
        derived: true,
        readOnly: true,
        get () {
          const day = this.ui.dateArray.selectedDates[0];
          if (day) {
            return new Date(`${this.month}-${day.dayNum}-${this.year}`);
          }
        }
      },
      //  fire when the date is changed.  This is activated by showDate(),
      // which is the final routine called when the date is changed.
      dateChanged: {
        derived: true, readOnly: true, isSignal: true
      },

      // allow support for range selection
      rangeSelection: { defaultValue: false },

      // if range selection is enabled, this contains the selected date range
      // within the month
      selectedDateRange: {
        derived: true,
        get () {
          return arr.sortBy(this.ui.dateArray.selectedDates, day => day.dayNum).map(day => {
            return new Date(`${this.month}-${day.dayNum}-${this.year}`);
          });
        }
      },

      bindings: {
        get () {
          return [{
            target: 'date array', signal: 'selectedDate', handler: 'showDate'
          }, {
            target: 'back year', signal: 'onMouseDown', handler: 'goBackYear'
          }, {
            target: 'back month', signal: 'onMouseDown', handler: 'goBackMonth'
          }, {
            target: 'forward month', signal: 'onMouseDown', handler: 'advanceMonth'
          }, {
            target: 'forward year', signal: 'onMouseDown', handler: 'advanceYear'
          }];
        }
      }
    };
  }

  canSelectDate (day, month, year) {
    if (this.minMonth && month < this.minMonth) return false;
    if (this.minYear && year < this.minYear) return false;
    return true;
  }

  // When a date is entered, we don't want to update the input/display bar,
  // and the _preserveInputDate_ flag guards that.  Initialize to false.

  viewDidLoad () {
    this._preserveInputDate_ = false;
    this._setMonthAndYear_();
  }

  onRefresh () {
    this.ui.dateArray.rangeSelection = this.rangeSelection;
  }

  // Update the current date from the dateInput submorph (the input at the
  // bottom).  As mentioned, this already has the correct date, so set
  // _preserveInputDate_ to true to keep it from updating.  Once we've updated
  // the properties and date array, set _preserveInputDate_ to false.
  // Connected to onInput from the input widget

  selectInputDate (date) {
    this.selectDate(date);
  }

  // Update this.month, this.year, and tell the date array to select the
  // day.  Note we have to add 1 to the month and 1 to the day since months
  // and days in JavaScript date are 0-based.  Called from selectInputDate
  // and exposed externally.
  // parameters:
  //   aDate: the date to set the values to.  A JavaScript Date object

  selectDate (aDate) {
    const dateArray = this.ui.dateArray;
    const month = aDate.getMonth() + 1;
    const year = aDate.getFullYear();
    const day = aDate.getDate();

    this._preserveInputDate_ = true;
    this.month = month;
    this.year = year;
    this._preserveInputDate_ = false;
    dateArray.selectDateForDay(day);
  }

  // Update the selected range of the date selector
  selectDateRange (startDate, endDate) {
    const { dateArray } = this.ui;
    const month = startDate.getMonth() + 1;
    const year = startDate.getFullYear();

    this._preserveInputDate_ = true;
    this.month = month;
    this.year = year;
    this._preserveInputDate_ = false;
    dateArray.selectDatesForRange(startDate.getDate(), endDate.getDate());
  }

  // Update the entry in the input widget at the bottom to show the current date.
  // Does two things: fires a dateChanged signal (connections to derived properties
  // do not propagate change events) and updates the date on the input bar
  // If _preserveInputDate_ is true, we are resetting to the currently shown
  // date, so do not update the input.  This is worse that a waste of time;
  // we actually update twice, on input, once for the month and year, and an
  // update here would set the entry to the wrong intermediate product.
  //  Called from _setMonthAndYear_ and connected to the dateArray selectedDate
  showDate () {
    let dateString = this.selectedDate ? this.selectedDate.toDateString() : `${this.monthName.slice(0, 3)} ${this.year}`;

    if (this.selectedDateRange.length === 2) {
      const start = date.dateFormat(this.selectedDateRange[0], 'dd');
      const end = date.dateFormat(this.selectedDateRange[1], 'dd');
      dateString = `${this.monthName.slice(0, 3)} ${start} - ${end} ${this.year}`;
    }

    if (!this._preserveInputDate_) { 
      signal(this, 'dateChanged', dateString); 
      this.ui.dateInput.textString = dateString;
    }
  }

  // Set up the month and year.  Just initialize the date array to show this.month
  // and this.year.  DateArray knows nothing about months, so it needs the day of
  // week (0-6) for the first day of the month, and how many days there are in
  // the month.  Use Date() to figure out the first day in the month, lookup the
  // number of days, set the title string in monthLabel.  Preserve the currently-
  // selected day of month, and re-select it if possible; if not, select the
  // last day of the month, and if there is no currently-selected day, select
  // the 1st.  Finally, call _showDate_() to update the selection string in the
  // input widget.  Called when this.month and this.year are set.

  _setMonthAndYear_ () {
    if (!this.view) return;
    const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    // this.getSubmorphNamed('monthLabel').textString = `${monthName[this.month]} ${this.year}`;
    const { dateArray, monthLabel } = this.ui;
    const day = new Date(`${this.month}-1-${this.year}`).getDay();
    const dates = dateArray.selectedDates;
    const lastDay = daysInMonth[this.month];

    monthLabel.value = this.monthName.slice(0, 3);

    dateArray.assignDates(day, daysInMonth[this.month]);

    if (this.rangeSelection) { dateArray.clearSelection(); }

    if (!this._preserveInputDate_) {
      const clamp = date => date ? date.dayNum <= lastDay ? date.dayNum : lastDay : 1;

      if (dates.length > 1) {
        dateArray.selectDateForDay(clamp(dates[0]));
        dateArray.selectDateForDay(clamp(dates[1]));
      } else {
        const date = dates[0];
        dateArray.selectDateForDay(clamp(date));
      }
      dateArray.renderDates();
      this.showDate();
    }
  }

  // Target methods for the buttons.  They are in the order they appear in
  // the button bar.  Connections are hardcoded to the fire property of the
  // button

  // go back a year.  connected to << button

  goBackYear () {
    this.year = this.year - 1;
  }

  // go back a month.  Connected to the < button
  // Of course, roll back from 1/n to 12/n-1

  goBackMonth () {
    if (this.month === 1) {
      this.month = 12;
      this.year = this.year - 1;
    } else {
      this.month = this.month - 1;
    }
  }

  // go forward a month.  Connected to the > button
  // Of course, roll back from 12/n to 1/n+1

  advanceMonth () {
    if (this.month === 12) {
      this.month = 1;
      this.year = this.year + 1;
    } else {
      this.month = this.month + 1;
    }
  }

  // go forward a year.  Connected to the >> button.

  advanceYear () {
    this.year = this.year + 1;
  }
}

class DoubleDatePickerModel extends ViewModel {
  /*
  ** A double-date picker; pick a min and a max date from the date pickers
  ** on, respectively, the left and right.
  ** properties:
  **    1. dateRange: {min: minimum date, max: maximum date}
  **    2. datesChanged: signal, fired when the dates changed.
  */
  static get properties () {
    return {
      collapsed: {
        set (active) {
          this.setProperty('collapsed', active);
          this.collapse(active);
        }
      },
      dateRange: {
        derived: true,
        // set.  Just sanity check to make sure the min/max are both dates,
        // then make sure the smaller date is on the left.
        set (aDateRange) {
          // sanity-check
          const fieldOK = field => aDateRange[field] && aDateRange[field] instanceof Date;
          if (fieldOK('min') && fieldOK('max')) {
            if (aDateRange.min <= aDateRange.max) {
              this.models.minDateSelector.selectDate(aDateRange.min);
              this.models.maxDateSelector.selectDate(aDateRange.max);
            } else {
              this.models.minDateSelector.selectDate(aDateRange.min);
              this.models.maxDateSelector.selectDate(aDateRange.max);
            }
          }
        },
        get () {
          const [min, max] = [
            ...this.models.minDateSelector.selectedDateRange,
            ...this.models.maxDateSelector.selectedDateRange
          ];
          return { min, max };
        }
      },
      datesChanged: {
        derived: true, readOnly: true, isSignal: true
      },
      bindings: {
        get () {
          return [
            { model: 'min date selector', signal: 'dateChanged', handler: 'updateDates', updater: '($upd, date) => $upd(source, date)' },
            { model: 'max date selector', signal: 'dateChanged', handler: 'updateDates', updater: '($upd, date) => $upd(source, date)' }
          ];
        }
      }
    };
  }

  onLoad () {
    this._doNothingOnUpdate_ = false;
  }

  // update the dates.  Just make sure the dates on the left and right are in order
  // and then signals that the dates have changed.
  // hardcorded connection from minDateSelector.dateChanged and
  // maxDateSelector.dateChange
  updateDates (selector, dateString) {
    if (this._doNothingOnUpdate_) {
      return;
    }
    const minSelector = this.models.minDateSelector;
    const maxSelector = this.models.maxDateSelector;

    if (minSelector.year > maxSelector.year) {
      maxSelector.year = minSelector.year + (maxSelector.month < 12 ? 0 : 1);
      if (maxSelector.month === 12) maxSelector.month = 1;
      maxSelector.ui.dateArray.clearSelection();
    }
    if (minSelector.year === maxSelector.year &&
          minSelector.month >= maxSelector.month) {
      maxSelector.month = minSelector.month + 1;
      maxSelector.ui.dateArray.clearSelection();
      maxSelector.view.whenRendered().then(() => {
        maxSelector.showDate();
      });
    }

    const range = this.dateRange;

    if (range.min > range.max) {
      this._doNothingOnUpdate_ = true;
      const min = new Date(range.min);
      const max = new Date(range.max);
      this.updates.push({ min: min, max: max });
      minSelector.selectDate(max);
      maxSelector.selectDate(min);
      this._doNothingOnUpdate_ = false;
    }

    if (selector === minSelector) { this.ui.startInput.textString = dateString; }
    if (selector === maxSelector) { this.ui.endInput.textString = dateString; }

    this.renderRangeMarks(selector);

    signal(this, 'datesChanged');
  }

  // if two dates are selected, the range between them is visually
  // highlighted

  async renderRangeMarks (selector) {
    this._doNothingOnUpdate_ = true;
    const minDateSelector = this.models.minDateSelector;
    const minDateArray = minDateSelector.ui.dateArray;
    const selectedMinDates = minDateArray.selectedDates;
    const maxDateSelector = this.models.maxDateSelector;
    const maxDateArray = maxDateSelector.ui.dateArray;
    const selectedMaxDates = maxDateArray.selectedDates;

    const maxReset = selector === maxDateSelector && selectedMaxDates.length === 0;
    const minReset = selector === minDateSelector && selectedMinDates.length === 0;
    const totalDates = [...selectedMinDates, ...selectedMaxDates];

    if (maxReset || minReset) {
      minDateArray.clearSelection();
      maxDateArray.clearSelection();
    }

    if (selector === maxDateSelector && totalDates.length > 2) {
      minDateArray.clearSelection();
    }

    if (selector === minDateSelector && totalDates.length > 2) {
      maxDateArray.clearSelection();
    }

    if (selectedMinDates.length === 1 && selectedMaxDates.length === 1) {
      minDateArray.highlightRange(
        selectedMinDates[0].dayNum,
        arr.last(minDateArray.submorphs.filter(m => m.dayNum > -1)).dayNum);
      maxDateArray.highlightRange(
        arr.first(maxDateArray.submorphs.filter(m => m.dayNum > -1)).dayNum,
        selectedMaxDates[0].dayNum);
    } else if (selectedMinDates.length < 2 && selectedMaxDates.length < 2) {
      minDateArray.highlightRange();
      maxDateArray.highlightRange();
    }
    this._doNothingOnUpdate_ = false;
  }

  collapse (active) {
    this.withAnimationDo(() => {
      this.height = active
        ? 90
        : this.submorphBounds().height;
    }, { duration: 200 });
  }
}

const DateInput = component({
  type: GalyleoDateInput,
  name: 'date input',
  borderColor: Color.rgb(204, 204, 204),
  borderRadius: 20,
  extent: pt(115.8, 23.3),
  fill: Color.rgb(253, 254, 254),
  fontColor: Color.rgb(66, 73, 73),
  fontFamily: 'Barlow',
  fontSize: 13,
  fontWeight: 500,
  haloShadow: new ShadowObject({
    blur: 6,
    color: Color.fromLiteral({
      a: 1,
      b: 0.8588235294117647,
      g: 0.596078431372549,
      r: 0.20392156862745098
    }),
    fast: false,
    distance: 0,
    rotation: 45
  }),
  highlightWhenFocused: true,
  padding: rect(10, 3, 0, 3),
  position: pt(291.6, 759.5),
  renderOnGPU: true,
  textAlign: 'left'
});

// DateDefault.openInWorld()
const DateDefault = component({
  type: GalyleoDate,
  name: 'date/default',
  autofit: false,
  dayNum: 1,
  fill: Color.rgba(255, 255, 255, 0),
  fontColor: Color.rgb(81, 90, 90),
  padding: rect(4, 2, 2, 2),
  fontFamily: 'Barlow',
  fontWeight: 500,
  borderRadius: 50
});

const DateHover = component(DateDefault, {
  name: 'date/hover',
  fill: Color.rgba(0, 0, 0, 0.15)
});

// DateActive.openInWorld()
const DateActive = component(DateDefault, {
  name: 'date/active',
  fontColor: Color.white,
  fill: Color.rgb(247, 147, 30)
});

const DayOfWeek = component({
  type: Label,
  name: 'day of week',
  fill: Color.rgba(255, 255, 255, 0),
  fontColor: Color.rgb(66, 73, 73),
  fontFamily: 'Barlow',
  fontWeight: 600,
  position: pt(367.6, 433),
  renderOnGPU: true,
  textAndAttributes: [' S', null]
});

const CalendarNavButton = component({
  name: 'calendar nav button',
  borderColor: Color.rgb(149, 165, 166),
  borderRadius: 5,
  extent: pt(25.5, 24.1),
  fill: Color.rgba(0, 0, 204, 0),
  nativeCursor: 'pointer',
  position: pt(369, 477.3),
  renderOnGPU: true,
  submorphs: [{
    type: Label,
    name: 'label',
    fontColor: Color.rgb(66, 73, 73),
    fontSize: 14,
    position: pt(7.5, 5),
    reactsToPointer: false,
    textAndAttributes: Icon.textAttribute('angle-double-right')
  }]
});

// SelectionBar.openInWorld()
const SelectionBar = component({
  name: 'selection bar',
  borderColor: Color.rgb(23, 160, 251),
  borderRadius: 10,
  extent: pt(144.3, 13.1),
  fill: Color.rgb(247, 147, 30),
  isLayoutable: false,
  opacity: 0.5,
  position: pt(301.4, 660.8),
  reactsToPointer: false
});

// part(DatePicker, { viewModel: { month: 1, year: 2022, rangeSelection: true }}).openInWorld()
// DatePicker.openInWorld()
const DatePicker = component({
  defaultViewModel: DatePickerModel,
  name: 'date picker',
  layout: new TilingLayout({
    axis: 'column',
    orderByIndex: true,
    resizePolicies: [['date input', {
      height: 'fixed',
      width: 'fill'
    }], ['buttonBar', {
      height: 'fixed',
      width: 'fill'
    }], ['daybar', {
      height: 'fixed',
      width: 'fill'
    }], ['date array', {
      height: 'fixed',
      width: 'fill'
    }]],
    wrapSubmorphs: false
  }),
  borderColor: Color.rgb(23, 160, 251),
  borderRadius: 6,
  clipMode: 'hidden',
  extent: pt(166.6,245.9),
  fill: Color.rgb(247,180,30),
  position: pt(327.2, 247.1),
  submorphs: [{
    type: Label,
    name: 'monthLabel',
    fontColor: Color.rgb(253, 254, 254),
    fontWeight: 300,
    padding: rect(10, 2, -10, 13),
    textAndAttributes: ['Select date', null]
  }, part(DateInput, {
    name: 'date input',
    extent: pt(152, 31),
    fill: Color.transparent,
    fontColor: Color.white,
    borderRadius: 3,
    fontSize: 18,
    fontWeight: 500
  }), {
    name: 'buttonBar',
    borderColor: Color.rgb(23, 160, 251),
    extent: pt(153.6, 26),
    fill: Color.rgb(242, 242, 242),
    layout: new TilingLayout({
      align: 'center',
      axisAlign: 'center',
      justifySubmorphs: 'spaced',
      orderByIndex: true,
      padding: rect(3, 0, 0, 0)
    }),
    submorphs: [{
      type: Label,
      name: 'month label',
      fontColor: Color.rgb(66, 73, 73),
      fontFamily: 'Barlow',
      fontSize: 13,
      fontWeight: 'bold',
      padding: rect(5, 0, -5, 0),
      reactsToPointer: false,
      textAndAttributes: ['Nov', null]
    }, part(CalendarNavButton, {
      name: 'back year',
      submorphs: [{
        name: 'label',
        textAndAttributes: Icon.textAttribute('angle-double-left')
      }],
      tooltip: 'Jump to previous year'
    }), part(CalendarNavButton, {
      name: 'back month',
      submorphs: [{
        name: 'label',
        textAndAttributes: Icon.textAttribute('angle-left')
      }],
      tooltip: 'Jump to previous month'
    }), part(CalendarNavButton, {
      name: 'forward month',
      submorphs: [{
        name: 'label',
        textAndAttributes: Icon.textAttribute('angle-right')
      }],
      tooltip: 'Jump to next month'
    }), part(CalendarNavButton, {
      name: 'forward year',
      submorphs: [{
        name: 'label',
        textAndAttributes: Icon.textAttribute('angle-double-right')
      }],
      tooltip: 'Jump to next year'
    })]
  }, {
    name: 'daybar',
    layout: new TilingLayout({
      justifySubmorphs: 'spaced',
      orderByIndex: true,
      padding: rect(5, 0, 5, 0)
    }),
    borderColor: Color.rgb(23, 160, 251),
    extent: pt(154.2, 19),
    fill: Color.rgb(242, 242, 242),
    submorphs: [
      part(DayOfWeek, {
        name: 'sunday',
        textAndAttributes: [' S', null]
      }),
      part(DayOfWeek, {
        name: 'monday',
        textAndAttributes: [' M', null]
      }), 
      part(DayOfWeek, {
        name: 'tuesday',
        textAndAttributes: [' T', null]
      }), 
      part(DayOfWeek, {
        name: 'wednesday',
        textAndAttributes: [' W', null]
      }), 
      part(DayOfWeek, {
        name: 'thursday',
        textAndAttributes: ['T', null]
      }),
      part(DayOfWeek, {
        name: 'friday',
        textAndAttributes: [' F', null]
      }),
      part(DayOfWeek, {
        name: 'saturday',
        textAndAttributes: [' S', null]
      })]
  }, {
    type: DateArray,
    name: 'date array',
    borderColor: Color.rgb(23, 160, 251),
    dropShadow: false,
    extent: pt(161, 139.5),
    fill: Color.rgb(242, 242, 242),
    layout: new TilingLayout({
      orderByIndex: true,
      padding: rect(3, 0, 0, 0),
      spacing: 2
    }),
    selectedDates: [],
    submorphs: arr.range(1, 41).map(i => part(DateDefault, {
      master: { auto: DateDefault, hover: DateHover },
      name: 'day ' + i,
      dayNum: i
    }))
  }]
});

// part(DoubleDatePicker).openInWorld()
const DoubleDatePicker = component({
  name: 'double date picker',
  defaultViewModel: DoubleDatePickerModel,
  extent: pt(123.5, 82.1),
  fill: Color.transparent,
  layout: new TilingLayout({
    orderByIndex: true,
    wrapSubmorphs: false,
    hugContentsVertically: true,
    hugContentsHorizontally: true
  }),
  submorphs: [
    part(DatePicker, {
      name: 'min date selector',
      borderRadius: { topLeft: 6, topRight: 0, bottomLeft: 6, bottomRight: 0 },
      viewModel: { rangeSelection: true },
      submorphs: [{
        name: 'monthLabel',
        textAndAttributes: ['Select date range', null]
      }, {
        name: 'date input',
        opacity: 0,
        reactsToPointer: false
      }] 
    }),
    part(DatePicker, {
      name: 'max date selector',
      borderRadius: { topLeft: 0, topRight: 6, bottomLeft: 0, bottomRight: 6 }, 
      viewModel: { rangeSelection: true },
      submorphs: [{
        name: 'monthLabel',
        opacity: 0
      }, {
        name: 'date input',
        opacity: 0,
        reactsToPointer: false
      }] 
    }), {
      name: 'date inputs',
      position: pt(0, 19),
      isLayoutable: false,
      borderColor: Color.rgb(23, 160, 251),
      borderWidth: 0,
      extent: pt(307.4, 45),
      fill: Color.rgba(0, 0, 0, 0),
      layout: new TilingLayout({
        justifySubmorphs: 'spaced',
        orderByIndex: true,
        padding: rect(10, 10, 0, 0),
        wrapSubmorphs: false
      }),
      reactsToPointer: false,
      submorphs: [
        part(DateInput, {
          name: 'start input',
          dropShadow: new ShadowObject({ distance: 0, blur: 0 })
        }),
        {
          type: Label,
          name: 'arrow',
          fontColor: Color.rgb(253, 254, 254),
          fontSize: 22,
          fontWeight: 300,
          textAndAttributes: Icon.textAttribute('arrow-alt-circle-right')
        }, part(DateInput, {
          name: 'end input',
          dropShadow: new ShadowObject({ distance: 0, blur: 0 })
        })
      ]
    } 
  ]  
});

export { DateDefault, DateInput, CalendarNavButton, DayOfWeek, DatePicker, DoubleDatePicker };
