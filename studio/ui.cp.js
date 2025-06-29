/* global URLSearchParams */
/* global URLSearchParams */
/* global URLSearchParams */
/* global URLSearchParams */
/* global URLSearchParams */
/* global URLSearchParams */
/* global GalyleoEnv */
/* global URLSearchParams */

import { pt, Color } from 'lively.graphics/index.js';
import { resource } from 'lively.resources/index.js';
import { LoadingIndicator } from 'lively.components/index.js';
import { LivelyWorld } from 'lively.ide/world.js';
import { Halo } from 'lively.halos/index.js';
import { component, ViewModel, part } from 'lively.morphic/components/core.js';
import { GalyleoTopBar } from './top-bar.cp.js';
import { Dashboard } from './dashboard.cp.js';
import { GalyleoSideBar } from './side-bar.cp.js';
import { BugReporter } from './helpers.cp.js';
import { Publisher } from './helpers.cp.js';
import { studioServer, dashboardStoreServer, tableServer } from '../config.js';
import { JupyterFileSystem } from './filesystem.js';

class GalyleoEnvObject {
  get galyleoServer () {
    return this._galyleoServer ? this._galyleoServer : null;
  }

  set galyleoServer (url) {
    this._galyleoServer = url;
  }

  get dashboardStoreServer () {
    if (this.galyleoServer) {
      return this.galyleoServer;
    }
    if (this._dashboardStoreServer) {
      return this._dashboardStoreServer;
    }
    return dashboardStoreServer;
  }

  set dashboardStoreServer (url) {
    this._dashboardStoreServer = url;
  }

  get tableServer () {
    if (this.galyleoServer) {
      return this.galyleoServer;
    }
    if (this._tableServer) {
      return this._tableServer;
    }
    return tableServer;
  }

  set tableServer (url) {
    this._tableServer = url;
  }

  get user () {
    return this._user;
  }

  set user (name) {
    this._user = name;
  }

  get debug () {
    return this._debug;
  }

  set debug (true_false) {
    this._debug = false;
  }

  constructor () {
    const urlString = window.location.search;
    const urlParams = new URLSearchParams(urlString);
    this._galyleoServer = urlParams.has('galyleo_server') ? urlParams.get('galyleo_server') : null;
    this._user = urlParams.has('user') ? urlParams.get('user') : null;
    this._debug = urlParams.has('debug') ? urlParams.get('debug') != 'false' : false;
  }
}

let GALYLEO_ENV = new GalyleoEnvObject();

export class GalyleoStudioWorld extends LivelyWorld {
  static get properties () {
    return {
      loadingScreen: {}
    };
  }

  get __loading_html__ () {
    return `
      <style>
        ${this.loadingScreen.cssDeclaration}
      </style>
      ${this.loadingScreen.html}
    `;
  }

  withTopBarDo (cb) {
    const dashboard = this.getSubmorphNamed('dashboard');
    if (dashboard) {
      const topBar = dashboard.get('top bar');
      cb(topBar);
    }
  }

  get serverURL () {
    if (this._serverURLFromStart) {
      return this._serverURLFromStart;
    }
    return studioServer;
  }

  get commands () {
    return [{
      name: 'galyleo save',
      exec: () => {
        return this.requestSave();
      }
    }, ...super.commands];
  }

  get keybindings () {
    if (lively.FreezerRuntime) {
      return [{
        command: 'galyleo save',
        keys: {
          mac: 'Meta-S',
          win: 'Ctrl-S'
        }
      }];
    } else {
      return super.keybindings;
    }
  }

  requestSave () {
    this.getSubmorphNamed('galyleo dashboard studio').requestSave();
    return true; // must return something to stop the event
  }

  onContextMenu (evt) {
    evt.stop();
    evt.targetMorphs.forEach(m => m !== this && m.onContextMenu(evt));
  }

  get __head_html__ () {
    return `
<script> window.SERVER_URL="${this.serverURL}" </script>
<script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
<link type="text/css" rel="stylesheet" id="lively-font-awesome" href="/lively.morphic/assets/font-awesome/css/font-awesome.css">
<link type="text/css" rel="stylesheet" id="lively-font-inconsolata" href="/lively.morphic/assets/inconsolata/inconsolata.css">
<style type="text/css" id="WorldLandingPage_7068CDA9_749E_4EC1_9BC4_50DF06EAA2BA-Nunito">@import url("https://fonts.googleapis.com/css?family=Nunito:200,200i,300,300i,400,400i,600,600i,700,700i,800,800i,900,900i&display=swap");</style>`;
  }

  onLoad () {
    super.onLoad();
    // document.getElementById('loading-screen').remove();
    GALYLEO_ENV = new GalyleoEnvObject();
    const parameters = new URLSearchParams(document.location.search);
    const serverURL = parameters.get('serverURL');
    if (serverURL) {
      this._serverURLFromStart = serverURL;
    }
    const storeServer = parameters.get('dashboardStoreServer');
    if (storeServer) {
      dashboardStoreServer.url = storeServer;
    }
    this.opacity = 1;
  }

  defaultMenuItems (morph, evt) {
    const halo = evt && evt.targetMorph.ownerChain().find(m => m.isHalo);
    if (halo && halo.activeItems.includes('*')) { // rather hacky but works
      return super.defaultMenuItems(morph, evt);
    }
    if (morph.owner !== this.getSubmorphNamed('dashboard')) {
      return [];
    }
    return [
      ['Bring to front', () => morph.bringToFront()],
      ['Send to back', () => morph.owner.addMorphBack(morph)]
    ];
  }

  keepHalo (evt) {
    const pos = evt.positionIn(this);
    const insideDashboard = this.getSubmorphNamed('dashboard').fullContainsWorldPoint(pos);
    const insideSideBar = this.getSubmorphNamed('side bar').fullContainsWorldPoint(pos);
    const inColorPicker = this.getSubmorphsByStyleClassName('ColorPicker').find(cp => cp.fullContainsWorldPoint(pos));
    return !insideDashboard || insideSideBar || inColorPicker;
  }

  getHaloMask () {
    const dashboard = this.getSubmorphNamed('dashboard');
    const sideBar = this.getSubmorphNamed('side bar');
    return dashboard
      .globalBounds()
      .withWidth(this.width - (sideBar.viewModel.isToggled ? sideBar.width : 0));
  }

  showHaloFor (target, pointerId = this.firstHand && this.firstHand.pointerId, focus = true) {
    const dashboard = this.getSubmorphNamed('dashboard');
    if (target.owner !== dashboard) {
      return super.showHaloFor(target, pointerId, focus);
    }
    const halo = new Halo({
      pointerId,
      target,
      maskBounds: this.getHaloMask()
    });
    const submorphsToDrop = ['grab', 'copy', 'inspect', 'edit', 'component', 'responsive'];
    halo.submorphs.forEach(sm => {
      if (submorphsToDrop.indexOf(sm.name) >= 0) {
        sm.remove();
      }
    });

    this.addMorph(halo);
    if (focus) halo.focus();
    halo.alignWithTarget();
    return halo;
  }
}

// Infer the Jupyter Server URL from the window location.  In general, Jupyter servers
// serve us up as: <baseUrl>/studio-<language>/index.html

const inferJupyterServerAPIUrl = () => {
  const { origin, pathname } = window.location;
  const match = pathname.match(/^(.*)\/studio-(en|jp)\//);
  const base = match ? match[1] : '';
  return `${origin}${base}/api/contents`;
};

class JupyterCommunicator {
  constructor (galyleo) {
    this.galyleo = galyleo;
    this.instanceId = galyleo.instanceId;
    this._lastSaved = null;
    this._suppressChange = false;
    this._messages_ = [];
  }

  _sendMessage (type, payload = {}) {
    window.parent.postMessage({ type, payload, instanceId: this.instanceId }, '*');
  }

  _getSnapshot () {
    try {
      const dashboard = this.galyleo.ui.dashboard;
      return dashboard.prepareJSONForm();
    } catch (err) {
      console.error('Failed to serialize dashboard:', err);
      return null;
    }
  }

  // Save the current dashboard
  save () {
    const jsonForm = this._getSnapshot();

    if (!jsonForm) {
      return;
    }
    if (!this._suppressChange && jsonForm !== this._lastSaved) {
      this._lastSaved = jsonForm;
      this._sendMessage('galyleo:contentChanged', { content: jsonForm });
    }
  }

  startDirtyCheck (intervalMs = 2000) {
    this._lastSnapshot = this._getSnapshot();

    this._dirtyCheckInterval = setInterval(() => {
      const current = this._getSnapshot();
      if (current && current !== this._lastSnapshot) {
        this._lastSnapshot = current;
        this.isDirty = true;
        this.save(); // triggers galyleo:contentChanged
      } else {
        this.isDirty = false;
      }
    }, intervalMs);
  }

  stopDirtyCheck () {
    clearInterval(this._dirtyCheckInterval);
  }

  async _load (data) {
    this._suppressChange = true;
    const savedForm = data.content;
    await this.galyleo.updateDashboard(savedForm);
    this._lastSnapshot = this._getSnapshot(); // make sure that we don't send a load right back.
    this._suppressChange = false;
  }

  /**
   * When embedded inside a jupyter notebook, we communicate via the postMessage
   * interface, since we are confined to an iframe.
   */
  initialize () {
    const handlers = {
      'galyleo:fixLabels': async () => {
        // this is absolutely crazy
        // this.getSubmorphsByStyleClassName('PrettyMorphList').forEach(l => l.relayout());
        // this.getSubmorphsByStyleClassName('Label').forEach(l => {
        //   l._cachedTextBounds = null; l.fit();
        // });
      },

      'galyleo:loadContent': async data => await this._load(data),
      'galyleo:revertContent': async data => await this._load(data),

      'galyleo:save': _ => this.save(),
      'galyleo:requestSave': _ => this.save(),

      'galyleo:undo': (data) => {
        const dashboard = this.galyleo.ui.dashboard;
        dashboard.execCommand('undo');
      },
      'galyleo:redo': (data) => {
        const dashboard = this.galyleo.ui.dashboard;
        dashboard.execCommand('redo');
      }
    };
    window.addEventListener('message', evt => {
      if (!this._messages_) {
        this._messages_ = [];
      }
      this._messages_.push(evt.data);
      const handler = handlers[evt.data.type];
      if (handler && evt.data.instanceId === this.instanceId) {
        handler(evt.data.payload);
      }
    });
    this.startDirtyCheck(15000);
    this._sendMessage('galyleo:ready');
  }
}

export default class Galyleo extends ViewModel {
  // window.inJupyterLab = true

  static get properties () {
    return {
      focusStealer: {},
      _titleBar: {},
      _undoButton: {},
      _redoButton: {},
      _saveButton: {},
      _topBarNetworkIndicator: {},

      bugReporterComponent: {
        get () {
          return this.getProperty('bugReporterComponent') || BugReporter;
        }
      },
      publishPromptComponent: {
        get () {
          return this.getProperty('publishPromptComponent') || Publisher;
        }
      },
      dashboardFilePath: {
        serialize: false,
        initialize () {
          this.dashboardFilePath = resource(document.location).query().dashboard_file;
        }
      },
      session: {
        get () {
          return resource(document.location).query().session;
        }
      },
      inJupyterLab: {
        get () {
          // read this info from the url
          return !!resource(document.location).query().inJupyterLab;
        }
      },
      user: {
        get () {
          // read this info from the url
          return resource(document.location).query().user;
        }
      },

      version: {
        get () {
          return '0.0.1';
        },
        readOnly: true
      },
      expose: {
        get () {
          return ['halos', 'withTopBarDo', 'relayout', 'requestSave', 'clearFocus'];
        }
      },

      bindings: {
        get () {
          return [
            { signal: 'extent', handler: 'relayout' },
            { target: 'side bar', signal: 'position', handler: 'resizeDashboard' },
            { target: 'dashboard', signal: 'onHaloRemoved', handler: 'clearFocus' },
            { target: 'top bar', signal: 'initiate bug report', handler: 'reportBug' },
            { target: 'top bar', signal: 'initiate publication', handler: 'publishDashboard' }
          ];
        }
      }
    };
  }

  get commands () {
    return [
      {
        name: 'resize on client',
        exec: () => {
          this.relayout();
        }
      }
    ];
  }

  clearFocus () {
    // only do that if dashboard is actually focused
    if (this.world().focusedMorph === this.ui.dashboard) { this.models.sideBar.ui.styleControl.clearFocus(); }
  }

  requestSave () {
    if (this.jupyterCommunicator) {
      this.jupyterCommunicator.save();
    }
  }

  initializeCommunicator (instanceId) {
    this.instanceId = instanceId;
    this.jupyterCommunicator = new JupyterCommunicator(this);
    this.jupyterCommunicator.initialize();
  }

  viewDidLoad () {
    const parameters = new URLSearchParams(document.location.search);

    if (parameters.has('instanceId')) {
      const instanceId = parameters.get('instanceId');
      this.initializeCommunicator(instanceId);
    }

    if (this.inJupyterLab) {
      this.jupyterCommunicator.initialize();
      this.view.addKeyBindings([{ command: 'save', keys: { mac: 'Meta-S', win: 'Ctrl-S' } }]);
    }
    this.relayout();
    this._messages = [];
    this.ui.topBar.stylingPalette = this.ui.sideBar;
    this.ui.topBar.attachToTarget(this.ui.dashboard);
    this.models.sideBar.init(this.ui.dashboard);
    this.models.dashboard.init(this.ui.sideBar);
    const tableServer = GALYLEO_ENV.tableServer;
    if (tableServer) {
      this.models.dashboard.loadTablesFromServer(tableServer);
    }
    this.focusStealer = this.view.addMorph({
      opacity: 0,
      type: 'text'
    });
    this.focusStealer.stealFocus = true;
  }

  resizeDashboard () {
    this.ui.dashboard.extent = pt(this.ui.sideBar.left, this.view.height - this.ui.topBar.bottom);
    this.ui.dashboard.top = this.ui.topBar.bottom;
  }

  /**
   * Open up a bug-reporting window, and initialize it with the current
   * user name and path to dashboard file
   */
  async reportBug () {
    const reportMorph = part(this.bugReporterComponent);
    const li = LoadingIndicator.open('loading reporting form...');
    await li.whenRendered();
    reportMorph.init(this.user, this.dashboardFilePath);
    reportMorph.openInWorld();
    li.remove();
  }

  /**
   * Open up a publishing window and initialize it with the current
   * user name and path to dashboard file
   */
  async publishDashboard () {
    const publishMorph = part(this.publishPromptComponent);
    publishMorph.name = 'Publish Window';
    const li = LoadingIndicator.open('loading publishing form...');
    await li.whenRendered();
    publishMorph.init(this.user, this.dashboardFilePath, this.models.dashboard);
    publishMorph.openInWorld();
    li.remove();
  }

  getHelpMenu () {
    return [
      ['Create new Galyleo Dashboard', () => {
        // send message to parent window
        window.parent.postMessage({ method: 'galyleo:newDashboard' }, '*');
      }],
      ['Open Example Dashboard', [
        ['Presidential Election', () => {
          window.parent.postMessage({ method: 'galyleo:openExample', name: 'Presidential Election' }, '*');
        }],
        ['Senate Election', () => {
          window.parent.postMessage({ method: 'galyleo:openExample', name: 'Senate Election' }, '*');
        }],
        ['Florence Nightingale', () => {
          window.parent.postMessage({ method: 'galyleo:openExample', name: 'Florence Nightingale' }, '*');
        }],
        ['UFO Sightings', () => {
          window.parent.postMessage({ method: 'galyleo:openExample', name: 'UFO Sightings' }, '*');
        }]
      ]],
      ['Galyleo Reference', () => {
        window.parent.postMessage({ method: 'galyleo:openReference' }, '*');
      }],
      { isDivider: true },
      ['Report Bug', () => this.reportBug()],
      { isDivider: true },
      [`Galyleo Studio Version: ${this.version}`, () => {}]
    ];
  }

  async updateDashboard (savedForm) {
    await this.ui.dashboard.restoreFromSavedForm(savedForm);
    await this.view.whenRendered();
    const loadScreen = document.getElementById('loading-screen');
    if (loadScreen) loadScreen.remove();
    this.relayout();
  }

  toggleJupyterFrame (active) {
    const { resizer, notebook } = this.ui;
    if (active) {
      if (notebook.visible) return;
      resizer.visible = true;
      resizer.movedHorizontallyBy(800);
      notebook.visible = true;
    } else {
      if (!notebook.visible) return;
      resizer.visible = false;
      resizer.movedHorizontallyBy(-resizer.left);
      notebook.visible = false;
    }
  }

  onHoverOut (evt) {
    super.onHoverOut(evt);
    if (!this.innerBounds().insetBy(5).containsPoint(evt.positionIn(this))) {
      this.focusStealer.focus();
    }
  }

  relayout () {
    const { ui: { sideBar, topBar }, view } = this;
    if (view.respondsToVisibleWindow) {
      view.extent = this.world().visibleBounds().extent();
    }
    sideBar.height = view.height;
    topBar.width = view.width;
  }

  /**
   * Analogous to World.halos() but instead returns only the halos
   * which are focused on elements on the dashboard.
   */
  halos () {
    return this.world().halos().filter(h => h.target.ownerChain().includes(this.view));
  }

  async withTopBarDo (cb) {
    await cb(this.ui.topBar);
  }
}
// part(GalyleoDashboardStudio).openInWorld()
const GalyleoDashboardStudio = component({
  name: 'galyleo dashboard studio',
  defaultViewModel: Galyleo,
  extent: pt(800, 800),
  fill: Color.darkGray,
  clipMode: 'hidden',
  submorphs: [
    part(GalyleoTopBar, { name: 'top bar' }),
    {
      defaultViewModel: Dashboard,
      name: 'dashboard',
      extent: pt(715.4, 788.5),
      position: pt(0.9, 48.8),
      clipMode: 'auto'
    },
    part(GalyleoSideBar, {
      name: 'side bar',
      position: pt(651.9, 0),
      height: 800,
      viewModel: {
        isHaloItem: false
      }
    })
  ]
});

export class GalyleoMessageTest {
  constructor (testDashboard, galyleoInstance) {
    this.testDashboard = testDashboard;
    this.messagesReceived = [];
    this.messagesSent = [];
    this.instanceId = window.crypto.randomUUID();
    this.galyleoInstance = galyleoInstance;
    this._initMessageListeners();
    galyleoInstance.initializeCommunicator(this.instanceId);
  }

  _initMessageListeners () {
    const handlers = {
      'galyleo:ready': () => {
        this.messagesReceived.push('galyleo:ready');
        const dashboardObject = JSON.parse(this.testDashboard);
        const payload = { content: dashboardObject };
        this._postMessage('galyleo:loadContent', payload);
      },

      'galyleo:contentChanged': (evt) => {
        this.messagesReceived.push(evt.data);
        const { payload } = evt.data;
        console.log(payload.content);
      },

      'galyleo:requestSave': () => {
        this.messagesReceived.push('galyleo:requestSave');
        // await this._context.save();
        console.log('galyleo:saveSuccess');
      }
    };

    window.addEventListener('message', (evt) => {
      const { type, instanceId } = evt.data;
      if (instanceId == this.instanceId && type in handlers) {
        handlers[type](evt);
      }
    });
  }

  sendDashboard () {
    const dashboardObject = this.testDashboard;
    const payload = { content: dashboardObject };
    this._postMessage('galyleo:loadContent', payload);
  }

  _postMessage (type, payload = {}) {
    this.messagesSent.push({ type, payload });
    window.parent.postMessage({ type, payload, instanceId: this.instanceId }, '*');
  }
}

export { GalyleoDashboardStudio, GALYLEO_ENV };
