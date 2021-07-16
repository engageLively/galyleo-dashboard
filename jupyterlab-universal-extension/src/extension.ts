// Copyright (c) engageLively
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
import { ICommandPalette, WidgetTracker } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { IMainMenu } from '@jupyterlab/mainmenu';
import {
  TextModelFactory,
  DocumentRegistry,
  ABCWidgetFactory
} from '@jupyterlab/docregistry';
import { Contents } from '@jupyterlab/services';
import { LabIcon } from '@jupyterlab/ui-components'; // WTF???
import galyleoSvgstr from '../style/engageLively.svg';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { JSONValue } from '@phosphor/coreutils';
import { Signal } from '@phosphor/signaling';
import { IModelDB } from '@jupyterlab/observables';
import { UUID } from '@lumino/coreutils';
import { GalyleoCommunicationsManager } from './manager';
import { Menu } from '@lumino/widgets';
import { ITranslator, TranslationBundle } from '@jupyterlab/translation'

export class GalyleoModel extends CodeEditor.Model
  implements DocumentRegistry.ICodeModel {
  contentChanged: any;
  stateChanged: any;

  readOnly = false;
  // we dont need those
  defaultKernelName = '';
  defaultKernelLanguage = '';

  session: string;
  _dirty = false;

  constructor(options?: CodeEditor.Model.IOptions) {
    super(options);
    this.value; // this contains the json as a string as soon as its loaded
    this.session = UUID.uuid4(); // could be we dont even need that one...
    this.contentChanged = new Signal(this);
    this.stateChanged = new Signal(this);
  }

  get dirty() {
    return this._dirty;
  }

  set dirty(newValue) {
    const oldValue = this._dirty;
    this._dirty = newValue;
    if (oldValue != newValue)
      this.stateChanged.emit({ name: 'dirty', oldValue, newValue });
  }

  get defaultValue() {
    return JSON.stringify({ tables: {}, views: {}, charts: {}, filters: {} });
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
    if (jsonString == '') jsonString = this.defaultValue;
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
    return 'galyleo';
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

declare type StudioHandler =
  | 'galyleo:writeFile'
  | 'galyleo:setDirty'
  | 'galyleo:ready';

namespace GalyleoStudioFactory {
  export interface IOptions extends DocumentRegistry.IWidgetFactoryOptions {
    manager: IDocumentManager;
    commsManager: GalyleoCommunicationsManager;
  }
}

export class GalyleoStudioFactory extends ABCWidgetFactory<
  GalyleoDocument,
  GalyleoModel
> {
  /**
   * Construct a new mimetype widget factory.
   */

  private _documentManager: IDocumentManager;
  private _communicationsManager: GalyleoCommunicationsManager;

  constructor(options: GalyleoStudioFactory.IOptions) {
    super(options);
    this._initMessageListeners();
    this._documentManager = options.manager;
    this._communicationsManager = options.commsManager;
  }

  _initMessageListeners() {
    // get a hold of the tracker and dispatch to the different widgets
    const handlers = {
      'galyleo:writeFile': (evt: MessageEvent) => {
        const doc: GalyleoDocument = this._getDocumentForFilePath(
          evt.data.dashboardFilePath
        );
        doc.context.model.value.text = evt.data.jsonString;
        doc.content.completeSave(); // signal that save can be finalized
      },
      'galyleo:setDirty': (evt: MessageEvent) => {
        const doc: GalyleoDocument = this._getDocumentForFilePath(
          evt.data.dashboardFilePath
        );
        doc.context.model.dirty = evt.data.dirty;
      },
      'galyleo:ready': (evt: MessageEvent) => {
        const doc: GalyleoDocument = this._getDocumentForFilePath(
          evt.data.dashboardFilePath
        );
        doc.content.loadDashboard(doc.context.model.value.text); // load the dashboard
      }
    };
    window.addEventListener('message', evt => {
      if (evt.data.method in handlers) {
        handlers[evt.data.method as StudioHandler](evt);
      }
    });
  }

  _getDocumentForFilePath(path: string): GalyleoDocument {
    // since we are coming from an incoming message due to an iframe embedded inside
    // a widget, that widget still has to be there
    return <GalyleoDocument>(<unknown>this._documentManager.findWidget(path));
  }
  /**
   * Create a new widget given a context.
   */
  createNewWidget(context: DocumentRegistry.IContext<GalyleoModel>) {
    const content = new GalyleoEditor({
      context
    });
    // this._documentManager.autosave = false;
    this._communicationsManager.addEditor(content);
    content.title.icon = <any>galyleoIcon;
    const origSave = context.save;
    // wrap the save function, no better way to do this....
    context.save = async () => {
      await content.requestSave(context.path);
      await origSave.bind(context)();
    };
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
  manager: IDocumentManager,
  trans: ITranslator
): void {
  const modelFactory = new GalyleoModelFactory();
  app.docRegistry.addModelFactory(<any>modelFactory);
  const sessionManager = app.serviceManager.sessions;

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
    manager,
    commsManager: new GalyleoCommunicationsManager(sessionManager)
  });

  //const widgetTracker = new WidgetTracker({ namespace: 'galyleo' });

  widgetFactory.widgetCreated.connect((sender, widget) => {
    ((<unknown>editorTracker) as WidgetTracker).add(<any>widget); // shut up the compiler
  });

  app.docRegistry.addWidgetFactory(<any>widgetFactory);

  // set up the main menu commands

  const newCommand = 'galyleo-editor:new-dashboard';
  // const renameCommand = 'galyleo-editor:renameDashboard'; // will add later

  // New dashboard command -- tell the docmanager to open up a
  // galyleo dashboard file, and then tell the editor to edit it,
  // sending the pathname to the editor

  app.commands.addCommand(newCommand, {
    label: trans.__('Galyleo Dashboard'),
    caption: 'Open a new Galyleo Dashboard',
    icon: galyleoIcon,
    execute: async (args: any) => {
      // Create a new untitled python file
      const cwd = args['cwd'] || browserFactory.defaultBrowser.model.path;
      const res = await app.commands.execute('docmanager:new-untitled', {
        path: cwd,
        contentType: 'file',
        ext: 'gd.json',
        fileFormat: 'json',
        type: 'file'
      });
      // open that dashboard
      app.commands.execute('docmanager:open', {
        path: res.path,
        factory: widgetFactory.name
      });
    }
  });

  const loadSampleCommand = 'galyeo-editor:sample-dashboard';

  

  // Sample dashboard command -- tell the docmanager to open up a
  // galyleo dashboard file,  then tell the editor to edit it,
  // sending the pathname to the editor, and then load the contents of
  // the file from the given url

  app.commands.addCommand(loadSampleCommand, {
    label: (args: any) => trans.__(`Open Galyleo Sample ${args.text}`),
    caption: 'Open Galyleo Sample',
    icon: galyleoIcon,
    execute: async (args: any) => {
      // Create a new untitled python file
      const cwd = args['cwd'] || browserFactory.defaultBrowser.model.path;
      const res = await app.commands.execute('docmanager:new-untitled', {
        path: cwd,
        contentType: 'file',
        ext: 'gd.json',
        fileFormat: 'json',
        type: 'file'
      });
      // open that dashboard
      const widget = await app.commands.execute('docmanager:open', {
        path: res.path,
        factory: widgetFactory.name
      });
      const response = await fetch(args.url);
      if (response.ok) {
        const result = await response.text();
        widget.context.model.value.text = result;
      }
      
    }
  });


  launcher.add({
    command: newCommand
  });

  const helpCommand = {
    command: 'help:open',
    args: {
      label: trans.__('Galyleo Reference'),
      text: 'Galyleo Reference',
      url: 'https://galyleo-user-docs.readthedocs.io/'
    }
  }

  mainMenu.fileMenu.newMenu.addGroup([{ command: newCommand }], 30);
  mainMenu.helpMenu.addGroup([
    helpCommand
  ]);

  // Add the Galyleo Menu to the main menu
  const menu = new Menu({ commands: app.commands });
  menu.title.label = 'Galyleo';
  menu.addItem({
    command: newCommand,
    args: {}
  });
  menu.addItem({
    command: loadSampleCommand,
    args: {
      label: trans.__('Presidential Election Dashboard'),
      text: 'Presidential Election Dashboard',
      url: 'https://raw.githubusercontent.com/engageLively/galyleo-examples/main/demos/presidential-elections/elections.gd.json'
    }
  });
  menu.addItem({
  args: {
    label: trans.__('Senate Election Dashboard'),
    text: 'Senate Election Dashboard',
    url: 'https://raw.githubusercontent.com/engageLively/galyleo-examples/main/demos/senate-elections/senate-elections.gd.json'
  }
  });
  menu.addItem({
    command: loadSampleCommand,
    args: {
      label: trans.__('UFO Sightings Dashboard'),
      Presidential Election Dashboard
      text:'UFO Sightings Dashboard',
      url:'https://raw.githubusercontent.com/engageLively/galyleo-examples/main/demos/ufos/ufos.gd.json'
    }
  });
  menu.addItem({
    command: loadSampleCommand,
    args: {
      label: trans.__('Florence Nightingale Dashboard'),
      text:'Florence Nightingale Dashboard',
      url:'https://raw.githubusercontent.com/engageLively/galyleo-examples/main/demos/nightingale/nightingale.gd.json'
    }
  });
  menu.addItem(helpCommand);
  mainMenu.addMenu(menu, { rank: 40 });

  // Add the commands to the main menu

  const category = 'Galyleo  Dashboard';
  palette.addItem({ command: newCommand, category: category, args: {} });

  const examples:any = {
    'UFO Sightings': 'https://raw.githubusercontent.com/engageLively/galyleo-examples/main/demos/ufos/ufos.gd.json',
    'Presidential Election': 'https://raw.githubusercontent.com/engageLively/galyleo-examples/main/demos/presidential-elections/elections.gd.json'
  }

  type CommandHandler = 
  | 'galyleo:newDashboard'
  | 'galyleo:openExample'
  | 'galyleo:openReference';

  const messageHandlers = {
    'galyleo:newDashboard': (evt: MessageEvent) => {
      app.commands.execute( newCommand)
    },
    'galyleo:openExample': (evt: MessageEvent) => {
      const name:string = evt.data.name;
      const url = examples[name.trim()]
      if (url) {
        app.commands.execute("galyeo-editor:sample-dashboard", {url: url})
      }
    },
    'galyleo:openReference': (evt: MessageEvent) => {
      app.commands.execute("help:open", {url: 'https://galyleo-user-docs.readthedocs.io/', 'text': 'Galyleo Reference'})
    }
  }
  window.addEventListener('message', evt => {
    if (evt.data.method in messageHandlers) {
       messageHandlers[evt.data.method as CommandHandler](evt);
    }
  });
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
    ITranslator,
    IDocumentManager
  ],
  activate: activateTOC
};

/**
 * Exports.
 */
export default extension;
