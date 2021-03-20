import { IDocumentManager } from '@jupyterlab/docmanager';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { ILabShell, JupyterFrontEnd } from '@jupyterlab/application';
import { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import { FileBrowserModel } from '@jupyterlab/filebrowser';
declare global {
    interface Window {
        System: any;
        frozenPart: any;
        $world: any;
        lively: {};
        EXTENSION_INFO: {};
        FORCE_FAST_LOAD: boolean;
        SNAPSHOT_PATH: string;
        SYSTEM_BASE_URL: string;
        WORLD_NAME: string;
    }
}
/**
 * Widget for hosting a notebook table of contents.
 */
export declare class GalyleoEditor extends Widget {
    /**
     * Returns a new table of contents.
     *
     * @param options - options
     * @returns widget
     */
    constructor(options: GalyleoEditor.IOptions);
    /**
     * Callback invoked to re-render after showing a table of contents.
     *
     * @param msg - message
     */
    protected onAfterAttach(msg: Message): void;
    newDashboard(path: string): void;
    loadDashboard(cwd: string): void;
    saveCurrentDashboard(): void;
    saveCurrentDashboardAndPrompt(): void;
    protected sendGuid(tracker: INotebookTracker, panel: NotebookPanel): void;
    protected onResize(msg: Widget.ResizeMessage): void;
    private _notebook;
    private _labShell;
    private _app;
    private _documentManager;
    private _guid;
    private _currentDocumentInfo;
    private _drive;
    private _browserModel;
}
/**
 * A namespace for TableOfContents statics.
 */
export declare namespace GalyleoEditor {
    /**
     * Interface describing table of contents widget options.
     */
    interface IOptions {
        /**
         * Application document manager.
         */
        docmanager: IDocumentManager;
        /**
         * Notebook ref.
         */
        notebook: INotebookTracker;
        labShell: ILabShell;
        app: JupyterFrontEnd;
        browserModel: FileBrowserModel;
    }
    /**
     * Interface describing the current widget.
     */
    interface ICurrentWidget<W extends Widget = Widget> {
        /**
         * Current widget.
         */
        widget: W;
    }
}
