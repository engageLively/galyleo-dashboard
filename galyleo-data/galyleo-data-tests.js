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

describe('Explicit Table', () => {
  it('should create table and populate an explicit table', async () => {
    const schema = [{ name: 'name', type: 'string' }, { name: 'age', type: 'number' }];
    const rows = [['a', 2], ['b', 1]];
    const table = constructGalyleoTable({ name: 'test1', columns: schema, rows: rows });
    expect(table.tableType).to.eql('ExplicitGalyleoTable');
    expect(table.columns).to.eql(schema);
    expect(table.rows).to.eql(rows);
    expect(table.name).to.eql('test1');
    expect(table.getRows()).to.eql(rows);
    expect(table.getColumnIndex('name')).to.eql(0);
    const filteredRows = await table.getFilteredRows();
    expect(filteredRows == rows);
    expect(await table.getAllValues('name')).to.eql(['a', 'b']);
    expect(await table.getAllValues('age')).to.eql([1, 2]);
    expect(await table.getNumericSpec('age')).to.eql({ max_val: 2, min_val: 1, increment: 1 });
  });
});
describe('Remote Table', () => {
  it('should create table and populate a remote table', async () => {
    const connector = { url: 'https://engagelively.wl.r.appspot.com/' };
    const remoteSchema = [{ name: 'Year', type: 'number' }, { name: 'Democratic', type: 'number' }, { name: 'Republican', type: 'number' }, { name: 'Other', type: 'number' }];
    const remoteTable = constructGalyleoTable({ name: 'electoral_college', columns: remoteSchema, connector: connector });
    expect(remoteTable.tableType).to.eql('RemoteGalyleoTable');
    expect(remoteTable.columns).to.eql(remoteSchema);
    expect(remoteTable.url).to.eql(connector.url);
    expect(remoteTable.parameters).to.eql({ table_name: 'electoral_college' });
    expect(remoteTable.getUrlParameterString).to.eql('table_name=electoral_college');
    const years = [...Array((2020 - 1828) / 4 + 1).keys()].map(n => n * 4 + 1828);
    expect(await remoteTable.getAllValues('Year')).to.eql(years);
    const spec = { max_val: 2020, min_val: 1828, increment: 4 };
    expect(await remoteTable.getNumericSpec('Year')).to.eql(spec);
  });
});
