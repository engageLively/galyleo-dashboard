"use strict";
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
Object.defineProperty(exports, "__esModule", { value: true });
const application_1 = require("@jupyterlab/application");
const docmanager_1 = require("@jupyterlab/docmanager");
const fileeditor_1 = require("@jupyterlab/fileeditor");
const markdownviewer_1 = require("@jupyterlab/markdownviewer");
const notebook_1 = require("@jupyterlab/notebook");
const rendermime_1 = require("@jupyterlab/rendermime");
const toc_1 = require("./toc");
require("../style/index.css");
const widgets_1 = require("@lumino/widgets");
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
function activateTOC(app, docmanager, editorTracker, labShell, restorer, markdownViewerTracker, notebookTracker, rendermime) {
    const editor = new toc_1.GalyleoEditor({ docmanager, notebook: notebookTracker, labShell, app });
    editor.title.iconClass = 'jp-TableOfContents-icon jp-SideBar-tabIcon';
    editor.title.caption = 'Galyleo Editor';
    editor.id = 'table-of-contents';
    labShell.add(editor, 'right', { rank: 700 });
    restorer.add(editor, 'juputerlab-toc');
    widgets_1.BoxPanel.setStretch(editor.parent, 2);
    return editor;
}
/**
 * Initialization data for the ToC extension.
 *
 * @private
 */
const extension = {
    id: 'jupyterlab-toc',
    autoStart: true,
    requires: [
        docmanager_1.IDocumentManager,
        fileeditor_1.IEditorTracker,
        application_1.ILabShell,
        application_1.ILayoutRestorer,
        markdownviewer_1.IMarkdownViewerTracker,
        notebook_1.INotebookTracker,
        rendermime_1.IRenderMimeRegistry
    ],
    activate: activateTOC
};
/**
 * Exports.
 */
exports.default = extension;
