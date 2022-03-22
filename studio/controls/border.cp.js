import { component, part, add, without } from 'lively.morphic/components/core.js';
import { BorderPopup, BorderControl } from 'lively.ide/studio/controls/border.cp.js';
import { Color, pt, rect } from 'lively.graphics';
import { GalyleoAddButtonDefault, CloseButtonFloat, WindowHeader, GalyleoDropDownList, GalyleoDropDownListModel, GalyleoDropDown, GalyleoNumberInput, GalyleoColorInput, GalyleoAddButton, GalyleoAddButtonActive, GalyleoAddButtonHovered } from '../shared.cp.js';
import { TilingLayout } from 'lively.morphic';
import { GalyleoPropertySection, GalyleoPropertySectionInactive } from './section.cp.js';

// part(GalyleoBorderPopup).openInWorld()
const GalyleoBorderPopup = component(BorderPopup, {
  name: 'galyleo/border popup',
  fill: Color.rgb(215, 219, 221),
  viewModel: {
    propertyLabelComponent: GalyleoAddButtonDefault,
    propertyLabelComponentHover: GalyleoAddButtonHovered,
    propertyLabelComponentActive: GalyleoAddButtonActive
  },
  submorphs: [{
    name: 'header menu',
    master: WindowHeader,
    submorphs: [without('close button')]
  },
  add(part(CloseButtonFloat, {
    name: 'h float',
    submorphs: [{
      tooltip: 'Close this dialog without loading',
      name: 'close button'
    }]
  }), 'multi border control'),
  {
    name: 'multi border control',
    extent: pt(241, 120),
    submorphs: [
      {
        name: 'border selector wrapper',
        submorphs: [
          {
            name: 'left border',
            master: GalyleoAddButton
          },
          {
            name: 'top border',
            master: GalyleoAddButton
          },
          {
            name: 'right border',
            master: GalyleoAddButton
          },
          {
            name: 'bottom border',
            master: GalyleoAddButton
          }
        ]
      },
      {
        name: 'border control',
        extent: pt(10, 62),
        submorphs: [{
          name: 'border color input',
          master: GalyleoColorInput,
          viewModel: {
            activeColor: Color.gray
          }
        }, {
          name: 'border width control',
          layout: new TilingLayout({
            axisAlign: 'center',
            justifySubmorphs: 'spaced',
            orderByIndex: true,
            padding: rect(18, 0, -13, 0),
            spacing: 10,
            wrapSubmorphs: false
          }),
          submorphs: [
            {
              name: 'border width input',
              master: GalyleoNumberInput
            },
            {
              name: 'border style selector',
              master: GalyleoDropDown,
              viewModel: {
                listMaster: GalyleoDropDownList
              },
              submorphs: [{
                name: 'interactive label',
                fontColor: Color.rgb(128, 128, 128)
              }]
            }
          ]
        }]
      }]
  }]
});

// part(GalyleoBorderControl).openInWorld()
const GalyleoBorderControl = component(BorderControl, {
  name: 'galyleo/border control',
  layout: new TilingLayout({
    axis: 'column',
    hugContentsVertically: true,
    orderByIndex: true,
    padding: rect(0, 10, 0, 0),
    resizePolicies: [['h floater', {
      height: 'fixed',
      width: 'fill'
    }], ['elements wrapper', {
      width: 'fill'
    }]],
    spacing: 10,
    wrapSubmorphs: false
  }),
  extent: pt(288.1, 96.7),
  visible: true,
  master: GalyleoPropertySection,
  viewModel: {
    hoverSectionComponent: GalyleoPropertySection,
    inactiveSectionComponent: GalyleoPropertySectionInactive,
    propertyLabelComponent: GalyleoAddButtonDefault,
    propertyLabelComponentHover: GalyleoAddButtonHovered,
    propertyLabelComponentActive: GalyleoAddButtonActive,
    borderPopupComponent: GalyleoBorderPopup
  },
  submorphs: [
    {
      name: 'elements wrapper',
      layout: new TilingLayout({
        hugContentsVertically: true,
        orderByIndex: true,
        spacing: 10
      }),
      extent: pt(275.9, 102),
      submorphs: [{
        name: 'border color input',
        extent: pt(288.4, 27),
        master: GalyleoColorInput
      }, {
        name: 'border width control',
        submorphs: [{
          name: 'border width input',
          master: GalyleoNumberInput
        }, {
          name: 'border style selector',
          master: GalyleoDropDown,
          viewModelClass: GalyleoDropDownListModel,
          viewModel: {
            listMaster: GalyleoDropDownList
          },
          submorphs: [{
            name: 'interactive label',
            fontColor: Color.rgb(128, 128, 128)
          }]
        }]
      }, {
        name: 'more button',
        master: GalyleoAddButton
      }]
    }]
});

export { GalyleoBorderPopup, GalyleoBorderControl };
