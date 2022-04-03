import { resource } from 'lively.resources';
import { signal } from 'lively.bindings';
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

export class Filter {
  /**
    * Create a Filter
    * @param table, a GalyleoTable
    */
  constructor (table) {
    this.table = table;
  }

  /**
     * Return the indices of the rows of the table parameter which match this filter
     * Must be implemented by eacy subclass.
     * For internal use only
     * @param {GalyleoDataTable} rows
     * @returns [{number}] {indices of matching rows}
     */
  _getRows_ (rows) {
    throw '_getRows_(rows) must be implemented!';
  }

  /**
     * Return the rows of the table which match the filter.  Should not be overridden: this
     * is an overlay on _getRows_ and is used for final reporting
     * @returns {GalyleoDataTable} Subset of the table which passes the filter
     */
  getRows () {
    const rows = this.table.getRows();
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
 * A Filter which implements AND
 *
 * @param {GalyleoDataTable} rows
 * @returns [{number}] {indices of matching rows}
 */
class AndFilter extends BooleanFilter {
  /**
     * Supply the _getRows_function
     * @param {GalyleoDataTable} rows
     * @returns [{number}] {indices of matching rows}
     */
  _getRows_ (rows) {
    let result = [...Array(rows.length).keys()];
    this.arguments.forEach(containedFilter => {
      result = containedFilter._get_rows(rows).filter(index => result.indexOf(index) >= 0);
    });
    return result;
  }

  /**
   * Equals for an AND operator: otherFilter must be an instance of AND and the super equality check must hold
   * @param {Filter} otherFilter: the filter to be checked for equality
   */
  equals (otherFilter) {
    return (otherFilter instanceof AndFilter && super.equals(otherFilter));
  }
}
/**
 * A Filter which implements OR
 *
 * @param {GalyleoDataTable} rows
 * @returns [{number}] {indices of matching rows}
 */
class OrFilter extends BooleanFilter {
  /**
     * Supply the _getRows_function
     * @param {GalyleoDataTable} rows
     * @returns [{number}] {indices of matching rows}
     */
  _getRows_ (rows) {
    let result = new Set();
    this.arguments.forEach(containedFilter => {
      containedFilter._get_rows(rows).forEach(index => { result.add(index); });
    });
    return [...result];
  }

  /**
   * Equals for an OR operator: otherFilter must be an instance of OR and the super equality check must hold
   * @param {Filter} otherFilter: the filter to be checked for equality
   */
  equals (otherFilter) {
    return (otherFilter instanceof OrFilter && super.equals(otherFilter));
  }
}
/**
 * A Filter which implements Not
 *
 * @param {GalyleoDataTable} rows
 * @returns [{number}] {indices of matching rows}
 */
class NotFilter extends BooleanFilter {
  /**
     * Supply the _getRows_function
     * @param {GalyleoDataTable} rows
     * @returns [{number}] {indices of matching rows}
     */
  _getRows_ (rows) {
    let inverse = this.arguments[0]._getRows_(rows);
    return [...Array(rows.length).keys()].filter(index => inverse.indexOf(index) < 0);
  }

  /**
   * Equals for a Not operator: otherFilter must be an instance of NOT and the super equality check must hold
   * @param {Filter} otherFilter: the filter to be checked for equality
   */
  equals (otherFilter) {
    return (otherFilter instanceof NotFilter && super.equals(otherFilter));
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
    const values = this.table.getRows().map(row => row[this.column]);
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
 * @typedef {"AND" | "OR" } booleanOperator
 *
 * @typedef (Object) booleanFilterSpec
 * @property {booleanOperator} operator
 * @property {filterSpec[]} arguments
 *
 * @typedef (Object) notFilterSpec
 * @property {string} operator
 * @property {filterSpec} arguments
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
 * @typedef {booleanFilterSpec | notFilterSpec | inListFilterSpec | inRangeFilterSpec} FilterSpec
 */
/**
 * A filter constructor.  Takes as input a filterSpec and a table, and returns a Filter
 * @param {GalyleoTable} table
 * @param {filterSpec} FilterSpec
 * @returns {Filter} filter over the table as given by the specification
 */
export function constructFilter (table, filterSpec) {
  if (filterSpec.operator == 'IN_RANGE') {
    return new InRangeFilter(table, table.getColumnIndex(filterSpec.column), filterSpec.max_val, filterSpec.min_val);
  }
  if (filterSpec.operator == 'IN_LIST') {
    return new InListFilter(table, table.getColumnIndex(filterSpec.column), filterSpec.values);
  }
  const args = filterSpec.arguments.map(subFilterSpec => constructFilter(table, subFilterSpec));
  if (filterSpec.operator == 'NOT') {
    return new NotFilter(table, args);
  }
  if (filterSpec.operator == 'AND') {
    return new AndFilter(table, args);
  }
  return new OrFilter(table, args);
}

/** @typedef {() => GalyleoDataTable} TableFunction */

/**
 * Class for a Galyleo Table.  The functions  in this abstract class are the  only ones that should be
 * used for any instantiated member.
 * @property {signal} dataUpdated: used to signal a table client that the data in the table has changed
 */

export class GalyleoTable {
  /**
     * Create a GalyleoTable.
     * @param {GalyleoColumn[]} columns - The columns of the Table.
     * @param {string} tableName -- the name of the table
     * @param {TableFunction} getRows - A function which gets the rows of the table.
     */

  constructor (columns, tableName, getRows) {
    this.columns = columns;
    this.name = tableName;
    this.getRows = getRows;
  }

  static get properties () {
    return {
      dataUpdated: { derived: true, readOnly: true, isSignal: true }
    };
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
     * getFilteredRows: returns the rows of the table which pass a filter
     * If the filterSpec is null, just returns all the rows of the table
     * @param {FilterSpec} filterSpec specification of the filter to use
     * @returns {GalyleoDataTable} the rows which pass the filter
     */

  async getFilteredRows (filterSpec = null) {
    const rows = this.getRows();
    if (filterSpec) {
      const filter = new Filter(filterSpec, this);

      const filteredIndices = filter.filter(rows);
      return filteredIndices.map(i => rows[i]);
    } else {
      return rows;
    }
  }

  /**
     * getAllValues: returns all of the distinct values in a column, sorted in increasing order
     * @param {string} columnName name of the column to get the values for
     * @returns {{string | number}[]} all values for the column
     */

  async getAllValues (columnName) {
    const index = this.getColumnIndex(columnName);
    const rows = this.getRows();
    const result = [...new Set(rows.map(row => row[index]))];
    if (this.columns.type == 'number') {
      result.sort((a, b) => a - b);
    } else {
      result.sort();
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
     * getNumericSpec: returns the numeric spec for a column, to set up numeric filters
     * @param {string} columnName name of the column to get the numeric spec for
     * @returns {NumericSpec} The numeric spec for this column
     */

  async getNumericSpec (columnName) {
    let values = await this.getAllValues(columnName);
    values = values.sort((a, b) => a - b);
    const shift = values.slice(1);
    const deltas = shift.map((val, index) => val - values[index]);
    const minPositive = (a, b) => a <= 0 ? b : b <= 0 ? a : Math.min(a, b);
    const incr = deltas.slice(1).reduce((acc, cur) => minPositive(acc, cur), deltas[0]);
    return {
      min_val: values[0],
      max_val: values[values.length - 1],
      increment: incr
    };
  }
}

/**
 * An ExplicitTable -- one with the rows right in the table itself
 */

export class ExplicitGalyleoTable extends GalyleoTable {
  /**
   * Construct an ExplicitGalyleoTable
   * @param {GalyleoColumn[]} columns - The columns of the Table.
   * @param {GalyleoDataTable} rows - the rows of the table
   */
  constructor (columns, tableName, rows) {
    this.rows = rows;
    super(columns, tableName, _ => this.rows);
    this.tableType = 'ExplicitGalyleoTable';
  }
}

/**
 * typedef (Object) GalyleoRemoteTableSpec
 * @property {string} url - the base url for all methods
 * @property {string?} dashboardName - if present, the name of the dashboard to use in remote requests
 * @property {number?} interval -- if present, poll this dashboard every interval seconds
 */

/**
 * A Remote Table -- one which accesses the rows from an URL
 */

export class RemoteGalyleoTable extends GalyleoTable {
  /**
     * Construct an RemoteGalyleoTable
     * @param {GalyleoColumn[]} columns - The columns of the Table.
     * @param {string} tableName - the table name to pass to the remote server
     * @param {GalyleoRemoteTableSpec} connector - A structure containing the url, and possibly a dashboard name and interval
     */
  constructor (columns, tableName, connector) {
    this.tableType = 'RemoteGalyleoTable';
    this.url = connector.url;
    super(columns, tableName, this._getRowsFromURL_);
    this.parameters = { table_name: tableName };
    this.getUrlParameterString = `table_name=${tableName}`;
    if (connector.dashboardName != null) {
      this.dashboardName = connector.dashboardName;
      this.parameters.dashboard_name = connector.dashboardName;
      this.getUrlString = `${this.getUrlParameterString}&dashboard_name=${connector.dashboardName}`;
    }
    // If the connector indicates that polling should take place, simply raise the dataUpdated signal every
    // connector.interval seconds; the client(s), (typically only the dashboard controller) will decide what to do.
    // If there aren't any charts or widgets using this table data, the answer will typically be nothing.
    if (!isNaN(connector.interval) && connector.interval >= 1) {
      setInterval(_ => signal(this, 'dataUpdated'), 1000 * connector.interval);
    }
  }

  /**
     * getFilteredRows: returns the rows of the table which pass a filter
     * If the filterSpec is null, just returns all the rows of the table
     * @param {FilterSpec?} filterSpec specification of the filter to use if non-null
     * @returns {GalyleoDataTable} the rows which pass the filter
     */

  async getFilteredRows (filterSpec = null) {
    const webResource = resource(`${this.url}/get_filtered_rows`);
    webResource.method = 'post';
    webResource.useCors = true;
    webResource.useProxy = false;
    const parameters = { ...this.parameters };
    if (filterSpec != null) {
      parameters.filter_spec = filterSpec;
    }
    webResource.body = JSON.stringify(parameters);
    return await webResource.readJson();
  }

  /**
     * A little macro used by both getAllValues and getNumericSpec to get and return the results
     * The body of both methods is the same, so just have them return this
     * @param {string} request -- the request
     * @param {string} columnName -- the name of the column to make the request for
     * @returns {{{string | number}[]} | NumericSpec} --
     */
  async _executeGetRequest_ (request, columnName) {
    const webResource = resource(`${this.url}/${request}?${this.getUrlParameterString}&column_name=${columnName}`);
    webResource.method = 'get';
    webResource.useCors = true;
    webResource.useProxy = false;
    return await webResource.readJson();
  }

  /**
     * getAllValues: returns all of the distinct values in a column, sorted in increasing order
     * @param {string} columnName name of the column to get the values for
     * @returns {{string | number}[]} all values for the column
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
     * @returns {NumericSpec} The numeric spec for this column
     */

  async getNumericSpec (columnName) {
    return await this._executeGetRequest_('get_numeric_spec', columnName);
  }
}

/**
 * @typedef (Object) GalyleoTableSpec
 * @property {string} name - the table name, required
 * @property {GalyleoColumn []} columns - the columns of the table
 * @property {GalyleoDataTable?} rows -- if present, this is an explicit table with the rows resident
 * @property {GalyleoRemoteTableSpec} connector -- if present, used to make a remote table
 */

export function constructGalyleoTable (galyleoTableSpec) {
  const name = galyleoTableSpec.name;
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
