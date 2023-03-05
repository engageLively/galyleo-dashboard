import Immutable from 'https://jspm.dev/immutable@4.0.0-rc.12';
import { Morph, ViewModel, TilingLayout } from 'lively.morphic';
import { component, without, part, add } from 'lively.morphic/components/core.js';
import { createMorphSnapshot } from 'lively.morphic/serialization.js';
import { resource } from 'lively.resources/src/helpers.js';
import { pt, Color, rect } from 'lively.graphics/index.js';
import { LoadingIndicator } from 'lively.components';
import { promise, arr, string } from 'lively.lang';
import { getClassName } from 'lively.serializer2/class-helper.js';
import { GalyleoWindow, GalyleoConfirmPrompt, PromptButton } from './shared.cp.js';
import { GalyleoSearch } from './inputs/search.cp.js';
import { ViewBuilder } from './view-creator.cp.js';
import { GoogleChartHolder } from './chart-creator.cp.js';
import { DashboardCommon } from './dashboard-common.cp.js';
import { GalyleoDataManager } from '../galyleo-data/galyleo-data.js';

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

class LoadDialogModel extends ViewModel {
  /**
   * Initialize with the file path passed to dashboard
   * @param { object } dashboard - the dashboard that invoked this, and which will be called back
   * @param { string } path - the initial file path, if any, which is the initial value of the file input.
   */

  static get properties () {
    return {
      expose: {
        get () {
          return ['init'];
        }
      },
      bindings: {
        get () {
          return [
            { model: 'cancel button', signal: 'fire', handler: 'cancel' },
            { model: 'load button', signal: 'fire', handler: 'load' }
          ];
        }
      }

    };
  }

  init (dashboard, path) {
    this.dashboard = dashboard;
    if (path && path.length > 0) {
      this.ui.fileInput.textString = path;
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
    const filePath = this.ui.fileInput.textString;
    if (await this.dashboard.loadDashboardFromURL(filePath)) {
      this.view.remove();
    }
  }

  /**
   * Cancel.  This is called from the Cancel button
   */
  cancel () {
    this.view.remove();
  }
}

// LoadDialog.openInWorld()
const LoadDialog = component(GalyleoWindow, {
  defaultViewModel: LoadDialogModel,
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
    add(part(GalyleoSearch, { name: 'file input', placeholder: 'url/to/dashboard' })),
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

export class Dashboard extends DashboardCommon {
  /** //this.loadDemoDashboard('presidential-elections/elections')
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

      expose: {
        get () {
          return [
            'clear', 'checkAndLoad', 'checkPossibleRenameFromBrowser',
            'checkPossibleRename', 'dependencyGraph', 'testDashboards',
            'loadTestDashboard', 'loadDashboardFromFile', 'checkAndSave',
            'saveDashboardToFile', 'prepareJSONForm', 'restoreFromJSONForm', 'getColumnsOfType',
            'openDialog', 'confirm', 'isDirty', 'clearSnapshots', 'commands', 'init',
            'tables', 'addTable', 'tableNames', 'views', 'viewNames', 'update',
            'addView', 'createViewEditor', 'filters', 'addFilter', 'removeFilter', 'filterNames',
            'charts', 'chartNames', 'addChart', 'editChartStyle', 'removeChart', 'createExternalFilter',
            'relayout', 'dataManager'

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
    super.clear();
    if (this.dashboardController) {
      this.dashboardController.update();
    }
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
          complexMorphicProperties: this._complexMorphicFields(externalMorph)
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
   * A helper routine for _restoreFromSnapshot_ to turn charts, filters, and
   * morphs into an array of descriptors, suitable for restoration by
   * _restoreMorphsFromSaved_.  Broken out for legibility and debugging.
   * @param { object } snapObject - a snapshot turned into an object.
   * @returns { object[] } An array of the form {type: 'chart' | 'filter' | 'morph', descriptor: <descriptor>, name: [string]} if type is chart or filter there is also a name field.
   */
  _getObjectsFromSnapshot (snapObject) {
    const descriptors = [];

    const savedFilters = snapObject.filters.toJS();
    Object.keys(savedFilters).forEach(name => {
      descriptors.push({ type: 'filter', name: name, descriptor: savedFilters[name] });
    });
    const savedCharts = snapObject.charts.toJS();
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
   * Just call the _restoreFromSaved method in the superclass and then update the
   * controller.
   * @param { object } storedForm - An object created by _perpareSerialization
   */
  async _restoreFromSaved (storedForm) {
    await super._restoreFromSaved(storedForm);
    if (this.dashboardController) { this.dashboardController.update(); }
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
      editor = this.viewBuilders[viewName];
    } else {
      editor = part(ViewBuilder);
    }
    this._initViewEditor(editor, viewName);
    editor.center = $world.innerBounds().center();
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
    const dataTable = await this.prepareData(viewOrTable);
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

  /* -- Code that deals with Charts.  This takes care of prepping chart titles,
       calling the View code to get the data, and displaying the char  -- */

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
      this.dataManager.removeView(viewName);
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
      this.dataManager.removeTable(tableName);
      this.dashboardController.update();
    }
  }

  addView (viewName, spec) {
    super.addView(viewName, spec);
    this.dashboardController.update();
  }

  /**
   * Initialize. Just do the super, setup the controller, and initialize
   * JupyterLab
   */

  async init (controller) {
    this.dashboardController = controller;
    await super.init();
    this._initializeJupyterLabCallbacks();
    this.viewBuilders = {}; // list of open view builders, can have only 1 per view
    this.availableTables = {}; // dictionary of tables available from the Notebook, obtained from a get information request
  }

  /**
   * Each datatable is represented as a Data Manager GalyleoTable
   * and a name, which identifies it here.  This is called internally;
   * the externally visible method is (ATM) loadDataFromUrl.
   * ensures that the table dictionary exists, then just stores
   * the table and updates the controller.  Note that if the table
   * exists (this.tables[tableSpec.name] !== null), then the datatable
   * is overwritten.
   * @param { object } tableSpec - An object of the form {name: <name> table: { columns: <list of the form <name, type>, rows: <list of list of values>}}
   */
  addTable (tableSpec) {
    super.addTable(tableSpec);
    if (this.dashboardController) {
      this.dashboardController.update();
    }
    this.dirty = true;
  }

  /**
   * A utility to make an URL from a base and a method.  Designed so that 'https://foo.com/' and 'bar'
   * and 'https://foo.com' and 'bar' both return 'https://foo.com/bar'
   * @param{string} base -- the base URL
   * @param{string} method -- the rest of teh URL
   */
  _makeURL (base, method) {
    return base.endsWith('/') ? `${base}${method}` : `${base}/${method}`;
  }

  /**
   * Load a table from the URL given. This queries a GalyleoTableServer for the table.  Given a URL
   * it issues the query <url>/get_tables and searches the list of tables for the matching table name.
   * If it finds it, it loads it.  If not, returns an error.
   * is a list of values
   * @param { string } url - a URL.
   * @param { string } tableName - name of the table to search for
   * @param { boolean } checkUpdates -- if true, sets the data manager to check updates every updateInterval seconds
   * @para { int } updateInterval -- interval (in seconds) to check for updates
   */
  async loadDataFromUrl (url, tableName, checkUpdates, updateInterval) {
    try {
      const tableSpecURL = this._makeURL(url, 'get_tables');
      const schemaText = await resource(tableSpecURL).read();
      const schemaDict = JSON.parse(schemaText);
      const connector = {
        url: url
      };
      if (checkUpdates) {
        connector.interval = updateInterval;
      }
      if (schemaDict) {
        if (schemaDict[tableName]) {
          this.addTable({ name: tableName, table: { columns: schemaDict[tableName], connector: connector } });
          return { result: true };
        } else {
          return { result: false, msg: `No table matching ${tableName} found at ${url}` };
        }
      } else {
        return { result: false, msg: 'No tables found at {url}' };
      }
    } catch (err) {
      console.log({ activity: `loading url ${url}`, error: err });
      return { result: false, msg: `Error return ${err} from ${url}` };
    }
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
      const tableColumns = tableName => this.tables[tableName].columns.map(column => column.name);
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
    super.addChart(chartName, chartSpecification, editChartStyle);

    if (this.dashboardController) {
      this.dashboardController.update();
    }

    if (editChartStyle) {
      this.editChartStyle(chartName);
    }
    this.dirty = true;
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
