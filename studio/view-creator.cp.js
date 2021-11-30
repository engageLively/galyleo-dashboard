import { Morph } from 'lively.morphic';

export class ViewBuilder extends Morph {
  /*
  ** A View Editor.  This permits dashboard designers to edit
  ** view specifications, which are stored in dashboard.views under
  ** view name.  Note that this only edits view specifications; the view
  ** builder creates a stub specification under the view's name with the
  ** underlying table.  These two properties (the name and the table) are
  ** fixed and cannot be changed when the view is edited.
  ** This is just a framework that holds editors for each of the three
  ** major components of a view.  The viewColumnChooser lets the designer
  ** select the columns to be included in the view, the viewFilterChooser
  ** lets the designer select the widgets which control the rows to be shown,
  ** and the viewFilterPanel lets the designer fix values for other columns
  ** and statically filter the rows.
  */
  // initialize.  Get the view from the dashboard, pull out the underlying table,
  // and then initialize the three component editors.  Table, viewName, and
  // Dashboard are stored for future reference and callbacks.  The state of the
  // View on the basis of the designer's inputs is always found in this.viewSpec.
  // parameters:
  //   viewName: the name of the view to edit
  //   dashboard: the dashboard holding the view, the underlying table.
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

  // The current view specificaton, which consists of:
  // 1.  The name of the underlying table;
  // 2. The columns which comprise this view;
  // 3.  The names of the widgets used to filter values
  // 4. The internal filters with fixed values used to filter values
  // updateView() loads this into dashboard[viewName]

  get viewSpec () {
    return {
      table: this.table,
      columns: this.getSubmorphNamed('viewColumnChooser').columns,
      filterNames: this.getSubmorphNamed('viewFilterChooser').selectedFilters
      /* filterList: this.getSubmorphNamed('viewFilterPanel').filterList */
    };
  }

  // Close the view builder.  This is a target for the Close button, which
  // which formerly just went to remove.  The added cleanup is to remove this
  // view builder from the dashboard's list of openViewBuilders

  closeViewBuilder () {
    delete this.dashboard.viewBuilders[this.viewName];
    this.remove();
  }

  // Load the current view specification into the dashboard.  This is done
  // when the Update View button is fired.

  updateView () {
    this.dashboard.views[this.viewName] = this.viewSpec;
    this.dashboard.dirty = true;
    this.remove();
  }
}

export class ViewCreatorPrompt extends Morph {
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

export class ViewCreator extends Morph {
  init (dashboard) {
    this.dashboard = dashboard;
    this.getSubmorphNamed('viewName').input = '';
    this.getSubmorphNamed('tableList').items = [...dashboard.tableNames];
    this.getSubmorphNamed('tableList').selection = '__no_selection__';
  }

  __nameOK__ () {
    const input = this.getSubmorphNamed('viewName').textString;
    if (input.length == 0) {
      return false;
    }
    const allNames = this.dashboard.tableNames.concat(this.dashboard.viewNames);
    return allNames.indexOf(input) < 0;
  }

  __tableOK__ () {
    return this.getSubmorphNamed('tableList').selection != '__no_selection__';
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
