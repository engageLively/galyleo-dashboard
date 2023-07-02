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
import { config, part } from 'lively.morphic';
import { TopBarButton } from 'lively.ide/studio/top-bar-buttons.cp.js';

export default class DashboardUserFlap extends UserFlap {
  onLoad () {
    super.onLoad();
    this.whenRendered().then(_ => {
      this.dashboard = this.get('dashboard');
      /* const labelType = {
        type: 'label',
        name: 'room-name',
        fontSize: 8,
        fontFamliy: 'Helvetica Neue, Verdana, Sans Serif',
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

    if (evt.targetMorph.name === 'undo button') {
      target.execCommand('undo');
    }

    if (evt.targetMorph.name === 'redo button') {
      target.execCommand('redo');
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

    if (evt.targetMorph.name === 'comment browser button') {
      this.toggleCommentBrowser();
    }
  }

  reportBug () {
    signal(this, 'initiate bug report');
  }

  publishDashboard () {
    signal(this, 'initiate publication');
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
          type: Image,
          name: 'galyleo logo',
          borderColor: Color.rgb(23, 160, 251),
          extent: pt(245.4, 116.6),
          imageUrl: 'https://i0.wp.com/engagelively.com/wp-content/uploads/2019/12/galyleo-logo.png?fit=700%2C320&ssl=1',
          naturalExtent: pt(700, 320),
          reactsToPointer: false,
          scale: 0.2505891168205277
        }, 'halo mode button'),
        without('open component browser'),
        without('comment browser button'),
        without('load world button'),
        without('undo button'),
        without('redo button'),
        without('save button'),
        without('canvas mode button'),
        /* {
          name: 'text mode button',
          visible: true
        }, */
        add({
          type: Label,
          name: 'help button',
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
        }), add({
          type: Label,
          name: 'upload button',
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
        }), {
          name: 'shape mode button',
          extent: pt(47.9, 24.7)
        }, without('mini map button')
      ]
    },
    without('user flap')]
});

export { GalyleoTopBar };
