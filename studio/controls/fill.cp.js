import { component } from 'lively.morphic/components/core.js';
import { FillControl } from 'lively.ide/studio/controls/fill.cp.js';
import { Color } from 'lively.graphics';
import { GalyleoColorInput } from '../shared.cp.js';
import { TilingLayout } from 'lively.morphic';
import { rect } from 'lively.graphics/geometry-2d.js';
const placeholderImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAbZJREFUaEPtmT0vBUEUhp/rIyJBJKKQaCQahUKjpVFoFEqVSBCtPyD+gFZC4Rf4bBX+gMRnr6KhIxEhIScZyWays8a9O7M7nCnvvTvnfc77nrnZ3QaJr0bi+lGAqh1UB+ruQC8wA4wAPZHFvgB3wCnw7KpdFCERvwZ0RxZul3sFtl0QRQDzwHjF4r/L3wAHeVqKANYBcaEOSyK09VuADeuCzcgkXvWLHPDaICCUV30FUAfcHdAIeXVAI6QRarEDGqEWG6h/ZP8xQl3Amwe41zEeO0JjwDSwC3z8AFE7gAFgGRAHLoCTOgEMAW3AvUNUpxE/mPn+ELgugIjmgNwzrwDtJhp5N+B5t6fvwA7w5ICIAiAztACMGhEPwJ6V70lg1iHy0UALjL2iAMhATlmVb4F989kwsGjccaXlEjiuAkC6Lt3PO8nOgHNgFejzODKPgCvrd0Ed6De5dz0z+jTZzg5tEUfePAQD6ACWADl5ylz2PAQDmAMmylSe2Ss7D8EAAmmv5hQKCaMOeHUgoAVe9f/0w93kH68n/4JD4p30K6aA81ne1vqatbxeNreTOtBc38q7KnkHvgAu0nMxVZqzQwAAAABJRU5ErkJggg==';

// import { part } from 'lively.morphic/components/core.js'
// part(GalyleoFillControl).openInWorld()
const GalyleoFillControl = component(FillControl, {
  name: 'galyleo/fill control',
  layout: new TilingLayout({
    axis: 'column',
    hugContentsVertically: true,
    orderByIndex: true,
    padding: rect(0, 10, 0, 0),
    resizePolicies: [['h floater', {
      height: 'fixed',
      width: 'fill'
    }], ['fill color input', {
      height: 'fixed',
      width: 'fill'
    }]],
    spacing: 10,
    wrapSubmorphs: false
  }),
  visible: true,
  viewModel: {
    placeholderImage
  },
  fill: Color.transparent,
  submorphs: [
    {
      name: 'h floater',
      submorphs: [
        {
          name: 'section headline',
          fontColor: Color.rgb(66, 73, 73)
        }
      ]
    }, {
      name: 'fill color input',
      master: GalyleoColorInput,
      viewModel: {
        activeColor: Color.gray
      }
    }, {
      name: 'image control',
      submorphs: [{
        name: 'image marker', fontColor: Color.rgbHex('424949')
      }, {
        name: 'image cell',
        submorphs: [{
          name: 'image container',
          imageUrl: placeholderImage
        }]
      }]
    }]
});

export { GalyleoFillControl };
