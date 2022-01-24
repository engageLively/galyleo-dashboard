import { Morph, Ellipse, Label, easings } from 'lively.morphic';
import { Color, pt } from 'lively.graphics';
import { component } from 'lively.morphic/components/core.js';

class ToggleMorph extends Morph {
  static get properties () {
    return {
      state: {
        set (aBoolean) {
          aBoolean = !!aBoolean; // normalize to true/false
          this.setProperty('state', aBoolean);
          this.getSubmorphNamed('trueLabel').visible = aBoolean;
          this.getSubmorphNamed('falseLabel').visible = !aBoolean;
          this.getSubmorphNamed('knob').left = this.positions[aBoolean];
          this.fill = this.borderColor = this.colors[aBoolean];
        }
      }
    };
  }

  get positions () {
    return { false: this.borderWidthLeft, true: this.width - this.getSubmorphNamed('knob').width - this.borderWidthRight };
  }

  get colors () {
    return { false: Color.rgbHex('cccccc'), true: Color.rgbHex('33cc33') };
  }

  onMouseDown (evt) {
    this.withAnimationDo(() => {
      this.state = !this.state;
    }, {
      duration: 300,
      easing: easings.inOutExpo
    });
  }
}

const Toggle = component({
  type: ToggleMorph,
  name: 'toggle',
  borderColor: Color.rgb(204, 204, 204),
  borderRadius: 20,
  borderWidth: 3,
  clipMode: 'hidden',
  dropShadow: false,
  extent: pt(98, 40),
  fill: Color.rgb(204, 204, 204),
  position: pt(895.6, 826),
  scale: 0.5,
  submorphs: [{
    type: Label,
    name: 'trueLabel',
    fontColor: Color.rgb(253, 254, 254),
    fontSize: 25,
    fontWeight: 500,
    position: pt(5.6, 2.6),
    textAndAttributes: ['ON', null],
    visible: false
  }, {
    type: Label,
    name: 'falseLabel',
    fontColor: Color.rgb(253, 254, 254),
    fontSize: 25,
    fontWeight: 500,
    position: pt(42.7, 3.8),
    textAndAttributes: ['OFF', null]
  }, {
    type: Ellipse,
    name: 'knob',
    borderColor: Color.rgb(149, 165, 166),
    dropShadow: false,
    extent: pt(33.7, 33.7),
    fill: Color.rgb(253, 254, 254),
    isEllipse: true,
    nativeCursor: 'pointer',
    position: pt(3, 3)
  }]
});

export { Toggle };
