// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
const apputils_1 = require("@jupyterlab/apputils");
const launcher_1 = require("@jupyterlab/launcher");
const filebrowser_1 = require("@jupyterlab/filebrowser");
const mainmenu_1 = require("@jupyterlab/mainmenu");
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
function activateTOC(app, docmanager, editorTracker, labShell, restorer, markdownViewerTracker, notebookTracker, rendermime, browserFactory, palette, mainMenu) {
    const editor = new toc_1.GalyleoEditor({
        docmanager,
        notebook: notebookTracker,
        labShell,
        app
    });
    editor.title.iconClass = 'jp-TableOfContents-icon jp-SideBar-tabIcon';
    editor.title.caption = 'Galyleo Editor';
    editor.id = 'Galyleo Editor';
    labShell.add(editor, 'right', { rank: 700 });
    restorer.add(editor, 'jupyterlab-toc');
    widgets_1.BoxPanel.setStretch(editor.parent, 2);
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
    const newCommand = 'galyleo-editor:new-dashboard';
    const saveCommand = 'galyleo-editor:save-dashboard';
    const loadCommand = 'galyleo-editor:load-dashboard';
    const saveAsCommand = 'galyleo-editor:save-dashboard-as';
    // const renameCommand = 'galyleo-editor:renameDashboard';
    app.commands.addCommand(newCommand, {
        label: 'Open new Galyleo Dashboard',
        caption: 'Open a new Galyleo Dashboard',
        execute: (args) => __awaiter(this, void 0, void 0, function* () {
            // Create a new untitled python file
            const cwd = args['cwd'] || browserFactory.defaultBrowser.model.path;
            const model = yield app.commands.execute('docmanager:new-untitled', {
                path: cwd,
                contentType: 'file',
                ext: 'gd',
                fileFormat: 'json',
                type: 'Galyleo'
            });
            editor.newDashboard(model.path);
        })
    });
    app.commands.addCommand(loadCommand, {
        label: 'Load a Galyleo Dashboard from file',
        caption: 'Load a Galyleo Dashboard from file',
        execute: (args) => {
            const cwd = args['cwd'] || browserFactory.defaultBrowser.model.path;
            editor.loadDashboard(cwd);
        }
    });
    app.commands.addCommand(saveCommand, {
        label: 'Save the current Galyleo Dashboard',
        caption: 'Save the current Galyleo Dashboard',
        execute: (args) => {
            editor.saveCurrentDashboard();
        }
    });
    app.commands.addCommand(saveAsCommand, {
        label: 'Save the current Galyleo Dashboard as...',
        caption: 'Save the current Galyleo Dashboard as...',
        execute: (args) => {
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
        rendermime_1.IRenderMimeRegistry,
        filebrowser_1.IFileBrowserFactory,
        apputils_1.ICommandPalette,
        mainmenu_1.IMainMenu,
        launcher_1.ILauncher
    ],
    activate: activateTOC
};
/**
 * Exports.
 */
exports.default = extension;
