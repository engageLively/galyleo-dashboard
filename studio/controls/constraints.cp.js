import { component, part } from 'lively.morphic/components/core.js';
import { ConstraintMarker, AlignmentControl, ResizingSimulator, ConstraintSizeSelectorDefault, ConstraintsSimulator, ConstraintMarkerActive } from 'lively.ide/studio/controls/constraints.cp.js';
import { Color } from 'lively.graphics';
import { GalyleoDropDown, GalyleoDropDownList, GalyleoDropDownListModel } from '../shared.cp.js';
import { GalyleoPropertySection } from './section.cp.js';
// GalyleoConstraintMarker.openInWorld();
const GalyleoConstraintMarker = component(ConstraintMarker, {
  name: 'galyleo/constraint marker',
  submorphs: [{
    name: 'accent',
    fill: Color.rgba(102, 102, 102, 0.75)
  }]
});

// GalyleoConstraintMarkerActive.openInWorld();
const GalyleoConstraintMarkerActive = component(ConstraintMarkerActive, {
  name: 'galyleo/constraint marker/active',
  submorphs: [{
    name: 'accent',
    fill: Color.orange,
    borderColor: Color.orange
  }]
});

// GalyleoConstraintsSimulator.openInWorld()
const GalyleoConstraintsSimulator = component(ConstraintsSimulator, {
  name: 'galyleo/constraints simulator',
  submorphs: [
    { name: 'top marker', master: GalyleoConstraintMarker },
    { name: 'right marker', master: GalyleoConstraintMarker },
    { name: 'bottom marker', master: GalyleoConstraintMarker },
    { name: 'left marker', master: GalyleoConstraintMarker },
    {
      name: 'inner constraints',
      borderColor: Color.rgba(102, 102, 102, 0.75),
      submorphs: [
        { name: 'vertical marker', master: GalyleoConstraintMarker },
        { name: 'horizontal marker', master: GalyleoConstraintMarker }
      ]
    }]
});

// GalyleoConstraintSizeSelector.openInWorld()
const GalyleoConstraintSizeSelector = component(ConstraintSizeSelectorDefault, {
  name: 'galyleo/constraint size selector',
  submorphs: [{
    name: 'caret',
    fontColor: Color.rgba(102, 102, 102, 0.75)
  }]
});

const GalyleoConstraintSizeSelectorHovered = component(GalyleoConstraintSizeSelector, {
  name: 'galyleo/constraint size selector/hovered',
  fill: Color.orange.withA(.5)
});

// part(GalyleoResizingSimulator).openInWorld()
const GalyleoResizingSimulator = component(ResizingSimulator, {
  name: 'galyleo/resizing simulator',
  submorphs: [{
    name: 'inner constraints',
    borderColor: Color.rgba(102, 102, 102, 0.75)
  }]
});

// part(GalyleoAlignmentControl).openInWorld()
const GalyleoAlignmentControl = component(AlignmentControl, {
  name: 'galyleo/alignment control',
  master: GalyleoPropertySection,
  submorphs: [
    {
      name: 'h floater',
      submorphs: [
        {
          name: 'section headline',
          fontColor: Color.rgb(66, 73, 73)
        }
      ]
    }, {
      name: 'constraints',
      viewModel: {
        activeMarkerComponent: GalyleoConstraintMarkerActive,
        defaultMarkerComponent: GalyleoConstraintMarker
      },
      submorphs: [
        {
          name: 'constraints simulator',
          master: GalyleoConstraintsSimulator
        },
        {
          name: 'horizontal alignment selector',
          master: GalyleoDropDown,
          viewModelClass: GalyleoDropDownListModel,
          viewModel: {
            listMaster: GalyleoDropDownList
          },
          submorphs: [{
            name: 'interactive label',
            fontColor: Color.rgbHex('808080')
          }]
        },
        {
          name: 'vertical alignment selector',
          master: GalyleoDropDown,
          viewModelClass: GalyleoDropDownListModel,
          viewModel: {
            listMaster: GalyleoDropDownList
          },
          submorphs: [{ name: 'interactive label', fontColor: Color.rgbHex('808080') }]
        }
      ]
    }, {
      name: 'resizing',
      submorphs: [
        {
          name: 'resizing simulator',
          master: GalyleoResizingSimulator,
          submorphs: ['outer top', 'inner bottom', 'outer bottom', 'inner top', 'outer left', 'outer right', 'inner left', 'inner right'].map(name => ({
            name: name + ' selector',
            master: { auto: GalyleoConstraintSizeSelector, hover: GalyleoConstraintSizeSelectorHovered }
          }))
        },
        {
          name: 'horizontal alignment selector',
          master: GalyleoDropDown,
          viewModelClass: GalyleoDropDownListModel,
          viewModel: {
            listMaster: GalyleoDropDownList
          },
          submorphs: [{ name: 'interactive label', fontColor: Color.rgbHex('808080') }]
        },
        {
          name: 'vertical alignment selector',
          master: GalyleoDropDown,
          viewModelClass: GalyleoDropDownListModel,
          viewModel: {
            listMaster: GalyleoDropDownList
          },
          submorphs: [{ name: 'interactive label', fontColor: Color.rgbHex('808080') }]
        }
      ]
    }]
});

export {
  GalyleoConstraintMarker, GalyleoConstraintMarkerActive, GalyleoConstraintsSimulator,
  GalyleoConstraintSizeSelector, GalyleoConstraintSizeSelectorHovered, GalyleoResizingSimulator, GalyleoAlignmentControl
};
