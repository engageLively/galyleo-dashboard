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
exports.GalyleoModelFactory = void 0;
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
const docregistry_1 = require("@jupyterlab/docregistry");
/**
 * An implementation of a model factory for base64 files.
 */
class GalyleoModelFactory extends docregistry_1.TextModelFactory {
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
    get contentType() {
        return 'file';
    }
    /**
     * The format of the file.
     *
     * This is a read-only property.
     */
    get fileFormat() {
        return 'json';
    }
}
exports.GalyleoModelFactory = GalyleoModelFactory;
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
    const browserModel = browserFactory.defaultBrowser.model;
    const editor = new toc_1.GalyleoEditor({
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
    widgets_1.BoxPanel.setStretch(editor.parent, 2);
    const modelFactory = new GalyleoModelFactory();
    app.docRegistry.addModelFactory(modelFactory);
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
    const changeRoomCommand = 'galyleo-editor:change-room';
    // const renameCommand = 'galyleo-editor:renameDashboard'; // will add later
    // New dashboard command -- tell the docmanager to open up a
    // galyleo dashboard file, and then tell the editor to edit it,
    // sending the pathname to the editor
    app.commands.addCommand(newCommand, {
        label: 'Open new Galyleo Dashboard',
        caption: 'Open a new Galyleo Dashboard',
        execute: (args) => __awaiter(this, void 0, void 0, function* () {
            // Create a new untitled python file
            const cwd = args['cwd'] || browserFactory.defaultBrowser.model.path;
            const model = yield app.commands.execute('docmanager:new-untitled', {
                path: cwd,
                contentType: 'file',
                ext: 'gd.json',
                fileFormat: 'json',
                type: 'file'
            });
            editor.newDashboard(model.path);
        })
    });
    // Load an existing dashboard command.  Just send the
    // editor the path to the cwd and the editor will open it in the
    // dashboard
    app.commands.addCommand(loadCommand, {
        label: 'Load a Galyleo Dashboard from file',
        caption: 'Load a Galyleo Dashboard from file',
        execute: (args) => {
            const cwd = args['cwd'] || browserFactory.defaultBrowser.model.path;
            editor.loadDashboard(cwd);
        }
    });
    // Save the dashboard currently being edited.
    app.commands.addCommand(saveCommand, {
        label: 'Save the current Galyleo Dashboard',
        caption: 'Save the current Galyleo Dashboard',
        execute: (args) => {
            editor.saveCurrentDashboard();
        }
    });
    // Save the dashboard currently being edited, asking the user
    // for the file name
    app.commands.addCommand(saveAsCommand, {
        label: 'Save the current Galyleo Dashboard as...',
        caption: 'Save the current Galyleo Dashboard as...',
        execute: (args) => {
            editor.saveCurrentDashboardAndPrompt();
        }
    });
    // Change the Room Name for dashboard and kernels. Note this does not affect the room name
    // for existing kernels until restated
    app.commands.addCommand(changeRoomCommand, {
        label: 'Change the Dashboard Room (Advanced users only...)',
        caption: 'Change the Dashboard Room (Advanced users only...)',
        execute: (args) => {
            editor.changeRoomPrompt();
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
        { command: saveAsCommand },
        { command: changeRoomCommand }
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
