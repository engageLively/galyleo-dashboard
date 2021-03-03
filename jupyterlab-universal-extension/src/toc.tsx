// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { CodeCell, Cell, ICellModel } from '@jupyterlab/cells';
import { INotebookTracker, INotebookModel, NotebookPanel } from '@jupyterlab/notebook';
import { ILabShell, JupyterFrontEnd } from '@jupyterlab/application';
import { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import { CodeCellModel } from '@jupyterlab/cells/lib/model';
import { Drive } from "@jupyterlab/services";

declare global {
  interface Window {
    System: any;
    frozenPart: any;
    $world: any;
    lively: {};
    EXTENSION_INFO: {},
    FORCE_FAST_LOAD: boolean,
    SNAPSHOT_PATH: string,
    SYSTEM_BASE_URL: string,
    WORLD_NAME: string,
  }
}

/**
 * Widget for hosting a notebook table of contents.
 */
export class GalyleoEditor extends Widget {
  /**
   * Returns a new table of contents.
   *
   * @param options - options
   * @returns widget
   */
  constructor(options: GalyleoEditor.IOptions) {
    super();
    this._notebook = options.notebook;
    this._labShell = options.labShell;
    this._documentManager = options.docmanager;
    this._app = options.app;
  }
  /**
   * Callback invoked to re-render after showing a table of contents.
   *
   * @param msg - message
   */
  protected onAfterAttach(msg: Message): void {
    let title = 'Galyleo Editor';
    let jsx = (
      <div className="jp-TableOfContents">
        <header>{title}</header>
        <div className="editor-area">
          This is an area... for galyleo
        </div>
      </div>
    );
    ReactDOM.render(jsx, this.node);

    // dynamically load the load.js from the cdn and wait 
    var script = document.createElement('script');
    const bootstrapBaseURL = 'https://matt.engagelively.com/lively.freezer/loading-screen/'; // this is the base url while the frozen part of the loader is loaded
    script.src = 'https://matt.engagelively.com/lively.freezer/loading-screen/load.js';
    window.WORLD_NAME = '__newWorld__';
    // window.FORCE_FAST_LOAD = true;
    //window.SNAPSHOT_PATH = 'https://matt.engagelively.com/users/robin/published/dashboards/dashboard-studio.json';
    window.SYSTEM_BASE_URL = 'https://matt.engagelively.com' // once bootstrapped, we need to change the base URL to here
    script.onload = () => {
      window.frozenPart.renderFrozenPart(document.getElementsByClassName('editor-area')[0], bootstrapBaseURL);
      // wait until the $world is defined
      window.EXTENSION_INFO = {
        notebook: this._notebook,
        widget: this,
        labShell: this._labShell,
        app: this._app,
        docmanager: this._documentManager,
        drive: new Drive(),
      }

      // window.$world.resizePolicy = 'static';
      // let galyleo = window.$world.getSubmorphNamed('galyleo');
      // let jupyter = window.$world.getSubmorphNamed('jupyter');
      // galyleo.respondsToVisibleWindow = false;
      // jupyter.runtime.notebook = this._notebook;
      // jupyter.runtime.widget = this;
      // jupyter.runtime.labShell = this._labShell;
      // window.$world.trackOffset = true;
      this.update();
    }
    document.head.appendChild(script);
  }

  protected execute(code: string) {
    let panel = this._labShell.widgets('main').next() as NotebookPanel;
    if (!panel.sessionContext.session?.kernel) return;
    let kernel = panel.sessionContext.session?.kernel;
    return new Promise((resolve, reject) => {
      if (!kernel) return reject();
      let req = kernel.requestExecute({
        code,
        silent: true
      });
      if (req) {
        req.onIOPub = (msg: any) => {
          if (!msg.content.execution_state) resolve(msg);
        }
      }
    }); 
  }

  protected createCell(idx: number, code: string): Cell<ICellModel> {
    let panel = this._labShell.widgets('main').next() as NotebookPanel;
    let model: INotebookModel | null = panel.model;
    let cell: CodeCellModel = new CodeCellModel({});
    cell.value.text = code;
    model?.cells.insert(idx, cell);
    return panel.content.widgets[idx] as unknown as Cell<ICellModel>;
  }

  protected selectCell() {
    let markerElement = document.createElement('div');
    markerElement.style.background = 'orange';
    markerElement.style.opacity = '0.5';
    markerElement.style.position = 'absolute';
    markerElement.style.display = 'none';
    markerElement.style.pointerEvents = 'none';
    let panel = this._labShell.widgets('main').next() as NotebookPanel;
    let notebookNode = panel && panel.node as HTMLDivElement;
    if (!notebookNode) return;
    document.body.appendChild(markerElement);
    return new Promise((resolve) => {
      let currentCell: Cell<ICellModel> | undefined;
      let update = (evt: MouseEvent) => {
        let target = evt.composedPath().find((node: HTMLDivElement) => node.classList && node.classList.contains('jp-CodeCell')) as HTMLDivElement;
        if (target) {
          let bounds = target.getBoundingClientRect();
          currentCell = (panel.content.widgets.find(w => w.node === target) as unknown as Cell<ICellModel>);
          markerElement.style.display = 'initial';
          markerElement.style.top = bounds.top + 'px';
          markerElement.style.left = bounds.left + 'px';
          markerElement.style.width = bounds.width + 'px';
          markerElement.style.height = bounds.height + 'px';
        } else {
          markerElement.style.display = 'none';
        }
      }
      window.addEventListener('mousemove', update);
      notebookNode.onmousedown = () => {
        markerElement.remove();
        resolve(currentCell);
        window.removeEventListener('mousemove', update);
      }
    });
  }

  protected insertAndEval(idx: number, code: string) {
    let panel = this._labShell.widgets('main').next() as NotebookPanel;
    let cell = this.createCell(0, code);
    const session = panel.sessionContext;
    session && CodeCell.execute(cell as CodeCell, session);
  }

  protected onResize(msg: Widget.ResizeMessage) {
    const world = window.$world;
    if (world) {
      world.isEmbedded = true;
      world.resizePolicy = 'static';
      world.width = msg.width;
      world.height = msg.height;
      world.onWindowResize();
    }
  }

  private _notebook: INotebookTracker;
  private _labShell: ILabShell;
  private _app: JupyterFrontEnd;
  private _documentManager: IDocumentManager;
}

/**
 * A namespace for TableOfContents statics.
 */
export namespace GalyleoEditor {
  /**
   * Interface describing table of contents widget options.
   */
  export interface IOptions {
    /**
     * Application document manager.
     */
    docmanager: IDocumentManager;

    /**
     * Notebook ref.
     */
    notebook: INotebookTracker;

    labShell: ILabShell;

    app: JupyterFrontEnd;
  }

  /**
   * Interface describing the current widget.
   */
  export interface ICurrentWidget<W extends Widget = Widget> {
    /**
     * Current widget.
     */
    widget: W;

  }
}
