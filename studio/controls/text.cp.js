import { RichTextControl } from 'lively.ide/studio/controls/text.cp.js';
import { component } from 'lively.morphic/components/core.js';
import { GalyleoAddButtonHovered, GalyleoColorInput, GalyleoNumberInput, GalyleoDropDownList, GalyleoDropDownListModel, GalyleoDropDown, GalyleoAddButton } from '../shared.cp.js';
import { Color } from 'lively.graphics';
import { TilingLayout } from 'lively.morphic';
import { rect } from 'lively.graphics/geometry-2d.js';

// GalyleoRichTextControl.openInWorld()
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
  visible: true,
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
            { name: 'inline link', master: GalyleoAddButton }
          ]
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
    }, {
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
          name: 'resizing controls',
          submorphs: [
            { name: 'auto width', master: GalyleoAddButton },
            { name: 'auto height', master: GalyleoAddButton },
            { name: 'fixed extent', master: GalyleoAddButton }
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
    }
  ]
});

export { GalyleoRichTextControl };
