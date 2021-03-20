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
import { GalyleoEditor } from './toc';
import '../style/index.css';
import { BoxPanel, Widget } from '@lumino/widgets';
import { ICommandPalette } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { IMainMenu } from '@jupyterlab/mainmenu';
// import { runIcon } from '@jupyterlab/ui-components';

/**
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
  mainMenu: IMainMenu
): GalyleoEditor {
  const browserModel = browserFactory.defaultBrowser.model;
  const editor = new GalyleoEditor({
    docmanager,
    notebook: notebookTracker,
    labShell,
    app,
    browserModel
  });
  editor.title.iconClass = 'jp-TableOfContents-icon jp-SideBar-tabIcon';
  editor.title.caption = 'Galyleo Editor';
  editor.id = 'Galyleo Editor';
  labShell.add(editor, 'right', { rank: 700 });
  restorer.add(editor, 'jupyterlab-toc');
  BoxPanel.setStretch(editor.parent as Widget, 2);

  // set up the file extension
  app.docRegistry.addFileType({
    name: 'Galyleo',
    // icon: runIcon,
    displayName: 'Galyleo Dashboard File',
    extensions: ['.gd', '.gd.json'],
    fileFormat: 'json',
    contentType: 'file',
    mimeTypes: ['text/json']
  });

  // set up the main menu commands

  const newCommand = 'galyleo-editor:new-dashboard';
  const saveCommand = 'galyleo-editor:save-dashboard';
  const loadCommand = 'galyleo-editor:load-dashboard';
  const saveAsCommand = 'galyleo-editor:save-dashboard-as';
  // const renameCommand = 'galyleo-editor:renameDashboard'; // will add later

  // New dashboard command -- tell the docmanager to open up a
  // galyleo dashboard file, and then tell the editor to edit it,
  // sending the pathname to the editor

  app.commands.addCommand(newCommand, {
    label: 'Open new Galyleo Dashboard',
    caption: 'Open a new Galyleo Dashboard',
    execute: async (args: any) => {
      // Create a new untitled python file
      const cwd = args['cwd'] || browserFactory.defaultBrowser.model.path;
      const model = await app.commands.execute('docmanager:new-untitled', {
        path: cwd,
        contentType: 'file',
        ext: 'gd',
        fileFormat: 'json',
        type: 'Galyleo'
      });

      editor.newDashboard(model.path);
    }
  });

  // Load an existing dashboard command.  Just send the
  // editor the path to the cwd and the editor will open it in the
  // dashboard

  app.commands.addCommand(loadCommand, {
    label: 'Load a Galyleo Dashboard from file',
    caption: 'Load a Galyleo Dashboard from file',
    execute: (args: any) => {
      const cwd = args['cwd'] || browserFactory.defaultBrowser.model.path;
      editor.loadDashboard(cwd);
    }
  });

  // Save the dashboard currently being edited.

  app.commands.addCommand(saveCommand, {
    label: 'Save the current Galyleo Dashboard',
    caption: 'Save the current Galyleo Dashboard',
    execute: (args: any) => {
      editor.saveCurrentDashboard();
    }
  });

  // Save the dashboard currently being edited, asking the user
  // for the file name

  app.commands.addCommand(saveAsCommand, {
    label: 'Save the current Galyleo Dashboard as...',
    caption: 'Save the current Galyleo Dashboard as...',
    execute: (args: any) => {
      editor.saveCurrentDashboardAndPrompt();
    }
  });

  /* app.commands.addCommand(renameCommand, {
    label: 'Rename current Galyleo Dashboard',
    caption: 'Rename current Galyleo Dashboard',
    execute: (args: any) => {
      editor.renameCurrentDashboard();
    }
  }) */

  // Add the commands to the main menu

  const category = 'Galyleo  Dashboard';
  palette.addItem({ command: newCommand, category: category, args: {} });

  mainMenu.fileMenu.addGroup([
    { command: newCommand },
    { command: loadCommand },
    { command: saveCommand },
    { command: saveAsCommand }
  ]);

  return editor;
}

/**
 * Initialization data for the ToC extension.
 *
 * @private
 */
const extension: JupyterFrontEndPlugin<GalyleoEditor> = {
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
    ILauncher
  ],
  activate: activateTOC
};

/**
 * Exports.
 */
export default extension;
