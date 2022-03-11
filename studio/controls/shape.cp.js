import { component } from 'lively.morphic/components/core.js';
import { ShapeControl } from 'lively.ide/studio/controls/shape.cp.js';
import { GalyleoAddButtonDefault, GalyleoDropDownList, GalyleoDropDownListModel, GalyleoDropDown, GalyleoAddButton, GalyleoNumberInput, GalyleoAddButtonActive, GalyleoAddButtonHovered } from '../shared.cp.js';
import { Color } from 'lively.graphics';

const GalyleoShapeControl = component(ShapeControl, {
  name: 'galyleo/shape control',
  viewModel: {
    propertyLabelComponent: GalyleoAddButtonDefault,
    propertyLabelComponentHover: GalyleoAddButtonHovered,
    propertyLabelComponentActive: GalyleoAddButtonActive
  },
  submorphs: [
    {
      name: 'x input',
      master: GalyleoNumberInput,
      submorphs: [{ name: 'interactive label', fontFamily: 'IBM Plex Mono' }]
    },
    { name: 'y input', master: GalyleoNumberInput, submorphs: [{ name: 'interactive label', fontFamily: 'IBM Plex Mono' }] },
    { name: 'width input', master: GalyleoNumberInput },
    {
      name: 'height input',
      master: GalyleoNumberInput
    },
    { name: 'proportional resize toggle', master: GalyleoAddButton },
    { name: 'rotation input', master: GalyleoNumberInput },
    { name: 'radius input', master: GalyleoNumberInput },
    { name: 'independent corner toggle', master: GalyleoAddButton },
    {
      name: 'multi radius container',
      submorphs: [{
        name: 'border indicator',
        fontColor: Color.rgb(66, 73, 73)
      }, {
        name: 'radius input top left',
        master: GalyleoNumberInput
      }, {
        name: 'radius input top right',
        master: GalyleoNumberInput
      }, {
        name: 'radius input bottom right',
        master: GalyleoNumberInput
      }, {
        name: 'radius input bottom left',
        master: GalyleoNumberInput
      }
      ]
    },
    {
      name: 'clip mode selector',
      master: GalyleoDropDown,
      viewModelClass: GalyleoDropDownListModel,
      viewModel: {
        listMaster: GalyleoDropDownList
      },
      submorphs: [
        { name: 'interactive label', fontColor: Color.rgb(128, 128, 128) }
      ]
    }
  ]
});

export { GalyleoShapeControl };
