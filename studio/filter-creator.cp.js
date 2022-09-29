import { TilingLayout } from 'lively.morphic';
import { Color } from 'lively.graphics/index.js';
import { PromptButton, GalyleoDropDown, MenuBarButton, GalyleoWindow } from './shared.cp.js';
import { component, ViewModel, without, part, add } from 'lively.morphic/components/core.js';
import { rect, pt } from 'lively.graphics/geometry-2d.js';
import { GalyleoSearch } from './inputs/search.cp.js';
import { SelectFilter, DateFilter, BooleanFilter, SliderFilter, DoubleSliderFilter, RangeFilter, ListFilter } from './filters.cp.js';

const FilterSettings = component({
  name: 'filter settings',
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
    }], ['filter selector', {
      height: 'fixed',
      width: 'fill'
    }], ['column selector', {
      height: 'fixed',
      width: 'fill'
    }]],
    spacing: 10,
    wrapSubmorphs: false
  }),
  extent: pt(397.9, 182.2),
  fill: Color.rgba(255, 255, 255, 0),
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
      name: 'filter name input',
      placeholder: 'Filter name'
    }),
    part(GalyleoDropDown, { name: 'filter selector', viewModel: { placeholder: 'Select widget...', openListInWorld: true } }),
    part(GalyleoDropDown, { name: 'column selector', viewModel: { placeholder: 'Select column...', openListInWorld: true } }),
    part(PromptButton, {
      name: 'confirm button',
      extent: pt(116.2, 30.5),
      submorphs: [{
        name: 'label',
        textAndAttributes: ['Create filter', null]
      },
      without('icon')]
    })
  ]
});

/**
 * The filterCreator that is the interface between this filterBuilder and
 * the dashboard
 */
export class FilterBuilderModel extends ViewModel {
  static get properties () {
    return {
      dashboard: {},
      expose: {
        get () {
          return ['init'];
        }
      },
      bindings: {
        get () {
          return [
            { model: 'close button', signal: 'fire', handler: 'cancel' },
            { model: 'confirm button', signal: 'fire', handler: 'createFilter' },
            { model: 'filter selector', signal: 'selection', handler: 'updateColumns' }
          ];
        }
      }
    };
  }

  /**
   * The filterTypes.  The keys here are the items in the filterType
   * dropdown; to add a new filter, add an entry here.  Each filter has
   * three items - a columnType array, the types of columns which can be
   * used by this, a filterType, which is either Select or Range, and
   * a part, which is the part which will be used to build the filter.
   */
  get filterTypes () {
    return {
      dropdown: { columnTypes: [], filterType: 'Select', part: SelectFilter },
      list: { columnTypes: [], filterType: 'Select', part: ListFilter },
      minMax: { columnTypes: ['number'], filterType: 'Range', part: RangeFilter },
      doubleSlider: { columnTypes: ['number'], filterType: 'Range', part: DoubleSliderFilter },
      slider: { columnTypes: ['number'], filterType: 'NumericSelect', part: SliderFilter },
      toggle: { columnTypes: ['boolean'], filterType: 'Boolean', part: BooleanFilter },
      date: { columnTypes: ['date'], filterType: 'Select', part: DateFilter }
    };
  }

  /**
   * Get the columns for a particular filterType, which is either Range or Select.
   * Range filters are over numeric columns, Select filters are for columns of
   * any type.  Possible refactorization: have the FilterBuilder supply the types
   * and this just handles the callback.
   * Called from the FilterBuilder
   * @param { string } filterType - The type of filter to get the columns for
   * @returns { string[] } A list of column names which match the types the filter can accept.
   */
  getColumns (filterType) {
    return this.dashboard ? this.dashboard.dataManager.getColumnsOfTypes([]) : [];
  }

  getColumnsOfType (typeArray) {
    return this.dashboard ? this.dashboard.dataManager.getColumnsOfTypes(typeArray) : [];
  }

  viewDidLoad () {
    // this.init();
  }

  /**
   * A Filter Builder.  The object that created this must
   * implement the FilterCreator API, namely:
   * 1. Initializing this immediately on creation
   * 2. providing the right columns for the chosen filter type
   *    getColumnsForFilter(filterType).  filterType will be one of "Range","Select"
   * 3. actually creating the filter and potentially disposing of
   *    this in response to a createFilter(filterBuilderMorph, filterType, columnName)
   *    call. filterType will be one of "Range", "Select"
   * 4. Responding to a cancel event, disposing on this and whatever else
   *    needs to be done.  Call is cancelFilterCreation(filterBuilderMorph)
   * @param { FilterCreator } filterCreator - The filter creator to utilize.
   * @param { Morph } filter - The filter morph that is supposed to be edited.
   */
  init (dashboard) {
    this.dashboard = dashboard;
    this._initDropDowns();
  }

  /**
   * Initialize the dropdown menus.  This is called by onLoad() and init()
   * and it principally initializes the filterType dropdown.  It also ensures
   * that there is a selection in this dropDown, so this never null.
   * Used to call updateColumns to ensure that only the right column types,
   * but this led to bad UX (column choices resetting) so now we just flag
   * an error with inconsistent types.
   */
  _initDropDowns () {
    const items = Object.keys(this.filterTypes);
    const filterDropDown = this.ui.filterSelector;
    filterDropDown.items = items;
    const columnSelector = this.ui.columnSelector;
    const columns = this.getColumnsOfType([]);
    if (columns && columns.length > 0) {
      columnSelector.items = columns;
    }
  }

  /**
   * Check a filter and column for consistency -- does this filter filter
   * values for this column?
   * @param { string } selectedColumn - Name of the column to be used.
   * @param { string } selectedFilter - The filter type chosen corresponding to selectedFilterName.
   * @param { string } selectedFilterName - Name of the selected filter.
   */
  _checkConsistency (selectedColumn, selectedFilter, selectedFilterName) {
    const columns = this.getColumnsOfType(selectedFilter.columnTypes);
    if (columns && columns.length > 0) {
      if (columns.indexOf(selectedColumn) >= 0) {
        return { valid: true };
      } else {
        return { valid: false, message: `Valid column types for ${selectedFilterName} are ${selectedFilter.columnTypes.join(', ')}` };
      }
    } else {
      return { valid: false, message: `No matching columns found for  ${selectedFilterName}` };
    }
  }

  /**
   * Create a filter.  This just calls the FilterCreator to do it; it's provided
   * here so the create button will have a local target.  Get the selected filter
   * from the filterType dropdown, and then use this to figure out what kind of
   * filter (Range or Select) is being asked for, and what part is being
   * used to build it.  Then extract the column type and get filterCreator to
   * make the filter.
   */
  async createFilter () {
    const { filterSelector, columnSelector } = this.ui;
    const selectedFilterName = filterSelector.selection;
    const selectedFilter = this.filterTypes[selectedFilterName];
    const selectedColumn = columnSelector.selection;
    if (!selectedFilter) {
      filterSelector.toggleError();
      return false;
    }
    if (!selectedColumn) {
      columnSelector.toggleError();
      return false;
    }
    const validity = this._checkConsistency(selectedColumn, selectedFilter, selectedFilterName);
    if (!validity.valid) {
      this.showError(validity.message);
      return false;
    }
    await this._createFilter(this, selectedFilter.filterType, selectedFilter.part, selectedColumn);
    this.view.remove();
  }

  getFilterName () {
    return this.ui.filterNameInput.textString;
  }

  /**
   * Actually create the filter.  This is the most complex method here.
   * Given a filterType and columnName, find the name for this
   * filter from the text input widget.  Then, make sure that
   * the dashboard has a filters dictionary, and check to see if
   * that dictionary already has a filter with the desired name.  If
   * it does, two cases: one, it's a bogus remnant, in which case just
   * delete the remnant; two, it is an existing filter, in which case
   * just throw the request on the floor (should have an error indication).
   * Once that's done, ask the dashboard to build the requested filter.  Finally,
   * clear the text input.
   * @param { FilterBuilder } filterBuilder - The FilterBuilder that requested this (unused; drop?
                  See FilterBuilder and the filter panel in ChartBuilder)
   * @param { string } filterType - The type of filter to create.
   * @param { Morph } filterPart - The component to use to create the filter.
   * @param { string } columnName - The column for the filter.
   */
  async _createFilter (filterBuilder, filterType, filterPart, columnName) {
    const filterName = this.getFilterName();
    // alert if there is no name, and return
    if (filterName.length === 0) {
      this.ui.filterName.indicateError('Please enter a name');
      return false;
    }
    // ensure there is a filters dictionary, and there isn't a filter with
    // the requested name already.
    if (!this.dashboard.filters) {
      this.dashboard.filters = {};
    }
    if (this.dashboard.filters[filterName]) {
      if (this.dashboard.getSubmorphNamed(filterName)) {
        this.dashboard.getSubmorphNamed(filterName).show();
        return false;
      } else {
        delete this.dashboard.filters[filterName];
      }
    }
    // create the filter, and add it to the dashboard
    await this.dashboard.createExternalFilter(filterName, columnName, filterType, filterPart);
    return true;
  }

  /**
   * update the columns for the right filter type.  This is called from
   * __initDropDown__() and when the filter type is changed in the menu, via
   * a hardcoded connection.
   */
  updateColumns () {
    const columnSelector = this.ui.columnSelector;
    const selectedFilter = this.filterTypes[this.ui.filterSelector.selection];
    if (!selectedFilter) return;
    const columns = this.getColumnsOfType(selectedFilter.columnTypes);
    if (columns && columns.length > 0) {
      columnSelector.items = columns;
      if (this._editedFilter) {
        columnSelector.selection = this._editedFilter.filterMorph.columnName;
      } else {
        columnSelector.selection = columns[0];
      }
    }
  }

  /**
   * Handle the cancel event.  Just passes this to the filterCreator:
   */
  cancelFilterCreation () {
    this.filterCreator.cancelFilterCreation(this);
  }

  cancel () {
    this.view.remove();
  }
}

export class FilterEditorModel extends FilterBuilderModel {
  static get properties () {
    return {
      editedFilter: {
        serialize: false,
        get () {
          return this.dashboard.filters[this._filterName].morph;
        }
      },

      bindings: {
        get () {
          return [
            { model: 'close button', signal: 'fire', handler: 'cancel' },
            { model: 'confirm button', signal: 'fire', handler: 'applyChanges' },
            { model: 'filter selector', signal: 'selection', handler: 'updateColumns' }
          ];
        }
      }
    };
  }

  getFilterName () {
    return this._filterName;
  }

  init (dashboard, filterName) {
    super.init(dashboard);
    const { filterSelector, columnSelector, windowTitle } = this.ui;
    this._filterName = filterName;
    windowTitle.textString = `Filter: ${filterName}`;
    filterSelector.selection = this.editedFilter.filterMorph.widgetType;
    columnSelector.selection = this.editedFilter.filterMorph.columnName;
  }

  async applyChanges () {
    // easy to just remove and add a new filter to replace the current one
    const pos = this.dashboard.filters[this._filterName].morph.position;
    await this.dashboard.removeFilter(this._filterName, false);
    await this.createFilter();
    this.dashboard.filters[this._filterName].morph.position = pos; // preserve the position
    this.dashboard.dirty = true;
    this.view.remove();
  }
}

// FilterEditor.openInWorld()
const FilterEditor = component(GalyleoWindow, {
  name: 'filter settings prompt',
  defaultViewModel: FilterEditorModel,
  extent: pt(402, 211),
  layout: new TilingLayout({
    axis: 'column',
    orderByIndex: true,
    padding: rect(0, 0, 2, 0),
    resizePolicies: [['window title', {
      height: 'fixed',
      width: 'fill'
    }], ['controls', {
      height: 'fill',
      width: 'fill'
    }]],
    wrapSubmorphs: false
  }),
  submorphs: [
    { name: 'window title', textString: 'Filter: [filter name]' },
    add(part(FilterSettings, {
      name: 'controls',
      submorphs: [
        without('filter name input'),
        {
          name: 'confirm button',
          submorphs: [{ name: 'label', textAndAttributes: ['Apply changes', null] }]
        }
      ]
    }))
  ]
});

// FilterBuilder.openInWorld()
const FilterBuilder = component(GalyleoWindow, {
  name: 'filter builder',
  defaultViewModel: FilterBuilderModel,
  layout: new TilingLayout({
    axis: 'column',
    orderByIndex: true,
    padding: rect(0, 0, 2, 0),
    resizePolicies: [['window title', {
      height: 'fixed',
      width: 'fill'
    }], ['controls', {
      height: 'fill',
      width: 'fill'
    }]],
    wrapSubmorphs: false
  }),
  submorphs: [
    { name: 'window title', textString: 'Filter builder' },
    add(part(FilterSettings, { name: 'controls' }))
  ]
});

export { FilterEditor, FilterBuilder };
