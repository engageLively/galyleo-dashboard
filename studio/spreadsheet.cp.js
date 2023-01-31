import 'esm://cache/jsuites@3.8.3';
import jexcel from 'esm://cache/jspreadsheet-ce@4.10.1';
import { addOrChangeLinkedCSS, HTMLMorph } from 'lively.morphic';
import { arr } from 'lively.lang';
import { connect } from 'lively.bindings';
import { component } from 'lively.morphic/components/core.js';
import { Color } from 'lively.graphics';

export default class SpreadsheetMorph extends HTMLMorph {
  static get properties () {
    return {
      data: {
        after: ['html'],
        before: ['extent'],
        set (data) {
          this.setProperty('data', data);
          this.update();
        }
      },
      html: {
        get () {
          return `<div class="spreadsheetContainer"></div>`;
        }
      },
      contextMenu: {
        derived: true,
        get () {
          return this.jexcel.contextMenu.children[0];
        }
      },
      spreadsheetNode: {
        derived: true,
        get () {
          return this.domNode.getElementsByClassName('spreadsheetContainer')[0];
        }
      },
      filteredData: {
        derived: true,
        get () {
          return [this.jexcel.getHeaders(true)].concat(this.jexcel.getData());
        }
      },
      dataHeaders: {
        derived: true,
        get () {
          let headerInfo;
          if (this.jexcel) headerInfo = this.jexcel.getHeaders(true);
          else headerInfo = (this.data && this.data[0]) || [];
          let width = headerInfo.length ? (this.width - 50) / headerInfo.length : 0;
          return headerInfo.map((columnName, i) => {
            // fixme: how to do type inference???
            if (i === headerInfo.length - 1) width = this.width - 50 - (i * Math.floor(width));
            if (String(Number.parseInt(columnName)) !== 'NaN') {
              columnName = arr.range(65, 65 + 26).map((i) => String.fromCharCode(i))[i];
            }
            return { title: columnName, width, type: typeof this.data[1][i] === 'number' ? 'numeric' : 'text' };
          });
        }
      }
    };
  }

  // this.setData([['hello', 'world'],[1,2],[4,5]])

  reset () {
    this.html = this.html;
    this.jexcel = null;
  }

  async onLoad () {
    addOrChangeLinkedCSS('jsuites css', 'https://bossanova.uk/jsuites/v2/jsuites.css');
    addOrChangeLinkedCSS('jexcel css', 'https://bossanova.uk/jexcel/v3/jexcel.css');
    this.cssDeclaration = `.jexcel {
  font-family: 'Nunito';
  font-size: 14px;
  border-top-width: 0px;
  border-left-width: 0px;
  border-right-width: 1px;
  box-shadow: rgba(0, 0, 0, 0.1) 4.89859e-16px 8px 10px 0px;
}
.jexcel_pagination {
  display: none;
}
.spreadsheetContainer {
  height: 100%;
}`;
    await this.whenRendered();
    this.setData(this.data);
    connect(this, 'extent', this, 'relayout');
  }

  // this.setData([['hello', 'world'],[1,2],[4,5]])

  async onContextMenu (evt) {
    this.clipMode = 'visible';
    await this.whenRendered();
    const style = this.contextMenu.style;
    const { x, y } = evt.positionIn(this);
    style.top = `${y}px`;
    style.left = `${x}px`;
    [...this.contextMenu.children].forEach(item => {
      item.onmousedown = item.onmouseup;
    });
  }

  onTableChange (change) {
    this.relayout();
  }

  setData (data) {
    this.reset();
    // const instruction = this.getSubmorphNamed('instruction note');
    // if (data.length === 0) {
    //   instruction.visible = true;
    //   this.domNode.style.display = 'none';
    // } else {
    //   instruction.visible = false;
    //   this.domNode.style.display = '';
    // }
    this.data = data;
  }

  getData () {
    return this.data;
  }

  async update () {
    await this.whenRendered();
    this.ensureTable();
    this.jexcel.setData(this.data.slice(1));
    this.relayout();
  }

  // this.relayout()

  relayout () {
    if (this._active || !this.jexcel) return;
    this._active = true;
    this.clipMode = 'hidden';
    this.jexcel.content.style.height = this.height + 'px';
    this.dataHeaders.map((c, i) => {
      this.jexcel.setHeader(i, c.title);
      this.jexcel.setWidth(i, c.width);
      this.jexcel.setHeader(i, c.title);
    });
    this._active = false;
  }

  onEdit (el, cell, x, y, value) {
    // jexcel does not preserve data types by default which is bad with most
    // of our charts api. So this makes sure numbers remain numbers at least
    if (this.dataHeaders[x].type === 'numeric') return Number(value);
  }

  // this.jexcel.getColumnData(1)

  ensureTable () {
    if (this.domNode.getElementsByClassName('jexcel').length > 0) return;
    this.jexcel = jexcel(this.spreadsheetNode, {
      lazyLoading: true,
      data: this.data.slice(1),
      oninsertcolumn: () => this.onTableChange(),
      ondeletecolumn: () => this.onTableChange(),
      onbeforechange: (el, cell, x, y, value) => this.onEdit(el, cell, x, y, value),
      tableHeight: this.height,
      tableOverflow: true,
      loadingSpin: true,
      columns: this.dataHeaders
    });
  }

  updateConfigurator () {
    const configurator = this.get('graph wizard');
    configurator.enable();
    configurator.setNewData(this.filteredData);
  }
}

const Spreadsheet = component({
  type: SpreadsheetMorph,
  name: 'spreadsheet',
  fill: Color.rgb(127, 140, 141)
});
