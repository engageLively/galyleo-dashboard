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
  rendermime: IRenderMimeRegistry
): GalyleoEditor {
  const editor = new GalyleoEditor({ docmanager, notebook: notebookTracker, labShell, app });
  editor.title.iconClass = 'jp-TableOfContents-icon jp-SideBar-tabIcon';
  editor.title.caption = 'Galyleo Editor';
  editor.id = 'table-of-contents';
  labShell.add(editor, 'right', { rank: 700 });  
  restorer.add(editor, 'juputerlab-toc');
  BoxPanel.setStretch(editor.parent as Widget, 2);
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
    IRenderMimeRegistry
  ],
  activate: activateTOC
};

/**
 * Exports.
 */
export default extension;
