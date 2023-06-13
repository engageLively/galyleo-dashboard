import { ViewModel, Label, without, part, add, component } from 'lively.morphic';
import { pt, Color, rect } from 'lively.graphics';
import { connect, signal } from 'lively.bindings';
import { TilingLayout, HTMLMorph } from 'lively.morphic';
import { GalyleoSearch } from './inputs/search.cp.js';
import { GalyleoWindow, GalyleoColorInput, PromptButton, GalyleoDropDown, MenuBarButton } from './shared.cp.js';
import { Chart, Legend, ArcElement, PieController, registry, registerables } from 'esm://cache/chart.js@3.9.1';
import { Canvas } from 'lively.components/canvas.js';
import { copy } from 'lively.serializer2/index.js';
import { obj } from 'lively.lang/index.js';
import { GalyleoFillControl } from './controls/fill.cp.js';
import { projectAsset } from 'lively.project/helpers.js';

/**
 * The second generation of chart builder.  Very simple.  Consists of two
 * pulldowns, one for the Table/View that this chart is over, and one for
 * the type of chart.  Note that the Table/View resets the lists of the
 * charts, since most charts require something on the axes.
 * The table selection is connected to the updateChartTypeList method.
 * There is also a chartName input and Create and Cancel buttons.
 * Create is connected to createChart() and Cancel is connected to remove()
 */
export class ChartBuilderModel extends ViewModel {
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
            { model: 'close button', signal: 'fire', handler: 'cancel' },
            { model: 'create chart button', signal: 'fire', handler: 'createChart' }
          ];
        }
      }
    };
  }

  cancel () {
    this.view.remove();
  }

  /**
   * Initialize with the dashboard, the source of table and view names and
   * information.  Populate the table/view list, and set an initial selection.
   * Selecting an item in the table/view list populates the chart type
   * list (see updateChartTypeList, which is triggered on a tableViewList selection)
   * @param { Dashboard } dashboard - The current dashboard to operate on.
   */
  init (dashboard) {
    this.dashboard = dashboard;
    const allNames = dashboard.tableNames.concat(dashboard.viewNames);
    const { viewSelector } = this.ui;
    viewSelector.items = allNames;
    viewSelector.selection = allNames[0];
    this.updateChartTypeList();
  }

  /**
   * The Chart Types for each number of columns in a table/view.  this.chartTypes[i]
   * are the charts that take exactly i columns; this.chartTypes[0] are the charts
   * that can take any number of columns > 1.  The idea is that updateChartTypeList
   * will look at the number of columns in a Table/View (n), and merge
   * this.chartTypes[0] and this.chartTypes[n] to find the chart types to
   * populate the chartTypeList.  Note this is crude; some charts require
   * a specific pattern of columns (AnnotationCharts are list that), and this
   * misses that.  An area for improvement.
   * Also, this should be in a configuration file, not hardcoded.
   * Table is not in this list, as it is the default chart for any number of
   * axes and always appears first in the list.
   */
  get chartTypes () {
    return [
      ['AreaChart', 'BarChart', 'ColumnChart', 'LineChart', 'SteppedAreaChart'], // any
      [], // 1
      ['CalendarChart', 'DonutChart', 'GaugeChart', 'GeoChart', 'Histogram', 'PieChart', 'ScatterChart'],
      ['BubbleChart', 'Interval', 'Map', 'OrgChart', 'SankeyChart', 'Timeline'],
      ['BubbleChart', 'Interval', 'OrgChart'],
      ['BubbleChart', 'CandlestickChart', 'Interval'],
      ['CandlestickChart', 'Interval'],
      ['Interval']
    ];
  }

  /**
   * Update the chartTypeList with the charts appropriate for the selected view
   * Merges this.chartTypes[0] with this.chartTypes[n], where n is the
   * number of columns in the selected view/table.  Sorts in alphabetical
   * order, then sticks Table on the head of the list.  Sets the selection
   * of the chartType to the previous selection if it's still here, Table
   * otherwise.
   * Invoked when the Table/View selection is changed.
   * This is now dead code since every chart is created as a Table and the
   * Google Chart Editor pops up.
   */
  updateChartTypeList () {
    /* const viewTableName = this.tableViewList.selection;
    const selectedChart = this.chartTypeList.selection;
    let charts = this.chartTypes[0];
    if (viewTableName) {
      const numColumns = this.dashboard.getNumberOfColumns(viewTableName);
      if (!isNaN(numColumns)) {
        const index = Math.min(numColumns, this.chartTypes.length - 1);
        if (index > 0) {
          charts = charts.concat(this.chartTypes[index]);
          charts.sort();
        }
      }
      charts.unshift('Table');
      this.chartTypeList.items = charts;
      this.chartTypeList.selection = selectedChart && charts.indexOf(selectedChart) >= 0 ? selectedChart : 'Table';
    } */
  }

  /**
   * An internal utility to check that a list has a selection; if it does,
   * return true, if it doesn't, return false and highlight the list to
   * show a selection needs to be made.  Called from _checkInputs()
   * @access private
   * @param { List } list - The list morph to be checked.
   * @returns { Boolean }
   */
  _checkSelectionOrSignal (list) {
    if (list.selection && list.selection !== '__no_selection__') {
      return true;
    } else {
      list.toggleError();
      return false;
    }
  }

  /**
   * An internal utility to check that the inputs are OK for Chart Creation.  Makes
   * sure that tableViewList and chartTypeList have selections, that the chart
   * has a name and that the name doesn't conflict with any other chart or filter.
   * Returns true iff the inputs are OK.
   * Called from createChart.
   * @access private
   */
  _checkInputs () {
    return this._checkSelectionOrSignal(this.ui.viewSelector) && this._nameOK();
  }

  /**
   * An internal utility to check that the name in the chartName input is OK --
   * that it's non-null, of length > 0, and doesn't conflict with the name of an
   * existing chart or filter.  Returns true if the name is OK, false otherwise,
   * and highlights the name input to show the user where the problem is.
   * called from __checkInputs__
   * @access private
   */
  _nameOK () {
    const { chartNameInput } = this.ui;
    const chosenName = chartNameInput.textString;
    if (!chosenName || chosenName.length === 0) {
      chartNameInput.indicateError('Enter a chart name!');
      return false;
    }
    const names = this.dashboard.chartNames.concat(this.dashboard.filterNames);
    if (names.indexOf(chosenName) >= 0) {
      chartNameInput.indicateError('That name is already in use!');
      return false;
    }
    return true;
  }

  /**
   * The specification of the chart -- just the selections from the two lists,
   * and a required option field that tells the chart renderer to fill the morph
   * This will be dashboard.charts[chartName].specification
   */
  get chartSpecification () {
    return {
      // Hack -- we set the chart style always to Table, and then pop up an editor
      // so the user can choose the graph type.  This is because not all charts
      // are compatible with all tables, and the Google Chart Editor knows which
      // ones (and we don't, Google does not expose that API).  In the next
      // version, the chart type pulldown should disappear.
      // chartType: this.chartTypeList.selection,
      chartType: 'Table',
      viewOrTable: this.ui.viewSelector.selection,
      options: { width: '100%', height: '100%' }
    };
  }

  /**
   * Maximum table size before we pop up a warning.  The size should probably b
   * chart-type specific.  For the moment, we'll use 1K rows as the threshold.
   */
  get _maxTableSize () {
    return 1000;
  }

  /**
   * Check that the chart's inputs are OK, and then check to see if the data is
   * too big to plot.  If it is, warn the user and give him an opportunity to back
   * out by popping up a warning.  The size should probably be made
   * chart-type specific.  For the moment, it's given in this.__maxTableSize__.
   * This code needs to be revisited.
   */
  async checkChartInputsAndCreate () {
    if (this._checkInputs()) {
      const table = this.dashboard.prepareData(this.chartSpecification.viewOrTable);
      if (table.getNumberOfRows() > this._maxTableSize) {
        const message = `Warning!  This chart will have ${table.getNumberOfRows()} entries and drawing may be slow.  Click OK to proceed, cancel to cancel chart creation`;
        // const isConfirmed = window.confirm(message);
        const isConfirmed = await this.dashboard.confirm(message);
        if (isConfirmed) {
          this.createChart();
        } else {
          this.view.remove();
        }
      } else {
        this.createChart();
      }
    }
  }

  /**
   * Create the chart.  If the inputs are OK, then tell the dashboard to add
   * the chart with the entered name and the specification given by the two lists,
   * then remove the dialog.  Invoked from the Create button.
   */
  createChart () {
    // delete check when we rebind the Create button.
    if (this._checkInputs()) {
      this.dashboard.addChart(this.ui.chartNameInput.textString, this.chartSpecification);
      this.view.remove();
    }
  }
}

// ChartBuilder.openInWorld()
const ChartBuilder = component(GalyleoWindow, {
  name: 'chart builder',
  defaultViewModel: ChartBuilderModel,
  extent: pt(340.5, 199.9),
  layout: new TilingLayout({
    axis: 'column',
    orderByIndex: true,
    resizePolicies: [['window title', {
      height: 'fixed',
      width: 'fill'
    }], ['content wrapper', {
      height: 'fill',
      width: 'fill'
    }]],
    wrapSubmorphs: false
  }),
  submorphs: [
    { name: 'window title', textString: 'Chart builder' },
    add({
      name: 'content wrapper',
      extent: pt(321.5, 227.9),
      layout: new TilingLayout({
        axis: 'column',
        axisAlign: 'right',
        orderByIndex: true,
        padding: rect(10, 5, 0, -5),
        resizePolicies: [['header', {
          height: 'fixed',
          width: 'fill'
        }], ['chart name input', {
          height: 'fixed',
          width: 'fill'
        }], ['view selector', {
          height: 'fixed',
          width: 'fill'
        }]],
        spacing: 10,
        wrapSubmorphs: false
      }),
      fill: Color.transparent,
      submorphs: [
        {
          name: 'header',
          extent: pt(384, 10),
          fill: Color.rgba(0, 0, 0, 0),
          layout: new TilingLayout({
            align: 'right',
            orderByIndex: true,
            wrapSubmorphs: false
          }),
          submorphs: [part(MenuBarButton, {
            tooltip: 'Close this dialog without loading',
            name: 'close button',
            extent: pt(100, 35),
            /* layout: new TilingLayout({
              axis: 'row',
              axisAlign: 'center',
              align: 'center'
            }), */
            submorphs: [{
              name: 'label',
              textAndAttributes: ['CLOSE', null]
            }, {
              name: 'icon',
              extent: pt(14, 14),
              imageUrl: projectAsset('close-button-icon-2.svg')
            }]
          })]
        },
        part(GalyleoSearch, {
          name: 'chart name input',
          placeholder: 'Chart name'
        }),
        part(GalyleoDropDown, { name: 'view selector', viewModel: { placeholder: 'Select view...', openListInWorld: true } }),
        part(PromptButton, {
          name: 'create chart button',
          extent: pt(116.2, 30.5),
          submorphs: [{
            name: 'label',
            textAndAttributes: ['Create chart', null]
          },
          without('icon')]
        })
      ]
    })
  ]
});

export class GoogleChartHolderMorph extends HTMLMorph {
  /**
   * A morph which draws a Google Chart.  Very simple, because almost all
   * the work is done by the dashboard.  The central routine in this is drawChart(),
   * which just asks a ChartWrapper created by the Dashboard to draw the chart
   * in this object's DOM node .  See:
   * https://developers.google.com/chart/interactive/docs/reference#chartwrapperobject
   * for documentation on the ChartWrapper.
   * Properties:
   * 1. the chartDiv.  Just a property which encapsulates the DOM node.  This is
   *    passed to the wrapper as the place to draw the chart
   * 2. defaultHTML: overrides the parent node property to ensure that this
   *    DOM node has a referenceable ID.
   * Check to see if the wrapper should be made a property.  The only reason to do
   * this would be if the thing doesn't redraw properly on load.
   */
  static get properties () {
    return {
      chartDiv: { // The node where the chart lives.
        derived: true,
        get () {
          return this.domNode;
        }
      },
      defaultHTML: {
        derived: true,
        get () {
          return `<div id="chart-container-${this.id}"></div>`;
        }
      }
    };
  }

  /**
   * An indicator that this morph is a chart, which the dashboard uses
   * to manipulate and organize the chart morphs in the dashboard.
   */
  get isChart () {
    return true;
  }

  /**
   * Initialize. Just set the morph name to the name of the chart on the
   * dashboard, a technique the dashboard uses to keep track of which charts
   * belong to which morphs.  Also initialize the dashboard instance variable and
   * set the html to an initial value -- drawChart overwrites the HTML.  Called
   * by `dashboard._getChartMorph()`
   * @param { string } chartName - The name of the chart.
   */
  init (chartName) {
    this.name = chartName;
    this.html = this.defaultHTML;
    // debugger;
    // delete this.wrapper; // make sure this is clean;
    this.getSubmorphNamed('resizer').bottomRight = this.innerBounds().bottomRight();
    connect(this, 'extent', this, 'requestRedraw');
  }

  /**
   * Redraw, using the stored wrapper if any.  This is hardwired to this.extent, so
   * when the shape of the morph changes the chart is redrawn.  The default
   * options for charts include {width: "100%", height: "100%"}, so the wrapper
   * code adjusts the chart size to exactly fill the morph.  The effect of all of
   * this is that the chart seamlessly resizes when the morph is resized.
   * This is why we cleaned up any lingering this.wrapper on init, and just to
   * make sure we don't get bogus calls we only draw when we have a stored wrapper
   */
  async requestRedraw () {
    if (this.wrapper) {
      await this.whenRendered(); // ensure width is propagated
      this.drawChart(this.wrapper);
    }
  }

  /**
   * Actually draw the chart.  We first make sure that width and height are set
   * to 100% -- we do this in `ChartBuilder.__makeOptions__` as well, so this is
   * suspenders-and-belt, and then we just tell the wrapper to draw the chart
   * in this div.
   * @param { object } wrapper - The google chart wrapper.
   */
  drawChart (wrapper) {
    wrapper.setOption('width', '100%');
    wrapper.setOption('height', '100%');
    this.whenRendered().then(_ => {
      wrapper.draw(this.chartDiv);
      this.wrapper = wrapper;
    });
  }

  /**
   * Resize the chart in response to a drag event
   * @param { Event } evt - The drag event.
   */
  resizeChart (evt) {
    this.resizeBy(evt.state.dragDelta);
    this.requestRedraw();
  }
}

const GoogleChartHolder = component({
  name: 'google chart holder',
  type: GoogleChartHolderMorph,
  submorphs: [
    { name: 'resizer' }
  ]
});

// Registrations required for ChartJS

Chart.register(PieController, ArcElement, Legend);
Chart.register(...registerables);

/**
 * The ViewModel for a ChartJS editor.  This renders all ChartJS type charts, and should be extended as needed for
 * future Charts.
 * @property: Chart type -- the type of the chart
 * @property: data -- the chart data
 * @property: chartJSType -- the actual type for ChartJS.
 * @property: config -- the chart configuration used to draw the chart.  This is dervied from the data property
 * @property: datasetOptions -- the options to be used for each dataset
 * @property: dataManagerFilter -- the filter describing a selection event.
 * @property: filterChanged -- a signal that the filter has changed
 */

// TODO: write an edit method to pop up a chart editor with this as the base chart

export default class ChartDiagramModel extends ViewModel {
  static get properties () {
    return {
      type: {
        type: 'Enum',
        values: ['area', 'bar', 'bubble', 'doughnut', 'line', 'polarArea', 'pie', 'radar', 'scatter'/* , 'scale' */],
        defaultValue: 'pie'
      },
      bindings: {
        get () {
          return [{
            signal: 'onOwnerChanged', handler: 'drawVisualization'
          }];
        }
      },
      data: {
        initialize () {
          this.data = {
            datasets: [{
              backgroundColor: [
                'rgb(204, 0, 0)',
                'rgb(255, 153, 0)',
                'rgb(204, 204, 0)',
                'rgb(0, 204, 0)',
                'rgb(0, 0, 204)'],
              borderWidth: 0,
              data: [50, 60, 100, 200, 300],
              label: 'Dataset 1'
            }],
            labels: ['Red', 'Orange', 'Yellow', 'Green', 'Blue']
          };
        }
      },

      options: {
        initialize () {
          this.options = {
            layout: {
              padding: 10
            },
            plugins: {
              legend: {
                display: true,
                align: 'start',
                labels: {
                  fontColor: Color.black,
                  fontFamily: 'IBM Plex Sans'
                },
                position: 'left'
              }
            },
            maintainAspectRatio: false,
            padding: 50,
            responsive: true,
            onClick: (e) => {
              const canvasPosition = Chart.helpers.getRelativePosition(e, this.chart);

              // Substitute the appropriate scale IDs
              const dataX = this.chart.scales.x.getValueForPixel(canvasPosition.x);
              const dataY = this.chart.scales.y.getValueForPixel(canvasPosition.y);
              this.updateSelection(dataX);
            }
          };
        }
      },
      chartJSType: {
        derived: true,
        get () {
          return this.type == 'area' ? 'line' : this.type;
        }
      },
      config: {
        derived: true,
        get () {
          return copy({
      			type: this.chartJSType,
      			data: this.data,
      			options: this.options
      		});
        }
      },
      datasetOptions: {
        defaultValue: null
      },
      filterChanged: { derived: true, readOnly: true, isSignal: true }
    };
  }

  updateSelection (xValue) {
    this.columnSelection = xValue;
    signal(this, 'filterChanged');
  }

  /**
   * Return the filter as a JavaScript object for use with the data manager.
   * Per the requirement in galyleo-data.InListFilter, returns an
   * object with operator 'IN_LIST', column: this.galyleoData.columns[0].name, values: [this.columnValueSelection]
   */

  get dataManagerFilter () {
    return { operator: 'IN_LIST', column: this.galyleoData.columns[0].name, values: [this.columnValueSelection] };
  }

  /**
   * Return a short string describing the filter.  This is used to show the
   * action of the filter in chart titles, etc.
   */
  get filterString () {
    return `${this.galyleoData.columns[0].name} = ${this.columnValueSelection}`;
  }

  restoreContent (oldCanvas, newCanvas) {
    super.restoreContent(oldCanvas, newCanvas);
    this.drawVisualization();
  }

  ensureChart () {
    if (!this.chart) this.drawVisualization();
  }

  onRefresh () {
    if (!this.view.context) return;
    this.ensureChart();
    this.chart.config.type = this.chartJSType;
    this.chart.options = this.config.options;
    this.chart.data = this.config.data;
    this.chart.update();
  }

  /**
   * Set the data from the Dashboard.  This should follow the standard for data coming in from a View:
   * a set of rows and columns.  Draws the visualization once the data is set
   * @param  {GalyleoTabularData} galyleoTabularData
   */

  setData (galyleoTabularData) {
    this.galyleoData = galyleoTabularData;
    this._setupDatasetOptions();
    this.drawVisualization();
  }

  /**
   * the chart types
   */

  get chartTypes () {
    // should area be a separate type, or should it be a dataset option ("fill")?
    return ['area', 'bar', 'bubble', 'doughnut', 'line', 'polarArea', 'pie', 'radar', 'scatter'/* , 'scale' */];
  }

  /**
   * return the set of chart types matching the currently-loaded data.  This is used by the chart editor to
   * display the possible charts for the user.
   */

  chartTypesMatchingData () {
    return this.chartTypes.filter(type => this.dataMatches(type));
  }

  /**
   * Set the type of the chart to the argument. Once the type is set, set up the data set options and draw the chart.
   */

  setType (chartType) {
    if (this.chartTypes.indexOf(chartType) >= 0) {
      this.type = chartType;
      this._setupDatasetOptions();
      this.drawVisualization();
    }
  }

  /**
   * @typedef DatasetColorSpecification
   * @property {Color} backgroundColor: the background color as returned by Color.rgba
   * @property {Color} borderColor: the borderColor color as returned by Color.rgba
   */

  /**
   * @typedef ChartJSDataSetOptions
   * Object {string.DatasetColorSpecification}
   */

  /**
   * @typedef ChartJSSavedForm.  The object giving the saved form of a chart
   * @property {string} chartMorph -- the library of the chart.  This must be ChartJSMorph
   * @property {string} type -- the type of the chart.
   * @property {ChartJSDataSetOptions} -- the options of the datasets
   */

  /**
   * restore a chart from its savedForm.
   * @param {ChartJSSavedForm} savedForm -- form to restore from
   */

  restoreFromSavedForm (savedForm) {
    this.type = savedForm.type;
    this.datasetOptions = savedForm.datasetOptions;
  }

  /**
   * Generate the saved form
   * @returns {ChartJSSavedForm}
   */

  savedForm () {
    return {
      chartMorph: 'ChartJSMorph',
      type: this.type,
      datasetOptions: this.datasetOptions
    };
  }

  /**
   * Generate default color specifications for use before these are specified.  Grabbed a color wheel off the web
   * and use the same base color for a borderColor and a backgroundColor, where the borderColor has opacity 1 and the
   * backgroundColor has opacity 0.2
   * @return [{DatasetColorSpecification}]
   */

  get defaultColorSpecs () {
    const defaultColorSpecs = ['#EBF5C9', '#AFD32E', '#4426CD', '#F65A06', '#110A32', '#FF6384', '#36A2EB', '#FFCD56'];
    const result = defaultColorSpecs.map(hexCode => {
      const solid = Color.rgbHex(hexCode);
      const background = Color.rgbHex(hexCode);
      background.a = 0.2;
      return {
        borderColor: solid,
        backgroundColor: background
      };
    });
    return result;
  }

  // Set the data set options from the specifications.  This is somewhat complicated by the fact that For a bubble,
  // doughnut, polarArea, pie, or scatter chart, the data set names are in the column 0 labels, and
  //    for the other charts they are the column names in column 1...n
  // But the basic idea is to go through the datasets and ensure that there is a color for each.

  _setupDatasetOptions () {
    // Pull the dataset names into datasetNames, correcly.  See (1) above
    const dataNamesInColumn0 = ['bubble', 'doughnut', 'polarArea', 'pie', 'scatter'].indexOf(this.type) >= 0;
    const datasetNames = dataNamesInColumn0 ? this.galyleoData.rows.map(row => row[0]) : this.galyleoData.columns.slice(1).map(column => column.name);
    // ensure that there are dataset options
    if (!this.datasetOptions) {
      this.datasetOptions = {};
    }
    // delete dead or trailing dataset names
    Object.keys(this.datasetOptions).forEach(datasetName => {
      if (datasetNames.indexOf(datasetName) < 0) {
        delete this.datasetOptions[datasetName];
      }
    });
    // Ensure that every dataset has options set.  Don't disturb existing datasets, but for once that aren't present, pull
    // one of the default colors.
    const colorSpecs = this.defaultColorSpecs;
    datasetNames.forEach(datasetName => {
      if (!this.datasetOptions[datasetName]) {
        const chosenColor = colorSpecs.pop();
        this.datasetOptions[datasetName] = chosenColor;
      }
    });
  }

  /**
   * Determine if the loaded data matches a chartType, where chartType is one of the supported types.
   * This is determined by the numbers and types of columns that can be loaded.  Briefly:
   * 1. A pie, doughnut, or polarArea chart has dataset categories  in the first column and values in the
   *    second column.  Therefore, the first column is arbitrary, the second column numeric
   * 2. A line, area, or  bar chart has data points in the first column and dataset values in
   *    the other columns.  The first column is arbitrary, the remainder numeric
   * 3. A scatter chart has three columns: the first column is the dataset name, the second column is the x value,
   *    and the third column is the y value.  The first column is arbitrary, the second and third numeric
   * 4. A bubble chart has four columns: the first column is the dataset name, the second column is the x value,
   *    the third column is the y value, and the fourth the size of the point.  The first column is arbitrary,
   *    the remainder numeric
   * @param {string} chartType
   * @returns {boolean}
   */

  dataMatches (chartType = this.type) {
    if (!(this.galyleoData)) {
      return false;
    }
    const columns = this.galyleoData.columns;
    const numericColumns = columns => columns.reduce((acc, col) => acc && col.type == 'number', true);
    switch (chartType) {
      case 'pie':
      case 'doughnut':
      case 'polarArea':
        return columns.length == 2 && columns[1].type == 'number';
      case 'line':
      case 'area':
      case 'bar':
      case 'radar':
        return columns.length > 1 && numericColumns(columns.slice(1));
      case 'scatter':
        return columns.length == 3 && numericColumns(columns.slice(1));
      case 'bubble':
        return columns.length == 4 && numericColumns(columns.slice(1));

      default:
        return false;
    }
  }

  _prepareScatterOrBubbleData () {
    // for a scatter chart or a bubble chart, the data set name is in column 0,
    // the x/y coordinates are in columns 1/2, and, for bubble charts, the
    // r (size) coordinate is in column 3.
    const dataDictionary = {};
    this.galyleoData.rows.forEach(row => {
      const key = row[0]; const data = row.slice(1);
      if (key in dataDictionary) {
        dataDictionary[key].push(data);
      } else {
        dataDictionary[key] = [data];
      }
    });
    const mapRow = this.type == 'scatter' ? row => { return { x: row[0], y: row[1] }; } : row => { return { x: row[0], y: row[1], r: row[2] }; };
    const datasets = Object.keys(dataDictionary).map(key => {
      return {
        label: key,
        data: dataDictionary[key].map(row => mapRow(row))
      };
    });
    return {
      labels: [],
      datasets: datasets
    };
  }

  _prepareLineData () {
    // For area, bar, doughnut, pie, line, polarArea, and radar charts the datasets are in the columns, and the x-axis
    // labels are in column 0.  Note we want the ordered values for the labels just as they appear in column 0
    const datasets = this.galyleoData.columns.slice(1).map((column, index) => {
      return {
        label: column.name,
        data: this.galyleoData.rows.map(row => row[index + 1]) // Note we must use index + 1, since the column index is offset by 1 due to the slice operation
      };
    });
    return {
      labels: this.galyleoData.rows.map(row => row[0]),
      datasets: datasets
    };
  }

  // Prepare the data, calling the appropriate preparation routine

  _prepareData () {
    const bubbleOrScatter = this.type == 'bubble' || this.type == 'scatter';
    return bubbleOrScatter ? this._prepareScatterOrBubbleData() : this._prepareLineData();
  }

  // Prepare the chart for drawing, loading the data property with the specification understood by ChartJS to draw
  // the chart.  This uses _prepareData() to get the data into chart form, and then goes through the options to annotate
  // the dataset with appropriate options.
  // This is mostly just going through the datasetOptions property and annotating the data property appropriately, with
  // a couple of complications.
  // 1. For a pie, doughnut, or polarArea chart, there is a single dataset and the labels each have a separate color.
  // 2. An area chart is just a line chart with the fill parameter set.
  // We can simplify these away, and probably should.

  _prepareChart () {
    const data = this._prepareData();
    const pieCharts = ['doughnut', 'polarArea', 'pie'];

    // Note that ChartJS takes colors as strings 'rbga(255, 0, 0, 0.2)', e.g., so convert the colors to strings.
    if (pieCharts.indexOf(this.type) >= 0) {
      // If this is a pie chart, stick the datasets in the labels and put the colors in arrays in dataset 0.
      data.datasets[0].borderColor = data.labels.map(label => this.datasetOptions[label].borderColor.toString());
      data.datasets[0].backgroundColor = data.labels.map(label => this.datasetOptions[label].backgroundColor.toString());
    } else {
      // Otherwise, set the background and border colors for each dataset individually
      data.datasets.forEach(dataset => {
        dataset.borderColor = this.datasetOptions[dataset.label].borderColor.toString();
        dataset.backgroundColor = this.datasetOptions[dataset.label].backgroundColor.toString();
        // area charts are line charts with the fill parameter specified for
        // each dataset.
        if (this.type == 'area') {
          dataset.fill = 'origin';
        } else {
          if (dataset.fill) {
            delete dataset.fill;
          }
        }
      });
    }
    return data;
  }

  /**
 * Draw the visualization.  Just prepare the chart and call drawChart to draw it.
 */

  drawVisualization () {
    if (this.view.context) {
      this.data = this._prepareChart();
      this.drawChart();
    }
  }

  /**
   * Draw the chart.  Takes a config parameter, which is the chartJS specification.  If this isn't provided,
   * the default is this.config, which is derived from this.data.  See properties, above
   */

  drawChart (config = this.config) {
    // this.view.env.forceUpdate();
    this.view.whenRendered().then(_ => {
      if (this.chart) {
        this.chart.destroy();
      }
      if (this.view.context) {
        this.chart = new Chart(this.view.context, config);
      }
    });
  }
}

const ChartDiagram = component({
  type: Canvas,
  defaultViewModel: ChartDiagramModel,
  borderRadius: 5,
  fill: Color.rgb(254, 254, 254),
  extent: pt(465.6, 400.5)
});

// Test data for ChartJS.  Should move to chart-test.js

const _pieData = {
  columns: [{ name: 'Color', type: 'string' }, { name: 'value', type: 'number' }],
  rows: [['red', 300], ['blue', 50], ['yellow', 100]]
};

const _testChartModel = {
  type: 'pie',
  datasetOptions: {
    blue: {
      backgroundColor: Color.rgba(0, 0, 255, 0.2),
      borderColor: Color.rgb(0, 0, 255)
    },
    red: {
      backgroundColor: Color.rgba(255, 0, 0, 0.2),
      borderColor: Color.rgb(255, 0, 0)
    },
    yellow: {
      backgroundColor: Color.rgba(255, 255, 0, 0.2),
      borderColor: Color.rgb(255, 255, 0)
    }
  }
};
// Simple test routines for ChartJS.  Should move to chart-test.js
const makeTestChart = _ => {
  const chart = part(ChartDiagram);
  chart.viewModel.restoreFromSavedForm(_testChartModel);
  chart.viewModel.setData(_pieData);
  return chart;
};

const showTestChart = _ => {
  const chart = makeTestChart();
  chart.openInWorld();
  chart.viewModel.drawVisualization();
};

const editTestChart = _ => {
  const chart = makeTestChart();
  const chartEditor = part(ChartJSEditor);
  chartEditor.viewModel.loadModel(chart.viewModel);
  chartEditor.openInWorld();
  chartEditor.whenRendered().then(_ => chartEditor.viewModel.updatePreview());
};
// editTestChart()

// testChart()

/**
 * The model for an initial ChartJS editor. This permits the user to set the properties of a ChartJS Chart, primarily
 * the chart type and the colors of the various data sets.
 * @properties: baseChart: the ChartDiagramModel of the chart we're editing
 */
export class ChartJSEditorModel extends ViewModel {
  static get properties () {
    return {
      baseChart: { defaultValue: null },
      bindings: {
        get () {
          return [
            { model: 'chartTypeSelector', signal: 'selection', handler: 'updateChartSelection' },
            { model: 'columnSelector', signal: 'selection', handler: 'updateDatasetConfiguration' },
            { model: 'strokeColor', signal: 'color', handler: 'updateStrokeColor' },
            { model: 'fillColor', signal: 'color', handler: 'updateFillColor' },
            { model: 'close button', signal: 'fire', handler: 'close' },
            { model: 'updateChart', signal: 'fire', handler: 'updateBaseChart' }
          ];
        }
      }
    };
  }

  /**
   * Handle a close-button event -- close the editor without updating
   */

  close () {
    this.view.remove();
  }

  /**
   * Load the base chart model that we're editing.  Just pull out its savedForm, set the preview to the saved form,
   * pull its data into the preview, and display the preview.
   * @param {ChartDiagramModel} baseChartModel
   */

  loadModel (baseChartModel) {
    const wrapper = baseChartModel.savedForm();
    const previewChart = this.ui.preview.viewModel;
    previewChart.restoreFromSavedForm(wrapper);
    previewChart.setData(baseChartModel.galyleoData);
    this.baseChart = baseChartModel;
    if (this.viewLoaded) {
      this._initItems();
    }
  }

  viewDidLoad () {
    this.acceptDatasetUpdate = true;
    if (this.ui.preview && this.ui.preview.viewModel && this.ui.preview.viewModel.galyleoData) {
      this._initItems();
    } else {
      this.viewLoaded = true;
    }
  }

  /**
   * Handle an updateChartSelection event.  Set the type of the preview to the chosen type, and update the column selector
   * to the keys for the datasetOptions -- these are the dataset names for the chosen chart.  Note that setting the type
   * of the preview redraws the chart.
   */

  updateChartSelection () {
    const chartType = this.ui.chartTypeSelector.selection;
    if (chartType) {
      this.ui.preview.viewModel.setType(chartType);
      this.ui.columnSelector.items = Object.keys(this.ui.preview.viewModel.datasetOptions);
    }
  }

  /**
   * Handle the dataset selected event from the dataset menu; just update the color values to the
   * colors for this dataset, first taking care to ensure that spurious events from the data color being changed
   * don't force updates to the dataset change.
   */

  updateDatasetConfiguration () {
    const setColorField = (uiField, value) => {
      this.ui[uiField].viewModel.colorValue = value;
      this.ui[uiField].viewModel.update();
    };
    const dataset = this.ui.columnSelector.selection;
    const colorOptions = this.ui.preview.viewModel.datasetOptions[dataset];
    this.acceptDatasetUpdate = false;
    setColorField('fillColor', colorOptions.backgroundColor);
    setColorField('strokeColor', colorOptions.borderColor);
    this.acceptDatasetUpdate = true;
  }

  // An internal routine to update the color option for a data set with a chosen color value, then redraw the preview.
  // It performs the work for updateStrokeColor(), which updates the borderColor field in response to a user action,
  // and updateFillColor(), which updates the backgroundColor field.
  // colorValue is a Color, datasetColorField is a string which tells us what to update.

  _updateColorField (colorValue, datasetColorField) {
    const dataset = this.ui.columnSelector.selection;
    this.ui.preview.viewModel.datasetOptions[dataset][datasetColorField] = colorValue;
    this.ui.preview.viewModel.drawVisualization();
  }

  /**
   * Respond to a color selection on the Stroke Color widget by updating the borderColor of the selected dataset
   */

  updateStrokeColor () {
    if (this.acceptDatasetUpdate) {
      this._updateColorField(this.ui.strokeColor.colorValue, 'borderColor');
    }
  }

  /**
   * Respond to a color selection on the Fill Color widget by updating the backgroundColor of the selected dataset
   */

  updateFillColor () {
    if (this.acceptDatasetUpdate) {
      this._updateColorField(this.ui.fillColor.colorValue, 'backgroundColor');
    }
  }

  /**
   * Redraw the preview chart
   */

  updatePreview () {
    this.ui.preview.viewModel.drawVisualization();
  }

  /**
   * Update the base chart model with the settings from the preview (which has been updated with user actions).
   * This is the handler when the Apply Updates button is pushed.
   */
  updateBaseChart () {
    const previewModel = this.ui.preview.viewModel;
    const saved = previewModel.savedForm();
    this.baseChart.restoreFromSavedForm(saved);
  }

  _initItems () {
    this.ui.chartTypeSelector.items = this.ui.preview.viewModel.chartTypesMatchingData();
    this.ui.columnSelector.items = Object.keys(this.ui.preview.viewModel.datasetOptions);
    this.ui.preview.viewModel.drawVisualization();
  }
}

const ChartJSEditor = component(GalyleoWindow, {
  name: 'ChartJS Editor',
  extent: pt(800, 450),
  defaultViewModel: ChartJSEditorModel,
  layout: new TilingLayout({
    axis: 'column',
    orderByIndex: true,
    padding: rect(0, 0, 2, 0),
    resizePolicies: [['window title', {
      height: 'fixed',
      width: 'fill'
    }], ['editor', {
      height: 'fixed',
      width: 'fixed'
    }]],
    wrapSubmorphs: false
  }),
  submorphs: [
    { name: 'window title', textString: 'ChartJS Editor', reactsToPointer: false },
    add({
      extent: pt(800, 400),
      name: 'editor',
      fill: Color.rgba(255, 255, 255, 0),
      submorphs: [
        part(MenuBarButton, {
          tooltip: 'Close this dialog without loading',
          name: 'close button',
          extent: pt(100, 35),
          position: pt(680, 10),
          submorphs: [{
            name: 'label',
            textAndAttributes: ['CLOSE', null]
          }, {
            name: 'icon',
            extent: pt(14, 14),
            imageUrl: projectAsset('close-button-icon-2.svg')
          }]

        }),
        part(GalyleoDropDown, { name: 'chartTypeSelector', viewModel: { placeholder: 'Select chart type...', openListInWorld: true }, position: pt(490, 40) }),
        part(GalyleoDropDown, { name: 'columnSelector', viewModel: { placeholder: 'Select column...', openListInWorld: true }, position: pt(490, 95) }),
        {
          type: Label,
          name: 'Fill Label',
          textAndAttributes: ['Fill', null],
          fontColor: Color.rgb(0, 0, 0),
          fontFamily: 'Sans-Serif',
          fontSize: 14,
          fontWeight: 'bold',
          position: pt(490, 170)
        },
        part(GalyleoColorInput, { name: 'fillColor', position: pt(540, 165) }),
        {
          type: Label,
          name: 'Stroke Label',
          textAndAttributes: ['Stroke', null],
          fontColor: Color.rgb(0, 0, 0),
          fontFamily: 'Sans-Serif',
          fontSize: 14,
          fontWeight: 'bold',
          position: pt(490, 200)
        },
        part(GalyleoColorInput, { name: 'strokeColor', position: pt(540, 195) }),
        part(ChartDiagram, { name: 'preview', position: pt(10, 10) }),
        part(PromptButton, {
          name: 'updateChart',
          position: pt(610, 360),
          extent: pt(165, 40),
          submorphs: [{
            name: 'label', textAndAttributes: ['Apply Changes', null]
          }]
        })
      ]
    })

  ]
});

export { ChartBuilder, GoogleChartHolder, ChartJSEditor, ChartDiagram };
