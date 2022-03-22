import { component } from 'lively.morphic/components/core.js';
import { DynamicProperty, BodyControlModel } from 'lively.ide/studio/controls/body.cp.js';
import { pt } from 'lively.graphics';
import { GalyleoAddButton, GalyleoDropDownList, GalyleoDropDown } from '../shared.cp.js';
import { PROP_CONFIG } from './popups.cp.js';

export class GalyleoBodyControlModel extends BodyControlModel {
  static get properties () {
    return {
      propConfig: {
        get () {
          return PROP_CONFIG;
        }
      }
    };
  }
}

// GalyleoDynamicProperty.openInWorld()
const GalyleoDynamicProperty = component(DynamicProperty, {
  name: 'galyleo/dynamic property',
  extent: pt(208.3, 30),
  submorphs: [
    { name: 'open popup', master: GalyleoAddButton },
    {
      name: 'effect selector',
      extent: pt(127, 25),
      master: GalyleoDropDown,

      viewModel: {
        listMaster: GalyleoDropDownList
      }
    },
    { name: 'remove', master: GalyleoAddButton }
  ]
});

export { GalyleoDynamicProperty };
