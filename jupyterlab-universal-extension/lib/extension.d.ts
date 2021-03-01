import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { GalyleoEditor } from './toc';
import '../style/index.css';
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
