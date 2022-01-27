
import { resource } from 'lively.resources/src/helpers.js';
import { MenuBarButton, GalyleoWindow, PromptButton } from './shared.cp.js';
import { GalyleoSearch } from './inputs/search.cp.js';
import { component, ViewModel, without, part, add } from 'lively.morphic/components/core.js';
import { Color, pt } from 'lively.graphics';
import { VerticalLayout, TilingLayout, Text, Label } from 'lively.morphic';
import { rect } from 'lively.graphics/geometry-2d.js';

/**
 * A Bug Reporter.  Very simple: just bundles up the input fields and uses
 * a POST call to report the bug and file a ticket.  No properties, just
 * a read-only URL
 * the protocol to report Lively bugs is in
 * https://gitlab.com/engageLively/ticketingsystem/-/blob/master/README.md
 * Sample cURL call is:
 * curl -H "Content-Type: application/json" -d '{"user": "foo@bar.com", "file_path":"/dev/null", "message":"First App Engine Test"}' https://engagelively.wl.r.appspot.com/ticket
 */
export class BugReporterModel extends ViewModel {
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
      this.getSubmorphNamed(inputFieldName).textString = value;
    }
  }
  
  /**
   * Report a bug.  Just collect the inputs, put dummies in for file_path
   * and user if nothing is entered, ensure that there is a message, then
   * post the request to post it.  IMPORTANT: once the request is
   * posted, close this dialog to prevent accidental spamming.
   */
  reportBug () {
    const user = this.getSubmorphNamed('user').textString;
    const file_path = this.getSubmorphNamed('file_path').textString;
    const message = this.getSubmorphNamed('message').textString;
    if (message.length === 0) {
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

// BugReporter.openInWorld()
const BugReporter = component(GalyleoWindow, {
  defaultViewModel: BugReporterModel,
  name: 'bug reporter',
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
            extent: pt(90, 35),
            tooltip: 'Close this dialog without loading',
            submorphs: [{
              name: 'label', value: ['CLOSE', null]
            }, {
              name: 'icon',
              extent: pt(14, 14),
              imageUrl: 'https://fra1.digitaloceanspaces.com/typeshift/engage-lively/galyleo/close-button-icon-2.svg'
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
   * Tell the dashboard to load the table from this URL.  The URL should be
   * checked here first, to ensure it's at least a valid URL.  Once done,
   * just close the dialog.  This is called from the Load URL button via a
   * hardcoded connection.
   */
  loadURL () {
    const url = this.ui.url;
    if (url.input.length === 0) {
      url.indicateError('Please enter url to JSON file');
      return;
    }
    this.dashboard.loadDataFromUrl(url.textString);
    this.remove();
  }
}

const CloseButton = component(MenuBarButton, {
  name: 'close button',
  extent: pt(90, 35),
  submorphs: [{
    name: 'label', value: ['CLOSE', null]
  }, {
    name: 'icon',
    extent: pt(14, 14),
    imageUrl: 'https://fra1.digitaloceanspaces.com/typeshift/engage-lively/galyleo/close-button-icon-2.svg'
  }]
});

// part(DataLoader).openInWorld()
const DataLoader = component(GalyleoWindow, {
  defaultViewModel: TableLoaderModel,
  name: 'data loader',
  extent: pt(340.5, 175.6),
  submorphs: [{
    name: 'window title',
    textString: 'Load Data'
  }, add({
    name: 'table loader',
    borderColor: Color.rgb(127, 140, 141),
    borderRadius: 10,
    extent: pt(311, 135),
    fill: Color.rgba(215, 219, 221, 0),
    layout: new VerticalLayout({
      align: 'right',
      autoResize: true,
      direction: 'topToBottom',
      orderByIndex: true,
      resizeSubmorphs: false,
      spacing: 10
    }),
    submorphs: [
      // fixme: the overridden props are not carried over
      // part(CloseButton, {
      //   name: 'cancel button',
      //   tooltip: 'Close this dialog without loading'
      // }),
      part(MenuBarButton, {
        name: 'close button',
        extent: pt(90, 35),
        tooltip: 'Close this dialog without loading',
        submorphs: [{
          name: 'label', value: ['CLOSE', null]
        }, {
          name: 'icon',
          extent: pt(14, 14),
          imageUrl: 'https://fra1.digitaloceanspaces.com/typeshift/engage-lively/galyleo/close-button-icon-2.svg'
        }]
      }),
      part(GalyleoSearch, { name: 'url', placeholder: 'Enter URL to datasource' }),
      part(PromptButton, {
        name: 'load button',
        extent: pt(106.5, 30.9),
        submorphs: [without('icon')] 
      })]
  })]
});

export { DataLoader, CloseButton, BugReporter };
