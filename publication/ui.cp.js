import { LivelyWorld } from 'lively.ide/world.js';
import { component } from 'lively.morphic/components/core.js';
import PublishedDashboard from './dashboard.js';
import { pt, Color } from 'lively.graphics';
import { part } from 'lively.morphic';
import { galyleoFont } from '../studio/shared.cp.js';

export class GalyleoDashboardWorld extends LivelyWorld {
  static get properties () {
    return {
      loadingScreen: {}
    };
  }

  get __loading_html__ () {
    return `
      <style>
        ${this.loadingScreen.cssDeclaration}
      </style>
      ${this.loadingScreen.html}
    `;
  }

  get serverURL () {
    return 'https://matt.engagelively.com';
  }

  get __head_html__ () {
    return `
<script> window.SERVER_URL="${this.serverURL}" </script>`;
  }

  onLoad () {
    super.onLoad();
    // document.getElementById('loading-screen').remove();
  }
}

// part(GalyleoDashboardPublication).openInWorld();
const GalyleoDashboardPublication = component({
  name: 'galyleo dashboard',
  defaultViewModel: PublishedDashboard,
  extent: pt(800, 800),
  fill: Color.darkGray,
  clipMode: 'hidden',
  submorphs: [
    { position: pt(255, 84), extent: pt(255, 84), name: 'galyleo-logo', submorphs: [{ type: 'text', position: pt(7, 33), fontFamily: galyleoFont, fontSize: 16, textString: 'powered By', extent: pt(80, 19) }, { type: 'image', imageUrl: 'https://repository-images.githubusercontent.com/359242321/7b12b200-b586-11eb-9cb5-397325021b06', extent: pt(700, 320), scale: 0.22, position: pt(94, 7), name: 'logo' }] }]
});

export { GalyleoDashboardPublication };
