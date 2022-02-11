import { TopBar } from 'lively.ide/studio/top-bar.cp.js';
import { component, add, without, part } from 'lively.morphic/components/core.js';
import { Color } from 'lively.graphics/color.js';
import { pt, rect } from 'lively.graphics/geometry-2d.js';
import { Image } from 'lively.morphic/morph.js';
import { GalyleoColorInput } from 'galyleo-dashboard/studio/shared.cp.js';
import { TilingLayout } from 'lively.morphic';
import { Icon } from 'lively.morphic/text/icons.js';
import { Label } from 'lively.morphic/text/label.js';
import { UserFlap } from 'lively.user/morphic/user-ui.js';

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

// GalyleoTopBar.openInWorld()
const GalyleoTopBar = component(TopBar, {
  name: 'galyleo/top bar',
  fill: Color.rgb(208, 211, 212),
  submorphs: [
    {
      name: 'horizontal layout',
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
        without('load world button'),
        without('undo button'),
        without('redo button'),
        without('save button'),
        add({
          type: Label,
          name: 'help button',
          fontColor: Color.rgb(102, 102, 102),
          fontSize: 23.064,
          nativeCursor: 'pointer',
          scale: 1.1388694516782336,
          textAndAttributes: [...Icon.textAttribute('life-ring'), '  Help', {
            fontFamily: 'Barlow',
            fontSize: 15,
            fontWeight: 'bold',
            paddingTop: '2px'
          }],
          tooltip: 'Report a bug'
        }),
        add(part(GalyleoColorInput, {
          name: 'background color input',
          extent: pt(193.8, 27),
          layout: new TilingLayout({
            axisAlign: 'center',
            orderByIndex: true,
            padding: rect(0, 2, 10, 0),
            resizePolicies: [['hex input', {
              height: 'fill',
              width: 'fixed'
            }], ['opacity input', {
              height: 'fill',
              width: 'fixed'
            }]],
            spacing: 10,
            wrapSubmorphs: false
          })
        })), {
          name: 'shape mode button',
          extent: pt(47.9, 24.7)
        }
      ] 
    },
    without('user flap')]
});

export { GalyleoTopBar };
