import { component, part } from 'lively.morphic';
import Galyleo from '../../ui.cp.js';
import { pt, Color } from 'lively.graphics';
import { GalyleoTopBarJp } from './top-bar.cp.js';
import { Dashboard } from '../../dashboard.cp.js';
import { GalyleoSideBarJp } from './side-bar.cp.js';

const GalyleoDashboardStudioJP = component({
  name: 'galyleo dashboard studio',
  defaultViewModel: Galyleo,
  extent: pt(800, 800),
  fill: Color.darkGray,
  clipMode: 'hidden',
  submorphs: [
    part(GalyleoTopBarJp, { name: 'top bar' }),
    {
      defaultViewModel: Dashboard,
      name: 'dashboard',
      extent: pt(715.4, 788.5),
      position: pt(0.9, 48.8),
      clipMode: 'auto'
    },
    part(GalyleoSideBarJp, {
      name: 'side bar',
      position: pt(475.5, -0.6),
      height: 800,
      viewModel: {
        isHaloItem: false
      }
    })
  ]
});

export { GalyleoDashboardStudioJP as GalyleoDashboardStudio };
