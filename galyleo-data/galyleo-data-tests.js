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
import { expect } from 'mocha-es6';
import { Filter, constructFilter, constructGalyleoTable, ExplicitGalyleoTable } from './galyleo-data.js';
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
  it('should create table and populate an explicit table', async () => {
    expect(table.tableType).to.eql('ExplicitGalyleoTable');
    expect(table.columns).to.eql(explicitSchema);
    expect(table.rows).to.eql(explicitRows);
    expect(table.name).to.eql('test1');
    expect(table.getRows()).to.eql(explicitRows);
    expect(table.getColumnIndex('name')).to.eql(0);
  });
  it('should correctly execute the API for an explicit table', async () => {
    const filteredRows = await table.getFilteredRows();
    expect(filteredRows == explicitRows);
    expect(await table.getAllValues('name')).to.eql(['a', 'b']);
    expect(await table.getAllValues('age')).to.eql([1, 2]);
    expect(await table.getNumericSpec('age')).to.eql({ max_val: 2, min_val: 1, increment: 1 });
  });
});

const connector = { url: 'https://engagelively.wl.r.appspot.com/' };
const remoteSchema = [{ name: 'Year', type: 'number' }, { name: 'Democratic', type: 'number' }, { name: 'Republican', type: 'number' }, { name: 'Other', type: 'number' }];
const runRemoteTests = true; // set to true if we want to really run the remote tests

describe('Remote Table', () => {
  const remoteTable = constructGalyleoTable({ name: 'electoral_college', columns: remoteSchema, connector: connector });
  it('should create table and populate a remote table', () => {
    expect(remoteTable.tableType).to.eql('RemoteGalyleoTable');
    expect(remoteTable.columns).to.eql(remoteSchema);
    expect(remoteTable.url).to.eql(connector.url);
    expect(remoteTable.headers).to.eql({ 'Table-Name': 'electoral_college' });
  });

  if (runRemoteTests) {
    it('should get all the years', () => {
    // generate the years 1828-2020, inclusive, increments of 4
      const years = [...Array((2020 - 1828) / 4 + 1).keys()].map(n => n * 4 + 1828);
      remoteTable.getAllValues('Year').then(yearsFromTable => expect(yearsFromTable).to.eql(years));
    });
    it('should get the numeric spec from years', async () => {
      const spec = { max_val: 2020, min_val: 1828, increment: 4 };
      remoteTable.getNumericSpec('Year').then(specFromTable => expect(specFromTable).to.eql(spec));
    });
  }
  const pollCatcher = new PollCatcher();

  it('should poll every second', () => {
    const pollingConnector = { url: 'https://engagelively.wl.r.appspot.com/', dashboardName: 'foo', interval: 1 };
    const remoteTable2 = constructGalyleoTable({ name: 'electoral_college', columns: remoteSchema, connector: pollingConnector });
    remoteTable2.registerUpdateListener(pollCatcher);
    assert(remoteTable2.updateListeners.has(pollCatcher));
    expect(remoteTable2.updateListeners.size).to.eql(1);
    expect(remoteTable2.interval).to.eql(1);
    expect(remoteTable2.dashboardName).to.eql('foo');
    expect(pollCatcher.updates.length).to.eql(0);
    const pollDone = () => {
      assert(pollCatcher.updates.length <= 6 && pollCatcher.updates.length >= 4);
      const diffs = pollCatcher.slice(1).map((value, index) => value - pollCatcher.updates[index]);
      diffs.forEach(value => assert(value >= 0.95 && value <= 1.05));
    };
    setTimeout(_ => pollDone(), 5000);
  });
});

describe('Filter Creation and Test', () => {
  /* const remoteTable = constructGalyleoTable({ name: 'electoral_college', columns: remoteSchema, connector: connector }); */
  const table = constructGalyleoTable(explicitTableConstructor);
  const inListExplicit = constructFilter(table, { operator: 'IN_LIST', column: 'name', values: ['b'] });
  it('Should create an in-list filter and populate its fields correctly, and return the correct answer on test values', () => {
    expect(inListExplicit.table).to.eql(table);
    expect(inListExplicit.column).to.eql(0);
    expect(isEqualSets(inListExplicit.valueSet, new Set(['b']))).to.eql(true);
    assert(isEqualSets(inListExplicit.valueSet, new Set(['b'])));
    assert(inListExplicit._filterValue_('b'));
    assert(!inListExplicit._filterValue_('a'));
  });
  const inListExplicit2 = constructFilter(table, { operator: 'IN_LIST', column: 'name', values: ['b'] });
  const inListExplicit3 = constructFilter(table, { operator: 'IN_LIST', column: 'name', values: ['a'] });
  it('Should show equivalent filters are equal', () => {
    assert(inListExplicit2.equals(inListExplicit));
    assert(!inListExplicit2.equals(null));
    assert(!inListExplicit3.equals(inListExplicit));
  });
  const inRangeExplicit = constructFilter(table, { operator: 'IN_RANGE', column: 'age', min_val: 1, max_val: 2 });
  it('Should create an in-range filter and populate its fields correctly, and return the correct answer on test values', () => {
    expect(inRangeExplicit.table).to.eql(table);
    expect(inRangeExplicit.column).to.eql(1);
    expect(inRangeExplicit.maxVal).to.eql(2);
    expect(inRangeExplicit.minVal).to.eql(1);
    assert(inRangeExplicit._filterValue_(1));
    assert(inRangeExplicit._filterValue_(1.5));
    assert(inRangeExplicit._filterValue_(2));
    assert(!inRangeExplicit._filterValue_(3));
    assert(!inRangeExplicit._filterValue_(0));
  });
  const inRangeExplicit2 = constructFilter(table, { operator: 'IN_RANGE', column: 'age', min_val: 1, max_val: 2 });
  it('Should test equality for   in-range filters  correctly', () => {
    assert(inRangeExplicit2.equals(inRangeExplicit));
    assert(!inRangeExplicit.equals(inListExplicit));
  });
  const notFilter = constructFilter(table, { operator: 'NOT', arguments: [{ operator: 'IN_RANGE', column: 'age', min_val: 1, max_val: 2 }] });
  it('Should create a not filter and populate its fields correctly, and the arguments must be populated correctly', () => {
    expect(notFilter.table).to.eql(table);
    expect(notFilter.args.length).to.eql(1);
    assert(notFilter.args[0].equals(inRangeExplicit2));
    assert(notFilter.args[0].equals(inRangeExplicit));
    const notFilter2 = constructFilter(table, { operator: 'NOT', arguments: [{ operator: 'IN_RANGE', column: 'age', min_val: 1, max_val: 2 }] });
    assert(notFilter2.equals(notFilter));
    assert(!notFilter2.equals(inRangeExplicit));
    const andFilter = constructFilter(table, { operator: 'AND', arguments: [{ operator: 'IN_RANGE', column: 'age', min_val: 1, max_val: 2 }, { operator: 'IN_LIST', column: 'name', values: ['b'] }] });
    expect(andFilter.table).to.eql(table);
    expect(andFilter.args.length).to.eql(2);
    assert(andFilter.args[0].equals(inRangeExplicit));
    assert(andFilter.args[1].equals(inListExplicit));
    const andFilter2 = constructFilter(table, { operator: 'AND', arguments: [{ operator: 'IN_RANGE', column: 'age', min_val: 1, max_val: 2 }, { operator: 'IN_LIST', column: 'name', values: ['b'] }] });
    assert(andFilter.equals(andFilter2));
    const andFilter3 = constructFilter(table, { operator: 'AND', arguments: [{ operator: 'IN_RANGE', column: 'age', min_val: 1, max_val: 2 }, { operator: 'IN_LIST', column: 'name', values: ['a'] }] });
    assert(!andFilter.equals(andFilter3));
    const andFilter4 = constructFilter(table, { operator: 'AND', arguments: [{ operator: 'IN_RANGE', column: 'age', min_val: 1, max_val: 2 }] });
    expect(andFilter4.args.length).to.eql(1);
    assert(andFilter4.args[0].equals(inRangeExplicit));
    assert(!andFilter.equals(andFilter4));
    const andFilter5 = constructFilter(table, { operator: 'AND', arguments: [{ operator: 'IN_RANGE', column: 'age', min_val: 1, max_val: 2 }, { operator: 'IN_RANGE', column: 'age', min_val: 1, max_val: 2 }, { operator: 'IN_LIST', column: 'name', values: ['b'] }] });
    expect(andFilter5.args.length).to.eql(3);
    assert(!andFilter.equals(andFilter5));
  });
});

const randint = (low, high) => Math.floor(Math.random() * (high - low) + low);

describe('Filter Interaction with Tables', () => {
  const names = ['Liam', 'Olivia', 'Noah', 'Emma', 'Oliver',	'Ava', 'Elijah', 'Charlotte', 'William',	'Sophia', 'James', 'Amelia', 'Benjamin',	'Isabella', 'Lucas',	'Mia', 'Henry',	'Evelyn', 'Alexander',	'Harper'];
  const rows = names.map(name => [name, randint(20, 70)]);
  const table = constructGalyleoTable({ name: 'test1', columns: explicitSchema, rows: rows });
  const numbers = rows.map(row => row[1]).sort((a, b) => a - b);
  const rangeFilterSpec = { operator: 'IN_RANGE', column: 'age', min_val: numbers[3], max_val: numbers[7] };
  const inRangeFilter = constructFilter(table, rangeFilterSpec);
  const rangeFilterRows = rows.filter(row => row[1] <= rangeFilterSpec.max_val && row[1] >= rangeFilterSpec.min_val);
  it('should execute an in-range filter', () => {
    table.getFilteredRows(inRangeFilter).then(filteredRows => {
      expect(filteredRows).to.eql(rangeFilterRows);
    });
  });
  const nameList = rangeFilterRows.map(row => row[0]).slice(1);
  const inListFilterSpec = { operator: 'IN_LIST', column: 'name', values: nameList };
  const inListFilter = constructFilter(table, inListFilterSpec);
  const listFilterRows = rows.filter(row => nameList.indexOf(row[0]) >= 0);
  it('Should execute an in-list filter', () => {
    table.getFilteredRows(inListFilter).then(filteredRows => {
      expect(filteredRows).to.eql(listFilterRows);
    });
  });
  const notInRangeFilterList = rows.filter(row => row[1] < rangeFilterSpec.min_val || row[1] > rangeFilterSpec.max_val);
  const notRangeFilter = constructFilter(table, { operator: 'NOT', arguments: [rangeFilterSpec] });
  it('Should execute a not in-range filter', () => {
    table.getFilteredRows(notRangeFilter).then(filteredRows => {
      expect(filteredRows).to.eql(notInRangeFilterList);
    });
  });
  const notInListFilterList = rows.filter(row => nameList.indexOf(row[0]) < 0);
  const notListFilter = constructFilter(table, { operator: 'NOT', arguments: [inListFilterSpec] });
  it('Should execute a not in-list filter', () => {
    table.getFilteredRows(notListFilter).then(filteredRows => {
      expect(filteredRows).to.eql(notInListFilterList);
    });
  });
  const andFilterList = rows.filter(row => (nameList.indexOf(row[0]) >= 0) && row[1] <= rangeFilterSpec.max_val && row[1] >= rangeFilterSpec.min_val);
  const andFilter = constructFilter(table, { operator: 'AND', arguments: [inListFilterSpec, rangeFilterSpec] });
  it('Should execute an and filter', () => {
    table.getFilteredRows(andFilter).then(filteredRows => {
      expect(filteredRows).to.eql(andFilterList);
    });
  });
  const orFilterList = rows.filter(row => (nameList.indexOf(row[0]) >= 0) || (row[1] <= rangeFilterSpec.max_val && row[1] >= rangeFilterSpec.min_val));
  const orFilter = constructFilter(table, { operator: 'OR', arguments: [inListFilterSpec, rangeFilterSpec] });
  it('Should execute an or  filter', () => {
    table.getFilteredRows(orFilter).then(filteredRows => {
      expect(filteredRows).to.eql(orFilterList);
    });
  });
});
