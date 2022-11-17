import { PropertiesPanel } from 'lively.ide/studio/properties-panel.cp.js';
import { pt, rect } from 'lively.graphics/geometry-2d.js';
import { Color } from 'lively.graphics/color.js';
import {
  Polygon, ShadowObject, TilingLayout, easings, Image, Label
} from 'lively.morphic';
import { component, ViewModel, part } from 'lively.morphic/components/core.js';
import { arr } from 'lively.lang';
import { GalyleoColorInput, TableEntryMorph, MenuBarButton, GalyleoDropDownList, GalyleoAddButtonActive, GalyleoDropDownListModel, PromptButton, GalyleoList, GalyleoAddButtonHovered, GalyleoAddButtonDefault, GalyleoAddButton, TableEntry } from './shared.cp.js';
import { ViewCreatorPrompt } from './view-creator.cp.js';
import { ChartBuilder } from './chart-creator.cp.js';
import { FilterBuilder, FilterEditor } from './filter-creator.cp.js';
import { DataLoader } from './helpers.cp.js';

import { GalyleoPropertySection, GalyleoPropertySectionInactive } from './controls/section.cp.js';
import { GalyleoConstraintMarkerActive, GalyleoAlignmentControl, GalyleoResizingSimulator, GalyleoConstraintMarker } from './controls/constraints.cp.js';
import { GalyleoLayoutFlap, GalyleoLayoutControl, GalyleoMiniLayoutPreviewActive, GalyleoMiniLayoutPreview } from './controls/layout.cp.js';
import { GalyleoBorderPopup, GalyleoBorderControl } from './controls/border.cp.js';
import { GalyleoDynamicProperty, GalyleoBodyControlModel } from './controls/body.cp.js';
import { GalyleoShapeControl } from './controls/shape.cp.js';
import { GalyleoRichTextControl } from './controls/text.cp.js';
import { GalyleoFillControl } from './controls/fill.cp.js';
import { GalyleoColorPicker } from './color-picker.cp.js';

// GalyleoColorInput.openInWorld()
// GalyleoSideBar.openInWorld()

const placeholderImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAbZJREFUaEPtmT0vBUEUhp/rIyJBJKKQaCQahUKjpVFoFEqVSBCtPyD+gFZC4Rf4bBX+gMRnr6KhIxEhIScZyWays8a9O7M7nCnvvTvnfc77nrnZ3QaJr0bi+lGAqh1UB+ruQC8wA4wAPZHFvgB3wCnw7KpdFCERvwZ0RxZul3sFtl0QRQDzwHjF4r/L3wAHeVqKANYBcaEOSyK09VuADeuCzcgkXvWLHPDaICCUV30FUAfcHdAIeXVAI6QRarEDGqEWG6h/ZP8xQl3Amwe41zEeO0JjwDSwC3z8AFE7gAFgGRAHLoCTOgEMAW3AvUNUpxE/mPn+ELgugIjmgNwzrwDtJhp5N+B5t6fvwA7w5ICIAiAztACMGhEPwJ6V70lg1iHy0UALjL2iAMhATlmVb4F989kwsGjccaXlEjiuAkC6Lt3PO8nOgHNgFejzODKPgCvrd0Ed6De5dz0z+jTZzg5tEUfePAQD6ACWADl5ylz2PAQDmAMmylSe2Ss7D8EAAmmv5hQKCaMOeHUgoAVe9f/0w93kH68n/4JD4p30K6aA81ne1vqatbxeNreTOtBc38q7KnkHvgAu0nMxVZqzQwAAAABJRU5ErkJggg==';

// SideBarTab.openInWorld()
const SideBarTab = component({
  name: 'side bar/tab',
  borderColor: Color.rgb(128, 128, 128),
  borderWidth: { top: 1, left: 0, right: 1, bottom: 1 },
  extent: pt(69.3, 32.7),
  fill: Color.rgba(0, 0, 0, 0),
  layout: new TilingLayout({
    align: 'center',
    axis: 'row',
    autoResize: false,
    direction: 'centered',
    orderByIndex: true,
    reactToSubmorphAnimations: false,
    renderViaCSS: true,
    resizeSubmorphs: false
  }),
  submorphs: [{
    type: Label,
    name: 'tab label',
    fontSize: 14,
    fontColor: Color.rgb(81, 90, 90),
    fontFamily: 'Barlow',
    fontWeight: 700,
    nativeCursor: 'pointer',
    textAndAttributes: ['Tab Name', null]
  }]
});

// SideBarTabSelected.openInWorld()
const SideBarTabSelected = component(SideBarTab, {
  name: 'side bar/tab/selected',
  submorphs: [
    { name: 'tab label', fontColor: Color.rgb(241, 90, 36) }
  ]
});

export class DashboardControl extends ViewModel {
  static get properties () {
    return {
      isHaloItem: { defaultValue: true },
      dashboard: {},
      topBar: {},
      tabComponent: {
        isComponent: true,
        get () {
          return this.getProperty('tabComponent') || SideBarTab;
        }
      },
      tabComponentSelected: {
        isComponent: true,
        get () {
          return this.getProperty('tabComponentSelected') || SideBarTabSelected;
        }
      },
      isToggled: {
        defaultValue: false
      },
      expose: {
        get () {
          return ['isHaloItem', 'init', 'update', 'clearFocus'];
        }
      },
      bindings: {
        get () {
          return [
            { signal: 'extent', handler: 'relayout' },
            { model: 'close button', signal: 'fire', handler: 'slideOut' },
            { target: 'collapse indicator', signal: 'onMouseDown', handler: 'toggleSlide' },
            { target: 'tables tab', signal: 'onMouseDown', handler: 'selectTab', converter: () => 'tables' },
            { target: 'charts tab', signal: 'onMouseDown', handler: 'selectTab', converter: () => 'charts' },
            { target: 'filters tab', signal: 'onMouseDown', handler: 'selectTab', converter: () => 'filters' },
            { target: 'views tab', signal: 'onMouseDown', handler: 'selectTab', converter: () => 'views' }
          ];
        }
      }
    };
  }

  selectTarget (target) {
    // fixme: filter only some elements to be selectable via halo
    if (arr.isArray(target)) return;
    this.slideIn();
    this.focusMorph(target);
  }

  async deselectTarget () {
    this.models.styleControl.attachToTarget; // allow for context
    // super hacky, but works for now. What we actually want is a state machine that
    // models the different modes of the halo/top bar/side bar combo appropriately...
    // if color picker caused the halo to dissappear, do not deselect the target...
    // const fillPicker = controls.shapeControl.ui.fillPicker;
    // const colorPicker = fillPicker.picker && fillPicker.picker;
    // let currentTarget;
    // if (colorPicker && colorPicker.world()) {
    //   // show halo again
    //   once(colorPicker, 'remove', () => this.topBar.showHaloFor(currentTarget));
    //   return;
    // }
    // Object.values(controls).forEach(control => control.removeFocus());
  }

  focusMorph (target) {
    this.ui.styleControl.focusOn(target);
  }

  async selectTab (tabName) {
    const tabToControl = {
      tables: 'tableControl',
      filters: 'filterControl',
      charts: 'chartControl',
      views: 'viewControl'
    };
    this.ui.tabSwitcher.submorphs.forEach(m => m.master = this.tabComponent);
    this.ui[tabName + 'Tab'].master = this.tabComponentSelected;
    const controlFrame = this.ui.controlContainer;
    const selectedControl = this.ui[tabToControl[tabName]];
    controlFrame.submorphs.forEach(m => {
      m.visible = m.isLayoutable = m === selectedControl;
    });
  }

  /**
   * Initialize this, with a dashboard.  The dashboard must be an instance
   * of Dashboard, and there should only be one on a page.  Since the dashboard
   * pushes information to the controller on a change of state, initialize
   * the dashboard's dashboardController property to this.
   * @param { object } dashboard - the dashboard for the callbacks
   */
  init (dashboard) {
    this.dashboard = dashboard;
    dashboard.init(this);
    this.models.tableControl.init(this);
    this.models.filterControl.init(this);
    this.models.chartControl.init(this);
    this.models.viewControl.init(this);
    this.models.styleControl.attachToTarget(dashboard);
    this.models.styleControl.clearFocus();
    this.ui.controls.visible = false;
    this.adjustIndicator();
  }

  clearFocus () {
    this.models.styleControl.clearFocus();
  }

  toggleSlide () {
    if (this.isToggled) {
      this._userAskedToStay = false;
      this.slideOut();
    } else {
      this._userAskedToStay = true;
      this.slideIn();
    }
  }

  adjustIndicator () {
    const { collapseIndicator } = this.ui;
    collapseIndicator.rotation = this.isToggled ? Math.PI : 2 * Math.PI;
    this.relayout();
  }

  /**
   * moves the side bar out of the view
   */
  async slideOut () {
    const world = this.world();
    const { view } = this;
    this.isToggled = false;
    await view.owner.withAnimationDo(() => {
      this.adjustIndicator();
    }, {
      easing: easings.inOutExpo,
      duration: 300
    });
    this.ui.controls.visible = false;
    world.halos().forEach(h => h.maskBounds = world.getHaloMask());
  }

  /**
   * moves the sidebar into the view
   */
  async slideIn () {
    const { view } = this;
    const world = this.world();
    this.isToggled = true;
    if (view.right === view.owner.width) return;
    this.ui.controls.visible = true;
    await view.owner.withAnimationDo(() => {
      this.adjustIndicator();
    }, {
      easing: easings.inOutExpo,
      duration: 300
    });
    world.halos().forEach(h => h.maskBounds = world.getHaloMask());
  }

  relayout () {
    const { view } = this;
    const collapseIndicator = this.ui.collapseIndicator;
    collapseIndicator.leftCenter = this.view.innerBounds().leftCenter();
    if (this.isToggled) { view.right = view.owner.width; } else { view.left = view.owner.width - collapseIndicator.width - view.borderWidth; }
  }

  /**
   * Update the information displayed here and the menus of the
   * external filter creator.  Make sure the tableList is displaying
   * the current tables, the chartList the current charts, and make
   * sure the pulldowns on the external filter creator have the right
   * list of columns.  This is called by the dashboard when the
   * set of tables or charts are updated, and when this is
   * initialized, and onLoad.
   * @param {type} dataEntries - description
   */
  _wrapData (dataEntries) {
    return dataEntries.map(d => TableEntry.wrapDataEntry(d));
  }

  _wrapVisual (visualEntries) {
    return visualEntries.map(v => TableEntry.wrapVisualEntry(v));
  }

  update () {
    const { tableControl, chartControl, viewControl, filterControl } = this.models;
    const tables = this.dashboard.tableNames.map(tableName => {
      return TableEntryMorph.wrapDataEntry(tableName, {
        onDelete: () => tableControl.removeTable(tableName),
        onConfig: () => tableControl.previewTable(tableName)
      });
    });
    const charts = this.dashboard.chartNames.map(chartName => {
      return TableEntryMorph.wrapVisualEntry(chartName, {
        onData: () => chartControl.editChart(chartName),
        onDelete: () => chartControl.removeChart(chartName)
      });
    });
    const views = this.dashboard.viewNames.map(viewName => {
      return TableEntryMorph.wrapVisualEntry(viewName, {
        onData: () => viewControl.editView(viewName),
        onDelete: () => viewControl.removeView(viewName)
      });
    });
    const filters = this.dashboard.filterNames.map(filterName => {
      return TableEntryMorph.wrapVisualDataEntry(filterName, {
        onConfig: () => filterControl.highlightFilter(filterName),
        onData: () => filterControl.editFilter(filterName),
        onDelete: () => filterControl.removeFilter(filterName)
      });
    });
    tableControl.items = tables;
    chartControl.items = charts;
    viewControl.items = views;
    filterControl.items = filters;
  }

  /**
   * A little utility that takes in a Part URL for a dialog,
   * reads it, opens it in the world, and positions it off the
   * top-left corner of the dashboard.  Called by buildChart,
   * loadTable, and editChart.
   * @param { string } dialogPartUrl - the component for the dialog to load
   * @returns { Morph } The loaded, positioned part.
   */
  async openDialog (dialogPart) {
    return await this.dashboard.openDialog(dialogPart);
  }
}

export class EntityControlModel extends ViewModel {
  static get properties () {
    return {
      expose: { get () { return ['init']; } },
      items: {
        derived: true,
        set (items) {
          this.ui.entryList.items = items;
        },
        get () {
          return this.ui.entryList?.items;
        }
      },
      bindings: {
        get () {
          return [
            { target: 'edit button', signal: 'onMouseDown', handler: 'toggleEdit' },
            { target: 'add button', signal: 'onMouseDown', handler: 'build' }
          ];
        }
      }
    };
  }

  init (controller) {
    this.controller = controller;
  }

  get dashboard () { return this.controller.dashboard; }

  /**
   * Toggles between the view/edit mode of the list of tables
   * Is is to support the interface envisioned by mahdi, where the
   * user switches between view and edit mode of the list
   */
  toggleEdit () {
    this.ui.entryList.toggleEdit();
  }

  build () {
    // subclass responsibility
  }
}

export class TableControlModel extends EntityControlModel {
  async build () {
    const tableBuilder = await this.controller.openDialog(DataLoader);
    tableBuilder.viewModel.init(this.dashboard.viewModel);
  }

  removeTable (tableName) {
    if (this.dashboard.tables[tableName]) {
      delete this.dashboard.tables[tableName];
    }
    this.dashboard.dirty = true;
    this.controller.update();
  }

  previewTable (table) {
    this.dashboard.displayPreview(table);
  }
}

export class FilterControlModel extends EntityControlModel {
  async build () {
    const filterBuilder = await this.controller.openDialog(FilterBuilder);
    filterBuilder.init(this.dashboard);
  }

  async editFilter (filterName) {
    const filterEditor = await this.controller.openDialog(FilterEditor);
    filterEditor.init(this.dashboard, filterName);
  }

  removeFilter (filterName) {
    this.dashboard.removeFilter(filterName);
  }

  highlightFilter (filterName) {
    this.dashboard.getSubmorphNamed(filterName).show();
  }
}

export class ChartControlModel extends EntityControlModel {
  /**
   * open the chart builder in the world, and initialize it with
   * the dashboard -- the chart builder will call the dashboard back with
   * the finished part
   * This is called in response to the "Add Chart" button
   */
  async build () {
    const chartBuilder = await this.controller.openDialog(ChartBuilder);
    chartBuilder.init(this.dashboard);
  }

  editChart (chartName) {
    this.dashboard.editChartStyle(chartName);
  }

  removeChart (chartName) {
    this.dashboard.removeChart(chartName);
  }

  highlightChart (chartName) {
    this.dashboard.get(chartName).show();
  }
}

export class ViewControlModel extends EntityControlModel {
  async build () {
    const newViewPrompt = await this.controller.openDialog(ViewCreatorPrompt);
    newViewPrompt.init(this.dashboard);
  }

  editView (viewName) {
    this.dashboard.createViewEditor(viewName);
  }

  removeView (viewName) {
    delete this.dashboard.views[viewName];
    this.controller.update(); // preserve edit state
    this.dashboard.dirty = true;
  }
}

// GalyleoPropertiesPanel.get('clip mode selector').owner.master.auto.derivedMorph.ownerChain()
// PropertiesPanel.openInWorld()
// GalyleoPropertiesPanel.edit()
// m = GalyleoPropertiesPanel.get('background fill input')
// m.master._overriddenProps.get(m)
const GalyleoPropertiesPanel = component(PropertiesPanel, {
  name: 'galyleo/properties panel',
  fill: Color.rgb(215, 219, 221),
  extent: pt(255.4, 917.3),
  submorphs: [{
    name: 'background control',
    layout: new TilingLayout({
      axis: 'column',
      hugContentsVertically: true,
      orderByIndex: true,
      padding: rect(0, 10, 0, 0),
      resizePolicies: [['h floater', {
        height: 'fixed',
        width: 'fill'
      }], ['background fill input', {
        height: 'fixed',
        width: 'fill'
      }]],
      spacing: 10,
      wrapSubmorphs: false
    }),
    extent: pt(250, 98),
    master: GalyleoPropertySection,
    submorphs: [
      {
        name: 'background fill input',
        master: GalyleoColorInput,
        viewModel: {
          activeColor: Color.gray,
          gradientEnabled: true,
          colorPickerComponent: GalyleoColorPicker
        }
      }]
  }, {
    name: 'shape control',
    master: GalyleoShapeControl,
    visible: true,
    // view model parametrizations are not carried over by the master yet... should they???
    viewModel: {
      propertyLabelComponent: GalyleoAddButtonDefault,
      propertyLabelComponentHover: GalyleoAddButtonHovered,
      propertyLabelComponentActive: GalyleoAddButtonActive
    },
    submorphs: [
      {
        name: 'clip mode selector',
        viewModelClass: GalyleoDropDownListModel,
        viewModel: {
          listMaster: GalyleoDropDownList
        }
      }
    ]
  }, {
    name: 'text control',
    master: GalyleoRichTextControl,
    visible: true,
    viewModel: {
      hoveredButtonComponent: GalyleoAddButtonHovered,
      activeButtonComponent: GalyleoAddButton
    },
    submorphs: [
      {
        name: 'text controls',
        submorphs: [
          {
            name: 'font family selector',
            viewModelClass: GalyleoDropDownListModel,
            viewModel: {
              listMaster: GalyleoDropDownList
            }
          },
          {
            name: 'font weight selector',
            viewModelClass: GalyleoDropDownListModel,
            viewModel: {
              listMaster: GalyleoDropDownList
            }
          }
        ]
      }, {
        name: 'font color input',
        viewModel: {
          activeColor: Color.gray,
          colorPickerComponent: GalyleoColorPicker
        }
      },
      {
        name: 'bottom wrapper',
        submorphs: [
          {
            name: 'line wrapping selector',
            viewModelClass: GalyleoDropDownListModel,
            viewModel: {
              listMaster: GalyleoDropDownList
            }
          }
        ]
      }
    ]
  }, {
    name: 'layout control',
    visible: true,
    master: GalyleoLayoutControl,
    viewModel: {
      activeSectionComponent: GalyleoLayoutControl,
      hoverSectionComponent: GalyleoPropertySection,
      inactiveSectionComponent: GalyleoPropertySectionInactive,
      controlFlapComponent: GalyleoLayoutFlap,
      buttonActiveComponent: GalyleoAddButtonHovered,
      buttonInactiveComponent: GalyleoAddButton
    },
    submorphs: [
      {
        name: 'controls',
        submorphs: [{
          name: 'mini layout preview',
          activeComponent: GalyleoMiniLayoutPreviewActive,
          inactiveComponent: GalyleoMiniLayoutPreview
        }]
      }
    ]
  }, {
    name: 'alignment control',
    visible: true,
    master: GalyleoAlignmentControl,
    submorphs: [
      {
        name: 'constraints',
        viewModel: {
          activeMarkerComponent: GalyleoConstraintMarkerActive,
          defaultMarkerComponent: GalyleoConstraintMarker
        },
        submorphs: [
          {
            name: 'horizontal alignment selector',
            viewModelClass: GalyleoDropDownListModel,
            viewModel: {
              listMaster: GalyleoDropDownList
            }
          },
          {
            name: 'vertical alignment selector',
            viewModelClass: GalyleoDropDownListModel,
            viewModel: {
              listMaster: GalyleoDropDownList
            }
          }
        ]
      }, {
        name: 'resizing',
        submorphs: [
          {
            name: 'horizontal alignment selector',
            viewModelClass: GalyleoDropDownListModel,
            viewModel: {
              listMaster: GalyleoDropDownList
            }
          },
          {
            name: 'vertical alignment selector',
            viewModelClass: GalyleoDropDownListModel,
            viewModel: {
              listMaster: GalyleoDropDownList
            }
          }
        ]
      }]
  }, {
    name: 'fill control',
    visible: true,
    master: GalyleoFillControl,
    viewModel: {
      placeholderImage
    },
    submorphs: [
      {
        name: 'fill color input',
        viewModel: {
          activeColor: Color.gray,
          gradientEnabled: true,
          colorPickerComponent: GalyleoColorPicker
        }
      }
    ]
  }, {
    name: 'border control',
    visible: true,
    master: GalyleoBorderControl,
    viewModel: {
      activeSectionComponent: GalyleoBorderControl,
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
        submorphs: [
          {
            name: 'border color input',
            viewModel: {
              activeColor: Color.gray,
              colorPickerComponent: GalyleoColorPicker
            } // fixme: this should be also hanlded by master application....
          },
          {
            name: 'border width control',
            submorphs: [{
              name: 'border style selector',
              viewModelClass: GalyleoDropDownListModel,
              viewModel: {
                listMaster: GalyleoDropDownList // fixme: should also be handled by master application
              }
            }]
          }]
      }]
  }, {
    name: 'effects control',
    visible: true,
    master: GalyleoPropertySection,
    defaultViewModel: GalyleoBodyControlModel,
    viewModel: {
      activeSectionComponent: GalyleoPropertySection,
      hoverSectionComponent: GalyleoPropertySection,
      inactiveSectionComponent: GalyleoPropertySectionInactive,
      dynamicPropertyComponent: GalyleoDynamicProperty
    }
  }]
});

// ControlPanel.edit()
const ControlPanel = component({
  name: 'control panel',
  extent: pt(262.6, 238.8),
  layout: new TilingLayout({
    axis: 'column',
    axisAlign: 'right',
    orderByIndex: true,
    padding: rect(10, 10, 0, 0),
    resizePolicies: [['v wrapper', {
      height: 'fixed',
      width: 'fill'
    }], ['entry list', {
      height: 'fixed',
      width: 'fill'
    }]],
    spacing: 10,
    wrapSubmorphs: false
  }),
  fill: Color.transparent,
  submorphs: [
    {
      name: 'v wrapper',
      layout: new TilingLayout({
        axisAlign: 'center',
        justifySubmorphs: 'spaced',
        orderByIndex: true
      }),
      extent: pt(243, 28.7),
      fill: Color.transparent,
      submorphs: [{
        type: Label,
        name: 'control label',
        fontColor: Color.rgb(81, 90, 90),
        fontFamily: 'Barlow',
        fontSize: 14,
        fontWeight: 700,
        nativeCursor: 'pointer',
        position: pt(16, 39.9),
        textAndAttributes: ['Control name', null]
      }, {
        type: Image,
        name: 'edit button',
        autoResize: false,
        extent: pt(20.2, 19.3),
        imageUrl: 'https://fra1.digitaloceanspaces.com/typeshift/engage-lively/galyleo/edit-icon.svg',
        nativeCursor: 'pointer'
      }]
    },
    part(GalyleoList, {
      name: 'entry list',
      submorphs: [{
        name: 'item list',
        extent: pt(263, 148.8),
        clipMode: 'hidden'
      }, {
        name: 'scroll bar',
        position: pt(230.4, 8)
      }]
    }),
    part(PromptButton, {
      name: 'add button',
      extent: pt(122.1, 34.4)
    })
  ]
});

// part(GalyleoSideBarControls)
const GalyleoSideBarControls = component({
  name: 'galyleo/side bar controls',
  clipMode: 'hidden',
  fill: Color.rgb(215, 219, 221),
  layout: new TilingLayout({
    axis: 'column',
    orderByIndex: true,
    resizePolicies: [['tab switcher', {
      height: 'fixed',
      width: 'fill'
    }], ['control container', {
      height: 'fixed',
      width: 'fill'
    }], ['style control', {
      height: 'fill',
      width: 'fill'
    }]],
    wrapSubmorphs: false
  }),
  extent: pt(277.2, 812.7),
  submorphs: [{
    name: 'tab switcher',
    borderWidth: { top: 1, left: 0, right: 0, bottom: 1 },
    borderColor: Color.rgb(128, 128, 128),
    clipMode: 'hidden',
    extent: pt(322.8, 32.7),
    fill: Color.rgba(0, 0, 0, 0),
    layout: new TilingLayout({
      align: 'top',
      axis: 'row',
      autoResize: false,
      direction: 'leftToRight',
      orderByIndex: true,
      reactToSubmorphAnimations: false,
      renderViaCSS: true,
      resizeSubmorphs: false
    }),
    submorphs: [
      part(SideBarTab, {
        name: 'tables tab',
        submorphs: [{
          name: 'tab label',
          textAndAttributes: ['Tables', null]
        }]
      }),
      part(SideBarTab, {
        name: 'filters tab',
        submorphs: [{
          name: 'tab label',
          textAndAttributes: ['Filters', null]
        }]
      }),
      part(SideBarTab, {
        name: 'views tab',
        submorphs: [{
          name: 'tab label',
          textAndAttributes: ['Views', null]
        }]
      }),
      part(SideBarTab, {
        name: 'charts tab',
        submorphs: [{
          name: 'tab label',
          textAndAttributes: ['Charts', null]
        }]
      })
    ]
  }, {
    name: 'control container',
    extent: pt(364, 245.2),
    clipMode: 'hidden',
    layout: new TilingLayout({
      axis: 'column',
      orderByIndex: true,
      padding: rect(10, 0, 0, 0),
      resizePolicies: [['chart control', {
        height: 'fixed',
        width: 'fill'
      }], ['view control', {
        height: 'fixed',
        width: 'fill'
      }], ['table control', {
        height: 'fixed',
        width: 'fill'
      }], ['filter control', {
        height: 'fixed',
        width: 'fill'
      }]],
      wrapSubmorphs: false
    }),
    fill: Color.transparent,
    submorphs: [
      part(ControlPanel, {
        name: 'chart control',
        viewModelClass: ChartControlModel,
        submorphs: [{
          name: 'v wrapper',
          submorphs: [{
            name: 'control label',
            textAndAttributes: ['Charts', null]
          }]
        }, {
          name: 'add button',
          submorphs: [{
            name: 'label',
            textAndAttributes: ['Add chart', null]
          }]
        }]
      }),
      part(ControlPanel, {
        name: 'view control',
        viewModelClass: ViewControlModel,
        position: pt(288.5, 233.5),
        submorphs: [{
          name: 'v wrapper',
          submorphs: [{
            name: 'control label',
            textAndAttributes: ['Views', null]
          }]
        }, {
          name: 'add button',
          submorphs: [{
            name: 'label',
            textAndAttributes: ['Add view', null]
          }]
        }]
      }),
      part(ControlPanel, {
        name: 'table control',
        viewModelClass: TableControlModel,
        position: pt(12.7, 510.6),
        submorphs: [{
          name: 'v wrapper',
          submorphs: [{
            name: 'control label',
            textAndAttributes: ['Tables', null]
          }]
        }, {
          name: 'add button',
          submorphs: [{
            name: 'label',
            textAndAttributes: ['Add table', null]
          }]
        }]
      }),
      part(ControlPanel, {
        name: 'filter control',
        viewModelClass: FilterControlModel,
        position: pt(16.8, 258.7),
        submorphs: [{
          name: 'v wrapper',
          submorphs: [{
            name: 'control label',
            textAndAttributes: ['Filters', null]
          }]
        }, {
          name: 'entry list',
          submorphs: [{
            name: 'item list',
            clipMode: 'hidden',
            extent: pt(257, 148.8)
          }, {
            name: 'scroll bar',
            position: pt(224.4, 8)
          }]
        }, {
          name: 'add button',
          submorphs: [{
            name: 'label',
            textAndAttributes: ['Add filter', null]
          }]
        }]
      })
    ]
  }, part(GalyleoPropertiesPanel, {
    name: 'style control',
    dropShadow: new ShadowObject({ distance: 1.414213562373095, rotation: 90, color: Color.rgba(0, 0, 0, 0.3), inset: true, blur: 11 }),
    borderColor: Color.rgbHex('7F8C8D'),
    borderWidth: { top: 3, left: 0, right: 0, bottom: 0 },
    layout: new TilingLayout({
      axis: 'column',
      orderByIndex: true,
      resizePolicies: [['background control', {
        width: 'fill'
      }], ['shape control', {
        width: 'fill'
      }], ['text control', {
        width: 'fill'
      }], ['layout control', {
        width: 'fill'
      }], ['alignment control', {
        height: 'fixed',
        width: 'fill'
      }], ['fill control', {
        height: 'fixed',
        width: 'fill'
      }], ['border control', {
        height: 'fixed',
        width: 'fill'
      }], ['effects control', {
        height: 'fixed',
        width: 'fill'
      }]],
      wrapSubmorphs: false
    }),
    extent: pt(318.2, 535),
    submorphs: [
      {
        name: 'shape control',
        extent: pt(242, 177)
      },
      {
        name: 'text control',
        extent: pt(335.8, 264)
      }, {
        name: 'layout control',
        extent: pt(334.8, 133)
      }]
  })]
});

// part(GalyleoSideBar)
// GalyleoSideBar.get('background fill input').master._overriddenProps.get(GalyleoSideBar.get('background fill input'))
const GalyleoSideBar = component({
  viewModelClass: DashboardControl,
  name: 'galyleo/side bar',
  layout: new TilingLayout({
    axis: 'column',
    axisAlign: 'right',
    orderByIndex: true,
    resizePolicies: [['button wrapper', {
      height: 'fixed',
      width: 'fill'
    }], ['controls', {
      height: 'fill',
      width: 'fill'
    }]],
    wrapSubmorphs: false
  }),
  borderColor: Color.rgb(241, 90, 36),
  borderWidth: {
    bottom: 0,
    left: 4,
    right: 0,
    top: 0
  },
  clipMode: 'hidden',
  extent: pt(296.3, 1124.2),
  fill: Color.rgb(215, 219, 221),
  position: pt(366.9, 119.8),
  submorphs: [
    {
      name: 'button wrapper',
      fill: Color.rgba(255, 255, 255, 0),
      extent: pt(297, 45.1),
      layout: new TilingLayout({
        align: 'right',
        axisAlign: 'center',
        orderByIndex: true,
        padding: rect(0, 0, 10, 0)
      }),
      submorphs: [
        part(MenuBarButton, {
          tooltip: 'Close this dialog without loading',
          name: 'close button',
          extent: pt(84.3, 28),
          submorphs: [{
            name: 'label',
            textAndAttributes: ['CLOSE', null]
          }, {
            name: 'icon',
            extent: pt(14, 14),
            imageUrl: 'https://fra1.digitaloceanspaces.com/typeshift/engage-lively/galyleo/close-button-icon-2.svg'
          }]
        })
      ]
    },
    part(GalyleoSideBarControls, {
      name: 'controls'
    }),
    {
      type: Polygon,
      name: 'collapse indicator',
      position: pt(6, 548.9),
      borderColor: Color.rgb(23, 160, 251),
      extent: pt(13.9, 26.5),
      fill: Color.rgb(241, 90, 36),
      isLayoutable: false,
      nativeCursor: 'pointer',
      origin: pt(7, 13.3),
      rotation: 3.141592653589793,
      vertices: [({ position: pt(13.913458455121425, 26.513896059782553), isSmooth: false, controlPoints: { next: pt(0, 0), previous: pt(0, 0) } }), ({ position: pt(0, 13.221250152706657), isSmooth: false, controlPoints: { next: pt(0, 0), previous: pt(0, 0) } }), ({ position: pt(13.832109662787806, 0), isSmooth: false, controlPoints: { next: pt(0, 0), previous: pt(0, 0) } })]
    }]
});

export {
  GalyleoSideBar, GalyleoPropertiesPanel, SideBarTabSelected, GalyleoBorderPopup, GalyleoDynamicProperty,
  GalyleoResizingSimulator, ControlPanel
};
