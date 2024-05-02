import { RichTextControl } from 'lively.ide/studio/controls/text.cp.js';
import { component } from 'lively.morphic/components/core.js';
import { GalyleoAddButtonHovered, GalyleoAddButtonActive, GalyleoAddButtonDefault, GalyleoColorInput, GalyleoNumberInput, GalyleoDropDownList, GalyleoDropDownListModel, GalyleoDropDown, GalyleoAddButton } from '../shared.cp.js';
import { Color } from 'lively.graphics';
import { TilingLayout, part } from 'lively.morphic';
import { rect, pt } from 'lively.graphics/geometry-2d.js';
import { PaddingControlsLight } from 'lively.ide/studio/controls/popups.cp.js';

const GalyleoPaddingControls = component(PaddingControlsLight, {
  viewModel: {
    propertyLabelComponent: GalyleoAddButtonDefault,
    propertyLabelComponentActive: GalyleoAddButtonActive,
    propertyLabelComponentHover: GalyleoAddButtonHovered
  },
  submorphs: [
    { name: 'padding all', master: GalyleoNumberInput },
    {
      name: 'multi padding control',
      submorphs: [{
        name: 'padding left',
        master: GalyleoNumberInput
      }, {
        name: 'padding top',
        master: GalyleoNumberInput
      }, {
        name: 'padding right',
        master: GalyleoNumberInput
      }, {
        name: 'padding bottom',
        master: GalyleoNumberInput
      }, {
        name: 'centering wrapper',
        submorphs: [{
          name: 'padding indicator',
          master: GalyleoAddButton
        }]
      }]
    }
  ]
});

const GalyleoRichTextControl = component(RichTextControl, {
  name: 'galyleo/rich text control',
  layout: new TilingLayout({
    axis: 'column',
    hugContentsVertically: true,
    orderByIndex: true,
    padding: rect(0, 10, 0, 0),
    resizePolicies: [['h floater', {
      height: 'fixed',
      width: 'fill'
    }], ['font color input', {
      height: 'fixed',
      width: 'fill'
    }]],
    spacing: 10,
    wrapSubmorphs: false
  }),
  // scoped components should be also carried over by master components
  viewModel: {
    hoveredButtonComponent: GalyleoAddButtonHovered,
    activeButtonComponent: GalyleoAddButton
  },
  fill: Color.transparent,
  submorphs: [
    {
      name: 'h floater',
      submorphs: [
        {
          name: 'section headline',
          fontColor: Color.rgb(66, 73, 73)
        }, {
          name: 'add button',
          visible: false
        }
      ]
    },
    {
      name: 'text controls',
      submorphs: [
        {
          name: 'font family selector',
          master: GalyleoDropDown,
          viewModelClass: GalyleoDropDownListModel,
          viewModel: {
            listMaster: GalyleoDropDownList
          }
        },
        {
          name: 'weight and styles',
          submorphs: [{
            name: 'font weight selector',
            viewModelClass: GalyleoDropDownListModel,
            master: GalyleoDropDown,
            viewModel: {
              listMaster: GalyleoDropDownList
            }
          },
          {
            name: 'styling controls',
            submorphs: [
              { name: 'italic style', master: GalyleoAddButton },
              { name: 'underline style', master: GalyleoAddButton },
              { name: 'inline link', master: GalyleoAddButton },
              { name: 'quote', master: GalyleoAddButton }
            ]
          }]
        },
        {
          name: 'font size input',
          master: GalyleoNumberInput
        },
        {
          name: 'line height input',
          master: GalyleoNumberInput
        },
        {
          name: 'letter spacing input',
          master: GalyleoNumberInput
        }
      ]
    },
    {
      name: 'font color input',
      master: GalyleoColorInput
    },
    {
      name: 'bottom wrapper',
      submorphs: [
        {
          name: 'alignment controls',
          submorphs: [
            { name: 'left align', master: GalyleoAddButton },
            { name: 'center align', master: GalyleoAddButton },
            { name: 'right align', master: GalyleoAddButton },
            { name: 'block align', master: GalyleoAddButton }
          ]
        },
        {
          name: 'line wrapping selector',
          viewModelClass: GalyleoDropDownListModel,
          master: GalyleoDropDown,
          viewModel: {
            listMaster: GalyleoDropDownList
          }
        }
      ]
    }, {
      name: 'padding controls',
      viewModel: {
        propertyLabelComponent: GalyleoAddButtonDefault,
        propertyLabelComponentActive: GalyleoAddButtonActive,
        propertyLabelComponentHover: GalyleoAddButtonHovered
      },
      master: GalyleoPaddingControls
    }
  ]
});

export { GalyleoRichTextControl };
