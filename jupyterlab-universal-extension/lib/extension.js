// Copyright (c) engageLively
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
exports.galyleoIcon = exports.GalyleoStudioFactory = exports.GalyleoModelFactory = exports.GalyleoModel = void 0;
const application_1 = require("@jupyterlab/application");
const docmanager_1 = require("@jupyterlab/docmanager");
const fileeditor_1 = require("@jupyterlab/fileeditor");
const markdownviewer_1 = require("@jupyterlab/markdownviewer");
const notebook_1 = require("@jupyterlab/notebook");
const rendermime_1 = require("@jupyterlab/rendermime");
const editor_1 = require("./editor");
require("../style/index.css");
const apputils_1 = require("@jupyterlab/apputils");
const launcher_1 = require("@jupyterlab/launcher");
const filebrowser_1 = require("@jupyterlab/filebrowser");
const mainmenu_1 = require("@jupyterlab/mainmenu");
const docregistry_1 = require("@jupyterlab/docregistry");
const ui_components_1 = require("@jupyterlab/ui-components"); // WTF???
const engageLively_svg_1 = require("../style/engageLively.svg");
const codeeditor_1 = require("@jupyterlab/codeeditor");
const signaling_1 = require("@phosphor/signaling");
const coreutils_1 = require("@lumino/coreutils");
const manager_1 = require("./manager");
class GalyleoModel extends codeeditor_1.CodeEditor.Model {
    constructor(options) {
        super(options);
        this.readOnly = false;
        // we dont need those
        this.defaultKernelName = '';
        this.defaultKernelLanguage = '';
        this._dirty = false;
        this.value; // this contains the json as a string as soon as its loaded
        this.session = coreutils_1.UUID.uuid4(); // could be we dont even need that one...
        this.contentChanged = new signaling_1.Signal(this);
        this.stateChanged = new signaling_1.Signal(this);
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
    toString() {
        return JSON.stringify(this.toJSON());
    }
    fromString(value) {
        if (value == '')
            value = this.defaultValue;
        this.value.text = value;
    }
    toJSON() {
        // get json snapshot from
        let jsonString = this.value.text;
        if (jsonString == '')
            jsonString = this.defaultValue;
        return JSON.parse(jsonString);
    }
    fromJSON(dashboard) {
        this.fromString(JSON.stringify(dashboard));
    }
    initialize() {
        // send data to iframe
    }
}
exports.GalyleoModel = GalyleoModel;
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
        return 'text';
    }
    createNew(languagePreference, modelDb) {
        return new GalyleoModel();
    }
}
exports.GalyleoModelFactory = GalyleoModelFactory;
class GalyleoStudioFactory extends docregistry_1.ABCWidgetFactory {
    constructor(options) {
        super(options);
        this._initMessageListeners();
        this._documentManager = options.manager;
        this._communicationsManager = options.commsManager;
    }
    _initMessageListeners() {
        // get a hold of the tracker and dispatch to the different widgets
        const handlers = {
            'galyleo:writeFile': (evt) => {
                const doc = this._getDocumentForFilePath(evt.data.dashboardFilePath);
                doc.context.model.value.text = evt.data.jsonString;
                doc.content.completeSave(); // signal that save can be finalized
            },
            'galyleo:setDirty': (evt) => {
                const doc = this._getDocumentForFilePath(evt.data.dashboardFilePath);
                doc.context.model.dirty = evt.data.dirty;
            },
            'galyleo:ready': (evt) => {
                const doc = this._getDocumentForFilePath(evt.data.dashboardFilePath);
                doc.content.loadDashboard(doc.context.model.value.text); // load the dashboard
            }
        };
        window.addEventListener('message', evt => {
            handlers[evt.data.method](evt);
        });
    }
    _getDocumentForFilePath(path) {
        // since we are coming from an incoming message due to an iframe embedded inside
        // a widget, that widget still has to be there
        return this._documentManager.findWidget(path);
    }
    /**
     * Create a new widget given a context.
     */
    createNewWidget(context) {
        const content = new editor_1.GalyleoEditor({
            context
        });
        this._communicationsManager.addEditor(content);
        content.title.icon = exports.galyleoIcon;
        const origSave = context.save;
        // wrap the save function, no better way to do this....
        context.save = () => __awaiter(this, void 0, void 0, function* () {
            yield content.requestSave(context.path);
            yield origSave.bind(context)();
        });
        const widget = new editor_1.GalyleoDocument({ content, context });
        return widget;
    }
}
exports.GalyleoStudioFactory = GalyleoStudioFactory;
exports.galyleoIcon = new ui_components_1.LabIcon({
    name: 'Galyleopkg:galyleo',
    svgstr: engageLively_svg_1.default
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
function activateTOC(app, docmanager, editorTracker, labShell, restorer, markdownViewerTracker, notebookTracker, rendermime, browserFactory, palette, mainMenu, launcher, manager) {
    const modelFactory = new GalyleoModelFactory();
    app.docRegistry.addModelFactory(modelFactory);
    const sessionManager = app.serviceManager.sessions;
    //app.docRegistry.addWidgetFactory()
    // set up the file extension
    app.docRegistry.addFileType({
        name: 'Galyleo',
        icon: exports.galyleoIcon,
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
        commsManager: new manager_1.GalyleoCommunicationsManager(sessionManager)
    });
    //const widgetTracker = new WidgetTracker({ namespace: 'galyleo' });
    widgetFactory.widgetCreated.connect((sender, widget) => {
        editorTracker.add(widget); // shut up the compiler
    });
    app.docRegistry.addWidgetFactory(widgetFactory);
    // set up the main menu commands
    const newCommand = 'galyleo-editor:new-dashboard';
    // const renameCommand = 'galyleo-editor:renameDashboard'; // will add later
    // New dashboard command -- tell the docmanager to open up a
    // galyleo dashboard file, and then tell the editor to edit it,
    // sending the pathname to the editor
    app.commands.addCommand(newCommand, {
        label: 'Galyleo Dashboard',
        caption: 'Open a new Galyleo Dashboard',
        icon: exports.galyleoIcon,
        execute: (args) => __awaiter(this, void 0, void 0, function* () {
            // Create a new untitled python file
            const cwd = args['cwd'] || browserFactory.defaultBrowser.model.path;
            const res = yield app.commands.execute('docmanager:new-untitled', {
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
        })
    });
    launcher.add({
        command: newCommand
    });
    mainMenu.fileMenu.newMenu.addGroup([{ command: newCommand }], 30);
    // Add the commands to the main menu
    const category = 'Galyleo  Dashboard';
    palette.addItem({ command: newCommand, category: category, args: {} });
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
        launcher_1.ILauncher,
        docmanager_1.IDocumentManager
    ],
    activate: activateTOC
};
/**
 * Exports.
 */
exports.default = extension;
