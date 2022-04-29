/* global describe */
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
/* global declare, it, describe, beforeEach, afterEach */
import { expect, done } from 'mocha-es6';
import { Filter, constructFilter, constructGalyleoTable, ExplicitGalyleoTable, GalyleoView } from './galyleo-data.js';
import { resource } from 'lively.resources';
import { assert } from 'https://jspm.dev/npm:@jspm/core@2.0.0-beta.19/nodelibs/process';
import { connect } from 'lively.bindings';

const explicitSchema = [{ name: 'name', type: 'string' }, { name: 'age', type: 'number' }];
const explicitRows = [['a', 2], ['b', 1]];
const explicitTableConstructor = { name: 'test1', columns: explicitSchema, rows: explicitRows };
const isEqualSets = (set1, set2) => (set1.size === set2.size) && (set1.size === new Set([...set1, ...set2]).size);

/*
 * Implement the UpdateListenerObject for Polling...
 */
class PollCatcher {
  constructor () {
    this.reset();
  }

  reset () {
    this.updates = [];
    this.table = null;
    this.startTime = new Date();
  }

  tableUpdated (table) {
    this.table = table;
    const latestTime = new Date() - this.startTime;
    this.updates.push(latestTime / 1000);
  }
}

describe('Explicit Table', () => {
  const table = constructGalyleoTable(explicitTableConstructor);
  it('should create table and populate an explicit table', async (done) => {
    expect(table.tableType).to.eql('ExplicitGalyleoTable');
    expect(table.columns).to.eql(explicitSchema);
    expect(table.rows).to.eql(explicitRows);
    expect(table.tableName).to.eql('test1');
    expect(table.getColumnIndex('name')).to.eql(0);
    const result = await table.getRows();
    expect(result).to.eql(explicitRows);
    done();
  });
  it('should correctly execute the API for an explicit table', async (done) => {
    const filteredRows = await table.getFilteredRows();
    expect(filteredRows).to.eql(explicitRows);
    const nameValues = await table.getAllValues('name');
    expect(nameValues).to.eql(['a', 'b']);
    const ageValues = await table.getAllValues('age');
    expect(ageValues).to.eql([1, 2]);
    const spec = await table.getNumericSpec('age');
    expect(spec).to.eql({ max_val: 2, min_val: 1, increment: 1 });
    done();
  });
  it('should create the intermediate form correctly', () => {
    const intermediateForm = table.toDictionary();
    expect(intermediateForm.columns).to.eql(table.columns);
    expect(intermediateForm.rows).to.eql(table.rows);
  });
});

const connector = { url: 'https://engagelively.wl.r.appspot.com/' };
const remoteSchema = [{ name: 'Year', type: 'number' }, { name: 'Democratic', type: 'number' }, { name: 'Republican', type: 'number' }, { name: 'Other', type: 'number' }];
const runRemoteTests = false; // set to true if we want to really run the remote tests
const remoteTable = constructGalyleoTable({ name: 'electoral_college', columns: remoteSchema, connector: connector });

describe('Remote Table', () => {
  it('should create  and populate a remote table', () => {
    expect(remoteTable.tableType).to.eql('RemoteGalyleoTable');
    expect(remoteTable.columns).to.eql(remoteSchema);
    expect(remoteTable.url).to.eql(connector.url);
    expect(remoteTable.headers).to.eql({ 'Table-Name': 'electoral_college' });
  });
  it('should generate the intermediate form correctly', () => {
    const intermediateForm = remoteTable.toDictionary();
    expect(intermediateForm.columns).to.eql(remoteTable.columns);
    expect(intermediateForm.connector.url).to.eql(remoteTable.url);
    expect(intermediateForm.connector.interval).to.eql(undefined);
    expect(intermediateForm.connector.dashboardName).to.eql(undefined);
  });

  if (runRemoteTests) {
    it('should get all the years', async (done) => {
    // generate the years 1828-2020, inclusive, increments of 4
      const years = [...Array((2020 - 1828) / 4 + 1).keys()].map(n => n * 4 + 1828);
      const yearsFromTable = await remoteTable.getAllValues('Year');
      expect(yearsFromTable).to.eql(years);
      done();
    });
    it('should get the numeric spec from years', async (done) => {
      const spec = { max_val: 2020, min_val: 1828, increment: 4 };
      const specFromTable = await remoteTable.getNumericSpec('Year');
      expect(specFromTable).to.eql(spec);
      done();
    });
  }
  const pollCatcher = new PollCatcher();
  const pollingConnector = { url: 'https://engagelively.wl.r.appspot.com/', dashboardName: 'foo', interval: 1 };
  const remoteTable2 = constructGalyleoTable({ name: 'electoral_college', columns: remoteSchema, connector: pollingConnector });

  it('should poll every second', () => {
    remoteTable2.registerUpdateListener(pollCatcher);
    assert(remoteTable2.updateListeners.has(pollCatcher));
    expect(remoteTable2.updateListeners.size).to.eql(1);
    expect(remoteTable2.interval).to.eql(1);
    expect(remoteTable2.dashboardName).to.eql('foo');
    expect(pollCatcher.updates.length).to.eql(0);
    const pollDone = () => {
      assert(pollCatcher.updates.length <= 6 && pollCatcher.updates.length >= 4);
      const diffs = pollCatcher.updates.slice(1).map((value, index) => value - pollCatcher.updates[index]);
      diffs.forEach(value => assert(value >= 0.95 && value <= 1.05));
    };
    setTimeout(_ => pollDone(), 5000);
  });
  it('should generate the correct intermediate form for a polling table', () => {
    const intermediateForm = remoteTable2.toDictionary();
    expect(intermediateForm.columns).to.eql(remoteTable2.columns);
    expect(intermediateForm.connector.url).to.eql(remoteTable2.url);
    expect(intermediateForm.connector.interval).to.eql(remoteTable2.interval);
    expect(intermediateForm.connector.dashboardName).to.eql('foo');
  });
});

describe('Filter Creation and Test', () => {
  /* const remoteTable = constructGalyleoTable({ name: 'electoral_college', columns: remoteSchema, connector: connector }); */
  const table = constructGalyleoTable(explicitTableConstructor);
  const inListExplicit = constructFilter(table, { operator: 'IN_LIST', column: 'name', values: ['b'] });
  it('Should create an in-list filter and populate its fields correctly', () => {
    expect(inListExplicit.table).to.eql(table);
    expect(inListExplicit.column).to.eql(0);
    assert(isEqualSets(inListExplicit.valueSet, new Set(['b'])));
  });
  it('Should return the correct answer on test values', () => {
    assert(inListExplicit._filterValue_('b'));
    assert(!inListExplicit._filterValue_('a'));
  });
  const inListExplicit2 = constructFilter(table, { operator: 'IN_LIST', column: 'name', values: ['b'] });
  const inListExplicit3 = constructFilter(table, { operator: 'IN_LIST', column: 'name', values: ['a'] });
  it('Should show equivalent filters are equal', () => {
    assert(inListExplicit2.equals(inListExplicit));
  });
  it('Should show inequivalent list filters are unequal', () => {
    assert(!inListExplicit2.equals(null));
    assert(!inListExplicit3.equals(inListExplicit));
  });
  const inRangeExplicit = constructFilter(table, { operator: 'IN_RANGE', column: 'age', min_val: 1, max_val: 2 });
  it('Should create an in-range filter and populate its fields correctly, and return the correct answer on test values', () => {
    expect(inRangeExplicit.table).to.eql(table);
    expect(inRangeExplicit.column).to.eql(1);
    expect(inRangeExplicit.maxVal).to.eql(2);
    expect(inRangeExplicit.minVal).to.eql(1);
  });
  it('Should return the correct answer on test values for an in-range fitler', () => {
    assert(inRangeExplicit._filterValue_(1));
    assert(inRangeExplicit._filterValue_(1.5));
    assert(inRangeExplicit._filterValue_(2));
    assert(!inRangeExplicit._filterValue_(3));
    assert(!inRangeExplicit._filterValue_(0));
  });
  const inRangeExplicit2 = constructFilter(table, { operator: 'IN_RANGE', column: 'age', min_val: 1, max_val: 2 });
  it('Should test equality for in-range filters  correctly', () => {
    assert(inRangeExplicit2.equals(inRangeExplicit));
    assert(!inRangeExplicit.equals(inListExplicit));
  });
  const notFilter = constructFilter(table, { operator: 'NOT', arguments: [{ operator: 'IN_RANGE', column: 'age', min_val: 1, max_val: 2 }] });
  it('Should create a not filter and populate its fields correctly', () => {
    expect(notFilter.table).to.eql(table);
    expect(notFilter.args.length).to.eql(1);
  });
  it('Should populate the  arguments of a NOT filter correctly', () => {
    assert(notFilter.args[0].equals(inRangeExplicit2));
    assert(notFilter.args[0].equals(inRangeExplicit));
  });
  const notFilter2 = constructFilter(table, { operator: 'NOT', arguments: [{ operator: 'IN_RANGE', column: 'age', min_val: 1, max_val: 2 }] });
  it('Should test equality of NOT filters correctly', () => {
    assert(notFilter2.equals(notFilter));
    assert(!notFilter2.equals(inRangeExplicit));
  });
  const andFilter = constructFilter(table, { operator: 'AND', arguments: [{ operator: 'IN_RANGE', column: 'age', min_val: 1, max_val: 2 }, { operator: 'IN_LIST', column: 'name', values: ['b'] }] });
  it('Should create and populate AND filters correctly', () => {
    expect(andFilter.table).to.eql(table);
    expect(andFilter.args.length).to.eql(2);
  });
  it('Should populate the  arguments of an AND filter correctly', () => {
    assert(andFilter.args[0].equals(inRangeExplicit));
    assert(andFilter.args[1].equals(inListExplicit));
  });

  const andFilter2 = constructFilter(table, { operator: 'AND', arguments: [{ operator: 'IN_RANGE', column: 'age', min_val: 1, max_val: 2 }, { operator: 'IN_LIST', column: 'name', values: ['b'] }] });
  const andFilter3 = constructFilter(table, { operator: 'AND', arguments: [{ operator: 'IN_RANGE', column: 'age', min_val: 1, max_val: 2 }, { operator: 'IN_LIST', column: 'name', values: ['a'] }] });
  const andFilter4 = constructFilter(table, { operator: 'AND', arguments: [{ operator: 'IN_RANGE', column: 'age', min_val: 1, max_val: 2 }] });
  const andFilter5 = constructFilter(table, { operator: 'AND', arguments: [{ operator: 'IN_RANGE', column: 'age', min_val: 1, max_val: 2 }, { operator: 'IN_RANGE', column: 'age', min_val: 1, max_val: 2 }, { operator: 'IN_LIST', column: 'name', values: ['b'] }] });

  it('Should test equality of AND filters correctly', () => {
    assert(andFilter.equals(andFilter2));
    assert(!andFilter.equals(andFilter3));
    expect(andFilter4.args.length).to.eql(1);
    assert(andFilter4.args[0].equals(inRangeExplicit));
    assert(!andFilter.equals(andFilter4));
    expect(andFilter5.args.length).to.eql(3);
    assert(!andFilter.equals(andFilter5));
  });
});

const randint = (low, high) => Math.floor(Math.random() * (high - low) + low);

describe('Filter Interaction with Explicit Tables', () => {
  const names = ['Liam', 'Olivia', 'Noah', 'Emma', 'Oliver',	'Ava', 'Elijah', 'Charlotte', 'William',	'Sophia', 'James', 'Amelia', 'Benjamin',	'Isabella', 'Lucas',	'Mia', 'Henry',	'Evelyn', 'Alexander',	'Harper'];
  const rows = names.map(name => [name, randint(20, 70)]);
  const table = constructGalyleoTable({ name: 'test1', columns: explicitSchema, rows: rows });
  const numbers = rows.map(row => row[1]).sort((a, b) => a - b);
  const rangeFilterSpec = { operator: 'IN_RANGE', column: 'age', min_val: numbers[3], max_val: numbers[7] };
  const rangeFilterRows = rows.filter(row => row[1] <= rangeFilterSpec.max_val && row[1] >= rangeFilterSpec.min_val);
  it('should execute an in-range filter on a local table', async (done) => {
    const filteredRows = await table.getFilteredRows(rangeFilterSpec);
    expect(filteredRows).to.eql(rangeFilterRows);
    done();
  });
  const nameList = rangeFilterRows.map(row => row[0]).slice(1);
  const inListFilterSpec = { operator: 'IN_LIST', column: 'name', values: nameList };
  const listFilterRows = rows.filter(row => nameList.indexOf(row[0]) >= 0);
  it('Should execute an in-list filter on a local table', async (done) => {
    const filteredRows = await table.getFilteredRows(inListFilterSpec);
    expect(filteredRows).to.eql(listFilterRows);
    done();
  });
  const notInRangeFilterList = rows.filter(row => row[1] < rangeFilterSpec.min_val || row[1] > rangeFilterSpec.max_val);
  it('Should execute a not in-range filter', async (done) => {
    const filteredRows = await table.getFilteredRows({ operator: 'NOT', arguments: [rangeFilterSpec] });
    expect(filteredRows).to.eql(notInRangeFilterList);
    done();
  });
  const notInListFilterList = rows.filter(row => nameList.indexOf(row[0]) < 0);
  it('Should execute a not in-list filter', async (done) => {
    const filteredRows = await table.getFilteredRows({ operator: 'NOT', arguments: [inListFilterSpec] });
    expect(filteredRows).to.eql(notInListFilterList);
    done();
  });
  const andFilterList = rows.filter(row => (nameList.indexOf(row[0]) >= 0) && row[1] <= rangeFilterSpec.max_val && row[1] >= rangeFilterSpec.min_val);

  it('Should execute an and filter', async (done) => {
    const filteredRows = await table.getFilteredRows({ operator: 'AND', arguments: [inListFilterSpec, rangeFilterSpec] });
    expect(filteredRows).to.eql(andFilterList);
    done();
  });
  const orFilterList = rows.filter(row => (nameList.indexOf(row[0]) >= 0) || (row[1] <= rangeFilterSpec.max_val && row[1] >= rangeFilterSpec.min_val));
  it('Should execute an or  filter', async (done) => {
    const filteredRows = await table.getFilteredRows({ operator: 'OR', arguments: [inListFilterSpec, rangeFilterSpec] });
    expect(filteredRows).to.eql(orFilterList);
    done();
  });
});
describe('Filter Interaction with Remote Tables', () => {
  const expected1 = [[1960, 303, 219, 15], [1964, 486, 52, 0]];
  it('Should execute an in-range filter', async (done) => {
    const filteredRows = await remoteTable.getFilteredRows({ operator: 'IN_RANGE', column: 'Year', max_val: 1964, min_val: 1960 });
    expect(filteredRows).to.eql(expected1);
    done();
  });
});

// Set up for the view test
const testNames = ['Liam', 'Olivia', 'Noah', 'Emma', 'Oliver',	'Ava', 'Elijah', 'Charlotte', 'William',	'Sophia', 'James', 'Amelia', 'Benjamin',	'Isabella', 'Lucas',	'Mia', 'Henry',	'Evelyn', 'Alexander',	'Harper'];
const testRows = testNames.map((name, index) => [name, 20 + 3 * index]);
const testTable = constructGalyleoTable({ name: 'test1', columns: explicitSchema, rows: testRows });
const rangeFilter = { operator: 'IN_RANGE', column: 'age', max_val: testRows[5][1], min_val: testRows[1][1] }; // selects rows 1-5, inclusive
const listFilter = { operator: 'IN_LIST', column: 'name', values: testNames.slice(5) }; // selects 5-end
const filterDictionary = { rangeF: rangeFilter, listF: listFilter };
const viewSpec1 = { name: 'testView1', tableName: 'test1', columns: ['name'], filters: ['listF'] };
const view1 = new GalyleoView(viewSpec1);
const viewSpec2 = { name: 'testView2', tableName: 'test1', columns: ['age'], filters: ['rangeF'] };
const view2 = new GalyleoView(viewSpec2);
const viewSpec3 = { name: 'testView3', tableName: 'test1', columns: ['name', 'age'], filters: ['listF', 'rangeF'] };
const view3 = new GalyleoView(viewSpec3);
const log = [];
// check the good views
describe('Creation of valid views', () => {
  it('Should give the right intermediate form', () => {
    expect(view1.toDictionary()).to.eql(viewSpec1);
    expect(view2.toDictionary()).to.eql(viewSpec2);
    expect(view3.toDictionary()).to.eql(viewSpec3);
  });
  it('Should form the right filters1', () => {
    expect(view1._getFilter_(filterDictionary, testTable)).to.eql(listFilter);
  });
  it('Should form the right filters2', () => {
    expect(view2._getFilter_(filterDictionary, testTable)).to.eql(rangeFilter);
  });
  it('Should form the right filters3', () => {
    expect(view3._getFilter_(filterDictionary, testTable)).to.eql({ operator: 'AND', arguments: [listFilter, rangeFilter] });
  });
  const tableDict = { test1: testTable };

  it('Should get the right data1', async (done) => {
    const rows = await view1.getData(filterDictionary, tableDict);
    const expected = testRows.slice(5).map(row => [row[0]]);
    expect(rows).to.eql(expected);
    done();
  });
  it('Should get the right data2', async (done) => {
    const rows = await view2.getData(filterDictionary, tableDict);
    const expected = testRows.slice(1, 6).map(row => [row[1]]);
    expect(rows).to.eql(expected);
    done();
  });
  it('Should get the right data3', async (done) => {
    const rows = await view3.getData(filterDictionary, tableDict);
    const expected = [testRows[5]];
    expect(rows).to.eql(expected);
    done();
  });
  it('Should return undefined', async (done) => {
    const rows = await view1.getData(filterDictionary, {});
    expect(rows).to.eql(undefined);
    done();
  });
  // hit the table column names
  const badColumns = [{ name: 'name1', type: 'string' }, { name: 'age1', type: 'number' }];
  const testTable2 = constructGalyleoTable({ name: 'testView2', columns: badColumns, rows: testRows });
  // filters are now invalid
});
