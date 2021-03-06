class Dashboard extends Morph {
  /* Properties.
   * 1. Tables: a dictionary of the tables for this dashboard.  Each table
   *    is a Google Data Table.  See:
   *  https://developers.google.com/chart/interactive/docs/reference#DataTable
   * 2. filters.  A dictionary of filters for this dashboard.  Each filter is
   *   a morph of class NamedFilter.  The name of the Morph on the dashboard
   *   is the same as its name in this dictionary.
   * 3. views.  A view is an object of the form:
   *    a. tableName: the name of the underlying table
   *    b. columnNames: the names of the columns of the table, in the
   *       order in which they are to be shown in this view.  The order
   *       is significant: in particular, the leftmost column forms the X
   *       axis for any chart over this view
   *    c. namedFilters: the widgets which are used to select the rows for
   *       this view
   *    d. fixedFilters: the filters which don't correspond to widgets but are
   *       applied consistently for the chart.
   * The view is a recipe for building a DataView Object.  See:
   * https://developers.google.com/chart/interactive/docs/reference#DataView
   * 4. Charts.  A chart is an object of the form:
   *    a. chartMorph: the instance of googleChartMorph which holds the
   *        actual Chart.  The morph is a submorph of this, and the name of the
   *        morph is the name of the chart.
   *    b. chartType: a valid Google Chart type
   *    c. options: options to apply to the chart when rendered.  These are from
   *       the options for the chart, as specified in:
   *  https://developers.google.com/chart/interactive/docs/customizing_charts
   *    d. viewName: the name of the table or view with the data this chart is
   *        showing.  It must be one of the keys in this.tables or this.views
   *  5. gViz: just a handle for the Google Visualization library.
   *  6. gCharts: a handle for the Google Charts Library.  Rarely used.
   *  7. l2lRoomName: a lively2lively room name for communicating with the
   *     JupyterNotebook. This is hardcoded for now; should be set with an input
   *     widget.
   */

  static get properties () {
    return {
      tables: { defaultValue: null, serialize: false },
      filters: { defaultValue: null },
      views: { defaultValue: null },
      charts: { defaultValue: null },
      gViz: { // wrapper for google.visualization
        derived: true,
        get () {
          return window.google.visualization;
        }
      },
      gCharts: { // wrapper for google.charts
        derived: true,
        get () {
          return window.google.charts;
        }
      }
    };
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
    if (changedArgs.oldValue.path == window.EXTENSION_INFO.currentFilePath) {
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
    if (changedInfo.type != 'rename') {
      return;
    }
    if (changedInfo.oldValue.path == window.EXTENSIONINFO.currentFilePath) {
      window.EXTENSION_INFO.currentFilePath = changedInfo.newValue.path;
      this._updateProjectName_();
    }
  }

  /* -- Code which clears, stores, and loads dashboards from file -- */

  // Clear the dashboard of all charts, views, tables, and filters.  This
  // is used in new, and also internally by restoreFromJSONForm.
  clear () {
    this.tables = {};
    this.views = {};
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
    this.removeAllMorphs();
    this.dirty = false;
    if (this.dashboardController) {
      this.dashboardController.update();
    }
  }

  // converts the filePath into a jupyterlab:// resource, checks if
  // the file exists, and checks to ensure if its contents are a valid
  // Galyleo intermediate form.  If all of that passes, sets the currentFilePath
  // to the file input and loads the stored form.  If anything fails, throws up
  // an alert.  Returns true if everything worked, false otherwise
  // Called from  LoadDialog.load() and this.loadDashboard()
  // parameters:
  //   filePath: path to the Galyleo file

  async checkAndLoad (filePath) {
    const jupyterLabURL = resource(`jupyterlab://${filePath}`);
    if (await jupyterLabURL.exists()) {
      const dashboardContents = await jupyterLabURL.read();
      if (dashboardContents.length == 0) {
        // new file
        this.clear();
        window.EXTENSION_INFO.currentFilePath = filePath;
        this._updateProjectName_();
        return true;
      }
      const check = this.checkJSONForm(dashboardContents);
      if (check.valid) {
        this.restoreFromJSONForm(dashboardContents);
        window.EXTENSION_INFO.currentFilePath = filePath;
        this._updateProjectName_();
        this.l2lRoomName = filePath;
        this._rejoinL2LRoom_();
        return true;
      } else {
        $world.alert(check.message);
        return false;
      }
    } else {
      // should we create if it doesn't exist?  discuss.  Easy to do; take
      // creation code from checkAndSave
      $world.alert(`${filePath} does not exist`);
      return false;
    }
  }

  // The current set of test dashboards.  To load a test,
  // this.loadDashboardFromURL(this.testDashboards.name)
  // It's an object, and needs to be maintained as the test

  get testDashboards () {
    const dashboards = ['morphsample', 'mtbf_mttr_dashboard', 'test_one', 'testempty', 'testsolid', 'simple_test_table', 'test_views'];
    const result = {};
    const prefix = 'https://raw.githubusercontent.com/engageLively/galyleo-test-dashboards/main';
    dashboards.forEach(name => result[name] = `${prefix}/${name}.gd.json`);
    return result;
  }

  // Convenience method to load a test dashboard easily by name

  loadTestDashboard (dashboardName) {
    const dashboardUrl = this.testDashboards[dashboardName];
    if (dashboardUrl) { this.loadDashboardFromURL(dashboardUrl); }
  }

  // load a dashboard from an URL.  Uses checkAndLoad to do the actual work.
  // This is primarily to support testing -- test dashboards have URLs.  ATM,
  // no parameters or options aside from the URL; if there are other use cases
  // these can be added later.
  // parameters:
  //    anURL -- the URL to load from

  async loadDashboardFromURL (anURL = 'https://raw.githubusercontent.com/engageLively/galyleo-test-dashboards/main/mtbf_mttr_dashboard.gd.json') {
    try {
      const jsonForm = await resource(anURL).readJson();
      const check = this.checkIntermediateForm(jsonForm);
      if (check.valid) {
        await this._restoreFromSaved_(jsonForm);
      } else {
        $world.alert(check.message);
      }
    } catch (error) {
      $world.alert(`Error loading from ${anURL}`);
    }
  }

  // load a dashboard, optionally from a given path, and optionally
  // prompting from a file dialog.  Uses checkAndLoad to do the heavy lifting
  // This is called from the JupyterLab extension.
  // if showDialog = true and the filePath is non-empty, uses the path
  // as an initial value for the load dialog
  // parameters:
  //   showDialog: get the file name to load from the user,
  //   path: the file path to load.  Optionally empty
  async loadDashboardFromFile (filePath, showDialog) {
    if (this.dirty) {
      if (!await this.confirm('Warning!  Unsaved changes in current dashboard.  Proceed anyway?')) {
        return;
      }
    }
    if (showDialog) {
      const dialog = await resource('part://$world/galyleo/loadDialog').read();
      dialog.init(this, filePath);
      dialog.openInWorld();
    } else {
      this.checkAndLoad(filePath);
    }
  }

  // converts the filePath into a jupyterlab:// resource, checks if
  // the file exists.  If it doesn't  but the directory exists, create
  // the file, writes the stored form, and updates the current file path.
  // to the file input and loads the stored form.  If anything fails, throws up
  // an alert.  Returns true if everything worked, false otherwise
  // Called from  SaveDialog.save() and this.saveDashboard()
  // parameters:
  //   filePath: path to the Galyleo file

  async checkAndSave (filePath) {
    const jupyterLabURL = resource(`jupyterlab://${filePath}`);
    if (!await jupyterLabURL.exists()) {
      try {
        await jupyterLabURL.createFile();
      } catch (error) {
        window.alert(`Could not create ${filePath} because: ${error}`);
        return false;
      }
    }
    window.EXTENSION_INFO.currentFilePath = filePath;
    jupyterLabURL.write(this.prepareJSONForm());
    this._updateProjectName_();
    this.dirty = false;
    return true;
  }

  // save a dashboard,  optionally
  // prompting from a file dialog.  Uses checkAndSave to do the heavy lifting
  // This is called from the JupyterLab extension.
  // if showDialog = true or the filePath is empty, displays the dialog.  if the
  // file path is non-empty, uses the path as an initial value for the save dialog
  // parameters:
  //   showDialog: get the file name to save from the user,
  async saveDashboardToFile (showDialog) {
    const filePath = window.EXTENSION_INFO.currentFilePath;
    const needToShowDialog = !(filePath && filePath.length > 0);
    if (showDialog || needToShowDialog) {
      const dialog = await resource('part://$world/galyleo/saveDialog').read();
      dialog.init(this, filePath);
      dialog.openInWorld();
    } else {
      this.checkAndSave(filePath);
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

  onSubmorphChange (change, submorph) {
    super.onSubmorphChange(change, submorph);
    // only do this if one of the registered morphs has changed
    // we shoot ourselves in the knee by dropping other stuff onto
    // here
    if (!this._restore && change.prop == 'position') {
      this._takeSnapshot();
    }
  }

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

  onDrag (evt) { /* prevent default */ }

  async openDialog (dialogPartUrl) {
    const dialog = await resource(dialogPartUrl).read();
    dialog.openInWorld();
    dialog.center = $world.innerBounds().center();
    return dialog;
  }

  async confirm (ask) {
    const confirmDialog = await this.openDialog('part://$world/galyleo/confirm prompt');
    confirmDialog.build({ label: ask });
    return await confirmDialog.activate();
  }

  // async revertToPrevSnapshot () {
  //   this._restore = true;
  //   // _restoreFromSaved is too expensive. Do smart restoration instead
  //   await this._restoreFromSaved_(this._snapshots.pop().toJS());
  //   this._restore = false;
  // }

  isDirty () {
    return this._snapshots.length > 0;
  }

  clearSnapshots () {
    this._snapshots = [];
    this._changePointer = 0;
  }

  _morphSnapshot_ (aMorph) {
    const type = getClassName(aMorph);
    const storedForm = {
      type: type,
      position: aMorph.position,
      extent: aMorph.extent,
      name: aMorph.name,
      morphIndex: this.submorphs.indexOf(aMorph),
      morphicProperties: this._getFields_(aMorph, this._morphicFields_),
      complexMorphicProperties: this._complexMorphicFields_(aMorph)
    };
    if (type == 'Text') {
      storedForm.textProperties = this._getFields_(aMorph, this._textFields_);
      storedForm.complexTextProperties = this._complexTextFields_(aMorph);
    } else if (type == 'Image') {
      storedForm.imageUrl = aMorph.imageUrl;
    }
    return storedForm;
  }

  _takeSnapshot () {
    if (!this._snapshots) this._snapshots = [];

    if (typeof this._changePointer === 'undefined') {
      this._changePointer = Math.max(0, this._snapshots.length - 1);
    }

    // discard rest of snapshots if change pointer set back previously
    this._snapshots = this._snapshots.slice(0, this._changePointer + 1);
    const allMorphs = this.submorphs.filter(morph => !(morph.isFilter || morph.isChart));

    // inititalize the snapshot, or retrieve the last one we stored
    const snap = arr.last(this._snapshots) || Immutable.fromJS(this._prepareSerialization_());
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
    ).updateIn(['dataManagerTables'], tables =>
      this.dataManager.tableNames.reduce(
        (tables, tableName) =>
          tables.set(tableName, this.dataManager.tables[tableName]), // treat tables as values
        tables)
    ).updateIn(['dataManagerViews'], views =>
      this.dataManager.viewNames.reduce(
        (views, viewName) =>
          views.set(viewName, this.dataManager.views[viewName]), // viewNames are strings, and therefore values
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
          morphIndex: this.submorphs.indexOf(morph),
          morphicProperties: this._getFields_(morph, this._morphicFields_),
          complexMorphicProperties: this._complexMorphicFields_(morph)
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
          morphIndex: this.submorphs.indexOf(externalMorph),
          morphicProperties: this._getFields_(externalMorph, this._morphicFields_),
          complexMorphicProperties: this._complexMorphicFields_(morph)
        }));
      }, filters)
    ).updateIn(['morphs'], morphs =>
      allMorphs.reduce((morphs, aMorph) => {
        return morphs.updateIn([aMorph.name], Immutable.Map(), current => current.mergeDeep(this._morphSnapshot_(aMorph)));
      }, morphs)
    );
    newSnap.set('numMorphs', this.submorphs.length);
    this._snapshots.push(newSnap); // this returned snap reuses a bulk of the existing stored date, so it only contributes what has actually changed to the total memory expended in the system.
    this._changePointer = this._snapshots.length - 1;

    const { dashboardFilePath } = this.get('galyleo');
    window.parent.postMessage({ method: 'galyleo:setDirty', dirty: true, dashboardFilePath }, '*');
  }

  // Get a field from an object, making sure it's valid, and returning the default if it isn't
  // parameters:
  //    source: the source object containing the field
  //    field: an object of the form {name, validCheck, default}
  _getFieldValue_ (source, field) {
    const value = source[field.name];
    return field.validCheck(value) ? value : field.default;
  }

  // get fields from an object.  This is a utility used by _prepareSerialization_
  // to pull out morphic and text properties.  The return type is used for assignment if it's valid
  // parameters:
  //   fields: fields to pull from the object.  These will be in the form {name, validCheck, default}
  //   object: object to pull the values from

  _getFields_ (object, fields) {
    const result = {};
    fields.forEach(field => result[field.name] = this._getFieldValue_(object, field));
    return result;
  }

  // The simple fields to pull from a morph/put into a morph.  These are rotation, scale, clipMode, and opacity.  clipMode
  // must be one of 'hidden', 'visible', 'auto', 'scroll', the other three are numbers.  scale must be positive
  // and opacity in [0,1]
  // returns a list of objects of the form {name, validCheck, defaultValue}

  get _morphicFields_ () {
    const clipModes = ['hidden', 'visible', 'auto', 'scroll'];
    return [
      { name: 'rotation', validCheck: rotation => !isNaN(rotation), default: 0 },
      { name: 'scale', validCheck: scale => !isNaN(scale) && scale > 0, default: 1 },
      { name: 'clipMode', validCheck: mode => clipModes.indexOf(mode) >= 0, default: 'visible' },
      { name: 'opacity', validCheck: opacity => !isNaN(opacity) && opacity >= 0 && opacity <= 1, default: 1 }
    ];
    // return ['rotation', 'scale', 'clipMode', 'opacity'];
  }

  // The simple fields to pull from/put into a textMorph.  fixedHeight and fixedWidth must be booleans, The various
  // enums (fontStyle, fontWeight, lineWrapping, textAlign, textDecoration) have their values taken from the
  // inspector menus for those properties.  Size must be a positive number, and fontFamily and textString are strings.
  // returns a list of objects of the form {name, validCheck, defaultValue}
  get _textFields_ () {
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

  // Get the morphic fields that must be set by function rather than
  // simply assigned.  This includes position, extent, fill, and border
  _complexMorphicFields_ (aMorph) {
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

  // Get the text fields that must be set by function rather than
  // simply assigned.  This includes fontColor and padding
  _complexTextFields_ (aMorph) {
    return {
      fontColor: aMorph.fontColor,
      padding: aMorph.padding,
      textAndAttributes: aMorph.textAndAttributes
    };
  }

  // prepare the properties as a JSON document.  This is to support
  // load/save/save as and persist the tables.  Just involves the JSON of
  // each object in tables/filters/views/charts, save that we don't serialize the
  // morphs for filters and charts, just the type (in the case of the chart, the
  // options), extent, and postion of each morph.

  _prepareSerialization_ () {
    const resultObject = {
      fill: this.fill ? this.fill.toJSExpr() : null,
      tables: {},
      views: {},
      charts: {},
      filters: {},
      morphs: {}
    };

    // Code which converts a table from Google Data Table form (still used internally) to
    // the abstract engageLively format
    const serializeTable = table => {
      const columns = table.cols.map(col => {
        return { name: col.id, type: col.type };
      });
      const rows = table.rows.map(row => {
        return row.c.map(cell => cell.v);
      });
      return { rows, columns };
    };

    this.tableNames.forEach(tableName => resultObject.tables[tableName] = serializeTable(this.tables[tableName]));
    this.viewNames.forEach(viewName => resultObject.views[viewName] = this.views[viewName]);
    this.chartNames.forEach(chartName => {
      const chart = this.charts[chartName];
      const morph = chart.chartMorph;
      const result = {
        chartType: chart.chartType,
        options: chart.options,
        viewOrTable: chart.viewOrTable,
        morphIndex: this.submorphs.indexOf(morph),
        // complexMorphicProperties: this._complexMorphicFields_(morph),
        morphicProperties: this._getFields_(morph, this._morphicFields_)
      };
      Object.assign(result.morphicProperties, this._complexMorphicFields_(morph));
      resultObject.charts[chartName] = result;
    });
    this.filterNames.forEach(filterName => {
      const externalMorph = this.filters[filterName].morph;
      const result = {
        savedForm: externalMorph.filterMorph.persistentForm,
        morphIndex: this.submorphs.indexOf(externalMorph),
        // complexMorphicProperties: this._complexMorphicFields_(externalMorph),
        morphicProperties: this._getFields_(externalMorph, this._morphicFields_)
      };
      Object.assign(result.morphicProperties, this._complexMorphicFields_(externalMorph));
      resultObject.filters[filterName] = result;
    });
    // save the text, rectangle, etc morphs
    resultObject.morphs = this.submorphs.map(morph => {
      if (morph.isChart || morph.isFilter) {
        return null; // already taken care of these
      }
      const result = {
        type: getClassName(morph),
        name: morph.name,
        morphIndex: this.submorphs.indexOf(morph),
        morphicProperties: this._getFields_(morph, this._morphicFields_)
        // complexMorphicProperties: this._complexMorphicFields_(morph)
      };
      Object.assign(result.morphicProperties, this._complexMorphicFields_(morph));
      if (result.type == 'Image') {
        result.imageUrl = morph.imageUrl;
      }
      if (result.type == 'Text') {
        // result.complexTextProperties = this._complexTextFields_(morph);
        result.textProperties = this._getFields_(morph, this._textFields_);
        Object.assign(result.textProperties, this._complexTextFields_(morph));
      }
      return result;
    }).filter(morph => morph);
    resultObject.numMorphs = this.submorphs.length;
    return resultObject;
  }

  // Make sure a JSON form is OK.  This parses a JSON string into an object and
  // uses checkIntermediateForm to see that the parsed object is OK
  // parameters.
  //   string: the string to check
  checkJSONForm (string) {
    const dashboardObject = JSON.parse(string);
    return this.checkIntermediateForm(dashboardObject);
  }

  // Make sure a JSON form is OK.  This makes sure the parsed object
  // has Tables, Views, Filters, and Charts and no extraneous fields
  // Returns {valid: true/false, message: <explanatory message if false}.
  // Primarily designed for the various load routines
  // parameters.
  //   dashboardObject: the object to check

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
    if (missingFields.length == 0 && newFields.length == 0) {
      return { valid: true };
    } else {
      const missingMessage = `was missing fields ${missingFields}`;
      const unexpectedMessage = `had unexpected fields ${newFields}`;
      const message = missingFields.length == 0 ? `File ${unexpectedMessage}` : newFields.length == 0 ? `File ${missingMessage}` : `File ${missingMessage} and ${unexpectedMessage}`;
      return { valid: false, message: message };
    }
  }

  // Reorder morphs to mirror their stored order, in the parameter orderedMorphs.  This is so morphs on the
  // dashboard retain their z-index (effectively, their morph order)
  // parameter:
  //  orderedMorphs, the morphs in their desired order
  _reorderMorphs_ (orderedMorphs) {
    if (orderedMorphs == null) {
      return;
    }
    const nonNulls = orderedMorphs.filter(morph => morph);
    // make sure there are no submorphs we missed, and remove all the submorphs we have
    this.submorphs.forEach(m => {
      if (nonNulls.indexOf(m) < 0) {
        nonNulls.push(m);
      }
      m.remove();
    });
    // add all the submorphs back, in the right order
    nonNulls.forEach(m => {
      this.addMorph(m);
    });
  }

  // A helper routine for _restoreFromSnapshot_ to turn charts, filters, and
  // morphs into an array of descriptors, suitable for restoration by
  // _restoreMorphsFromSaved_.  Broken out for legibility and debugging.
  // parameter:
  //   snapObject: a snapshot turned into an object
  // returns:
  //   an array of the form {type: 'chart' | 'filter' | 'morph', descriptor: <descriptor}
  //   if type is chart or filter there is also a name field

  _getObjectsFromSnapshot_ (snapObject) {
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

  // Restore the saved form from a snapshot (see _takeSnapshot).  This is experimental code ATM.
  // Looks very similar to _restoreFromSaved_, and in fact the principal difference is that the
  // get from the stored form in this case is a call to .toObject() (see Immutable.js) instead of
  // directly accessing the stored form in _restoreFromSaved_.  The heavy lifting is done by
  // two helper routines, _restoreFilterFromSaved_ and _restoreChartFromSaved_, which are also called
  // for the same purpose from _restoreFromSaved_
  // parameter:
  //   snapshot: an element of this._snapshots

  async _restoreFromSnapshot_ (snapshot) {
    if (this._restore) {
      return;
    }
    this._restore = true;
    try {
      this.clear();
      const snapObject = snapshot.toObject();
      this.tables = snapObject.tables.toObject();
      this.views = snapObject.views.toObject();
      const descriptors = this._getObjectsFromSnapshot_(snapObject);
      await this._restoreMorphsFromDescriptors_(descriptors);
      this.dataManager.tables = snapObject.dataManagerTables.toObject();
      this.dataManager.views = snapObject.dataManagerViews.toObject();

      /* const restoredFilters = await Promise.all(Object.keys(savedFilters).map(async filterName => {
        const savedFilter = savedFilters[filterName].toObject();
        const filterMorph = await this._restoreFilterFromSaved_(filterName, savedFilter);
        addMorphToOrderList(filterMorph, savedFilter);
        return filterMorph;
      }));

      const restoredCharts = await Promise.all(Object.keys(savedCharts).map(async chartName => {
        const storedChart = savedCharts[chartName];
        const chartMorph = await this._restoreChartFromSaved_(chartName, storedChart);
        addMorphToOrderList(chartMorph, storedChart);
        return chartMorph;
      }));
      const savedMorphs = snapObject.morphs.toObject();
      const morphNames = Object.keys(savedMorphs);
      morphNames.forEach(morphName => {
        const descriptor = savedMorphs[morphName].toJS();
        const restored = morph({ type: descriptor.type });
        restored.name = descriptor.name;
        addMorphToOrderList(restored, descriptor);
        this.addMorph(restored);
        this._setComplexFields_(restored, descriptor.complexMorphicProperties);
        this._setFields_(restored, descriptor.morphicProperties, this._morphicFields_);
        restored.position = Point.fromLiteral(descriptor.position);
        restored.extent = Point.fromLiteral(descriptor.extent);
        if (descriptor.type == 'Image') {
          restored.imageUrl = descriptor.imageUrl;
        }
        if (descriptor.type == 'Text') {
          this._setFields_(restored, descriptor.textProperties, this._textFields_);
          this._setComplexTextFields_(restored, descriptor.complexTextProperties);
        }
      });
      this._reorderMorphs_(orderedMorphs); */
      this.dashboardController.update();
    } catch (e) {
      console.log(`Error in _restoreFromSnapshot_ :${e}`);
    }
    this._restore = false;
  }

  /*
    This sets back the change history pointer by one and restores the
    snapshot at that position.
  */

  _undoChange () {
    if (!this._snapshots || this._snapshots.length == 0) return;
    this._changePointer = Math.max(0, this._changePointer - 1);
    this._restoreFromSnapshot_(this._snapshots[this._changePointer]);
  }

  /*
    This increases the change history pointer by one and restores the
    snapshot at that position.
  */
  _redoChange () {
    if (!this._snapshots || this._snapshots.length == 0) return;
    this._changePointer = Math.min(this._snapshots.length - 1, this._changePointer + 1);
    this._restoreFromSnapshot_(this._snapshots[this._changePointer]);
  }

  // A little utility to turn an RGBA struct (four fields, r, g, b, a, each
  // in the range [0,1]) into a Color, since Color.rgba requires r, g, b
  // to be in the range [0,255]
  // parameters:
  //    rgba: structure containing the color specification
  //    defaultColor: the color to use in case of error, including null
  _color_ (rgba, defaultColor = Color.white) {
    try {
      if (obj.isString(rgba)) {
        return new ExpressionSerializer().deserializeExprObj({
          __expr__: rgba,
          bindings: {
            'lively.graphics': ['Color']
          }
        });
      }
      return Color.rgba(rgba.r * 255, rgba.g * 255, rgba.b * 255, rgba.a);
    } catch (error) {
      return defaultColor;
    }
  }

  // return a point, which is either the first argument if it's valid or
  // the default, which is not checked and must be valid.  Called from
  // _setComplexFields_
  // parameters:
  //    literal -- the literal which should be a valid input to Point.fromLiteral
  //    defaultVal -- point to return in case it isn't'
  // returns:
  //    The valid point from literal, or default if it doesn't work
  _returnValidPoint_ (literal, defaultVal) {
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

  // Return a valid number of at least value min (the numbers we're interested in
  // don't have an upper bound), returning defaultVal if the number is a NaN or
  // too small.  If min is NaN, not checked
  // parameters:
  //    number -- the literal which should be a valid input to Point.fromLiteral
  //    defaultVal -- point to return in case it isn't
  //    minVal -- if supplied, number must be greater than minVal
  // returns:
  //    The number if it means the constraints, or defaultVal if not
  _returnValidNumber_ (number, defaultVal, minVal = null) {
    if (isNaN(number)) {
      return defaultVal;
    }
    if (isNaN(minVal)) {
      return number;
    }
    return number >= minVal ? number : defaultVal;
  }

  // Set the complexMorphicFields of a morph: these are recorded as
  // static data but must be restored through function calls
  // parameters:
  //   aMorph: morph to restore
  //   fieldDescriptor: descriptor containing the value of the morphic properties
  _setComplexFields_ (aMorph, fieldDescriptor) {
    aMorph.position = this._returnValidPoint_(fieldDescriptor.position, this.extent.scaleBy(0.5));
    // anyone have a better idea than 50x50?
    aMorph.extent = this._returnValidPoint_(fieldDescriptor.extent, pt(50, 50));
    aMorph.origin = this._returnValidPoint_(fieldDescriptor.origin, pt(0, 0));
    aMorph.fill = this._color_(fieldDescriptor.fill, Color.rgba(0, 0, 0, 0));
    const borderStyles = ['none', 'hidden', 'dashed', 'dotted', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'];

    const newBorder = {
      borderRadius: this._returnValidNumber_(fieldDescriptor.border.borderRadius, 0, 0),
      width: this._returnValidNumber_(fieldDescriptor.border.width, 0, 0),
      style: borderStyles.indexOf(fieldDescriptor.border.style) >= 0 ? fieldDescriptor.border.style : 'none',
      color: {}
    };

    const sides = ['top', 'bottom', 'left', 'right'];
    sides.forEach(side => newBorder.color[side] = this._color_(fieldDescriptor.border.color[side]), Color.rgba(0, 0, 0, 0));
    aMorph.border = newBorder;
    if (fieldDescriptor.hasOwnProperty('dropShadow')) {
      try {
        aMorph.dropShadow = new ShadowObject(fieldDescriptor.dropShadow);
        aMorph.dropShadow.color = this._color_(fieldDescriptor.dropShadow.color, Color.rgba(0, 0, 0, 0));
      } catch (error) {
        // what should we do?
      }
    }
  }

  // set the complex text fields (fontColor and padding) of a text morph
  // from a descriptor.
  // parameters:
  //   textMorph: morph to restore
  //   descriptor: descriptor containing the value of the text properties
  _setComplexTextFields_ (textMorph, descriptor) {
    textMorph.fontColor = this._color_(descriptor.fontColor, Color.black);
    // passing garbage to Rectangle.fromLiteral gives us what we'd use for default anyway
    textMorph.padding = Rectangle.fromLiteral(descriptor.padding);
    // similarly, passing garbage to textAndAttributes results in something sensible
    if (descriptor.textAndAttributes) {
      textMorph.textAndAttributes = descriptor.textAndAttributes;
    }
  }

  // Copy fields from a descriptor to a morph.  This is the mirror of _getFields_.
  // Similar to Object.assign() but copies only specific fields
  // Used by _restoreFromSaved_
  // parameters:
  //   morph -- morph to copy to
  //   descriptor -- descriptor to copy from
  //   fields -- fields to copy.  This is a list of the form [{name, validCheck, default}] and __getField__ returns the
  //             value to be used for each field (the value given if valid, default if not)
  _setFields_ (morph, descriptor, fields) {
    fields.forEach(field => morph[field.name] = this._getFieldValue_(descriptor, field));
  }

  // Restore from JSON form.  This involves parsing the JSON string and
  // restoring the tables, views, filters, and charts from the saved description
  // created in _prepareSerialization.
  // parameter:
  //   storedForm -- the stored form in a JSON string
  async restoreFromJSONForm (storedForm) {
    await this._restoreFromSaved_(JSON.parse(storedForm));
  }

  // The actual body of restoreFromJSONForm.  Broken out as a separate
  // routine for testing.
  // parameter:
  //   storedForm: an object created by _perpareSerialization

  async _restoreFromSaved_ (storedForm = this.storedForm/* Now as an object, not a JSON string */) {
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
        this.fill = this._color_(storedForm.fill, Color.white);
      }
      if (!this.dataManager) {
        this.dataManager = new GalyleoDataManager();
      }
      // The non-morph structures are easy....
      // this.tables = storedForm.tables;
      this.tables = {};
      Object.keys(storedForm.tables).forEach(tableName => {
        this.addTable({ name: tableName, table: storedForm.tables[tableName] });
      });
      Object.keys(storedForm.views).forEach(viewName => {
        this.views[viewName] = storedForm.views[viewName];
        this.dataManager.addView(viewName, storedForm.views[viewName]);
      });
      // charts and filters have been initialized to empty dictionaries by
      // clear

      // Now we need to add morphs, including filters and charts, in order in order
      // to preserve front-to-back ordering.  So the first step is just to collect
      // the descriptors of each type in unorderedDescriptors, keeping the
      // the information we need to instantiate them later

      Object.keys(storedForm.filters).forEach(filterName => {
        const savedFilter = storedForm.filters[filterName];
        unorderedDescriptors.push({ type: 'filter', filterName: filterName, descriptor: savedFilter });

        // const filterMorph = await this._restoreFilterFromSaved_(filterName, savedFilter);
      });

      Object.keys(storedForm.charts).forEach(chartName => {
        const storedChart = storedForm.charts[chartName];
        unorderedDescriptors.push({ type: 'chart', chartName: chartName, descriptor: storedChart });
      });

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

      await this._restoreMorphsFromDescriptors_(unorderedDescriptors);

      if (this.dashboardController) { this.dashboardController.update(); }
    } catch (e) {
      console.log(`Error in _restoreFromSaved_: ${e}`);
    }
    this._restore = false;
  }

  // Restore morphs from their descriptors, which were retrieved in _restoreFromSaved_
  // and _restoreFromSnapshot_.  Each descriptor is of the form
  // {type: 'chart' | 'filter' | 'morph', descriptor: <descriptor}, specific to
  // the type.  'chart' and 'filter' also have their names in the top level
  // structure.  This routine just (a) sorts the list of descriptors in ascending
  // order by descriptor.morphIndex, and then builds and adds the objects in order,
  // preserving morph order.  The actual building is done by one of the three next
  // methods, as appropriate for the type
  // parameter:
  //   descriptors, a list of descriptors.

  async _restoreMorphsFromDescriptors_ (descriptors) {
    const desc_sort = (desc1, desc2) => desc1.descriptor.morphIndex - desc2.descriptor.morphIndex;
    descriptors.sort(desc_sort);
    const morphs = await Promise.all(descriptors.map(async descriptor => {
      if (descriptor.type == 'chart') {
        return await this._restoreChartFromSaved_(descriptor.chartName, descriptor.descriptor);
      } else if (descriptor.type == 'filter') {
        return await this._restoreFilterFromSaved_(descriptor.filterName, descriptor.descriptor);
      } else {
        return this._restoreMorphFromSaved_(descriptor.descriptor);
      }
    }));
    this.dirty = false;
    return morphs;
  }

  // restore an internal filter from a saved form
  // parameters:
  //    savedFilter
  async _restoreInternalFilterFromSaved_ (savedFilter) {
    return await this.makeFilterMorph(savedFilter.columnName, savedFilter.filterType, savedFilter.part, savedFilter.tableName);
  }

  // restore the morphic properties to a morph from a saved form.
  // this is called from _restoreFilterFromSaved_, _restoreChartFromSaved_,
  // and _restoreMorphFromSaved_
  // parameters:
  //    savedForm: saved structure to pull the properties from
  //    morph: morph to assign them to
  _restoreMorphicProperties_ (savedForm, morph) {
    const complexPropertySource = savedForm.hasOwnProperty('complexMorphicProperties') ? savedForm.complexMorphicProperties : savedForm.morphicProperties;
    this._setComplexFields_(morph, complexPropertySource);
    this._setFields_(morph, savedForm.morphicProperties, this._morphicFields_);
  }

  // restore an external filter from a saved form.
  // parameters:
  //    filterName -- name of the filter to be restored
  //    savedFilter -- The saved filter from the stored form

  async _restoreFilterFromSaved_ (filterName, savedFilter) {
    // filterName = 'test'
    // savedFilter = savedFilter
    let storedFilter = savedFilter.savedForm;
    if (storedFilter.toJS) storedFilter = storedFilter.toJS();
    const externalFilterMorph = await this.createExternalFilter(filterName, storedFilter.columnName, storedFilter.filterType, storedFilter.part, storedFilter.tableName);
    externalFilterMorph.filterMorph.restoreFromSavedForm(storedFilter);
    // externalFilterMorph.opacity = 0; // avoid flicker
    this._restoreMorphicProperties_(savedFilter, externalFilterMorph);
    await externalFilterMorph.whenRendered();//
    return externalFilterMorph;
  }

  // restore a chart from a saved form.
  // parameters:
  //    chartName -- name of the chart to be restored
  //    storedChart -- The saved chart from the stored form

  async _restoreChartFromSaved_ (chartName, storedChart) {
    if (storedChart.toJS) storedChart = storedChart.toJS();
    const chartSpecification = {
      chartType: storedChart.chartType,
      options: storedChart.options,
      viewOrTable: storedChart.viewOrTable
    };
    await this.addChart(chartName, chartSpecification, false);
    const chartMorph = this.charts[chartName].chartMorph;
    // chartMorph.opacity = 0; // avoids flicker
    this._restoreMorphicProperties_(storedChart, chartMorph);
    await chartMorph.whenRendered();
    return chartMorph;
  }

  // restore a morph from a saved form
  // parameters:
  //    morphDescriptor: saved form of  the morph
  // this._restoreMorphFromSaved_(this.storedForm.morphs[0])
  // this._setComplexTextFields_(this.submorphs[0], this.storedForm.morphs[0].textProperties)

  _restoreMorphFromSaved_ (morphDescriptor) {
    const restoredMorph = morph({ type: morphDescriptor.type });
    restoredMorph.name = morphDescriptor.name;

    this._restoreMorphicProperties_(morphDescriptor, restoredMorph);
    if (morphDescriptor.imageUrl) {
      restoredMorph.imageUrl = morphDescriptor.imageUrl;
    }
    this.addMorph(restoredMorph);
    if (morphDescriptor.textProperties) {
      const complexTextFieldsSource = morphDescriptor.hasOwnProperty('complexTextProperties') ? morphDescriptor.complexTextProperties : morphDescriptor.textProperties;
      this._setFields_(restoredMorph, morphDescriptor.textProperties, this._textFields_);
      this._setComplexTextFields_(restoredMorph, complexTextFieldsSource);
    }
  }

  /* -- L2L Client Initialization and Code -- */

  //
  // Services exported from an L2L client.  In this case, the only
  // service ATM is in response to an [el-jupyter] message, and
  // the service is loading data contained in the package.

  get l2lDashboardServices () {
    const self = this;
    return {
      '[el-jupyter] message' (tracker, { sender, data }, ackFn, socket) {
        self.__logEntry__(`message ${data.entryType} from ${sender}`);
        self.__lastMessage__ = data.payload;
        self._processIncomingL2LMessage_(sender, data);
      }
    };
  }

  // Process an incoming L2L message from the Notebook.  This will be one of three:
  // a response to a request for information on what tables the underlying
  // Notebook offers, a table, or an acknowledgement of a sent message. In the
  // case of an acknowledgement, delete the acknowledged message from the
  // send queue (see _sendQueuedMessages_). In the case of a table, just add it;
  // in the case of an information supply, update the availableTables dictionary
  // with the response
  // parameters:
  //   sender: sender of the original message
  //   message: the payload of the original message
  _processIncomingL2LMessage_ (sender, message) {
    if (message.eventType == 'table queries') {
      this._addAvailableTablesFromMessage_(message.payload);
      this._sendAck_(sender, message.payload.number);
    } else if (message.eventType == 'load_table' || message.eventType == 'table response') {
      this.__addTableFromMessage__(message.payload);
      this._sendAck_(sender, message.payload._l2l_msgNumber_);
    } else if (message.eventType == 'ack') {
      // don't ack an ack.  The worst that will happen is an ack isn't received is
      // that the sender will just keep resending until it gets an ack, which will
      // eventually happen
      this._processAck_(sender, message.payload);
    } else {
      this.__logEntry__(`Unrecognized message event type ${message.eventType}`);
    }
  }

  // Send an acknowledgment to a received message.  Just send a simple message
  // {eventType: 'ack', sender: l2lclient.Id of the sender,
  // receivedMessageNumber: the _l2lMessageNumber_ of the received message}
  // parameters:
  //    sender: id of the sender
  //    messageNumber: number of the incoming message
  _sendAck_ (sender, messageNumber) {
    this.__logEntry__(`Acknowledged message ${messageNumber} from ${sender}`);
    const payload = { originalSender: sender, receivedMessageNumber: messageNumber };
    this._rawSendMessage_({ event_type: 'ack', data: payload });
  }

  // Process an acknowledgement message.  Just go through the message queue and
  // see if it matches a message wairing to be sent; if so, it's been sent and
  // received by the room, so remove it from the queue.
  // FIXME: ATM, removes if it's been seen by ONE receiver; we are assuming
  // two-party communication.  Revisit when we have multiple parties in the room.
  // And is this the responsibility of the client or the server?
  // parameters:
  //    sender: sender of the acknowledgement
  //    ackBody: the body of an acknowledgement message; the fields we are interested in is
  //             sender (the sender of the message being acked), and receivedMessageNumber
  //             (number of the message being acked)
  _processAck_ (sender, ackBody) {
    if (!ackBody) {
      return;
    }
    const originalSender = ackBody.originalSender;
    const originalMessageNumber = ackBody.receivedMessageNumber;
    const processMessage = originalSender && originalSender == this.l2lclient.socketId &&
                            !isNaN(originalMessageNumber) && this._messageQueue_ &&
                            this._messageQueue_.length > 0;
    // If we get here, the message being acknowledged came from us, and we have
    // messages waiting for ack, so just remove this message from the queue.
    // Subtle timing issue: should we (and _sendMessage_, and
    // _sendQueuedMessages_) lock the message queue?  I don't think so,
    // because JavaScript is event-based and single-threaded,
    // so those timing bugs should be impossible.
    if (processMessage) {
      this._messageQueue_ = this._messageQueue_.filter(queueEntry => queueEntry.number != originalMessageNumber);
    }
  }

  // a Utility to to log entries.  The entries are activity-specific.
  //  Just shoves the given entry on the
  // log, with the time that it happened.
  // parameters:
  //     entry: a string or object that is the log entry

  __logEntry__ (entry) {
    if (!this.__log__) {
      this.__log__ = [];
    }
    this.__log__.push({ entry: entry, time: new Date() });
  }

  // Show the log.  I just got sick of looking for this...
  __showLog__ () {
    window.alert(this.__log__.map(entry => `${entry.time.toLocaleTimeString()}: ${entry.entry}`).join('\n'));
  }
  // this.l2lclient

  // Send message to the current room, adding a message number and ensuring it
  // is acknowledged by all participants.  Also adds the message to the queue to be
  // resent, with the time it was sent and the message number
  // parameters:
  //   message: message to be sent
  _sendMessage_ (message) {
    const msgNumber = this._currentMessageNumber_;
    this._messageQueue_.push({ number: msgNumber, message: message, time: Date.now() });
    this._rawSendMessage_(message, msgNumber);
    ++this.currentMessageNumber__;
  }

  // Send a message.  This is the only method that should actually ask l2lclient to
  // broadcast an [el-jupyter] message.  If it is given a number, as the second parameter,
  // puts _l2l_msgNumber_ in the message payload.
  // parameters:
  //   message: message to send, as an object
  //   msgNumber: Number to put in the _l2l_msgNumber_ field.  If undefined, omitted

  _rawSendMessage_ (message, msgNumber = undefined) {
    const sendMessage = isNaN(msgNumber) ? {} : { _l2l_msgNumber_: msgNumber };
    Object.assign(sendMessage, message);
    this.l2lclient.broadcast(this.l2lRoomName, '[el-jupyter] message', sendMessage);
  }

  // Time, in milliseconds.  To allow for an ack.  Set (currently) to 200 ms to allow
  // for wide-area delays.  Messages which are older than this will be resent

  get _msgTimeOut_ () { return 200; }

  get _updateInterval_ () { return 5000; }

  // Send the messages that have been waiting in the queue; if we haven't received
  // an ack they still need to be sent.  This is a stepping script that runs
  // every _msgTimeOut_ milliseconds.  Updates the network flap every _updateInterval_ milliseconds
  async _sendQueuedMessages_ () {
    if (isNaN(this._intervalCount_)) {
      this._intervalCount_ = 0;
    } else {
      this._intervalCount_++;
    }
    try {
      const currentTime = Date.now();
      if (this._messageQueue_ && this._messageQueue_.length > 0 && this.l2lRoomName) {
        if (this.l2lclient.isOnline()) {
          this._messageQueue_.forEach(messageSpec => {
            if (currentTime - messageSpec.time >= this._msgTimeOut_) {
              this._rawSendMessage_(messageSpec.message, messageSpec.number);
            }
          });
        }
      }
      try {
        if (this._intervalCount_ > this._updateInterval_ / this._msgTimeOut_) {
          await this.get('user flap').updateNetworkIndicator(this.l2lclient);
          this._intervalCount_ = 0;
        }
      } catch (error) {
        this.__logEntry__(`Error in update network indicator: ${error}`);
      }
    } catch (error) {
      try {
        this.__logEntry__(`Error in _sendQueuedMessages_: ${error}`);
      } catch (err) {
        console.log(err);
      }
    }
  }

  // Add entries to the AvailableTables dictionary
  // parameters:
  //   tableDictList -- a list of the form {tableName: tableName, parameters: <list of parameter names>}
  _addAvailableTablesFromMessage_ (tableDictList) {
    tableDictList.forEach(entry => {
      if (entry.tableName) {
        const parametersSpecified = entry.parameters && typeof entry.parameters === 'list';
        const parameters = entry.parameters ? entry.parameters : [];
        this.availableTables[entry.tableName] = parameters;
      }
    });
  }

  // This is the body of the stuff to do on receipt of a message from the Notebook.
  // Broken out so that we can independently test, catch errors, and so on.
  // The only action, ATM, is to add a table in response to a specification.

  __addTableFromMessage__ (payload) {
    try {
      this.addTable(payload);
      this.lastMessageParsed = true;
    } catch (err) {
      this.lastMessageParsed = false;
      this.__logEntry__({ error: err, action: `Parsing ${payload}` });
    }
  }

  get unsentMessages () {
    return this._messageQueue_ && this._messageQueue_.length > 0;
  }

  async checkStatus () {
    // await(this.checkStatus())
    if (!this.l2lclient) {
      return 'No client';
    }
    if (!this.l2lRoomName) {
      return 'No room';
    }
    const rooms = await this.l2lclient.listRoomMembers(this.l2lRoomName);
    const connected = Object.keys(rooms.sockets).filter(socket => socket);
    return connected.indexOf(this.l2lclient.socketId) >= 0 ? 'Connected' : 'Not Connected';
  }

  // Initialize the L2L Dashboard Services to read an [el-jupyter] message

  __initServices__ () {
    this.l2lclient.addServices(this.l2lDashboardServices);
    this.servicesRun = true;
  }

  // Rejoin the L2L Room, by default this.l2lRoomName.  Very simple --
  // checks to make sure that we haven't yet joined the room, and if we
  // haven't, join it.  This will be called when we initialize the L2L client
  // and on reconnection.

  async _rejoinL2LRoom_ (roomName = this.l2lRoomName) {
    if (!roomName) {
      return false;
    }
    if (roomName != this.l2lRoomName) {
      this.l2lRoomName = roomName;
    }
    if (this.l2lclient) {
      const inRoom = async (roomName) => await Object.keys(await this.l2lclient.joinedRooms()).indexOf(roomName) >= 0;
      /* if (await inRoom(roomName)) {
        return true;
      } */
      await this.l2lclient.joinRoom(this.l2lRoomName);
      return (await inRoom(roomName));
    }
  }

  // initialize the Lively2Lively Client to receive data from the Jupyter Notebook
  // Sets the room name to window.EXTENSION_INFO.room if it exists (IOW, if this
  // is running in JupyterLab), tells the client to rejoin the room on reconnection,
  // initializes the services to receive [el-jupyter] message, then joins the room
  // logs it and updates the status on the controller.

  async __initClient__ () {
    const c = L2LClient.ensure({
      url: resource(window.SERVER_URL || System.baseURL).join('/lively-socket.io').url,
      namespace: 'l2l',
      info: { type: 'lively.morphic browser' }
    });
    this.l2lclient = c;
    this._currentMessageNumber_ = 0;
    if (!this.l2lRoomName) {
      this.l2lRoomName = window.EXTENSION_INFO ? window.EXTENSION_INFO.room : 'dashboard room';
    }
    const dashboardClient = this;
    this.l2lclient.onReconnect = async _ => {
      const dateString = new Date().toLocaleDateString();
      console.log(`Reconnected at ${dateString}`);
      return await dashboardClient._rejoinL2LRoom_();
    };
    this.__initServices__();
    this.l2lclient.debug = true;
    this._messageQueue_ = [];
    this.startStepping(1000, '_sendQueuedMessages_');

    c.whenRegistered().then(async () => {
      const status = await this._rejoinL2LRoom_();
      if (this.dashboardController) {
        this.dashboardController.__updateConnectionStatus__();
      }
      const message = status ? 'Successfully joined ' : 'Failed to Join ';

      this.__logEntry__(message + this.l2lRoomName);
    }
    );
  }

  // Prompt to join a new L2L Room.  This is called from the extension
  // code in response to a user choosing a new room from the menu
  async promptRoom () {
    const prompt = await resource('part://$world/galyleo/roomDialog').read();
    prompt.init(this);
    prompt.openInWorld();
  }

  // Join a new L2L Room.  This is called from updateRoomName() in
  // RoomPrompt
  // parameters:
  //   newRoom: the name of the room to join
  async join (newRoom) {
    if (this.l2lRoomName) {
      if (this.l2lclient) {
        await this.l2lclient.leaveRoom(this.l2lRoomName);
      }
    }
    this.l2lRoomName = newRoom;
    await this.__initClient__();
  }

  // Ask a room for available tables.  No return, the result will be in
  // a table_queries message
  askForAvailableTables () {
    this._sendMessage_({ eventType: 'get data' });
    this.__logEntry__('Requested available tables');
  }

  /* -- Utility code to explore the global data structures  -- */

  // The serializer sticks in a bogus _rev entry into each object, and this filters
  // it out.  Use this to get the keys of the dictionaries in the properties
  // this.charts

  __getKeys__ (property) {
    return Object.keys(this[property]).filter(name => name != '_rev');
  }

  // The keys of the tables property

  get tableNames () {
    return this.__getKeys__('tables');
  }

  // The keys of the filters property

  get filterNames () {
    return this.__getKeys__('filters');
  }

  // The keys of the views property

  get viewNames () {
    return this.__getKeys__('views');
  }

  // The keys of the charts property

  get chartNames () {
    return this.__getKeys__('charts');
  }

  /* -- Code which deals with the creation and use of filters -- */

  // All names.  This is internal, for the use of nameOK -- it's just all the
  // names that have been taken in this dashboard, of filters, charts, and
  // submorphs
  get __allNames__ () {
    const names = this.submorphs.map(m => m.name);
    return names.concat(this.filterNames).concat(this.chartNames);
  }

  // Is this a valid name for a new filter?  */

  nameOK (aName) {
    return this.__allNames__.indexOf(aName) < 0;
  }

  // create an externalFilter.  The code for this was moved from
  // ExternalFilterCreator (it was the second half of createFilter).
  // The only ExternalFilterCreator is in a popup, so we can't use that;
  // as a result, due to the DRY principle, we move it here.  Calls makeFilterMorph
  // to make the actual filter, then wraps it in
  // inside an ExternalFilter.
  // Create the external filter, put it on the dashboard, and then connect
  // its filterChanged signal to the drawAllCharts method; this is
  // how a change in the filter is reflected on all the charts.
  // parameters:
  //   filterName: name of the filter and morph to be created
  //   columnName: name of the column to filter over
  //   filterType: type of the filter (Select or Range)
  //   filterPart: the part used to make the internal filter
  //   tableName: if non-null, only look for columns in this specfic table
  async createExternalFilter (filterName, columnName, filterType, filterPart, tableName) {
    const filterMorph = await this.makeFilterMorph(columnName, filterType, filterPart);
    const namedFilterMorphProto = await resource('part://Dashboard Studio Development/galyleo/named filter').read();
    namedFilterMorphProto.init(filterMorph, filterName);
    namedFilterMorphProto.position = pt(0, 0);
    connect(namedFilterMorphProto, 'filterChanged', this, 'drawAllCharts');
    this.addFilter(filterName, { morph: namedFilterMorphProto });
    this.addMorph(namedFilterMorphProto);
    return namedFilterMorphProto;
  }

  // make a filter.  This will be in one of two types: a Range Filter,
  // with a min and a max, or a select filter, which chooses a specific
  // value.  See classes RangeFilter and SelectFilter for implementation
  // of these.  A RangeFilter takes in the columnName for the filter,
  // and the min and max possible values; a SelectFilter takes in the column
  // name and all possible values to select from.
  // parameters:
  // columnName: the name of the filtered column.
  // filterType: one of Range, Select, NumericSelect
  // filterPart: A Part implementing the filter interface
  // tableName: if non-null, look at only columns in this table.  If null,
  // look at columns in every table.

  async makeFilterMorph (columnName, filterType, filterPart, tableName = null) {
    const morph = await resource(filterPart).read();
    if (filterType == 'Range') {
      const parameters = this.__getRangeParameters__(columnName, tableName);
      morph.init(columnName, tableName, parameters.min, parameters.max, parameters.increment);
    } else if (filterType == 'NumericSelect') {
      // Numeric values, with a max, min, and an increment between them.  The
      // idea is that we offer a numeric object, e.g., a slider, which lets
      // the viewer pick any value between max and min, separated by increment
      // Notice this works best when the column is regularly incrementd
      // Get all the values, throw out the non-numbers, and sort in ascending order
      let values = this.__getAllValues__(columnName, tableName);

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
      const types = this.__getTypes__(columnName, tableName);
      const isString = types && types.length == 1 && types[0] == 'string';
      const values = this.__getAllValues__(columnName);
      morph.init(columnName, values, tableName, isString);
    }
    return morph;
  }

  // get all the types associated with the column columnName in table
  // tableName.  Called by __makeFilterMorph__.
  // parameters:
  //   columnName: name of the column to get types for
  //   tableName: if non-null, look only in table named tableName

  __getTypes__ (columnName, tableName = null) {
    let columns = this.__allColumns__();
    columns = columns.filter(column => column.name == columnName);
    if (tableName) {
      columns = columns.filter(column => column.tableName == tableName);
    }
    const result = [];
    columns.forEach(column => {
      if (result.indexOf(columns.type) < 0) {
        result.push(column.type);
      }
    });
    return result;
  }

  // Get the number of columns for a view or a table
  // Called by the chart builder to figure out which chart types
  // to show for a particular chosen Table/View
  // this.getNumberOfColumns('PercentByParty')
  // this.getNumberOfColumns('presidential_vote')
  // Is this dead code now?
  // parameters:
  //   viewOrTable: the NAME of the view or table to get the number of columns
  getNumberOfColumns (viewOrTable) {
    if (this.tables[viewOrTable]) {
      return this.tables[viewOrTable].cols.length;
    } else if (this.views[viewOrTable]) {
      return this.views[viewOrTable].columns.length;
    } else {
      // should never get here
      return undefined;
    }
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
      editor.openInWorld();
      // but the editor must be initialized with the currently available
      // charts, filters, etc, as well as any updates to the columns of the underlying table
      editor.init(viewName, this);
    } else {
      editor = await resource('part://Dashboard Studio Development/galyleo/view builder').read();
      this._initViewEditor_(editor, viewName);
    }
    editor.center = $world.innerBounds().center();
  }

  // Initialize a view editor.  Just register it as the viewBuilder for this
  // view, open it in the world, position it in the center, and initialize it
  //  with the viewName and this.  If the viewBuilder already exists, it will
  //  be re-initialized.   We can turn this off with a boolean if desired
  // parameters:
  //    editor -- the editor to be initialized
  //    viewName -- the name of the view.
  _initViewEditor_ (editor, viewName) {
    this.viewBuilders[viewName] = editor;
    editor.openInWorld();
    editor.center = this.globalBounds().center();
    editor.init(viewName, this);
  }

  // Prepare the data for a view or a table.  This is used by
  // displayPreview and drawChart, to get the data ready to be plotted
  // parameters:
  //   viewOrTable: the name of the Table/View to prepare the data for
  // returns:
  //   a DataView or DataTable object
  prepareData (viewOrTable) {
    if (this.tableNames.indexOf(viewOrTable) >= 0) {
      return new this.gViz.DataTable(this.tables[viewOrTable]);
    } else if (this.viewNames.indexOf(viewOrTable) >= 0) {
      return this.__prepareViewData__(viewOrTable);
    } else {
      return null;
    }
  }

  // Preview a view or table
  // Shows the data in the Table/View in a window, using the Google Table
  // chart to show the data.
  // parameters:
  //    viewOrTable: the name of the view or table to show the data for.
  async displayPreview (viewOrTable) {
    const dataTable = this.prepareData(viewOrTable);
    if (dataTable == null) {
      return;
    }
    const wrapper = new this.gViz.ChartWrapper({
      chartType: 'Table',
      dataTable: dataTable,
      options: { width: '100%', height: '100%' }
    });
    const tableMorph = await resource('part://Dashboard Studio Development/googleChartMorph').read();
    tableMorph.init(viewOrTable, this);
    tableMorph.openInWindow();
    tableMorph.drawChart(wrapper);
  }

  // get a filter for a name.  The name is either the name of a filter
  // or the name of a chart, and so check both lists and return the filter
  // appropriately.  Used by __getFiltersForView__
  // parameters:
  //   widgetOrChartName: the name of a widget or a chart
  // returns:
  //   the associated filter object (or null if not found)
  __getFilterForName__ (widgetOrChartName) {
    if (this.filters[widgetOrChartName]) {
      return this.filters[widgetOrChartName].morph.filter;
    } else if (this.charts[widgetOrChartName]) {
      return this.charts[widgetOrChartName].filter;
    } else {
      return null;
    }
  }

  // check to see if a filter is valid: is non-null, and if a Select filter,
  // has a value property, and if a range filter, a max and a min that
  // are both numbers
  // parameters:
  //   aFilter: the filter to check for validity; it is an object suitable for
  //            GoogleDataTable.getFilteredRows()
  // returns:
  //   true if the filter is valid, false otherwise
  __filterValid__ (aFilter) {
    if (!aFilter) {
      return false;
    }
    const fields = Object.keys(aFilter);
    if (fields.indexOf('columnName') < 0) {
      return false;
    }
    if (fields.indexOf('minValue') >= 0) {
      return fields.indexOf('maxValue') >= 0 && !isNaN(aFilter.minValue) && !isNaN(aFilter.maxValue);
    }
    return fields.indexOf('value') >= 0 && aFilter.value != undefined && aFilter.value != '__no_selection__';
  }

  // get the filters for a view.  A view has a list of named filters, and
  // a filterList of internal filters (filters whose value is set when the
  // filter is created, and not by a dashboard widget or chart).  Extract
  // these, and return a list of objects suitable for use by
  // GoogleDataTable.getFilteredRows().
  // This is used by __prepareViewData__
  // parameters:
  //   view: a View structure created by the View Editor and stored as a value
  //         in this.views
  // returns:
  //    a list of objects suitable for use by GoogleDataTable.getFilteredRows()
  __getFiltersForView__ (view) {
    // const filters = view.filterList.map(filter => filter.filter).concat(view.filterNames.map(name => this.__getFilterForName__(name)));
    const filters = view.filterNames.map(name => this.__getFilterForName__(name));
    return filters.filter(filter => this.__filterValid__(filter));
  }

  // Prepare the data for a view.  A view has an underlying table,
  // named filters, a list of internal filters.  This method takes
  // the underlying table, uses the named columns of the view to
  // get the columns of the table, then runs all the filters over the
  // table to get the underlying rows, returning this in a Google Data View
  // object.  Used by prepareData
  // parameters:
  //   viewName: The name of the view to turn into a DataView object
  // returns:
  //    The data view object ready to be displayed.
  __prepareViewData__ (viewName) {
    const aView = this.views[viewName];
    if (!aView) {
      return;
    }
    const table = this.tables[aView.table];
    if (!table) {
      return;
    }
    const ids = table.cols.map(column => column.id);
    const columnIndexes = aView.columns.map(columnName => ids.indexOf(columnName));
    let filters = this.__getFiltersForView__(aView);
    filters.forEach(filter => filter.column = ids.indexOf(filter.columnName));
    filters = filters.filter(filter => filter.column >= 0);
    const dataTable = new this.gViz.DataTable(table);
    const dataView = new this.gViz.DataView(dataTable);
    if (filters.length > 0) {
      const rows = dataTable.getFilteredRows(filters);
      dataView.setRows(rows);
    }

    dataView.setColumns(columnIndexes);
    return dataView;
  }

  /* -- Code that deals with Charts.  This takes care of prepping chart titles,
       calling the View code to get the data, and displaying the char  -- */

  // Make the header string for a chart title.  This is called from
  // __makeTitleForTable__ and __makeTitleForView__.  If there
  // are fewer than two data series columns, it returns a string
  // of the form Series1, Series2 v Category Series.  Otherwise
  // it returns the ViewName.
  // parameters:
  //   categoryColumn: the name of the column of the X acis
  //   seriesColumns: the names of the data series columns
  //   viewOrTableName: the name of the view or table.
  __makeHeaderString__ (categoryColumn, seriesColumns, viewOrTableName) {
    if (seriesColumns.length <= 2 && seriesColumns.length > 0) {
      return `${seriesColumns.join(', ')} v ${categoryColumn}`;
    } else {
      return viewOrTableName;
    }
  }

  // make the title corresponding to a table.  This is used by a chart
  // when the chart is drawn.  Called by __makeTitle__.  Returns a string
  // which is the title.  The string will be of the form
  // column1Name, column2Name,..., columnNName v column0Name
  // parameters:
  //    a table which is a value in this.tables
  // returns:
  //    the string which is the title.
  __makeTitleForTable__ (aTable, tableName) {
    const seriesColumns = aTable.cols.slice(1).map(col => col.id);
    // const headerString = seriesColumns.join(', ');
    // return `${headerString} v ${aTable.cols[0].id}`;
    return this.__makeHeaderString__(aTable.cols[0].id, seriesColumns, tableName);
  }

  // make the title corresponding to a view.  This is used by a chart
  // when the chart is drawn.  Called by __makeTitle__.  Returns a string
  // which is the title.  The string will be of the form
  // column1Name, column2Name,..., columnNName v column0Name where filter1String,..
  // where a Select filter string is of the form columnName = selectedValue
  // and a Range filter string is of the form selectedMax >= columnName >= selectedMin
  // parameters:
  //    a table which is a value in this.views
  //    The name of the table/view
  // returns:
  //    The string which is the title.

  __makeTitleForView__ (aView, viewName) {
    const seriesColumns = aView.columns.slice(1);
    const headerString = this.__makeHeaderString__(aView.columns[0], seriesColumns, viewName);
    const filters = this.__getFiltersForView__(aView);
    const filterString = filter => {
      const fields = Object.keys(filter);
      const columnName = filter.columnName;
      if (fields.indexOf('value') >= 0) {
        return `${columnName} = ${filter.value}`;
      } else if (fields.indexOf('minValue') >= 0) {
        return `${filter.maxValue} >= ${columnName} >= ${filter.minValue}`;
      }
      return null;
    };
    if (filters.length > 0) {
      const filterStrings = filters.map(filter => filterString(filter));
      const realStrings = filterStrings.filter(string => string);
      const joinedString = realStrings.join(', ');
      return `${headerString} where ${joinedString}`;
    } else {
      return headerString;
    }
  }

  // make a title for the chart.  This will product a title of the form:
  // "<Data Series List> v <X Axis Name> where <filterValues>", where
  // <Data Series List> is just the names of the data series columns, comma-
  // separated, and <filterValues> is a comma-separated list of the form
  // <filter column name> = <filter value>
  // sticks the title in chart.options.title, which is turned into part of the
  // ChartWrapper when the chart is drawn.
  // parameters:
  //   chart: the chart to make the title for

  __makeTitle__ (chart) {
    if (chart.chartType == 'Table') {
      return;
    }
    let title; const name = chart.viewOrTable;
    if (this.tableNames.indexOf(name) >= 0) {
      title = this.__makeTitleForTable__(this.tables[name], name);
    } else if (this.viewNames.indexOf(chart.viewOrTable) >= 0) {
      title = this.__makeTitleForView__(this.views[name], name);
    } else {
      return null;
    }
    chart.options.title = title;
  }

  // Check to see if a filter is used in any view.  This is used by
  // __removeFilterOrChart__ to see if the filter/chart is being used
  // by any view
  // parameters:
  //   filterName: name of the filter (or chart) to be checked
  // returns:
  //   a list of the names of the views that use this filter
  __checkFilterUsed__ (filterName) {
    let filterUsedInView = viewName => {
      // return
      return this.views[viewName].filterNames.indexOf(filterName) >= 0;
    };
    return Object.keys(this.views).filter(viewName => filterUsedInView(viewName));
  }

  // Remove a filter or chart, first checking that it isn't being used, and if
  // it is, prompting the user to confirm.  This is internal (as witness the __
  // convention) and is called from removeFilter() and removeChart().  Note we
  // can't use removeMorph() directly to remove this, as that is overridden.
  // Instead, call super.removeMorph() directly.  Also, since
  // the dashboard controller maintains a list of charts and filters, when a chart
  // or filter is removed we update the controller.
  // parameters:
  //    filterOrChartName: name of the filter (or chart) to be checked
  //    dictionary: either this.filters (for a filter) or this.charts (for a chart)
  async __removeFilterOrChart__ (filterOrChartName, objectDict) {
    let morph = this.getSubmorphNamed(filterOrChartName);
    let usage = this.__checkFilterUsed__(filterOrChartName);
    let msg = `${filterOrChartName} is used in views ${usage.join(', ')}.  Proceed?`;
    let goAhead = usage.length > 0 ? await this.confirm(msg) : true;
    if (goAhead) {
      delete objectDict[filterOrChartName];
      if (morph) {
        super.removeMorph(morph);
      }
      if (this.dashboarcController) {
        this.dashboardController.update();
      }
    }
  }

  // Delete a filter, first checking to see if it's used in any View.
  //
  // parameters:
  //   filteName: name of the filter to be removed
  removeFilter (filterName) {
    this.__removeFilterOrChart__(filterName, this.filters);
  }

  // Delete a chart, first checking to see if it's used as a filter in any View.
  //
  // parameters:
  //   chartName: name of the chart to be removed
  removeChart (chartName) {
    this.__removeFilterOrChart__(chartName, this.charts);
  }

  // Override the removeMorph method.  We do this so that removal of a
  // chart morph or a named filter morph will also remove the relevant
  // chart (or filter) from the dictionaries we have here, using the removeChart
  // and removeFilter methods.
  // parameters:
  // aMorph: the morph to remove.

  removeMorph (aMorph) {
    if (aMorph.isFilter) {
      this.removeFilter(aMorph.name);
    } else if (aMorph.isChart) {
      this.removeChart(aMorph.name);
    } else {
      super.removeMorph(aMorph);
    }
  }

  // Remove a View, first checking if it is used in any chart
  // If it is, ask the user for confirmation first.  If the view is removed,
  // update the information in the sideboard
  // parameters:
  //   viewName: name of the view to be removed
  async removeView (viewName) {
    let usesView = chart => chart.viewOrTable == viewName;
    let usedBy = Object.keys(this.charts).filter(chartName => usesView(this.charts[chartName]));
    let msg = `${viewName} is used by charts ${usedBy.join(', ')}.  Proceed?`;
    let goAhead = usedBy.length > 0 ? await this.confirm(msg) : true;
    if (goAhead) {
      delete this.views[viewName];
      this.dashboardController.update();
    }
  }

  // Remove a Table, first checking if it is used in any chart or View
  // If it is, ask the user for confirmation first.  If the Table is removed,
  // update the information in the sideboard
  // parameters:
  //   tableName: name of the view to be removed
  async removeTable (tableName) {
    let chartUsesTable = chart => chart.viewOrTable == tableName;
    let viewUsesTable = view => view.table == tableName;
    let chartUses = Object.keys(this.charts).filter(chartName => chartUsesTable(this.charts[chartName]));
    let viewUses = Object.keys(this.views).filter(viewName => viewUsesTable(this.views[viewName]));
    let usedBy = chartUses.concat(viewUses);

    let msg = `${tableName} is used by ${usedBy.join(', ')}.  Proceed?`;
    let goAhead = usedBy.length > 0 ? await this.confirm(msg) : true;
    if (goAhead) {
      delete this.tables[tableName];
      this.dashboardController.update();
    }
  }

  // Update the l2lRoomName.  This is called from onLoad() and whenever
  // the file name changes.  Note that this doesn't initialize the client or
  // join a room, so that must be done separately.
  // No parameters.  Side effect: update the l2lRoomName
  _updatel2lRoomName_ (filePath) {
    const user = this.get('galyleo').user;
    this.l2lRoomName = user && user.length > 0 ? `${user}:${filePath}` : filePath;
  }

  // onLoad.  First, reset the error log to empty, wait for rendering, load
  // the google chart packages and make sure that the dictionaries are
  // initialized

  async onLoad () {
    this._enableLink(false);
    this.__log__ = [];
    await this.whenRendered();
    this.dataManager = new GalyleoDataManager();
    const filePath = this.get('galyleo').dashboardFilePath;
    this._updatel2lRoomName_(filePath);
    // await this.__initClient__();
    await this.__loadGoogleChartPackages__();
    ['charts', 'filters', 'tables', 'views'].forEach(prop => {
      if (!this[prop]) {
        this[prop] = {};
      }
    });
    if (window.EXTENSION_INFO && window.EXTENSION_INFO.currentFilePath && window.EXTENSION_INFO.currentFilePath.length > 0) {
      this.checkAndLoad(window.EXTENSION_INFO.currentFilePath);
    }

    this._updateProjectName_();
    this.gCharts.setOnLoadCallback(() => {
    });
    this._initializeJupyterLabCallbacks_();
    this.dirty = false;
    this.viewBuilders = {}; // list of open view builders, can have only 1 per view
    this.availableTables = {}; // dictionary of tables available from the Notebook, obtained from a get information request
    this._ensureUserAvatar();
    window.parent.postMessage({ method: 'galyleo:ready', dashboardFilePath: filePath }, '*');
  }

  async init () {
    await this.__loadGoogleChartPackages__();
    ['charts', 'filters', 'tables', 'views'].forEach(prop => {
      if (!this[prop]) {
        this[prop] = {};
      }
    });
    this._updateProjectName_();
    this.gCharts.setOnLoadCallback(() => {
    });
    this._initializeJupyterLabCallbacks_();
    this.dirty = false;
    this.viewBuilders = {}; // list of open view builders, can have only 1 per view
    this.availableTables = {}; // dictionary of tables available from the Notebook, obtained from a get information request
  }

  __additionally_serialize__ (snapshot, ref, pool, addFn) {
    super.__additionally_serialize__(snapshot, ref, pool, addFn);
    addFn('tables', JSON.stringify(this.tables));
  }

  __after_deserialize__ (snapshot, ref, pool) {
    super.__after_deserialize__(snapshot, ref, pool);
    this.tables = JSON.parse(this.tables);
  }

  // Load the Google chart packages.  Only called internally
  // parameters:
  // packageList: packages to be loaded.  default is the core chart package,
  //    the map package, and the chart editor.
  // Note: we're going to have to drop the mapsApiKey at some point.

  async __loadGoogleChartPackages__ (packageList = ['corechart', 'map', 'charteditor']) {
    await promise.waitFor(20 * 1000, () => !!window.google);
    await this.gCharts.load('current', { packages: packageList, mapsApiKey: 'AIzaSyA4uHMmgrSNycQGwdF3PSkbuNW49BAwN1I' });
  }

  // each datatable is represented as a Google Chart Data Table
  // and a name, which identifies it here.  This is called internally;
  // the externally visible method is (ATM) loadDataFromUrl.
  // ensures that the table dictionary exists, then just stores
  // the table and updates the controller.  Note that if the table
  // exists (this.tables[tableSpec.name] != null), then the datatable
  // is overwritten.
  // parameters:
  // tableSpec: an object of the form {name: <name> table: { columns: <list of the form <name, type>, rows: <list of list of values>}}

  addTable (tableSpec) {
    // should add some error-checking
    // tableSpec = this.lastTable
    this.lastTable = tableSpec;
    if (!this.tables) {
      this.tables = {};
    }
    if (!this.dataManager) {
      this.dataManager = new GalyleoDataManager();
    }
    this.dataManager.addTable(tableSpec.name, tableSpec.table);
    const columns = tableSpec.table.columns.map(column => {
      return { id: column.name, label: column.name, type: column.type };
    });
    const rows = tableSpec.table.rows.map(row => {
      return {
        c: row.map(value => {
          return { v: value };
        })
      };
    });
    // this.tables[tableSpec.name] = tableSpec.table;
    this.tables[tableSpec.name] = { cols: columns, rows: rows };
    if (this.dashboardController) {
      this.dashboardController.update();
    }
    this.dirty = true;
  }

  // load a table from the URL given.  This should do a little more error-checking
  // than it does.  In particular, it should check to make sure that tableSpec
  // is valid.
  // parameters:
  //    url: an URL.

  loadDataFromUrl (url) {
    // data must be in the JSON form {"name": name, "table": Google Data Table in JSON form}
    // Now uses abstracted view (see addTable) table must be in the form
    // {columns: rows: } where a column is a pair (name, type) and a row
    // is a list of values
    const r = resource(url);
    r.readJson().then(tableSpec => this.addTable(tableSpec),
      err => this.__logEntry__({ activity: `loading url ${url}`, error: err }));
  }

  // add a named filter.  This is called by ExternalFilterCreator.createFilter, and
  // that takes care of properly formatting the spec, creating the morph, adding
  // it to the dashboard, etc.
  // Note when the filterList is added to the controller, update() should be
  // called from here.
  // parameters:
  //    1. filterName: the name of the filter
  //    2. filterSpec: an object currently of the form {morph: <an External Filter Morph>}

  addFilter (filterName, filterSpec) {
    this.filters[filterName] = filterSpec;
    if (this.dashboardController) {
      this.dashboardController.update();
    }
    this.dirty = true;
  }

  // Add a view with a spec.  This simply adds the view, then calls
  // update on the dashboardController so that the view list is kept
  // up to date

  addView (viewName, viewSpec) {
    this.views[viewName] = viewSpec;
    this.dashboardManager.addView(viewSpec);
    if (this.dashboardController) {
      this.dashboardController.update();
    }
    this.dirty = true;
  }

  // A simple routine to consistency-check a dashboard.   This should
  // be called:
  // 1. Before any drawChart routine (we will use drawAllCharts, to avoid
  //    multiple popups)
  // 2. Before a save
  // This will return an OK or an object with error messages for display
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
      if (this.views[viewName].columns.length == 0) {
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
        return filter.table ? filter.table == tableName : filter.columnName && availableColumns.indexOf(filter.columnName) >= 0;
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

  // A convenience function which redraws all the charts on the page.
  // this is called when a filter has changed value.  This is done through
  // a connection on each named filter to this method.  The code that
  // makes the connection is in ExternalFilterCreator.createFilter.

  drawAllCharts () {
    const chartNames = this.chartNames;
    chartNames.forEach(name => this.drawChart(name));
  }

  // Make a wrapper for the chart.  This is the penultimate step before drawing;
  // a wrapper is the data structure Google Charts uses for editing and drawing
  // a chart.  The steps are:
  // 1. Prepare the data for the chart as a Google DataView.  This is selecting
  //    the subset of the table columns which are to be plotted and applying the
  //    filters to get the subset of the rows
  // 2. Creating the wrapper with the appropriate chartType and options;
  // 3. Setting the wrapper's DataTable to the view.
  // After this, the wrapper is returned to be drawn or edited.
  // This is used by drawChart and by editChartStyle
  // parameters:
  //     chart: the chart to make the wrapper for.
  // NB: wrappers are incompatible with the serializer, since they store the
  //     HTML Div of the chart.  Do not serialize.

  __makeWrapper__ (chart, chartName) {
    // this.__makeWrapper__(this.charts[this.chartNames[0]])
    const dataTable = this.prepareData(chart.viewOrTable);
    if (!dataTable) return null;
    const filter = this.__prepareChartFilter__(chart.viewOrTable);
    if (!filter) return null;
    if (!(chart.filter && chart.filter.columnName == filter.columnName)) {
      chart.filter = filter;
    }
    const wrapper = new this.gViz.ChartWrapper({
      chartType: chart.chartType,
      options: chart.options
    });
    this.lastChartType = [chart.chartType, wrapper.getType()];
    wrapper.setDataTable(dataTable);
    this.gViz.events.addListener(wrapper, 'select', e => { this.__updateChartFilter__(e, wrapper, chartName); });
    return wrapper;
  }

  // log chart events
  __updateChartFilter__ (e, wrapper, chartName) {
    const chart = wrapper.getChart();
    const table = wrapper.getDataTable();
    const selection = chart.getSelection();
    const row = selection[0].row == null ? null : selection[0].row;
    const col = selection[0].col == null ? 0 : selection[0].col;
    const value = table.getValue(row, col);
    if (this.charts[chartName].filter) {
      this.charts[chartName].filter.value = value;
      this.drawAllCharts();
    }

    const record = { event: e, wrapper: wrapper, chart: chart, value: value, name: chartName };
    if (!this.__chartEvents__) {
      this.__chartEvents__ = [record];
    } else {
      this.__chartEvents__.push(record);
    }
  }

  // Draw a chart.  This routine is very simple: get the chart for chartName,
  // make its title (this can't be made until just before the chart is drawn,
  // because the title incorporates filter values), make its wrapper, then
  // pass the wrapper to the chart's morph to be drawn
  // parameters:
  //    the name of the chart to be drawn.
  // this.drawChart('PartyPercentChart')undefined

  drawChart (chartName) {
    const chart = this.charts[chartName];
    if (!chart) return;
    this.__makeTitle__(chart);
    const wrapper = this.__makeWrapper__(chart, chartName);
    if (wrapper) {
      this.lastWrapper = wrapper;
      chart.chartMorph.drawChart(wrapper);
    }
  }

  // Edit the chart's type and physical appearance, using the Google Chart Editor
  // Simple.  First, create the editor, then get the chart corresponding to
  // chartName.  The editor uses a ChartWrapper, so create that for the chart.
  // Next, create the callback for when the editor is done.  This callback looks
  // at the wrapper the editor has created, and extracts out the relevant structures
  // for our chart specification, namely the chartType and options.  See above:
  // we can't serialize a wrapper, so we serialize the relevant chunks.  Finally,
  // the callback draws the chart, so the user sees the updates, and closes the
  // editor dialog.  Once the callback is defined, open the dialog on the input
  // wrapper we've created
  // parameters:
  //     chartName: the name of the chart whose style is to be edited

  editChartStyle (chartName) {
    // this.editChartStyle(Object.keys(this.charts)[1])
    const editor = new this.gViz.ChartEditor();
    const chart = this.charts[chartName];
    if (!chart) return;
    const wrapper = this.__makeWrapper__(chart, chartName);
    if (!wrapper) return;
    this.gViz.events.addListener(editor, 'ok', () => {
      const wrapperOut = editor.getChartWrapper();
      chart.chartType = wrapperOut.getChartType();
      chart.options = wrapperOut.getOptions();
      this.drawChart(chartName);
      editor.closeDialog();
    });
    editor.openDialog(wrapper);
  }

  // Add a chart, given a specification.  The specification is an entry in the
  // charts table (see the description under properties at the top).  Steps:
  // 1. give the chart a unique name, which we do by catenating the timestamp with a
  //    three-digit random number
  // 2. Get the morph for this chart, which will usually (in fact, always)
  //     create a new googleChartMorph for it
  // 3. Add the chartmorph to the specification and then store the specification
  //    under the chart name in the dictionary
  // 4. draw the chart
  // 5. Tell the controller to update itself, so the user sees the new chart name
  //    in the chart list
  // This is called by the ChartBuilder once the user clicks Create Chart.
  // parameters:
  //   chartName: name of the chart
  //   chartSpecification: specification of the new chart.
  //   editChartStyle (true/false, default true): edit the chart immediately upon creation

  async addChart (chartName, chartSpecification, editChartStyle = true) {
    chartSpecification.chartMorph = await this.__getChartMorph__(chartName);
    this.charts[chartName] = chartSpecification;
    if (this.dashboardController) {
      this.dashboardController.update();
    }
    chartSpecification.filter = this.__prepareChartFilter__(chartSpecification.viewOrTable);
    this.drawChart(chartName);
    if (editChartStyle) {
      this.editChartStyle(chartName);
    }
    this.dirty = true;
  }

  // create a filter for a chartSpecification, to add to the chart record.
  // Every chart is a Select filter, since clicking on the chart selects
  // an item from its category axis.  For example, clicking on a region
  // on a Geo Chart selects the region, clicking on a pie chart selects
  // the item represented by the wedge, and so on.  The category axis is
  // always column 0 of  the view/table, so we get that.  The __makeWrapper__
  // method attaches an event handler to update the value field of the filter.
  // parameters:
  //   viewOrTable: the name of the underlying view or table
  // returns:
  //   the filter object for the chart, to be added to the specification.
  __prepareChartFilter__ (viewOrTableName) {
    let filter, table;
    if (this.views[viewOrTableName]) {
      const view = this.views[viewOrTableName];
      filter = { columnName: view.columns[0] };
      table = view.table;
    } else if (this.tables[viewOrTableName]) {
      table = this.tables[viewOrTableName];
      filter = { columnName: table.cols[0].id };
      table = viewOrTableName;
    } else {
      return null;
    }
    const values = this.__getAllValues__(filter.columnName, table);
    if (values && values.length > 0) {
      filter.value = values[0];
    }
    return filter;
  }

  // get a morph for the chart with name chartName.  This is called by addChart.
  // It's essentially just building the chart from the googleChartMorph resource,
  // initializing it by passing in the chartName and this, the dashboard it belongs
  // to, adding it to this and setting its position to the top-left corner.
  // parameters:
  //    chartName: the name to find/create the chart morph for
  // returns:
  //    the new morph.

  async __getChartMorph__ (chartName) {
    const currentMorphsForChart = this.submorphs.filter(morph => morph.isChart && morph.name == chartName);
    if (currentMorphsForChart && currentMorphsForChart.length > 0) {
      return currentMorphsForChart[0];
    }
    const chartMorph = await resource('part://Dashboard Studio Development/googleChartMorph').read();
    chartMorph.init(chartName);
    this.addMorph(chartMorph);
    chartMorph.position = pt(0, 0);
    return chartMorph;
  }

  // get all the columns for all of the tables in the dashboard.  Returns a list
  // of objects, each of the form
  // {tableName: <table for this column>, index: the column index,
  //  name: the column name (id in Google), type: data type for the column}
  // this is used by most of the methods that have to deal with types and
  // columns.

  __allColumns__ () {
    // this.__allColumns__();
    const result = [];
    this.tableNames.forEach(tableName => {
      const table = this.tables[tableName];
      table.cols.forEach((column, index) => {
        result.push({ tableName: tableName, index: index, name: column.id, type: column.type });
      });
    });
    return result;
  }

  // Get all the columns that have a type which appears in typelist.  Optionally,
  // the table name is specified as well.
  // This method is principally used by FilterBuilders and ChartBuilders.
  // Very simple: get the set of columns from all columns, filter the
  // list to those columns whose types appear in typeList (and, if tableName is
  // specified, which belong to the right table), pull out the column names,
  // and make sure we don't have repeated names.  Sorts the result.
  // parameters:
  //    typeList.  List of types to search for.  Valid types are those which can
  //            be returned by Google DataTable.getColumnTypes.  See:
  // https://developers.google.com/chart/interactive/docs/reference#DataTable
  // These are: 'string', 'number', 'boolean', 'date', 'datetime', and 'timeofday'
  // If typeList is empty returns every column.
  //    tableName.  If non-null, only look at columns in this table.
  // Returns: a list of column names that match this type.  Column names appear
  // only once in this list.

  getColumnsOfType (typeList = [], tableName = null) {
    // this.getColumnsOfType(['number'])
    // this.tables
    const typeMatches = (type, typeList) => typeList.length == 0 || (typeList.indexOf(type) >= 0);
    if (!typeList) {
      typeList = [];
    }
    if (!this.tables) {
      return [];
    }
    let columns = this.__allColumns__();
    if (tableName) {
      columns = columns.filter(column => column.tableName == tableName);
    }
    columns = columns.filter(column => typeMatches(column.type, typeList));
    const result = [];
    columns.forEach(column => {
      if (result.indexOf(column.name) < 0) {
        result.push(column.name);
      }
    });
    return result;
  }

  // Return the records for all of the columns with a specific name (records in
  // the form returned by __allColumns__), and if tableName is non-null,
  // only those records within that table.  This is used by __getAllValues__
  // below
  // parameters
  //      name of the column
  //      name of the table (can be null)
  // returns
  //    list of records for that column

  __getMatchingColumns__ (columnName, tableName) {
    let columns = this.__allColumns__();
    columns = columns.filter(column => columnName == column.name);
    if (tableName) {
      columns = columns.filter(column => tableName == column.tableName);
    }
    return columns;
  }

  // Get the maximum and minimum values of the column with name columnName, and compute
  // an increment for a slider or other range finder over this column.  If
  // tableName is null, get the parameters over all columns with that name over
  // the dashboard.  If tableName is non-null, get only the parameters over this
  // table.
  // Computes the increment as the largest power of 10 less than or equal to the smallest
  // distance between elements.  So if the smallest difference is, say, 0.2, then the
  // increment is set to 0.1.  The smallest possible increment is the smallest power of
  // 10 <= (max - min)/1000, so there are never more than 10,000 increments.
  // Used by makeFilterMorph
  // Remarks: grossly inefficient and simple.  Uses __getAllValues__ which is itself
  // somewhat inefficiently implemented.
  // parameters:
  //    columnName: name of the column to get the max and min
  //    tableName: if non null restrict to columns in the named table
  // returns:
  //    A record of the form {min: minValue, max: maxValue, increment: increment}

  __getRangeParameters__ (columnName, tableName = null) {
    // this.__getRangeParameters__('Year')
    const powerOf10 = x => Math.pow(10, Math.floor(Math.log10(Math.abs(x))));
    const values = this.__getAllValues__(columnName, tableName);
    values.sort((a, b) => a - b);
    const result = { min: values[0], max: values[values.length - 1] };
    const shift = values.slice(1);
    const diff = shift.map((val, i) => val - values[i]).filter(d => d > 0);
    diff.sort((a, b) => a - b);
    const absoluteMin = (result.max - result.min) / 1000;
    const minDiff = diff.length > 0 ? Math.max(diff[0], absoluteMin) : absoluteMin;
    result.increment = powerOf10(minDiff);
    return result;
  }

  // Get all the values of a column.  The column here is a record of the form
  // output from __allColumns__, which has (among other things), fields tableName
  // and index.  From the tableName, dig out the rows, and then for each row,
  // find the value of the column for that row.  The awkward row.c[column.index].v
  // syntax is due to the JSON form of a Google DataTable; table[row,col] is stored
  // as table.rows[row].c[col].v.
  // iterate over the rows, getting the unique values.  This is O(n^2) in the worst
  // case, and can easily be improved to O(n lg n) if there is a performance issue.
  // A utility for __getAllValues__
  // parameter:
  //       column: a record of the form output by __allColumns__
  // returns:
  //       A list of unique values (no duplicates) in ascending order

  __getAllValuesForColumn__ (column) {
    const rows = this.tables[column.tableName].rows;
    const result = [rows[0].c[column.index].v];
    rows.slice(1).forEach(row => {
      const val = row.c[column.index].v;
      if (result.indexOf(val) < 0) {
        result.push(val);
      }
    });
    return result.sort();
  }

  // Get all the values for column(s) with name columnName.  If tableName is non-null,
  // restrict to the column with name columnName in that table.   Simple and inefficient.
  // use __getMatchingColumns__ to get the records of all columns with name columnName
  // (and tableName tableName if tableName is specified), use __getAllValuesForColumn__
  // to get the unique values for the column, and then add the unique values that haven't
  // been seen before to the result, and at the end sort it.
  // This is O(n^4), counting an O(n^2) __getAllValuesForColumn__. It could easily
  // be O(n lg n), by fixing __getAllValuesForColumn__, and using a merge step rather
  // than searching for repeated values.  If this is  a performance issue fix this.
  // Used by makeFilterMorph and __getRangeParameters__
  // parameters:
  //      columnName: name of the column(s) to get the values for
  //      tableName: if non-null, restrict search to the column in that table
  // returns:
  //       A list of unique values (no duplicates) in ascending order

  __getAllValues__ (columnName, tableName = null) {
    // this.__getAllValues__('Year')
    const columns = this.__getMatchingColumns__(columnName, tableName);
    let result = this.__getAllValuesForColumn__(columns[0]);
    columns.slice(1).forEach(column => {
      let newVals = this.__getAllValuesForColumn__(column);
      newVals = newVals.filter(val => result.indexOf(val) < 0);
      result = result.concat(newVals);
    });
    return result.sort();
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

  // this._enableLink(false);

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

  async publish () {
    const li = LoadingIndicator.open('publishing dashboard...');
    const snap = await createMorphSnapshot(this);
    const frozenPartsDir = await this._getPublicationResourceHandle().ensureExistance();
    li.status = 'writing files...';
    await frozenPartsDir.writeJson(snap);
    this._enableLink(true);
    li.remove();
  }
}
