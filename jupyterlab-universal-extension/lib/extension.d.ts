import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { GalyleoEditor } from './toc';
import '../style/index.css';
import { TextModelFactory } from '@jupyterlab/docregistry';
import { Contents } from '@jupyterlab/services';
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
}
/**
 * Initialization data for the ToC extension.
 *
 * @private
 */
declare const extension: JupyterFrontEndPlugin<GalyleoEditor>;
/**
 * Exports.
 */
export default extension;
