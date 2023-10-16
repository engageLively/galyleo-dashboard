import { resource } from 'lively.resources';
// import { signal } from 'lively.bindings';
// import Inspector, { inspect } from 'lively.ide/js/inspector.js';

/*
BSD 3-Clause License

  Copyright (c) 2019-2022, engageLively
  All rights reserved.

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

  1. Redistributions of source code must retain the above copyright notice, this
     list of conditions and the following disclaimer.

  2. Redistributions in binary form must reproduce the above copyright notice,
     this list of conditions and the following disclaimer in the documentation
     and/or other materials provided with the distribution.

  3. Neither the name of the copyright holder nor the names of its
     contributors may be used to endorse or promote products derived from
     this software without specific prior written permission.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
  DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
  FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
  DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
  SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
  CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
  OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
  OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/**
 * @typedef (Object) GalyleoColumn
 * @property {string} name - the column name
 * @property {string} type - the column type
 */

/** @typedef [[@type {number | string}]]} GalyleoDataTable */

/**
 * A Filter.  This is constructed with a Filter Specifcation and a table
 */

class Filter {
  /**
    * Create a Filter
    * @param table, a GalyleoTable
    */
  constructor (table) {
    this.table = table;
  }

  /**
     * Return the indices of the rows of the table parameter which match this filter
     * Must be implemented by each subclass.
     * For internal use only
     * @param {GalyleoDataTable} rows
     * @returns [{number}] {indices of matching rows}
     */
  _getRows_ (rows) {
    throw '_getRows_(rows) must be implemented!';
  }

  /**
     * Return the rows of the original rows which match the filter.  Should not be overridden: this
     * is an overlay on _getRows_ and is used for final reporting
     * @parame {GalyleoDataTable} rows to filter
     * @returns {GalyleoDataTable} Subset of the table which passes the filter
     */
  getRows (rows) {
    const indexes = this._getRows_(rows); // should we catch the error here, or pass it?
    return indexes.map(index => rows[index]);
  }

  /**
   * Test for equality with another Filter.  The subclasses will extend this.  In general, the
   * right implementing strategy for a subclass is to call super(otherFilter), and if that returns
   * true perform other checks, otherwise false
   * @param {Filter} otherFilter: the filter to be checked for equality
   */
  equals (otherFilter) {
    return this.table == otherFilter.table;
  }
}

/**
 * Filter set equality.  This is broken out as a separate function for debugging and visibility
 * @param {[Filter]} filterList1: first list of filters to test for equality
 * @param {[Filter]} filterList2: second list of filters to test for equality
 */
const filterSetEquality = (filterList1, filterList2) => {
  if (!(filterList1 && filterList2)) {
    return false;
  }
  if (filterList1.size != filterList2.size) {
    return false;
  }
  const matches = filterList1.map(_ => [false, false]);
  filterList1.forEach((filt, index) => {
    filterList2.forEach((filt2, index2) => {
      if (filt.equals(filt2)) {
        matches[index][0] = matches[index2][1] = true; // Note the pair
      }
    });
  });
  return matches.reduce((acc, pair) => acc && pair[0] && pair[1], true);
};

/**
 * A Filter which implements a Boolean function (and, or, or not).  Takes a list of filters as an additional argument
 * Still abstract -- implement _getRows_() for each individual Boolean function
 */
class BooleanFilter extends Filter {
  /**
     * Create a BooleanFilter; simply adds the arguments
     * @param {GalyleoDataTable} table
     * @param {Filter[]} args
     */
  constructor (table, args) {
    super(table);
    this.args = args;
  }

  /**
   * Equality check for all boolean filters -- the super check must march, they must have the same number of
   * arguments, and each argument must be equal to one filter in the other List
   * @param {Filter} otherFilter: the filter to be checked for equality
   */

  equals (otherFilter) {
    const findMatch = (filter, filterList) => filterList.reduce((matched, other) => matched || other.equals(filter), false);
    if (super.equals(otherFilter) && this.args.length == otherFilter.args.length) {
      const matched = this.args.map(filter => findMatch(filter, otherFilter.args)).reduce((result, bool) => result && bool, true);
      const otherMatched = otherFilter.args.map(filter => findMatch(filter, this.args)).reduce((result, bool) => result && bool, true);
      return matched && otherMatched;
    } else {
      return false;
    }
  }
}
/**
 * A Filter which implements ALL
 *
 * @param {GalyleoDataTable} rows
 * @returns [{number}] {indices of matching rows}
 */
class AllFilter extends BooleanFilter {
  /**
     * Supply the _getRows_function
     * @param {GalyleoDataTable} rows
     * @returns [{number}] {indices of matching rows}
     */
  _getRows_ (rows) {
    let result = [...Array(rows.length).keys()];
    this.args.forEach(containedFilter => {
      result = containedFilter._getRows_(rows).filter(index => result.indexOf(index) >= 0);
    });
    return result;
  }

  /**
   * Equals for an ALL operator: otherFilter must be an instance of ALL and the super equality check must hold
   * @param {Filter} otherFilter: the filter to be checked for equality
   */
  equals (otherFilter) {
    return (otherFilter instanceof AllFilter && super.equals(otherFilter));
  }
}
/**
 * A Filter which implements ANY
 *
 * @param {GalyleoDataTable} rows
 * @returns [{number}] {indices of matching rows}
 */
class AnyFilter extends BooleanFilter {
  /**
     * Supply the _getRows_function
     * @param {GalyleoDataTable} rows
     * @returns [{number}] {indices of matching rows}
     */
  _getRows_ (rows) {
    let result = new Set();
    this.args.forEach(containedFilter => {
      containedFilter._getRows_(rows).forEach(index => { result.add(index); });
    });
    return [...result].sort((a, b) => a - b);
  }

  /**
   * Equals for an ANY operator: otherFilter must be an instance of ANY and the super equality check must hold
   * @param {Filter} otherFilter: the filter to be checked for equality
   */
  equals (otherFilter) {
    return (otherFilter instanceof AnyFilter && super.equals(otherFilter));
  }
}
/**
 * A Filter which implements Not
 *
 * @param {GalyleoDataTable} rows
 * @returns [{number}] {indices of matching rows}
 */
class NoneFilter extends BooleanFilter {
  /**
     * Supply the _getRows_function
     * @param {GalyleoDataTable} rows
     * @returns [{number}] {indices of matching rows}
     */
  _getRows_ (rows) {
    let inverse = this.args[0]._getRows_(rows);
    return [...Array(rows.length).keys()].filter(index => inverse.indexOf(index) < 0);
  }

  /**
   * Equals for a Not operator: otherFilter must be an instance of NONE and the super equality check must hold
   * @param {Filter} otherFilter: the filter to be checked for equality
   */
  equals (otherFilter) {
    return (otherFilter instanceof NoneFilter && super.equals(otherFilter));
  }
}
/**
 * A primitive filter -- a filter which operates on a single column.  This too is abstract, and contains two
 * concrete classes below it.  Implements _get_rows_(), but requires a new function _filterValue_({string|number}){boolean} to
 * be implemented
 */
class PrimitiveFilter extends Filter {
  /**
     * Construct the primitive Filter.  In addition to the table, has a column index for the values to filter
     * @param table, a GalyleoTable
     * @param column{number} the index of the column to filter
     */
  constructor (table, column) {
    super(table);
    this.column = column;
  }

  /**
   * Equals for a primitive operator: super must hold and the columns must match
   * Note that this is always called from this function on a subclass, so the typechecking has already been done
   * @param {Filter} otherFilter: the filter to be checked for equality
   */
  equals (otherFilter) {
    return super.equals(otherFilter) && otherFilter.column == this.column;
  }

  /**
     * _filterValue_ return true only if the argument passes the text
     * @param value{string|number} The value to test
     * @returns {boolean}: true iff the value passes the filter
     */
  _filterValue_ (value) {
    throw '_filterValue_ must be implemented';
  }

  /**
     * Supply the _getRows_function
     * @param {GalyleoDataTable} rows
     * @returns [{number}] {indices of matching rows}
     */
  _getRows_ (rows) {
    const values = rows.map(row => row[this.column]);
    const indices = [...Array(values.length).keys()];
    return indices.filter(index => this._filterValue_(values[index]));
  }
}
/**
 * A Filter which returns true if and only if the value tested is in the provided list
 */

class InListFilter extends PrimitiveFilter {
  /**
     * Construct the InListFilter.  In addition to the table, and the column index, has a list of values for inclusion
     * @param table, a GalyleoTable
     * @param column{number} the index of the column to filter
     * @param valueList{{number|string}[]} the list to look for inclusion in
     */
  constructor (table, column, valueList) {
    super(table, column);
    this.valueSet = new Set(valueList);
  }

  /**
   * Equals for an in_list filter: the other filter must be an instance of in_list filter, the super must be true,
   * and the value sets must be identical
   * @param {Filter} otherFilter: the filter to be checked for equality
   */
  equals (otherFilter) {
    const isEqualSets = (set1, set2) => (set1.size === set2.size) && (set1.size === new Set([...set1, ...set2]).size);
    return otherFilter instanceof InListFilter && super.equals(otherFilter) && isEqualSets(this.valueSet, otherFilter.valueSet);
  }

  /**
     * _filterValue_ return true only if value is in the provided list
     * @param value{string|number} The value to test
     * @returns {boolean}: true iff the value is in the provided list
     */
  _filterValue_ (value) {
    return this.valueSet.has(value);
  }
}

/**
 * A Filter which returns true if and only if the value tested is in the provided list
 */

class InRangeFilter extends PrimitiveFilter {
  /**
     * Construct the InRangeFilter.  In addition to the table, and the column index, has a max and min, and returns true
     * iff the value is in the range max, min (inclusive)
     * @param table, a GalyleoTable
     * @param column{number} the index of the column to filter
     * @param maxVal{number} the maximum value for the number
     * @param minVal{number} the maximum value for the number
     */
  constructor (table, column, maxVal, minVal) {
    super(table, column);
    this.maxVal = maxVal;
    this.minVal = minVal;
  }

  /**
   * Equals for an in_range filter: the other filter must be an instance of in_range filter, the super must be true,
   * and the maxVal, minVal, and increment must be identical.
   * @param {Filter} otherFilter: the filter to be checked for equality
   */

  equals (otherFilter) {
    return otherFilter instanceof InRangeFilter && super.equals(otherFilter) && this.maxVal == otherFilter.maxVal &&
      this.minVal == otherFilter.minVal;
  }

  /**
     * _filterValue_ return true only if value is between maxVal and minVal
     * @param value{string|number} The value to test
     * @returns {boolean}: true iff the value is between maxVal and minVal
     */
  _filterValue_ (value) {
    if (isNaN(value)) {
      return false;
    }
    return value <= this.maxVal && value >= this.minVal;
  }
}

/**
 * @typedef {"ALL" | "ANY" | "NONE" } booleanOperator
 *
 * @typedef (Object) booleanFilterSpec
 * @property {booleanOperator} operator
 * @property {filterSpec[]} arguments
 *
 * @typedef (Object) inListFilterSpec
 * @property {string} operator
 * @property {string} column
 * @property {string | number} values
 *
 * @typedef (Object) inRangeFilterSpec
 * @property {string} operator
 * @property {string} column
 * @property {number} max_val
 * @property {number} min_val
 *
 * @typedef {booleanFilterSpec | inListFilterSpec | inRangeFilterSpec} FilterSpec
 */

/**
 * Check that a filterSpec is valid for a table.  This means that the column name maps to an actual
 * column in the table and, for a numeric filter, that the column type is a number
  * @param {GalyleoTable} table
 * @param {filterSpec} FilterSpec
 * @returns true/false if this is/is not a valid FilterSpec
 */
function checkSpecValid (table, filterSpec) {
  if (!filterSpec) {
    return false;
  }
  try {
    if (filterSpec.operator == 'IN_RANGE' || filterSpec.operator == 'IN_LIST') {
      const index = table.getColumnIndex(filterSpec.column);
      if (index < 0) {
        return false;
      }
      return filterSpec.operator == 'IN_RANGE' ? table.columns[index].type == 'number' : true;
    }
    return filterSpec.arguments.reduce((acc, spec) => acc && checkSpecValid(table, spec), true);
  } catch (err) {
    console.log(filterSpec);
    console.log(err);
    return false;
  }
}

/**
 * A filter constructor.  Takes as input a filterSpec and a table, and returns a Filter
 * @param {GalyleoTable} table
 * @param {filterSpec} FilterSpec
 * @returns {Filter} filter over the table as given by the specification
 */
function constructFilter (table, filterSpec) {
  if (filterSpec.operator == 'IN_RANGE') {
    return new InRangeFilter(table, table.getColumnIndex(filterSpec.column), filterSpec.max_val, filterSpec.min_val);
  }
  if (filterSpec.operator == 'IN_LIST') {
    return new InListFilter(table, table.getColumnIndex(filterSpec.column), filterSpec.values);
  }
  const args = filterSpec.arguments.map(subFilterSpec => constructFilter(table, subFilterSpec));
  if (filterSpec.operator == 'NONE') {
    return new NoneFilter(table, args);
  }
  if (filterSpec.operator == 'ALL') {
    return new AllFilter(table, args);
  }
  return new AnyFilter(table, args);
}

/**
 * A function which takes in a GalyleoDataTable object and processes it; typically a callback to
 * getRows(), getFilteredRows(), getNumericSpec(), getAllValues()
 * @typedef {({GalyleoDataTable}) => void} GalyleoCallBack
 */

/**
  * A function with takes in an error message and processes it; typically the error callback to
  * getRows(), getFilteredRows(), getNumericSpec(), getAllValues()
  * @typedef {({string}) => void} GalyleoErrorCallback
  */

/**
 * A function which gets the rows of a table, and then either calls the callback or error callback provided.
 * @typedef {({GalyleoCallBack}, {GalyleoErrorCallback}) => void} TableFunction
 *
 * A function which listens for updates to a GalyleoTable
 * @typedef {(GalyleoTable) => void} GalyleoUpdateListener
 *
 * An objectwhich listens for updates to a GalyleoTable.  This is any object which contains an UpdateListener
 * function
 * @typedef {Object} GalyleoUpdateListenerObject
 * @property {GalyleoUpdateListener} tableUpdated
 */

/**
 * Class for a Galyleo Table.  The functions  in this abstract class are the  only ones that should be
 * used for any instantiated member.
 */

class GalyleoTable {
  /**
     * Create a GalyleoTable.
     * @param {GalyleoColumn[]} columns - The columns of the Table.
     * @param {string} tableName -- the name of the table
     * @param {TableFunction} getRows - A function which gets the rows of the table.
     */

  constructor (columns, tableName, getRows) {
    this.columns = columns;
    this.tableName = tableName;
    this.getRows = getRows;
    this.updateListeners = new Set();
  }

  /**
   * The names of the table's columns, as a list
   */

  get columnNames () {
    return this.columns.map(column => column.name);
  }

  /**
   * Register an update listener.  This should be a function which is called with a single updateListener
   * argument; the listener  will get called when the table is updated
   * @parameter {GalyleoUpdateListenerObject} listener
   */
  registerUpdateListener (listener) {
    this.updateListeners.add(listener);
  }

  /**
   * Deregister an update listener.  This should be a function which is called with a single updateListener
   * argument; the listener will be deleted from the update listeners
   * @parameter {UpdateListener} listener
   */
  deregisterUpdateListener (listener) {
    this.updateListeners.delete(listener);
  }

  /**
   * This method should be called when the table is updated; either when new data is loaded or when a poll is
   * signalled.  Call all the listeners waiting for an update
   */
  dataUpdated () {
    this.updateListeners.forEach(listenerObject => {
      if (listenerObject && listenerObject.tableUpdated) {
        listenerObject.tableUpdated(this);
      }
    });
  }

  /**
     * getColumnIndex: returns the index corresponding to a column name
     * @param {string} columnName
     * @returns {number} index of the column passed as a parameter
     */
  getColumnIndex (columnName) {
    return this.columns.map(column => column.name).indexOf(columnName);
  }

  /**
     * getColumnType: returns the type corresponding to a column name
     * @param {string} columnName
     * @returns {string} type of the column, or null if it's invalid
     */
  getColumnType (columnName) {
    const index = this.getColumnIndex(columnName);
    return index < 0 ? null : this.columns[index].type;
  }

  /**
   * Get all the columns of one of the specified types, or all of the columns of any type
   * @param {[string]} typeList
   * @returns [string] list of column names
   */
  getColumnsOfTypes (typeList) {
    const columnMatches = column => typeList.length > 0 ? typeList.indexOf(column.type) >= 0 : true;
    return this.columns.filter(column => columnMatches(column)).map(column => column.name);
  }

  /**
     * getFilteredRows: returns the rows of the table which pass a filter
     * If the filterSpec is null, just returns all the rows of the table
     * @param {GalyleoCallback} callback Callback to use when the rows are found
     * @param {GalyleoErrorCallback} errorFunction Callback to use when the rows are found
     * @param {FilterSpec} filterSpec specification of the filter to use
     */

  /* getFilteredRows (callback, errorFunction, filterSpec = null) {
    this.getRows(rows => {
      if (filterSpec) {
        const madeFilter = constructFilter(this, filterSpec);
        try {
          callback(madeFilter.getRows(rows));
        } catch (error) {
          errorFunction(error);
        }
      } else {
        callback(rows);
      }
    }, errorFunction);

    this.getRows(rows => {
      const insp = new Inspector();
      if (filterSpec) {
        const madeFilter = constructFilter(this, filterSpec);
        try {
          const filteredRows = madeFilter.getRows();
        } catch (error) {
          insp.targetObject = madeFilter;
          insp.openInWindow();
          return;
        }
        callback(filteredIndices.map(i => rows[i]));
      } else {
        callback(rows);
      }
    }, errorFunction);
  } */

  /**
   * callback function for success in getAllValues
   * @typedef ({{string | number}[]}) => void GalyleoValueListCallback
   */

  /**
     * getAllValues: returns all of the distinct values in a column, sorted in increasing order
     * @param {string} columnName name of the column to get the values for
     */

  async getAllValues (columnName) {
    const index = this.getColumnIndex(columnName);
    const rows = await this.getRows();
    const result = [...rows.map(row => row[index])];
    if (this.columns[index].type == 'number') {
      result.sort((a, b) => a - b);
    } else {
      result.sort;
    }
    return result;
  }

  /**
     * @typedef (Object) NumericSpec
     * @property max_val the maximum value of this column
     * @property min_val the minimum value of this column
     * @property increment the increment between values of this column
     */

  /**
   * callback function for success in getNumericSpec
   * @typedef (NumericSpec) => void NumericSpecCallback
   */

  /**
     * getNumericSpec: returns the numeric spec for a column, to set up numeric filters
     * @param {string} columnName name of the column to get the numeric spec for
     * @returns {NumericSpec}
     */

  async getNumericSpec (columnName) {
    const values = await this.getAllValues(columnName);
    const shift = values.slice(1);
    const deltas = shift.map((val, index) => val - values[index]);
    const minPositive = (a, b) => a <= 0 ? b : b <= 0 ? a : Math.min(a, b);
    const incr = deltas.slice(1).reduce((acc, cur) => minPositive(acc, cur), deltas[0]);
    return { min_val: values[0], max_val: values[values.length - 1], increment: incr };
  }
}

/**
 * An ExplicitTable -- one with the rows right in the table itself
 */

class ExplicitGalyleoTable extends GalyleoTable {
  /**
   * Construct an ExplicitGalyleoTable
   * @param {GalyleoColumn[]} columns - The columns of the Table.
   * @paramm {string} tableName - The name of the table
   * @param {GalyleoDataTable} rows - the rows of the table
   */
  constructor (columns, tableName, rows) {
    super(columns, tableName, async () => this.rows);
    this.getRows = async () => this.rows;
    this.rows = rows;
    this.tableType = 'ExplicitGalyleoTable';
  }

  /**
   * Generate the intermediate form
   */
  toDictionary () {
    return {
      columns: this.columns,
      rows: this.rows
    };
  }

  /**
     * getFilteredRows: returns the rows of the table which pass a filter
     * If the filterSpec is null, just returns all the rows of the table
     * @param {GalyleoCallback} callback Callback to use when the rows are found
     */

  async getFilteredRows (filterSpec = null) {
    if (filterSpec) {
      const madeFilter = constructFilter(this, filterSpec);
      return madeFilter.getRows(this.rows);
    } else {
      return this.rows;
    }
  }
}

/**
 * A class to do fetches and call success/error callbacks.  An overlay on resource()
 */
class URLFetcher {
  constructor (url, tableName) {
    this.url = url;
    this.tableName = tableName;
    this.headers = {};
    this.body = null;
  }

  set tableName (tableName) {
    this.table_name = tableName;
  }

  set dashboardName (dashboardName = null) {
    if (dashboardName) {
      this.dashboard_name = dashboardName;
    } else {
      this.dashboard_name = dashboardName;
    }
  }

  /**
   * Add a header to the request.  The header value is either a number or string -- it's up to the caller
   * to put it into the right form (by, for example, using JSON.stringify on an object)
   * @param {string} key -- the header key
   * @param {string | number} value -- the header value
   */

  addHeader (key, value) {
    this.headers[key] = value;
  }

  /**
   * Add a Body to the request.  The body is just an object which will be JSON-encoded and sent with the
   * request.  Typically used with POST data.
   * @param {Object} Body -- the body to be added
   */

  addBody (body) {
    this.body = body;
  }

  /**
   * Make the full resource, filling in the useCors and useProxy values appropriately, adding the body
   * to the resource if there is one, and putting in the headers
   * @returns the web resource to be used
   */

  makeResource () {
    this.webResource = resource(this.url);
    if (this.body) {
      this.webResource.body = this.body;
    }
    this.webResource.useCors = true;
    this.webResource.useProxy = false;
    Object.keys(this.headers).forEach(key => this.webResource.headers[key] = this.headers[key]);
    return this.webResource;
  }

  /**
   * Post the request,
   */
  async post () {
    if (!this.webResource) {
      this.makeResource();
    }
    return await this.webResource.post(this.body);
  }

  /**
   * Get the request, parsing the json response, then do the appropriate callback, or error if there is one
   */
  async readJson () {
    if (!this.webResource) {
      this.makeResource();
    }
    return this.webResource.readJson();
    /* const response = await fetch(this.url,  {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      headers: this.headers
    })
    return response.json() */
  }

  /**
   * Get the request, then do the appropriate callback, or error if there is one.  Note that this doesn't parse
   */
  read () {
    if (!this.webResource) {
      this.makeResource();
    }
    return this.webResouce.read();
  }
}

/**
 * A little utility to make an URL from a base URL and a route, robustly
 */
const _makeURL = (baseURL, method) => {
  return baseURL.endsWith('/') ? `${baseURL}${method}` : `${baseURL}/${method}`;
};

/**
 * typedef (Object) GalyleoRemoteTableSpec
 * @property {string} url - the base url for all methods
 * @property {string?} dashboardName - if present, the name of the dashboard to use in remote requests
 * @property {number?} interval -- if present, poll this dashboard every interval seconds
 */

/**
 * A Remote Table -- one which accesses the rows from an URL
 */

class RemoteGalyleoTable extends GalyleoTable {
  /**
     * Construct an RemoteGalyleoTable
     * @param {GalyleoColumn[]} columns - The columns of the Table.
     * @param {string} tableName - the table name to pass to the remote server
     * @param {GalyleoRemoteTableSpec} connector - A structure containing the url, and possibly a dashboard name and interval
     */
  constructor (columns, tableName, connector) {
    super(columns, tableName, async () => await this._getRowsFromURL_());
    this.tableType = 'RemoteGalyleoTable';
    this.url = connector.url;
    this.headers = { };
    if (connector.dashboardName != null) {
      this.dashboardName = connector.dashboardName;
      this.headers['Dashboard-Name'] = connector.dashboardName;
    }
    // If the connector indicates that polling should take place, simply raise the dataUpdated signal every
    // connector.interval seconds; the client(s), (typically only the dashboard controller) will decide what to do.
    // If there aren't any charts or widgets using this table data, the answer will typically be nothing.
    if (!isNaN(connector.interval) && connector.interval >= 1) {
      this.interval = connector.interval;
      setInterval(_ => this.dataUpdated(), 1000 * connector.interval);
    }
  }

  /**
   * Generate the intermediate form
   */
  toDictionary () {
    const connector = {
      url: this.url
    };
    if (this.dashboardName) {
      connector.dashboardName = this.dashboardName;
    }
    if (this.interval) {
      connector.interval = this.interval;
    }
    return {
      columns: this.columns,
      connector: connector
    };
  }

  /**
     * A thin overlay on getFilteredRows, for internal use only.  It provides the getRows() function for
     * the super.  For this class, getRows(callback, errorFunction) is just getFilteredRows(null)
     * @param {GalyleoCallback} callback Callback to use when the rows are found
     * @param {GalyleoErrorCallback} errorFunction Callback to use when the rows are found
     */
  async _getRowsFromURL_ () {
    return await this.getFilteredRows(null);
  }

  /**
  * Make a URL Fetcher for an URL, filling in table and dashboardName.  Internal use only.
  * @param  {string} URL: url to make the fetcher for
  */
  _makeURLFetcher_ (url) {
    const result = new URLFetcher(url, this.tableName);
    if (this.dashboardName) {
      result.dashboardName = this.dashboardName;
    }
    return result;
  }

  /**
     * getFilteredRows: returns the rows of the table which pass a filter
     * If the filterSpec is null, just returns all the rows of the table
     * @param {FilterSpec?} filterSpec specification of the filter to use if non-null
     */

  async getFilteredRows (filterSpec = null) {
    const urlFetcher = this._makeURLFetcher_(_makeURL(this.url, 'get_filtered_rows'));
    const body = { table: this.tableName };

    if (filterSpec) {
      body.filter = filterSpec;
    }
    urlFetcher.addBody(JSON.stringify(body));
    urlFetcher.addHeader('Accept', 'application/json');
    urlFetcher.addHeader('Content-Type', 'application/json');
    try {
      const result = await urlFetcher.post();
      return result;
    } catch (error) {
      return [];
    }
  }

  /**
     * A little macro used by both getAllValues and getNumericSpec to get and return the results
     * The body of both methods is the same, so just have them return this
     * @param {string} request -- the request
     * @param {string} columnName -- the name of the column to make the request for
     */
  async _executeGetRequest_ (request, columnName) {
    const urlFetcher = this._makeURLFetcher_(_makeURL(this.url, `${request}?column_name=${columnName}&table_name=${this.tableName}`));
    return await urlFetcher.readJson();
  }

  /**
     * getAllValues: returns all of the distinct values in a column, sorted in increasing order
     * @param {string} columnName name of the column to get the values for
     */

  async getAllValues (columnName) {
    return await this._executeGetRequest_('get_all_values', columnName);
  }

  /**
     * @typedef (Object) NumericSpec
     * @property max_val the maximum value of this column
     * @property min_val the minimum value of this column
     * @property increment the increment between values of this column
     */

  /**
     * getNumericSpec: returns the numeric spec for a column, to set up numeric filters
     * @param {string} columnName name of the column to get the numeric spec for
     */

  async getNumericSpec (columnName) {
    return await this._executeGetRequest_('get_range_spec', columnName);
  }
}

/**
 * @typedef (Object) GalyleoTableSpec
 * @property {GalyleoColumn []} columns - the columns of the table
 * @property {GalyleoDataTable?} rows -- if present, this is an explicit table with the rows resident
 * @property {GalyleoRemoteTableSpec} connector -- if present, used to make a remote table
 */

/**
 * Construct a GalyleoTable from a GalyleoTableSpec and a name.  Looks
 * at the intermediate form and builds the right kind of table
 * @param {string} name: name of the table
 * @param {GalyleoTableSpec} galyleoTableSpec: specification of the table
 */

function constructGalyleoTable (name, galyleoTableSpec) {
  const columns = galyleoTableSpec.columns;
  if (galyleoTableSpec.rows != null) {
    return new ExplicitGalyleoTable(columns, name, galyleoTableSpec.rows);
  }
  if (galyleoTableSpec.connector != null) {
    return new RemoteGalyleoTable(columns, name, galyleoTableSpec.connector);
  }
  // should never get here
  return null;
}

/**
 * @typedef {Object <string, FilterSpec>}FilterDictionary.  A Dictionary of FilterSpecs, indexed by Name
 */

/**
 * @typedef GalyleoViewSpec.  Dictionary Specification of a GalyleoView.
 * @property {string} name -- name of the view
 * @property {string} table -- name of the table that this view subsets
 * @property {[string]} columns -- The names of the columns of the table represented in this view
 * @property {[string]} filterNames -- The names of the filters for this column
 */

/**
 * Class for a GalyleoView.  A View is a restricted subset of a table, and it returns the
 * subset of the columns that have been selected and the rows selected by the filters which are passed
 * @property {string} table -- name of the table that this view subsets
 * @property {[string]} columns -- The names of the columns of the table represented in this view
 * @property {[string]} filterNames -- The names of the filters for this column
 */

class GalyleoView {
  /**
   * Build a GalyleoView from a specification
   * @param {GalyleoViewSpec} viewSpec: specification of the view
   */
  constructor (viewSpec) {
    this.tableName = viewSpec.table;
    this.columns = viewSpec.columns;
    this.filters = viewSpec.filterNames;
  }

  /**
   * Return the ViewSpec for this View
   * @returns {GalyleoViewSpec}
   */
  toDictionary () {
    return {
      table: this.tableName,
      columns: this.columns,
      filterNames: this.filters
    };
  }

  /**
   * get the names of the filters of this view. Just an alias for filters,
   * for backwards compatibility
   * @returns [String]
   */
  get filterNames () {
    return this.filters;
  }

  /**
   * Return the set of constructed filters from a FilterDictionary
   * Internal use only, broken out separately for debugging and testing.
   * @param {FilterDictionary} filterSpecs: the specifications of the filters to be used
   * @param {GalyleoTable} table: table for this view
   * @returns {filterSpec}: the specification of the actual filter to use
   */
  _getFilter_ (filterSpecs, table) {
    const matchingSpecs = this.filters.map(filterName => filterSpecs[filterName]);
    const validSpecs = matchingSpecs.filter(spec => checkSpecValid(table, spec));
    return validSpecs.length == 0 ? null : validSpecs.length == 1 ? validSpecs[0] : { operator: 'ALL', arguments: validSpecs };
  }

  _getColumnIndexes_ (table) {
    return this.columns.map(column => table.getColumnIndex(column)).filter(columnIndex => columnIndex >= 0);
  }

  /**
   * Get the column structures as a list, returning both type and name.  Returns a list of
   * the form {type: type, name: name}
   * param {Object <string, GalyleoTable>} tableDictionary: Dictionary of tables
   */
  fullColumns (tableDictionary) {
    const table = tableDictionary[this.tableName];
    if (!table) {
      return undefined;
    }
    const columnIndexes = this._getColumnIndexes_(table);
    return columnIndexes.map(index => table.columns[index]);
  }

  /**
   * Return the set of matching rows and columns from a table, given a list of
   * FilterNames and Specs, and a dictionary of tables.  *Note that if a table
   * without this.tableName is NOT in the dictionary, returns undefined
   * @param {FilterDictionary} filterSpecs
   * @param {Object <string, GalyleoTable>} tableDictionary: Dictionary of tables
   */
  async getData (filterSpecs, tableDictionary) {
    // We resolve the table only when we're asked for the data, so that we aren't tied
    // to a particular table.  Late binding is your friend...
    const table = tableDictionary[this.tableName];
    if (!table) {
      return undefined;
    }
    const columnIndexes = this._getColumnIndexes_(table);
    // const getSelectedColumns = row => row.filter((item, index) => columnIndexes.indexOf(index) >    0);
    const reorderRow = row => columnIndexes.map(index => row[index]);

    if (columnIndexes.length <= 0) {
      return undefined;
    }
    const actualFilter = this._getFilter_(filterSpecs, table);

    const rows = await table.getFilteredRows(actualFilter);
    // const rowsToSend = rows.map(row => getSelectedColumns(row));
    const rowsToSend = rows.map(row => reorderRow(row));
    return rowsToSend;
  }
}

/**
 * Class for a DashboardDataManager.  There will only be one of these per Dashboard, and it's arguable whether this
 * code should live in the Dashboard class.  It's here for ease of testing and to maintain all the data manipulation
 * code in a single module.
 * @property {GalyleoUpdateListener} updateListener
 * @property {Object <string, GalyleoTable>} tables
 * @property {Object <string, GalyleoView>} views
 */
class GalyleoDataManager {
  /**
   * Construct a new DataManager.  Just initializes tables and views and sets the updateListener if there is one
   * @param {GalyleoViewSpec} viewSpec: specification of the view
   */
  constructor (updateListener = null) {
    this.updateListener = updateListener;
    this.tables = {};
    this.views = {};
  }

  /**
   * Clear the state of the DataManager.  Identical to new()
   */
  clear () {
    this.tables = {};
    this.views = {};
  }

  /**
   * Get the names of the tables, as a list
   * @returns {[{string}]}
   */
  get tableNames () {
    return Object.keys(this.tables);
  }

  /**
   * Get the names of the views, as a list
   * @returns {[{string}]}
   */
  get viewNames () {
    return Object.keys(this.views);
  }

  /**
   * Convert a dictionary of objects to a dictionary of the dictionary form of each object
   * Internal, used by toDictionary()
   * @param {Map} objectoToConvert
   * @ returns {{Map}}
   */

  _generateDictionary_ (objectToConvert) {
    const names = Object.keys(objectToConvert);
    const result = {};
    names.forEach(name => result[name] = objectToConvert[name].toDictionary());
    return result;
  }

  /**
   * Generate the intermediate form as a dictionary.  Just generates the dictionary form of the tables and views
   */

  toDictionary () {
    return {
      tables: this._generateDictionary_(this.tables),
      views: this._generateDictionary_(this.views)
    };
  }

  /**
   * Add a table from a specification
   * @param {string} name name of the table
   * @param {GalyleoTableSpec} tableSpec specification of the table to add
   */
  addTable (name, spec) {
    this.tables[name] = constructGalyleoTable(name, spec);
    if (this.updateListener) {
      this.tables[name].registerUpdateListener(this.updateListener);
    }
  }

  /**
   * Add a view  from a specification
   * @param {string} name name of the view
   * @param {GalyleoViewSoec} viewSpec specification of the view to add
   */
  addView (name, viewSpec) {
    this.views[name] = new GalyleoView(viewSpec);
  }

  /**
   * Remove a view
   * @param {string} name name of the view
   */
  removeView (name) {
    delete this.views[name];
  }

  /**
   * Get all the tables which contain a column, narrowing it to the specific set of requested types
   * if specified.  Internal routine used by getAllValues and getNumericSpec
   * @param {string} columnName: column to get all the values for
   * @param {Set}: set of types to look for.  If empty, look for them all
   * @param {string?} tableName: if specified, look only at this table
   */
  _getMatchingTables_ (columnName, types, tableName = null) {
    const allNames = Object.keys(this.tables);
    if (allNames.length == 0) {
      return [];
    }
    const names = tableName ? [tableName] : allNames;
    const tables = names.map(name => this.tables[name]);

    const matchingTables = tables.filter(table => table.getColumnIndex(columnName) >= 0);
    if (types.size == 0) {
      return matchingTables;
    } else {
      return matchingTables.filter(table => types.has(table.columns[table.getColumnIndex(columnName)].type));
    }
  }

  /**
   * Get all the values for a column.  This is just an overlay on table.getAllValues() if the table is
   * specified, or it returns all the values for all the columns of that name over the dashboard if the table
   * is not specified
   * @param {string} columnName: column to get all the values for
   * @param {string?} tableName: if specified, look only at this table
   * @returns {[any]} sorted list of all values in the columns
   */
  async getAllValues (columnName, tableName = null) {
    const tables = this._getMatchingTables_(columnName, new Set(), tableName);
    if (tables.length == 0) {
      return [];
    }

    // get all the values from all the tables
    let result = await tables[0].getAllValues(columnName);
    const remaining = tables.slice(1);
    for (let i = 0; i < remaining.length; i++) {
      result = result.concat(await remaining[i].getAllValues(columnName));
    }
    // [...new Set(list)] is an easy way to get rid of duplicates
    result = [...new Set(result)];
    // If the resulting list is all numeric, sort by number, otherwise alphabetic, and return
    const allNumbers = tables.reduce((result, table) => result && table.getColumnType(columnName) == 'number', true);

    if (allNumbers) {
      result.sort((a, b) => a - b);
    } else {
      result.sort();
    }
    return result;
  }

  /**
   * Get the numeric specifier for a column.  This is just an overlay on table.getNumeric() if the table is
   * specified, or it returns all the values for all the columns of that name over the dashboard if the table
   * is not specified
   * @param {string} columnName: column to get all the values for
   * @param {string?} tableName: if specified, look only at this table
   * @returns {GalyleoNumericSpec} the numeric
   */
  async getNumericSpec (columnName, tableName = null) {
    const tables = this._getMatchingTables_(columnName, new Set(['number']), tableName);
    if (tables.length == 0) {
      return null;
    }
    const result = await tables[0].getNumericSpec(columnName);
    for (let i = 1; i < tables.length; i++) {
      const tableResult = await tables[i].getNumericSpec(columnName);
      result.max_val = Math.max(result.max_val, tableResult.max_val);
      result.min_val = Math.min(result.min_val, tableResult.min_val);
      result.increment = Math.min(result.increment, tableResult.increment);
    }
    return result;
  }

  /**
   * Get all the columns of one of the specified types, or all of the columns of any type
   * @param {[string]} typeList
   * @param {string?} tableName
   * @returns [string] list of column names
   */
  getColumnsOfTypes (typeList, tableName) {
    if (tableName && this.tables[tableName]) {
      return this.tables[tableName].getColumnsOfTypes(typeList);
    }
    const result = [];
    Object.keys(this.tables).forEach(table => {
      this.tables[table].getColumnsOfTypes(typeList).forEach(columnName => {
        if (result.indexOf(columnName) < 0) {
          result.push(columnName);
        }
      });
    });
    return result;
  }

  /**
   * Get all the types for a column name, optionally restricted to
   * a single table
   * @param {string} columnName
   * @param {string?} tableName
   * @returns [string] list of types
   */
  getTypes (columnName, tableName = null) {
    if (tableName && this.tables[tableName]) {
      return [this.tables[tableName].getColumnType(columnName)];
    } else {
      const hasColumn = (table, columnName) => table.columnNames.indexOf(columnName) >= 0;
      const tableNamesWithColumn = this.tableNames.filter(name => hasColumn(this.tables[name], columnName));
      if (tableNamesWithColumn.length == 0) {
        return [];
      }
      const tablesWithColumn = tableNamesWithColumn.map(name => this.tables[name]);
      const result = [tablesWithColumn[0].getColumnType(columnName)];
      tablesWithColumn.slice(1).forEach(table => {
        const colType = table.getColumnType(columnName);
        if (result.indexOf(colType) < 0) {
          result.push(colType);
        }
      });
      return result;
    }
  }
}

export {
  GalyleoDataManager, GalyleoView,
  constructGalyleoTable, URLFetcher, RemoteGalyleoTable, ExplicitGalyleoTable, GalyleoTable,
  constructFilter, checkSpecValid, Filter

};
