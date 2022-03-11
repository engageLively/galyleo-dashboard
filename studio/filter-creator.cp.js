import { Morph, TilingLayout } from 'lively.morphic';
import { Color } from 'lively.graphics/index.js';
import { connect, signal } from 'lively.bindings/index.js';
import { noUpdate } from 'lively.bindings/index.js';
import { PromptButton, GalyleoDropDown, MenuBarButton, GalyleoWindow } from './shared.cp.js';
import { component, without, part, add } from 'lively.morphic/components/core.js';
import { rect, pt } from 'lively.graphics/geometry-2d.js';
import { GalyleoSearch } from './inputs/search.cp.js';
import { SelectFilter, BooleanFilter, SliderFilter, DoubleSliderFilter, RangeFilter, ListFilter } from './filters.cp.js';

export class FilterEditorMorph extends Morph {
  async init (aFilterMorph) {
    const done = this.getSubmorphNamed('done');
    this.getSubmorphNamed('filter container').submorphs = [aFilterMorph];
    connect(done, 'fire', this, 'remove');
    signal(this, 'close');
  }
}

// FilterEditor.openInWorld()
const FilterEditor = component(GalyleoWindow, {
  name: 'filter editor',
  type: FilterEditorMorph,
  layout: new TilingLayout({
    axis: 'column',
    orderByIndex: true,
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
    { name: 'window title', textString: 'Filter editor' },
    add({
      name: 'controls',
      fill: Color.rgba(255, 255, 255, 0),
      layout: new TilingLayout({
        axis: 'column',
        axisAlign: 'right',
        orderByIndex: true,
        padding: rect(20, 20, 0, 0),
        resizePolicies: [['filter container', {
          height: 'fill',
          width: 'fill'
        }]],
        spacing: 10,
        wrapSubmorphs: false
      }),
      submorphs: [
        {
          name: 'filter container',
          fill: Color.transparent
        },
        part(PromptButton, {
          name: 'done',
          extent: pt(78.9, 29.6),
          submorphs: [{
            name: 'label',
            textAndAttributes: ['Done', null]
          }, without('icon')] 
        })
      ]
    })
  ]
});

/**
 * The filterCreator that is the interface between this filterBuilder and
 * the dashboard
 */
export class FilterBuilderMorph extends Morph {
  static get properties () {
    return {
      filterCreator: { defaultValue: null }
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
      toggle: { columnTypes: ['boolean'], filterType: 'Boolean', part: BooleanFilter }
    };
  }

  onLoad () {
    this.whenRendered().then(_ => noUpdate(() => this.__initDropDowns__()));
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
  init (filterCreator, filter) {
    this.filterCreator = filterCreator;
    if (filter) this._editedFilter = filter;
    this.__initDropDowns__();
  }
  
  /**
   * Initialize the dropdown menus.  This is called by onLoad() and init()
   * and it principally initializes the filterType dropdown.  It also ensures
   * that there is a selection in this dropDown, so this never null.
   * Used to call updateColumns to ensure that only the right column types,
   * but this led to bad UX (column choices resetting) so now we just flag
   * an error with inconsistent types.
   */
  __initDropDowns__ () {
    const items = Object.keys(this.filterTypes);
    const filterDropDown = this.getSubmorphNamed('filterType');
    filterDropDown.items = items;
    if (this._editedFilter) {
      filterDropDown.selection = this._editedFilter.filterMorph.widgetType;
    }
    // this.updateColumns();
    const columnSelector = this.getSubmorphNamed('columnSelector');
    const columns = this.filterCreator.getColumnsOfType([]);
    if (columns && columns.length > 0) {
      columnSelector.items = columns;
      if (this._editedFilter) {
        columnSelector.selection = this._editedFilter.filterMorph.columnName;
      }
    }
  }
  
  /**
   * Check a filter and column for consistency -- does this filter filter
   * values for this column?
   * @param { string } selectedColumn - Name of the column to be used.
   * @param { string } selectedFilter - The filter type chosen corresponding to selectedFilterName.
   * @param { string } selectedFilterName - Name of the selected filter.
   */
  _checkConsistency_ (selectedColumn, selectedFilter, selectedFilterName) {
    const columns = this.filterCreator.getColumnsOfType(selectedFilter.columnTypes);
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
    const selectedFilterName = this.getSubmorphNamed('filterType').selection;
    const selectedFilter = this.filterTypes[selectedFilterName];
    const selectedColumn = this.getSubmorphNamed('columnSelector').selection;
    if (!selectedFilter) {
      this.getSubmorphNamed('filterType').toggleError();
      return false;
    }
    if (!selectedColumn) {
      this.getSubmorphNamed('columnSelector').toggleError();
      return false;
    }
    const validity = this._checkConsistency_(selectedColumn, selectedFilter, selectedFilterName);
    if (!validity.valid) {
      window.alert(validity.message);
      return false;
    }
    return await this.filterCreator.createFilter(this, selectedFilter.filterType, selectedFilter.part, selectedColumn);
  }
  
  /**
   * update the columns for the right filter type.  This is called from
   * __initDropDown__() and when the filter type is changed in the menu, via
   * a hardcoded connection.
   */
  updateColumns () {
    const columnSelector = this.getSubmorphNamed('columnSelector');
    const selectedFilter = this.filterTypes[this.getSubmorphNamed('filterType').selection];
    if (!selectedFilter) return;
    const columns = this.filterCreator.getColumns(selectedFilter.columnTypes);
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
}

// FilterBuilder.openInWorld()
const FilterBuilder = component(GalyleoWindow, {
  name: 'filter builder',
  type: FilterBuilderMorph,
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
    add({
      name: 'controls',
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
        }], ['widget selector', {
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
        part(GalyleoDropDown, { name: 'widget selector', viewModel: { placeholder: 'Select widget...' } }),
        part(GalyleoDropDown, { name: 'column selector', viewModel: { placeholder: 'Select column...' } }),
        part(PromptButton, {
          name: 'create filter button',
          extent: pt(116.2, 30.5),
          submorphs: [{
            name: 'label',
            textAndAttributes: ['Create filter', null]
          },
          without('icon')] 
        })
      ]
    })
  ]
});

/**
 * An InternalFilterBuilder.  This is part of the FilterPanel in ChartBuilder
 * and ChartDataEditor, and is responsible for creating the InternalFilters
 * associated with the chart (the actual creation is done by the containing
 * FilterPanel).  Its role is similar to the filterBuilder submoprph of
 * ExternalFilterCreator.
 */
export class InternalFilterBuilderMorph extends Morph {
  /**
   * Initialize with the containing filterPanel, the columnNames which can
   * be used in a RangeFilter, and the columNames which can be used in a Select
   * Filter.  Just sets the filterPanel instance variable, updates an object
   * with the rangeItems and selectItems parameter so the updateItems method
   * will be able to populate the columnSelector pulldown, and then calls
   * updateItems to appropriately initialize the columnSelector pulldown.
   * @param { FilterPanel } filterPanel - The containing FilterPanel, which is used to create the filters
   * @param { string[] } rangeItems - The columnNames to be used when the "Range" filter type is selected in the filterType pulldown
   * @param { string[] } selectItems - The columnNames to be used when the "Select" filter type is selected in the filterType pulldown
   */
  init (filterPanel, rangeItems, selectItems) {
    this.filterPanel = filterPanel;
    this.items = { Range: rangeItems, Select: selectItems };
    this.updateItems();
    this.verify();
  }
  
  /**
   * Update the items in the columnSelector pulldown, to match the type of
   * filter chosen in the filterType pulldown. This is called from init, above,
   * and is connected to the selection in the filterType pulldown menu.
   */
  updateItems () {
    const filterType = this.getSubmorphNamed('filterType').selection;
    if (this.items[filterType]) {
      this.getSubmorphNamed('columnSelector').items = this.items[filterType];
    }
    this.requestToProceed();
  }
  
  /**
   * Check if all selections have been entered that are needed to proceeed with
   * creating a new internal filter. If not satisfied, the add row filter button
   * is disabled.
   */
  requestToProceed () {
    this.getSubmorphNamed('add filter button').deactivated = !this.verify();
  }
  
  /**
   * Check the input of the selections.
   */
  verify () {
    return (
      this.getSubmorphNamed('filterType').selection !== '__no_selection__' &&
      this.getSubmorphNamed('columnSelector').selection !== '__no_selection__'
    );
  }

  close () {
    // also signal to owner to remove fader
    this.remove();
  }
  
  /**
   * Create a filter.  Just get the filterType and columnName from the
   * two pulldowns, select the filter part implementing the filter type,
   * and call FilterPanel.createFilter to create the filter.
   * This is called with the "Add Filter" button is fired
   */
  createFilter () {
    const parts = {
      Range: RangeFilter,
      Select: SelectFilter
    };
    const filterType = this.getSubmorphNamed('filterType').selection;
    const columnName = this.getSubmorphNamed('columnSelector').selection;
    this.filterPanel.createFilter(filterType, parts[filterType], columnName);
    this.close();
  }
}

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
    }], ['filter type selector', {
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
    part(GalyleoDropDown, { name: 'filter type selector', viewModel: { placeholder: 'Select filter type...' } }),
    part(GalyleoDropDown, { name: 'column selector', viewModel: { placeholder: 'Select column...' } }),
    part(PromptButton, {
      name: 'create filter button',
      extent: pt(116.2, 30.5),
      submorphs: [{
        name: 'label',
        textAndAttributes: ['Apply changes', null]
      },
      without('icon')] 
    })
  ]
});

// FilterSettingsPrompt.openInWorld()
const FilterSettingsPrompt = component(GalyleoWindow, {
  name: 'filter settings prompt',
  extent: pt(339.2, 211),
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
    add(part(FilterSettings, { name: 'controls' }))
  ]
});

// InternalFilterBuilder.openInWorld()
// AKA: Row filter creator
const InternalFilterBuilder = component(GalyleoWindow, {
  name: 'internal filter builder',
  type: InternalFilterBuilderMorph,
  extent: pt(340.5, 210),
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
    { name: 'window title', textString: 'New row filter' },
    add(part(FilterSettings, {
      name: 'controls',
      submorphs: [{
        name: 'create filter button',
        submorphs: [{
          name: 'label',
          textAndAttributes: ['Add row filter', null]
        }]
      }]
    }))
  ]
});

export class FilterEditorPrompt extends Morph {
  init (dashboard, filterName) {
    this._dashboard = dashboard;
    this._filterName = filterName;
    this.getSubmorphNamed('window title').textString = `Filter: ${filterName}`;
    this.getSubmorphNamed('external filter creator').init(dashboard, filterName);
  }

  async applyChanges () {
    // easy to just remove and add a new filter to replace the current one
    const pos = this._dashboard.filters[this._filterName].morph.position;
    this._dashboard.dashboardController.removeFilter(this._filterName);
    await this.getSubmorphNamed('filterBuilder').createFilter();
    this._dashboard.filters[this._filterName].morph.position = pos;
    this._dashboard.dirty = true;
    this.remove();
  }

  close () {
    this.remove();
  }
}

export class FilterCreatorPrompt extends Morph {
  init (dashboard) {
    this.getSubmorphNamed('external filter creator').init(dashboard);
  }

  async create () {
    if (await this.getSubmorphNamed('filterBuilder').createFilter()) { this.remove(); }
  }

  cancel () {
    this.remove();
  }
}

/**
 * An ExternalFilterCreator -- this is the widget that sits on the
 * dashboard controller that the user uses to create new, named filters --
 * morphs with input widgets that the dashboard viewer uses to explore
 * the data. It consists of a text input, and a FilterBuilder, which
 * does the actual filter creation.
 * Filters are the same whether they are external (controlled by the dashboard
 * viewer) or internal (used by the dashboard creator to condition the data on
 * a chart).  As a result, a FilterBuilder is designed to sit inside a parent
 * morph, which implements the FilterCreator interface.  The FilterBuilder calls
 * back to this interface when it's done.  In this case, the ExternalFilterCreator
 * simply wraps a box with the filter name around the filter when it's built,
 * and places this morph on the dashboard.  All of the methods here implement
 * FilterCreator interface.    The internal filter creator is in the ChartBuilder
 * widget.
 */
export default class ExternalFilterCreator extends Morph {
  /**
   * Initialize with the dashboard, and initialize the filterBuilder to
   * tell it that this is the FilterCreator to call back to.
   * @param { Dashboard } dashboard - The dashboard to bind this filter creator to.
   * @param { string } [filterName=false] - An optional name for the filter to be created. 
   */
  init (dashboard, filterName = false) {
    this.dashboard = dashboard;
    const filterBuilder = this.getSubmorphNamed('filterBuilder');

    let filter;
    if (filterName) {
      filter = this.dashboard.filters[filterName].morph;
    }

    filterBuilder.init(this, filter);
    // clear the input string
    this.getSubmorphNamed('filterName').textString = filterName || '';
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
    return this.dashboard ? this.dashboard.getColumnsOfType([]) : [];
  }

  getColumnsOfType (typeArray) {
    return this.dashboard ? this.dashboard.getColumnsOfType(typeArray) : [];
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
  async createFilter (filterBuilder, filterType, filterPart, columnName) {
    const filterNameInput = this.getSubmorphNamed('filterName');
    const filterName = filterNameInput.textString;
    // alert if there is no name, and return
    if (filterName.length === 0) {
      filterNameInput.indicateError('Please enter a name');
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
   * This is called by the FilterBuilder when the user has requested cancel
   * filter creation.  Just clear the name input.
   */
  cancelFilterCreation () {
    this.getSubmorphNamed('filterName').textString = '';
  }
}

export { FilterEditor, FilterBuilder, InternalFilterBuilder, FilterSettingsPrompt };
