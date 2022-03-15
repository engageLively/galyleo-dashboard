import { component, part, add, without } from 'lively.morphic/components/core.js';
import { BorderPopup, BorderPopupWindow, BorderControl } from 'lively.ide/studio/controls/border.cp.js';
import { Color, pt, rect } from 'lively.graphics';
import { GalyleoAddButtonDefault, GalyleoDropDownList, GalyleoDropDownListModel, GalyleoDropDown, GalyleoNumberInput, GalyleoColorInput, GalyleoAddButton, MenuBarButton, GalyleoAddButtonActive, GalyleoAddButtonHovered } from '../shared.cp.js';
import { TilingLayout } from 'lively.morphic';
import { GalyleoPropertySection, GalyleoPropertySectionInactive } from './section.cp.js';

// fix the binding by custom overriding the view model....
// ... but a real fix would be for the components to properly handle
// swapped out submorphs.
class GalyleoPopupModel extends BorderPopupWindow {
  get bindings () {
    return [...super.bindings, {
      target: 'close button new', signal: 'onMouseDown', handler: 'close'
    }];
  }
}

const GalyleoBorderPopup = component(BorderPopup, {
  name: 'galyleo/border popup',
  fill: Color.rgb(215, 219, 221),
  defaultViewModel: GalyleoPopupModel,
  viewModel: {
    propertyLabelComponent: GalyleoAddButtonDefault,
    propertyLabelComponentHover: GalyleoAddButtonHovered,
    propertyLabelComponentActive: GalyleoAddButtonActive
  },
  submorphs: [{
    name: 'header menu',
    layout: new TilingLayout({
      align: 'center',
      axisAlign: 'center',
      orderByIndex: true,
      padding: rect(5, 0, 0, 0),
      wrapSubmorphs: false
    }),
    fill: Color.rgb(127, 140, 141),
    extent: pt(241, 26.3),
    submorphs: [{
      name: 'title',
      fontColor: Color.rgb(255, 255, 255)
    }, without('close button')] // this should also disqualify the master from traversing other newly added morphs with the same name
  },
  add({
    name: 'h float',
    layout: new TilingLayout({
      align: 'right',
      orderByIndex: true,
      padding: rect(0, 5, 10, -5)
    }),
    fill: Color.rgba(255, 255, 255, 0),
    submorphs: [
      part(MenuBarButton, {
        tooltip: 'Close this dialog without loading',
        name: 'close button new',
        extent: pt(72.4, 21.3),
        submorphs: [{
          name: 'label',
          fontSize: 12,
          textAndAttributes: ['CLOSE', null]
        }, {
          name: 'icon',
          extent: pt(10, 10),
          imageUrl: 'https://fra1.digitaloceanspaces.com/typeshift/engage-lively/galyleo/close-button-icon-2.svg'
        }]
      })
    ]
  }, 'multi border control'),
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

// GalyleoBorderControl.openInWorld()
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
