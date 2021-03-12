// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { IDocumentManager } from '@jupyterlab/docmanager';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { ILabShell, JupyterFrontEnd } from '@jupyterlab/application';
import { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import { Drive } from '@jupyterlab/services';
// import { IKernelConnection } from '@jupyterlab/services';

declare global {
  interface Window {
    System: any;
    frozenPart: any;
    $world: any;
    lively: {};
    EXTENSION_INFO: {};
    FORCE_FAST_LOAD: boolean;
    SNAPSHOT_PATH: string;
    SYSTEM_BASE_URL: string;
    WORLD_NAME: string;
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

    let u =
      Date.now().toString(16) + Math.random().toString(16) + '0'.repeat(16);
    this._guid = [
      u.substr(0, 8),
      u.substr(8, 4),
      '4000-8' + u.substr(13, 3),
      u.substr(16, 12)
    ].join('-');
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
        <div className="editor-area">This is an area... for galyleo</div>
      </div>
    );
    ReactDOM.render(jsx, this.node);

    // dynamically load the load.js from the cdn and wait
    var script = document.createElement('script');
    const bootstrapBaseURL =
      'https://matt.engagelively.com/lively.freezer/loading-screen/'; // this is the base url while the frozen part of the loader is loaded
    script.src =
      'https://matt.engagelively.com/lively.freezer/loading-screen/load.js';
    window.WORLD_NAME = '__newWorld__';
    // window.FORCE_FAST_LOAD = true;
    //window.SNAPSHOT_PATH = 'https://matt.engagelively.com/users/robin/published/dashboards/dashboard-studio.json';
    window.SYSTEM_BASE_URL = 'https://matt.engagelively.com'; // once bootstrapped, we need to change the base URL to here
    script.onload = () => {
      window.frozenPart.renderFrozenPart(
        document.getElementsByClassName('editor-area')[0],
        bootstrapBaseURL
      );
      // wait until the $world is defined
      window.EXTENSION_INFO = {
        notebook: this._notebook,
        widget: this,
        labShell: this._labShell,
        app: this._app,
        docmanager: this._documentManager,
        drive: new Drive(),
        room: this._guid
      };

      // window.$world.resizePolicy = 'static';
      // let galyleo = window.$world.getSubmorphNamed('galyleo');
      // let jupyter = window.$world.getSubmorphNamed('jupyter');
      // galyleo.respondsToVisibleWindow = false;
      // jupyter.runtime.notebook = this._notebook;
      // jupyter.runtime.widget = this;
      // jupyter.runtime.labShell = this._labShell;
      // window.$world.trackOffset = true;
      this.update();
    };
    document.head.appendChild(script);
    const self = this;
    this._notebook.widgetAdded.connect((tracker, panel) =>
      self.sendGuid(tracker, panel)
    );
  }

  protected sendGuid(tracker: INotebookTracker, panel: NotebookPanel) {
    console.log('Panel connected');
    const code = `%env DASHBOARD_ROOM=${this._guid}`;

    panel.sessionContext.ready.then(_ => {
      console.log('Session is ready!');
      let kernel = panel.sessionContext.session?.kernel;
      kernel?.connectionStatusChanged.connect((kernel, status) => {
        if (status == 'connected') {
          kernel?.requestExecute({ code: code, silent: true });
        }
      });
      if (!kernel) {
        console.log('No kernel!');
      } else {
        kernel?.requestExecute({ code: code, silent: true });
      }
    });
  }

  /* protected _executeCode(kernel: IKernelConnection | null | undefined, code: string) {
    const success = `Execution of ${code} successful`;
    const failure = `Execution of ${code} failed`;
    return new Promise((resolve, reject) => {
      
      let req = kernel.requestExecute({
        code,
        silent: true
      });
      if (req) {
        console.log(success);
        req.onIOPub = (msg: any) => {
          if (!msg.content.execution_state) resolve(msg);
        };
      } else {
        console.log(failure);
      }
    });

  } */

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
  private _guid: string;
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
