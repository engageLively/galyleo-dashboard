import { component } from 'lively.morphic/components/core.js';
import { PropertySection } from 'lively.ide/studio/controls/section.cp.js';
import { Color } from 'lively.graphics';
import { GalyleoAddButton } from '../shared.cp.js';

const GalyleoPropertySection = component(PropertySection, {
  name: 'galyleo/property section',
  fill: Color.transparent,
  submorphs: [
    {
      name: 'h floater',
      submorphs: [
        {
          name: 'section headline',
          fontColor: Color.rgb(66, 73, 73)
        },
        {
          name: 'add button',
          master: GalyleoAddButton
        },
        {
          name: 'remove button',
          master: GalyleoAddButton,
          visible: false
        }
      ]
    }
  ]
});

// GalyleoPropertySectionInactive.openInWorld()
const GalyleoPropertySectionInactive = component(GalyleoPropertySection, {
  name: 'galyleo/property section/inactive',
  submorphs: [
    { name: 'h floater', opacity: 0.5 }
  ]
});

export { GalyleoPropertySectionInactive, GalyleoPropertySection };
