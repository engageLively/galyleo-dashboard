import { Label } from 'lively.morphic/text/label.js';
import { signal } from 'lively.bindings/index.js';

export class Date extends Label {
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
          this.textString = dayNum > 9 ? dayNum : dayNum > 0 ? ` ${dayNum}` : '  ';
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

import { Morph } from 'lively.morphic';
import { Color, pt } from 'lively.graphics/index.js';
import { resource } from 'lively.resources/index.js';
import { arr, date } from 'lively.lang/index.js';

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
    this.getSubmorphsByStyleClassName('Date').forEach((day, i) => {
      day.extent = pt(19, 19);
      const isEmpty = day.value == '  ';
      if (this.selectedDates.includes(day) && !isEmpty) {
        return;
      }
      day.name = `day ${i}`;
      day.master = isEmpty ? 'styleguide://Sliders/date picker/date/default' : 'styleguide://Sliders/date picker/date';
    });
    this.selectedDates.forEach(d =>
      d.master = 'styleguide://Sliders/date picker/date/selected');
  }

  // Set the selected date from dayNum.  This is called by the owner when we have changed
  // months/years and/or the user has entered a date.  Takes in the day of the month
  // (1-31), finds the dateMorph corresponding to that, selects it, and renders.

  selectDateForDay (dayNum) {
    // this.selectDateForDay(9)
    const dates = this.submorphs.filter(dayMorph => dayMorph.dayNum == dayNum);
    if (dates.length != 1) {
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
    if (this.selectedDates.length == 2) {
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
    const lineProto = await resource('part://Sliders/date picker/selection bar').read();
    lineProto.name = 'selected line';
    lineProto.master = false;
    const linesInToSelect = [];
    this.getAllNamed('selected line').forEach(line => line.remove());
    const dateHeight = this.submorphs[0].height;

    Object.entries(
      arr.groupBy(
        this.submorphs.filter(d =>
          d.value != '  ' && d.value >= startDay && d.value <= endDay), d => d.top)).forEach(([top, dates]) => {
      const left = arr.min(dates, d => d.left).left;
      const right = arr.max(dates, d => d.right).right;
      const line = lineProto.copy();
      this.addMorphBack(line);
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

import { InputLine } from 'lively.morphic';

export class DateInput extends InputLine {
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
    return date == 'Invalid Date' ? null : date;
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

export default class DateSelector extends Morph {
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
        derived: true,
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
        derived: true,
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
          const day = this.getSubmorphNamed('dateArray').selectedDates[0];
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
      rangeSelection: {
        derived: true,
        set (active) {
          this.getSubmorphNamed('dateArray').rangeSelection = active;
        },
        get () {
          return this.getSubmorphNamed('dateArray').rangeSelection;
        }
      },

      // if range selection is enabled, this contains the selected date range
      // within the month
      selectedDateRange: {
        derived: true,
        get () {
          return arr.sortBy(this.getSubmorphNamed('dateArray').selectedDates, day => day.dayNum).map(day => {
            return new Date(`${this.month}-${day.dayNum}-${this.year}`);
          });
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

  onLoad () {
    this._preserveInputDate_ = false;
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
    const dateArray = this.getSubmorphNamed('dateArray');
    const month = aDate.getMonth() + 1;
    const year = aDate.getFullYear();
    const day = aDate.getDate();

    this._preserveInputDate_ = true;
    this.month = month;
    this.year = year;
    this._preserveInputDate_ = false;
    dateArray.selectDateForDay(day);
  }

  // Update the selected range of the date selector.

  selectDateRange (startDate, endDate) {
    const dateArray = this.getSubmorphNamed('dateArray');
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

    if (this.selectedDateRange.length == 2) {
      const start = date.dateFormat(this.selectedDateRange[0], 'dd');
      const end = date.dateFormat(this.selectedDateRange[1], 'dd');
      dateString = `${this.monthName.slice(0, 3)} ${start} - ${end} ${this.year}`;
    }

    if (!this._preserveInputDate_) { signal(this, 'dateChanged', dateString); }
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
    const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    // this.getSubmorphNamed('monthLabel').textString = `${monthName[this.month]} ${this.year}`;
    const dateArray = this.getSubmorphNamed('dateArray');
    const day = new Date(`${this.month}-1-${this.year}`).getDay();
    const dates = this.getSubmorphNamed('dateArray').selectedDates;
    const lastDay = daysInMonth[this.month];

    this.getSubmorphNamed('month label').value = this.monthName.slice(0, 3);

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
    if (this.month == 1) {
      this.month = 12;
      this.year = this.year - 1;
    } else {
      this.month = this.month - 1;
    }
  }

  // go forward a month.  Connected to the > button
  // Of course, roll back from 12/n to 1/n+1

  advanceMonth () {
    if (this.month == 12) {
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

class DoubleDatePicker extends Morph {
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
              this.getSubmorphNamed('minDateSelector').selectDate(aDateRange.min);
              this.getSubmorphNamed('maxDateSelector').selectDate(aDateRange.max);
            } else {
              this.getSubmorphNamed('minDateSelector').selectDate(aDateRange.min);
              this.getSubmorphNamed('maxDateSelector').selectDate(aDateRange.max);
            }
          }
        },
        get () {
          const [min, max] = [
            ...this.getSubmorphNamed('minDateSelector').selectedDateRange,
            ...this.getSubmorphNamed('maxDateSelector').selectedDateRange
          ];
          return { min, max };
        }
      },
      datesChanged: {
        derived: true, readOnly: true, isSignal: true
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
  updateDates (selector) {
    if (this._doNothingOnUpdate_) {
      return;
    }
    const minSelector = this.getSubmorphNamed('minDateSelector');
    const maxSelector = this.getSubmorphNamed('maxDateSelector');

    if (minSelector.year > maxSelector.year) {
      maxSelector.year = minSelector.year + (maxSelector.month < 12 ? 0 : 1);
      if (maxSelector.month == 12) maxSelector.month = 1;
      maxSelector.getSubmorphNamed('dateArray').clearSelection();
    }
    if (minSelector.year == maxSelector.year &&
          minSelector.month >= maxSelector.month) {
      maxSelector.month = minSelector.month + 1;
      maxSelector.getSubmorphNamed('dateArray').clearSelection();
      maxSelector.whenRendered().then(() => {
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

    this.renderRangeMarks(selector);

    signal(this, 'datesChanged');
  }

  // if two dates are selected, the range between them is visually
  // highlighted

  async renderRangeMarks (selector) {
    this._doNothingOnUpdate_ = true;
    const minDateSelector = this.getSubmorphNamed('minDateSelector');
    const minDateArray = minDateSelector.getSubmorphNamed('dateArray');
    const selectedMinDates = minDateArray.selectedDates;
    const maxDateSelector = this.getSubmorphNamed('maxDateSelector');
    const maxDateArray = maxDateSelector.getSubmorphNamed('dateArray');
    const selectedMaxDates = maxDateArray.selectedDates;

    const maxReset = selector == maxDateSelector && selectedMaxDates.length == 0;
    const minReset = selector == minDateSelector && selectedMinDates.length == 0;
    const totalDates = [...selectedMinDates, ...selectedMaxDates];

    if (maxReset || minReset) {
      minDateArray.clearSelection();
      maxDateArray.clearSelection();
    }

    if (selector == maxDateSelector && totalDates.length > 2) {
      minDateArray.clearSelection();
    }

    if (selector == minDateSelector && totalDates.length > 2) {
      maxDateArray.clearSelection();
    }

    if (selectedMinDates.length == 1 && selectedMaxDates.length == 1) {
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

  // this.collapsed = false
}
