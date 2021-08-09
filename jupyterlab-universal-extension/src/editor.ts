// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget } from '@phosphor/widgets';
import { DocumentRegistry, DocumentWidget } from '@jupyterlab/docregistry';
import { GalyleoModel } from './extension';
import { PLUGIN_ID } from './extension';
// import { baseURL } from './constants';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

export class GalyleoDocument extends DocumentWidget<
  GalyleoEditor,
  GalyleoModel
> {}

// overwritten post-compile and pre-deploy
const debugMode = false;

export class GalyleoEditor extends Widget {
  private _iframe: HTMLIFrameElement;
  private _context: DocumentRegistry.IContext<GalyleoModel>;
  private _completeSave: Function;
  private _settings: ISettingRegistry;

  constructor(options: GalyleoEditor.IOptions) {
    super();
    this._context = options.context;
    this._settings = options.settings;
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

  onAfterShow() {
    // fix the labs in the scene that have been update while hidden
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

  loadTable(table: any) {
    // table is a dictionary, how do we say that?
    this._iframe.contentWindow?.postMessage(
      { method: 'galyleo:loadTable', table },
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

  async _baseUrl(): Promise<string> {
    const normal =
      'https://galyleobeta.engageLively.com/users/rick/published/dsd/index.html?';
    const jp =
      'https://galyleobeta.engageLively.com/users/rick/published/dsd-jp/index.html?';
    const debugURL =
      'https://matt.engageLively.com/worlds/load?name=Dashboard%20Studio%20Development&';
    let galyleoSettings: ISettingRegistry.ISettings = <
      ISettingRegistry.ISettings
    >(<unknown>undefined);
    let languagePreference: ISettingRegistry.ISettings = <
      ISettingRegistry.ISettings
    >(<unknown>undefined);
    if (this._settings) {
      galyleoSettings = await this._settings.load(PLUGIN_ID);
      languagePreference = await this._settings.load(
        '@jupyterlab/translation-extension:plugin'
      );
    }

    if (galyleoSettings && debugMode) {
      if (galyleoSettings.get('debug').composite as boolean) {
        return debugURL;
      }
    }
    if (languagePreference) {
      const preference = languagePreference.get('locale').composite as string;
      if (preference == 'ja_JP') {
        return jp;
      }
    }
    return normal;
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
    const baseURL = await this._baseUrl();
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
    settings: ISettingRegistry;

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
