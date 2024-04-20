import { TopBar, TopBarModel } from 'lively.ide/studio/top-bar.cp.js';
import { component, add, without } from 'lively.morphic/components/core.js';
import { Color } from 'lively.graphics/color.js';
import { pt } from 'lively.graphics/geometry-2d.js';
import { Image } from 'lively.morphic/morph.js';
import { Icon } from 'lively.morphic/text/icons.js';
import { Label } from 'lively.morphic/text/label.js';
import { UserFlap } from 'lively.user';
import { signal, connect } from 'lively.bindings/index.js';
import { galyleoFont } from './shared.cp.js';
import { projectAsset } from 'lively.project/helpers.js';
import { part } from 'lively.morphic';
import { BugReporter, Publisher } from './helpers.cp.js';

export default class DashboardUserFlap extends UserFlap {
  onLoad () {
    super.onLoad();
    this.whenRendered().then(_ => {
      this.dashboard = this.get('dashboard');
      /* const labelType = {
        type: 'label',
        name: 'room-name',
        fontSize: 8,
        fontFamliy: 'Noto Sans',
        fontWeight: 'bold',
        padding: Rectangle.inset(4),
        reactsToPointer: false
      }; */
    });
  }

  async updateNetworkIndicator (l2lClient = this.dashboard.l2lclient) {

  }
}

class GalyleoTopBarModel extends TopBarModel {
  static get properties () {
    return {
      activeHaloItems: {
        get () {
          return ['drag', 'rotate', 'menu', 'close'];
        }
      },
      haloFilterFn: {
        get () {
          return m => m.owner === this.primaryTarget || m === this.primaryTarget;
        }
      },
      shapeToIcon: {
        get () {
          return {
            Rectangle: { shortcut: 'R', args: ['square', { textStyleClasses: ['fas'] }] },
            Ellipse: { shortcut: 'E', args: ['circle', { textStyleClasses: ['fas'] }] },
            Image: { shortcut: 'I', args: ['image', { textStyleClasses: ['fas'], paddingTop: '1px' }] }
            /* Path: { shortcut: 'P', args: ['bezier-curve', { fontSize: 13, paddingTop: '3px' }] },
            Polygon: { shortcut: 'Q', args: ['draw-polygon', { fontSize: 17 }] },
            HTML: { shortcut: 'H', args: ['code', { paddingTop: '1px' }] } */
          };
        }
      },
      bindings: {
        /* get () {
          return [
            { target: 'save button', signal: 'onMouseDown', handler: (evt) => { if (this.ui.saveButton === evt.targetMorphs[0]) $world.execCommand('save world or project'); } },
            { target: 'text mode button', signal: 'onMouseDown', handler: 'setEditMode', converter: () => 'Text' },
            { target: 'shape mode button', signal: 'onMouseDown', handler: 'setEditMode', converter: () => 'Shape' },
            { target: 'shape mode button', signal: 'dropDownTriggered', handler: 'shapeMenu' },
            { target: 'save button', signal: 'dropDownTriggered', handler: 'saveMenu' },
            { target: 'hand or halo mode button', signal: 'dropDownTriggered', handler: 'cursorMenu' },
            { target: 'hand or halo mode button', signal: 'onMouseDown', handler: 'cursorMode' },
            { target: 'open asset browser', signal: 'onMouseDown', handler: 'browseAssets' },
            { target: 'open component browser', signal: 'onMouseDown', handler: 'interactivelyLoadComponent' },
            {
              target: 'canvas mode button',
              signal: 'onMouseDown',
              handler: 'toggleMiniMap',
              updater: `($upd, evt) => {
                if (canvasModeButton === evt.targetMorphs[0]) $upd(null);
              }`,
              varMapping: { canvasModeButton: this.ui.canvasModeButton }
            },
            { target: 'canvas mode button', signal: 'dropDownTriggered', handler: 'canvasMenu' },
            { signal: 'onKeyDown', handler: 'onKeyDown' },
            { signal: 'onKeyUp', handler: 'onKeyUp' },
            { target: 'help button', signal: 'onMouseDown', handler: 'reportBug' },
            { target: 'upload button', signal: 'onMouseDown', handler: 'publishDashboard' }
          ];
        } */

        get () {
          return super.prototype.bindings.concat([
            { target: 'help button', signal: 'onMouseDown', handler: 'reportBug' },
            { target: 'upload button', signal: 'onMouseDown', handler: 'publishDashboard' }
          ]);
        }
      }
    };
  }

  viewDidLoad () {
    super.viewDidLoad();
    /* if (config.ide.studio.worldMenuInTopBar) {
      const worldMenuButton = part(TopBarButton, {
        name: 'world menu button',
        textAndAttributes: Icon.textAttribute('burger'),
        tooltip: 'Open World Menu'
      });
      this.ui.tilingLayout.addMorphAt(worldMenuButton, 0);
      connect(worldMenuButton, 'onMouseDown', () => {
        $world.openMenu($world.menuItems());
      });
    }

    if ($world.playgroundsMode) {
      this.ui.saveButton.removeDropdown();
    } */
  }

  onMouseDown (evt) {
    const shapeSelector = this.ui.shapeModeButton.get('dropdown');
    const handHaloSelector = this.ui.handOrHaloModeButton.get('dropdown');
    const handOrHaloModeButton = this.ui.handOrHaloModeButton;
    const shapeModeButton = this.ui.shapeModeButton;

    const target = this.primaryTarget || this.world();

    if (evt.targetMorph === shapeSelector) {
      const menu = $world.openWorldMenu(evt, this.getShapeMenuItems());
      menu.position = shapeModeButton.globalBounds().bottomLeft().subPt($world.scroll);
    }
    if (evt.targetMorph === handHaloSelector) {
      const menu = $world.openWorldMenu(evt, this.getHandAndHaloModeItems());
      menu.position = handOrHaloModeButton.globalBounds().bottomLeft().subPt($world.scroll);
    }

    if (evt.targetMorph === shapeModeButton) {
      this.setEditMode('Shape');
    }

    if (evt.targetMorph === handOrHaloModeButton) {
      const currentlyShowingHaloIcon = this.ui.handOrHaloModeButton.getIcon()[0] === Icon.textAttribute('arrow-pointer')[0];
      this.setEditMode(currentlyShowingHaloIcon ? 'Halo' : 'Hand');
    }

    if (evt.targetMorph.name === 'text mode button') {
      this.setEditMode('Text');
    }

    if (evt.targetMorph.name === 'open component browser') {
      this.interactivelyLoadComponent();
    }

    if (evt.targetMorph.name === 'load world button') {
      $world.execCommand('load world');
    }
  }

  reportBug () {
    // signal(this, 'initiate bug report');
    part(BugReporter).openInWorld();
  }

  publishDashboard () {
    part(Publisher).openInWorld();
    // signal(this, 'initiate publication');
    // window.alert('publish requested');
  }
}

const GalyleoTopBar = component(TopBar, {
  name: 'galyleo/top bar',
  fill: Color.rgb(208, 211, 212),
  defaultViewModel: GalyleoTopBarModel,
  submorphs: [
    {
      name: 'tiling layout',
      submorphs: [
        add({
          type: Label,
          name: 'help button',
          lineHeight: 1,
          fontColor: Color.rgb(102, 102, 102),
          fontSize: 23.064,
          nativeCursor: 'pointer',
          scale: 1.1388694516782336,
          textAndAttributes: [...Icon.textAttribute('life-ring'), '  Help', {
            fontFamily: galyleoFont,
            fontSize: 15,
            fontWeight: 'bold',
            paddingTop: '2px'
          }],
          tooltip: 'Report a bug'
        }),
        add({
          type: Label,
          name: 'upload button',
          lineHeight: 1,
          fontColor: Color.rgb(102, 102, 102),
          fontSize: 23.064,
          nativeCursor: 'pointer',
          scale: 1.1388694516782336,
          textAndAttributes: [...Icon.textAttribute('cloud-upload'), '  Publish', {
            fontFamily: galyleoFont,
            fontSize: 15,
            fontWeight: 'bold',
            paddingTop: '2px'
          }],
          tooltip: 'Publish this dashboard'
        }),
        without('save button'),
        without('open component browser'),
        without('load world button'),
        without('open asset browser'),
        without('canvas mode button'),
        add({
          type: Image,
          name: 'galyleo logo',
          borderColor: Color.rgb(23, 160, 251),
          extent: pt(245.4, 116.6),
          imageUrl: projectAsset('galyleo-logo.webp'),
          naturalExtent: pt(700, 320),
          position: pt(181, 13),
          reactsToPointer: false,
          scale: 0.2505891168205277
        }, 'hand or halo mode button')
      ]
    },
    without('right UI wrapper')
  ]
});

export { GalyleoTopBar };
