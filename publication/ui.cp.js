
import { LivelyWorld } from 'lively.ide/world.js';
import { component } from 'lively.morphic/components/core.js';
import { PublishedDashboard } from './dashboard.js';
import { pt, Color } from 'lively.graphics';

export class GalyleoDashboardWorld extends LivelyWorld {
  static get properties () {
    return {
      loadingScreen: {}
    };
  }

  get __loading_html__ () {
    return `
      <style type="text/css" id="Galyleo_EA369109_AD59_458B_BD60_7506B51416D7-Nunito">@import url("https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap");</style>
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
<script> window.SERVER_URL="${this.serverURL}" </script>
<link type="text/css" rel="stylesheet" id="lively-font-awesome" href="/lively.morphic/assets/font-awesome/css/font-awesome.css">
<link type="text/css" rel="stylesheet" id="lively-font-inconsolata" href="/lively.morphic/assets/inconsolata/inconsolata.css">
<style type="text/css" id="WorldLandingPage_7068CDA9_749E_4EC1_9BC4_50DF06EAA2BA-Nunito">@import url("https://fonts.googleapis.com/css?family=Nunito:200,200i,300,300i,400,400i,600,600i,700,700i,800,800i,900,900i&display=swap");</style>`;
  }

  onLoad () {
    super.onLoad();
    // document.getElementById('loading-screen').remove();
  }
}

// part(GalyleoDashboardPublication).openInWorld()
const GalyleoDashboardPublication = component({
  name: 'galyleo dashboard',
  defaultViewModel: PublishedDashboard,
  extent: pt(800, 800),
  fill: Color.darkGray,
  clipMode: 'hidden',
  submorphs: []
});

export { GalyleoDashboardPublication };
