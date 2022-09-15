/* global URLSearchParams */
import { Morph } from 'lively.morphic/morph.js';
import { component, ViewModel, without, part, add } from 'lively.morphic/components/core.js';
import { resource } from 'lively.resources/index.js';
import { Color, pt, Rectangle, Point } from 'lively.graphics/index.js';
import { ShadowObject, morph } from 'lively.morphic/index.js';
import { connect } from 'lively.bindings/index.js';
import { promise, obj } from 'lively.lang/index.js';
import { ExpressionSerializer } from 'lively.serializer2/index.js';
import { NamedFilter, SelectFilter, BooleanFilter, DateFilter, DoubleSliderFilter, ListFilter, RangeFilter, SliderFilter } from 'galyleo-dashboard/studio/filters.cp.js';
import { GalyleoDataManager, GalyleoView } from 'galyleo-dashboard/galyleo-data/galyleo-data.js';
import { GoogleChartHolder } from 'galyleo-dashboard/studio/chart-creator.cp.js';
import { LoadDialog } from 'galyleo-dashboard/studio/dashboard.cp.js';

export default class PublishedDashboard extends ViewModel {
  static get properties () {
    return {
      canvas: { // improve the naming to prevent confusion with views
        get () {
          return this.view;
        }
      },
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
      },
      expose: {
        get () { return ['relayout', 'init', 'commands']; }
      }
    };
  }

  get commands () {
    return [{
      name: 'resize on client',
      exec: () => {
        this.view.extent = pt(window.innerWidth, window.innerHeight);
        this.view.position = pt(0, 0);
      }
    }];
  }

  relayout () {
    this.ui.galyleoLogo.bottomRight = this.view.innerBounds().insetBy(25).bottomRight();
    this.ui.galyleoLogo.bringToFront();
  }

  /* -- Code which clears, stores, and loads dashboards from url -- */

  // Clear the dashboard of all charts, views, tables, and filters.  This
  // is used in new, and also internally by restoreFromJSONForm.
  clear () {
    this.filters = {};
    this.view.fill = Color.rgb(255, 255, 255);
    this.chartNames.forEach(chartName => {
      this.charts[chartName].chartMorph.remove();
    });
    this.charts = {};
    const logo = this.ui.galyleoLogo;
    this.view.removeAllMorphs();
    if (logo) {
      this.view.addMorph(logo);
    }
    this._ensureDataManager_();
    this.dataManager.clear();
  }

  // We need dashboardInputForm as a part
  _initURLPrompt_ (url, message) {
    if (message) {
      window.alert(message);
    }
    const loadDialog = part(LoadDialog);
    // loadDialog.init(this, url);
    // loadDialog.openInWorld();
  }

  /**
   * Load all the test dashboards.
   */
  async _loadAllTestDashboards () {
    const url = 'https://raw.githubusercontent.com/engageLively/galyleo-test-dashboards/main/manifest.json';
    const jsonForm = await resource(url).readJson();
    this._testDashboards = jsonForm.dashboards;
  }

  /**
   * Load all the demo dashboards.
   */
  async _loadAllDemoDashboards () {
    const url = 'https://raw.githubusercontent.com/engageLively/galyleo-examples/main/demos/manifest.json';
    const jsonForm = await resource(url).readJson();
    this._demoDashboards = jsonForm.dashboards;
  }

  // The current set of test dashboards.  To load a test,
  // this.loadDashboardFromURL(this.testDashboards.name)
  // It's an object, and needs to be maintained as the test

  get testDashboards () {
    if (this._testDashboards) {
      const result = {};
      const prefix = 'https://raw.githubusercontent.com/engageLively/galyleo-test-dashboards/main';
      this._testDashboards.forEach(name => result[name] = `${prefix}/${name}.gd.json`);
      return result;
    } else {
      return {};
    }
  }

  // The current set of test dashboards.  To load a test,
  // this.loadDashboardFromURL(this.testDashboards.name)
  // It's an object, and needs to be maintained as the test

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

  // Convenience method to load a test dashboard easily by name

  async loadTestDashboard (dashboardName) {
    if (!this._testDashboards) {
      await this._loadAllTestDashboards();
    }
    const dashboardUrl = this.testDashboards[dashboardName];
    if (dashboardUrl) { this.loadDashboardFromUrl(dashboardUrl); }
  }

  // Convenience method to load a test dashboard easily by name

  async loadDemoDashboard (dashboardName) {
    if (!this._demoDashboards) {
      await this._loadAllDemoDashboards();
    }

    const dashboardUrl = this.demoDashboards[dashboardName];
    if (dashboardUrl) { this.loadDashboardFromUrl(dashboardUrl); }
  }

  // load a dashboard from an url.  Returns an object {valid:true/false, message}
  // message is only meaningful if the dashboard is valid
  // parameters:
  //   url: url to load the dashboard

  async loadDashboardFromUrl (url = this.url) {
    this.url = url;
    const r = resource(url);
    r.useProxy = true;
    try {
      const descriptor = await r.readJson();
      const validCheck = this._checkValid_(descriptor);
      if (!validCheck.valid) {
        return validCheck;
      }
      await this._restoreFromSaved_(descriptor);
      this.relayout();
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        message: error
      };
    }
  }

  // Make sure a JSON form is OK.  This makes sure the parsed object
  // has Tables, Views, Filters, and Charts and no extraneous fields
  // Returns {valid: true/false, message: <explanatory message if false}.
  // Primarily designed for the various load routines
  // parameters.
  //   dashboardObject: the object to check

  _checkValid_ (dashboardObject) {
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

  // Make sure a JSON form is OK.  This basically just does a parse of the
  // string and sends the parsed string to _checkValid_
  // Returns {valid: true/false, message: <explanatory message if false}.
  // parameters.
  //   string: the string to check
  checkJSONForm (string) {
    try {
      return this._checkValid_(JSON.parse(string));
    } catch (error) {
      return {
        valid: false,
        message: `Error parsing JSON description: ${error}`
      };
    }
  }

  // Get a field from an object, making sure it's valid, and returning the default if it isn't
  // parameters:
  //    source: the source object containing the field
  //    field: an object of the form {name, validCheck, default}
  _getFieldValue_ (source, field) {
    const value = source[field.name];
    return field.validCheck(value) ? value : field.default;
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
      this.view.addMorph(m);
    });
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
    this.storedForm = storedForm;
    this._ensureDataManager_();

    try {
      const unorderedDescriptors = [];
      this.clear(); // make sure we blow away anything that was here before
      // The non-morph structures are easy....
      // this.tables = storedForm.tables;
      if (storedForm.fill) {
        this.view.fill = this._color_(storedForm.fill, Color.white);
      }
      $world.fill = this.view.fill;

      Object.keys(storedForm.tables).forEach(tableName => {
        this.dataManager.addTable(tableName, storedForm.tables[tableName]);
      });

      Object.keys(storedForm.views).forEach(viewName => {
        this.dataManager.views[viewName] = new GalyleoView(storedForm.views[viewName]);
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
    } catch (e) {
      console.log(`Error in _restoreFromSaved_: ${e}`);
    }
    this._repositionAfterRestore_();
  }

  // After restore is done, adjust the size to accomodate all morphs, ensuring
  // that there is enough room for the logo in the lower right corner
  // No parameters or return, just adjusts the size

  _repositionAfterRestore_ () {
    this.logo = this.ui.galyleoLogo;
    if (!this.logo) {
      return;
    }
    // take the logo out of size requirements, remembering that we need enough
    // room to position it (unlike other morphs, the logo can be repositioned, so
    // we don't need to take its position into account when resizing)
    const logoRequirement = this.logo.height + 10;
    const morphs = this.submorphs.filter(m => m != this.logo);
    // Figure out the width and height morphs require
    const morphsWidth = morphs.reduce((acc, morph) => Math.max(acc, morph.bounds().right()), 0);
    const morphsHeight = morphs.reduce((acc, morph) => Math.max(acc, morph.bounds().bottom()), 0);
    const morphsRequirement = pt(morphsWidth, morphsHeight).addPt(pt(0, logoRequirement));
    // Set the extent to be the max of window size and requirement, in each dimension
    this.extent = pt(Math.max(morphsRequirement.x, window.innerWidth), Math.max(morphsRequirement.y, window.innerHeight));
    // it seems other code repositions the  logo already...
    // this.logo.position = this.extent.subPt(this.logo.extent.addPt(pt(5, 5))); pt(1451.4, 779.6);
  }
  // this.submorphs.filter(m => m != this.logo).map(m => m.bounds().right())

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
    morphs.forEach(morph => {
      if (morph) {
        morph.grabbable = morph.draggable = morph.acceptsDrops = morph.halosEnabled = false;
      }
    });
    return morphs;
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
    const externalFilterMorph = await this.createExternalFilter(filterName, storedFilter.columnName, storedFilter.filterType, this._ensurePart(storedFilter.part), storedFilter.tableName);
    externalFilterMorph.filterMorph.restoreFromSavedForm(storedFilter);
    // externalFilterMorph.opacity = 0; // avoid flicker
    this._restoreMorphicProperties_(savedFilter, externalFilterMorph);
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

  _restoreMorphFromSaved_ (morphDescriptor) {
    const restoredMorph = morph({ type: morphDescriptor.type });
    restoredMorph.name = morphDescriptor.name;

    this._restoreMorphicProperties_(morphDescriptor, restoredMorph);
    if (morphDescriptor.imageUrl) {
      restoredMorph.imageUrl = morphDescriptor.imageUrl;
    }
    this.view.addMorph(restoredMorph);
    if (morphDescriptor.textProperties) {
      this._setFields_(restoredMorph, morphDescriptor.textProperties, this._textFields_);
      const complexTextFieldsSource = morphDescriptor.hasOwnProperty('complexTextProperties') ? morphDescriptor.complexTextProperties : morphDescriptor.textProperties;
      this._setComplexTextFields_(restoredMorph, complexTextFieldsSource);
    }
  }

  /* -- Utility code to explore the global data structures  -- */

  // The keys of the tables property

  get tableNames () {
    return this.dataManager.tableNames;
  }

  // The keys of the filters property

  get filterNames () {
    return Object.keys(this.filters);
  }

  // The keys of the views property

  get viewNames () {
    return this.dataManager.viewNames;
  }

  // The keys of the charts property

  get chartNames () {
    return Object.keys(this.charts);
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
    const namedFilterMorphProto = part(NamedFilter);
    namedFilterMorphProto.init(filterMorph, filterName);
    namedFilterMorphProto.position = pt(0, 0);
    connect(namedFilterMorphProto, 'filterChanged', this, 'drawAllCharts');
    this.addFilter(filterName, { morph: namedFilterMorphProto });
    this.view.addMorph(namedFilterMorphProto);
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
        from widgets.  This code finds the parameters  executes
        the filters in a build to get the data for the view. -- */

  // Convert a GalyleoColumn to a Google Viz Column
  // Should migrate into a Google-specific library
  // parameters:
  //    galyleoColumn: {type, name}
  // returns:
  //    {type, id, label}
  __createGVizColumn__ (galyleoColumn) {
    return { id: galyleoColumn.name, label: galyleoColumn.name, type: galyleoColumn.type };
  }

  // Prepare the data for a view or a table.  This is used by
  // displayPreview and drawChart, to get the data ready to be plotted
  // parameters:
  //   viewOrTable: the name of the Table/View to prepare the data for
  // returns:
  //   a DataView or DataTable object
  async prepareData (viewOrTable) {
    if (this.dataManager.tableNames.indexOf(viewOrTable) >= 0) {
      const table = this.dataManager.tables[viewOrTable];
      const columns = table.columns.map(column => this.__createGVizColumn__(column));
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

  // get a filter for a name.  The name is either the name of a filter
  // or the name of a chart, and so check both lists and return the filter
  // appropriately.  Used by __prepareDataForViewDataManager__
  // parameters:
  //   widgetOrChartName: the name of a widget or a chart
  // returns:
  //   the associated filter object (or null if not found)
  _getFilterForName (widgetOrChartName) {
    if (this.filters[widgetOrChartName]) {
      return this.filters[widgetOrChartName].morph.dataManagerFilter;
    } else if (this.charts[widgetOrChartName]) {
      return this.charts[widgetOrChartName].dataManagerFilter;
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
    return fields.indexOf('value') >= 0 && aFilter.value != undefined;
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
  //    useDataManager: a boolean which tells us whether to use the data manager
  // returns:
  //    a list of objects suitable for use by GoogleDataTable.getFilteredRows()
  _getFiltersForView (view) {
    const filterForName = name => this._getFilterForName(name);
    const filters = view.filterNames.map(name => filterForName(name));
    // return filters.filter(filter => this.__filterValid__(filter));
    return filters;
  }

  // Prepare the data for a view using the data manager.  A view has an underlying table,
  // named filters.  This method takes
  // the underlying table, uses the named columns of the view to
  // get the columns of the table, then runs all the filters over the
  // table to get the underlying rows, returning this in a Google Data View
  // object.  Used by prepareData
  // parameters:
  //   viewName: The name of the view to turn into a DataView object
  // returns:
  //    The data view object ready to be displayed.
  async _prepareViewData (viewName) {
    const aView = this.dataManager.views[viewName];
    if (!aView) {
      return;
    }
    const filterSpecs = {};
    aView.filters.forEach(filterName => {
      filterSpecs[filterName] = this._getFilterForName(filterName);
    });
    const columns = aView.fullColumns(this.dataManager.tables).map(column => this.__createGVizColumn__(column));
    const result = new this.gViz.DataTable({ cols: columns });
    const rows = await aView.getData(filterSpecs, this.dataManager.tables);
    result.addRows(rows);
    return result;
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

  // Hack!  A utility to get column names for a table, independent of
  // whether it's a Google Table or a Galyleo Table
  // parameters:
  //    table: a table which is either aGoogle Table or a Galyleo Table
  // returns:
  //    an ordered list of the column names
  _getColumnNames_ (table) {
    if (table.hasOwnProperty('cols')) {
      // Google table!
      return table.cols.map(col => col.id);
    } else {
      return table.columns.map(column => column.name);
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
    const columns = this._getColumnNames_(aTable);
    // const seriesColumns = aTable.cols.slice(1).map(col => col.id);
    // const headerString = seriesColumns.join(', ');
    // return `${headerString} v ${aTable.cols[0].id}`;
    // return this.__makeHeaderString__(aTable.cols[0].id, seriesColumns, tableName);
    return this.__makeHeaderString__(columns[0], columns.slice(1), tableName);
  }

  __filterString__ (filter) {
    const fields = Object.keys(filter);
    if (fields.indexOf('column') >= 0) {
      if (fields.indexOf('values') >= 0) {
        if (filter.values.length == 0) {
          return null;
        } else if (filter.values.length == 1) {
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
  // viewName = 'Pct v Party'; aView = this.dataManager.views[viewName], useDataManager = true

  __makeTitleForView__ (aView, viewName) {
    const seriesColumns = aView.columns.slice(1);
    const headerString = this.__makeHeaderString__(aView.columns[0], seriesColumns, viewName);
    const filters = this._getFiltersForView(aView);
    /* const filterString = filter => {
      const fields = Object.keys(filter);
      const columnName = filter.columnName;
      if (fields.indexOf('value') >= 0) {
        return `${columnName} = ${filter.value}`;
      } else if (fields.indexOf('minValue') >= 0) {
        return `${filter.maxValue} >= ${columnName} >= ${filter.minValue}`;
      }
      return null;
    }; */
    if (filters.length > 0) {
      const filterStrings = filters.map(filter => this.__filterString__(filter));
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
    let title;
    const name = chart.viewOrTable;

    if (this.tableNames.indexOf(name) >= 0) {
      title = this.__makeTitleForTable__(this.dataManager.tables[name], name);
    } else if (this.viewNames.indexOf(chart.viewOrTable) >= 0) {
      title = this.__makeTitleForView__(this.dataManager.views[name], name);
    } else {
      return null;
    }
    chart.options.title = title;
  }

  // ensure a data manager.  This is called from init(), and
  // loadDashboardFromURL.  Just makes sure that there is a DataManager available

  _ensureDataManager_ () {
    if (!this.dataManager) {
      this.dataManager = new GalyleoDataManager();
    }
  }

  viewDidLoad () {
    this.init();
  }
  // init.  First, reset the error log to empty, wait for rendering, load
  // the google chart packages and make sure that the dictionaries are
  // initialized

  async init () {
    // is whenRendered Needed anymore?
    // await this.whenRendered();
    await this.__loadGoogleChartPackages__();
    ['charts', 'filters'].forEach(prop => {
      if (!this[prop]) {
        this[prop] = {};
      }
    });
    this._ensureDataManager_();
    this.gCharts.setOnLoadCallback(() => {
    });
    if (!lively.FreezerRuntime) return;
    const parameters = new URLSearchParams(document.location.search);
    const url = parameters.get('dashboard');
    if (url) {
      const result = await this.loadDashboardFromUrl(url);
      if (!result.valid) {
        window.alert(result.message);
        this._initURLPrompt_(url);
      }
    } else {
      this._initURLPrompt_(null);
    }
    // const url = (new URL(document.location)).searchParams.get("dashboard")
    // try to load the url; if it fails, pop up the error message and the URL form
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

  // load a table from the URL given.  This should do a little more error-checking
  // than it does.  In particular, it should check to make sure that tableSpec
  // is valid.
  // parameters:
  //    url: an URL.

  loadDataFromUrl (url) {
    // data must be in a GalyleoTable. See GalyleoDataManager.addTable
    const r = resource(url);
    r.readJson().then(tableSpec => this.dataManager.addTable(tableSpec),
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

  async __makeWrapper__ (chart, chartName) {
    // this.__makeWrapper__(this.charts[this.chartNames[0]])
    const dataTable = await this.prepareData(chart.viewOrTable);
    const dataManagerFilter = await this._prepareChartFilter(chart.viewOrTable);
    if (!(chart.dataManagerFilter && chart.dataManagerFilter.column == dataManagerFilter.column)) {
      chart.dataManagerFilter = dataManagerFilter;
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

  // log chart events
  _updateChartFilter (e, wrapper, chartName) {
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

  async drawChart (chartName) {
    const chart = this.charts[chartName];
    if (!chart) return;
    this.__makeTitle__(chart);
    const wrapper = await this.__makeWrapper__(chart, chartName);
    this.lastWrapper = wrapper;
    chart.chartMorph.drawChart(wrapper);
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
    chartSpecification.dataManagerFilter = this._prepareChartFilter(chartSpecification.viewOrTable);
    this.drawChart(chartName);
    if (editChartStyle) {
      this.editChartStyle(chartName);
    }
    this.dirty = true;
  }

  // create a Data Manager Filter for a chartSpecification, to add to the chart record.
  // Every chart is a Select filter, since clicking on the chart selects
  // an item from its category axis.  For example, clicking on a region
  // on a Geo Chart selects the region, clicking on a pie chart selects
  // the item represented by the wedge, and so on.  The category axis is
  // always column 0 of  the view/table, so we get that.  The __makeWrapper__
  // method attaches an event handler to update the value field of the filter.
  // parameters:
  //   viewOrTable: the name of the underlying view or table
  // returns:
  //   the dataManagerFilter object for the chart, to be added to the specification.
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

  // get a morph for the chart with name chartName.  This is called by addChart.
  // It's essentially just building the chart from the googleChartMorph resource,
  // initializing it by passing in the chartName and this, the dashboard it belongs
  // to, adding it to this and setting its position to the top-left corner.
  // parameters:
  //    chartName: the name to find/create the chart morph for
  // returns:
  //    the new morph.

  async __getChartMorph__ (chartName) {
    const currentMorphsForChart = this.view.submorphs.filter(morph => morph.isChart && morph.name == chartName);
    if (currentMorphsForChart && currentMorphsForChart.length > 0) {
      return currentMorphsForChart[0];
    }
    const chartMorph = part(GoogleChartHolder);
    chartMorph.init(chartName);
    this.view.addMorph(chartMorph);
    chartMorph.position = pt(0, 0);
    return chartMorph;
  }
}

