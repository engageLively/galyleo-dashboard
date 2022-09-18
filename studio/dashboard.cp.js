import Immutable from 'https://jspm.dev/immutable@4.0.0-rc.12';
import 'https://www.gstatic.com/charts/loader.js';

import { Morph, morph, ShadowObject, TilingLayout } from 'lively.morphic';
import { component, ViewModel, without, part, add } from 'lively.morphic/components/core.js';
import { createMorphSnapshot } from 'lively.morphic/serialization.js';
import { resource } from 'lively.resources/src/helpers.js';
import { pt, Rectangle, Point, Color, rect } from 'lively.graphics/index.js';

import { LoadingIndicator } from 'lively.components';
import { obj, promise, arr, string } from 'lively.lang';
import { connect } from 'lively.bindings/index.js';
import { getClassName } from 'lively.serializer2/class-helper.js';
import { ExpressionSerializer } from 'lively.serializer2/index.js';
import { GalyleoWindow, GalyleoConfirmPrompt, PromptButton } from './shared.cp.js';
import { GalyleoSearch } from './inputs/search.cp.js';
import { NamedFilter, SelectFilter, BooleanFilter, DateFilter, DoubleSliderFilter, ListFilter, RangeFilter, SliderFilter } from './filters.cp.js';
import { ViewBuilder } from './view-creator.cp.js';
import { GoogleChartHolder } from './chart-creator.cp.js';

import { checkSpecValid, GalyleoDataManager } from '../galyleo-data/galyleo-data.js';

// import './jupiter-drive-resource.js';

class SaveDialogMorph extends Morph {
  /**
   * Initialize with the file path passed to dashboard
   * @param { Dashboard } dashboard - The dashboard that invoked this, and which will be called back
   * @param { string } path - The initial file path, if any, which is the initial value of the file input
   */
  init (dashboard, path) {
    this.dashboard = dashboard;
    if (path && path.length > 0) {
      this.getSubmorphNamed('fileInput').textString = path;
    }
  }

  /**
   * Save. This is called from the Save button. Just gets the path from
   * the text string, and calls the dashboard back to check it exists and saves it.
   * If everything worked, dashboard returns true; if not, it took care of
   * informing the user, and the dialog box stays up to give the user another
   * shot.
   */
  async save () {
    const filePath = this.getSubmorphNamed('fileInput').textString;
    if (await this.dashboard.checkAndSave(filePath)) {
      this.remove();
    }
  }
}

const SaveDialog = component(GalyleoWindow, {
  type: SaveDialogMorph,
  name: 'save dialog',
  layout: new TilingLayout({
    axis: 'column',
    axisAlign: 'center',
    orderByIndex: true,
    resizePolicies: [['window title', {
      height: 'fixed',
      width: 'fill'
    }]],
    spacing: 15,
    wrapSubmorphs: false
  }),
  extent: pt(340.5, 155.8),
  submorphs: [
    {
      name: 'window title',
      textString: 'Save Dashboard to...'
    },
    add(part(GalyleoSearch, { name: 'file input', placeholder: 'path/to/file' })),
    add({
      name: 'button wrapper',
      layout: new TilingLayout({
        align: 'center',
        axisAlign: 'center',
        justifySubmorphs: 'spaced',
        orderByIndex: true,
        padding: rect(26, 26, 0, 0)
      }),
      borderColor: Color.rgb(23, 160, 251),
      borderWidth: 0,
      extent: pt(310.9, 57.7),
      fill: Color.rgba(0, 0, 0, 0),
      submorphs: [part(PromptButton, {
        name: 'save button',
        extent: pt(81.7, 31.8),
        master: PromptButton,
        position: pt(9.6, 8.9),
        submorphs: [without('icon'), {
          name: 'label',
          textAndAttributes: ['Save', null]
        }]
      }), part(PromptButton, {
        name: 'cancel button',
        extent: pt(92.8, 34.2),
        master: PromptButton,
        position: pt(174.2, 44.5),
        submorphs: [without('icon'), {
          name: 'label',
          textAndAttributes: ['Cancel', null]
        }]
      })]
    })
  ]
});

class LoadDialogMorph extends Morph {
  /**
   * Initialize with the file path passed to dashboard
   * @param { object } dashboard - the dashboard that invoked this, and which will be called back
   * @param { string } path - the initial file path, if any, which is the initial value of the file input.
   */
  init (dashboard, path) {
    this.dashboard = dashboard;
    if (path && path.length > 0) {
      this.getSubmorphNamed('fileInput').textString = path;
    }
  }

  /**
   * Load. This is called from the Load button. Just gets the path from
   * the text string, and calls the dashboard back to check it and load it.
   * If everything worked, dashboard returns true; if not, it took care of
   * informing the user, and the dialog box stays up to give the user another
   * shot.
   */
  async load () {
    const filePath = this.getSubmorphNamed('fileInput').textString;
    if (await this.dashboard.checkAndLoad(filePath)) {
      this.remove();
    }
  }
}

// LoadDialog.openInWorld()
const LoadDialog = component(GalyleoWindow, {
  type: LoadDialogMorph,
  name: 'load dialog',
  layout: new TilingLayout({
    axis: 'column',
    axisAlign: 'center',
    orderByIndex: true,
    resizePolicies: [['window title', {
      height: 'fixed',
      width: 'fill'
    }]],
    spacing: 15,
    wrapSubmorphs: false
  }),
  extent: pt(340.5, 155.8),
  submorphs: [
    {
      name: 'window title',
      textString: 'Load Dashboard from...'
    },
    add(part(GalyleoSearch, { name: 'file input', placeholder: 'path/to/file' })),
    add({
      name: 'button wrapper',
      layout: new TilingLayout({
        align: 'center',
        axisAlign: 'center',
        justifySubmorphs: 'spaced',
        orderByIndex: true,
        padding: rect(26, 26, 0, 0)
      }),
      borderColor: Color.rgb(23, 160, 251),
      borderWidth: 0,
      extent: pt(310.9, 57.7),
      fill: Color.rgba(0, 0, 0, 0),
      submorphs: [part(PromptButton, {
        name: 'load button',
        extent: pt(81.7, 31.8),
        master: PromptButton,
        position: pt(9.6, 8.9),
        submorphs: [without('icon'), {
          name: 'label',
          textAndAttributes: ['Load', null]
        }]
      }), part(PromptButton, {
        name: 'cancel button',
        extent: pt(92.8, 34.2),
        master: PromptButton,
        position: pt(174.2, 44.5),
        submorphs: [without('icon'), {
          name: 'label',
          textAndAttributes: ['Cancel', null]
        }]
      })]
    })
  ]
});

export class Dashboard extends ViewModel {
  /**
   * Properties.
   * 1. Tables: a dictionary of the tables for this dashboard.  Each table
   *    is a Google Data Table.  See:
   *  https://developers.google.com/chart/interactive/docs/reference#DataTable
   * 2. filters.  A dictionary of filters for this dashboard.  Each filter is
   *   a morph of class NamedFilter.  The name of the Morph on the dashboard
   *   is the same as its name in this dictionar
   * 3. Charts.  A chart is an object of the form:
   *    a. chartMorph: the instance of googleChartMorph which holds the
   *        actual Chart.  The morph is a submorph of this, and the name of the
   *        morph is the name of the chart.
   *    b. chartType: a valid Google Chart type
   *    c. options: options to apply to the chart when rendered.  These are from
   *       the options for the chart, as specified in:
   *  https://developers.google.com/chart/interactive/docs/customizing_charts
   *    d. viewName: the name of the table or view with the data this chart is
   *        showing.  It must be one of the keys in this.tables or this.views
   *  4. gViz: just a handle for the Google Visualization library.
   *  5. gCharts: a handle for the Google Charts Library.  Rarely used.
   *  6. l2lRoomName: a lively2lively room name for communicating with the
   *     JupyterNotebook. This is hardcoded for now; should be set with an input
   *     widget.
   */

  static get properties () {
    return {
      dataManager: { defaultValue: null, serialize: false },
      filters: { defaultValue: null },
      charts: { defaultValue: null },
      canvas: { // improve the naming to prevent confusion with views
        get () {
          return this.view;
        }
      },
      gViz: {
        derived: true,
        get () {
          return window.google.visualization;
        }
      },
      gCharts: {
        derived: true,
        get () {
          return window.google.charts;
        }
      },
      expose: {
        get () {
          return [
            'clear', 'checkAndLoad', 'checkPossibleRenameFromBrowser',
            'checkPossibleRename', 'dependencyGraph', 'testDashboards',
            'loadTestDashboard', 'loadDashboardFromFile', 'checkAndSave',
            'saveDashboardToFile', 'prepareJSONForm', 'getColumnsOfType',
            'openDialog', 'confirm', 'isDirty', 'clearSnapshots', 'commands', 'init',
            'tables', 'addTable', 'tableNames', 'views', 'viewNames', 'update',
            'addView', 'createViewEditor', 'filters', 'addFilter', 'removeFilter', 'filterNames',
            'charts', 'chartNames', 'addChart', 'editChartStyle', 'removeChart', 'createExternalFilter',
            'relayout'

          ];
        }
      },
      bindings: {
        get () {
          return [
            { signal: 'onSubmorphChange', handler: 'onSubmorphChange' },
            { signal: 'onDrag', handler: 'onDrag', override: true },
            { signal: 'addMorph', handler: 'setContext' },
            { signal: 'removeMorph', handler: 'clearSideBarFocus' }
          ];
        }
      }
    };
  }

  get tables () {
    return this.dataManager ? this.dataManager.tables : {};
  }

  get views () {
    return this.dataManager ? this.dataManager.views : {};
  }

  get dependencyGraph () {
    const result = {
      charts: {}, views: {}
    };
    Object.keys(this.charts).forEach(chartName => {
      result.charts[chartName] = this.charts[chartName].viewOrTable;
    });
    Object.keys(this.views).forEach(viewName => {
      result.views[viewName] = {
        filters: this.views[viewName].filterNames,
        table: this.views[viewName].table
      };
    });
    return result;
  }

  /* --- Code to deal with the top bar on the studio --- */

  _ensureUserAvatar () {
    const avatar = this.get('user avatar');
    if (!avatar) return;
    const user = $world.getCurrentUser();
    avatar.imageUrl = resource('https://s.gravatar.com/avatar').join(string.md5(user.email || '')).withQuery({ s: 160 }).url;
  }

  // Update the file name in the top bar with the current file path.  This
  // is called whenever the name changes and on initialization
  _updateProjectName_ () {
    const titleBar = this.get('title bar');
    let projectName = 'No Current Project';
    if (window.EXTENSION_INFO && window.EXTENSION_INFO.currentFilePath) {
      projectName = window.EXTENSION_INFO.currentFilePath;
    }
    if (titleBar) { titleBar.getSubmorphNamed('projectName').textString = projectName; }
  }

  /* -- Code to deal with JupyterLab and the extension.  This has to do with
        detecting changes made to the storage system by JupyterLab services,
        and ensuring consistency with those -- */

  // Initialize JupyterLab callbacks.  This is called from onLoad() and is used
  // to reliably register events with JupyterLab components.  Why this is easier
  // here than in JupyterLab is a good question, but the fact is, it is!
  // Leave a dirty bit in window.EXTENSION_INFO.callbackRegistered.  There's no
  // convenient way to check the callbacks on a signal in JupyteLab -- at least,
  // none I have found -- so leave our own and don't register this callback if the
  // dirty bit is set.
  // parameters:
  //   none

  _initializeJupyterLabCallbacks_ () {
    const jupyterObject = window.EXTENSION_INFO;
    if (jupyterObject && !jupyterObject.callbackRegistered) {
      window.EXTENSION_INFO.callbackRegistered = jupyterObject.browserModel.fileChanged.connect((model, args) => {
      // for debugging, delete later
        console.log(`File renamed in browser: ${JSON.stringify(args)}`);
        this.checkPossibleRenameFromBrowser(model, args);
      }, this);
    }
  }

  // check to see if the file we're working on has been moved or renamed
  // This is called from the extension code, so the extension info variable
  // exists and the current path is in the currentFilePath variable.  Just make
  // sure that the path we have reflects the current state of the file browser.
  // This could have been done in the extension code, but doing it here gives us
  //  more insight into what is going on. In any case, do nothing if our current
  //  file is unaffected, change the currentFilePath if it is affected
  // parameters:
  //    browserModel: the JupyterLab browser.  See: https://jupyterlab.readthedocs.io/en/stable/api/classes/filebrowser.filebrowsermodel-1.html
  //    changedInfo: the current change to the drive.  See https://jupyterlab.readthedocs.io/en/stable/api/interfaces/coreutils.ichangedargs.html
  checkPossibleRenameFromBrowser (browserModel, changedArgs) {
    if (changedArgs.oldValue.path === window.EXTENSION_INFO.currentFilePath) {
      window.EXTENSION_INFO.currentFilePath = changedArgs.newValue.path;
      this._updateProjectName_();
    }
  }

  // check to see if the file we're working on has been moved or renamed
  // This is called from the extension code, so the extension info variable
  // exists and the current path is in the currentFilePath variable.  Just make
  // sure that the path we have reflects the current state of the drive.  This could
  // have been done in the extension code, but doing it here gives us more insight
  // into what is going on. In any case, do nothing if our current file is unaffected,
  // change the currentFilePath if it is affected
  // parameters:
  //    drive: the JupyterLab drive.  See: https://jupyterlab.readthedocs.io/en/stable/api/classes/services.drive-1.html
  //    changedInfo: the current change to the drive.  See https://jupyterlab.readthedocs.io/en/stable/api/interfaces/services.contents.ichangedargs.html
  checkPossibleRename (drive, changedInfo) {
    if (changedInfo.type !== 'rename') {
      return;
    }
    if (changedInfo.oldValue.path === window.EXTENSIONINFO.currentFilePath) {
      window.EXTENSION_INFO.currentFilePath = changedInfo.newValue.path;
      this._updateProjectName_();
    }
  }

  /* -- Code which clears, stores, and loads dashboards from file -- */

  // Clear the dashboard of all charts, views, tables, and filters.  This
  // is used in new, and also internally by restoreFromJSONForm.
  clear () {
    if (this.dataManager) {
      this.dataManager.clear();
    } else {
      this.dataManager = new GalyleoDataManager();
    }
    this.filterNames.forEach(filterName => {
      this.filters[filterName].morph.remove();
    });
    this.fill = Color.rgb(255, 255, 255);
    this.filters = {};
    this.chartNames.forEach(chartName => {
      this.charts[chartName].chartMorph.remove();
    });
    this.charts = {};
    this.defaultFilters = {};
    this.view.removeAllMorphs();
    this.dirty = false;
    if (this.dashboardController) {
      this.dashboardController.update();
    }
  }

  /* -- Snapshotting and serialization code -- */

  // prepare the properties as a JSON document.  This is to support
  // load/save/save as and persist the tables.  Just involves the JSON of
  // each object in tables/filters/views/charts, save that we don't serialize the
  // morphs for filters and charts, just the type (in the case of the chart, the
  // options), extent, and postion of each morph.

  prepareJSONForm () {
    return JSON.stringify(this._prepareSerialization_());
  }

  clearSideBarFocus () {
    this.dashboardController.viewModel.models.styleControl.clearFocus();
  }

  viewDidLoad () {
    this.setContext(this.view);
  }

  onSubmorphChange (change, submorph) {
    // only do this if one of the registered morphs has changed
    // we shoot ourselves in the knee by dropping other stuff onto
    // here
    if (!this._restore && change.prop === 'position') {
      this._takeSnapshot();
    }
  }

  onDrag (evt) { /* prevent default */ }

  get commands () {
    return [
      {
        name: 'undo',
        exec: () => {
          this._undoChange();
        }
      },
      {
        name: 'redo',
        exec: () => {
          this._redoChange();
        }
      }
    ];
  }

  get dependencyGraph () {
    const result = {
      charts: {}, views: {}
    };
    Object.keys(this.charts).forEach(chartName => {
      result.charts[chartName] = this.charts[chartName].viewOrTable;
    });
    Object.keys(this.views).forEach(viewName => {
      result.views[viewName] = {
        filters: this.views[viewName].filterNames,
        table: this.views[viewName].table
      };
    });
    return result;
  }

  /**
   * Update the file name in the top bar with the current file path.
   * This is called whenever the name changes and on initialization
   */
  _updateProjectName (path) {
    window.EXTENSION_INFO.currentFilePath = path;
  }

  /* -- Code to deal with JupyterLab and the extension.  This has to do with
        detecting changes made to the storage system by JupyterLab services,
        and ensuring consistency with those -- */

  /**
   * Initialize JupyterLab callbacks.  This is called from onLoad() and is used
   * to reliably register events with JupyterLab components.  Why this is easier
   * here than in JupyterLab is a good question, but the fact is, it is!
   * Leave a dirty bit in window.EXTENSION_INFO.callbackRegistered.  There's no
   * convenient way to check the callbacks on a signal in JupyteLab -- at least,
   * none I have found -- so leave our own and don't register this callback if the
   * dirty bit is set.
   */
  _initializeJupyterLabCallbacks () {
    const jupyterObject = window.EXTENSION_INFO;
    if (jupyterObject && !jupyterObject.callbackRegistered) {
      window.EXTENSION_INFO.callbackRegistered = jupyterObject.browserModel.fileChanged.connect((model, args) => {
      // for debugging, delete later
        console.log(`File renamed in browser: ${JSON.stringify(args)}`);
        this.checkPossibleRenameFromBrowser(model, args);
      }, this);
    }
  }

  /**
   * check to see if the file we're working on has been moved or renamed
   * This is called from the extension code, so the extension info variable
   * exists and the current path is in the currentFilePath variable.  Just make
   * sure that the path we have reflects the current state of the file browser.
   * This could have been done in the extension code, but doing it here gives us
   *  more insight into what is going on. In any case, do nothing if our current
   *  file is unaffected, change the currentFilePath if it is affected
   * @param { object } browserModel - The JupyterLab browser.  See: https://jupyterlab.readthedocs.io/en/stable/api/classes/filebrowser.filebrowsermodel-1.html
   * @param { object } changedArgs - The current change to the drive.  See https://jupyterlab.readthedocs.io/en/stable/api/interfaces/coreutils.ichangedargs.html
   */
  checkPossibleRenameFromBrowser (browserModel, changedArgs) {
    if (changedArgs.oldValue.path === window.EXTENSION_INFO.currentFilePath) {
      this._updateProjectName(changedArgs.newValue.path);
    }
  }

  /**
   * check to see if the file we're working on has been moved or renamed
   * This is called from the extension code, so the extension info variable
   * exists and the current path is in the currentFilePath variable.  Just make
   * sure that the path we have reflects the current state of the drive.  This could
   * have been done in the extension code, but doing it here gives us more insight
   * into what is going on. In any case, do nothing if our current file is unaffected,
   * change the currentFilePath if it is affected
   * @param { object } drive - The JupyterLab drive.  See: https://jupyterlab.readthedocs.io/en/stable/api/classes/services.drive-1.html
   * @param { object } changedInfo - The current change to the drive.  See https://jupyterlab.readthedocs.io/en/stable/api/interfaces/services.contents.ichangedargs.html
   */
  checkPossibleRename (drive, changedInfo) {
    if (changedInfo.type !== 'rename') {
      return;
    }
    if (changedInfo.oldValue.path === window.EXTENSIONINFO.currentFilePath) {
      this._updateProjectName(changedInfo.newValue.path);
    }
  }

  /* -- Code which clears, stores, and loads dashboards from file -- */

  /**
   * Load all the test dashboards.
   */
  async _loadAllTestDashboards () {
    const prefix = 'https://raw.githubusercontent.com/engageLively/galyleo-test-dashboards/main';
    const url = `${prefix}/manifest.json`;
    const jsonForm = await resource(url).readJson();
    this._testDashboards = jsonForm.dashboards;
  }

  /**
   * The current set of test dashboards.  To load a test,
   * this.loadDashboardFromURL(this.testDashboards.name)
   * It's an object, and needs to be maintained as the test
   */
  get testDashboards () {
    // _loadAllTestDashboards() should be called before this is accessed
    /* const dashboards = ['bad-fill',
      'bad-text-padding-and-attributes',
      'bad-text-parameters',
      'elections-remote',
      'filter-test',
      'morphsample',
      'mtbf_mttr_dashboard',
      'drilldown-test',
      'simple_test_table',
      'test_one',
      'test_views',
      'testempty',
      'testsolid']; */
    if (this._testDashboards) {
      const result = {};
      const prefix = 'https://raw.githubusercontent.com/engageLively/galyleo-test-dashboards/main';
      this._testDashboards.forEach(name => result[name] = `${prefix}/${name}.gd.json`);
      return result;
    } else {
      return {};
    }
  }

  /**
   * Convenience method to load a test dashboard easily by name
   * @param { string } dashboardName - The name of the test dashboard.
   */
  // this.loadTestDashboard('drilldown-test')
  async loadTestDashboard (dashboardName) {
    if (!this._testDashboards) {
      await this._loadAllTestDashboards();
    }

    const dashboardUrl = this.testDashboards[dashboardName];
    if (dashboardUrl) { this.loadDashboardFromURL(dashboardUrl); }
  }

  /**
   * Load a dashboard from an URL.  Uses checkAndLoad to do the actual work.
   * This is primarily to support testing -- test dashboards have URLs.  ATM,
   * no parameters or options aside from the URL; if there are other use cases
   * these can be added later.
   * @param { string } anURL - The URL to load from.
   */
  async loadDashboardFromURL (anURL = 'https://raw.githubusercontent.com/engageLively/galyleo-test-dashboards/main/mtbf_mttr_dashboard.gd.json') {
    try {
      const jsonForm = await resource(anURL).readJson();
      const check = this.checkIntermediateForm(jsonForm);
      if (check.valid) {
        await this._restoreFromSaved(jsonForm);
      } else {
        $world.alert(check.message);
      }
    } catch (error) {
      $world.alert(`Error loading from ${anURL}`);
    }
  }

  /* -- Snapshotting and serialization code -- */

  /**
   * Prepare the properties as a JSON document.  This is to support
   * load/save/save as and persist the tables.  Just involves the JSON of
   * each object in tables/filters/views/charts, save that we don't serialize the
   * morphs for filters and charts, just the type (in the case of the chart, the
   * options), extent, and postion of each morph.
   */
  prepareJSONForm () {
    return JSON.stringify(this._prepareSerialization());
  }

  openDialog (componentObject) {
    const dialog = part(componentObject);
    dialog.openInWorld();
    dialog.center = this.view.globalBounds().center();
    return dialog;
  }

  async confirm (ask) {
    const confirmDialog = this.openDialog(GalyleoConfirmPrompt);
    confirmDialog.label = ask;
    return await confirmDialog.activate();
  }

  // async revertToPrevSnapshot () {
  //   this._restore = true;
  //   // _restoreFromSaved is too expensive. Do smart restoration instead
  //   await this._restoreFromSaved(this._snapshots.pop().toJS());
  //   this._restore = false;
  // }

  isDirty () {
    return this._snapshots.length > 0;
  }

  clearSnapshots () {
    this._snapshots = [];
    this._changePointer = 0;
  }

  /**
   * Convert a random morph into a declarative description suitable for storing it inside a dashboard file
   * @param { Morph } aMorph - The morph to derive the description from.
   * @returns { object }
   */
  _morphSnapshot (aMorph) {
    const type = getClassName(aMorph);
    const storedForm = {
      type: type,
      position: aMorph.position,
      extent: aMorph.extent,
      name: aMorph.name,
      morphIndex: this.canvas.submorphs.indexOf(aMorph),
      morphicProperties: this._getFields(aMorph, this._morphicFields),
      complexMorphicProperties: this._complexMorphicFields(aMorph)
    };
    if (type === 'Text') {
      storedForm.textProperties = this._getFields(aMorph, this._textFields);
      storedForm.complexTextProperties = this._complexTextFields(aMorph);
    } else if (type === 'Image') {
      storedForm.imageUrl = aMorph.imageUrl;
    }
    return storedForm;
  }

  /**
   * Returns a dashboard file structure for the current configuration of the dashboard.
   */
  _takeSnapshot () {
    const { canvas } = this;

    if (!this._snapshots) this._snapshots = [];

    if (typeof this._changePointer === 'undefined') {
      this._changePointer = Math.max(0, this._snapshots.length - 1);
    }

    // discard rest of snapshots if change pointer set back previously
    this._snapshots = this._snapshots.slice(0, this._changePointer + 1);
    const allMorphs = canvas.submorphs.filter(morph => !(morph.isFilter || morph.isChart));

    // inititalize the snapshot, or retrieve the last one we stored
    const snap = arr.last(this._snapshots) || Immutable.fromJS(this._prepareSerialization());
    // derive the updated snapshot, making use of immutable.js datastructures for minimum memory impact
    const newSnap = snap.updateIn(['tables'], tables =>
      this.tableNames.reduce(
        (tables, tableName) =>
          tables.set(tableName, this.tables[tableName]), // treat tables as values
        tables)
    ).updateIn(['views'], views =>
      this.viewNames.reduce(
        (views, viewName) =>
          views.set(viewName, this.views[viewName]), // viewNames are strings, and therefore values
        views)
    ).updateIn(['charts'], charts =>
      this.chartNames.reduce((charts, chartName) => {
        const chart = this.charts[chartName];
        const morph = chart.chartMorph;
        // perform a merge instead to reuse data
        return charts.updateIn([chartName], Immutable.Map(), current => current.mergeDeep({
          chartType: chart.chartType,
          options: chart.options,
          viewOrTable: chart.viewOrTable,
          name: chartName,
          position: morph.position,
          extent: morph.extent,
          morphIndex: canvas.submorphs.indexOf(morph),
          morphicProperties: this._getFields(morph, this._morphicFields),
          complexMorphicProperties: this._complexMorphicFields(morph)
        }));
      }, charts)
    ).updateIn(['filters'], filters =>
      this.filterNames.reduce((filters, filterName) => {
        const externalMorph = this.filters[filterName].morph;
        // perform a dmerge instead to reuse data
        return filters.updateIn([filterName], Immutable.Map(), current => current.mergeDeep({
          position: externalMorph.position,
          extent: externalMorph.extent,
          name: filterName,
          savedForm: externalMorph.filterMorph.persistentForm,
          morphIndex: canvas.submorphs.indexOf(externalMorph),
          morphicProperties: this._getFields(externalMorph, this._morphicFields),
          complexMorphicProperties: this._complexMorphicFields(morph)
        }));
      }, filters)
    ).updateIn(['morphs'], morphs =>
      allMorphs.reduce((morphs, aMorph) => {
        return morphs.updateIn([aMorph.name], Immutable.Map(), current => current.mergeDeep(this._morphSnapshot(aMorph)));
      }, morphs)
    );
    newSnap.set('numMorphs', canvas.submorphs.length);
    this._snapshots.push(newSnap); // this returned snap reuses a bulk of the existing stored date, so it only contributes what has actually changed to the total memory expended in the system.
    this._changePointer = this._snapshots.length - 1;

    const { dashboardFilePath } = canvas.owner.viewModel; // fixme
    window.parent.postMessage({ method: 'galyleo:setDirty', dirty: true, dashboardFilePath }, '*');
  }

  /**
   * Get a field from an object, making sure it's valid, and returning the default if it isn't.
   * @param { object } source - The source object containing the field
   * @param { { name: string, valid: boolean, default: * } } field
   */
  _getFieldValue (source, field) {
    const value = source[field.name];
    return field.validCheck(value) ? value : field.default;
  }

  /**
   * Get fields from an object.  This is a utility used by _prepareSerialization_
   * to pull out morphic and text properties.  The return type is used for assignment if it's valid.
   * @param { object } object - Object to pull the values from
   * @param { object[] } fields - Fields to pull from the object. These will be in the form {name, validCheck, default}
   */
  _getFields (object, fields) {
    const result = {};
    fields.forEach(field => result[field.name] = this._getFieldValue(object, field));
    return result;
  }

  /**
   * The simple fields to pull from a morph/put into a morph.  These are rotation, scale, clipMode, and opacity.  clipMode
   * must be one of 'hidden', 'visible', 'auto', 'scroll', the other three are numbers.  scale must be positive
   * and opacity in [0,1]
   * @returns { {name: string, validCheck: boolean, defaultValue: string }[] }
   */
  get _morphicFields () {
    const clipModes = ['hidden', 'visible', 'auto', 'scroll'];
    return [
      { name: 'rotation', validCheck: rotation => !isNaN(rotation), default: 0 },
      { name: 'scale', validCheck: scale => !isNaN(scale) && scale > 0, default: 1 },
      { name: 'clipMode', validCheck: mode => clipModes.indexOf(mode) >= 0, default: 'visible' },
      { name: 'opacity', validCheck: opacity => !isNaN(opacity) && opacity >= 0 && opacity <= 1, default: 1 }
    ];
  }

  /**
   * The simple fields to pull from/put into a textMorph.  fixedHeight and fixedWidth must be booleans, The various
   * enums (fontStyle, fontWeight, lineWrapping, textAlign, textDecoration) have their values taken from the
   * inspector menus for those properties.  Size must be a positive number, and fontFamily and textString are strings.
   * @returns { {name: string, validCheck: boolean, defaultValue: string }[] }
   */
  get _textFields () {
    const styles = ['normal', 'italic', 'oblique'];
    const weights = ['normal', 'bold', 'bolder', 'light', 'lighter'];
    const aligns = ['center', 'justify', 'left', 'right'];
    const wrapping = [false, true, 'by-words', 'anywhere', 'only-by-words', 'wider', 'by-chars', 'false', 'true'];
    const decorations = ['none', 'underline'];
    return [
      { name: 'fixedHeight', validCheck: value => typeof value === 'boolean', default: false },
      { name: 'fixedWidth', validCheck: value => typeof value === 'boolean', default: false },
      { name: 'fontFamily', validCheck: family => typeof family === 'string', default: 'Sans-serif' }, // need a better check here
      { name: 'fontSize', validCheck: fontSize => !isNaN(fontSize) && fontSize > 0, default: 11 },
      { name: 'fontStyle', validCheck: style => styles.indexOf(style) >= 0, default: 'normal' },
      { name: 'fontWeight', validCheck: weight => weights.indexOf(weight) >= 0, default: 'normal' },
      { name: 'lineWrapping', validCheck: wrap => wrapping.indexOf(wrap) >= 0, default: false }, // is there any harm in setting this?
      { name: 'textAlign', validCheck: align => aligns.indexOf(align) >= 0, default: 'left' }, // is there any harm in setting this?  It can be 'Not set' but I am not sure how to capture this
      { name: 'textDecoration', validCheck: decoration => decorations.indexOf(decoration) >= 0, default: 'none' },
      { name: 'textString', validCheck: str => true, default: '' } // this one needs to be checked
    ];
  }

  /**
   * Get the morphic fields that must be set by function rather than
   * simply assigned.  This includes position, extent, fill, and border.
   * @param { Morph } aMorph - The morph to get the fields from.
   */
  _complexMorphicFields (aMorph) {
    const shadow = aMorph.dropShadow ? aMorph.dropShadow.toJson() : null;
    const result = {
      position: aMorph.position,
      extent: aMorph.extent,
      fill: aMorph.fill ? aMorph.fill.toJSExpr() : null,
      border: aMorph.border,
      origin: aMorph.origin
    };
    if (shadow) {
      result.dropShadow = shadow;
    }
    return result;
  }

  /**
   * Get the text fields that must be set by function rather than
   * simply assigned.  This includes fontColor and padding
   * @param { Morph } aMorph - The morph to get the fields from.
   */
  _complexTextFields (aMorph) {
    return {
      fontColor: aMorph.fontColor,
      padding: aMorph.padding,
      textAndAttributes: aMorph.textAndAttributes
    };
  }

  /**
   * Prepare the properties as a JSON document. This is to support
   * load/save/save as and persist the tables. Just involves the JSON of
   * each object in tables/filters/views/charts, save that we don't serialize the
   * morphs for filters and charts, just the type (in the case of the chart, the
   * options), extent, and postion of each morph.
   */
  _prepareSerialization () {
    const { canvas } = this;
    const resultObject = {
      fill: canvas.fill ? canvas.fill.toJSExpr() : null,
      tables: {},
      views: {},
      charts: {},
      filters: {},
      morphs: {}
    };

    this.tableNames.forEach(tableName => resultObject.tables[tableName] = this.tables[tableName].toDictionary());
    this.viewNames.forEach(viewName => resultObject.views[viewName] = this.views[viewName].toDictionary());
    this.chartNames.forEach(chartName => {
      const chart = this.charts[chartName];
      const morph = chart.chartMorph;
      const result = {
        chartType: chart.chartType,
        options: chart.options,
        viewOrTable: chart.viewOrTable,
        morphIndex: canvas.submorphs.indexOf(morph),
        // complexMorphicProperties: this._complexMorphicFields(morph),
        morphicProperties: this._getFields(morph, this._morphicFields)
      };
      Object.assign(result.morphicProperties, this._complexMorphicFields(morph));
      resultObject.charts[chartName] = result;
    });
    this.filterNames.forEach(filterName => {
      const externalMorph = this.filters[filterName].morph;
      const result = {
        savedForm: externalMorph.filterMorph.persistentForm,
        morphIndex: canvas.submorphs.indexOf(externalMorph),
        // complexMorphicProperties: this._complexMorphicFields(externalMorph),
        morphicProperties: this._getFields(externalMorph, this._morphicFields)
      };
      Object.assign(result.morphicProperties, this._complexMorphicFields(externalMorph));
      resultObject.filters[filterName] = result;
    });
    // save the text, rectangle, etc morphs
    resultObject.morphs = canvas.submorphs.map(morph => {
      if (morph.isChart || morph.isFilter) {
        return null; // already taken care of these
      }
      const result = {
        type: getClassName(morph),
        name: morph.name,
        morphIndex: canvas.submorphs.indexOf(morph),
        morphicProperties: this._getFields(morph, this._morphicFields)
        // complexMorphicProperties: this._complexMorphicFields(morph)
      };
      Object.assign(result.morphicProperties, this._complexMorphicFields(morph));
      if (result.type === 'Image') {
        result.imageUrl = morph.imageUrl;
      }
      if (result.type === 'Text') {
        // result.complexTextProperties = this._complexTextFields(morph);
        result.textProperties = this._getFields(morph, this._textFields);
        Object.assign(result.textProperties, this._complexTextFields(morph));
      }
      return result;
    }).filter(morph => morph);
    resultObject.numMorphs = canvas.submorphs.length;
    return resultObject;
  }

  /**
   * Make sure a JSON form is OK.  This parses a JSON string into an object and
   * uses checkIntermediateForm to see that the parsed object is OK
   * @param { sring } string - The json string to be checked.
   */
  checkJSONForm (string) {
    const dashboardObject = JSON.parse(string);
    return this.checkIntermediateForm(dashboardObject);
  }

  /**
   * Make sure a JSON form is OK.  This makes sure the parsed object
   * has Tables, Views, Filters, and Charts and no extraneous fields
   * Returns {valid: true/false, message: <explanatory message if false}.
   * Primarily designed for the various load routines
   * @param { object } dashboardObject
   */
  checkIntermediateForm (dashboardObject) {
    // dashboardObject = await resource(this.testDashboards['testempty']).readJson()
    if (typeof dashboardObject !== 'object') {
      return { result: false, message: 'Parsed JSON was not an Object' };
    }
    const fields = Object.keys(dashboardObject);
    const expectedFields = ['tables', 'views', 'filters', 'charts'];
    const optionalFields = ['fill', 'morphs', 'numMorphs'];
    const missingFields = expectedFields.filter(field => fields.indexOf(field) < 0);
    const allFields = expectedFields.concat(optionalFields);
    const newFields = fields.filter(field => allFields.indexOf(field) < 0);
    if (missingFields.length === 0 && newFields.length === 0) {
      return { valid: true };
    } else {
      const missingMessage = `was missing fields ${missingFields}`;
      const unexpectedMessage = `had unexpected fields ${newFields}`;
      const message = missingFields.length === 0 ? `File ${unexpectedMessage}` : newFields.length === 0 ? `File ${missingMessage}` : `File ${missingMessage} and ${unexpectedMessage}`;
      return { valid: false, message: message };
    }
  }

  /**
   * Reorder morphs to mirror their stored order, in the parameter orderedMorphs.  This is so morphs on the
   * dashboard retain their z-index (effectively, their morph order)
   * @param { Morph[] } orderedMorphs - The morphs in their desired order.
   */
  _reorderMorphs (orderedMorphs) {
    if (orderedMorphs === null) {
      return;
    }
    const nonNulls = orderedMorphs.filter(morph => morph);
    // make sure there are no submorphs we missed, and remove all the submorphs we have
    this.canvas.submorphs.forEach(m => {
      if (nonNulls.indexOf(m) < 0) {
        nonNulls.push(m);
      }
      m.remove();
    });
    // add all the submorphs back, in the right order
    nonNulls.forEach(m => {
      this.view.addMorph(m);
    });
  }

  /**
   * A helper routine for _restoreFromSnapshot_ to turn charts, filters, and
   * morphs into an array of descriptors, suitable for restoration by
   * _restoreMorphsFromSaved_.  Broken out for legibility and debugging.
   * @param { object } snapObject - a snapshot turned into an object.
   * @returns { object[] } An array of the form {type: 'chart' | 'filter' | 'morph', descriptor: <descriptor>, name: [string]} if type is chart or filter there is also a name field.
   */
  _getObjectsFromSnapshot (snapObject) {
    const descriptors = [];

    const savedFilters = snapObject.filters.toObject();
    Object.keys(savedFilters).forEach(name => {
      descriptors.push({ type: 'filter', name: name, descriptor: savedFilters[name] });
    });
    const savedCharts = snapObject.charts.toObject();
    Object.keys(savedCharts).forEach(name => {
      descriptors.push({ type: 'chart', name: name, descriptor: savedCharts[name] });
    });
    const savedMorphs = snapObject.morphs.toJS();
    savedMorphs.forEach(savedMorph => {
      descriptors.push({ type: 'morph', descriptor: savedMorph });
    });
    return descriptors;
  }

  /**
   * Restore the saved form from a snapshot (see _takeSnapshot).  This is experimental code ATM.
   * Looks very similar to _restoreFromSaved_, and in fact the principal difference is that the
   * get from the stored form in this case is a call to .toObject() (see Immutable.js) instead of
   * directly accessing the stored form in _restoreFromSaved_.  The heavy lifting is done by
   * two helper routines, _restoreFilterFromSaved_ and _restoreChartFromSaved_, which are also called
   * for the same purpose from _restoreFromSaved_
   * @param { object } snapshot - an element of this._snapshots
   */
  async _restoreFromSnapshot (snapshot) {
    if (this._restore) {
      return;
    }
    this._restore = true;
    try {
      this.clear();
      const snapObject = snapshot.toObject();

      this.dataManager.tables = snapObject.tables.toObject();
      this.dataManager.views = snapObject.views.toObject();
      const descriptors = this._getObjectsFromSnapshot_(snapObject);
      await this._restoreMorphsFromDescriptors(descriptors);
      this.dashboardController.update();
    } catch (e) {
      console.log(`Error in _restoreFromSnapshot_ :${e}`);
    }
    this._restore = false;
  }

  /**
   * This sets back the change history pointer by one and restores the
   * snapshot at that position.
   */
  _undoChange () {
    if (!this._snapshots || this._snapshots.length === 0) return;
    this._changePointer = Math.max(0, this._changePointer - 1);
    this._restoreFromSnapshot(this._snapshots[this._changePointer]);
  }

  /**
   * This increases the change history pointer by one and restores the
   * snapshot at that position.
   */
  _redoChange () {
    if (!this._snapshots || this._snapshots.length === 0) return;
    this._changePointer = Math.min(this._snapshots.length - 1, this._changePointer + 1);
    this._restoreFromSnapshot(this._snapshots[this._changePointer]);
  }

  /**
   * A little utility to turn an RGBA struct (four fields, r, g, b, a, each
   * in the range [0,1]) into a Color, since Color.rgba requires r, g, b
   * to be in the range [0,255]
   * @param { Color } rgba - structure containing the color specification
   * @param { Color } [defaultColor] - he color to use in case of error, including null
   */
  _color (rgba, defaultColor = Color.white) {
    try {
      if (obj.isString(rgba)) {
        return new ExpressionSerializer().deserializeExprObj({
          __expr__: rgba,
          bindings: {
            'lively.graphics': ['Color', 'RadialGradient', 'LinearGradient', 'pt', 'rect']
          }
        });
      }
      return Color.rgba(rgba.r * 255, rgba.g * 255, rgba.b * 255, rgba.a);
    } catch (error) {
      return defaultColor;
    }
  }

  /**
   * Return a point, which is either the first argument if it's valid or
   * the default, which is not checked and must be valid.  Called from
   * _setComplexFields_
   * @param { {x: number, y: number}} literal - The literal which should be a valid input to Point.fromLiteral
   * @param { Point } defaultVal - Point to return in case it isn't'
   * @param { Point } The valid point from literal, or default if it doesn't work
   */
  _returnValidPoint (literal, defaultVal) {
    if (literal) {
      try {
        return Point.fromLiteral(literal);
      } catch (error) {
        return defaultVal;
      }
    } else {
      return defaultVal;
    }
  }

  /**
   * Return a valid number of at least value min (the numbers we're interested in
   * don't have an upper bound), returning defaultVal if the number is a NaN or
   * too small.  If min is NaN, not checked.
   * @param { number } number - the literal which should be a valid input to Point.fromLiteral
   * @param { Point } defaultVal - point to return in case it isn't
   * @param { number } [minVal] - if supplied, number must be greater than minVal
   * @returns { number } The number if it means the constraints, or defaultVal if not
   */
  _returnValidNumber (number, defaultVal, minVal = null) {
    if (isNaN(number)) {
      return defaultVal;
    }
    if (isNaN(minVal)) {
      return number;
    }
    return number >= minVal ? number : defaultVal;
  }

  /**
   * Set the complexMorphicFields of a morph: these are recorded as
   * static data but must be restored through function calls
   * @param { Morph } aMorph - The morph to restore
   * @param { object } fieldDescriptor - Descriptor containing the value of the morphic properties
   */
  _setComplexFields (aMorph, fieldDescriptor) {
    const { canvas } = this;
    aMorph.position = this._returnValidPoint(fieldDescriptor.position, canvas.extent.scaleBy(0.5));
    // anyone have a better idea than 50x50?
    aMorph.extent = this._returnValidPoint(fieldDescriptor.extent, pt(50, 50));
    aMorph.origin = this._returnValidPoint(fieldDescriptor.origin, pt(0, 0));
    aMorph.fill = this._color(fieldDescriptor.fill, Color.rgba(0, 0, 0, 0));
    const borderStyles = ['none', 'hidden', 'dashed', 'dotted', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'];

    const newBorder = {
      borderRadius: this._returnValidNumber(fieldDescriptor.border.borderRadius, 0, 0),
      width: this._returnValidNumber(fieldDescriptor.border.width, 0, 0),
      style: borderStyles.indexOf(fieldDescriptor.border.style) >= 0 ? fieldDescriptor.border.style : 'none',
      color: {}
    };

    const sides = ['top', 'bottom', 'left', 'right'];
    sides.forEach(side => newBorder.color[side] = this._color(fieldDescriptor.border.color[side]), Color.rgba(0, 0, 0, 0));
    aMorph.border = newBorder;
    if (fieldDescriptor.hasOwnProperty('dropShadow')) {
      try {
        aMorph.dropShadow = new ShadowObject(fieldDescriptor.dropShadow);
        aMorph.dropShadow.color = this._color(fieldDescriptor.dropShadow.color, Color.rgba(0, 0, 0, 0));
      } catch (error) {
        // what should we do?
      }
    }
  }

  /**
   * Set the complex text fields (fontColor and padding) of a text morph
   * from a descriptor.
   * @param { Text } textMorph - The text morph to restore.
   * @param { object } descriptor - descriptor containing the value of the text properties
   */
  _setComplexTextFields (textMorph, descriptor) {
    textMorph.fontColor = this._color(descriptor.fontColor, Color.black);
    // passing garbage to Rectangle.fromLiteral gives us what we'd use for default anyway
    textMorph.padding = Rectangle.fromLiteral(descriptor.padding);
    // similarly, passing garbage to textAndAttributes results in something sensible
    if (descriptor.textAndAttributes) {
      textMorph.textAndAttributes = descriptor.textAndAttributes;
    }
  }

  /**
   * Copy fields from a descriptor to a morph.  This is the mirror of _getFields_.
   * Similar to Object.assign() but copies only specific fields
   * Used by _restoreFromSaved_
   * @param { Morph } morph - Morph to copy contents to.
   * @param { object } descriptor - The descriptor to copy from.
   * @param { object[] } fields - The fields to copy. This is a list of the form [{name, validCheck, default}] and __getField__ returns the value to be used for each field (the value given if valid, default if not)
   */
  _setFields (morph, descriptor, fields) {
    fields.forEach(field => morph[field.name] = this._getFieldValue(descriptor, field));
  }

  /**
   * Restore from JSON form.  This involves parsing the JSON string and
   * restoring the tables, views, filters, and charts from the saved description
   * created in _prepareSerialization.
   * @param { string } storedForm - The stored form in a JSON string
   */
  async restoreFromJSONForm (storedForm) {
    await this._restoreFromSaved(JSON.parse(storedForm));
  }

  /**
   * The actual body of restoreFromJSONForm.  Broken out as a separate
   * routine for testing.
   * @param { object } storedForm - An object created by _perpareSerialization
   */
  async _restoreFromSaved (storedForm) {
    if (this._restore) {
      // in the middle of a restore, do nothing
      return;
    }
    this.storedForm = storedForm;
    this._restore = true;

    try {
      const unorderedDescriptors = [];
      this.clear(); // make sure we blow away anything that was here before
      if (storedForm.fill) {
        this.canvas.fill = this._color(storedForm.fill, Color.white);
      }
      // We're going to completely clear the data manager, so just blow it away
      // and get a new one.
      this.dataManager = new GalyleoDataManager();
      // The non-morph structures are easy....
      // this.tables = storedForm.tables;
      Object.keys(storedForm.tables).forEach(tableName => {
        this.addTable({ name: tableName, table: storedForm.tables[tableName] });
      });

      Object.keys(storedForm.views).forEach(viewName => {
        this.dataManager.addView(viewName, storedForm.views[viewName]);
      });

      // charts and filters have been initialized to empty dictionaries by
      // clear

      // Now we need to add morphs, including filters and charts, in order in order
      // to preserve front-to-back ordering.  So the first step is just to collect
      // the descriptors of each type in unorderedDescriptors, keeping the
      // the information we need to instantiate them later

      await Promise.all(Object.keys(storedForm.filters).forEach(async filterName => {
        const savedFilter = storedForm.filters[filterName]
        this.defaultFilters[filterName] = this._makeDefaultFilter(savedFilter.columnName, savedFilter.filterType, savedFilter.tableName)
        unorderedDescriptors.push({ type: 'filter', filterName: filterName, descriptor: savedFilter, morph: externalFilterMorph});

        // const filterMorph = await this._restoreFilterFromSaved(filterName, savedFilter);
      }));

      await Promise.all(Object.keys(storedForm.charts).forEach(async chartName => {
        const storedChart = storedForm.charts[chartName];
        const getColumnNameTableAndType =  viewOrTableName => {
          if (this.dataManager.tables[viewOrTableName]) {
            const table = this.dataManager.tables[viewOrTableName]
            return {columnName: table.columns[0].name, type:table.columns[0].type, tableName: viewOrTableName}
          } else {
            const view = this.dataManager.views[viewOrTableName]
            const table = this.dataManager.tables[view.tableName]
            return {columnName: view.columns[0], type: table.getColumnType(columnName), tableName: view.tableName}
          }
        
        }
        const descriptor = getColumnNameTableAndType(storedChart.viewOrTable)
        const filterType = descriptor.type == 'number'?'Numeric Select':'Select'
        const filter = this._makeDefaultFilter(descriptor.columnName, filterType, descriptor.tableName)
        this.defaultFilters[chartName] = filter
        unorderedDescriptors.push({ type: 'chart', chartName: chartName, descriptor: storedChart });
      }));

      // We used to store morphs as a dictionary, which we no longer do.  So check
      // the type, and if it's an object, convert to an array.  Fortunately, since
      // Object.keys() of an array returns [0, 1, 2...] the "conversion" here
      // is a no-op in the case of an array

      const morphNames = Object.keys(storedForm.morphs || []);
      const morphDescriptors = morphNames.map(name => storedForm.morphs[name]).filter(desc => desc);
      morphDescriptors.forEach(morphDescriptor => {
        unorderedDescriptors.push({ type: 'morph', descriptor: morphDescriptor });
      });

      // now we have them all, unsorted, in unordered descriptors with the
      // desired index in descriptor.morphIndex for each descriptor in unordered
      // descriptors.
      // descriptors = unorderedDescriptors

      await this._restoreMorphsFromDescriptors(unorderedDescriptors);

      if (this.dashboardController) { this.dashboardController.update(); }
    } catch (e) {
      console.log(`Error in _restoreFromSaved_: ${e}`);
    }
    this._restore = false;
  }

  /**
   * Restore morphs from their descriptors, which were retrieved in _restoreFromSaved_
   * and _restoreFromSnapshot_.  Each descriptor is of the form
   * {type: 'chart' | 'filter' | 'morph', descriptor: <descriptor}, specific to
   * the type.  'chart' and 'filter' also have their names in the top level
   * structure.  This routine just (a) sorts the list of descriptors in ascending
   * order by descriptor.morphIndex, and then builds and adds the objects in order,
   * preserving morph order.  The actual building is done by one of the three next
   * methods, as appropriate for the type
   * @param { object } descriptors - Descriptors, a list of descriptors.
   */
  async _restoreMorphsFromDescriptors (descriptors) {
    const desc_sort = (desc1, desc2) => desc1.descriptor.morphIndex - desc2.descriptor.morphIndex;
    descriptors.sort(desc_sort);
    // chartName = descriptors[0].chartName; storedChart = descriptors[0].descriptor
    // descriptor = descriptors[0]
    const morphs = await Promise.all(descriptors.map(async descriptor => {
      if (descriptor.type === 'chart') {
        return await this._restoreChartFromSaved(descriptor.chartName, descriptor.descriptor);
      } else if (descriptor.type === 'filter') {
        return await this._restoreFilterFromSaved(descriptor.filterName, descriptor.descriptor);
      } else {
        return this._restoreMorphFromSaved(descriptor.descriptor);
      }
    }));
    this.dirty = false;
    return morphs;
  }

  /**
   * Restore an internal filter from a saved form
   * @param { string } filterName: name of the filter to restore
   * @param { object } storedForm: intermediate form of the filter
   */
  async _restoreInternalFilterFromSaved (filterName, storedForm) {
    const savedFilter = storedForm.filters[filterName];
    let storedFilter = savedFilter.savedForm;
    if (storedFilter.toJS) storedFilter = storedFilter.toJS();
    const externalFilterMorph = await this.createExternalFilter(filterName, storedFilter.columnName, storedFilter.filterType, this._ensurePart(storedFilter.part), storedFilter.tableName);
    externalFilterMorph.filterMorph.restoreFromSavedForm(storedFilter);
    return await this.makeFilterMorph(savedFilter.columnName, savedFilter.filterType, savedFilter.part, savedFilter.tableName);
  }

  /**
   * Restore the morphic properties to a morph from a saved form.
   * this is called from _restoreFilterFromSaved_, _restoreChartFromSaved_,
   * and _restoreMorphFromSaved_
   * @param { object } savedForm - saved structure to pull the properties from
   * @param { Morph } morph - morph to assign them to
   */
  _restoreMorphicProperties (savedForm, morph) {
    const complexPropertySource = savedForm.hasOwnProperty('complexMorphicProperties') ? savedForm.complexMorphicProperties : savedForm.morphicProperties;
    this._setComplexFields(morph, complexPropertySource);
    this._setFields(morph, savedForm.morphicProperties, this._morphicFields);
  }

  /**
   * Restore an external filter from a saved form.
   * @param { NamedFilter } externalFilterMorph - The filter morph to be restored
   * @param { object } savedFilter - The saved filter from the stored form
   */
  async _restoreFilterFromSaved (externalFilterMorph, savedFilter) {
    
    this._restoreMorphicProperties(savedFilter, externalFilterMorph);
    await externalFilterMorph.whenRendered();//
    return externalFilterMorph;
  }

  /**
   * We ensure compatibility with older dashboard by translating
   * component URLs to actual component objects.
   * @param { string|Morph } componentOrString - The component or (now invalid) component URL
   * @return { Morph } The original or resolved component.
   */
  _ensurePart (componentOrString) {
    if (componentOrString.isComponent) return componentOrString;
    const parts = {
      'select filter': SelectFilter,
      DateFilter: DateFilter,
      'list filter': ListFilter,
      'range filter': RangeFilter,
      SliderFilter: SliderFilter,
      booleanFilter: BooleanFilter,
      doubleSliderFilter: DoubleSliderFilter
    };
    if (componentOrString.startsWith('part://')) {
      const pathParts = componentOrString.split('/');
      const partName = pathParts[pathParts.length - 1];
      return parts[partName];
    }
    /* return ({
      'part://Dashboard Studio Development/galyleo/select filter': SelectFilter
    })[componentOrString]; */
  }

  /**
   * Restore a chart from a saved form.
   * @param { string } chartName - name of the chart to be restored
   * @param { object } storedChart - The saved chart from the stored form
   */
  async _restoreChartFromSaved (chartName, storedChart) {
    if (storedChart.toJS) storedChart = storedChart.toJS();
    const chartSpecification = {
      chartType: storedChart.chartType,
      options: storedChart.options,
      viewOrTable: storedChart.viewOrTable
    };
    await this.addChart(chartName, chartSpecification, false);
    const chartMorph = this.charts[chartName].chartMorph;
    this._restoreMorphicProperties(storedChart, chartMorph);
    await chartMorph.whenRendered();
    return chartMorph;
  }

  /**
   * Restores a morph from a saved form.
   * @param { object } morphDescriptor - Saved form of the morph
   */
  _restoreMorphFromSaved (morphDescriptor) {
    const restoredMorph = morph({ type: morphDescriptor.type });
    restoredMorph.name = morphDescriptor.name;

    this._restoreMorphicProperties(morphDescriptor, restoredMorph);
    if (morphDescriptor.imageUrl) {
      restoredMorph.imageUrl = morphDescriptor.imageUrl;
    }
    this.view.addMorph(restoredMorph);
    if (morphDescriptor.textProperties) {
      const complexTextFieldsSource = morphDescriptor.hasOwnProperty('complexTextProperties') ? morphDescriptor.complexTextProperties : morphDescriptor.textProperties;
      this._setFields(restoredMorph, morphDescriptor.textProperties, this._textFields);
      this._setComplexTextFields(restoredMorph, complexTextFieldsSource);
    }
  }

  /* -- Utility code to explore the global data structures  -- */

  /**
   * The keys of the tables property
   */
  get tableNames () {
    return this.dataManager.tableNames;
  }

  /**
   * The keys of the filters property
   */
  get filterNames () {
    return Object.keys(this.filters);
  }

  /**
   * The keys of the views property
   */
  get viewNames () {
    return this.dataManager.viewNames;
  }

  /**
   * The keys of the charts property
   */
  get chartNames () {
    return Object.keys(this.charts);
  }

  /* -- Code which deals with the creation and use of filters -- */

  /**
   * All names.  This is internal, for the use of nameOK -- it's just all the
   * names that have been taken in this dashboard, of filters, charts, and
   * submorphs
   */
  get _allNames () {
    const names = this.canvas.submorphs.map(m => m.name);
    return names.concat(this.filterNames).concat(this.chartNames);
  }

  /**
   * Check if `name` is a valid name for a new filter.
   * @param { strsing } aName - The name to check.
   */
  nameOK (aName) {
    return this._allNames.indexOf(aName) < 0;
  }

  /**
   * Create a default filter.  This is the filter that will be used if the morph 
   * hasn't been instantiated yet.
   * @param { string } columnName - Name of the column to filter over
   * @param { string } filterType - Type of the filter (Select or Range)
   * @param { string } [tableName] - If non-null, only look for columns in this specfic table.
   * returns: a dataManagerFilter
   */

  async _makeDefaultFilter(columnName, filterType, tableName) {
    if (filterType == 'Range') {
      const parameters = await this.dataManager.getNumericSpec(columnName, tableName);
      return{ operator: 'IN_RANGE', column: columnName, max_val: parameters.max, min_val: parameters.min}
    } else if (filterType === 'NumericSelect') {
      const parameters = await this.dataManager.getNumericSpec(columnName, tableName);
      return { operator: 'IN_LIST', values: [parameters.min]}
    } else {
      const values = await this.dataManager.getAllValues(columnName, tableName);
      return { operator: 'IN_LIST', values: [values[0]]}
    }
  }

  /**
   * Create an externalFilter.  The code for this was moved from
   * ExternalFilterCreator (it was the second half of createFilter).
   * The only ExternalFilterCreator is in a popup, so we can't use that;
   * as a result, due to the DRY principle, we move it here.  Calls makeFilterMorph
   * to make the actual filter, then wraps it in
   * inside an ExternalFilter.
   * Create the external filter, put it on the dashboard, and then connect
   * its filterChanged signal to the drawAllCharts method; this is
   * how a change in the filter is reflected on all the charts.
   * parameters:
    filterName: name of the filter and morph to be created
    columnName: name of the column to filter over
    filterType: type of the filter (Select or Range)
    filterPart: the part used to make the internal filter
    tableName: if non-null, only look for columns in this specfic table
   * @param { string } filterName - Name of the filter and morph to be created
   * @param { string } columnName - Name of the column to filter over
   * @param { string } filterType - Type of the filter (Select or Range)
   * @param { object } filterPart - The part used to make the internal filter
   * @param { string } [tableName] - If non-null, only look for columns in this specfic table.
   */
  async createExternalFilter (filterName, columnName, filterType, filterPart, tableName) {
    const filterMorph = await this.makeFilterMorph(columnName, filterType, filterPart);
    const namedFilterMorphProto = part(NamedFilter);
    namedFilterMorphProto.init(filterMorph, filterName);
    namedFilterMorphProto.position = pt(0, 0);
    connect(namedFilterMorphProto, 'filterChanged', this, 'drawAllCharts');
    this.addFilter(filterName, { morph: namedFilterMorphProto });
    this.canvas.addMorph(namedFilterMorphProto);
    return namedFilterMorphProto;
  }

  /**
   * Make a filter.  This will be in one of two types: a Range Filter,
   * with a min and a max, or a select filter, which chooses a specific
   * value.  See classes RangeFilter and SelectFilter for implementation
   * of these.  A RangeFilter takes in the columnName for the filter,
   * and the min and max possible values; a SelectFilter takes in the column
   * name and all possible values to select from.
   * @param { string } columnName - The name of the filtered column.
   * @param { 'Range'|'Select'|'NumericSelect' } filterType - The type of the filter.
   * @param { Morph } filterPart - The component implementing the filter interface.
   * @param { string } [tableName=null] - If non-null, look at only columns in this table. If null, look at columns in every table.
   */
  async makeFilterMorph (columnName, filterType, filterPart, tableName = null) {
    const morph = part(filterPart);
    if (filterType === 'Range') {
      const parameters = await this.dataManager.getNumericSpec(columnName, tableName);
      morph.init(columnName, tableName, parameters.min_val, parameters.max_val, parameters.increment);
    } else if (filterType === 'NumericSelect') {
      // Numeric values, with a max, min, and an increment between them.  The
      // idea is that we offer a numeric object, e.g., a slider, which lets
      // the viewer pick any value between max and min, separated by increment
      // Notice this works best when the column is regularly incrementd
      // Get all the values, throw out the non-numbers, and sort in ascending order
      let values = await this.dataManager.getAllValues(columnName, tableName);

      values = values.map(value => Number(value)).filter(value => !isNaN(value));
      values.sort((a, b) => a - b);
      // Now compute the differences.  Compute values[i + 1] - values[i] for every
      // i, using shifted to represent values[i+1].  Sort and take the minimum
      // as the increment
      const shifted = values.slice(1);
      const differences = shifted.map((value, index) => value - values[index]);
      differences.sort((a, b) => a - b);
      this.createRecord = { column: columnName, type: filterType, values: values };
      // init with columnName, tableName, min, max, increment
      // see galyleo/SliderFilter for an example of this filter
      morph.init(columnName, tableName, values[0], values[values.length - 1], differences[0]);
    } else {
      const types = this.dataManager.getTypes(columnName, tableName);
      const isString = types && types.length === 1 && types[0] === 'string';
      const values = await this.dataManager.getAllValues(columnName);
      morph.init(columnName, values, tableName, isString);
    }
    return morph;
  }

  /* -- Code which deals with Views.  A View is a subset of a table, with the
        columns selected statically and the rows by internal or external filtering
        from widgets.  This code finds the parameters for a ViewBuilder and executes
        the filters in a build to get the data for the view. -- */

  // Create and initialize a viewBuilder.  This is very simple:
  // instantiate the part, and initialize it from its viewName
  // Called by the viewCreator and by dashboardControl.editSelectedView
  // parameters:
  //    viewName: the name of the view to edit

  async createViewEditor (viewName) {
    // viewName must exist as a key in views: this is checked by the caller,
    // but suspenders and belt
    if (this.viewNames.indexOf(viewName) < 0) {
      return;
    }
    if (!this.viewBuilders) {
      this.viewBuilders = {};
    }
    // If there is already an open view editor for this view, do not
    // create a new one.
    let editor;
    if (this.viewBuilders[viewName]) {
      this._initViewEditor(this.viewBuilders[viewName], viewName);
    } else {
      editor = part(ViewBuilder);
      this._initViewEditor(editor, viewName);
    }
    editor.center = $world.innerBounds().center();
  }

  // Convert a GalyleoColumn to a Google Viz Column
  // Should migrate into a Google-specific library
  // parameters:
  //    galyleoColumn: {type, name}
  // returns:
  //    {type, id, label}
  _createGVizColumn (galyleoColumn) {
    return { id: galyleoColumn.name, label: galyleoColumn.name, type: galyleoColumn.type };
  }

  /**
   * Prepare the data for a view or a table.  This is used by
   * displayPreview and drawChart, to get the data ready to be plotted
   * @param { string } viewOrTable - The name of the Table/View to prepare the data for.
   * @returns { DataView|DataTable } - The prepared table/view.
   */
  async prepareData (viewOrTable) {
    if (this.dataManager.tableNames.indexOf(viewOrTable) >= 0) {
      const table = this.dataManager.tables[viewOrTable];
      const columns = table.columns.map(column => this._createGVizColumn(column));
      const rows = await table.getRows();
      const result = new this.gViz.DataTable({ cols: columns });
      result.addRows(rows);
      return result;
    } else if (this.dataManager.viewNames.indexOf(viewOrTable) >= 0) {
      return await this._prepareViewData(viewOrTable);
    } else {
      return null;
    }
  }

  /**
   * Initialize a view editor.  Just register it as the viewBuilder for this
   * view, open it in the world, position it in the center, and initialize it
   * with the viewName and this.  If the viewBuilder already exists, it will
   * be re-initialized. We can turn this off with a boolean if desired.
   * @param { object } editor - The editor to be initialized.
   * @param { string } viewName - The name of the view.
   */
  _initViewEditor (editor, viewName) {
    this.viewBuilders[viewName] = editor;
    editor.openInWorld();
    editor.center = this.canvas.globalBounds().center();
    editor.init(viewName, this);
  }

  /**
   * Preview a view or table
   * Shows the data in the Table/View in a window, using the Google Table
   * chart to show the data.
   * @param { string } viewOrTable - The name of the view or table to show the data for.
   */
  async displayPreview (viewOrTable) {
    const dataTable = this.prepareData(viewOrTable);
    if (dataTable === null) {
      return;
    }
    const wrapper = new this.gViz.ChartWrapper({
      chartType: 'Table',
      dataTable: dataTable,
      options: { width: '100%', height: '100%' }
    });

    const tableMorph = part(GoogleChartHolder);
    tableMorph.init(viewOrTable, this);
    tableMorph.openInWindow();
    tableMorph.drawChart(wrapper);
  }

  /**
   * Get a filter for a name.  The name is either the name of a filter
   * or the name of a chart, and so check both lists and return the filter
   * appropriately.  Used by `_getFiltersForView`.
   * @param { string } widgetOrChartName - the name of a widget or a chart
   * @returns { null|object } The associated filter object (or null if not found)
   */
  _getFilterForName (widgetOrChartName) {
    if (this.filters[widgetOrChartName]) {
      return this.filters[widgetOrChartName].morph.dataManagerFilter;
    } else if (this.charts[widgetOrChartName]) {
      return this.charts[widgetOrChartName].dataManagerFilter;
    } else if (this.defaultFilters[widgetOrChartName]) {
      return this.defaultFilters[widgetOrChartName];
    }
  }

  /**
   * Check to see if a filter is valid: is non-null, and if a Select filter,
   * has a value property, and if a range filter, a max and a min that
   * are both numbers.
   * @param { object } aFilter - the filter to check for validity; it is an object suitable for GoogleDataTable.getFilteredRows()
   * @returns { boolean } True if the filter is valid, false otherwise.
   */
  _filterValid (aFilter, table) {
    if (!aFilter) {
      return false;
    }
    const fields = Object.keys(aFilter);

    if (fields.indexOf('operator') >= 0) {
      // this will soon be the whole method -- the else clause here is legacy
      return checkSpecValid(table, aFilter);
    } else {
      if (fields.indexOf('columnName') < 0) {
        return false;
      }
      if (fields.indexOf('minValue') >= 0) {
        return fields.indexOf('maxValue') >= 0 && !isNaN(aFilter.minValue) && !isNaN(aFilter.maxValue);
      }
      return fields.indexOf('value') >= 0 && aFilter.value !== undefined && aFilter.value !== '__no_selection__';
    }
  }

  /**
   * Get the filters for a view.  A view has a list of named filters, and
   * a filterList of internal filters (filters whose value is set when the
   * filter is created, and not by a dashboard widget or chart).  Extract
   * these, and return a list of objects suitable for use by
   * GoogleDataTable.getFilteredRows().
   * This is used by `_prepareViewData`
   * @param { object } view - A view structure created by the View Editor and stored as a value in this.views
   * @returns { object[] } A list of objects suitable for use by GoogleDataTable.getFilteredRows()
   */
  _getFiltersForView (view) {
    const filtersInView = view.filterNames.map(name => this._getFilterForName(name));
    const table = this.dataManager.tables[view.tableName];
    return filtersInView.filter(filter => this._filterValid(filter, table));
  }

  /**
   * Prepare the data for a view.  A view has an underlying table,
   * named filters, a list of internal filters.  This method takes
   * the underlying table, uses the named columns of the view to
   * get the columns of the table, then runs all the filters over the
   * table to get the underlying rows, returning this in a Google Data View
   * object. Used by `prepareData`.
   * @param { string } viewName - The name of the view to turn into a DataView object
   * @returns { object } The data view object ready to be displayed.
   */
  async _prepareViewData (viewName) {
    const aView = this.dataManager.views[viewName];
    if (!aView) {
      return;
    }
    const filterSpecs = {};
    aView.filters.forEach(filterName => {
      filterSpecs[filterName] = this._getFilterForName(filterName);
    });
    const columns = aView.fullColumns(this.dataManager.tables).map(column => this._createGVizColumn(column));
    const result = new this.gViz.DataTable({ cols: columns });
    const rows = await aView.getData(filterSpecs, this.dataManager.tables);
    result.addRows(rows);
    return result;
  }

  /* -- Code that deals with Charts.  This takes care of prepping chart titles,
       calling the View code to get the data, and displaying the char  -- */

  /**
   * Make the header string for a chart title.  This is called from
   * `_makeTitleForTable` and `_makeTitleForView`.  If there
   * are fewer than two data series columns, it returns a string
   * of the form Series1, Series2 v Category Series.  Otherwise
   * it returns the ViewName.
   * @param { string } categoryColumn - The name of the column of the X axis.
   * @param { string[] } seriesColumns - The names of the data series columns.
   * @param { string } viewOrTableName - The name of the view or table.
   */
  _makeHeaderString (categoryColumn, seriesColumns, viewOrTableName) {
    if (seriesColumns.length <= 2 && seriesColumns.length > 0) {
      return `${seriesColumns.join(', ')} v ${categoryColumn}`;
    } else {
      return viewOrTableName;
    }
  }

  // Hack!  A utility to get column names for a table, independent of
  // whether it's a Google Table or a Galyleo Table
  // parameters:
  //    table: a table which is either aGoogle Table or a Galyleo Table
  // returns:
  //    an ordered list of the column names
  _getColumnNames (table) {
    if (table.hasOwnProperty('cols')) {
      // Google table!
      return table.cols.map(col => col.id);
    } else {
      return table.columns.map(column => column.name);
    }
  }

  /**
   * Make the title corresponding to a table.  This is used by a chart
   * when the chart is drawn.  Called by __makeTitle__.  Returns a string
   * which is the title.  The string will be of the form
   * column1Name, column2Name,..., columnNName v column0Name.
   * @param { object } aTable - A table which is a value in this.tables
   * @param { string } tableName - The string which is the title.
   */
  _makeTitleForTable (aTable, tableName) {
    const columns = this._getColumnNames(aTable);
    return this._makeHeaderString(columns[0], columns.slice(1), tableName);
  }

  // Make a string for a filter.  This just returns a string which displays what
  // the filter is doing; e.g., a select filter which picks a value v on column
  // will return column = v. Used by __makeTitleForView__
  // parameters:
  //    filter: either a Data Manager filter or a legacy filter, the filter to
  //             return the string for
  // returns:
  //      an explanatory string

  _filterString (filter) {
    const fields = Object.keys(filter);
    if (fields.indexOf('column') >= 0) {
      if (fields.indexOf('values') >= 0) {
        if (filter.values.length === 0) {
          return null;
        } else if (filter.values.length === 1) {
          return `${filter.column} = ${filter.values[0]}`;
        } else {
          return `${filter.column} in ${filter.values}`;
        }
      }
      if (fields.indexOf('max_value') >= 0) {
        return `${filter.max_value} >= ${filter.column} >= ${filter.min_value}`;
      }
      return null;
    } else {
      const columnName = filter.columnName;
      if (fields.indexOf('value') >= 0) {
        return `${columnName} = ${filter.value}`;
      } else if (fields.indexOf('minValue') >= 0) {
        return `${filter.maxValue} >= ${columnName} >= ${filter.minValue}`;
      }
      return null;
    }
  }

  /**
   * Make the title corresponding to a view.  This is used by a chart
   * when the chart is drawn.  Called by `_makeTitle`.  Returns a string
   * which is the title.  The string will be of the form
   * column1Name, column2Name,..., columnNName v column0Name where filter1String,..
   * where a Select filter string is of the form columnName = selectedValue
   * and a Range filter string is of the form selectedMax >= columnName >= selectedMin
   * @param {type} aView - A table which is a value in this.views
   * @param {type} viewName - The name of the table/view
   * @returns { string } The string which is the title.
   */
  _makeTitleForView (aView, viewName) {
    const seriesColumns = aView.columns.slice(1);
    const headerString = this._makeHeaderString(aView.columns[0], seriesColumns, viewName);
    const filters = this._getFiltersForView(aView);
    if (filters.length > 0) {
      const filterStrings = filters.map(filter => this._filterString(filter));
      const realStrings = filterStrings.filter(string => string);
      const joinedString = realStrings.join(', ');
      return `${headerString} where ${joinedString}`;
    } else {
      return headerString;
    }
  }

  /**
    * make a title for the chart.  This will product a title of the form:
    * "<Data Series List> v <X Axis Name> where <filterValues>", where
    * <Data Series List> is just the names of the data series columns, comma-
    * separated, and <filterValues> is a comma-separated list of the form
    * <filter column name> = <filter value>
    * sticks the title in chart.options.title, which is turned into part of the
    * ChartWrapper when the chart is drawn.
    * @param { object } chart - The chart to make the title for.
    */
  _makeTitle (chart) {
    if (chart.chartType === 'Table') {
      return;
    }
    let title; const name = chart.viewOrTable;
    const useDataManager = !!this.dataManager;
    const tableDict = this.dataManager.tables;
    const viewDict = this.dataManager.views;
    const tableNames = Object.keys(tableDict);
    const viewNames = Object.keys(viewDict);

    if (tableNames.indexOf(name) >= 0) {
      title = this._makeTitleForTable(tableDict[name], name);
    } else if (viewNames.indexOf(chart.viewOrTable) >= 0) {
      title = this._makeTitleForView(viewDict[name], name, useDataManager);
    } else {
      return null;
    }
    chart.options.title = title;
  }

  /**
   * Check to see if a filter is used in any view.  This is used by
   * `_removeFilterOrChart` to see if the filter/chart is being used
   * by any view
   * @param { string } filterName - Name of the filter (to chart) to be checked.
   * @returns { string[] } A list of the names of the views that use this filter
   */
  _checkFilterUsed (filterName) {
    let filterUsedInView = viewName => {
      return this.views[viewName].filterNames.indexOf(filterName) >= 0;
    };
    return Object.keys(this.views).filter(viewName => filterUsedInView(viewName));
  }

  /**
   * Remove a filter or chart, first checking that it isn't being used, and if
   * it is, prompting the user to confirm.  This is internal (as witness the _
   * convention) and is called from removeFilter() and removeChart().  Note we
   * can't use removeMorph() directly to remove this, as that is overridden.
   * Instead, call super.removeMorph() directly.  Also, since
   * the dashboard controller maintains a list of charts and filters, when a chart
   * or filter is removed we update the controller.
   * @param { string } filterOrChartName - The name of the filter (or chart) to be checked.
   * @param { object } objectDict - Either this.filters (for a filter) or this.charts (for a chart)
   */
  async _removeFilterOrChart (filterOrChartName, objectDict, prompt = true) {
    let morph = this.canvas.getSubmorphNamed(filterOrChartName);
    let usage = this._checkFilterUsed(filterOrChartName);
    let msg = `${filterOrChartName} is used in views ${usage.join(', ')}.  Proceed?`;
    let goAhead = prompt && usage.length > 0 ? await this.confirm(msg) : true;
    if (goAhead) {
      delete objectDict[filterOrChartName];
      if (morph) {
        morph.remove();
      }
      if (this.dashboardController) {
        this.dashboardController.update();
      }
    }
  }

  /**
   * Delete a filter, first checking to see if it's used in any View.
   * @param { string } filterName - The name of the filter to be removed.
   */
  async removeFilter (filterName, prompt = true) {
    await this._removeFilterOrChart(filterName, this.filters, prompt);
  }

  /**
   * Delete a chart, first checking to see if it's used as a filter in any View.
   * @param { string } chartName - The name of the chart to be removed
   */
  removeChart (chartName) {
    this._removeFilterOrChart(chartName, this.charts);
  }

  /**
   * Override the removeMorph method.  We do this so that removal of a
   * chart morph or a named filter morph will also remove the relevant
   * chart (or filter) from the dictionaries we have here, using the removeChart
   * and removeFilter methods.
   * @param { Morph } aMorph - The morph to be removed.
   */
  removeMorph (aMorph) {
    if (aMorph.isFilter) {
      this.removeFilter(aMorph.name);
    } else if (aMorph.isChart) {
      this.removeChart(aMorph.name);
    } else {
      super.removeMorph(aMorph);
    }
  }

  /**
   * Remove a View, first checking if it is used in any chart
   * If it is, ask the user for confirmation first.  If the view is removed,
   * update the information in the sideboard.
   * @param { string } viewName - The name of the view to be removed.
   */
  async removeView (viewName) {
    let usesView = chart => chart.viewOrTable === viewName;
    let usedBy = Object.keys(this.charts).filter(chartName => usesView(this.charts[chartName]));
    let msg = `${viewName} is used by charts ${usedBy.join(', ')}.  Proceed?`;
    let goAhead = usedBy.length > 0 ? await this.confirm(msg) : true;
    if (goAhead) {
      delete this.views[viewName];
      this.dashboardController.update();
    }
  }

  /**
   * Remove a Table, first checking if it is used in any chart or View
   * If it is, ask the user for confirmation first.  If the Table is removed,
   * update the information in the sideboard.
   * @param { string } tableName - The name of the view to be removed.
   */
  async removeTable (tableName) {
    let chartUsesTable = chart => chart.viewOrTable === tableName;
    let viewUsesTable = view => view.table === tableName;
    let chartUses = Object.keys(this.charts).filter(chartName => chartUsesTable(this.charts[chartName]));
    let viewUses = Object.keys(this.views).filter(viewName => viewUsesTable(this.views[viewName]));
    let usedBy = chartUses.concat(viewUses);

    let msg = `${tableName} is used by ${usedBy.join(', ')}.  Proceed?`;
    let goAhead = usedBy.length > 0 ? await this.confirm(msg) : true;
    if (goAhead) {
      delete this.dataManager.tables[tableName];
      this.dashboardController.update();
    }
  }

  // /**
  //  * First, reset the error log to empty, wait for rendering, load
  //  * the google chart packages and make sure that the dictionaries are
  //  * initialized.
  //  */
  // async viewDidLoad () {
  //   this._enableLink(false);
  //   this.__log__ = [];
  //   await this.view.whenRendered();
  //   this.dataManager = new GalyleoDataManager();
  //   const filePath = this.ui.galyleo.dashboardFilePath;
  //   await this._loadGoogleChartPackages();
  //   ['charts', 'filters'].forEach(prop => {
  //     if (!this[prop]) {
  //       this[prop] = {};
  //     }
  //   });
  //   if (window.EXTENSION_INFO && window.EXTENSION_INFO.currentFilePath && window.EXTENSION_INFO.currentFilePath.length > 0) {
  //     this.checkAndLoad(window.EXTENSION_INFO.currentFilePath);
  //   }
  //
  //   this.gCharts.setOnLoadCallback(() => { });
  //   this._initializeJupyterLabCallbacks();
  //   this.dirty = false;
  //   this.viewBuilders = {}; // list of open view builders, can have only 1 per view
  //   this.availableTables = {}; // dictionary of tables available from the Notebook, obtained from a get information request
  //   window.parent.postMessage({ method: 'galyleo:ready', dashboardFilePath: filePath }, '*');
  // }

  async init (controller) {
    this.dashboardController = controller;
    await this._loadGoogleChartPackages();
    ['charts', 'filters'].forEach(prop => {
      if (!this[prop]) {
        this[prop] = {};
      }
    });
    this.gCharts.setOnLoadCallback(() => {});
    this._initializeJupyterLabCallbacks();
    this.dirty = false;
    if (!this.dataManager) {
      this.dataManager = new GalyleoDataManager();
    }
    this.viewBuilders = {}; // list of open view builders, can have only 1 per view
    this.availableTables = {}; // dictionary of tables available from the Notebook, obtained from a get information request
  }

  /**
   * Load the Google chart packages.  Only called internally
   * Note: we're going to have to drop the mapsApiKey at some point.
   * @param { string[] } packageList - The packages to be loaded. Default is the core chart package, the map package, and the chart editor..
   */
  async _loadGoogleChartPackages (packageList = ['corechart', 'map', 'charteditor']) {
    await promise.waitFor(20 * 1000, () => !!window.google);
    await this.gCharts.load('current', { packages: packageList, mapsApiKey: 'AIzaSyA4uHMmgrSNycQGwdF3PSkbuNW49BAwN1I' });
  }

  /**
   * Each datatable is represented as a Google Chart Data Table
   * and a name, which identifies it here.  This is called internally;
   * the externally visible method is (ATM) loadDataFromUrl.
   * ensures that the table dictionary exists, then just stores
   * the table and updates the controller.  Note that if the table
   * exists (this.tables[tableSpec.name] !== null), then the datatable
   * is overwritten.
   * @param { object } tableSpec - An object of the form {name: <name> table: { columns: <list of the form <name, type>, rows: <list of list of values>}}
   */
  addTable (tableSpec) {
    // should add some error-checking
    this.lastTable = tableSpec;
    if (!this.dataManager) {
      this.dataManager = new GalyleoDataManager();
    }
    this.dataManager.addTable(tableSpec.name, tableSpec.table);
    // this.tables[tableSpec.name] = tableSpec.table;
    if (this.dashboardController) {
      this.dashboardController.update();
    }
    this.dirty = true;
  }

  /**
   * Load a table from the URL given.  This should do a little more error-checking
   * than it does.  In particular, it should check to make sure that tableSpec
   * is valid.
   * Data must be in the JSON form {"name": name, "table": Google Data Table in JSON form}
   * Now uses abstracted view (see addTable) table must be in the form
   * {columns: rows: } where a column is a pair (name, type) and a row
   * is a list of values
   * @param { string } url - a URL.
   */
  async loadDataFromUrl (url) {
    try {
      const tableSpec = await resource(url).readJson();
      this.addTable(tableSpec);
    } catch (err) {
      console.log({ activity: `loading url ${url}`, error: err });
    }
  }

  /**
   * Add a named filter.  This is called by ExternalFilterCreator.createFilter, and
   * that takes care of properly formatting the spec, creating the morph, adding
   * it to the dashboard, etc.
   * Note when the filterList is added to the controller, update() should be
   * called from here.
   * @param { string } filterName - The name of the filter.
   * @param { object } filterSpec - An object currently of the form {morph: <an External Filter Morph>}
   */
  addFilter (filterName, filterSpec) {
    this.filters[filterName] = filterSpec;
    if (this.dashboardController) {
      this.dashboardController.update();
    }
    this.dirty = true;
  }

  /**
   * A simple routine to consistency-check a dashboard.   This should
   * be called:
   * 1. Before any drawChart routine (we will use drawAllCharts, to avoid
   *    multiple popups)
   * 2. Before a save
   * This will return an OK or an object with error messages for display
   */
  consistencyCheck () {
    // result object -- ok is true/false, messages a record of the
    // errors encountered -- empty if ok = true
    const result = {
      ok: true,
      messages: []
    };
    // a convenience function to capture an error
    const addMessage = (message) => {
      result.ok = false;
      result.messages.push(message);
    };
    // start with the charts -- for every chart, does its viewOrTable exist?
    this.chartNames.forEach(chartName => {
      const viewOrTableName = this.charts[chartName].viewOrTable;
      if (this.tables[viewOrTableName] || this.views[viewOrTableName]) {
        return; // from the forEach
      }
      addMessage(`View ${viewOrTableName} is required by chart ${chartName} but is not present`);
    });
    // Check the views -- the underlying table should be present, should have
    // the selected columns, any selected filter should be present and should be
    // defined over a column of the table
    this.viewNames.forEach(viewName => { // viewName = 'Causes1'
      const tableName = this.views[viewName].table;
      if (!this.tables[tableName]) {
        addMessage(`Underlying table ${tableName} for view ${viewName} is missing`);
        return;
      }
      // A convenience to get the column names from a table
      const tableColumns = tableName => this.tables[tableName].cols.map(column => column.id);
      // make sure the columns all exist
      const availableColumns = tableColumns(tableName);

      if (this.views[viewName].columns.length === 0) {
        addMessage(`View ${viewName} has no selected columns`);
      }
      const missing_columns = this.views[viewName].columns.filter(colName => availableColumns.indexOf(colName) < 0);
      if (missing_columns.length > 0) {
        addMessage(`View ${viewName} references columns ${missing_columns} which are not present in table ${tableName}`);
      }
      // This code works for explicit filters but not charts-as-filters.  Need
      // to rethink and rewrite (and modularize) this
      /* const missing_filters = this.views[viewName].filterNames.map(filterName => this.filterNames.indexOf(filterName) < 0);
      // make sure the filters all exist
      if (missing_filters.length > 0) {
        addMessage(`View ${viewName} uses filters ${missing_filters} which do not exist`);
      }
      // check to see if a filter operates on a view  -- either its
      // declared to live over the tableName or its column is one of the table's
      // columns
      const filterCheck = (filterName) => {
        const filter = this.filters[filterName];
        return filter.table ? filter.table === tableName : filter.columnName && availableColumns.indexOf(filter.columnName) >= 0;
      };
      const existing_filters = this.views[viewName].filterNames.map(filterName => this.filterNames.indexOf(filterName) >= 0);
      existing_filters.forEach(filterName => {
        if (filterCheck(filterName)) {
          return;
        }
        addMessage(`View ${viewName} uses filter ${filterName} but it does not operate over any column of ${tableName}`);
      }); */
    });
    // will do filters later
    return result;
  }

  /**
   * A convenience function which redraws all the charts on the page.
   * this is called when a filter has changed value. This is done through
   * a connection on each named filter to this method. The code that
   * makes the connection is in ExternalFilterCreator.createFilter.
   */
  drawAllCharts () {
    const chartNames = this.chartNames;
    chartNames.forEach(name => this.drawChart(name));
  }

  /**
   * Make a wrapper for the chart.  This is the penultimate step before drawing;
   * a wrapper is the data structure Google Charts uses for editing and drawing
   * a chart.  The steps are:
   * 1. Prepare the data for the chart as a Google DataView.  This is selecting
   *    the subset of the table columns which are to be plotted and applying the
   *    filters to get the subset of the rows
   * 2. Creating the wrapper with the appropriate chartType and options;
   * 3. Setting the wrapper's DataTable to the view.
   * After this, the wrapper is returned to be drawn or edited.
   * This is used by drawChart and by editChartStyle
   * @note
   * Wrappers are incompatible with the serializer, since they store the HTML Div of the chart. Do not serialize.
   * @param { object } chart - The chart to make the wrapper for.
   * @param { string } chartName - The name of the chart.
   */
  async _makeWrapper (chart, chartName) {
    const dataTable = await this.prepareData(chart.viewOrTable);
    if (!dataTable) return null;
    const filter = await this._prepareChartFilter(chart.viewOrTable);
    if (!filter) return null;
    if (!(chart.filter && chart.filter.columnName === filter.columnName)) {
      chart.filter = filter;
    }
    const wrapper = new this.gViz.ChartWrapper({
      chartType: chart.chartType,
      options: chart.options
    });
    this.lastChartType = [chart.chartType, wrapper.getType()];
    wrapper.setDataTable(dataTable);
    this.gViz.events.addListener(wrapper, 'select', e => { this._updateChartFilter(e, wrapper, chartName); });
    return wrapper;
  }

  /**
   * Log chart events
   * @param { Event } e - The event to respond to.
   * @param { object } wrapper - The chart wrapper.
   * @param { string } chartName - The name of the chart.
   */
  _updateChartFilter (e, wrapper, chartName) {
    this._lastEvent = e;
    const chart = wrapper.getChart();
    const table = wrapper.getDataTable();
    const selection = chart.getSelection();
    const row = selection[0].row == null ? null : selection[0].row;
    const col = selection[0].col == null ? 0 : selection[0].col;
    const value = table.getValue(row, col);
    if (this.charts[chartName].dataManagerFilter) {
      this.charts[chartName].dataManagerFilter.values = [value];
      this.drawAllCharts();
    }

    const record = { event: e, wrapper: wrapper, chart: chart, value: value, name: chartName };
    if (!this._chartEvents) {
      this._chartEvents = [record];
    } else {
      this._chartEvents.push(record);
    }
  }

  /**
   * Draw a chart. This routine is very simple: get the chart for chartName,
   * make its title (this can't be made until just before the chart is drawn,
   * because the title incorporates filter values), make its wrapper, then
   * pass the wrapper to the chart's morph to be drawn
   * @param { string } chartName - The name of the chart to be drawn.
   */
  async drawChart (chartName) {
    const chart = this.charts[chartName];
    if (!chart) return;
    this._makeTitle(chart);
    const wrapper = await this._makeWrapper(chart, chartName);
    if (wrapper) {
      this.lastWrapper = wrapper;
      chart.chartMorph.drawChart(wrapper);
    }
  }

  /**
   * Edit the chart's type and physical appearance, using the Google Chart Editor
   * Simple.  First, create the editor, then get the chart corresponding to
   * chartName.  The editor uses a ChartWrapper, so create that for the chart.
   * Next, create the callback for when the editor is done.  This callback looks
   * at the wrapper the editor has created, and extracts out the relevant structures
   * for our chart specification, namely the chartType and options.  See above:
   * we can't serialize a wrapper, so we serialize the relevant chunks.  Finally,
   * the callback draws the chart, so the user sees the updates, and closes the
   * editor dialog.  Once the callback is defined, open the dialog on the input
   * wrapper we've created.
   * @param { string } chartName - The name of the chart whose style is to be edited
   */
  async editChartStyle (chartName) {
    const editor = new this.gViz.ChartEditor();
    const chart = this.charts[chartName];
    if (!chart) return;
    const wrapper = await this._makeWrapper(chart, chartName);
    if (!wrapper) return;
    this.gViz.events.addListener(editor, 'ok', async () => {
      const wrapperOut = editor.getChartWrapper();
      chart.chartType = wrapperOut.getChartType();
      chart.options = wrapperOut.getOptions();
      await this.drawChart(chartName);
      editor.closeDialog();
    });
    editor.openDialog(wrapper);
  }

  /**
   * Add a chart, given a specification.  The specification is an entry in the
   * charts table (see the description under properties at the top).  Steps:
   * 1. give the chart a unique name, which we do by catenating the timestamp with a
   *    three-digit random number
   * 2. Get the morph for this chart, which will usually (in fact, always)
   *     create a new googleChartMorph for it
   * 3. Add the chartmorph to the specification and then store the specification
   *    under the chart name in the dictionary
   * 4. draw the chart
   * 5. Tell the controller to update itself, so the user sees the new chart name
   *    in the chart list
   * This is called by the ChartBuilder once the user clicks Create Chart.
   * @param { string } chartName - name of the chart
   * @param { object } chartSpecification - specification of the new chart.
   * @param { boolean } [editChartStyle=true] - edit the chart immediately upon creation
   */
  async addChart (chartName, chartSpecification, editChartStyle = true) {
    chartSpecification.chartMorph = await this._getChartMorph(chartName);
    this.charts[chartName] = chartSpecification;
    if (this.dashboardController) {
      this.dashboardController.update();
    }
    // chartSpecification.filter =                this._prepareChartFilter(chartSpecification.viewOrTable);
    chartSpecification.dataManagerFilter = await this._prepareChartFilter(chartSpecification.viewOrTable);
    await this.drawChart(chartName);
    if (editChartStyle) {
      this.editChartStyle(chartName);
    }
    this.dirty = true;
  }

  /**
   * Create a filter for a chartSpecification, to add to the chart record.
   * Every chart is a Select filter, since clicking on the chart selects
   * an item from its category axis. For example, clicking on a region
   * on a Geo Chart selects the region, clicking on a pie chart selects
   * the item represented by the wedge, and so on.  The category axis is
   * always column 0 of  the view/table, so we get that. The `_makeWrapper`
   * method attaches an event handler to update the value field of the filter.
   * @param { string } viewOrTableName - The name of the underlying view or table.
   * @returns { object } The filter object for the chart, to be added to the specification.
   */
  async _prepareChartFilter (viewOrTableName) {
    let tableName;
    const dataManagerFilter = { operator: 'IN_LIST' };
    if (this.dataManager.views[viewOrTableName]) {
      const view = this.dataManager.views[viewOrTableName];
      dataManagerFilter.column = view.columns[0];
      tableName = view.tableName;
    } else if (this.dataManager.tables[viewOrTableName]) {
      const table = this.dataManager.tables[viewOrTableName];
      dataManagerFilter.column = table.columns[0].name;
      tableName = viewOrTableName;
    } else {
      return null;
    }
    const values = await this.dataManager.getAllValues(dataManagerFilter.column, tableName);
    if (values && values.length > 0) {
      dataManagerFilter.values = [values[0]];
    }
    return dataManagerFilter;
  }

  /**
   * Get a morph for the chart with name chartName.  This is called by addChart.
   * It's essentially just building the chart from the googleChartMorph resource,
   * initializing it by passing in the chartName and this, the dashboard it belongs
   * to, adding it to this and setting its position to the top-left corner.
   * @param { string } chartName - The name to find/create the chart morph for
   * @returns { Morph } The new morph.
   */
  async _getChartMorph (chartName) {
    const currentMorphsForChart = this.canvas.submorphs.filter(morph => morph.isChart && morph.name === chartName);
    if (currentMorphsForChart && currentMorphsForChart.length > 0) {
      return currentMorphsForChart[0];
    }
    const chartMorph = part(GoogleChartHolder);
    chartMorph.init(chartName);
    this.canvas.addMorph(chartMorph);
    chartMorph.position = pt(0, 0);
    return chartMorph;
  }

  getDashboardName () {
    return this.get('dashboard selector').selection || 'some Dashboard';
  }

  _getPublicationResourceHandle (name = this.getDashboardName()) {
    const userName = this.world().getCurrentUser().name;
    return resource(System.baseURL).join('users').join(userName).join('published/').join('dashboards').join(name + '.json');
  }

  openPublishedDashboard () {
    window.open(System.baseURL + `worlds/load?snapshot=${this._getPublicationResourceHandle().url.replace(System.baseURL, '')}&fastLoad=true`);
  }

  _enableLink (active) {
    const link = this.get('open published dashboard button');
    if (!link) {
      return;
    }
    this.withAnimationDo(() => {
      link.visible = active;
      link.isLayoutable = active;
    }, { duration: 300 });
  }

  setContext (target) {
    target._context = this.view.owner; // ensure the context of each added morph is galyleo
  }

  async publish () {
    const li = LoadingIndicator.open('publishing dashboard...');
    const snap = await createMorphSnapshot(this);
    const frozenPartsDir = await this._getPublicationResourceHandle().ensureExistance();
    li.status = 'writing files...';
    await frozenPartsDir.writeJson(snap);
    this._enableLink(true);
    li.remove();
  }

  // a Utility to to log entries.  The entries are activity-specific.
  //  Just shoves the given entry on the
  // log, with the time that it happened.
  // parameters:
  //     entry: a string or object that is the log entry

  _logEntry (entry) {
    if (!this._log) {
      this._log = [];
    }
    this._log.push({ entry: entry, time: new Date() });
  }

  // Show the log.  I just got sick of looking for this...
  _showLog () {
    window.alert(this._log.map(entry => `${entry.time.toLocaleTimeString()}: ${entry.entry}`).join('\n'));
  }
}



export { LoadDialog, SaveDialog };
