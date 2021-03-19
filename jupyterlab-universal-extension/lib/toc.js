// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.GalyleoEditor = void 0;
const React = require("react");
const ReactDOM = require("react-dom");
const widgets_1 = require("@lumino/widgets");
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
        this._currentDocumentInfo = { fileModel: undefined };
        let u = Date.now().toString(16) + Math.random().toString(16) + '0'.repeat(16);
        this._guid = [
            u.substr(0, 8),
            u.substr(8, 4),
            '4000-8' + u.substr(13, 3),
            u.substr(16, 12)
        ].join('-');
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
        script.src =
            'https://matt.engagelively.com/lively.freezer/loading-screen/load.js';
        // window.WORLD_NAME = '__newWorld__';
        window.WORLD_NAME = 'Dashboard Studio Development';
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
                currentDocument: this._currentDocumentInfo
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
    newDashboard(path) {
        window.$world.get('dashboard').loadDashboardFromFile(path, true);
    }
    loadDashboard(cwd) {
        window.$world.get('dashboard').loadDashboardFromFile(cwd, true);
    }
    saveCurrentDashboard() {
        window.$world.get('dashboard').saveDashboardToFile(false);
    }
    saveCurrentDashboardAndPrompt() {
        window.$world.get('dashboard').saveDashboardToFile(true);
    }
    /* renameCurrentDashboard(): void {
      window.$world.get('dashboard').renameCurrentDashboard();
    } */
    sendGuid(tracker, panel) {
        console.log('Panel connected');
        const code = `%env DASHBOARD_ROOM=${this._guid}`;
        panel.sessionContext.ready.then(_ => {
            var _a;
            console.log('Session is ready!');
            let kernel = (_a = panel.sessionContext.session) === null || _a === void 0 ? void 0 : _a.kernel;
            kernel === null || kernel === void 0 ? void 0 : kernel.connectionStatusChanged.connect((kernel, status) => {
                if (status == 'connected') {
                    kernel === null || kernel === void 0 ? void 0 : kernel.requestExecute({ code: code, silent: true });
                }
            });
            if (!kernel) {
                console.log('No kernel!');
            }
            else {
                kernel === null || kernel === void 0 ? void 0 : kernel.requestExecute({ code: code, silent: true });
            }
        });
    }
    /* protected _executeCode(kernel: IKernelConnection | null | undefined, code: string) {
      const success = `Execution of ${code} successful`;
      const failure = `Execution of ${code} failed`;
      return new Promise((resolve, reject) => {
        
        let req = kernel.requestExecute({
          code,
          silent: true
        });
        if (req) {
          console.log(success);
          req.onIOPub = (msg: any) => {
            if (!msg.content.execution_state) resolve(msg);
          };
        } else {
          console.log(failure);
        }
      });
  
    } */
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
