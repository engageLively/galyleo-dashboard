import { ViewModel, without, part, add, component } from 'lively.morphic';
import { pt, Color, rect } from 'lively.graphics';
import { connect } from 'lively.bindings';
import { TilingLayout, HTMLMorph } from 'lively.morphic';
import { GalyleoSearch } from './inputs/search.cp.js';
import { GalyleoWindow, PromptButton, GalyleoDropDown, MenuBarButton } from './shared.cp.js';

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
            extent: pt(90, 35),
            submorphs: [{
              name: 'label',
              textAndAttributes: ['CLOSE', null]
            }, {
              name: 'icon',
              extent: pt(14, 14),
              imageUrl: 'https://fra1.digitaloceanspaces.com/typeshift/engage-lively/galyleo/close-button-icon-2.svg'
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
    delete this.wrapper; // make sure this is clean;
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
    wrapper.draw(this.chartDiv);
    this.wrapper = wrapper;
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

export { ChartBuilder, GoogleChartHolder };
