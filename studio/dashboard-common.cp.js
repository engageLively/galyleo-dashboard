import { Morph, morph, ShadowObject } from 'lively.morphic';
import { ViewModel, part } from 'lively.morphic/components/core.js';
import { resource } from 'lively.resources/src/helpers.js';
import { pt, Rectangle, Point, Color } from 'lively.graphics/index.js';
import { obj, promise } from 'lively.lang';
import { connect } from 'lively.bindings/index.js';
import { ExpressionSerializer } from 'lively.serializer2/index.js';
import { NamedFilter, SelectFilter, BooleanFilter, DateFilter, DoubleSliderFilter, ListFilter, RangeFilter, SliderFilter } from './filters.cp.js';
import { GoogleChartHolder } from './chart-creator.cp.js';
import { checkSpecValid, GalyleoDataManager } from '../galyleo-data/galyleo-data.js';
import { loadViaScript } from 'lively.resources/index.js';
import { URL } from 'esm://cache/npm:@jspm/core@2.0.0-beta.26/nodelibs/url';
import { TableViewer } from './helpers.cp.js';

class DashboardCommon extends ViewModel {
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
      canvas: { // improve the naming to prevent confusion with views
        get () {
          return this.view;
        }
      },
      gViz: {
        derived: true,
        get () {
          return window.google ? window.google.visualization : null;
        }
      },
      gCharts: {
        derived: true,
        get () {
          return window.google ? window.google.charts : null;
        }
      },
      expose: {
        get () {
          return [
            'clear', 'checkAndLoad', 'checkPossibleRenameFromBrowser',
            'checkPossibleRename', 'displayPreview', 'dependencyGraph', 'testDashboards',
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

  // ensure a data manager.  This is called from init(), and
  // loadDashboardFromURL.  Just makes sure that there is a DataManager available

  _ensureDataManager_ () {
    if (!this.dataManager) {
      this.dataManager = new GalyleoDataManager();
    }
  }
  /* -- Code which clears, stores, and loads dashboards from file -- */

  // Clear the dashboard of all charts, views, tables, and filters.  This
  // is used in new, and also internally by restoreFromJSONForm.
  clear () {
    this._ensureDataManager_();
    this.dataManager.clear();
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
  }

  /**
   * Load all the demo dashboards.
   */
  async _loadAllDemoDashboards () {
    const url = 'https://raw.githubusercontent.com/engageLively/galyleo-examples/main/demos/manifest.json';
    const jsonForm = await resource(url).readJson();
    this._demoDashboards = jsonForm.dashboards;
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

  // The current set of demo dashboards.  To load a demo,
  get demoDashboards () {
    if (this._demoDashboards) {
      const result = {};
      const prefix = 'https://raw.githubusercontent.com/engageLively/galyleo-examples/main/demos';
      this._demoDashboards.forEach(name => result[name] = `${prefix}/${name}.gd.json`);
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

  // Convenience method to load a demo dashboard easily by name

  async loadDemoDashboard (dashboardName) {
    if (!this._demoDashboards) {
      await this._loadAllDemoDashboards();
    }

    const dashboardUrl = this.demoDashboards[dashboardName];
    if (dashboardUrl) { this.loadDashboardFromURL(dashboardUrl); }
  }

  _normalizeURL (anURL) {
    // make sure an URL really is an URL, and fix it if it isn't //anURL = 'foo.bar.com'
    try {
      const test = new URL(anURL);
      // it passes!  just return it
      return anURL;
    } catch (anError) {
      // OK, something to fix
    }
    // if the next attempt throws an error, we want the calling routine to catch it
    const test1 = 'http://' + anURL;
    const result = new URL(test1);

    // if we get here, that fixed it.  Now the only question is http or https.
    // IP addresses are http, names are https
    const hostNames = result.host.split(':')[0].split('.');
    const hostValues = hostNames.map(name => Number(name));
    const ipAddress = hostValues.reduce((ipAddr, value) => ipAddr && !isNaN(value), true);
    if (ipAddress) {
      return result.href;
    } else {
      return 'https' + result.href.slice(4);
    }
  }

  /**
   * Load a dashboard from an URL.  Uses checkAndLoad to do the actual work.
   *  ATM, no parameters or options aside from the URL; if there are other
   *  use cases these can be added later.
   * @param { string } anURL - The URL to load from.
   * @return { boolean } true on successful load
   */
  async loadDashboardFromURL (anURL = 'https://raw.githubusercontent.com/engageLively/galyleo-test-dashboards/main/mtbf_mttr_dashboard.gd.json') {
    try {
      const fixedUrl = this._normalizeURL(anURL);
      const loadResource = resource(fixedUrl);
      loadResource.useCors = false;
      const jsonForm = await loadResource.readJson();
      const check = this.checkIntermediateForm(jsonForm);
      if (check.valid) {
        await this._restoreFromSaved(jsonForm);
      } else {
        $world.inform(check.message);
      }
      return check.valid;
    } catch (error) {
      $world.inform(`Error loading from ${anURL}`);
      return false;
    }
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
      return { valid: false, message: 'Parsed JSON was not an Object' };
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
      { name: 'fontFamily', validCheck: family => typeof family === 'string', default: 'Noto Sans' }, // need a better check here
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
   * Restore from a JSON string OR (equivalently) a JavaScript object.
   * Just checks to see if the argument  is a string; if it is, parses the string
   * into an object and restores from that.  Otherwise, just restores from
   * the object.
   * @param { string or object} storedForm
   */
  async restoreFromSavedForm (storedForm) {
    if (typeof storedForm === 'string') {
      await this.restoreFromJSONForm(storedForm);
    } else if (typeof storedForm === 'object') {
      await this._restoreFromSaved(storedForm);
    }
  }

  /**
   * Restore from JSON form.  This involves parsing the JSON string and
   * restoring the tables, views, filters, and charts from the saved description
   * created in _prepareSerialization.
   * @param { string } storedForm - The stored form in a JSON string
   */
  async restoreFromJSONForm (storedForm) {
    try {
      await this._restoreFromSaved(JSON.parse(storedForm));
    } catch (err) {

    }
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
      this.dataManager = new GalyleoDataManager(this);
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
      //
      const storedFilterNames = Object.keys(storedForm.filters);

      for (let i = 0; i < storedFilterNames.length; i++) {
        const filterName = storedFilterNames[i];
        const savedFilter = storedForm.filters[filterName].savedForm;
        this.defaultFilters[filterName] = await this._makeDefaultFilter(savedFilter.columnName, savedFilter.filterType, savedFilter.tableName);
        unorderedDescriptors.push({ type: 'filter', filterName: filterName, descriptor: storedForm.filters[filterName] });
      }

      const getColumnNameTableAndType = viewOrTableName => {
        if (this.dataManager.tables[viewOrTableName]) {
          const table = this.dataManager.tables[viewOrTableName];
          return { columnName: table.columns[0].name, type: table.columns[0].type, tableName: viewOrTableName };
        } else {
          const view = this.dataManager.views[viewOrTableName];
          const table = this.dataManager.tables[view.tableName];
          return { columnName: view.columns[0], type: table.getColumnType(view.columns[0]), tableName: view.tableName };
        }
      };

      const storedChartNames = Object.keys(storedForm.charts);
      for (let i = 0; i < storedChartNames.length; i++) {
        const chartName = storedChartNames[i];
        const storedChart = storedForm.charts[chartName];

        const descriptor = getColumnNameTableAndType(storedChart.viewOrTable);
        const filterType = descriptor.type == 'number' ? 'NumericSelect' : 'Select';
        const filter = await this._makeDefaultFilter(descriptor.columnName, filterType, descriptor.tableName);
        this.defaultFilters[chartName] = filter;
        unorderedDescriptors.push({ type: 'chart', chartName: chartName, descriptor: storedChart });
      }

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
    } catch (e) {
      console.log(`Error in _restoreFromSaved_: ${e}`);
    }
    this._restore = false;
    this.drawAllCharts();
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
    /* const morphs = await Promise.all(descriptors.map(async descriptor => {
      if (descriptor.type === 'chart') {
        return await this._restoreChartFromSaved(descriptor.chartName, descriptor.descriptor);
      } else if (descriptor.type === 'filter') {
        return await this._restoreFilterFromSaved(descriptor.filterName, descriptor.descriptor);
      } else {
        return this._restoreMorphFromSaved(descriptor.descriptor);
      }
    })); */
    const morphs = [];
    for (let i = 0; i < descriptors.length; i++) {
      let descriptor = descriptors[i];
      if (descriptor.type === 'chart') {
        morphs.push(await this._restoreChartFromSaved(descriptor.chartName, descriptor.descriptor));
      } else if (descriptor.type === 'filter') {
        morphs.push(await this._restoreFilterFromSaved(descriptor.filterName, descriptor.descriptor));
      } else {
        morphs.push(this._restoreMorphFromSaved(descriptor.descriptor));
      }
    }
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
   * @param { string } filterName - Name of the filter to be restored
   * @param { object } savedFilter - The saved filter from the stored form
   */
  async _restoreFilterFromSaved (filterName, savedFilter) {
    let storedFilter = savedFilter.savedForm;
    if (storedFilter.toJS) storedFilter = storedFilter.toJS();
    const externalFilterMorph = await this.createExternalFilter(filterName, storedFilter.columnName, storedFilter.filterType, this._ensurePart(storedFilter.part), storedFilter.tableName);
    // externalFilterMorph.filterMorph.restoreFromSavedForm(storedFilter);
    this._restoreMorphicProperties(savedFilter, externalFilterMorph);
    await externalFilterMorph.whenRendered();
    return externalFilterMorph;
  }

  /**
   * We ensure compatibility with older dashboard by translating
   * component URLs to actual component objects.
   * @param { string|Morph } componentOrString - The component or (now invalid) component URL
   * @return { Morph } The original or resolved component.
   */
  _ensurePart (componentOrString) {
    let partName;
    if (componentOrString.exportedName) {
      // there has to be a better way to do this
      partName = componentOrString.exportedName;
    } else if (componentOrString.startsWith('part://')) {
      const pathParts = componentOrString.split('/');
      partName = pathParts[pathParts.length - 1];
    } else {
      partName = componentOrString;
    }

    const parts = {
      'select filter': SelectFilter,
      SelectFilter: SelectFilter,
      DateFilter: DateFilter,
      'list filter': ListFilter,
      ListFilter: ListFilter,
      'range filter': RangeFilter,
      RangeFilter: RangeFilter,
      SliderFilter: SliderFilter,
      booleanFilter: BooleanFilter,
      BooleanFilter: BooleanFilter,
      doubleSliderFilter: DoubleSliderFilter,
      DoubleSliderFilter: DoubleSliderFilter
    };
    return parts[partName];

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
    console.log(`Morphic properties restored for ${chartName}`);
    // await chartMorph.whenRendered();
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
    return this.dataManager ? this.dataManager.tableNames : [];
  }

  /**
   * The keys of the filters property
   */
  get filterNames () {
    return this.filters ? Object.keys(this.filters) : [];
  }

  /**
   * The keys of the views property
   */
  get viewNames () {
    return this.dataManager ? this.dataManager.viewNames : [];
  }

  /**
   * The keys of the charts property
   */
  get chartNames () {
    return this.charts ? Object.keys(this.charts) : [];
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

  async _makeDefaultFilter (columnName, filterType, tableName) {
    if (filterType == 'Range') {
      const parameters = await this.dataManager.getNumericSpec(columnName, tableName);
      return { operator: 'IN_RANGE', column: columnName, max_val: parameters.max, min_val: parameters.min };
    } else if (filterType === 'NumericSelect') {
      const parameters = await this.dataManager.getNumericSpec(columnName, tableName);
      return { operator: 'IN_LIST', values: [parameters.min_val] };
    } else {
      const values = await this.dataManager.getAllValues(columnName, tableName);
      return { operator: 'IN_LIST', values: [values[0]] };
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
    if (!this.gViz) {
      return null;
    }
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
    aView.filterNames.forEach(filterName => {
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
      if (fields.indexOf('max_val') >= 0) {
        return `${filter.max_val} >= ${filter.column} >= ${filter.min_val}`;
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
      title = this._makeTitleForView(viewDict[name], name);
    } else {
      return null;
    }
    chart.options.title = title;
  }

  addView (viewName, spec) {
    this.dataManager.addView(viewName, spec);
  }

  async init () {
    await this._loadGoogleChartPackages();
    ['charts', 'filters'].forEach(prop => {
      if (!this[prop]) {
        this[prop] = {};
      }
    });
    if (this.gCharts) {
      this.gCharts.setOnLoadCallback(() => { this.drawAllCharts(); });
    }
    this.dirty = false;
    if (!this.dataManager) {
      this.dataManager = new GalyleoDataManager(this);
    }
  }

  /**
   * Load the Google chart packages.  Only called internally
   * Note: we're going to have to drop the mapsApiKey at some point.
   * @param { string[] } packageList - The packages to be loaded. Default is the core chart package, the map package, and the chart editor..
   */
  async _loadGoogleChartPackages (packageList = ['corechart', 'map', 'charteditor']) {
    // await promise.waitFor(20 * 1000, () => !!window.google);
    while (!window.google) {
      await loadViaScript('https://www.gstatic.com/charts/loader.js');
      if (this.gCharts) {
        await this.gCharts.load('current', { packages: packageList, mapsApiKey: 'AIzaSyA4uHMmgrSNycQGwdF3PSkbuNW49BAwN1I' });
      }
    }
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
    // should add some error-checking
    this.lastTable = tableSpec;
    if (!this.dataManager) {
      this.dataManager = new GalyleoDataManager(this);
    }
    this.dataManager.addTable(tableSpec.name, tableSpec.table);
    // this.tables[tableSpec.name] = tableSpec.table;
  }

  /**
   * Display a preview of a table.  This just creates a TableViewer and
   * initializes it
   * @param tableName: the GalyleoTable to be previewed
   */
  displayPreview (tableName) {
    if (!this.tables[tableName]) {
      return;
    }
    const tableViewer = part(TableViewer).openInWorld();
    tableViewer.init(tableName, this.tables[tableName]);
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
   * Implement the GalyleoUpdateListener protocol.  This just listens for a
   * tableUpdated method and takes appropriate action (redrawing all the charts)
   * @param {GalyleoTable} table: the updated table
   */
  tableUpdated (table) {
    // should do intelligent search and only update the charts dependent on the updated
    // table.  For the moment, just drawAllCharts
    // The pseudo-code for the intelligent method is this:
    // const updatedTablesAndViews = this.viewNames.filter(viewName => {
    //      const view = this.views[viewName]
    //      return view.tableName == table.tableName;
    // })
    // updatedTablesAndViews.push(tableName)
    // this.drawUpdatedCharts(updatedTablesAndViews)
    // we will implement this, but also have a corresponding method to filter for charts
    this.drawAllCharts();
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
    this.gViz.events.addListener(wrapper, 'ready', e => { this._setChartForChartMorph(e, wrapper, chartName); });
    this.gViz.events.addListener(wrapper, 'error', e => { this._setErrorForChart(e, chartName); });
    return wrapper;
  }

  /**
   * When a wrapper has a ready event, the getChart() method returns non-null.  So use it to grab a handle to the chart
   * and add it to the morph
   * @param {Event} e - the ready event
   * @param {object} wrapper -- the chart wrapper
   * @param {string} chartName -- tha name of the chart
   */
  _setChartForChartMorph (e, wrapper, chartName) {
    console.log(`Chart ready event for ${chartName}: ${wrapper.getChart()}`);
    const morph = this.charts[chartName].actualChart = wrapper.getChart();
  }

  /**
   * When a wrapper has a ready event, the getChart() method returns non-null.  So use it to grab a handle to the chart
   * and add it to the morph
   * @param {Event} e - the ready event
   * @param {object} wrapper -- the chart wrapper
   * @param {string} chartName -- tha name of the chart
   */
  _setErrorForChartMorph (e, chartName) {
    console.log(`Error in drawing chart ${chartName}: ${e.message}`);
    const morph = this.charts[chartName].error = { id: e.id, message: e.message };
  }

  /**
   * Log chart events
   * @param { Event } e - The event to respond to.
   * @param { object } wrapper - The chart wrapper.
   * @param { string } chartName - The name of the chart.
   */
  _updateChartFilter (e, wrapper, chartName) {
    this._lastEvent = { evt: e, wrapper: wrapper, chartName: chartName };
    // I've added a ton of instrumenting code, which needs to come out once we've debugged
    const chart = wrapper.getChart();
    this._lastEvent.chart = chart;
    const table = wrapper.getDataTable();
    this._lastEvent.table = table;
    const selection = chart.getSelection();
    this._lastEvent.selection = selection;
    const row = selection[0].row == null ? null : selection[0].row;
    const col = selection[0].col == null ? 0 : selection[0].col;
    this._lastEvent.coords = { row: row, col: col };
    const value = table.getValue(row, col);
    this._lastEvent.value = value;
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
    while (!this.gViz) {
      await this._loadGoogleChartPackages();
      console.log('Loading Google Chart Packages...');
    }
    console.log(`Finished loading, this.gViz = ${this.gViz}`);
    this._makeTitle(chart);
    const wrapper = await this._makeWrapper(chart, chartName);
    if (wrapper) {
      this.lastWrapper = wrapper;
      chart.chartMorph.drawChart(wrapper);
    }
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
    chartSpecification.dataManagerFilter = await this._prepareChartFilter(chartSpecification.viewOrTable);
    if (this.gViz) {
      // this should ALWAYS be true
      await this.drawChart(chartName);
    }
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
}

export { DashboardCommon };
