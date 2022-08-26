import { GalyleoTopBar } from '../../top-bar.cp.js';
import { Icon, component } from 'lively.morphic';

// GalyleoTopBarJp.openInWorld();
const GalyleoTopBarJp = component(GalyleoTopBar, {
  name: 'galyleo/top bar/jp',
  submorphs: [{
    name: 'horizontal layout',
    submorphs: [{
      name: 'help button',
      textAndAttributes: [...Icon.textAttribute('life-ring'), '  ヘルプ', {
        fontFamily: 'Barlow',
        fontSize: 15,
        fontWeight: 'bold',
        paddingTop: '2px'
      }]
    }]
  }]
});

export { GalyleoTopBarJp };
