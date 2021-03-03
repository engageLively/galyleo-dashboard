export class JupyterLabDriveResource extends Resource {
  export var resourceExtension = {
    name: "local-resource",
    matches: (url) => url.startsWith("jupyterlab:"),
    resourceClass: JupyterLabDriveResource
  }
  // the url should be a string of the form 'jupyterlab://<path with respect to>/'
  // Note that absolute paths (e.g. /home/jovyan) are not supported by the underling API.
  // /foo resolves to /home/jovyan/foo
  // dig out the file path
  _getFileSystemPath_() {
    const index = this.url.indexOf('://');
    return index >= 0?this.url.slice(index + 3):this.url;
  }

  async _getFileOrDirectory_() {
    const path = this._getFileSystemPath_();
    if (path.length <= 0) {
      throw 'No such file or directory: ""'
    }
    return await window.EXTENSION_INFO.drive.get(path);
  }

  async read () { 
    const fileOrDirectory = await this._getFileSystemPath_();
    return fileOrDirectory.contents;
  }

  // For the moment, just replaces the contents.  Creates the file if it doesn't exist
  // Behavior should be governed by options.

  async write () {  }

  async _isDirectory (dirPath)  {
    if (dirPath == "" || dirPath == "/") {
      return true;
    }
    if (!await exists(dirPath)) {
      return false;
    }
    let dir = await window.EXTENSION_INFO.drive.get(dirPath);
    return dir.type == "directory"
  }

  async mkdir () {
    const filePath = this._getFileSystemPath_();
    const lastSlash = filePath.lastIndexOf("/");
    const fileName = lastSlash <= 0?filePath:filePath.slice(lastSlash + 1);
    const directory = lastSlash <= 0?"":filePath.slice(0, lastSlash);
      
      if (await this.exists(filePath)) {
        throw `Error: "${filePath}" already exists`;
      }
      if (!await this._isDirectory_(directory)) {
        throw `Error: "${directory}" is not a directory`
      }
      const m = await window.EXTENSION_INFO.drive.newUntitled({path: directory, type: 'directory'})
      await window.EXTENSION_INFO.drive.rename(m.path, filePath)
    }
  }

  async exists () {
    try {
      await this._getFileSystemPath_();
      return true;
    } catch(e) {
      return false;
    }
   }
  async remove () {
    // Need to think about the semantics of this.  The Unix rm command
    // refuses to remove a non-empty directory, unless the -f flag is 
    // specified.  delete, OTOH, just goes ahead and does it.
    // for the moment just a raw call to delete, but we can revise.
    // The revision would be to check to see if it's a directory and refuse
    // in that case.
    // No error-checking: if the file/dir doesn't exist, drive throws an error,
    // which is all we would do
    return await   window.EXTENSION_INFO.drive.delete(this._getFileSystemPath_())
  }
  async dirList (depth, opts) { nyi(this, 'dirList'); }
  async readProperties (opts) { nyi(this, 'readProperties'); }
}