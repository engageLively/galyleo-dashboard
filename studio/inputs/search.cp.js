import { InputLineDefault } from 'lively.components/inputs.cp.js';
import { component } from 'lively.morphic/components/core.js';
import { ShadowObject } from 'lively.morphic';
import { pt, Color } from 'lively.graphics';
import { galyleoFont } from '../shared.cp.js';

// GalyleoSearch.openInWorld()
const GalyleoSearch = component(InputLineDefault, {
  name: 'galyleo search',
  borderRadius: 50,
  dropShadow: new ShadowObject({ rotation: 90, color: Color.rgba(102, 102, 102, 0.65), blur: 8 }),
  extent: pt(318.1, 28.8),
  fontFamily: galyleoFont,
  fontSize: 15,
  renderOnGPU: true,
  submorphs: [{
    name: 'placeholder',
    extent: pt(59, 28.8),
    fontFamily: galyleoFont,
    fontSize: 15
  }]
});

export { GalyleoSearch };
