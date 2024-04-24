import { GalyleoTopBar } from '../../top-bar.cp.js';
import { Icon, component } from 'lively.morphic';

const GalyleoTopBarJp = component(GalyleoTopBar, {
  name: 'galyleo/top bar/jp',
  submorphs: [{
    name: 'tiling layout',
    submorphs: [{
      name: 'help button',
      textAndAttributes: [...Icon.textAttribute('life-ring'), '  ヘルプ', {
        fontFamily: 'Noto Sans',
        fontSize: 15,
        fontWeight: 'bold',
        paddingTop: '2px'
      }]
    }, {
      name: 'upload button',
      value: [...Icon.textAttribute('cloud-arrow-up'), ' 公開する', {
        fontFamily: 'Noto Sans',
        fontSize: 15,
        fontWeight: 'bold',
        paddingTop: '2px'
      }]
    }]
  }]
});

export { GalyleoTopBarJp };
