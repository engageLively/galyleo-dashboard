import { component } from 'lively.morphic/components/core.js';
import { MiniLayoutPreview, LayoutControl, MiniLayoutPreviewActive, AutoLayoutAlignmentFlap } from 'lively.ide/studio/controls/layout.cp.js';
import { Color, pt } from 'lively.graphics';
import { GalyleoNumberInput, GalyleoDropDownList, GalyleoPropertyLabel, GalyleoAddButton, GalyleoAddButtonHovered, GalyleoDropDown } from '../shared.cp.js';
import { GalyleoPropertySection, GalyleoPropertySectionInactive } from './section.cp.js';
import { CheckboxActive, CheckboxInactive } from 'lively.ide/studio/shared.cp.js';

const GalyleoCheckboxActive = component(CheckboxActive, {
  name: 'galyleo/checkbox/active',
  fill: Color.rgb(245, 127, 23)
});

const GalyleoCheckboxInactive = component(CheckboxInactive, {
  name: 'galyleo/checkbox/inactive',
  borderColor: Color.black
});

// GalyleoMiniLayoutPreview.openInWorld()
const GalyleoMiniLayoutPreview = component(MiniLayoutPreview, {
  name: 'galyleo/mini layout preview',
  submorphs: [{
    name: 'outer border',
    borderColor: Color.rgb(66, 73, 73),
    submorphs: [
      {
        name: 'mini bar 1',
        fill: Color.rgb(66, 73, 73)
      },
      {
        name: 'mini bar 2',
        fill: Color.rgb(66, 73, 73)
      }, {
        name: 'mini bar 3',
        fill: Color.rgb(66, 73, 73)
      }]
  }]
});

// GalyleoLayoutFlap.openInWorld()
const GalyleoLayoutFlap = component(AutoLayoutAlignmentFlap, {
  name: 'galyleo/layout flap',
  fill: Color.rgb(215, 219, 221),
  submorphs: [
    {
      name: 'padding and spacing',
      submorphs: [
        {
          name: 'container placeholder',
          submorphs: [{
            name: 'mini bar 1',
            fill: Color.rgb(255, 152, 0)
          }, {
            name: 'mini bar 2',
            fill: Color.rgb(255, 152, 0)
          }, {
            name: 'mini bar 3',
            fill: Color.rgb(255, 152, 0)
          }]
        },
        {
          name: 'spacing preview',
          submorphs: [{
            name: 'mini bar 1',
            fill: Color.rgb(255, 152, 0)
          }, {
            name: 'mini bar 2',
            fill: Color.rgb(255, 152, 0)
          }, {
            name: 'mini bar 3',
            fill: Color.rgb(255, 152, 0)
          }]
        },
        {
          name: 'padding top',
          master: GalyleoNumberInput,
          borderWidth: 0
        },
        {
          name: 'padding bottom',
          master: GalyleoNumberInput,
          borderWidth: 0
        },
        {
          name: 'padding left',
          master: GalyleoNumberInput,
          borderWidth: 0
        },
        {
          name: 'padding right',
          master: GalyleoNumberInput,
          borderWidth: 0
        }
      ]
    },
    {
      name: 'spacing selector',
      master: GalyleoDropDown,
      viewModel: {
        listMaster: GalyleoDropDownList
      },
      extent: pt(156, 25)
    }
  ]
});

// GalyleoMiniLayoutPreviewActive.openInWorld()
const GalyleoMiniLayoutPreviewActive = component(MiniLayoutPreviewActive, {
  name: 'glayleo/mini layout preview/active',
  fill: Color.orange
});

// GalyleoLayoutControl.openInWorld()
const GalyleoLayoutControl = component(LayoutControl, {
  name: 'galyleo/layout control',
  master: GalyleoPropertySection,
  viewModel: {
    hoverSectionComponent: GalyleoPropertySection,
    inactiveSectionComponent: GalyleoPropertySectionInactive,
    controlFlapComponent: GalyleoLayoutFlap,
    buttonActiveComponent: GalyleoAddButtonHovered,
    buttonInactiveComponent: GalyleoAddButton
  },
  submorphs: [
    {
      name: 'controls',
      submorphs: [
        { name: 'vertical', master: GalyleoPropertyLabel },
        { name: 'horizontal', master: GalyleoPropertyLabel },
        { name: 'spacing input', master: GalyleoNumberInput },
        { name: 'total padding input', master: GalyleoNumberInput },
        {
          name: 'mini layout preview',
          master: GalyleoMiniLayoutPreview,
          activeComponent: GalyleoMiniLayoutPreviewActive,
          inactiveComponent: GalyleoMiniLayoutPreview
        }
      ]
    },
    {
      name: 'wrap submorphs checkbox',
      activeCheckboxComponent: GalyleoCheckboxActive,
      inactiveCheckboxComponent: GalyleoCheckboxInactive,
      submorphs: [
        {
          name: 'checkbox',
          master: GalyleoCheckboxActive
        },
        {
          name: 'prop label',
          fontColor: Color.rgb(66, 73, 73)
        }]
    }]
});

export { GalyleoMiniLayoutPreviewActive, GalyleoLayoutFlap, GalyleoMiniLayoutPreview, GalyleoLayoutControl };
