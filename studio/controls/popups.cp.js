import { ShadowPopup, FlipPopup, TiltPopup, CursorPopup, BlurPopup, OpacityPopup } from 'lively.ide/studio/controls/popups.cp.js';
import { component, part, add, without } from 'lively.morphic/components/core.js';
import { Color } from 'lively.graphics';
import { TilingLayout } from 'lively.morphic';
import { rect } from 'lively.graphics/geometry-2d.js';
import { GalyleoNumberInput, CloseButtonFloat, WindowHeader, GalyleoDropDown, GalyleoColorInput } from '../shared.cp.js';

// part(GalyleoShadowPopup).openInWorld()
const GalyleoShadowPopup = component(ShadowPopup, {
  name: 'galyleo/shadow popup',
  fill: Color.rgb(215, 219, 221),
  submorphs: [
    {
      name: 'header menu',
      master: WindowHeader,
      submorphs: [
        without('close button')
      ]
    },
    add(part(CloseButtonFloat, { name: 'h float' }), 'shadow controls'),
    {
      name: 'shadow controls',
      layout: new TilingLayout({
        justifySubmorphs: 'spaced',
        orderByIndex: true,
        padding: rect(19, 10, 21, 0),
        spacing: 10
      }),
      submorphs: [
        { name: 'x offset', master: GalyleoNumberInput },
        { name: 'blur input', master: GalyleoNumberInput },
        { name: 'y offset', master: GalyleoNumberInput },
        { name: 'spread input', master: GalyleoNumberInput }
      ]
    },
    { name: 'shadow color input', master: GalyleoColorInput },
    {
      name: 'footer',
      borderWidth: { left: 0, top: 1, right: 0, bottom: 0 },
      submorphs: [
        {
          name: 'h wrapper',
          submorphs: [
            { name: 'fast shadow checkbox', fill: Color.orange },
            { name: 'prop label', fontColor: Color.rgb(68, 68, 68) }
          ]
        }
      ]
    }]
});

const GalyleoInsetShadowPopup = component(GalyleoShadowPopup, {
  name: 'galyleo/inset shadow popup',
  submorphs: [{
    name: 'header menu',
    submorphs: [{
      name: 'title',
      textAndAttributes: ['Inset Shadow', null]
    }]
  }]
});

// GalyleoOpacityPopup.openInWorld()
const GalyleoOpacityPopup = component(OpacityPopup, {
  name: 'galyleo/opacity popup',
  fill: Color.rgb(215, 219, 221),
  submorphs: [
    {
      name: 'header menu',
      master: WindowHeader,
      submorphs: [
        without('close button')
      ] // this should also disqualify the master from traversing other newly added morphs with the same name
    },
    add(part(CloseButtonFloat, { name: 'h float' }), 'footer'),
    {
      name: 'footer',
      submorphs: [
        { name: 'value input', master: GalyleoNumberInput }
      ]
    }
  ]
});

// GalyleoBlurPopup.openInWorld()
const GalyleoBlurPopup = component(BlurPopup, {
  name: 'galyleo/blur popup',
  master: GalyleoOpacityPopup,
  submorphs: [
    {
      name: 'header menu',
      submorphs: [
        without('close button')
      ]
    },
    add(part(CloseButtonFloat, { name: 'h float' }), 'footer')
  ]
});

// GalyleoCursorPopup.openInWorld()
const GalyleoCursorPopup = component(CursorPopup, {
  name: 'galyleo/cursor popup',
  master: GalyleoOpacityPopup,
  submorphs: [
    {
      name: 'header menu',
      submorphs: [
        without('close button')
      ]
    },
    add(part(CloseButtonFloat, { name: 'h float' }), 'footer'),
    {
      name: 'footer',
      submorphs: [
        { name: 'selection input', master: GalyleoDropDown }
      ]
    }
  ]
});

// GalyleoTiltPopup.openInWorld()
const GalyleoTiltPopup = component(TiltPopup, {
  name: 'galyleo/tilt popup',
  master: GalyleoOpacityPopup,
  submorphs: [
    {
      name: 'header menu',
      submorphs: [
        without('close button')
      ]
    },
    add(part(CloseButtonFloat, { name: 'h float' }), 'footer')
  ]
});

// GalyleoFlipPopup.openInWorld()
const GalyleoFlipPopup = component(FlipPopup, {
  name: 'galyleo/flip popup',
  master: GalyleoOpacityPopup,
  submorphs: [
    {
      name: 'header menu',
      submorphs: [
        without('close button')
      ]
    },
    add(part(CloseButtonFloat, { name: 'h float' }), 'footer')
  ]
});

export const PROP_CONFIG = {
  'Drop shadow': {
    accessor: 'dropShadow',
    defaultModelProps: (target) => {
      const v = target.dropShadow;
      const opts = { fastShadow: v && v.fast, insetShadow: false };
      if (v) opts.shadowValue = v;
      return opts;
    },
    popupComponent: GalyleoShadowPopup,
    resetValue: null
  },
  'Inner shadow': {
    accessor: 'dropShadow',
    defaultModelProps: (target) => {
      const v = target.dropShadow;
      const opts = { fastShadow: v && v.fast, insetShadow: true };
      if (v) opts.shadowValue = v;
      return opts;
    },
    popupComponent: GalyleoInsetShadowPopup,
    resetValue: null
  },
  Opacity: {
    accessor: 'opacity',
    defaultModelProps: (target) => {
      return { value: target.opacity };
    },
    popupComponent: GalyleoOpacityPopup,
    resetValue: 1
  },
  Blur: {
    accessor: 'blur',
    defaultModelProps: target => {
      return { value: target.blur };
    },
    popupComponent: GalyleoBlurPopup,
    resetValue: 0
  },
  Cursor: {
    accessor: 'nativeCursor',
    popupComponent: GalyleoCursorPopup,
    resetValue: 'auto',
    defaultModelProps: target => {
      return { selection: target.nativeCursor };
    }
  },
  Tilted: {
    accessor: 'tilted',
    popupComponent: GalyleoTiltPopup,
    resetValue: 0,
    defaultModelProps: target => {
      return { value: target.tilted };
    }
  },
  Flipped: {
    accessor: 'flipped',
    popupComponent: GalyleoFlipPopup,
    resetValue: 0,
    defaultModelProps: target => {
      return { value: target.flipped };
    }
  }
};

export {
  GalyleoShadowPopup, GalyleoOpacityPopup, GalyleoBlurPopup,
  GalyleoCursorPopup, GalyleoTiltPopup, GalyleoFlipPopup
};
