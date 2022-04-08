import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { GalyleoDocument } from './editor';
import '../style/index.css';
import { TextModelFactory, DocumentRegistry, ABCWidgetFactory } from '@jupyterlab/docregistry';
import { Contents } from '@jupyterlab/services';
import { LabIcon } from '@jupyterlab/ui-components';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { JSONValue } from '@lumino/coreutils';
import { IModelDB } from '@jupyterlab/observables';
import { GalyleoCommunicationsManager } from './manager';
import * as models from '@jupyterlab/shared-models';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
export declare class GalyleoModel extends CodeEditor.Model implements DocumentRegistry.ICodeModel {
    contentChanged: any;
    stateChanged: any;
    sharedModel: models.YFile;
    readOnly: boolean;
    defaultKernelName: string;
    defaultKernelLanguage: string;
    session: string;
    _dirty: boolean;
    constructor(options?: CodeEditor.Model.IOptions);
    get dirty(): boolean;
    set dirty(newValue: boolean);
    get defaultValue(): string;
    toString(): string;
    fromString(value: string): void;
    toJSON(): JSONValue;
    fromJSON(dashboard: any): void;
    initialize(): void;
}
/**
 * An implementation of a model factory for base64 files.
 */
export declare class GalyleoModelFactory extends TextModelFactory {
    /**
     * The name of the model type.
     *
     * #### Notes
     * This is a read-only property.
     */
    get name(): string;
    /**
     * The type of the file.
     *
     * #### Notes
     * This is a read-only property.
     */
    get contentType(): Contents.ContentType;
    /**
     * The format of the file.
     *
     * This is a read-only property.
     */
    get fileFormat(): Contents.FileFormat;
    createNew(languagePreference?: string | undefined, modelDb?: IModelDB): GalyleoModel;
}
declare namespace GalyleoStudioFactory {
    interface IOptions extends DocumentRegistry.IWidgetFactoryOptions {
        manager: IDocumentManager;
        commsManager: GalyleoCommunicationsManager;
        settings: ISettingRegistry;
    }
}
export declare class GalyleoStudioFactory extends ABCWidgetFactory<GalyleoDocument, GalyleoModel> {
    /**
     * Construct a new mimetype widget factory.
     */
    private _documentManager;
    private _communicationsManager;
    private _settings;
    constructor(options: GalyleoStudioFactory.IOptions);
    _initMessageListeners(): void;
    _getDocumentForFilePath(path: string): GalyleoDocument;
    /**
     * Create a new widget given a context.
     */
    createNewWidget(context: DocumentRegistry.IContext<GalyleoModel>): GalyleoDocument;
}
export declare const galyleoIcon: LabIcon;
export declare const PLUGIN_ID = "@jupyterlab/lively-universal-extension:galyleo-settings";
/**
 * Initialization data for the ToC extension.
 *
 * @private
 */
declare const extension: JupyterFrontEndPlugin<void>;
/**
 * Exports.
 */
export default extension;
