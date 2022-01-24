import { InputLineDefault } from 'lively.components/inputs.cp.js';
import { component } from 'lively.morphic/components/core.js';
import { ShadowObject } from 'lively.morphic';
import { pt } from 'lively.graphics';

// GalyleoSearch.openInWorld()
const GalyleoSearch = component(InputLineDefault, {
  name: 'galyleo search',
  borderRadius: 50,
  dropShadow: new ShadowObject({ distance: 0, blur: 0 }),
  extent: pt(318.1, 28.8),
  fontFamily: 'Barlow',
  fontSize: 15,
  renderOnGPU: true,
  submorphs: [{
    name: 'placeholder',
    extent: pt(59,28.8),
    fontFamily: 'Barlow',
    fontSize: 15
  }]
});

export { GalyleoSearch };
