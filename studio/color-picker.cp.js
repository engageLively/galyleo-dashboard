import { ColorPicker } from 'lively.ide/styling/color-picker.cp.js';
import { component, add } from 'lively.morphic/components/core.js';
import { GalyleoDropDown, GalyleoTextInput, GalyleoNumberInput, GalyleoDropDownList } from './shared.cp.js';
import { Color } from 'lively.graphics/color.js';
import { pt, rect } from 'lively.graphics/geometry-2d.js';
import { TilingLayout } from 'lively.morphic';

// GalyleoColorPicker.openInWorld()
const GalyleoColorPicker = component(ColorPicker, {
  name: 'galyleo/color picker',
  borderRadius: { topLeft: 10, topRight: 10, bottomLeft: 3, bottomRight: 3 },
  fill: Color.rgb(215, 219, 221),
  submorphs: [
    add({
      name: 'galyleo title bar',
      layout: new TilingLayout({
        align: 'center',
        axisAlign: 'center',
        orderByIndex: true
      }),
      reactsToPointer: false,
      extent: pt(241, 27.3),
      fill: Color.rgb(127, 140, 141),
      submorphs: [{
        name: 'title',
        type: 'label',
        fontWeight: 700,
        fontSize: 14,
        fontFamily: 'Barlow',
        textString: 'Color Picker',
        fontColor: Color.rgb(255, 255, 255)
      }]
    }, 'header menu'),
    {
      name: 'header menu',
      submorphs: [
        {
          name: 'color type selector',
          master: GalyleoDropDown,
          width: 100,
          viewModel: { listMaster: GalyleoDropDownList }
        }, {
          name: 'close button',
          fontColor: Color.rgb(128, 128, 128),
          fontWeight: 700,
          fontSize: 15,
          fontFamily: 'Barlow',
          textAndAttributes: ['CLOSE ', null, '', { fontFamily: 'Material Icons', fontSize: 20, textStyleClasses: ['material-icons'] }]
        }
      ]
    },
    {
      name: 'color controls',
      submorphs: [
        {
          name: 'color encoding',
          submorphs: [
            {
              name: 'color code selector',
              layout: new TilingLayout({
                align: 'center',
                axisAlign: 'center',
                justifySubmorphs: 'spaced',
                orderByIndex: true,
                padding: rect(5, 0, 5, 0),
                spacing: 5,
                wrapSubmorphs: false
              }),
              extent: pt(53.3, 25),
              master: GalyleoDropDown,
              viewModel: { listMaster: GalyleoDropDownList }
            },
            {
              name: 'controls',
              submorphs: [
                {
                  name: 'hex encoding',
                  fill: Color.rgba(189, 195, 199, 0),
                  submorphs: [
                    { name: 'hex opacity control', master: GalyleoNumberInput, borderRadius: 2 },
                    {
                      name: 'hex input',
                      master: GalyleoTextInput
                    }
                  ]
                },
                {
                  name: '3 val encoding',
                  fill: Color.transparent,
                  submorphs: [
                    {
                      name: 'opacity control', master: GalyleoNumberInput, borderRadius: 2
                    },
                    {
                      name: 'first value', master: GalyleoNumberInput, borderRadius: 2
                    },
                    {
                      name: 'second value', master: GalyleoNumberInput, borderRadius: 2
                    },
                    {
                      name: 'third value', master: GalyleoNumberInput, borderRadius: 2
                    }
                  ]
                },
                {
                  name: 'css encoding',
                  submorphs: [
                    { name: 'css input', master: GalyleoTextInput, borderRadius: 2 }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      name: 'color palettes',
      submorphs: [
        {
          name: 'color palette selector',
          master: GalyleoDropDown,
          viewModel: { listMaster: GalyleoDropDownList }
        }
      ]
    }
  ]
});

export { GalyleoColorPicker };
