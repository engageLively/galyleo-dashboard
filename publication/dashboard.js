/* global URLSearchParams */
import { Morph } from 'lively.morphic/morph.js';
import { component, ViewModel, without, part, add } from 'lively.morphic/components/core.js';
import { resource } from 'lively.resources/index.js';
import { Color, pt, Rectangle, Point } from 'lively.graphics/index.js';
import { ShadowObject, morph } from 'lively.morphic/index.js';
import { connect } from 'lively.bindings/index.js';
import { promise, obj } from 'lively.lang/index.js';
import { ExpressionSerializer } from 'lively.serializer2/index.js';
import { NamedFilter, SelectFilter, BooleanFilter, DateFilter, DoubleSliderFilter, ListFilter, RangeFilter, SliderFilter } from 'galyleo-dashboard/studio/filters.cp.js';
import { GalyleoDataManager, GalyleoView } from 'galyleo-dashboard/galyleo-data/galyleo-data.js';
import { GoogleChartHolder } from 'galyleo-dashboard/studio/chart-creator.cp.js';
import { LoadDialog } from 'galyleo-dashboard/studio/dashboard.cp.js';
import { DashboardCommon } from 'galyleo-dashboard/studio/dashboard-common.cp.js';

export default class PublishedDashboard extends DashboardCommon {
  static get properties () {
    return {
      bindings: {
        get () {
          return [
            {
              signal: 'extent', handler: 'relayout'
            }
          ];
        }
      },
      expose: {
        get () { return ['relayout', 'init', 'commands']; }
      }
    };
  }

  get commands () {
    return [{
      name: 'resize on client',
      exec: () => {
        this.view.extent = pt(window.innerWidth, window.innerHeight);
        this.view.position = pt(0, 0);
      }
    }];
  }

  relayout () {
    this.ui.galyleoLogo.bottomRight = this.view.innerBounds().insetBy(25).bottomRight();
    this.ui.galyleoLogo.bringToFront();
  }

  /* -- Code which clears, stores, and loads dashboards from url -- */

  // Clear the dashboard of all charts, views, tables, and filters.  This
  // is used in new, and also internally by restoreFromJSONForm.
  clear () {
    const logo = this.ui.galyleoLogo;
    super.clear();
    if (logo) {
      this.view.addMorph(logo);
    }
  }

  /**
   * Pull up the load dialog with the URL, if any, first showing the message, if
   * any
   * @param { string } url -- if non-null, the url to offer as a first choice
   * @param { string } message -- a message to display
   */
  _initURLPrompt_ (url, message) {
    if (message) {
      $world.inform(message);
    }
    const loadDialog = part(LoadDialog);
    loadDialog.init(this, url);
    loadDialog.openInWorld();
  }

  // Restore from JSON form.  This involves parsing the JSON string and
  // restoring the tables, views, filters, and charts from the saved description
  // created in _prepareSerialization.
  // parameter:
  //   storedForm -- the stored form in a JSON string
  async restoreFromJSONForm (storedForm) {
    await this._restoreFromSaved_(JSON.parse(storedForm));
  }

  // The actual body of restoreFromJSONForm.  Broken out as a separate
  // routine for testing.
  // parameter:
  //   storedForm: an object created by _perpareSerialization

  async _restoreFromSaved (storedForm = this.storedForm/* Now as an object, not a JSON string */) {
    await super._restoreFromSaved(storedForm);
    this._repositionAfterRestore_();
    await this.drawAllCharts();
  }

  // After restore is done, adjust the size to accomodate all morphs, ensuring
  // that there is enough room for the logo in the lower right corner
  // No parameters or return, just adjusts the size

  _repositionAfterRestore_ () {
    this.logo = this.ui.galyleoLogo;
    if (!this.logo) {
      return;
    }
    // take the logo out of size requirements, remembering that we need enough
    // room to position it (unlike other morphs, the logo can be repositioned, so
    // we don't need to take its position into account when resizing)
    const logoRequirement = this.logo.height + 10;
    const morphs = this.view.submorphs.filter(m => m != this.logo);
    // Figure out the width and height morphs require
    const morphsWidth = morphs.reduce((acc, morph) => Math.max(acc, morph.bounds().right()), 0);
    const morphsHeight = morphs.reduce((acc, morph) => Math.max(acc, morph.bounds().bottom()), 0);
    const morphsRequirement = pt(morphsWidth, morphsHeight).addPt(pt(0, logoRequirement));
    // Set the extent to be the max of window size and requirement, in each dimension
    this.view.extent = pt(Math.max(morphsRequirement.x, window.innerWidth), Math.max(morphsRequirement.y, window.innerHeight));
    // it seems other code repositions the  logo already...
    // this.logo.position = this.extent.subPt(this.logo.extent.addPt(pt(5, 5))); pt(1451.4, 779.6);
  }

  viewDidLoad () {
    this.init();
  }
  // init.  First, reset the error log to empty, wait for rendering, load
  // the google chart packages and make sure that the dictionaries are
  // initialized

  async init () {
    // is whenRendered Needed anymore?
    // await this.whenRendered();
    await super.init();
    const parameters = new URLSearchParams(document.location.search);
    const url = parameters.get('dashboard');
    if (url) {
      const valid = await this.loadDashboardFromURL(url);
      if (!valid) {
        this._initURLPrompt_(url);
      }
    } else {
      this._initURLPrompt_(null);
    }
    // const url = (new URL(document.location)).searchParams.get("dashboard")
    // try to load the url; if it fails, pop up the error message and the URL form
  }

  // this.loadTestDashboard('drilldown-test')
}
