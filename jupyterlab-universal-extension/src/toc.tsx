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
import { FileBrowserModel } from '@jupyterlab/filebrowser';

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
    this._currentDocumentInfo = { fileModel: undefined };
    this._drive = new Drive();
    this._browserModel = options.browserModel;

    // Create a guid from a canned algorithm to give a unique
    // room name to this dashboard session

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
    window.WORLD_NAME = 'Dashboard Studio Development';
    // window.FORCE_FAST_LOAD = true;
    //window.SNAPSHOT_PATH = 'https://matt.engagelively.com/users/robin/published/dashboards/dashboard-studio.json';
    window.SYSTEM_BASE_URL = 'https://matt.engagelively.com'; // once bootstrapped, we need to change the base URL to here
    script.onload = () => {
      // render this into the shadow dom
      const elementRef = document.getElementsByClassName('editor-area')[0];
      const shadowRoot = elementRef.attachShadow({ mode: 'open' });
      window.frozenPart.renderFrozenPart(
        shadowRoot,
        bootstrapBaseURL
      );
      // wait until the $world is defined
      window.EXTENSION_INFO = {
        notebook: this._notebook,
        widget: this,
        labShell: this._labShell,
        app: this._app,
        docmanager: this._documentManager,
        drive: this._drive,
        room: this._guid,
        currentDocument: this._currentDocumentInfo,
        browserModel: this._browserModel
      };

      // check for file name changes.  This can happen either from drive
      // or from the File browser.  For the moment, commenting out the drive
      // usage since this might lead to us catching our own save events.
      /*
      this._drive.fileChanged.connect((drive, changedInfo) => {
        console.log(`file changed ${changedInfo}`);
        window.$world.get('dashboard').checkPossibleRename(drive, changedInfo)
      })
*/
      const dashboard = window.$world.get('dashboard');

      // check for file name changes from the File browser.  Just put the hook here and
      // let the dashboard handle it.

      // AFAICT, this isn't being called at all.  The hell with it; moving it
      // to the dashboard (we should consider this for all hooks: just pass the correct
      // object to Lively and do it there)

      this._browserModel.fileChanged.connect((browserModel, changedArgs) => {
        console.log(`file changed in browser ${changedArgs}`);
        dashboard.checkPossibleBrowserRename(browserModel, changedArgs);
      }, dashboard);

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
    // When a Notebook starts executing, send it the room (the GUID) in
    // an environment variable
    const self = this;
    this._notebook.widgetAdded.connect((tracker, panel) =>
      self.sendGuid(tracker, panel)
    );
  }

  // Implement the New Galyleo Dashboard command.  The new
  // dashboard will have been created as an untitled file by the
  // doc manager, so just tell the dashboard to load the untitled
  // file without asking the user for a prompt

  newDashboard(path: string): void {
    window.$world.get('dashboard').loadDashboardFromFile(path, false);
  }

  // Implement the Load Dashboard Command.  No file has been specified,
  // so prompt, with the current working directory as the initial prompt

  loadDashboard(cwd: string): void {
    window.$world.get('dashboard').loadDashboardFromFile(cwd, true);
  }

  // Implement the Save Dashboard command.  Just tell the dashboard
  // to save, without prompting for a filename if it already has one.

  saveCurrentDashboard(): void {
    window.$world.get('dashboard').saveDashboardToFile(false);
  }

  // Implement the Save  Dashboard As command.  Just tell the dashboard
  // to save, first  prompting for a filename .

  saveCurrentDashboardAndPrompt(): void {
    window.$world.get('dashboard').saveDashboardToFile(true);
  }

  // Tell the dashboard that the room has changed

  changeRoomPrompt(): void {
    window.$world.get('dashboard').promptRoom();
  }

  /* renameCurrentDashboard(): void {
    window.$world.get('dashboard').renameCurrentDashboard();
  } */

  // Send the dashboard name to a newly executing kernel by setting
  // its environment variable through a magic %env command.  Also, since
  // the kernel's connection status can change (for example, when the kernel
  // is restarted) set uip a callback to set it again in that event.
  // Note the execute code should be broken out in a separate routine, but
  // this is hard to do since we'd need to find and import the type of
  // kernel.

  protected sendGuid(tracker: INotebookTracker, panel: NotebookPanel) {
    console.log('Panel connected');
    const code = `%env DASHBOARD_ROOM=${
      window.$world.get('dashboard').l2lRoomName
    }`;

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
  private _currentDocumentInfo: any;
  private _drive: Drive;
  private _browserModel: FileBrowserModel;
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

    browserModel: FileBrowserModel;
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
