import { TopBar, TopBarModel } from 'lively.ide/studio/top-bar.cp.js';
import { component, add, without } from 'lively.morphic/components/core.js';
import { Color } from 'lively.graphics/color.js';
import { pt } from 'lively.graphics/geometry-2d.js';
import { Image } from 'lively.morphic/morph.js';
import { Icon } from 'lively.morphic/text/icons.js';
import { Label } from 'lively.morphic/text/label.js';
import { UserFlap } from 'lively.user';
import { signal } from 'lively.bindings/index.js';
import { galyleoFont } from './shared.cp.js';

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
