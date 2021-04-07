// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { IMarkdownViewerTracker } from '@jupyterlab/markdownviewer';
import { INotebookTracker } from '@jupyterlab/notebook';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { GalyleoDocument, GalyleoEditor } from './editor';
import '../style/index.css';
import { ICommandPalette } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { TextModelFactory, DocumentRegistry, ABCWidgetFactory } from '@jupyterlab/docregistry';
import { Contents } from '@jupyterlab/services';
import { LabIcon } from '@jupyterlab/ui-components'; // WTF???
import galyleoSvgstr from '../style/engageLively.svg';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { JSONValue } from '@phosphor/coreutils';
import { Signal } from '@phosphor/signaling';
import { IModelDB } from '@jupyterlab/observables';
import { UUID } from '@lumino/coreutils';

export class GalyleoModel extends CodeEditor.Model implements DocumentRegistry.ICodeModel {

  contentChanged: any;
  stateChanged: any;

  readOnly = false;
  // we dont need those
  defaultKernelName = '';
  defaultKernelLanguage = '';

  session: string;
  _dirty = false;
  
  constructor(options?: CodeEditor.Model.IOptions) {
    super(options)
    this.value // this contains the json as a string as soon as its loaded
    this.session = UUID.uuid4(); // could be we dont even need that one...
    this.contentChanged = new Signal(this);
    this.stateChanged = new Signal(this);
  }

  get dirty() {
    return this._dirty;
  }

  set dirty (newValue) {
    const oldValue = this._dirty;
    this._dirty = newValue;
    this.stateChanged.emit({ name: 'dirty', oldValue, newValue });
  }

  get defaultValue() {
     return JSON.stringify({"tables":{},"views":{},"charts":{},"filters":{}});
  }

  toString(): string {
    return JSON.stringify(this.toJSON());
  }
  fromString(value: string): void {
    if (value == '') value = this.defaultValue;
    this.value.text = value;
  }
  toJSON(): JSONValue {
    // get json snapshot from
    let jsonString = this.value.text; 
    if (jsonString == "")
      jsonString = this.defaultValue;
    return JSON.parse(jsonString);
  }
  fromJSON(dashboard: any): void {
    this.fromString(JSON.stringify(dashboard));
  }
  initialize(): void {
    // send data to iframe
  }

}

/**
 * An implementation of a model factory for base64 files.
 */
export class GalyleoModelFactory extends TextModelFactory {
  /**
   * The name of the model type.
   *
   * #### Notes
   * This is a read-only property.
   */
  get name() {
    return 'galyleo'
  }

  

  /**
   * The type of the file.
   *
   * #### Notes
   * This is a read-only property.
   */
  get contentType(): Contents.ContentType {
    return 'file';
  }

  /**
   * The format of the file.
   *
   * This is a read-only property.
   */
  get fileFormat(): Contents.FileFormat {
    return 'text';
  }

  

  createNew(languagePreference?: string | undefined, modelDb?: IModelDB) {
    return new GalyleoModel();
  }
 
}

declare type StudioHandler = 'galyleo:writeFile' | 'galyleo:setDirty' | 'galyleo:ready';

namespace GalyleoStudioFactory{
  export interface IOptions extends DocumentRegistry.IWidgetFactoryOptions {
    manager: IDocumentManager;
  }
} 

export class GalyleoStudioFactory extends ABCWidgetFactory<GalyleoDocument, GalyleoModel> {
  /**
   * Construct a new mimetype widget factory.
   */
  
  private _documentManager: IDocumentManager;

  constructor(options: GalyleoStudioFactory.IOptions) {
      super(options);
      this._initMessageListeners();
      this._documentManager = options.manager;
  }

  _initMessageListeners() {
    // get a hold of the tracker and dispatch to the different widgets
    const handlers = {
      'galyleo:writeFile': (evt: MessageEvent) => {
        const doc: GalyleoDocument = this._getDocumentForFilePath(evt.data.dashboardFilePath);
        doc.context.model.value.text =  evt.data.jsonString;
        doc.content.completeSave(); // signal that save can be finalized
      },
      'galyleo:setDirty': (evt: MessageEvent) => {
        const doc: GalyleoDocument = this._getDocumentForFilePath(evt.data.dashboardFilePath);
        doc.context.model.dirty = evt.data.dirty;
      },
      'galyleo:ready': (evt: MessageEvent) => {
        const doc: GalyleoDocument = this._getDocumentForFilePath(evt.data.dashboardFilePath);
        doc.content.loadDashboard(doc.context.model.value.text); // load the dashboard
      }
    }
    window.addEventListener('message', evt => {
      handlers[evt.data.method as StudioHandler](evt);
    })
  }

  _getDocumentForFilePath(path: string): GalyleoDocument {
    // since we are coming from an incoming message due to an iframe embedded inside
    // a widget, that widget still has to be there
    return <GalyleoDocument><unknown>this._documentManager.findWidget(path);
  }
  /**
   * Create a new widget given a context.
   */
  createNewWidget(context: DocumentRegistry.IContext<GalyleoModel>) {
      
      const content = new GalyleoEditor({ context });
      content.title.icon = <any>galyleoIcon;
      const origSave = context.save;
      // wrap the save function, no better way to do this....
      context.save = async () => {
        await content.requestSave();
        await origSave.bind(context)();
      }
      const widget = new GalyleoDocument({ content, context });
     
      return widget;
  }
}

export const galyleoIcon = new LabIcon({
  name: 'Galyleopkg:galyleo',
  svgstr: galyleoSvgstr
});
/**
 *
 * Activates the ToC extension.
 *
 * @private
 * @param app - Jupyter application
 * @param docmanager - document manager
 * @param editorTracker - editor tracker
 * @param labShell - Jupyter lab shell
 * @param restorer - application layout restorer
 * @param markdownViewerTracker - Markdown viewer tracker
 * @param notebookTracker - notebook tracker
 * @param rendermime - rendered MIME registry
 * @returns table of contents registry
 */

function activateTOC(
  app: JupyterFrontEnd,
  docmanager: IDocumentManager,
  editorTracker: IEditorTracker,
  labShell: ILabShell,
  restorer: ILayoutRestorer,
  markdownViewerTracker: IMarkdownViewerTracker,
  notebookTracker: INotebookTracker,
  rendermime: IRenderMimeRegistry,
  browserFactory: IFileBrowserFactory,
  palette: ICommandPalette,
  mainMenu: IMainMenu,
  launcher: ILauncher,
  manager: IDocumentManager
): void {
  const modelFactory = new GalyleoModelFactory();
  app.docRegistry.addModelFactory(<any>modelFactory);
  
  //app.docRegistry.addWidgetFactory()
  // set up the file extension

  app.docRegistry.addFileType({
    name: 'Galyleo',
    icon: <any>galyleoIcon, // shut up the tsc compiler for god's sake
    displayName: 'Galyleo Dashboard File',
    extensions: ['.gd', '.gd.json'],
    fileFormat: 'text',
    contentType: 'file',
    mimeTypes: ['application/json']
  });

  // we need a different factory that returns widgets which
  // allow us to intercept undo/redo/save commands
   
  // this factory only works for files that are purely text based
  const widgetFactory = new GalyleoStudioFactory({
    name: 'Galyleo',
    fileTypes: ['Galyleo'],
    defaultRendered: ['Galyleo'],
    defaultFor: ['Galyleo'],
    modelName: 'galyleo',
    manager
  });

  app.docRegistry.addWidgetFactory(<any>widgetFactory);

  // set up the main menu commands

  const newCommand = 'galyleo-editor:new-dashboard';
  // const renameCommand = 'galyleo-editor:renameDashboard'; // will add later

  // New dashboard command -- tell the docmanager to open up a
  // galyleo dashboard file, and then tell the editor to edit it,
  // sending the pathname to the editor

  app.commands.addCommand(newCommand, {
    label: 'Galyleo Dashboard',
    caption: 'Open a new Galyleo Dashboard',
    icon: galyleoIcon,
    execute: async (args: any) => {
      // Create a new untitled python file
      const cwd = args['cwd'] || browserFactory.defaultBrowser.model.path;
      await app.commands.execute('docmanager:new-untitled', {
        path: cwd,
        contentType: 'file',
        ext: 'gd.json',
        fileFormat: 'json',
        type: 'file'
      });
      // open that dashboard
    }
  });

  launcher.add({
    command: newCommand,
  });

  mainMenu.fileMenu.newMenu.addGroup(
    [{ command: newCommand }],
    30
  );

  // Add the commands to the main menu

  const category = 'Galyleo  Dashboard';
  palette.addItem({ command: newCommand, category: category, args: {} });

  // mainMenu.fileMenu.addGroup([
  //   { command: newCommand }, // handled by all the other default menu entries
  //   { command: loadCommand }, // handled by double clicking, right click open with command
  //   { command: saveCommand }, // handled by the already existing file save command
  //   { command: saveAsCommand }, // we can rename stuff alredy in the extension, this is not needed
  //   { command: changeRoomCommand } // this should be done from within the extension if at all needed
  // ]);
}

/**
 * Initialization data for the ToC extension.
 *
 * @private
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-toc',
  autoStart: true,
  requires: [
    IDocumentManager,
    IEditorTracker,
    ILabShell,
    ILayoutRestorer,
    IMarkdownViewerTracker,
    INotebookTracker,
    IRenderMimeRegistry,
    IFileBrowserFactory,
    ICommandPalette,
    IMainMenu,
    ILauncher,
    IDocumentManager
  ],
  activate: activateTOC
};

/**
 * Exports.
 */
export default extension;
