import { PropertiesPanel } from 'lively.ide/studio/properties-panel.cp.js';
import { component, part } from 'lively.morphic/components/core.js';
import { pt, rect } from 'lively.graphics/geometry-2d.js';
import { Color } from 'lively.graphics/color.js';
import { GalyleoColorInput, PromptButton, GalyleoList, GalyleoAddButtonHovered, GalyleoAddButtonDefault, GalyleoPropertyLabel, GalyleoAddButton, GalyleoDropDown, TableEntry, GalyleoNumberInput } from './shared.cp.js';
import { Morph, ShadowObject, TilingLayout, HorizontalLayout, easings } from 'lively.morphic';
import { arr } from 'lively.lang';
import { once } from 'lively.bindings';
import { Label } from 'lively.morphic/text/label.js';
import { ViewCreator } from './view-creator.cp.js';
import { ChartBuilder } from './chart-creator.cp.js';
import { FilterBuilder, FilterEditor } from './filter-creator.cp.js';
import { DataLoader } from './helpers.cp.js';
import { MiniLayoutPreview, AutoLayoutAlignmentFlap, MiniLayoutPreviewActive } from 'lively.ide/studio/controls/layout.cp.js';
import { ConstraintsSimulator, ConstraintSizeSelectorDefault, ResizingSimulator, ConstraintMarkerActive, ConstraintMarker } from 'lively.ide/studio/controls/constraints.cp.js';
import { Image } from 'lively.morphic/morph.js';
import { DynamicProperty } from 'lively.ide/studio/controls/body.cp.js';

// GalyleoColorInput.openInWorld()
// GalyleoSideBar.openInWorld()

const placeholderImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAbZJREFUaEPtmT0vBUEUhp/rIyJBJKKQaCQahUKjpVFoFEqVSBCtPyD+gFZC4Rf4bBX+gMRnr6KhIxEhIScZyWays8a9O7M7nCnvvTvnfc77nrnZ3QaJr0bi+lGAqh1UB+ruQC8wA4wAPZHFvgB3wCnw7KpdFCERvwZ0RxZul3sFtl0QRQDzwHjF4r/L3wAHeVqKANYBcaEOSyK09VuADeuCzcgkXvWLHPDaICCUV30FUAfcHdAIeXVAI6QRarEDGqEWG6h/ZP8xQl3Amwe41zEeO0JjwDSwC3z8AFE7gAFgGRAHLoCTOgEMAW3AvUNUpxE/mPn+ELgugIjmgNwzrwDtJhp5N+B5t6fvwA7w5ICIAiAztACMGhEPwJ6V70lg1iHy0UALjL2iAMhATlmVb4F989kwsGjccaXlEjiuAkC6Lt3PO8nOgHNgFejzODKPgCvrd0Ed6De5dz0z+jTZzg5tEUfePAQD6ACWADl5ylz2PAQDmAMmylSe2Ss7D8EAAmmv5hQKCaMOeHUgoAVe9f/0w93kH68n/4JD4p30K6aA81ne1vqatbxeNreTOtBc38q7KnkHvgAu0nMxVZqzQwAAAABJRU5ErkJggg==';

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
  fill: Color.darkgray
});

// GalyleoMiniLayoutPreviewActive.openInWorld()
const GalyleoMiniLayoutPreviewActive = component(MiniLayoutPreviewActive, {
  name: 'glayleo/mini layout preview/active',
  fill: Color.orange
});

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

// GalyleoResizingSimulator.openInWorld()
const GalyleoResizingSimulator = component(ResizingSimulator, {
  name: 'galyleo/resizing simulator',
  submorphs: [{
    name: 'inner constraints',
    borderColor: Color.rgba(102, 102, 102, 0.75)
  }]
});

// GalyleoDynamicProperty.openInWorld()
const GalyleoDynamicProperty = component(DynamicProperty, {
  name: 'galyleo/dynamic property',
  extent: pt(208.3, 30),
  submorphs: [
    { name: 'open popup', master: GalyleoAddButton },
    { name: 'effect selector', master: GalyleoDropDown },
    { name: 'remove', master: GalyleoAddButton }
  ]
});

// SideBarTab.openInWorld()
const SideBarTab = component({
  name: 'side bar/tab',
  borderColor: Color.rgb(128, 128, 128),
  borderWidth: { top: 1, left: 0, right: 1, bottom: 1 },
  extent: pt(69.3, 32.7),
  fill: Color.rgba(0, 0, 0, 0),
  layout: new HorizontalLayout({
    align: 'center',
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

export class DashboardControl extends Morph {
  static get properties () {
    return {
      isHaloItem: { defaultValue: true },
      isToggled: {
        derived: true,
        get () {
          return Math.abs(Math.floor(this.right) - Math.floor(this.owner.width)) < 5;
        }
      }
    };
  }

  // On load, simply make sure that the dashboard property is properly
  // initialized, and then update to ensure that the lists of tables and
  // charts are up-to-date and the menus in externalFilterCreator are
  // up-to-date.  Note that this will fail if this.dashboard is null and there
  // is no morph named dashboard in the world, but at that point things are
  // really broken anyway.

  async onLoad () {
    await this.whenRendered();
    this.init(this.get('dashboard'));
    this.update();
  }

  selectTarget (target) {
    // fixme: filter only some elements to be selectable via halo
    if (arr.isArray(target)) return;
    this.slideIn();
    this.focusMorph(target);
  }

  async deselectTarget () {
    // super hacky, but works for now. What we actually want is a state machine that
    // models the different modes of the halo/top bar/side bar combo appropriately...
    // if color picker caused the halo to dissappear, do not deselect the target...
    const controls = this.getControls();
    const fillPicker = controls.shapeControl.ui.fillPicker;
    await this.whenRendered();
    const colorPicker = fillPicker.picker && fillPicker.picker;
    const currentTarget = this.get('style control').treeData.target;
    if (colorPicker && colorPicker.world()) {
      // show halo again
      once(colorPicker, 'remove', () => this.get('tool bar').showHaloFor(currentTarget));
      return;
    }
    Object.values(controls).forEach(control => control.removeFocus());
    const tree = this.getSubmorphNamed('style control');
    // await promise.delay(100);
    if (this.world().halos().length > 0) return;
    tree.opacity = 0.5;
    if (!this._userAskedToStay) { this.slideOut(); }
  }

  getControls () {
    const tree = this.getSubmorphNamed('style control');
    const controls = tree.treeData.root.children.map(m => m.children[0].panel);
    return {
      richTextControl: controls[0].submorphs[0],
      shapeControl: controls[1],
      borderControl: controls[2],
      layoutControl: controls[3].submorphs[0]
    };
  }

  focusMorph (target) {
    const tree = this.getSubmorphNamed('style control');
    tree.opacity = 1;
    const { richTextControl, layoutControl, borderControl, shapeControl } = this.getControls();

    if (target.isLabel || target.isText || target.isButton) {
      richTextControl.focusOn(target, false);
    } else {
      // temporary deactivate the rich text interface not to confuse the user
    }

    tree.treeData.target = target;
    tree.update(true);
    [layoutControl, borderControl, shapeControl].forEach(control => control && control.focusOn(target));
  }

  async selectTab (tabName) {
    const tabToControl = {
      'tables tab': 'table control',
      'filters tab': 'filter control',
      'charts tab': 'chart control',
      'views tab': 'view control'
    };
    Object.keys(tabToControl).forEach(tab => this.getSubmorphNamed(tab).master = SideBarTab);
    this.getSubmorphNamed(tabName).master = SideBarTabSelected;
    const controlFrame = this.getSubmorphNamed('control frame');
    const selectedControl = this.getSubmorphNamed(tabToControl[tabName]);
    // await this.withAnimationDo(() => {
    //   controlFrame.submorphs.filter(m => m !== selectedControl).forEach(m => {
    //     m.visible = m.isLayoutable = false;
    //   });
    // }, {
    //   duration: 300
    // });
    // await this.withAnimationDo(() => {
    //   selectedControl.visible = selectedControl.isLayoutable = true;
    // }, {
    //   duration: 300
    // });
    controlFrame.submorphs.forEach(m => {
      m.visible = m.isLayoutable = m === selectedControl;
    });
    const styleControl = this.getSubmorphNamed('style control');
    styleControl.visible = styleControl.isLayoutable = true;
  }

  // this.selectTab('views tab')

  // Initialize this, with a dashboard.  The dashboard must be an instance
  // of Dashboard, and there should only be one on a page.  Since the dashboard
  // pushes information to the controller on a change of state, initialize
  // the dashboard's dashboardController property to this.
  // parameters:
  //      dashboard: the dashboard for the callbacks

  init (dashboard) {
    this.dashboard = dashboard;
    this.dashboard.dashboardController = this;
    // this.getSubmorphNamed('l2lRoomInput').textString = '';
    this.startStepping(10000, '__updateConnectionStatus__');
    // this.getSubmorphNamed('external filter creator').init(dashboard);
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

  // moves the side bar out of the view

  async slideOut () {
    const world = this.world();
    await this.owner.withAnimationDo(() => {
      const collapseIndicator = this.getSubmorphNamed('collapse indicator');
      this.getSubmorphNamed('tab switcher').visible = false;
      const networkIndicator = this.get('top bar network indicator');
      networkIndicator.width = this.owner.width - networkIndicator.left - 20;
      collapseIndicator.rotation = 2 * Math.PI;
      this.left = this.owner.width - collapseIndicator.width - this.borderWidth;
      this.relayout();
      this.dashboard.width = this.owner.width - 20;
      this.dashboard.clipMode = 'auto';
    }, {
      easing: easings.inOutExpo,
      duration: 300
    });
    world.halos().forEach(h => h.maskBounds = world.getHaloMask());
  }

  // moves the sidebar into the view

  async slideIn () {
    if (this.right === this.owner.width) return;
    const world = this.world();
    await this.owner.withAnimationDo(() => {
      const collapseIndicator = this.getSubmorphNamed('collapse indicator');
      const networkIndicator = this.owner.getSubmorphNamed('top bar network indicator');
      networkIndicator.width = this.owner.width - networkIndicator.left - this.width;
      this.getSubmorphNamed('tab switcher').visible = true;
      collapseIndicator.rotation = Math.PI;
      this.right = this.owner.width;
      this.dashboard.width = this.owner.width - this.width;
      this.dashboard.clipMode = 'auto';
      this.relayout();
    }, {
      easing: easings.inOutExpo,
      duration: 300
    });
    world.halos().forEach(h => h.maskBounds = world.getHaloMask());
  }

  relayout () {
    const collapseIndicator = this.getSubmorphNamed('collapse indicator');
    const controlFrame = this.getSubmorphNamed('control frame');
    collapseIndicator.leftCenter = this.innerBounds().insetBy(this.borderWidth).leftCenter();
    controlFrame.height = this.height - controlFrame.top;
  }

  // update the status of the connection panel.  This is done every few
  // seconds.  Just check when the last message was received, what room
  // we're connected to (if any), when the last message was received, and
  // if it was parsed properly
  async __updateConnectionStatus__ () {
    /* const status = await this.dashboard.checkStatus();
    if (status === 'Connected') {
      this.getSubmorphNamed('roomName').textString = this.dashboard.l2lRoomName;
      this.getSubmorphNamed('connectStatus').fill = Color.green;
      if (this.dashboard.lastMessageTime) {
        this.getSubmorphNamed('messageTime').textString = this.dashboard.lastMessageTime.toLocaleTimeString('en-US', { hour12: false });
        this.getSubmorphNamed('messageStatus').fill = this.dashboard.lastMessageParsed ? Color.green : Color.red;
      } else {
        this.getSubmorphNamed('messageTime').textString = 'Message Time';
        this.getSubmorphNamed('messageStatus').fill = Color.rgba(0, 0, 0, 0);
      }
    } else if (status === 'Not Connected') {
      this.getSubmorphNamed('roomName').textString = this.dashboard.l2lRoomName;
      this.getSubmorphNamed('connectStatus').fill = Color.red;
      this.getSubmorphNamed('messageTime').textString = 'Message Time';
      this.getSubmorphNamed('messageStatus').fill = Color.rgba(0, 0, 0, 0);
    } else {
      this.getSubmorphNamed('roomName').textString = 'Room Name';
      this.getSubmorphNamed('connectStatus').fill = Color.rgba(0, 0, 0, 0);
      this.getSubmorphNamed('messageTime').textString = 'Message Time';
      this.getSubmorphNamed('messageStatus').fill = Color.rgba(0, 0, 0, 0);
    } */
  }

  // update the information displayed here and the menus of the
  // external filter creator.  Make sure the tableList is displaying
  // the current tables, the chartList the current charts, and make
  // sure the pulldowns on the external filter creator have the right
  // list of columns.  This is called by the dashboard when the
  // set of tables or charts are updated, and when this is
  // initialized, and onLoad.

  __wrapData__ (dataEntries) {
    return dataEntries.map(d => TableEntry.wrapDataEntry(d));
  }

  __wrapVisual__ (visualEntries) {
    return visualEntries.map(v => TableEntry.wrapVisualEntry(v));
  }

  update () {
    const tables = this.dashboard.tableNames.map(tableName => {
      return TableEntry.wrapDataEntry(tableName, {
        onDelete: () => this.removeTable(tableName),
        onConfig: () => this._previewViewOrTable(tableName)
      });
    });
    const charts = this.dashboard.chartNames.map(chartName => {
      return TableEntry.wrapVisualEntry(chartName, {
        onConfig: () => this.editChart(chartName),
        onDelete: () => this.removeChart(chartName)
      });
    });
    const views = this.dashboard.viewNames.map(viewName => {
      return TableEntry.wrapVisualEntry(viewName, {
        onConfig: () => this.editView(viewName),
        onDelete: () => this.removeView(viewName)
      });
    });
    const filters = this.dashboard.filterNames.map(filterName => {
      return TableEntry.wrapVisualDataEntry(filterName, {
        onConfig: () => this.highlightFilter(filterName),
        onData: () => this.editFilter(filterName),
        onDelete: () => this.removeFilter(filterName)
      });
    });
    this.getSubmorphNamed('tableList').items = tables;
    this.getSubmorphNamed('chartList').items = charts;
    this.getSubmorphNamed('viewList').items = views;
    this.getSubmorphNamed('filterList').items = filters;
    // this.getSubmorphNamed('viewBuilder').init(this.dashboard);
    // this.getSubmorphNamed('external filter creator').init(this.dashboard);
  }

  // Join the room chosen.  This is in connected to the fire event on the
  // join button in the l2l control.
  async joinRoom () {
    const roomName = this.getSubmorphNamed('l2lRoomInput').textString;
    if (roomName && roomName.length > 0) {
      await this.dashboard.join(roomName);
      this.__updateConnectionStatus__();
    } else {
      this.getSubmorphNamed('l2lRoomInput').show();
    }
  }

  // A little utility that takes in a Part URL for a dialog,
  // reads it, opens it in the world, and positions it off the
  // top-left corner of the dashboard.  Called by buildChart,
  // loadTable, and editChart.
  // parameters:
  //    dialogPartUrl: the part URL (part://) of the part to be loaded
  // returns:
  //    The loaded, positioned part.

  async __openDialog__ (dialogPartUrl) {
    return await this.dashboard.openDialog(dialogPartUrl);
  }

  // Load a table from an URL, using the tableLoader.  The tableLoader
  // will add the loaded table to the table list in the dashboard, so
  // init with the dashboard to permit the loader to update.
  // This is called in response to the "Load Table" button

  async loadTable () {
    const tableBuilder = await this.__openDialog__(DataLoader);
    tableBuilder.init(this.dashboard);
  }

  // Preview a table or a view.  This is called internally by
  // previewSelectedTable() and previewSelectedView().  One optimization
  // we could consider here is to have separate routines to preview
  // tables and views in dashboard -- ATM, that code has to sort out
  // which it is looking at.  But charts have to disambiguate too, and it's
  // exactly the same code in dashboard.  One idea to simplify things is
  // to attach a trivial view to each table and always preview/chart views
  // parameters:
  //    viewOrTableName: name of the table or view to show

  __previewSelectedItem__ (viewOrTableListName) {
    const viewOrTableList = this.getSubmorphNamed(viewOrTableListName);
    const selectedItem = viewOrTableList.selection;
    if (selectedItem) {
      this.dashboard.displayPreview(selectedItem);
    } else {
      viewOrTableList.show();
    }
  }

  _previewViewOrTable (viewOrTable) {
    this.dashboard.displayPreview(viewOrTable);
  }

  // Toggles between the view/edit mode of the list of tables
  // Is is to support the interface envisioned by mahdi, where the
  // user switches between view and edit mode of the list

  toggleTableEdit () {
    this.getSubmorphNamed('tableList').toggleEdit();
  }

  // Preview the table selected in the table list.  This just calls
  // __previewSelectedItem__ to do this.  This is the target of the
  // "Preview Table" button.

  previewSelectedTable () {
    this.__previewSelectedItem__('tableList');
  }

  // Removes a table from the list of tables.  Perhaps there should be
  // some cascading effort in the dashboard when this happens.  Since charts
  // are bound to tables, perhaps charts which reference the deleted table
  // should be removed.
  // This is called in response to the "Remove Table" button

  removeSelectedTable () {
    // fixme: dont do this via selection
    const tableName = this.getSubmorphNamed('tableList').selection;
    if (!tableName) {
      return;
    }
    this.removeTable(tableName);
  }

  removeTable (tableName) {
    if (this.dashboard.tables[tableName]) {
      delete this.dashboard.tables[tableName];
    }
    this.dashboard.dirty = true;
    this.update();
  }

  // Toggles between the view/edit mode of the list of views
  // Is is to support the interface envisioned by mahdi, where the
  // user switches between view and edit mode of the list

  toggleViewEdit () {
    this.getSubmorphNamed('viewList').toggleEdit();
  }

  // Preview the view selected in the view list.  This just calls
  // __previewSelectedItem__ to do this.  This is the target of the
  // "Preview View" button

  previewSelectedView () {
    this.__previewSelectedItem__('viewList');
  }

  // Tell the dashboard to edit th selected view.  This is in response to
  // the "Edit View" button
  editSelectedView () {
    // fixme: dont do this via selection
    const viewName = this.getSubmorphNamed('viewList').selection;
    if (viewName) {
      this.editView(viewName);
    } else {
      this.getSubmorphNamed('viewList').show();
    }
  }

  editView (viewName) {
    this.dashboard.createViewEditor(viewName);
  }

  // Tell the dashboard to remove the selected view.  This is in response to
  // the "Remove View" button
  removeSelectedView () {
    // fixme: dont do this via selection
    const viewName = this.getSubmorphNamed('viewList').selection;
    if (viewName) {
      delete this.dashboard.views[viewName];
      this.update();
    } else {
      this.getSubmorphNamed('viewList').show();
    }
  }

  // directly delete a view via name

  removeView (viewName) {
    delete this.dashboard.views[viewName];
    this.update(); // preserve edit state
    this.dashboard.dirty = true;
  }

  async createNewView () {
    const newViewPrompt = await this.__openDialog__(ViewCreator);
    newViewPrompt.init(this.dashboard);
  }

  // Toggles between the view/edit mode of the list of charts
  // Is is to support the interface envisioned by mahdi, where the
  // user switches between view and edit mode of the list

  toggleChartEdit () {
    this.getSubmorphNamed('chartList').toggleEdit();
  }

  // open the chart builder in the world, and initialize it with
  // the dashboard -- the chart builder will call the dashboard back with
  // the finished part
  // This is called in response to the "Add Chart" button

  async buildChart () {
    const chartBuilder = await this.__openDialog__(ChartBuilder);
    chartBuilder.init(this.dashboard);
  }

  // Edit the chart's style.  This is done
  // through Google's built-in Chart Editor.  The dashboard has the
  // code to build and open this, so all we do is make sure that
  // there's a chartName and then turn matters over to the dashboard.
  // This is called in response to the "Edit Chart Style" button

  editSelectedChart () {
    // fixme: dont do this via selection
    const chartName = this.getSubmorphNamed('chartList').selection;
    if (!chartName) {
      return;
    }
    this.editChart(chartName);
  }

  editChart (chartName) {
    this.dashboard.editChartStyle(chartName);
  }

  // When an item is clicked on the chartList, it is highlighted so the
  // user can see what the Edit Chart  and Remove Chart  buttons
  // will be applied to.
  // This is connected to the selection property of chartList.

  highlightChart () {
    // fixme: dont do this via selection
    const chartName = this.getSubmorphNamed('chartList').selection;
    this.get(chartName).show();
  }

  // Remove the selected chart from the dashboard.  This is called in response
  // to the "RemoveChart" button
  removeSelectedChart () {
    // fixme: dont do this via selection
    const chartName = this.getSubmorphNamed('chartList').selection;
    this.removeChart(chartName);
  }

  removeChart (chartName) {
    const chartMorph = this.dashboard.getSubmorphNamed(chartName);
    this.dashboard.dirty = true;
    chartMorph.remove();
  }

  // Toggles between the view/edit mode of the list of filters
  // Is is to support the interface envisioned by mahdi, where the
  // user switches between view and edit mode of the list

  toggleFilterEdit () {
    this.getSubmorphNamed('filterList').toggleEdit();
  }

  // open the external filter creator in the world, and initialize it with
  // the dashboard -- the filter creator will call the dashboard back with
  // the finished part
  // This is called in response to the "Add Filter" button

  async buildFilter () {
    const filterBuilder = await this.__openDialog__(FilterBuilder);
    filterBuilder.init(this.dashboard);
  }

  // When an item is clicked on the filterList, it is highlighted so the
  // user can see what the  Remove Filter  buttons
  // will be applied to.
  // This is connected to the selection property of filterList.

  highlightSelectedFilter () {
    // fixme: dont do this via selection
    const filterName = this.getSubmorphNamed('filterList').selection;
    this.highlightFilter(filterName);
  }

  highlightFilter (filterName) {
    this.get(filterName).show();
  }

  async editFilter (filterName) {
    const filterEditor = await this.__openDialog__(FilterEditor);
    filterEditor.init(this.dashboard, filterName);
  }

  // Remove the selected chart from the dashboard.  This is called in response
  // to the "RemoveFilter" button
  removeSelectedFilter () {
    // fixme: dont do this via selection
    const filterName = this.getSubmorphNamed('filterList').selection;
    this.removeFilter(filterName);
  }

  removeFilter (filterName) {
    const filterMorph = this.dashboard.getSubmorphNamed(filterName);
    filterMorph.remove();
    this.update();
    this.dashboard.dirty = true;
  }
}

// GalyleoPropertiesPanel.openInWorld()
// m = part(GalyleoPropertiesPanel)
// c = m.get('background fill input')
// m.openInWorld()
// o = c.get('opacity input')
// o.master._overriddenProps.get(o.get('value')){
//   cursorColor: true,
//   extent: true,
//   fixedWidth: true,
//   fontColor: true,
//   fontSize: true,
//   master: true
// }

const GalyleoPropertiesPanel = component(PropertiesPanel, {
  name: 'galyleo/properties panel',
  // fill: Color.rgb(189, 195, 199),
  fill: Color.rgb(215, 219, 221),
  extent: pt(255.4, 917.3),
  submorphs: [{
    name: 'background control',
    extent: pt(250, 98),
    submorphs: [
      {
        name: 'h floater',
        extent: pt(250, 31),
        submorphs: [
          {
            name: 'section headline',
            fontColor: Color.rgb(66, 73, 73) 
          }
        ]
      },
      {
        name: 'background fill input',
        master: GalyleoColorInput
      }]
  }, {
    name: 'shape control',
    visible: true,
    viewModel: {
      propertyLabelComponent: {
        auto: GalyleoAddButtonDefault,
        hover: GalyleoAddButtonHovered,
        active: GalyleoAddButtonHovered
      }
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
        name: 'clip mode selector',
        master: GalyleoDropDown,
        submorphs: [
          { name: 'interactive label', fontColor: Color.rgb(128, 128, 128) }
        ] 
      }
    ]
  }, {
    name: 'text control',
    visible: true,
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
            master: GalyleoDropDown
          },
          {
            name: 'font weight selector',
            master: GalyleoDropDown
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
            master: GalyleoDropDown
          }
        ]
      }
    ]
  }, {
    name: 'layout control',
    visible: true,
    submorphs: [
      {
        name: 'h floater',
        submorphs: [
          {
            name: 'section headline',
            fontColor: Color.rgb(66, 73, 73) 
          },
          {
            name: 'add button',
            master: GalyleoAddButton
          }
        ]
      },
      {
        name: 'controls',
        submorphs: [
          { name: 'vertical', master: GalyleoPropertyLabel },
          { name: 'horizontal', master: GalyleoPropertyLabel },
          { name: 'spacing input', master: GalyleoNumberInput },
          { name: 'total padding input', master: GalyleoNumberInput }, {
            name: 'mini layout preview',
            master: GalyleoMiniLayoutPreview
          }
        ]
      },
      {
        name: 'wrap submorphs checkbox',
        submorphs: [{
          name: 'checkbox',
          fill: Color.rgb(245, 127, 23)
        }, {
          name: 'prop label',
          fontColor: Color.rgb(66, 73, 73)
        }]
      }]
  }, {
    name: 'alignment control',
    visible: true,
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
            submorphs: [{ name: 'interactive label', fontColor: Color.rgbHex('808080') }] 
          },
          {
            name: 'vertical alignment selector',
            master: GalyleoDropDown, 
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
            submorphs: [{ name: 'interactive label', fontColor: Color.rgbHex('808080') }] 
          },
          {
            name: 'vertical alignment selector',
            master: GalyleoDropDown, 
            submorphs: [{ name: 'interactive label', fontColor: Color.rgbHex('808080') }] 
          }
        ]
      }]
  }, {
    name: 'fill control',
    visible: true,
    viewModel: {
      placeholderImage
    },
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
        name: 'fill color input',
        master: GalyleoColorInput
      }, {
        name: 'image control',
        submorphs: [{
          name: 'image marker', fontColor: Color.rgbHex('424949')
        }, {
          name: 'image cell',
          submorphs: [{
            name: 'image container',
            imageUrl: placeholderImage
          }]
        }]
      }]
  }, {
    name: 'border control',
    visible: true,
    submorphs: [
      {
        name: 'h floater',
        submorphs: [
          {
            name: 'section headline',
            fontColor: Color.rgb(66, 73, 73) 
          },
          { name: 'add button', master: GalyleoAddButton }
        ]
      }, {
        name: 'elements wrapper',
        submorphs: [{
          name: 'border color input',
          master: GalyleoColorInput
        }, {
          name: 'border width control',
          submorphs: [{
            name: 'border width input',
            master: GalyleoNumberInput
          }, {
            name: 'border style selector',
            master: GalyleoDropDown,
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
  }, {
    name: 'effects control',
    visible: true,
    viewModel: {
      dynamicPropertyComponent: GalyleoDynamicProperty
    },
    submorphs: [
      {
        name: 'h floater',
        submorphs: [
          {
            name: 'section headline',
            fontColor: Color.rgb(66, 73, 73) 
          },
          { name: 'add button', master: GalyleoAddButton }
        ]
      }]
  }]
});

// ControlPanel.openInWorld()
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

// part(GalyleoSideBar).openInWorld()
const GalyleoSideBar = component({
  name: 'galyleo/side bar',
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
    borderWidth: { top: 0, left: 0, right: 0, bottom: 1 },
    borderColor: Color.rgb(128, 128, 128),
    clipMode: 'hidden',
    extent: pt(322.8, 32.7),
    fill: Color.rgba(0, 0, 0, 0),
    layout: new HorizontalLayout({
      align: 'top',
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
        name: 'charts tab',
        submorphs: [{
          name: 'tab label',
          textAndAttributes: ['Charts', null]
        }] 
      }),
      part(SideBarTab, {
        name: 'views tab',
        submorphs: [{
          name: 'tab label',
          textAndAttributes: ['Views', null]
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
      }], ['tables control', {
        height: 'fixed',
        width: 'fill'
      }], ['filters control', {
        height: 'fixed',
        width: 'fill'
      }]],
      wrapSubmorphs: false
    }),
    fill: Color.transparent,
    submorphs: [
      part(ControlPanel, {
        name: 'chart control',
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
        name: 'tables control',
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
        name: 'filters control',
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
        width: 'fixed'
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
        borderStyle: 'none',
        borderWidth: 0,
        extent: pt(242, 177),
        submorphs: [{
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
        }]
      },                
      {
        name: 'text control',
        borderStyle: 'solid',
        borderWidth: { top: 1, left: 0, right: 0, bottom: 1 },
        extent: pt(335.8, 264)
      }, {
        name: 'layout control',
        borderWidth: { top: 0, left: 0, right: 0, bottom: 1 },
        extent: pt(334.8, 133)
      }] 
  })]
});

export {
  GalyleoSideBar, GalyleoPropertiesPanel, SideBarTabSelected,
  GalyleoMiniLayoutPreview, GalyleoMiniLayoutPreviewActive, GalyleoDynamicProperty,
  GalyleoConstraintMarker, GalyleoConstraintMarkerActive, GalyleoConstraintsSimulator,
  GalyleoResizingSimulator, GalyleoConstraintSizeSelector, GalyleoLayoutFlap, ControlPanel
};
