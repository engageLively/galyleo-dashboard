import { GalyleoSideBar } from '../../side-bar.cp.js';
import { component } from 'lively.morphic/components/core.js';
import { pt } from 'lively.graphics';

// GalyleoSideBarJapanese.openInWorld()
const GalyleoSideBarJp = component(GalyleoSideBar, {
  name: 'galyleo/side bar/jp',
  extent: pt(324.8, 668),
  submorphs: [{
    name: 'tab switcher',
    extent: pt(364, 32.7),
    submorphs: [{
      name: 'tables tab',
      submorphs: [{
        name: 'tab label',
        textAndAttributes: ['テーブル', null]
      }]
    }, {
      name: 'filters tab',
      submorphs: [{
        name: 'tab label',
        textAndAttributes: ['フィルル', null]
      }]
    }, {
      name: 'charts tab',
      submorphs: [{
        name: 'tab label',
        textAndAttributes: ['チャート', null]
      }]
    }, {
      name: 'views tab',
      submorphs: [{
        name: 'tab label',
        textAndAttributes: ['ビュウー', null]
      }]
    }]
  }]
});

export { GalyleoSideBarJp };
