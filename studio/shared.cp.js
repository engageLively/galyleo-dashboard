import { component, part } from 'lively.morphic/components/core.js';
import { pt, LinearGradient, Color, rect } from 'lively.graphics';
import { TilingLayout, ShadowObject, Image, Label, HorizontalLayout, Morph, Text } from 'lively.morphic';
import { arr, obj, num } from 'lively.lang';
import { MorphList } from 'lively.components';

export default class GalyleoListMorph extends Morph {
  static get properties () {
    return {
      editMode: {
        defaultValue: false,
        derived: true,
        after: ['submorphs'],
        set (v) {
          this.setProperty('editMode', v);
          this.items.forEach(({ morph }) => {
            morph.editMode = v;
          });
        }
      },
      items: {
        derived: true,
        after: ['editMode'],
        set (items) {
          items.forEach((m, i) => {
            m.morph.toggleEdit(this.editMode, false);
          });
          this.getSubmorphNamed('item list').items = items;
          // ensure all labels have been loaded
          if (items.length === 0) this.editMode = false;
          this.whenRendered().then(() => this.relayout());
        },
        get () {
          return (this.getSubmorphNamed('item list') || {}).items || [];
        }
      }
    };
  }

  // Notify the list that we are about to shift a certain item.
  // In response the list remembers the current offsets of the items
  // such that it can derive a new order based on successive shiftElementBy()
  // calls

  startShiftingEntry (entry) {
    const itemList = this.getSubmorphNamed('item list');
    const item = itemList.items.find(item => item.morph === entry);
    let offsetY = 0;
    this._itemToShift = item;
    this._itemOffset = new WeakMap();
    this._dynamicOffset = 0;
    this._currentShift = 0;
    this.items.forEach(item =>
      this._itemOffset.set(item, offsetY += itemList.itemHeight)
    );
  }

  stopShifting () {
    this.stopStepping();
    this._itemToShift = false;
  }

  // Allows to push a column entry inside the list by a certain vertical delta
  // that denotes the number of pixels it is pushed by. This method then internally
  // computes a potential new order of the items after the push has been enacted

  pushShiftedElementBy (deltaY, dragEvt) {
    const scrollTriggerRange = 20;
    if (dragEvt.positionIn(this).y < scrollTriggerRange) {
      this.startStepping('_autoShiftDown');
    } else if (dragEvt.positionIn(this).y > this.height - scrollTriggerRange) {
      this.startStepping('_autoShiftUp');
    } else {
      this.stopStepping();
    }

    this._currentShift = deltaY;
    this._ensureOffsetInView();
    this._updateOrder();
  }

  // Ensure that the given bounds are contained by the list's visible view.
  // If not, scroll the list such that the bounds come into view.

  _ensureOffsetInView () {
    const offsetY = this._itemOffset.get(this._itemToShift) + this._currentShift + this._dynamicOffset;
    const itemList = this.getSubmorphNamed('item list');
    const listScrollY = itemList.scroll.y;

    if (listScrollY > offsetY) {
      itemList.scrollUp(listScrollY - offsetY);
    }

    if (listScrollY + this.height < offsetY) {
      itemList.scrollDown(offsetY - listScrollY - this.height);
    }
  }

  // updates the items orders based on the shifting in progress

  _updateOrder () {
    const deltaY = this._currentShift + this._dynamicOffset;
    const newlyOrderedItems = arr.sortBy(this.items, item => {
      return this._itemOffset.get(item) + (item === this._itemToShift ? deltaY : 0);
    });
    if (!obj.equals(newlyOrderedItems, this.items)) {
      this.items = newlyOrderedItems;
    }
  }

  _autoShiftUp () {
    this._dynamicOffset += 2;
    this._ensureOffsetInView();
    this._updateOrder();
  }

  _autoShiftDown () {
    this._dynamicOffset -= 2;
    this._ensureOffsetInView();
    this._updateOrder();
  }

  selectAll () {
    this.items.forEach(({ morph }) => morph.isSelected = true);
  }

  // Allows to enable/disable the reordering mode of columns

  toggleOrderMode () {
    this.items.forEach(({ morph }) => {
      morph.orderMode = !morph.orderMode;
    });
  }

  toggleEdit () {
    this.editMode = !this.editMode;
  }

  _positionScrollbar (scrollY) {
    const list = this.getSubmorphNamed('item list');
    const scrollBar = this.getSubmorphNamed('scroll bar');
    // scrollY = list.scroll.y;
    const padding = 8;
    scrollBar.top = num.interpolate(num.clamp(scrollY / (list.scrollExtent.y - list.height), 0, 1), padding, list.height - scrollBar.height - 3 * padding);
    scrollBar.right = this.width - padding;
  }

  async relayout () {
    const list = this.getSubmorphNamed('item list');
    const scrollBar = this.getSubmorphNamed('scroll bar');

    list.extent = this.extent.addXY(20, 20);
    scrollBar.height = (list.height - 25) * list.height / list.scrollExtent.y;
    this._positionScrollbar(list.scroll.y);
    await Promise.all(this.items.map(({ morph }) => morph.master && morph.master.whenReady()));
    this.items.map(m => {
      m.morph.width = this.width - 10;
      if (m.editMode !== this.editMode) m.editMode = this.editMode;
    });
  }

  onScrollBarDrag (evt) {
    const list = this.getSubmorphNamed('item list');
    const scrollBar = this.getSubmorphNamed('scroll bar');
    const scrollOffsetY = list.scrollExtent.y * scrollBar.top / list.height;
    list.env.renderer.getNodeForMorph(list).scrollTop = scrollOffsetY;
    this._positionScrollbar(list.env.renderer.getNodeForMorph(list).scrollTop);
  }
}

// GalyleoWindow.openInWorld()
const GalyleoWindow = component({
  name: 'galyleo window',
  borderColor: Color.rgb(127, 140, 141),
  borderRadius: 10,
  borderWidth: 2,
  clipMode: 'hidden',
  draggable: true,
  extent: pt(340.5, 257.7),
  fill: Color.rgb(215, 219, 221),
  layout: new TilingLayout({
    axis: 'column',
    orderByIndex: true,
    resizePolicies: [['window title', {
      height: 'fixed',
      width: 'fill'
    }]],
    wrapSubmorphs: false
  }),
  nativeCursor: 'grab',
  position: pt(413.3, 676),
  submorphs: [{
    type: Text,
    name: 'window title',
    textString: 'A prompt',
    acceptsDrops: false,
    extent: pt(340, 29.5),
    fill: Color.rgb(127, 140, 141),
    fixedHeight: true,
    fixedWidth: true,
    fontColor: Color.rgb(253, 254, 254),
    fontSize: 17,
    fontWeight: 'bold',
    lineWrapping: true,
    nativeCursor: 'pointer',
    padding: rect(3, 3, -3, -3),
    readOnly: true,
    selectable: false,
    textAlign: 'center'
  }]
});

// GalyleoList.openInWorld()
const GalyleoList = component({
  type: GalyleoListMorph,
  name: 'galyleo list',
  borderColor: Color.rgb(127, 140, 141),
  borderRadius: 10,
  borderWidth: 2,
  clipMode: 'hidden',
  extent: pt(191.4, 128.8),
  fill: Color.rgb(189, 195, 199),
  position: pt(467.7, 690.9),
  submorphs: [{
    type: MorphList,
    name: 'item list',
    clipMode: 'hidden',
    borderColor: Color.rgb(127, 140, 141),
    extent: pt(211.4, 148.8),
    fill: Color.rgba(255, 255, 255, 0),
    halosEnabled: false,
    itemHeight: 30,
    itemPadding: rect(3, 2, -2, -1),
    manualItemHeight: true,
    padding: rect(1, 1, 0, 29),
    position: pt(0.7, -0.3),
    renderOnGPU: true,
    scroll: pt(4, 0),
    selectedIndexes: [],
    selectionColor: Color.rgba(0, 0, 0, 0),
    touchInput: false
  }, {
    name: 'scroll bar',
    borderColor: Color.rgb(23, 160, 251),
    borderRadius: 8,
    draggable: true,
    extent: pt(4.6, 111.8),
    fill: Color.rgb(253, 254, 254),
    nativeCursor: 'grab',
    opacity: 0.75,
    position: pt(178.8, 8)
  }]
});

const MenuBarButtonDefault = component({
  name: 'menu bar button default',
  borderColor: Color.rgb(23, 160, 251),
  borderRadius: 5,
  extent: pt(127.8, 38.2),
  fill: Color.rgba(0, 0, 0, 0),
  layout: new HorizontalLayout({
    align: 'center',
    autoResize: false,
    direction: 'centered',
    orderByIndex: true,
    padding: {
      height: 0,
      width: 0,
      x: 10,
      y: 10
    },
    reactToSubmorphAnimations: false,
    renderViaCSS: true,
    resizeSubmorphs: false,
    spacing: 10
  }),
  nativeCursor: 'pointer',
  position: pt(560.7, 667.5),
  renderOnGPU: true,
  submorphs: [{
    type: Label,
    name: 'label',
    fontColor: Color.rgb(128, 128, 128),
    fontFamily: 'Barlow',
    fontSize: 15,
    fontWeight: 'bold',
    reactsToPointer: false,
    textAndAttributes: ['Load Data', null]
  }, {
    type: Image,
    name: 'icon',
    extent: pt(19.8, 19.8),
    imageUrl: 'https://fra1.digitaloceanspaces.com/typeshift/engage-lively/galyleo/add-icon.svg',
    naturalExtent: pt(150, 150),
    reactsToPointer: false
  }]
});

const MenuBarButtonHovered = component(MenuBarButtonDefault, {
  name: 'menu bar button hovered',
  fill: Color.rgba(0, 0, 0, 0.15)
});

const MenuBarButtonClicked = component(MenuBarButtonDefault, {
  name: 'menu bar button clicked',
  fill: Color.rgba(0, 0, 0, 0.25)
});

// part(MenuBarButton).openInWorld()
const MenuBarButton = component(MenuBarButtonDefault, {
  name: 'menu bar button',
  master: {
    auto: MenuBarButtonDefault,
    hover: MenuBarButtonHovered,
    click: MenuBarButtonClicked
  }
});

// PromptButtonAuto.openInWorld()
const PromptButtonAuto = component(MenuBarButtonDefault, {
  name: 'prompt button auto',
  fill: new LinearGradient({
    stops: [{ offset: 0, color: Color.rgb(237, 28, 36) }, { offset: 1, color: Color.rgb(241, 90, 36) }],
    vector: rect(0.0007483204642836916, 0.4726547905335063, 0.9985033590714326, 0.05469041893298742)
  }),
  borderRadius: 5,
  dropShadow: new ShadowObject({ distance: 4, rotation: 90, color: Color.rgba(0, 0, 0, 0.3), blur: 0 }),
  submorphs: [{
    name: 'label',
    fontColor: Color.rgb(255, 255, 255)
  }, {
    name: 'icon',
    imageUrl: 'https://fra1.digitaloceanspaces.com/typeshift/engage-lively/galyleo/add-icon-light.svg'
  }]
});

const PromptButtonClick = component(PromptButtonAuto, {
  name: 'prompt button click',
  fill: new LinearGradient({ stops: [{ offset: 0, color: Color.rgb(190, 22, 28) }, { offset: 1, color: Color.rgb(193, 72, 28) }], vector: rect(0.0007483204642836916, 0.4726547905335063, 0.9985033590714326, 0.05469041893298742) })
});

// part(PromptButton).openInWorld()
const PromptButton = component(PromptButtonAuto, {
  name: 'prompt button',
  master: { auto: PromptButtonAuto, click: PromptButtonClick }
});

export { GalyleoWindow, GalyleoList, MenuBarButton, PromptButton };
