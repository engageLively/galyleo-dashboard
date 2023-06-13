
import { resource } from 'lively.resources/src/helpers.js';
import { MenuBarButton, galyleoFont, GalyleoNumberInput, GalyleoWindow, PromptButton } from './shared.cp.js';
import { GalyleoSearch } from './inputs/search.cp.js';
import { component, ViewModel, without, part, add } from 'lively.morphic/components/core.js';
import { Color, pt } from 'lively.graphics';
import { TilingLayout, HTMLMorph, Text, Label } from 'lively.morphic';
import { rect } from 'lively.graphics/geometry-2d.js';
import { Toggle } from './inputs/toggle.cp.js';
import { URL } from 'esm://cache/npm:@jspm/core@2.0.0-beta.26/nodelibs/url';
import { DefaultList } from 'lively.components/list.cp.js';
import { projectAsset } from 'lively.project/helpers.js';

/**
 * A Bug Reporter.  Very simple: just bundles up the input fields and uses
 * a POST call to report the bug and file a ticket.  No properties, just
 * a read-only URL
 * the protocol to report Lively bugs is in
 * https://gitlab.com/engageLively/ticketingsystem/-/blob/master/README.md
 * Sample cURL call is:
 * curl -H "Content-Type: application/json" -d '{"user": "foo@bar.com", "file_path":"/dev/null", "message":"First App Engine Test"}' https://galyleo-tickets.r.appspot.com/ticket
 */
export class BugReporterModel extends ViewModel {
  static get properties () {
    return {
      expose: {
        get () {
          return ['init'];
        }
      },
      bindings: {
        get () {
          return [
            { model: 'close button', signal: 'fire', handler: 'close' },
            { model: 'report button', signal: 'fire', handler: 'reportBug' }
          ];
        }
      }
    };
  }

  /**
   * initialize the user and file_path fields with the values from the
   * environment, if provided (non-null and length > 0)
   * @param { string } userName - The name of the current user.
   * @param { string } filePath - The path to the dashboard file.
   */
  init (userName, filePath) {
    this._initInputField_('user', userName);
    this._initInputField_('file_path', filePath);
  }

  /**
   * Initialize an input field with a value, if the value is non-null and
   * its length is > 0.  For nulls or empty values, do nothing.
   * @param { string } inputFieldName - The name of the field to initialize.
   * @param { string } value - The text string to be placed into the input field.
   */
  _initInputField_ (inputFieldName, value) {
    if (value && value.length > 0) {
      this.ui[inputFieldName].textString = value;
    }
  }

  /**
   * Report a bug.  Just collect the inputs, put dummies in for file_path
   * and user if nothing is entered, ensure that there is a message, then
   * post the request to post it.  IMPORTANT: once the request is
   * posted, close this dialog to prevent accidental spamming.
   */
  reportBug () {
    const { userNameInput, fileInput, message: messageInput } = this.ui;
    const user = userNameInput.textString;
    const filePath = fileInput.textString;
    const message = messageInput.textString;
    if (message.length === 0) {
      // no blank messages will be filed
      messageInput.show();
    } else {
      const body = {
        user: user.length > 0 ? user : 'No user name entered',
        file_path: filePath.length > 0 ? user : 'No file path  entered',
        message: message
      };
      const r = resource(this.url, { headers: { 'Content-Type': 'application/json' } });
      r.contentType = 'application/json';
      r.useProxy = true;
      r.post(JSON.stringify(body));
      this.close();
    }
  }

  get url () {
    return 'https://galyleo-tickets.uw.r.appspot.com/ticket';
  }

  close () {
    this.view.remove();
  }
}

// part(BugReporter).openInWorld()
const BugReporter = component(GalyleoWindow, {
  defaultViewModel: BugReporterModel,
  extent: pt(415, 459.2),
  submorphs: [{
    name: 'window title',
    textString: 'Report a Bug'
  }, add({
    name: 'contents wrapper',
    layout: new TilingLayout({
      axis: 'column',
      axisAlign: 'center',
      orderByIndex: true,
      padding: rect(15, 15, 0, 0),
      resizePolicies: [['header', {
        height: 'fixed',
        width: 'fill'
      }], ['user name input', {
        height: 'fixed',
        width: 'fill'
      }], ['file input', {
        height: 'fixed',
        width: 'fill'
      }], ['message', {
        height: 'fill',
        width: 'fill'
      }], ['footer', {
        height: 'fixed',
        width: 'fill'
      }]],
      spacing: 13,
      wrapSubmorphs: false
    }),
    borderColor: Color.rgb(127, 140, 141),
    borderRadius: 10,
    extent: pt(414.3, 428.3),
    fill: Color.rgba(215, 219, 221, 0),
    submorphs: [
      {
        name: 'header',
        layout: new TilingLayout({
          align: 'right',
          orderByIndex: true,
          wrapSubmorphs: false
        }),
        fill: Color.transparent,
        submorphs: [
          part(MenuBarButton, {
            name: 'close button',
            extent: pt(100, 35),
            tooltip: 'Close this dialog without loading',
            submorphs: [{
              name: 'label', value: ['CLOSE', null]
            }, {
              name: 'icon',
              extent: pt(14, 14),
              imageUrl: projectAsset('close-button-icon-2.svg')
            }]
          })
        ]
      },
      part(GalyleoSearch, {
        name: 'user name input',
        placeholder: 'User name',
        submorphs: [{
          name: 'placeholder',
          extent: pt(90, 28.8),
          textAndAttributes: ['User name', null]
        }]
      }),
      part(GalyleoSearch, {
        name: 'file input',
        placeholder: 'Dashboard file',
        submorphs: [{
          name: 'placeholder',
          extent: pt(114, 28.8),
          textAndAttributes: ['Dashboard file', null]
        }]
      }),
      {
        type: Label,
        name: 'message label',
        fontColor: Color.rgb(89, 89, 89),
        fontWeight: 700,
        fontSize: 15,
        textString: 'Message'
      },
      {
        type: Text,
        name: 'message',
        clipMode: 'auto',
        fill: Color.rgb(190, 190, 190),
        borderRadius: 20,
        fontSize: 18,
        lineWrapping: true,
        fontFamily: galyleoFont,
        padding: rect(10, 10, 0, 0),
        extent: pt(318, 58.4),
        fixedWidth: true,
        fixedHeight: true
      },
      {
        name: 'footer',
        layout: new TilingLayout({
          align: 'right',
          orderByIndex: true,
          wrapSubmorphs: false
        }),
        fill: Color.transparent,
        submorphs: [
          part(PromptButton, {
            name: 'report button',
            extent: pt(106.5, 30.9),
            submorphs: [without('icon'), {
              name: 'label',
              textAndAttributes: ['Report', null]
            }]
          })
        ]
      }
    ]
  })]
});

class URLDisplayModel extends ViewModel {
  static get properties () {
    return {
      expose: {
        get () {
          return ['init'];
        }
      },
      bindings: {
        get () {
          return [
            { model: 'close button', signal: 'fire', handler: 'close' }
          ];
        }
      }
    };
  }

  _setURL (htmlMorph, prefixString, url) {
    htmlMorph.html = `
    <div style="display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            background: rgb(215,219,221)">
     <p style="font: bold 10pt Arial">${prefixString} <a href=${url} target=_blank>${url}</a></p></div>`;
  }

  /**
   * initialize the URL fields with the values from the provided
   * dashboard URL
   * @param { string } dashboardURL - The URL of the dashboard to display
   */
  init (dashboardURL) {
    this._setURL(this.ui.dashboardUrl, 'The Dashboard is published at:', dashboardURL);
    const viewString = `https://galyleo.app/published/index.html?dashboard=${dashboardURL}`;
    this._setURL(this.ui.dashboardViewUrl, 'The Dashboard can be viewed  at:', viewString);
  }

  close () {
    this.view.remove();
  }
}

/**
 * A popup to inform the user of the dashboard and how to see it
 */
// part(URLDisplay).openInWorld();
const URLDisplay = component(GalyleoWindow, {
  defaultViewModel: URLDisplayModel,
  name: 'Dashboard URLs',
  extent: pt(415, 318.0),
  submorphs: [{
    name: 'window title',
    textString: 'Dashboard URLs'
  }, add({
    name: 'contents wrapper',
    layout: new TilingLayout({
      axis: 'column',
      axisAlign: 'center',
      orderByIndex: true,
      padding: rect(15, 15, 0, 0),
      resizePolicies: [['header', {
        height: 'fixed',
        width: 'fill'
      }], ['dashboard url', {
        height: 'fixed',
        width: 'fill'
      }], ['dashboard view url', {
        height: 'fixed',
        width: 'fill'
      }], ['footer', {
        height: 'fixed',
        width: 'fill'
      }]],
      spacing: 13,
      wrapSubmorphs: false
    }),
    borderColor: Color.rgb(127, 140, 141),
    borderRadius: 10,
    extent: pt(414.3, 328.3),
    fill: Color.rgba(215, 219, 221, 0),
    submorphs: [
      {
        name: 'header',
        layout: new TilingLayout({
          align: 'right',
          orderByIndex: true,
          wrapSubmorphs: false
        }),
        fill: Color.transparent,
        submorphs: [
          part(MenuBarButton, {
            name: 'close button',
            extent: pt(100, 35),
            tooltip: 'Close this dialog',
            submorphs: [{
              name: 'label', value: ['CLOSE', null]
            }, {
              name: 'icon',
              extent: pt(14, 14),
              imageUrl: projectAsset('close-button-icon-2.svg')
            }]
          })
        ]
      },
      {
        type: HTMLMorph,
        name: 'dashboard url',
        extent: pt(400, 60)
      },
      {
        type: HTMLMorph,
        name: 'dashboard view url',
        extent: pt(400, 120)
      },
      {
        name: 'footer',
        fill: Color.transparent
      }
    ]
  })]
});

/**
 * A Publisher.  Very simple: just bundles up the  name  fields and uses
 * a POST call to publish the dashboard .  No properties, just
 * a read-only URL.
 * The dashboard publisher is in
 */
export class PublisherModel extends ViewModel {
  static get properties () {
    return {
      expose: {
        get () {
          return ['init'];
        }
      },
      bindings: {
        get () {
          return [
            { model: 'close button', signal: 'fire', handler: 'close' },
            { model: 'report button', signal: 'fire', handler: 'publishDashboard' }
          ];
        }
      }
    };
  }

  // get out the filename without the leading directory path
  _getFilename (path) {
    if (path && path.length > 0) {
      const elements = path.split('/');
      const nonEmpty = elements.filter(elt => elt.length > 0);
      const last = list => list[list.length - 1];
      return nonEmpty.length > 0 ? last(nonEmpty) : '';
    } else {
      return '';
    }
  }

  /**
   * initialize the user and file_path fields with the values from the
   * environment, if provided (non-null and length > 0)
   * @param { string } userName - The name of the current user.
   * @param { string } filePath - The path to the dashboard file.
   * @param { Dashboard } dashboard - The dashboard holding the dashboard to save.
   */
  init (userName, filePath, dashboard) {
    const fileName = this._getFilename(filePath);
    if (fileName && fileName.length > 0) {
      this.ui.fileInput.textString = fileName;
    }
    if (userName) {
      const reader = resource(`${this.url}/list_user_dashboards/${userName}`);
      reader.readJson().then(result => {
        this.currentDashboards = result;
        this.ui.dashboardList.items = result;
      });
      this.userName = userName;
    } else {
      this.currentDashboards = [];
    }
    this.dashboard = dashboard;
  }

  /**
   * Show the error string in the errorMessage field, making it disappear after a few seconds.  Return false,
   * since this is the return from _sanityCheck
   */

  _showError (errorString) {
    this.ui.errorMessage.textString = errorString;
    setTimeout(_ => this.ui.errorMessage.textString = '', 5000);
    return false;
  }

  async _sanityCheck (dashboardName) {
    // rule 1: dashboardName must endWith '.gd.json'
    if (dashboardName.length <= 0) {
      return this._showError('dashboard name must not be empty');
    }
    if (!dashboardName.endsWith('.gd.json')) {
      return this._showError(`dashboard name must end with .gd.json, not ${dashboardName}`);
    }
    const fileRegex = /^[^\\/:\*\?"<>\|]+$/;
    if (!fileRegex.test(dashboardName)) {
      return this._showError(`dashboard name ${dashboardName} cannot contain "\\/<>?:`);
    }
    if (this.currentDashboards.indexOf(dashboardName) >= 0) {
      return await $world.confirm(`Action will overwrite ${dashboardName}.  OK?`);
    }
    return true;
  }

  _getDashboard () {

  }

  /**
   * Publish a dashboard.  Just check the file name input for sanity; if it passes,
   */
  async publishDashboard () {
    const { fileInput } = this.ui;
    const filePath = fileInput.textString;
    if (!this.dashboard) {
      $world.inform('No Dashboard Present!');
      this.close();
    }

    if (await this._sanityCheck(filePath)) {
      const r = resource(`${this.url}add_dashboard`, { headers: { 'Content-Type': 'application/json' } });
      const body = {
        name: filePath,
        dashboard: this.dashboard.prepareSerialization()
      };
      if (this.userName) {
        body.user = this.userName;
      }
      r.contentType = 'application/json';
      const response = await r.post(JSON.stringify(body));
      const urlDisplay = part(URLDisplay);
      urlDisplay.init(response);
      urlDisplay.openInWorld();
      this.close();
    }
  }

  get url () {
    return 'https://publication-server-htztskumkq-uw.a.run.app/';
  }

  close () {
    this.view.remove();
  }
}

// part(Publisher).openInWorld()
const Publisher = component(GalyleoWindow, {
  defaultViewModel: PublisherModel,
  extent: pt(415, 360.0),
  name: 'Galyleo Publisher',
  submorphs: [{
    name: 'window title',
    textString: 'Publish A Dashboard'
  }, add({
    name: 'contents wrapper',
    layout: new TilingLayout({
      axis: 'column',
      axisAlign: 'center',
      orderByIndex: true,
      padding: rect(15, 15, 0, 0),
      resizePolicies: [['header', {
        height: 'fixed',
        width: 'fill'
      }], ['dashboard list', {
        height: 'fixed',
        width: 'fill'
      }], ['dashboard label', {
        height: 'fixed',
        width: 'fill'
      }], ['file input', {
        height: 'fixed',
        width: 'fill'
      }], ['error message', {
        height: 'fixed',
        width: 'fill'
      }], ['footer', {
        height: 'fixed',
        width: 'fill'
      }]],
      spacing: 13,
      wrapSubmorphs: false
    }),
    borderColor: Color.rgb(127, 140, 141),
    borderRadius: 10,
    extent: pt(414.3, 328.3),
    fill: Color.rgba(215, 219, 221, 0),
    submorphs: [
      {
        name: 'header',
        layout: new TilingLayout({
          align: 'right',
          orderByIndex: true,
          wrapSubmorphs: false
        }),
        fill: Color.transparent,
        submorphs: [
          part(MenuBarButton, {
            name: 'close button',
            extent: pt(100, 35),
            tooltip: 'Close this dialog without loading',
            submorphs: [{
              name: 'label', value: ['CLOSE', null]
            }, {
              name: 'icon',
              extent: pt(14, 14),
              imageUrl: projectAsset('close-button-icon-2.svg')
            }]
          })
        ]
      },
      part(DefaultList, {
        name: 'dashboard list'
      }),
      {
        type: Label,
        name: 'error message',
        fontColor: Color.rgb(255, 89, 89),
        fontWeight: 700,
        fontSize: 15,
        textString: ''
      },

      part(GalyleoSearch, {
        name: 'file input',
        placeholder: 'Dashboard file',
        submorphs: [{
          name: 'placeholder',
          extent: pt(114, 28.8),
          textAndAttributes: ['Dashboard file', null]
        }]
      }),
      {
        type: Label,
        name: 'dashboard label',
        fontColor: Color.rgb(89, 89, 89),
        fontWeight: 700,
        fontSize: 15,
        textString: 'Published Dashboards'
      },
      {
        name: 'footer',
        layout: new TilingLayout({
          align: 'right',
          orderByIndex: true,
          wrapSubmorphs: false
        }),
        fill: Color.transparent,
        submorphs: [
          part(PromptButton, {
            name: 'report button',
            extent: pt(106.5, 30.9),
            submorphs: [without('icon'), {
              name: 'label',
              textAndAttributes: ['Publish', null]
            }]
          })
        ]
      }
    ]
  })]
});

/**
 * A utility to check and rewrite a string to be an URL.  Returns an object
 * with two fields: action and resultString.  The action is one of ok/rewritten/failed
 * and the resultString, if present, is a valid URL.
 * @param {string} url -- the original string
 */
const _checkUrl = (url) => {
  if (typeof url != 'string') {
    return { action: 'failed', resultString: null };
  }
  let tmp;
  try {
    tmp = new URL(url);
    return { action: 'ok', resultString: tmp.toString() };
  } catch (error) {
  }
  try {
    tmp = new URL(`https://${url}`);
    return { action: 'rewritten', resultString: tmp.toString() };
  } catch (error) {
    return { action: 'failed', resultString: null };
  }
};

/**
 * A very simple part that just consists of an input string and two buttons,
 * where an URL is entered and then read and loaded.  The URL must reference
 * a JSON structure which is a suitable argument to Google DataTable, see:
 * https://developers.google.com/chart/interactive/docs/reference#constructor
 * This structure can be created from the Python class gviz_api.DataTable
 * with the call <table>.ToJSon(), where <table> is an instance of
 * gviz_api.DataTable.  See:
 * https://developers.google.com/chart/interactive/docs/dev/gviz_api_lib
 * The cancel button just invokes this.remove() with a hardcoded connection
 */
export class TableLoaderModel extends ViewModel {
  static get properties () {
    return {
      bindings: {
        get () {
          return [
            { target: 'close button', signal: 'onMouseDown', handler: 'close' },
            { target: 'load button', signal: 'onMouseDown', handler: 'loadURL' }
          ];
        }
      }
    };
  }

  /**
   * Closes the prompt
   */
  close () {
    this.view.remove();
  }

  /**
   * Initialize this with the  dashboard to call back.  This is called by
   * DashboardControl.loadTable after this part has been created in that routine.
   * @param { Dashboard } dashboard - The dashboard to bind this table loader to.
   */
  init (dashboard) {
    this.dashboard = dashboard;
  }

  /**
   * Just set the values of the UI elements on load
   */
  viewDidLoad () {
    this.ui.updateToggle.state = false;
    this.ui.updateInterval.number = 300;
  }

  /**
   * Tell the dashboard to load the table from this URL.  The URL should be
   * checked here first, to ensure it's at least a valid URL.  Once done,
   * just close the dialog.  This is called from the Load URL button via a
   * hardcoded connection.
   */
  async loadURL () {
    const url = this.ui.url;
    if (url.input.length === 0) {
      url.indicateError('Please enter url to Galyleo Data Server');
      return;
    }
    const table = this.ui.table;
    if (table.input.length === 0) {
      table.indicateError('Please enter the table name');
      return;
    }
    const checkResult = _checkUrl(url.textString);
    if (checkResult.action === 'failed') {
      url.indicateError(`${url.textString} is not a valid URL`);
      return;
    }
    // if this is rewritten, we really should prompt the user to confirm that
    // it's rewritten
    const doUpdate = this.ui.updateToggle.state;
    const updateInterval = this.ui.updateInterval.number;
    const result = await this.dashboard.loadDataFromUrl(checkResult.resultString, table.textString, doUpdate, updateInterval);
    if (result.result) {
      this.view.remove();
    } else {
      const getMessage = await this.dashboard.confirm(result.msg);
      if (getMessage) {
        this.view.remove();
      }
    }
  }
}

// part(CloseButton).openInWorld()
const CloseButton = component(MenuBarButton, {
  name: 'close button',
  extent: pt(90, 35),
  layout: new TilingLayout({
    align: 'right',
    axisAlign: 'center',
    justifySubmorphs: 'spaced',
    orderByIndex: true,
    padding: rect(5, 0, 0, 0)
  }),
  submorphs: [{
    name: 'label', value: ['CLOSE', null]
  }, {
    name: 'icon',
    extent: pt(14, 18),
    imageUrl: projectAsset('close-button-icon-2.svg')
  }]
});

// part(DataLoader).openInWorld()
const DataLoader = component(GalyleoWindow, {
  defaultViewModel: TableLoaderModel,
  name: 'data loader',
  extent: pt(340.5, 250.6),
  submorphs: [{
    name: 'window title',
    textString: 'Load Data'
  }, add({
    name: 'table loader',
    borderColor: Color.rgb(127, 140, 141),
    borderRadius: 10,
    extent: pt(311, 135),
    fill: Color.rgba(215, 219, 221, 0),
    /* layout: new TilingLayout({
      align: 'right',
      axis: 'column',
      hugContentsVertically: false,
      autoResize: false,
      direction: 'topToBottom',
      orderByIndex: true,
      resizeSubmorphs: false,
      spacing: 10,
      wrapSubmorphs: true
    }), */
    submorphs: [
      // fixme: the overridden props are not carried over
      // part(CloseButton, {
      //   name: 'cancel button',
      //   tooltip: 'Close this dialog without loading'
      // }),
      part(MenuBarButton, {
        name: 'close button',
        extent: pt(100, 35),
        position: pt(230, 5),
        tooltip: 'Close this dialog without loading',
        submorphs: [{
          name: 'label', value: ['CLOSE', null]
        }, {
          name: 'icon',
          extent: pt(14, 14),
          imageUrl: projectAsset('close-button-icon-2.svg')
        }]
      }),
      part(GalyleoSearch, {
        name: 'url',
        placeholder: 'Enter URL to datasource',
        position: pt(15, 45)
      }),
      part(GalyleoSearch, {
        name: 'table',
        placeholder: 'Enter name of table',
        position: pt(15, 80)
      }),
      {
        name: 'update_panel',
        borderColor: Color.rgb(127, 140, 141),
        borderRadius: 10,
        extent: pt(311, 50),
        position: pt(15, 125),
        fill: Color.rgba(215, 219, 221, 0),
        layout: new TilingLayout({
          align: 'top',
          axis: 'row',
          autoResize: true,
          direction: 'leftToRight',
          orderByIndex: true,
          resizeSubmorphs: false,
          spacing: 10
        }),
        submorphs: [{
          type: Label,
          name: 'label',
          fontColor: Color.rgb(0, 0, 0),
          fontFamily: 'IBM Plex Sans',
          fontSize: 14,
          fontWeight: 'bold',
          position: pt(13.5, 11.5),
          reactsToPointer: false,
          textAndAttributes: ['Update', null]
        },
        add(part(Toggle, { name: 'updateToggle' })),
        {
          type: Label,
          name: 'every',
          fontColor: Color.rgb(0, 0, 0),
          fontFamily: 'IBM Plex Sans',
          fontSize: 14,
          fontWeight: 'bold',
          position: pt(13.5, 11.5),
          reactsToPointer: false,
          textAndAttributes: [' every ', null],
          state: false
        },
        add(part(GalyleoNumberInput, {
          name: 'updateInterval',
          min: 10,
          max: 3600
        })),
        {
          type: Label,
          name: 'seconds',
          fontColor: Color.rgb(0, 0, 0),
          fontFamily: 'IBM Plex Sans',
          fontSize: 14,
          fontWeight: 'bold',
          position: pt(13.5, 11.5),
          reactsToPointer: false,
          textAndAttributes: [' seconds', null]
        }
        ]
      },
      part(PromptButton, {
        name: 'load button',
        extent: pt(106.5, 30.9),
        position: pt(228, 170),
        submorphs: [without('icon')]
      })]
  })]
});

export class LoadURLDialogModel extends ViewModel {
  static get properties () {
    return {
      expose: {
        get () {
          return ['init'];
        }
      },
      bindings: {
        get () {
          return [
            { model: 'cancel button', signal: 'fire', handler: 'cancelLoad' },
            { model: 'load button', signal: 'fire', handler: 'loadURL' }
          ];
        }
      }
    };
  }

  init (dashboard, path) {
    this.dashboard = dashboard;
    this.originalPath = path;
    if (path && path.length > 0 && this.ui && this.ui.urlInput) {
      this.ui.urlInput.textString = path;
    }
  }

  viewDidLoad () {
    if (this.originalPath) {
      this.ui.urlInput.textString = this.originalPath;
    }
  }

  /**
   * Load. This is called from the Load button. Just gets the path from
   * the text string, and calls the dashboard back to check it and load it.
   * If everything worked, dashboard returns true; if not, it took care of
   * informing the user, and the dialog box stays up to give the user another
   * shot.
   */
  async loadURL () {
    const url = this.ui.urlInput.textString;
    if (await this.dashboard.loadDashboardFromURL(url)) {
      this.view.remove();
    }
  }

  /**
   * Cancel.  This is called from the Cancel button
   */
  cancelLoad () {
    this.view.remove();
  }
}

// part('LoadFromURLDialog').openInWorld()
const LoadFromURLDialog = component(GalyleoWindow, {
  defaultViewModel: LoadURLDialogModel,
  name: 'load dialog',
  layout: new TilingLayout({
    axis: 'column',
    axisAlign: 'center',
    orderByIndex: true,
    resizePolicies: [['window title', {
      height: 'fixed',
      width: 'fill'
    }]],
    spacing: 15,
    wrapSubmorphs: false
  }),
  extent: pt(340.5, 155.8),
  submorphs: [
    {
      name: 'window title',
      textString: 'Load Dashboard from...'
    },
    add(part(GalyleoSearch, { name: 'urlInput', placeholder: 'url/to/dashboard' })),
    add({
      name: 'button wrapper',
      layout: new TilingLayout({
        align: 'center',
        axisAlign: 'center',
        justifySubmorphs: 'spaced',
        orderByIndex: true,
        padding: rect(26, 26, 0, 0)
      }),
      borderColor: Color.rgb(23, 160, 251),
      borderWidth: 0,
      extent: pt(310.9, 57.7),
      fill: Color.rgba(0, 0, 0, 0),
      submorphs: [part(PromptButton, {
        name: 'load button',
        extent: pt(81.7, 31.8),
        master: PromptButton,
        position: pt(9.6, 8.9),
        submorphs: [without('icon'), {
          name: 'label',
          textAndAttributes: ['Load', null]
        }]
      }), part(PromptButton, {
        name: 'cancel button',
        extent: pt(92.8, 34.2),
        master: PromptButton,
        position: pt(174.2, 44.5),
        submorphs: [without('icon'), {
          name: 'label',
          textAndAttributes: ['Cancel', null]
        }]
      })]
    })
  ]
});

export { DataLoader, CloseButton, BugReporter, Publisher, LoadFromURLDialog };
