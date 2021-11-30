import { Morph, easings } from 'lively.morphic';
import { Color } from 'lively.graphics';

class Toggle extends Morph {
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
