class JupyterLabDriveResource extends Resource {
  // the url should be a string of the form 'jupyterlab://<path with respect to>/'
  // Note that absolute paths (e.g. /home/jovyan) are not supported by the underling API.
  // /foo resolves to /home/jovyan/foo
  // dig out the file path
  _getFileSystemPath_ () {
    const index = this.url.indexOf('://');
    return index >= 0 ? this.url.slice(index + 3) : this.url;
  }

  async _getFileOrDirectory_ () {
    const path = this._getFileSystemPath_();
    if (path.length <= 0) {
      throw 'No such file or directory: ""';
    }
    return await window.EXTENSION_INFO.drive.get(path);
  }

  async read () {
    const fileOrDirectory = await this._getFileOrDirectory_();
    return fileOrDirectory.content;
  }

  // Writes the contents of a file.  Doesn't check the fileType beyond checking
  // to see if it's a directory -- just writes it.

  async write (contents) {
    const file = await this._getFileOrDirectory_();
    if (file.type == 'directory') {
      throw `Error!  ${this.url} is a directory!`;
    }
    file.content = contents;
    return window.EXTENSION_INFO.drive.save(file.path, file);
  }

  // Write an entire file as JSON;

  // For the moment, just replaces the contents.  Creates the file if it doesn't exist
  // Behavior should be governed by options.

  async writeJson (jsonString) {
    const dirPath = this._getFileSystemPath_();
    if (typeof jsonString !== 'string') {
      jsonString = JSON.stringify(jsonString);
    }
    if (!await this.exists(dirPath)) {
      const directory = this._splitIntoDirectoryAndFile_(dirPath);
      const extension = this._getExtension_(directory.fileName);
      const jsonObject = {
        path: directory.directory,
        type: 'file',
        ext: extension
      };
      const newFile = await window.EXTENSION_INFO.drive.newUntitled(jsonObject);
      const newFileName = await window.EXTENSION_INFO.drive.rename(newFile.path, dirPath);
    }
    return await this.write(jsonString);
  }

  _getExtension_ (name) {
    const dot = name.lastIndexOf('.');
    return dot < 0 ? '' : name.slice(dot + 1);
  }

  async _isDirectory (dirPath) {
    if (dirPath == '' || dirPath == '/') {
      return true;
    }
    if (!await this.exists(dirPath)) {
      return false;
    }
    const dir = await window.EXTENSION_INFO.drive.get(dirPath);
    return dir.type == 'directory';
  }

  _splitIntoDirectoryAndFile_ (filePath) {
    const lastSlash = filePath.lastIndexOf('/');
    const fileName = lastSlash <= 0 ? filePath : filePath.slice(lastSlash + 1);
    const directory = lastSlash <= 0 ? '' : filePath.slice(0, lastSlash);
    return { directory: directory, fileName: fileName };
  }

  async mkdir () {
    const filePath = this._getFileSystemPath_();
    if (await this.exists(filePath)) {
      throw `Error: "${filePath}" already exists`;
    }
    const dirPath = this._splitIntoDirectoryAndFile_(filePath);
    if (!await this._isDirectory_(dirPath.directory)) {
      throw `Error: "${dirPath.directory}" is not a directory`;
    }
    const m = await window.EXTENSION_INFO.drive.newUntitled({ path: dirPath.directory, type: 'directory' });
    await window.EXTENSION_INFO.drive.rename(m.path, filePath);
  }

  async exists () {
    try {
      await this._getFileOrDirectory_();
      return true;
    } catch (e) {
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
    return await window.EXTENSION_INFO.drive.delete(this._getFileSystemPath_());
  }

  async dirList (depth, opts) {
    const path = this._getFileSystemPath_();

    if (this._isDirectory_(path)) {
      return await this.read();
    } else {
      throw (`Error!  ${path} is not a directory`);
    }
  }

  async readProperties (opts) {
    return await this._getFileOrDirectory_();
  }
}
