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
import { projectAsset } from 'lively.project/helpers.js';
import { part } from 'lively.morphic';

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
            Image: { shortcut: 'I', args: ['image', { textStyleClasses: ['fas'], paddingTop: '1px' }] },
            Path: { shortcut: 'P', args: ['bezier-curve', { fontSize: 13, paddingTop: '3px' }] },
            Polygon: { shortcut: 'Q', args: ['draw-polygon', { fontSize: 17 }] } /*,
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
        }), without('save button'), without('undo button'), without('redo button'), without('open component browser'), without('load world button'), without('comment browser button'), without('canvas mode button'), add({
          type: Image,
          name: 'galyleo logo',
          borderColor: Color.rgb(23, 160, 251),
          extent: pt(245.4, 116.6),
          imageUrl: '/local_projects/engageLively-galyleo-dashboard/assets/galyleo-logo.webp',
          naturalExtent: pt(700, 320),
          position: pt(181, 13),
          reactsToPointer: false,
          scale: 0.2505891168205277
        }, 'hand or halo mode button')
      ]
    },
    without('user flap')
  ]
});

export { GalyleoTopBar };
