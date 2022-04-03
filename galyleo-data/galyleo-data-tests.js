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

const explicitSchema = [{ name: 'name', type: 'string' }, { name: 'age', type: 'number' }];
const explicitRows = [['a', 2], ['b', 1]];
const explicitTableConstructor = { name: 'test1', columns: explicitSchema, rows: explicitRows };

const isEqualSets = (set1, set2) => (set1.size === set2.size) && (set1.size === new Set([...set1, ...set2]).size);

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

describe('Remote Table', () => {
  const remoteTable = constructGalyleoTable({ name: 'electoral_college', columns: remoteSchema, connector: connector });
  it('should create table and populate a remote table', () => {
    expect(remoteTable.tableType).to.eql('RemoteGalyleoTable');
    expect(remoteTable.columns).to.eql(remoteSchema);
    expect(remoteTable.url).to.eql(connector.url);
    expect(remoteTable.parameters).to.eql({ table_name: 'electoral_college' });
    expect(remoteTable.getUrlParameterString).to.eql('table_name=electoral_college');
  });
  it('should execute the remote table API', async () => {
    const years = [...Array((2020 - 1828) / 4 + 1).keys()].map(n => n * 4 + 1828);
    expect(await remoteTable.getAllValues('Year')).to.eql(years);
    const spec = { max_val: 2020, min_val: 1828, increment: 4 };
    expect(await remoteTable.getNumericSpec('Year')).to.eql(spec);
  });
});

describe('Filter Creation and Test', () => {
  const remoteTable = constructGalyleoTable({ name: 'electoral_college', columns: remoteSchema, connector: connector });
  const table = constructGalyleoTable(explicitTableConstructor);
  it('Should create filters and find values based on them', () => {
    const inListExplicit = constructFilter(table, { operator: 'IN_LIST', column: 'name', values: ['b'] });
    expect(inListExplicit.table).to.eql(table);
    expect(inListExplicit.column).to.eql(0);
    expect(isEqualSets(inListExplicit.valueSet, new Set(['b']))).to.eql(true);
    assert(isEqualSets(inListExplicit.valueSet, new Set(['b'])));
    assert(inListExplicit._filterValue_('b'));
    assert(!inListExplicit._filterValue_('a'));
    const inListExplicit2 = constructFilter(table, { operator: 'IN_LIST', column: 'name', values: ['b'] });
    assert(inListExplicit2.equals(inListExplicit));
    assert(!inListExplicit2.equals(null));
    const inListExplicit3 = constructFilter(table, { operator: 'IN_LIST', column: 'name', values: ['a'] });
    assert(!inListExplicit3.equals(inListExplicit));
    const inRangeExplicit = constructFilter(table, { operator: 'IN_RANGE', column: 'age', min_val: 1, max_val: 2 });
    expect(inRangeExplicit.table).to.eql(table);
    expect(inRangeExplicit.column).to.eql(1);
    expect(inRangeExplicit.maxVal).to.eql(2);
    expect(inRangeExplicit.minVal).to.eql(1);
    assert(inRangeExplicit._filterValue_(1));
    assert(inRangeExplicit._filterValue_(1.5));
    assert(inRangeExplicit._filterValue_(2));
    assert(!inRangeExplicit._filterValue_(3));
    assert(!inRangeExplicit._filterValue_(0));
    const inRangeExplicit2 = constructFilter(table, { operator: 'IN_RANGE', column: 'age', min_val: 1, max_val: 2 });
    assert(inRangeExplicit2.equals(inRangeExplicit));
    assert(!inRangeExplicit.equals(inListExplicit));
    const notFilter = constructFilter(table, { operator: 'NOT', arguments: [{ operator: 'IN_RANGE', column: 'age', min_val: 1, max_val: 2 }] });
    expect(notFilter.table).to.eql(table);
    expect(notFilter.args.length).to.eql(1);
    assert(notFilter.args[0].equals(inRangeExplicit2));
    assert(notFilter.args[0].equals(inRangeExplicit));
    const notFilter2 = constructFilter(table, { operator: 'NOT', arguments: [{ operator: 'IN_RANGE', column: 'age', min_val: 1, max_val: 2 }] });
    assert(notFilter2.equals(notFilter));
    assert(!notFilter2.equals(inRangeExplicit));
  });
});
