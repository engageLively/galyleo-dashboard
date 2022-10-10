import { Morph } from 'lively.morphic/morph.js';
import { pt, rect, Color } from 'lively.graphics/index.js';
import { signal, connect } from 'lively.bindings/index.js';
import { component, ViewModel, part } from 'lively.morphic/components/core.js';
import { Label, TilingLayout, ShadowObject, InputLine, Icon } from 'lively.morphic';

export class SliderModel extends ViewModel {
  /*
  ** A Slider with a knob to set the value.
  ** properties:
  ** minValue: the minimum possible value for this slider
  ** maxValue: the maximum possible value for this slider
  ** increment: the distance between two adjacent numbers on this slider
  ** value:  The current value indicated by the knob of this slider.
  **
  */
  static get properties () {
    return {
      valueChanged: { derived: true, readOnly: true, isSignal: true },
      minValue: { defaultValue: 0 },
      maxValue: { defaultValue: 100 },
      increment: {
        defaultValue: 1,
        set (aVal) {
          this.setProperty('increment', aVal || 1);
        }
      },
      value: {
        after: ['submorphs', 'minValue', 'maxValue', 'increment'],
        // set the value to the input value.  Make sure the value is OK,
        // Then set the knob position to the right position for this value
        // This is primarily set from the text inputs.
        set (aValue) {
          if (aValue === this.value) {
            return;
          }
          aValue = this._normalizeValue_(aValue);
          const xPos = this._xPosForValue_(aValue);
          if (this.view) {
            this.knob.position = pt(xPos, 0);
          }
        },
        // read the  values from the position of the knob.  Make sure
        // that the knob exists (i.e., is rendered) before calling.
        get () {
          if (this.knob) {
            return this.valueForX(this.knob.position.x);
          } else {
            return this._normalizeValue_((this.maxValue + this.minValue) / 2);
          }
        }
      },
      expose: {
        get () {
          return ['value', 'maxValue', 'minValue', 'increment'];
        }
      },
      bindings: {
        get () {
          return [
            { target: 'knob', signal: 'position', handler: 'signalValueChanged' },
            { signal: 'onMouseDown', handler: '_doEvt_', override: true },
            { signal: 'onDragStart', handler: '_doEvt_', override: true },
            { signal: 'onDragEnd', handler: '_doEvt_', override: true },
            { signal: 'onDrag', handler: '_doEvt_', override: true }
          ];
        }
      }
    };
  }

  // convenience to get the knob

  get knob () {
    return this.ui.knob;
  }

  get minPos () {
    return 0;
  }

  // Fire the valueChanged signal.  This should only be fired once when
  // the value changes.  ATM, whenever the value changes the knob changes
  // position, so the knob position is tied to this.
  signalValueChanged () {
    signal(this, 'valueChanged');
    signal(this.view, 'valueChanged');
  }

  // The maximum position of the  knob.  The value of the knob
  // is given by its x-position (left-hand edge), so the max position has the
  // right-hand edge at the end of the slider.

  get maxPos () {
    return this.view.extent.x - this.knob.extent.x;
  }

  // make sure a value is an integer number of increments, and it's between the
  // minimum and the maximum value

  _normalizeValue_ (aValue) {
    aValue = Math.round(aValue / this.increment) * this.increment;
    return Math.max(Math.min(aValue, this.maxValue), this.minValue);
  }

  // return the x-coordinate corresponding to a particular value.  First, normalize
  // the value, then compute its proportion of the total range.  Then multiply
  // that by the position range, add to the minimum, and you have the x-coordinate
  // corresponding to a value.

  _xPosForValue_ (value) {
    if (value >= this.maxValue) {
      return this.maxPos;
    }
    if (value <= this.minValue) {
      return this.minPos;
    }
    value = this._normalizeValue_(value);
    return (value - this.minValue) / (this.maxValue - this.minValue) * (this.maxPos - this.minPos) + this.minPos;
  }

  // return the value corresponding to an x-coordinate.  compute the x-position as
  // a proportion of the total range.  Then multiply that by the value range, add
  // to the minimum value, then normalize to it's an integer multiple of increment.

  valueForX (xPos) {
    const value = (xPos - this.minPos) / (this.maxPos - this.minPos) * (this.maxValue - this.minValue) + this.minValue;
    return this._normalizeValue_(value);
  }

  // Set defaults for the properties to make sure we have them

  setDefaults () {
    this.minValue = 0; this.maxValue = 100; this.increment = 1;
    this.value = 50;
  }

  // ensure that none of the basic properties are NaNs.  Try to preserve
  // existing properties (which is why this isn't just setDefaults)

  _ensureProperties_ () {
    if (isNaN(this.maxValue) && isNaN(this.minValue)) {
      this.setDefaults();
    } else if (isNaN(this.maxValue)) {
      this.maxValue = this.minValue + 100;
      this.increment = 1;
    } else if (isNaN(this.minValue)) {
      this.minValue = this.maxValue - 100;
      this.increment = 1;
    } else if (isNaN(this.increment)) {
      this.increment = (this.maxValue - this.minValue) * 0.01;
    }
  }

  onLoad () {
    this._ensureProperties_();
  }

  incrementValue () {
    this.value += this.increment;
  }

  decrementValue () {
    this.value -= this.increment;
  }

  // A utility called by the drag routines, below

  _normalizePosition_ (x) {
    const normalX = Math.max(this.minPos, Math.min(this.maxPos, x - this.knob.width / 2));
    this.knob.position = pt(normalX, 0);
  }

  // these routines mirror the corresponding routines in Knob.  The basics of all
  // of this is just to move the knob in response to mouse actions.  When the
  // user drags the slider, he thinks he's dragging the knob.

  _doEvt_ ($super, evt) {
    this._normalizePosition_(evt.positionIn(this.view).x);
  }
}

class SliderInputLabelMorph extends Morph {
  static get properties () {
    return {
      defaultWidth: {
        readOnly: true,
        get () { return 36; }
      },
      fitting: {
        type: 'Enum',
        values: ['scaleToFit', 'fitToContent', 'clipContent'],
        defaultValue: 'scaleToFit'
      },
      value: {
        derived: true,
        set (v) {
          this.getSubmorphNamed('sliderValue').input = String(v);
          this.relayout();
        },
        get () {
          return this.getSubmorphNamed('sliderValue').input;
        }
      }
    };
  }

  onInput () {
    signal(this, 'inputChanged');
  }

  relayout () {
    if (this.fitting) this[this.fitting]();
    this.submorphs.forEach(m => {
      m.center = m.center.withX(this.width / 2);
    });
  }

  scaleToFit () {
    const defaultFontSize = 13;
    const defaultPadding = 8;
    const valueContainer = this.getSubmorphNamed('sliderValue');
    const nominalWidth = valueContainer.env.fontMetric.measure({
      fontFamily: valueContainer.fontFamily,
      fontSize: 13
    }, valueContainer.input).width + this.defaultWidth / 2;
    valueContainer.fontSize = defaultFontSize * Math.min(1, (this.width - defaultPadding) / nominalWidth);
  }

  fitToContent () {
    const valueContainer = this.getSubmorphNamed('sliderValue');
    valueContainer.width = valueContainer.textBounds().width + 10;
  }

  clipContent () {
    this.getSubmorphNamed('sliderValue').width = this.defaultWidth;
  }

  onMouseUp (evt) {
    super.onMouseUp(evt);
    const actions = {
      'increment button': () => signal(this, 'increment'),
      'decrement button': () => signal(this, 'decrement')
    };

    const action = actions[evt.targetMorph.name];
    if (action) action();
  }
}

class SliderKnob extends Morph {
  // A Slider knob.  This is freely dragged along the x-axis between the
  // bounds given by this.owner.extent.x - this.width (right edge never goes
  // beyond the owner bounds), and its y position is always 0.
  // _normalizePosition_ just ensures that the x position is within reasonable
  // bounds and the y position is 0
  _normalizePosition_ () {
    const x = this.position.x;
    const maxPosition = this.owner.extent.x - this.width;
    this.position = pt(Math.max(0, Math.min(maxPosition, x)), 0);
    this._updateValue_();
  }

  // The drag events are all the same -- do the super, which will move the knob,
  // and then normalize position

  onDragStart (evt) {
    super.onDragStart(evt);
    this._normalizePosition_();
  }

  onDrag (evt) {
    super.onDrag(evt);
    this._normalizePosition_();
  }

  onDragEnd (evt) {
    super.onDragEnd(evt);
    this._normalizePosition_();
  }

  // _updateValue_().  Dead code from when we had a a value label on
  // the knob, which was a bad idea.

  _updateValue_ () {
    // this.getSubmorphNamed('valueLabel').setValue(this.owner.valueForX(this.position.x));
  }
}

class DoubleSliderModel extends ViewModel {
  /*
  ** A Double Slider with knobs on the max and min.
  ** properties:
  ** minValue: the minimum possible value for this slider
  ** maxValue: the maximum possible value for this slider
  ** increment: the distance between two adjacent numbers on this slider
  ** range: a derived object with max and min: the current values indicated
  **        by the knobs of this slider.
  */
  static get properties () {
    return {
      rangeChanged: { derived: true, readOnly: true, isSignal: true },
      minValue: { defaultValue: 0 },
      maxValue: { defaultValue: 100 },
      increment: { defaultValue: 1 },
      range: {
        after: ['minValue', 'maxValue', 'increment'],
        // set the range to the input range.  First, make sure the values are OK,
        // and range.min < range.max by at least increment.  Then set the knob
        // positions to the right positions for this value.  This is primarily
        // set from the text inputs.
        set (aRange) {
          let minVal = this._normalizeValue_(aRange.min);
          let maxVal = this._normalizeValue_(aRange.max);
          if (maxVal === minVal) {
            if (maxVal === this.maxValue) {
              minVal = maxVal - this.increment;
            } else {
              maxVal = minVal + this.increment;
            }
          }
          if (this.view) {
            this.ui.minKnob.position = pt(this._xForValue_(minVal), 0);
            this.ui.maxKnob.position = pt(this._xForValue_(maxVal), 0);
            this.updateConnector();
          }
        },
        get () {
          return this.view
            ? {
                min: this.valueForX(this.ui.minKnob.position.x),
                max: this.valueForX(this.ui.maxKnob.position.x)
              }
            : { min: this.minValue, max: this.maxValue };
        }
        // read the range values from the positions of the knobs.  Make sure
        // that the minKnob exists (i.e., is rendered) before calling.
      },
      expose: { get () { return ['positionRanges', 'updateConnector']; } },
      bindings: {
        get () {
          return [
            { target: 'max knob', signal: 'position', handler: 'signalRangeChanged' },
            { target: 'min knob', signal: 'position', handler: 'signalRangeChanged' },
            { signal: 'onDragStart', handler: '_startDraggingClosestHandle', override: true },
            { signal: 'onDragEnd', handler: '_stopDraggingHandle', override: true },
            { signal: 'onDrag', handler: '_dragSelectedKnob', override: true }
          ];
        }
      }
    };
  }

  onRefresh () {
    this.ui.minKnob.position = pt(this._xForValue_(this.range.min), 0);
    this.ui.maxKnob.position = pt(this._xForValue_(this.range.max), 0);
    this.updateConnector();
  }

  updateConnector () {
    const { connector: conn, maxKnob, minKnob } = this.ui;
    conn.width = maxKnob.center.subPt(minKnob.center).x;
    conn.left = minKnob.center.x;
  }

  confirm () {
    const { minKnob, maxKnob } = this.ui;
    this.range = {
      min: this.valueForX(minKnob.position.x),
      max: this.valueForX(maxKnob.position.x)
    };
  }

  // Show that the range has changed.  Since any range change involves moving the knobs, this
  // is tied via signal to the range position.  Every user of this part should listen for
  // the rangeChanged signal

  signalRangeChanged () {
    signal(this, 'rangeChanged');
    signal(this.view, 'rangeChanged');
  }

  // The maximum position of the right-hand knob.  The value of the knob
  // is given by its x-position (left-hand edge), so the max position has the
  // right-hand edge at the end of the slider.

  get maxPosition () {
    return this.view.extent.x - this.ui.maxKnob.width;
  }

  // Get the range of possible positions for each knob.  the minKnob has its right
  // edge adjacent to the left edge of the maxKnob

  get positionRanges () {
    const { maxKnob, minKnob } = this.ui;
    return {
      'min knob': { min: 0, max: maxKnob.position.x - minKnob.width },
      'max knob': {
        min: minKnob.position.x + minKnob.width,
        max: this.maxPosition
      }
    };
  }

  // make sure a value is an integer number of increments, and it's between the
  // minimum and the maximum value

  _normalizeValue_ (aValue) {
    const value = Math.round(aValue / this.increment) * this.increment;
    return Math.max(Math.min(this.maxValue, value), this.minValue);
  }

  get _valueRange_ () { return (this.maxValue - this.minValue); }

  // return the value as a proportion of the total range between the minimum
  // possible value and the maximum possible value.  This is always between 0 and 1

  _proportionalValue_ (aValue) {
    return (aValue - this.minValue) / this._valueRange_;
  }

  // return the x position as a a proportion of the distance between min and max
  // positions.  Since minPosition is always 0, this is a proportion of maxPosition

  _proportionalRange_ (xPos) {
    return xPos / this.maxPosition;
  }

  // return the x-coordinate corresponding to a particular value.  Just multiply
  // the proportionalValue (% of the range) by the max position.

  _xForValue_ (aValue) {
    return this._proportionalValue_(aValue) * this.maxPosition;
  }

  // return the value  corresponding to an x-coordinate.  Just get the proportional
  // range, multiply by the value range to get the offset from the min, add the min
  // to get the true number, then make sure it lines up with the increments

  valueForX (anX) {
    return this._normalizeValue_(this._proportionalRange_(anX) * this._valueRange_ + this.minValue);
  }

  _startDraggingClosestHandle ($super, evt) {
    const { minKnob, maxKnob } = this.ui;
    if (evt.positionIn(minKnob).r() < evt.positionIn(maxKnob).r()) {
      this._draggedHandle = minKnob;
    } else {
      this._draggedHandle = maxKnob;
    }
  }

  _stopDraggingHandle () {
    this._draggedHandle = null;
  }

  _dragSelectedKnob ($super, evt) {
    if (this._draggedHandle) {
      this._draggedHandle.onDrag(evt);
    }
    this.confirm();
  }

  incrementMinValue () {
    const { min, max } = this.range;
    this.range = { min: min + 1, max };
  }

  decrementMinValue () {
    const { min, max } = this.range;
    this.range = { min: min - 1, max };
  }

  incrementMaxValue () {
    const { min, max } = this.range;
    this.range = { min, max: max + 1 };
  }

  decrementMaxValue () {
    const { min, max } = this.range;
    this.range = { min, max: max - 1 };
  }
}

class DoubleSliderKnob extends Morph {
  // A DoubleSlider knob.  This is freely dragged along the x-axis between the
  // bounds given by this.owner.positionRanges, and its y position is always 0.
  // _normalizePosition_ just ensures that the x position is within reasonable
  // bounds and the y position is 0
  _normalizePosition_ () {
    const positionRange = this.owner.positionRanges[this.name];
    const x = Math.min(positionRange.max, Math.max(positionRange.min, this.position.x));
    this.position = pt(x, 0);
    this._updateValue_();
  }

  // The drag events are all the same -- do the super, which will move the knob,
  // and then normalize position

  onDragStart (evt) {
    super.onDragStart(evt);
    this._normalizePosition_();
  }

  onDrag (evt) {
    this.center = evt.positionIn(this.owner).withY(this.owner.height / 2);
    this._normalizePosition_();
  }

  onDragEnd (evt) {
    super.onDragEnd(evt);
    this._normalizePosition_();
  }

  // _updateValue_().  Dead code from when we had a a value label on
  // the knob, which was a bad idea.

  _updateValue_ () {
    this.owner.updateConnector();
    // this.getSubmorphNamed('valueLabel').setValue(this.owner.valueForX(this.position.x));
  }
}

class SliderWithValueModel extends ViewModel {
  // The only property is a signal which shows the value has changed.  This
  // is connected to the valueChanged property in the contained slider as
  // both a convenience and to permit code using this to access the top-level
  // valueChanged signal
  static get properties () {
    return {
      valueChanged: { derived: true, isSignal: true, readOnly: true },
      expose: {
        get () {
          return [
            ['value', { model: 'slider' }],
            ['minValue', { model: 'slider' }],
            ['maxValue', { model: 'slider' }],
            ['increment', { model: 'slider' }]
          ];
        }
      },
      bindings: {
        get () {
          return [
            { model: 'slider', signal: 'valueChanged', handler: 'signalValueChanged' },
            { model: 'slider', signal: 'valueChanged', handler: 'updateValue' },
            {
              target: 'value input',
              signal: 'onInput',
              handler: 'setSliderValue'
            },
            {
              target: 'value input',
              signal: 'decrement',
              handler: () => {
                this.models.slider.decrementValue();
              }
            },

            {
              target: 'value input',
              signal: 'increment',
              handler: () => {
                this.models.slider.incrementValue();
              }
            }
          ];
        }
      }
    };
  }

  viewDidLoad () {
    this.updateValue();
  }

  // fire the valueChanged signal.  This method should only be
  // called by the connection to the contained valueChanged signal
  signalValueChanged () {
    signal(this, 'valueChanged');
    signal(this.view, 'valueChanged');
  }

  // A wrapper around Slider to update and read the value from the
  // input ranges.  This mostly just a couple of connection targets.
  // updateValue.  This is called when the knob changes position.
  // connected to the knob position.
  // Just displays the value of the knob in the  input field
  updateValue () {
    this.ui.valueInput.value = this.models.slider.value;
  }

  // setSliderValue.  This is called when the  inputs is accepted.
  // onInput from the input morph is hardcoded to this.  Sets the value
  // of the underlying Slider.
  setSliderValue () {
    this.models.slider.value = this.ui.valueInput.value;
  }
}

class DoubleSliderWithValuesModel extends ViewModel {
  // The only property is a signal which shows the range has changed.  This
  // is connected to the rangeChanged property in the contained slider as
  // both a convenience and to permit code using this to access the top-level
  // rangeChanged signal
  static get properties () {
    return {
      rangeChanged: { derived: true, isSignal: true, readOnly: true },
      expose: {
        get () {
          return [
            ['minValue', { model: 'double slider' }],
            ['maxValue', { model: 'double slider' }],
            ['range', { model: 'double slider' }]];
        }
      },
      bindings: {
        get () {
          return [
            { model: 'double slider', signal: 'rangeChanged', handler: 'signalRangeChanged' },
            { model: 'double slider', signal: 'rangeChanged', handler: 'displayRange' },
            {
              target: 'min input',
              signal: 'decrement',
              handler: () => {
                this.models.doubleSlider.decrementMinValue();
              }
            },
            {
              target: 'min input',
              signal: 'increment',
              handler: () => {
                this.models.doubleSlider.incrementMinValue();
              }
            },
            {
              target: 'min input',
              signal: 'onInput',
              handler: 'setRange'
            },
            {
              target: 'max input',
              signal: 'decrement',
              handler: () => {
                this.models.doubleSlider.decrementMaxValue();
              }
            },
            {
              target: 'max input',
              signal: 'increment',
              handler: () => {
                this.models.doubleSlider.incrementMaxValue();
              }
            },
            {
              target: 'max input',
              signal: 'onInput',
              handler: 'setRange'
            }
          ];
        }
      }
    };
  }

  // fire the rangeChanged signal.  This method should only be
  // called by the connection to the contained rangeChanged signal
  signalRangeChanged () {
    signal(this, 'rangeChanged');
    signal(this.view, 'rangeChanged');
  }

  viewDidLoad () {
    this.displayRange();
  }

  // A wrapper around DoubleSlider to update and read values from the
  // input ranges.  This mostly just a couple of connection targets.
  // displayRange.  This is called when one of the knobs changes positions.
  // connected to the knob positions.
  // Just displays the values of the knobs in the two input fields
  displayRange () {
    const { doubleSlider } = this.models;
    const { minInput, maxInput } = this.ui;
    const range = doubleSlider.range;
    minInput.value = range.min;
    maxInput.value = range.max;
  }

  // setRange.  This is called when one of the two inputs is accepted.
  // onInput from each input morph is hardcoded to this.  Sets the range
  // of the underlying doubleSlider.
  setRange () {
    const { minInput, maxInput } = this.ui;
    const range = {
      min: minInput.value,
      max: maxInput.value
    };
    this.models.doubleSlider.range = range;
  }
}

const IncrementButton = component({
  type: Label,
  name: 'increment button',
  fontColor: Color.rgb(151, 154, 154),
  fontSize: 35,
  nativeCursor: 'pointer',
  position: pt(1328.8, 186.3),
  textAndAttributes: Icon.textAttribute('caret-up')
});

const IncrementButtonClick = component(IncrementButton, {
  name: 'increment button/click',
  fontColor: Color.rgb(112, 123, 124)
});

const SliderInputLabel = component({
  name: 'slider value label',
  type: SliderInputLabelMorph,
  extent: pt(39.6, 94.4),
  fill: Color.transparent,
  layout: new TilingLayout({
    align: 'center',
    axis: 'column',
    axisAlign: 'center',
    orderByIndex: true,
    wrapSubmorphs: false
  }),
  submorphs: [
    part(IncrementButton, {
      name: 'increment button',
      master: { auto: IncrementButton, click: IncrementButtonClick }
    }),
    {
      type: InputLine,
      name: 'sliderValue',
      borderWidth: 3,
      borderRadius: 3,
      borderColor: Color.gray,
      extent: pt(35.3, 29.2),
      fontSize: 13,
      fontWeight: 'bold',
      haloShadow: new ShadowObject({
        blur: 6,
        color: Color.fromLiteral({
          a: 1,
          b: 0.8588235294117647,
          g: 0.596078431372549,
          r: 0.20392156862745098
        }),
        distance: 0,
        rotation: 45
      }),
      padding: rect(3, 3, 0, 0),
      placeholder: 'Enter Value',
      textAlign: 'center',
      textAndAttributes: ['1', null]
    },
    part(IncrementButton, {
      name: 'decrement button',
      rotation: Math.PI,
      master: { auto: IncrementButton, click: IncrementButtonClick }
    })
  ]
});

// turn this into a view model
// const C = SliderInputLabel.getComponent();
// connect(C.getSubmorphNamed('sliderValue'), 'onInput', SliderInputLabel, 'onInput');

// part(Slider).openInWorld()
const Slider = component({
  defaultViewModel: SliderModel,
  name: 'slider',
  acceptsDrops: false,
  borderColor: Color.rgb(23, 160, 251),
  draggable: true,
  extent: pt(200, 30),
  fill: Color.rgba(0, 0, 0, 0),
  value: 68,
  submorphs: [{
    name: 'slider center',
    borderColor: Color.rgb(23, 160, 251),
    borderRadius: 3,
    extent: pt(200, 11.4),
    fill: Color.rgb(127, 140, 141),
    position: pt(0, 9),
    reactsToPointer: false
  }, {
    type: SliderKnob,
    name: 'knob',
    borderColor: Color.rgb(23, 160, 251),
    borderRadius: 35,
    draggable: true,
    extent: pt(29.7, 30.2),
    fill: Color.rgb(66, 73, 73),
    nativeCursor: 'grab',
    position: pt(116.5, 0)
  }]
});

// part(DoubleSlider).openInWorld()
const DoubleSlider = component({
  defaultViewModel: DoubleSliderModel,
  name: 'double slider',
  borderColor: Color.rgb(23, 160, 251),
  draggable: true,
  extent: pt(200, 30),
  fill: Color.rgba(0, 0, 0, 0),
  submorphs: [{
    name: 'slider center',
    borderColor: Color.rgb(23, 160, 251),
    borderRadius: 3,
    extent: pt(200, 11.4),
    fill: Color.rgb(127, 140, 141),
    position: pt(0, 10.2),
    reactsToPointer: false
  }, {
    type: DoubleSliderKnob,
    name: 'min knob',
    borderColor: Color.rgb(23, 160, 251),
    borderRadius: 35,
    draggable: true,
    extent: pt(29.7, 30.2),
    fill: Color.rgb(66, 73, 73),
    nativeCursor: 'grab',
    position: pt(29, 0)
  }, {
    type: DoubleSliderKnob,
    name: 'max knob',
    borderColor: Color.rgb(23, 160, 251),
    borderRadius: 35,
    draggable: true,
    extent: pt(29.7, 30.2),
    fill: Color.rgb(66, 73, 73),
    nativeCursor: 'grab',
    position: pt(139.6, 0)
  }, {
    name: 'connector',
    borderColor: Color.rgb(23, 160, 251),
    extent: pt(110.7, 12.3),
    fill: Color.rgb(66, 73, 73),
    position: pt(43.8, 9),
    reactsToPointer: false
  }]
});

// part(SliderWithValue).openInWorld()
const SliderWithValue = component({
  name: 'slider with value',
  defaultViewModel: SliderWithValueModel,
  extent: pt(250, 100),
  layout: new TilingLayout({
    axisAlign: 'center',
    orderByIndex: true,
    spacing: 5,
    wrapSubmorphs: false
  }),
  fill: Color.transparent,
  submorphs: [
    part(Slider, {
      name: 'slider',
      submorphs: [{
        name: 'knob',
        position: pt(84.4, 0)
      }]
    }), part(SliderInputLabel, { name: 'value input' })
  ]
});

// DoubleSliderWithValues.openInWorld()
// part(DoubleSliderWithValues).openInWorld()
const DoubleSliderWithValues = component({
  name: 'double slider with values',
  defaultViewModel: DoubleSliderWithValuesModel,
  extent: pt(295, 100),
  layout: new TilingLayout({
    axisAlign: 'center',
    orderByIndex: true,
    spacing: 5,
    wrapSubmorphs: false
  }),
  fill: Color.transparent,
  submorphs: [
    part(SliderInputLabel, { name: 'min input' }),
    part(DoubleSlider, { name: 'double slider' }),
    part(SliderInputLabel, { name: 'max input' })
  ]
});

// SliderValueLabel.openInWorld()
export { SliderInputLabel, Slider, DoubleSlider, SliderWithValue, DoubleSliderWithValues };
