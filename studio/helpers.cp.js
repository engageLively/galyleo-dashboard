import { Morph } from 'lively.morphic/morph.js';
import { obj, string } from 'lively.lang/index.js';
import { connect, noUpdate, once } from 'lively.bindings/index.js';
import { resource } from 'lively.resources/src/helpers.js';

export class BugReporter extends Morph {
  /*
  ** A Bug Reporter.  Very simple: just bundles up the input fields and uses
  ** a POST call to report the bug and file a ticket.  No properties, just
  ** a read-only URL
  ** the protocol to report Lively bugs is in
  ** https://gitlab.com/engageLively/ticketingsystem/-/blob/master/README.md
  ** Sample cURL call is:
  ** curl -H "Content-Type: application/json" -d '{"user": "foo@bar.com", "file_path":"/dev/null", "message":"First App Engine Test"}' https://engagelively.wl.r.appspot.com/ticket
  */

  // initialize the user and file_path fields with the values from the
  // environment, if provided (non-null and length > 0)

  init (userName, filePath) {
    this._initInputField_('user', userName);
    this._initInputField_('file_path', filePath);
  }

  // initialize an input field with a value, if the value is non-null and
  // its length is > 0.  For nulls or empty values, do nothing.

  _initInputField_ (inputFieldName, value) {
    if (value && value.length > 0) {
      this.getSubmorphNamed(inputFieldName).textString = value;
    }
  }

  // report a bug.  Just collect the inputs, put dummies in for file_path
  // and user if nothing is entered, ensure that there is a message, then
  // post the request to post it.  IMPORTANT: once the request is
  // posted, close this dialog to prevent accidental spamming.
  // body = {user: "foo@galyleo.com", file_path:"/dev/galyleo", message:"first test from Galyleo"}
  // message = ''
  reportBug () {
    const user = this.getSubmorphNamed('user').textString;
    const file_path = this.getSubmorphNamed('file_path').textString;
    const message = this.getSubmorphNamed('message').textString;
    if (message.length == 0) {
      // no blank messages will be filed
      this.getSubmorphNamed('message').show();
    } else {
      const body = {
        user: user.length > 0 ? user : 'No user name entered',
        file_path: file_path.length > 0 ? user : 'No file path  entered',
        message: message
      };
      const r = resource(this.url, { headers: { 'Content-Type': 'application/json' } });
      r.contentType = 'application/json';
      r.useProxy = true;
      r.post(JSON.stringify(body));
      this.remove();
    }
  }

  get url () {
    return 'https://engagelively.wl.r.appspot.com/ticket';
  }
}

export class TableLoader extends Morph {
  /* A very simple part that just consists of an input string and two buttons,
  ** where an URL is entered and then read and loaded.  The URL must reference
  ** a JSON structure which is a suitable argument to Google DataTable, see:
  ** https://developers.google.com/chart/interactive/docs/reference#constructor
  ** This structure can be created from the Python class gviz_api.DataTable
  ** with the call <table>.ToJSon(), where <table> is an instance of
  ** gviz_api.DataTable.  See:
  ** https://developers.google.com/chart/interactive/docs/dev/gviz_api_lib
  ** The cancel button just invokes this.remove() with a hardcoded connection
  */

  // initialize this with the  dashboard to call back.  This is called by D
  // ashboardControl.loadTable after this part has been created in that routine.

  init (dashboard) {
    this.dashboard = dashboard;
  }

  // Tell the dashboard to load the table from this URL.  The URL should be
  // checked here first, to ensure it's at least a valid URL.  Once done,
  // just close the dialog.  This is called from the Load URL button via a
  // hardcoded connection.

  loadURL () {
    const url = this.getSubmorphNamed('url');
    if (url.input.length == 0) {
      url.indicateError('Please enter url to JSON file');
      return;
    }
    this.dashboard.loadDataFromUrl(url.textString);
    this.remove();
  }
}
