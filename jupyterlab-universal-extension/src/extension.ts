// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
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

const FACTORY = 'Editor';
const ICON_CLASS = 'jp-PythonIcon';
const PALETTE_CATEGORY = 'Text Editor';

namespace CommandIDs {
  export const createNew = 'fileeditor:create-new-galyleo-file';
}

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
  browserFactory: IFileBrowserFactory | null,
  launcher: ILauncher | null,
  menu: IMainMenu | null,
  palette: ICommandPalette
): GalyleoEditor {
  const editor = new GalyleoEditor({ docmanager, notebook: notebookTracker, labShell, app });
  editor.title.iconClass = 'jp-TableOfContents-icon jp-SideBar-tabIcon';
  editor.title.caption = 'Galyleo Editor';
  editor.id = 'Galyleo Editor';
  labShell.add(editor, 'right', { rank: 700 });  
  restorer.add(editor, 'jupyterlab-toc');
  BoxPanel.setStretch(editor.parent as Widget, 2);
  const { commands, contextMenu } = app;
  const command = CommandIDs.createNew;
  commands.addCommand(command, {
    label: args =>
      args['isPalette'] || args['isContextMenu']
        ? 'New Galyleo Dashboard'
        : 'Galyleo Dashboard',
    caption: 'Create a new Galyleo Dashboard',
    iconClass: args => (args['isPalette'] ? '' : ICON_CLASS),
    execute: async args => {
      const cwd =
        args['cwd'] ?? browserFactory?.defaultBrowser.model.path ?? undefined;
      const model = await commands.execute('docmanager:new-untitled', {
        path: cwd,
        type: 'file',
        ext: 'gd'
      });
      return commands.execute('docmanager:open', {
        path: model.path,
        factory: FACTORY
      });
    }
  });
  const selectorContent = '.jp-DirListing-content';
  contextMenu.addItem({
    command,
    args: { isContextMenu: true },
    selector: selectorContent,
    rank: 3
  });

  // add to the launcher
  if (launcher) {
    launcher.add({
      command,
      category: 'Other',
      rank: 1
    });
  }

  // add to the palette
  if (palette) {
    palette.addItem({
      command,
      args: { isPalette: true },
      category: PALETTE_CATEGORY
    });
  }

  // add to the menu
  if (menu) {
    menu.fileMenu.newMenu.addGroup([{ command }], 30);
  }

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
    ILauncher,
    IMainMenu,
    ICommandPalette
  ],
  activate: activateTOC
};

/**
 * Exports.
 */
export default extension;
