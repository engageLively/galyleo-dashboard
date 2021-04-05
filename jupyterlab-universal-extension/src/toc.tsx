// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget } from '@lumino/widgets';
import { DocumentWidget } from '@jupyterlab/docregistry';
import { GalyleoModel } from './extension';

export class GalyleoEditor extends DocumentWidget<any, GalyleoModel> {

  private _iframe: HTMLIFrameElement;

  constructor(options: GalyleoEditor.IOptions) {
    super(options);
    this._iframe = document.createElement('iframe');
    
    this._iframe.style.cssText = 'width: 100%; height: 100%; border: 0px;';
    this.node.appendChild(this._iframe);
  }

  renderModel(model: GalyleoModel) {
    // now set the src accordingly on the iframe....?
    const filePath = this.context.path
    const sessionId = this.context.model.id;
    const baseURL = 'https://matt.engagelively.com/users/rick/published/Dashboard%20Studio%20Development/index.html';
    this._iframe.src = `${baseURL}?galyleo_file=${filePath}&session=${sessionId}`;
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
    content: any;
    context: any;

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
