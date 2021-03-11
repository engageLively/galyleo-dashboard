// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.GalyleoEditor = void 0;
const React = require("react");
const ReactDOM = require("react-dom");
const cells_1 = require("@jupyterlab/cells");
const widgets_1 = require("@lumino/widgets");
const model_1 = require("@jupyterlab/cells/lib/model");
const services_1 = require("@jupyterlab/services");
/**
 * Widget for hosting a notebook table of contents.
 */
class GalyleoEditor extends widgets_1.Widget {
    /**
     * Returns a new table of contents.
     *
     * @param options - options
     * @returns widget
     */
    constructor(options) {
        super();
        this._notebook = options.notebook;
        this._labShell = options.labShell;
        this._documentManager = options.docmanager;
        this._app = options.app;
        let u = Date.now().toString(16) + Math.random().toString(16) + '0'.repeat(16);
        this._guid = [u.substr(0, 8), u.substr(8, 4), '4000-8' + u.substr(13, 3), u.substr(16, 12)].join('-');
    }
    /**
     * Callback invoked to re-render after showing a table of contents.
     *
     * @param msg - message
     */
    onAfterAttach(msg) {
        let title = 'Galyleo Editor';
        let jsx = (React.createElement("div", { className: "jp-TableOfContents" },
            React.createElement("header", null, title),
            React.createElement("div", { className: "editor-area" }, "This is an area... for galyleo")));
        ReactDOM.render(jsx, this.node);
        // dynamically load the load.js from the cdn and wait 
        var script = document.createElement('script');
        const bootstrapBaseURL = 'https://matt.engagelively.com/lively.freezer/loading-screen/'; // this is the base url while the frozen part of the loader is loaded
        script.src = 'https://matt.engagelively.com/lively.freezer/loading-screen/load.js';
        window.WORLD_NAME = '__newWorld__';
        // window.FORCE_FAST_LOAD = true;
        //window.SNAPSHOT_PATH = 'https://matt.engagelively.com/users/robin/published/dashboards/dashboard-studio.json';
        window.SYSTEM_BASE_URL = 'https://matt.engagelively.com'; // once bootstrapped, we need to change the base URL to here
        script.onload = () => {
            window.frozenPart.renderFrozenPart(document.getElementsByClassName('editor-area')[0], bootstrapBaseURL);
            // wait until the $world is defined
            window.EXTENSION_INFO = {
                notebook: this._notebook,
                widget: this,
                labShell: this._labShell,
                app: this._app,
                docmanager: this._documentManager,
                drive: new services_1.Drive(),
                room: this._guid,
            };
            // window.$world.resizePolicy = 'static';
            // let galyleo = window.$world.getSubmorphNamed('galyleo');
            // let jupyter = window.$world.getSubmorphNamed('jupyter');
            // galyleo.respondsToVisibleWindow = false;
            // jupyter.runtime.notebook = this._notebook;
            // jupyter.runtime.widget = this;
            // jupyter.runtime.labShell = this._labShell;
            // window.$world.trackOffset = true;
            this.update();
        };
        document.head.appendChild(script);
        const self = this;
        this._notebook.widgetAdded.connect((tracker, panel) => self.sendGuid(tracker, panel));
    }
    sendGuid(tracker, panel) {
        console.log('Panel connected');
        const code = `%env DASHBOARD_ROOM=${this._guid}`;
        const success = `Execution of ${code} successful`;
        const failure = `Execution of ${code} failed`;
        panel.sessionContext.ready.then(_ => {
            var _a;
            console.log('Session is ready!');
            let kernel = (_a = panel.sessionContext.session) === null || _a === void 0 ? void 0 : _a.kernel;
            return new Promise((resolve, reject) => {
                if (!kernel) {
                    console.log('No kernel!');
                    return reject();
                }
                ;
                let req = kernel.requestExecute({
                    code,
                    silent: true
                });
                if (req) {
                    console.log(success);
                    req.onIOPub = (msg) => {
                        if (!msg.content.execution_state)
                            resolve(msg);
                    };
                }
                else {
                    console.log(failure);
                }
            });
        });
    }
    /* protected sendGuid(tracker: INotebookTracker, panel: NotebookPanel) {
      console.log('Panel connected')
      const msg = `%env DASHBOARD_ROOM=${this._guid}`;
      const success = `Execution of ${msg} successful`;
      const failure = `Execution of ${msg} failed`
      this._executeOnPanel(msg, panel)?.then(_ => console.log(success), _ => console.log(failure))
    } */
    execute(code) {
        let panel = this._labShell.widgets('main').next();
        this._executeOnPanel(code, panel);
    }
    _executeOnPanel(code, panel) {
        var _a, _b;
        console.log(`sending ${code} to kernel for execution`);
        if (!((_a = panel.sessionContext.session) === null || _a === void 0 ? void 0 : _a.kernel)) {
            console.log("No kernel present in panel!");
            return;
        }
        let kernel = (_b = panel.sessionContext.session) === null || _b === void 0 ? void 0 : _b.kernel;
        return new Promise((resolve, reject) => {
            if (!kernel)
                return reject();
            let req = kernel.requestExecute({
                code,
                silent: true
            });
            if (req) {
                console.log("Executed code successfully");
                req.onIOPub = (msg) => {
                    if (!msg.content.execution_state)
                        resolve(msg);
                };
            }
        });
    }
    createCell(idx, code) {
        let panel = this._labShell.widgets('main').next();
        let model = panel.model;
        let cell = new model_1.CodeCellModel({});
        cell.value.text = code;
        model === null || model === void 0 ? void 0 : model.cells.insert(idx, cell);
        return panel.content.widgets[idx];
    }
    selectCell() {
        let markerElement = document.createElement('div');
        markerElement.style.background = 'orange';
        markerElement.style.opacity = '0.5';
        markerElement.style.position = 'absolute';
        markerElement.style.display = 'none';
        markerElement.style.pointerEvents = 'none';
        let panel = this._labShell.widgets('main').next();
        let notebookNode = panel && panel.node;
        if (!notebookNode)
            return;
        document.body.appendChild(markerElement);
        return new Promise((resolve) => {
            let currentCell;
            let update = (evt) => {
                let target = evt.composedPath().find((node) => node.classList && node.classList.contains('jp-CodeCell'));
                if (target) {
                    let bounds = target.getBoundingClientRect();
                    currentCell = panel.content.widgets.find(w => w.node === target);
                    markerElement.style.display = 'initial';
                    markerElement.style.top = bounds.top + 'px';
                    markerElement.style.left = bounds.left + 'px';
                    markerElement.style.width = bounds.width + 'px';
                    markerElement.style.height = bounds.height + 'px';
                }
                else {
                    markerElement.style.display = 'none';
                }
            };
            window.addEventListener('mousemove', update);
            notebookNode.onmousedown = () => {
                markerElement.remove();
                resolve(currentCell);
                window.removeEventListener('mousemove', update);
            };
        });
    }
    insertAndEval(idx, code) {
        let panel = this._labShell.widgets('main').next();
        let cell = this.createCell(0, code);
        const session = panel.sessionContext;
        session && cells_1.CodeCell.execute(cell, session);
    }
    onResize(msg) {
        const world = window.$world;
        if (world) {
            world.isEmbedded = true;
            world.resizePolicy = 'static';
            world.width = msg.width;
            world.height = msg.height;
            world.onWindowResize();
        }
    }
}
exports.GalyleoEditor = GalyleoEditor;
