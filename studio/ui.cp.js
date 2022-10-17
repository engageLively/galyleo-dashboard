
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

export class GalyleoStudioWorld extends LivelyWorld {
  static get properties () {
    return {
      loadingScreen: {}
    };
  }

  get __loading_html__ () {
    return `
      <style type="text/css" id="Galyleo_EA369109_AD59_458B_BD60_7506B51416D7-Nunito">@import url("https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap");</style>
      <style>
        ${this.loadingScreen.cssDeclaration}
      </style>
      ${this.loadingScreen.html}
    `;
  }

  withTopBarDo (cb) {
    const topBar = this.getSubmorphNamed('dashboard').get('tool bar');
    cb(topBar);
  }

  get serverURL () {
    return 'https://matt.engagelively.com';
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
    /* return [
      ...lively.FreezerRuntime
        ? [
            {
              command: 'galyleo save',
              keys: {
                mac: 'Meta-S',
                win: 'Ctrl-S'
              }
            }
          ]
        : [], ...super.keybindings
    ]; */
  }

  requestSave () {
    this.getSubmorphNamed('galyleo').requestSave();
    return true; // must return something to stop the event
  }

  onContextMenu (evt) {
    evt.stop();
    evt.targetMorphs.forEach(m => m !== this && m.onContextMenu(evt));
  }

  get __head_html__ () {
    return `
<script> window.SERVER_URL="${this.serverURL}" </script>
<link type="text/css" rel="stylesheet" id="lively-font-awesome" href="/lively.morphic/assets/font-awesome/css/font-awesome.css">
<link type="text/css" rel="stylesheet" id="lively-font-inconsolata" href="/lively.morphic/assets/inconsolata/inconsolata.css">
<style type="text/css" id="WorldLandingPage_7068CDA9_749E_4EC1_9BC4_50DF06EAA2BA-Nunito">@import url("https://fonts.googleapis.com/css?family=Nunito:200,200i,300,300i,400,400i,600,600i,700,700i,800,800i,900,900i&display=swap");</style>`;
  }

  onLoad () {
    super.onLoad();
    // document.getElementById('loading-screen').remove();
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
    const insideSideBar = this.getSubmorphNamed('dashboard side bar').fullContainsWorldPoint(pos);
    const inColorPicker = this.getSubmorphsByStyleClassName('ColorPicker').find(cp => cp.fullContainsWorldPoint(pos));
    return !insideDashboard || insideSideBar || inColorPicker;
  }

  getHaloMask () {
    const dashboard = this.getSubmorphNamed('dashboard');
    const sideBar = this.getSubmorphNamed('dashboard side bar');
    return dashboard
      .globalBounds()
      .withWidth(this.width - (sideBar.isToggled ? sideBar.width : 0));
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

    this.addMorph(halo);
    if (focus) halo.focus();
    halo.alignWithTarget();
    return halo;
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
          return ['halos', 'withTopBarDo', 'relayout'];
        }
      },
      bindings: {
        get () {
          return [
            { signal: 'extent', handler: 'relayout' },
            { target: 'side bar', signal: 'position', handler: 'resizeDashboard' },
            { target: 'dashboard', signal: 'onHaloRemoved', handler: 'clearFocus' },
            { model: 'top bar', signal: 'initiate bug report', handler: 'reportBug' }
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
    const { dashboardFilePath } = this;
    window.parent.postMessage({ method: 'galyleo:requestSave', dashboardFilePath }, '*');
    /* const jsonString = dashboard.prepareJSONForm();
    dashboard.clearSnapshots();
    window.parent.postMessage({ method: 'galyleo:writeFile', jsonString: jsonString, dashboardFilePath }, '*');
    window.parent.postMessage({ method: 'galyleo:setDirty', dirty: false, dashboardFilePath }, '*'); */
  }

  viewDidLoad () {
    if (this.inJupyterLab) {
      this._initMessageListeners();
      this.view.addKeyBindings([{ command: 'save', keys: { mac: 'Meta-S', win: 'Ctrl-S' } }]);
    }
    this.relayout();
    this._messages = [];
    this.ui.topBar.stylingPalette = this.ui.sideBar;
    this.ui.topBar.attachToTarget(this.ui.dashboard);
    this.models.sideBar.init(this.ui.dashboard);
    this.models.dashboard.init(this.ui.sideBar);
    this.focusStealer = this.view.addMorph({
      opacity: 0
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
    const reportMorph = part(BugReporter);
    const li = LoadingIndicator.open('loading reporting form...');
    await li.whenRendered();
    reportMorph.init(this.user, this.dashboardFilePath);
    reportMorph.openInWorld();
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

  /**
   * When embedded inside a jupyter notebook, we communicate via the postMessage
   * interface, since we are confined to an iframe.
   */
  _initMessageListeners () {
    const handlers = {
      'galyleo:fixLabels': async () => {
        // this is absolutely crazy
        // this.getSubmorphsByStyleClassName('PrettyMorphList').forEach(l => l.relayout());
        // this.getSubmorphsByStyleClassName('Label').forEach(l => {
        //   l._cachedTextBounds = null; l.fit();
        // });
      },
      'galyleo:loadTable': data => {
        if (data.table && data.table.name && data.table.table) {
          let matched = true;
          if (data.table.dashboard) {
            // normalize the dashboardFilePath and the request in data by throwing out prefixes
            // and suffixes
            const currentPath = this.dashboardFilePath;
            const recipientDashboard = data.table.dashboard;
            const filePart = pathName => {
              const parts = pathName.split('/');
              return parts[parts.length - 1];
            };
            const namePart = fileName => {
              const parts = fileName.split('.');
              // might have been a leading '.', so find the first part of nonzero length
              const result = parts.filter(part => part.length > 0);
              return result && result.length > 0 ? result[0] : null;
            };
            const nonNull = filePath => filePath && filePath.length > 0;
            if (nonNull(currentPath) && nonNull(recipientDashboard)) {
              const thisFileKernel = namePart(filePart(currentPath));
              const requestedFileKernel = namePart(filePart(recipientDashboard));
              if (nonNull(thisFileKernel) && nonNull(requestedFileKernel)) {
                matched = thisFileKernel === requestedFileKernel;
              }
            }
          }
          if (matched) {
            this.ui.dashboard.addTable(data.table);
          }
        }
      },

      'galyleo:load': async (data) => {
        this.lastData = data;
        await this.ui.dashboard.restoreFromJSONForm(data.jsonString);
        await this.view.whenRendered();
        const loadScreen = document.getElementById('loading-screen');
        if (loadScreen) {
          loadScreen.remove();
        }

        this.relayout();
      },
      'galyleo:save': (data) => {
        const { dashboard } = this.ui;
        if (data.path) {
          this.dashboardFilePath = data.path;
          // this._changel2lRoom_();
        }
        const { dashboardFilePath } = this;
        const jsonString = dashboard.prepareJSONForm();
        dashboard.clearSnapshots();
        window.parent.postMessage({ method: 'galyleo:writeFile', jsonString: jsonString, dashboardFilePath }, '*');
        window.parent.postMessage({ method: 'galyleo:setDirty', dirty: false, dashboardFilePath }, '*');
      },
      'galyleo:rename': (data) => {
        if (data.path) {
          this.dashboardFilePath = data.path;
          // this._changel2lRoom_();
        }
      },
      'galyleo:undo': (data) => {
        const { dashboardFilePath } = this;
        const { dashboard } = this.ui;
        dashboard.execCommand('undo');
        window.parent.postMessage({ method: 'galyleo:setDirty', dirty: dashboard.isDirty(), dashboardFilePath }, '*');
      },
      'galyleo:redo': (data) => {
        const { dashboardFilePath } = this;
        const { dashboard } = this.ui;
        dashboard.execCommand('redo');
        window.parent.postMessage({ method: 'galyleo:setDirty', dirty: dashboard.isDirty(), dashboardFilePath }, '*');
      }
    };
    window.addEventListener('message', evt => {
      if (!this._messages_) {
        this._messages_ = [];
      }
      this._messages_.push(evt.data);
      handlers[evt.data.method](evt.data);
    });
    window.parent.postMessage({ method: 'galyleo:ready', dashboardFilePath: this.dashboardFilePath }, '*');
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

export { GalyleoDashboardStudio };
