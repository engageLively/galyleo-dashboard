// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget } from '@phosphor/widgets';
import { DocumentRegistry, DocumentWidget } from '@jupyterlab/docregistry';
import { GalyleoModel } from './extension';

export class GalyleoDocument extends DocumentWidget<GalyleoEditor, GalyleoModel> {

}

export class GalyleoEditor extends Widget {

  private _iframe: HTMLIFrameElement;
  private _context: DocumentRegistry.IContext<GalyleoModel>;
  private _completeSave: Function;

  constructor(options: GalyleoEditor.IOptions) {
    super();
    this._context = options.context;
    this._iframe = document.createElement('iframe');
    this._iframe.style.cssText = 'width: 100%; height: 100%; border: 0px;';
    this.node.appendChild(this._iframe);
    this.node.onmouseleave = () => this._iframe.style.pointerEvents = 'none';
    this.node.onmousemove = (evt: MouseEvent) => {
      if (document.getElementsByClassName('lm-Menu-content').length == 0) this._iframe.style.pointerEvents = 'auto';
    }
    void this._context.ready.then(async () => {
      await this._render();
  });
  }

  completeSave() {
    this._completeSave(true);
  }

  async requestSave() {
    this._iframe.contentWindow?.postMessage({ method: 'galyleo:save' }, "*");
    await new Promise((resolve) => this._completeSave = resolve);
  }

  loadDashboard(jsonString: string) {
    this._iframe.contentWindow?.postMessage({ method: 'galyleo:load', jsonString }, "*");
  }

  // we are the receivers of the undo/redo commands

  undo() {
    this._iframe.contentWindow?.postMessage('undo', '*');
  }

  redo() {
    this._iframe.contentWindow?.postMessage('redo', '*');
  }

  async _render() {
    // now set the src accordingly on the iframe....?
    const filePath = this._context.path
    const sessionId = this._context.model.session;
    const baseURL = 'https://matt.engagelively.com/users/rick/published/Dashboard%20Studio%20Development/index.html';
    this._iframe.src = `${baseURL}?dashboard_file=${filePath}&session=${sessionId}&inJupyterLab=true`;
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
