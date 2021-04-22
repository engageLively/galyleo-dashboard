// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget } from '@phosphor/widgets';
import { DocumentRegistry, DocumentWidget } from '@jupyterlab/docregistry';
import { GalyleoModel } from './extension';
import { baseURL } from './constants';
import { SessionManager } from '@jupyterlab/services';
import { IIterator } from '@phosphor/algorithm';
import { IModel } from '@jupyterlab/services/lib/kernel/restapi';
import { ISessionConnection } from '@jupyterlab/services/lib/session/session';
import { Kernel, KernelMessage } from '@jupyterlab/services';

export class GalyleoDocument extends DocumentWidget<
  GalyleoEditor,
  GalyleoModel
> {}

export class GalyleoEditor extends Widget {
  private _iframe: HTMLIFrameElement;
  private _context: DocumentRegistry.IContext<GalyleoModel>;
  private _completeSave: Function;
  private _future: Kernel.IFuture<
    KernelMessage.IExecuteRequestMsg,
    KernelMessage.IExecuteReplyMsg
  > | null = null;

  constructor(options: GalyleoEditor.IOptions) {
    super();
    this._context = options.context;
    this._iframe = document.createElement('iframe');
    this._iframe.style.cssText = 'width: 100%; height: 100%; border: 0px;';

    this.node.appendChild(this._iframe);
    this.node.onmouseleave = () => (this._iframe.style.pointerEvents = 'none');
    this.node.onmousemove = (evt: MouseEvent) => {
      if (document.getElementsByClassName('lm-Menu-content').length == 0)
        this._iframe.style.pointerEvents = 'auto';
    };
    void this._context.ready.then(async () => {
      await this._render();
    });
    this._context.pathChanged.connect(
      (context, path) => this.renamePath(path),
      this
    );
  }

  set future(
    value: Kernel.IFuture<
      KernelMessage.IExecuteRequestMsg,
      KernelMessage.IExecuteReplyMsg
    > | null
  ) {
    this._future = value;
    if (!value) {
      return;
    }
    value.onIOPub = this._onIOPub;
  }

  private _onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
    const msgType = msg.header.msg_type;
    switch (msgType) {
      case 'execute_result':
      case 'display_data':
      case 'update_display_data':
        console.log(msg.content);
        break;
      default:
        break;
    }
    return;
  };

  onAfterShow() {
    // fix the labes in the scene that have bee update while hidden
    this._iframe.contentWindow?.postMessage(
      { method: 'galyleo:fixLabels' },
      '*'
    );
  }

  get editor() {
    return this;
  }

  completeSave() {
    this._completeSave(true);
  }

  async requestSave(path: string) {
    this._iframe.contentWindow?.postMessage(
      { method: 'galyleo:save', path },
      '*'
    );
    await new Promise(resolve => (this._completeSave = resolve));
  }

  loadDashboard(jsonString: string) {
    this._iframe.contentWindow?.postMessage(
      { method: 'galyleo:load', jsonString },
      '*'
    );
  }

  renamePath(path: string) {
    this._iframe.contentWindow?.postMessage(
      { method: 'galyleo:rename', path },
      '*'
    );
  }

  // we are the receivers of the undo/redo commands

  undo() {
    this._iframe.contentWindow?.postMessage({ method: 'galyleo:undo' }, '*');
  }

  redo() {
    this._iframe.contentWindow?.postMessage({ method: 'galyleo:redo' }, '*');
  }

  async _render() {
    // now set the src accordingly on the iframe....?
    const filePath = this._context.path;
    const sessionId = this._context.model.session;
    // dig out the user from the URL; it will be the component of the path with an @ in it
    const parentUrl = window.location.href;
    const components = parentUrl.split('/');
    const userComponents = components.filter(comp => comp.indexOf('@') >= 0);
    const user = userComponents.length > 0 ? userComponents[0] : '';
    // assemble the url and load it into the iframe
    // const baseURL =
    //   'https://matt.engagelively.com/users/rick/published/Dashboard%20Studio%20Development/index.html?';
    // for debug:
    // const baseURL =
    //   'https://matt.engagelively.com/worlds/load?name=Dashboard%20Studio%20Development&';
    // both of these are defined in constants.ts, NOT versioned to avoid bogus changes and stashes.
    this._iframe.src = `${baseURL}dashboard_file=${filePath}&session=${sessionId}&inJupyterLab=true&user=${user}`;
    // wait for session to load
  }
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
    // docmanager: IDocumentManager;
    context: DocumentRegistry.IContext<GalyleoModel>;
    sessionManager: SessionManager;

    /**
     * Notebook ref.
     */
    // notebook: INotebookTracker;

    // labShell: ILabShell;

    // app: JupyterFrontEnd;

    // browserModel: FileBrowserModel;
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
