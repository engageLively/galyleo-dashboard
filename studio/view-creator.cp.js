import { TilingLayout } from 'lively.morphic';
import { ViewModel, without, add, component, part } from 'lively.morphic/components/core.js';
import { GalyleoWindow, GalyleoDropDown, GalyleoList, PromptButton, MenuBarButton } from './shared.cp.js';
import { Label } from 'lively.morphic/text/label.js';
import { pt, rect } from 'lively.graphics/geometry-2d.js';
import { Color } from 'lively.graphics/color.js';
import { GalyleoSearch } from './inputs/search.cp.js';

/**
 * A View Editor.  This permits dashboard designers to edit
 * view specifications, which are stored in dashboard.views under
 * view name.  Note that this only edits view specifications; the view
 * builder creates a stub specification under the view's name with the
 * underlying table.  These two properties (the name and the table) are
 * fixed and cannot be changed when the view is edited.
 * This is just a framework that holds editors for each of the three
 * major components of a view.  The viewColumnChooser lets the designer
 * select the columns to be included in the view, the viewFilterChooser
 * lets the designer select the widgets which control the rows to be shown,
 * and the viewFilterPanel lets the designer fix values for other columns
 * and statically filter the rows.
 */
export class ViewBuilderModel extends ViewModel {
  /**
   * Get the view from the dashboard, pull out the underlying table,
   * and then initialize the three component editors.  Table, viewName, and
   * Dashboard are stored for future reference and callbacks.  The state of the
   * View on the basis of the designer's inputs is always found in this.viewSpec.
   * @param { string } viewName - The name of the view to edit
   * @param { Dashboard } dashboard - The dashboard holding the view, the underlying table.
   */
  init (viewName, dashboard) {
    const aView = dashboard.views[viewName];
    this.table = aView.table;
    this.dashboard = dashboard;
    this.viewName = viewName;
    // udpate the lable with the view's name
    this.getSubmorphNamed('viewName').textString = viewName;
    // initialize the column chooser with all columns from the table.
    // the second parameter to columnChooser.init is the currently selected
    // columns, if any; this is in aView.columns
    const allColumns = this.dashboard.getColumnsOfType([], this.table);

    this.getSubmorphNamed('viewColumnChooser').init(allColumns, aView.columns);
    // initialize the widget chooser with all widgets from the dashboard whose
    // column is one of the columns in the table (a widget over a column not
    // in the table will have no effect on filtering the rows).
    // the second parameter to filterChoose.init is the currently selected
    // widgets, if any; this is in aView.filterNames
    let filterNames = this.dashboard.filterNames;
    filterNames = filterNames.filter(filterName => {
      const filterColumn = this.dashboard.filters[filterName].morph.columnName;
      return allColumns.indexOf(filterColumn) >= 0;
    });
    // and pick up the filters that are embedded in the charts
    let chartNames = this.dashboard.chartNames;
    chartNames = chartNames.filter(chartName => {
      const chartColumn = this.dashboard.charts[chartName].filter.columnName;
      return allColumns.indexOf(chartColumn) >= 0;
    });
    filterNames = filterNames.concat(chartNames);
    this.getSubmorphNamed('viewFilterChooser').init(filterNames, aView.filterNames);
    // Finally, initialize the internal filter panel with the currently selected
    // filter list.  Supply the dashboard, table, and columns to prevent the
    // panel from having to call back with this information.
    // this.getSubmorphNamed('viewFilterPanel').init(this.dashboard, this.table, allColumns, aView.filterList);
  }
  
  /**
   * The current view specificaton, which consists of:
   * 1.  The name of the underlying table;
   * 2. The columns which comprise this view;
   * 3.  The names of the widgets used to filter values
   * 4. The internal filters with fixed values used to filter values updateView() loads this into dashboard[viewName]
   */
  get viewSpec () {
    return {
      table: this.table,
      columns: this.getSubmorphNamed('viewColumnChooser').columns,
      filterNames: this.getSubmorphNamed('viewFilterChooser').selectedFilters
      /* filterList: this.getSubmorphNamed('viewFilterPanel').filterList */
    };
  }
  
  /**
   * Close the view builder.  This is a target for the Close button, which
   * which formerly just went to remove.  The added cleanup is to remove this
   * view builder from the dashboard's list of openViewBuilders
   */
  closeViewBuilder () {
    delete this.dashboard.viewBuilders[this.viewName];
    this.remove();
  }
  
  /**
   * Load the current view specification into the dashboard.  This is done
   * when the Update View button is fired.
   */
  updateView () {
    this.dashboard.views[this.viewName] = this.viewSpec;
    this.dashboard.dirty = true;
    this.remove();
  }
}

// ViewBuilder.openInWorld();
const ViewBuilder = component(GalyleoWindow, {
  name: 'view builder',
  defaultViewModel: ViewBuilderModel,
  layout: new TilingLayout({
    axis: 'column',
    orderByIndex: true,
    resizePolicies: [['window title', {
      height: 'fixed',
      width: 'fill'
    }], ['contents wrapper', {
      height: 'fill',
      width: 'fill'
    }]],
    wrapSubmorphs: false
  }),
  extent: pt(409.8, 543.3),
  submorphs: [
    { name: 'window title', textString: '[View name]' },
    add({
      name: 'contents wrapper',
      borderColor: Color.rgb(127, 140, 141),
      borderRadius: 10,
      extent: pt(435.8, 513),
      fill: Color.rgba(215, 219, 221, 0),
      layout: new TilingLayout({
        axis: 'column',
        axisAlign: 'center',
        orderByIndex: true,
        padding: rect(20, 20, 4, 0),
        resizePolicies: [['header', {
          height: 'fixed',
          width: 'fill'
        }], ['column header', {
          height: 'fixed',
          width: 'fill'
        }], ['column list', {
          height: 'fill',
          width: 'fill'
        }], ['widget header', {
          height: 'fixed',
          width: 'fill'
        }], ['widget list', {
          height: 'fill',
          width: 'fill'
        }], ['footer', {
          height: 'fixed',
          width: 'fill'
        }]],
        spacing: 13,
        wrapSubmorphs: false
      }),
      submorphs: [{
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
      }, {
        name: 'column header',
        layout: new TilingLayout({
          align: 'center',
          axisAlign: 'center',
          justifySubmorphs: 'spaced',
          orderByIndex: true,
          resizePolicies: [['buffer', {
            height: 'fixed',
            width: 'fill'
          }]],
          spacing: 3,
          wrapSubmorphs: false
        }),
        fill: Color.transparent,
        submorphs: [{
          type: Label,
          name: 'columns label',
          fontColor: Color.rgb(89, 89, 89),
          fontSize: 15,
          fontWeight: 700,
          textAndAttributes: ['Column selector', null]
        }, {
          name: 'buffer',
          borderColor: Color.rgb(23, 160, 251),
          borderWidth: 0,
          extent: pt(146, 26.7),
          fill: Color.rgba(0, 0, 0, 0)
        }, part(MenuBarButton, {
          name: 'select all columns button',
          extent: pt(77.1, 22.9),
          submorphs: [{
            name: 'label',
            textAndAttributes: ['select all', null]
          }, without('icon')]
        }), part(MenuBarButton, {
          name: 'edit columns button',
          extent: pt(27.9, 25.6),
          submorphs: [without('label'), {
            name: 'icon',
            imageUrl: 'https://fra1.digitaloceanspaces.com/typeshift/engage-lively/galyleo/edit-icon.svg'
          }]
        })]
      },
      part(GalyleoList, {
        name: 'column list',
        submorphs: [{
          name: 'item list',
          extent: pt(386, 163),
          clipMode: 'hidden'
        }, {
          name: 'scroll bar',
          extent: pt(4.6, 125.7),
          position: pt(353.4, 10.1)
        }] 
      }),
      {
        name: 'widget header',
        layout: new TilingLayout({
          align: 'center',
          axisAlign: 'center',
          justifySubmorphs: 'spaced',
          orderByIndex: true,
          wrapSubmorphs: false
        }),
        fill: Color.transparent,
        submorphs: [{
          type: Label,
          name: 'widget label',
          fontColor: Color.rgb(89, 89, 89),
          fontSize: 15,
          fontWeight: 700,
          textAndAttributes: ['Widget selector', null]
        }, part(MenuBarButton, {
          name: 'select all widgets button',
          extent: pt(77.1, 22.9),
          submorphs: [{
            name: 'label',
            textAndAttributes: ['select all', null]
          }, without('icon')]
        })]
      },
      part(GalyleoList, {
        name: 'widget list',
        submorphs: [{
          name: 'item list',
          extent: pt(386, 163),
          clipMode: 'hidden'
        }, {
          name: 'scroll bar',
          extent: pt(4.6, 125.7),
          position: pt(353.4, 10.1)
        }] 
      }),
      {
        name: 'footer',
        extent: pt(384, 10),
        fill: Color.rgba(0, 0, 0, 0),
        layout: new TilingLayout({
          align: 'right',
          orderByIndex: true,
          wrapSubmorphs: false
        }),
        submorphs: [part(PromptButton, {
          name: 'report button',
          extent: pt(139.2, 33.2),
          submorphs: [{
            type: Label,
            name: 'label',
            textAndAttributes: ['Update view', null]
          }, without('icon')]
        })]
      }]
    })]
});

export class ViewCreatorPromptModel extends ViewModel {
  init (dashboard) {
    this.getSubmorphNamed('view creator').init(dashboard);
  }

  createView () {
    if (this.getSubmorphNamed('view creator').createView()) { this.close(); }
  }

  close () {
    this.remove();
  }
}

export class ViewCreatorModel extends ViewModel {
  init (dashboard) {
    this.dashboard = dashboard;
    this.getSubmorphNamed('viewName').input = '';
    this.getSubmorphNamed('tableList').items = [...dashboard.tableNames];
    this.getSubmorphNamed('tableList').selection = '__no_selection__';
  }

  __nameOK__ () {
    const input = this.getSubmorphNamed('viewName').textString;
    if (input.length === 0) {
      return false;
    }
    const allNames = this.dashboard.tableNames.concat(this.dashboard.viewNames);
    return allNames.indexOf(input) < 0;
  }

  __tableOK__ () {
    return this.getSubmorphNamed('tableList').selection !== '__no_selection__';
  }

  createView () {
    if (this.__nameOK__() && this.__tableOK__()) {
      const name = this.getSubmorphNamed('viewName').textString;
      const table = this.getSubmorphNamed('tableList').selection;
      this.dashboard.addView(name, { table: table });
      this.dashboard.createViewEditor(name);
      this.init(this.dashboard);
      return true;
    } else {
      if (!this.__nameOK__()) { this.getSubmorphNamed('viewName').indicateError('Please enter a name'); }
      return false;
    }
  }
}

// ViewCreator.openInWorld()
const ViewCreator = component({
  name: 'view creator',
  layout: new TilingLayout({
    axis: 'column',
    axisAlign: 'right',
    orderByIndex: true,
    padding: rect(10, 10, 0, 0),
    resizePolicies: [['header', {
      height: 'fixed',
      width: 'fill'
    }], ['view name input', {
      height: 'fixed',
      width: 'fill'
    }], ['table selector', {
      height: 'fixed',
      width: 'fill'
    }]],
    spacing: 10,
    wrapSubmorphs: false
  }),
  extent: pt(397.9, 182.2),
  fill: Color.rgba(255, 255, 255, 0),
  defaultViewModel: ViewCreatorModel,
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
      name: 'view name input',
      placeholder: 'View name',
      submorphs: [{
        name: 'placeholder',
        extent: pt(91, 28.8),
        textAndAttributes: ['View name', null]
      }] 
    }),
    part(GalyleoDropDown, { name: 'table selector', viewModel: { placeholder: 'Select table...' } }),
    part(PromptButton, {
      name: 'create view button',
      extent: pt(116.2, 30.5),
      submorphs: [{
        name: 'label',
        textAndAttributes: ['Create view', null]
      },
      without('icon')] 
    })
  ]
});
// ViewCreatorPrompt.openInWorld()
const ViewCreatorPrompt = component(GalyleoWindow, {
  name: 'view creator/prompt',
  layout: new TilingLayout({
    axis: 'column',
    orderByIndex: true,
    resizePolicies: [['window title', {
      height: 'fixed',
      width: 'fill'
    }], ['view creator', {
      height: 'fixed',
      width: 'fill'
    }]],
    hugContentsVertically: true,
    wrapSubmorphs: false
  }),
  defaultViewModel: ViewCreatorPromptModel,
  submorphs: [
    { name: 'window title', textString: 'View builder' },
    add(part(ViewCreator, { name: 'view creator' }))
  ]
});

export { ViewBuilder, ViewCreatorPrompt, ViewCreator };
