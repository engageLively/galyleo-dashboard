import { Morph } from 'lively.morphic';
import { pt } from 'lively.graphics/index.js';
import { resource } from 'lively.resources/index.js';
import { LoadingIndicator } from 'lively.components/index.js';
import { LivelyWorld } from 'lively.ide/world.js';
import { Halo } from 'lively.halos/index.js';

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
    evt.targetMorphs.forEach(m => m != this && m.onContextMenu(evt));
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
    if (morph.owner != this.getSubmorphNamed('dashboard')) {
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
    const sideBar = this.getSubmorphNamed('dashboard side bar');
    if (target.owner != dashboard) {
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

export default class Galyleo extends Morph {
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

  requestSave () {
    const dashboard = this.getSubmorphNamed('dashboard');
    const { dashboardFilePath } = this;
    window.parent.postMessage({ method: 'galyleo:requestSave', dashboardFilePath }, '*');
    /* const jsonString = dashboard.prepareJSONForm();
    dashboard.clearSnapshots();
    window.parent.postMessage({ method: 'galyleo:writeFile', jsonString: jsonString, dashboardFilePath }, '*');
    window.parent.postMessage({ method: 'galyleo:setDirty', dirty: false, dashboardFilePath }, '*'); */
  }

  cleanup () {
    this.withAllSubmorphsSelect(m => m.anchors && m.anchors.filter(a => !a.id).length > 0).forEach(m => {
      m.anchors.filter(a => !a.id).forEach(a => m.removeAnchor(a));
    });
  }

  // window.inJupyterLab = true

  static get properties () {
    return {
      focusStealer: {},
      __loading_html__: {},
      _titleBar_: {},
      _undoButton_: {},
      _redoButton_: {},
      _saveButton_: {},
      _topBarNetworkIndicator_: {},
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

      }
    };
  }

  _hideElements () {
    this._titleBar_.remove();
    this._undoButton_.remove();
    this._redoButton_.remove();
    this._saveButton_.remove();
    const studio = this.getSubmorphNamed('dashboard studio');
    studio.position = pt(0, 0);
    studio.extent = this.owner.extent;
    const topBar = this.getSubmorphNamed('top bar');
    const sideBar = this.getSubmorphNamed('dashboard side bar');
    const dashboard = this.getSubmorphNamed('dashboard');
    topBar.position = pt(0, 0);
    sideBar.position = pt(topBar.bounds().right() - 20, 0);
    dashboard.position = pt(0, topBar.bounds().bottom());
    dashboard.height = studio.height - topBar.bounds().bottom();
    sideBar.height = studio.height;
    this._topBarNetworkIndicator_.visible = true;
  }

  _showElements () {
    this.get('horizontal layout').addMorph(this._saveButton_);
    this._saveButton_.left = 3;
    this.get('horizontal layout').addMorph(this._redoButton_);
    this._redoButton_.left = 0;
    this.get('horizontal layout').addMorph(this._undoButton_);
    this._undoButton_.left = 1;

    const studio = this.getSubmorphNamed('dashboard studio');
    studio.position = pt(10, 10);
    studio.extent = this.extent.subXY(20, 20);
    studio.addMorph(this._titleBar_);
    this._titleBar_.position = pt(0, 0);
    this._titleBar_.width = studio.width;
    const topBar = this.getSubmorphNamed('top bar');
    const sideBar = this.getSubmorphNamed('dashboard side bar');
    const dashboard = this.getSubmorphNamed('dashboard');
    topBar.position = pt(0, this._titleBar_.bottom);
    sideBar.position = pt(topBar.bounds().right() - 20, this._titleBar_.bottom);
    dashboard.position = pt(0, topBar.bounds().bottom());
    dashboard.height = studio.height - topBar.bounds().bottom();
    sideBar.height = studio.height;
    this._topBarNetworkIndicator_.visible = false;
  }

  async onLoad () {
    if (this.inJupyterLab) {
      this._initMessageListeners();
      await this.whenRendered(); // that relayouting code should have gone into the parent....
      this._hideElements();
      this.addKeyBindings([{ command: 'save', keys: { mac: 'Meta-S', win: 'Ctrl-S' } }]);
    } else {
      this._hideElements();
    }
    this.relayout();
    this._messages_ = [];
    this.get('tool bar').stylingPalette = this.get('dashboard side bar');
  }

  // Open up a bug-reporting window, and initialize it with the current
  // user name and path to dashboard file

  async reportBug () {
    const bugForm = resource('part://$world/galyleo/bug report');
    const li = LoadingIndicator.open('loading reporting form...');
    await li.whenRendered();
    bugForm.read().then(reportMorph => {
      reportMorph.init(this.user, this.dashboardFilePath);
      reportMorph.openInWorld();
      li.remove();
    });
  }

  openHelpMenu () {
    this.get('help button').openMenu([
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
    ]);
  }

  // calculate the l2lRoomName for the dashboard on save/load/rename

  get _l2lRoomName_ () {
    // return this.user && this.user.length > 0 ? `${this.user}:${this.dashboardFilePath}` : this.dashboardFilePath;
    return this.dashboardFilePath;
  }

  // path has changed, so change the l2lRoomName and rejoin

  _changel2lRoom_ () {
    this.getSubmorphNamed('dashboard').l2lRoomName = this._l2lRoomName_;
    const success = this.getSubmorphNamed('dashboard')._rejoinL2LRoom_();
    console.log(`Joining ${this._l2lRoomName_} ${success ? 'succeeded' : 'failed'}`);
  }

  /*
    When embedded inside a jupyter notebook, we communicate via the postMessage
    interface, since we are confined to an iframe.
  */
  _initMessageListeners () {
    const handlers = {
      'galyleo:fixLabels': async () => {
        this.getSubmorphsByStyleClassName('PrettyMorphList').forEach(l => l.relayout());
        this.getSubmorphsByStyleClassName('Label').forEach(l => {
          l._cachedTextBounds = null; l.fit();
        });
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
                matched = thisFileKernel == requestedFileKernel;
              }
            }
          }
          if (matched) {
            this.getSubmorphNamed('dashboard').addTable(data.table);
          }
        }
      },

      'galyleo:load': async (data) => {
        this.lastData = data;
        await this.getSubmorphNamed('dashboard').restoreFromJSONForm(data.jsonString);
        await this.whenRendered();
        const loadScreen = document.getElementById('loading-screen');
        if (loadScreen) {
          loadScreen.remove();
        }
        this._changel2lRoom_();

        this.relayout();
      },
      'galyleo:save': (data) => {
        const dashboard = this.getSubmorphNamed('dashboard');
        if (data.path) {
          this.dashboardFilePath = data.path;
          this._changel2lRoom_();
        }
        const { dashboardFilePath } = this;
        const jsonString = dashboard.prepareJSONForm();
        dashboard.clearSnapshots();
        window.parent.postMessage({ method: 'galyleo:writeFile', jsonString: jsonString, dashboardFilePath }, '*');
        window.parent.postMessage({ method: 'galyleo:setDirty', dirty: false, dashboardFilePath }, '*');
      },
      'galyleo:rename': (data) => {
        const dashboard = this.getSubmorphNamed('dashboard');
        if (data.path) {
          this.dashboardFilePath = data.path;
          this._changel2lRoom_();
        }
      },
      'galyleo:undo': (data) => {
        const { dashboardFilePath } = this;
        const dashboard = this.getSubmorphNamed('dashboard');
        dashboard.execCommand('undo');
        window.parent.postMessage({ method: 'galyleo:setDirty', dirty: dashboard.isDirty(), dashboardFilePath }, '*');
      },
      'galyleo:redo': (data) => {
        const { dashboardFilePath } = this;
        const dashboard = this.getSubmorphNamed('dashboard');
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
    const resizer = this.getSubmorphNamed('vertical resizer');
    const notebook = this.getSubmorphNamed('notebook');
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
    if (!this.respondsToVisibleWindow) return;
    this.setBounds($world.visibleBoundsExcludingTopBar ? $world.visibleBoundsExcludingTopBar() : $world.visibleBounds());
    const sideBar = this.get('dashboard side bar');
    sideBar.relayout();
    this.getSubmorphNamed('dashboard studio').height = this.height;
    const networkIndicator = this.get('top bar network indicator');
    networkIndicator.width = this.get('dashboard side bar').left - networkIndicator.left;
    this.get('dashboard').width = this.width - (sideBar.isToggled ? sideBar.width : 20);
  }

  reset () {
    this.getSubmorphNamed('jupyter').link = '';
  }
}
