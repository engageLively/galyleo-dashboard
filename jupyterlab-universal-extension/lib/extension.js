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
const FACTORY = 'Editor';
const ICON_CLASS = 'jp-PythonIcon';
const PALETTE_CATEGORY = 'Text Editor';
var CommandIDs;
(function (CommandIDs) {
    CommandIDs.createNew = 'fileeditor:create-new-galyleo-file';
})(CommandIDs || (CommandIDs = {}));
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
function activateTOC(app, docmanager, editorTracker, labShell, restorer, markdownViewerTracker, notebookTracker, rendermime, browserFactory, launcher, menu, palette) {
    const editor = new toc_1.GalyleoEditor({ docmanager, notebook: notebookTracker, labShell, app });
    editor.title.iconClass = 'jp-TableOfContents-icon jp-SideBar-tabIcon';
    editor.title.caption = 'Galyleo Editor';
    editor.id = 'Galyleo Editor';
    labShell.add(editor, 'right', { rank: 700 });
    restorer.add(editor, 'jupyterlab-toc');
    widgets_1.BoxPanel.setStretch(editor.parent, 2);
    const { commands, contextMenu } = app;
    const command = CommandIDs.createNew;
    commands.addCommand(command, {
        label: args => args['isPalette'] || args['isContextMenu']
            ? 'New Galyleo Dashboard'
            : 'Galyleo Dashboard',
        caption: 'Create a new Galyleo Dashboard',
        iconClass: args => (args['isPalette'] ? '' : ICON_CLASS),
        execute: (args) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const cwd = (_b = (_a = args['cwd']) !== null && _a !== void 0 ? _a : browserFactory === null || browserFactory === void 0 ? void 0 : browserFactory.defaultBrowser.model.path) !== null && _b !== void 0 ? _b : undefined;
            const model = yield commands.execute('docmanager:new-untitled', {
                path: cwd,
                type: 'file',
                ext: 'gd'
            });
            return commands.execute('docmanager:open', {
                path: model.path,
                factory: FACTORY
            });
        })
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
        launcher_1.ILauncher,
        mainmenu_1.IMainMenu,
        apputils_1.ICommandPalette
    ],
    activate: activateTOC
};
/**
 * Exports.
 */
exports.default = extension;
