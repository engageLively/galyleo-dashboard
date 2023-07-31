import { component, without, add, ViewModel, part } from 'lively.morphic/components/core.js';
import { pt, LinearGradient, Color, rect } from 'lively.graphics';
import { TilingLayout, Icon, ShadowObject, Image, Label, Morph, Text } from 'lively.morphic';
import { arr, obj, num } from 'lively.lang';
import { MorphList, DropDownListModel } from 'lively.components';
import { connect, noUpdate } from 'lively.bindings';
import { SystemList } from 'lively.ide/styling/shared.cp.js';
import { DropDownList } from 'lively.components/list.cp.js';
import { DarkNumberIconWidget, EnumSelector, TextInput, PropertyLabelHovered, PropertyLabelActive, PropertyLabel, AddButton } from 'lively.ide/studio/shared.cp.js';
import { ColorInput } from 'lively.ide/styling/color-picker.cp.js';
import { ConfirmPromptModel } from 'lively.components/prompts.cp.js';
import { ButtonModel } from 'lively.components/buttons.js';
import { projectAsset } from 'lively.project/helpers.js';

const galyleoFont = 'Noto Sans';

export class SelectableEntryModel extends ViewModel {
  static wrap (entryName, opts) {
    const entry = part(SelectableEntry, { // eslint-disable-line no-use-before-define
      viewModel: {
        entryName,
        ...opts
      }
    });

    return { isListItem: true, morph: entry };
  }

  static get properties () {
    return {
      entryName: {
        // the actual name this entry represents
      },
      entryList: {
        // a reference to the list that manages this entry
      },
      orderMode: {
        // wether or not the element can be reordered via dragging
        defaultValue: false
      },
      isSelected: {
        // wether or not the item is checked
      },
      expose: {
        get () {
          return ['toggleEdit', 'isSelected', 'editMode', 'orderMode', 'entryName'];
        }
      },
      bindings: {
        get () {
          return [
            { signal: 'onMouseUp', handler: 'toggleSelect' },
            { signal: 'onDrag', handler: 'onDrag', override: true },
            { signal: 'onDragStart', handler: 'onDragStart', override: true },
            { signal: 'onDragEnd', handler: 'onDragEnd', override: true }
          ];
        }
      }
    };
  }

  onDrag ($onDrag, evt) {
    const { absDragDelta } = evt.state;
    this.shiftOrder(absDragDelta.y, evt);
  }

  onDragStart (evt) {
    this.startShifting();
  }

  onDragEnd (evt) {
    this.stopShifting();
  }

  toggleEdit () {
    // do nothing since we are not editable
  }

  startShifting () {
    this.entryList.startShiftingEntry(this.view);
    this.master = SelectableEntryDragged; // eslint-disable-line no-use-before-define
  }

  stopShifting () {
    this.master = SelectableEntry; // eslint-disable-line no-use-before-define
    this.entryList.stopShifting();
  }

  shiftOrder (verticalOffset, evt) {
    this.entryList.pushShiftedElementBy(verticalOffset, evt);
  }

  onRefresh () {
    const { view, ui: { checkbox, entryName, dragControl } } = this;
    view.draggable = this.orderMode;
    view.master = this.orderMode
      ? {
          auto: SelectableEntry, click: SelectableEntryDragged // eslint-disable-line no-use-before-define
        }
      : SelectableEntry; // eslint-disable-line no-use-before-define
    entryName.value = this.entryName;
    // dragControl.draggable = this.orderMode;
    checkbox.master = this.isSelected ? CheckboxChecked : CheckboxUnchecked; // eslint-disable-line no-use-before-define
    const updateElements = () => {
      if (checkbox.visible !== !this.orderMode) {
        checkbox.visible = !this.orderMode;
      }
      if (dragControl.visible !== !!this.orderMode) {
        dragControl.visible = !!this.orderMode;
      }
    };
    updateElements();
  }

  toggleSelect () {
    this.isSelected = !this.isSelected;
  }
}

export class TableEntryMorph extends Morph {
  static get properties () {
    return {
      onDelete: {
        doc: 'This is a closure that is invoked in response to clicking in the remove button of this entry',
        serialize: false
      },
      onConfig: {
        doc: 'This is a closure that is invoked in response to clicking in the config or preview button',
        serialize: false
      },
      onData: {
        doc: 'This is a closure that is invoked in response to clicking on the preview button'
      },
      value: {
        derived: true,
        set (v) {
          this.setProperty('value', v);
        }
      },
      editMode: {
        defaultValue: false,
        after: ['submorphs'],
        set (active) {
          if (this.submorphs.length > 0) { this.toggleEdit(active); }
        }
      }
    };
  }

  static wrapVisualDataEntry (visualDataEntryName, opts = {}) {
    const entry = part(TableEntryVisual, opts); // eslint-disable-line no-use-before-define
    entry.value = visualDataEntryName;
    entry.relayout();
    return { isListItem: true, morph: entry, value: visualDataEntryName };
  }

  static wrapDataEntry (dataEntryName, opts = {}) {
    const entry = part(TableEntry, opts); // eslint-disable-line no-use-before-define
    entry.value = dataEntryName;
    entry.relayout();
    return { isListItem: true, morph: entry, value: dataEntryName };
  }

  static wrapVisualEntry (filterOrChartName, opts = {}) {
    const entry = part(TableEntryEdit, opts); // eslint-disable-line no-use-before-define
    entry.value = filterOrChartName;
    entry.relayout();
    return { isListItem: true, morph: entry, value: filterOrChartName };
  }

  onMouseUp (evt) {
    const removeButton = this.getSubmorphNamed('remove button');
    const configButton = this.getSubmorphNamed('edit config button');
    const dataButton = this.getSubmorphNamed('edit data button');
    super.onMouseUp(evt);
    if (evt.targetMorph === removeButton) {
      this.delete();
    }
    if (evt.targetMorph === configButton) {
      this.openConfig();
    }
    if (evt.targetMorph === dataButton) {
      this.openData();
    }
  }

  delete () {
    if (this.onDelete) this.onDelete();
  }

  openConfig () {
    if (this.onConfig) this.onConfig();
  }

  openData () {
    if (this.onData) this.onData();
  }

  relayout () {
    const entryName = this.getSubmorphNamed('entry name');
    entryName.value = this.value;
  }

  async toggleEdit (active, animated = true) {
    this.setProperty('editMode', active);
    const toggle = () => {
      const removeButton = this.getSubmorphNamed('remove button');
      const configButton = this.getSubmorphNamed('edit config button');
      const dataButton = this.getSubmorphNamed('edit data button');
      removeButton.visible = removeButton.isLayoutable = active;
      if (configButton) configButton.visible = configButton.isLayoutable = !active;
      if (dataButton) dataButton.visible = dataButton.isLayoutable = !active;
    };
    if (animated) {
      this.layout.renderViaCSS = false; // this should be done automatically
      await this.withAnimationDo(toggle, {
        duration: 300
      });
      this.layout.renderViaCSS = true;
    } else {
      toggle();
    }
  }
}

export class GalyleoListMorph extends Morph {
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

  onLoad () {
    connect(this, 'extent', this, 'relayout');
    connect(this.get('item list'), 'onScroll', this, 'relayout');
    connect(this.get('scroll bar'), 'onDrag', this, 'onScrollBarDrag');
    this.get('item list').scroll = pt(0, 0);
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
    this.relayout();
  }

  toggleEdit () {
    this.editMode = !this.editMode;
  }

  _positionScrollbar (scrollY) {
    const list = this.getSubmorphNamed('item list');
    const scrollBar = this.getSubmorphNamed('scroll bar');
    // scrollY = list.scroll.y;
    const padding = 8;
    this.withMetaDo({ skipReconciliation: true }, () => {
      scrollBar.top = num.interpolate(num.clamp(scrollY / (list.scrollExtent.y - list.height), 0, 1), padding, list.height - scrollBar.height - 3 * padding);
      scrollBar.right = this.width - padding;
    });
  }

  async relayout () {
    this.withMetaDo({ skipReconciliation: true }, async () => {
      const list = this.getSubmorphNamed('item list');
      const scrollBar = this.getSubmorphNamed('scroll bar');

      list.extent = this.extent.addXY(20, 20);
      scrollBar.height = (list.height - 25) * list.height / list.scrollExtent.y;
      this._positionScrollbar(list.scroll.y);
      this.items.map(m => {
        m.morph.width = this.width - 10;
        if (m.editMode !== this.editMode) m.editMode = this.editMode;
      });
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

const GalyleoTextInput = component(TextInput, {
  name: 'galyleo/text input',
  borderColor: Color.rgbHex('8E9B9B'),
  borderWidth: 1,
  fontSize: 14,
  padding: rect(2, 2, 0, 0),
  fill: Color.rgba(0, 0, 0, 0.15),
  fontColor: Color.black
});

// m = part(DarkNumberIconWidget).openInWorld()
// m.master = GalyleoNumberInput
const GalyleoNumberInput = component(DarkNumberIconWidget, {
  name: 'galyleo/number input',
  borderColor: Color.rgbHex('8E9B9B'),
  borderWidth: 1,
  fill: Color.rgba(0, 0, 0, 0.15),
  submorphs: [{
    name: 'interactive label',
    fontColor: Color.rgba(100, 100, 100, .5)
  }, {
    name: 'value',
    cursorColor: Color.black,
    fontColor: Color.black
  }]
});

const GalyleoEnumSelector = component(EnumSelector, {
  borderColor: Color.rgbHex('8E9B9B'),
  borderWidth: 1,
  fill: Color.rgba(0, 0, 0, 0.15),
  submorphs: [{
    name: 'label',
    fontColor: Color.black
  }]
});

const GalyleoAddButtonDefault = component(AddButton, {
  name: 'galyleo/add button/default',
  fontColor: Color.rgb(66, 73, 73)
});

const GalyleoAddButtonHovered = component(AddButton, {
  name: 'galyleo/add button/hovered',
  fontColor: Color.rgb(66, 73, 73),
  fill: Color.black.withA(.1)
});

// GalyleoAddButtonActive.openInWorld()
const GalyleoAddButtonActive = component(GalyleoAddButtonHovered, {
  name: 'galyleo/add button/active',
  fontColor: Color.white,
  fill: Color.rgbHex('F57F17')
});

// GalyleoAddButton.openInWorld()
const GalyleoAddButton = component(AddButton, {
  name: 'galyleo/add button',
  master: { auto: GalyleoAddButtonDefault, hover: GalyleoAddButtonHovered },
  fontColor: Color.rgb(66, 73, 73)
});

// GalyleoPropertyLabel.openInWorld();
const GalyleoPropertyLabel = component(PropertyLabel, {
  name: 'galyleo/property label',
  fontColor: Color.rgb(66, 73, 73)
});

// GalyleoPropertyLabelActive.openInWorld();
const GalyleoPropertyLabelActive = component(PropertyLabelActive, {
  name: 'galyleo/property label/active',
  fontColor: Color.rgb(255, 255, 255),
  fill: Color.rgb(251, 140, 0),
  extent: pt(31.2, 34)
});

// GalyleoPropertyLabelHovered.openInWorld();
const GalyleoPropertyLabelHovered = component(PropertyLabelHovered, {
  name: 'galyleo/property label/hovered',
  fill: Color.rgb(172, 172, 172),
  fontColor: Color.rgb(66, 73, 73)
});

// ColorInput.openInWorld()
// part(GalyleoTextInput, { readOnly: true, needsDocument: false })
// part(GalyleoNumberInput).openInWorld()
// part(GalyleoColorInput).openInWorld()
const GalyleoColorInput = component(ColorInput, {
  name: 'galyleo/color input',
  layout: new TilingLayout({
    axisAlign: 'center',
    orderByIndex: true,
    padding: rect(20, 2, -10, 0),
    resizePolicies: [['hex input', {
      height: 'fill',
      width: 'fixed'
    }], ['opacity input', {
      height: 'fill',
      width: 'fixed'
    }]],
    spacing: 10,
    wrapSubmorphs: false
  }),
  submorphs: [{
    name: 'hex input',
    readOnly: true,
    needsDocument: false,
    master: GalyleoTextInput
  }, {
    name: 'opacity input',
    master: GalyleoNumberInput
  }]
});

// GalyleoWindow.openInWorld()
const GalyleoWindow = component({
  name: 'galyleo/window',
  dropShadow: new ShadowObject({ color: Color.rgba(0, 0, 0, 0.4086), blur: 20 }),
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

// part(GalyleoDropDownList, { items: ['hello', 'world', 'there']}).openInWorld()
const GalyleoDropDownList = component(SystemList, {
  name: 'galyleo/drop down list',
  fontFamily: galyleoFont,
  fontSize: 14,
  fill: Color.rgb(230, 230, 230),
  selectionFontColor: Color.white,
  selectionColor: Color.rgb(127, 140, 141),
  itemBorderRadius: 3
});

export class GalyleoDropDownListModel extends DropDownListModel {
  static get properties () {
    return {
      placeholder: {
        defaultValue: 'Nothing selected'
      },
      listMaster: {
        initialize () {
          this.listMaster = GalyleoDropDownList;
        }
      },
      expose: {
        get () {
          return [...super.prototype.expose, 'toggleError'];
        }
      }
    };
  }

  updateListMorphIfNeeded () {
    if (super.updateListMorphIfNeeded()) {
      // insert the placeholder
      this.listMorph.items = [{
        isListItem: true,
        isPlaceholder: true,
        value: '__no_selection__',
        label: [this.placeholder, {
          fontStyle: 'italic', opacity: 0.5
        }]
      }, ...this.items.filter(item => !item.isPlaceholder)];
    }
  }

  toggleError () {
    this.view.master = GalyleoDropDownError; // eslint-disable-line no-use-before-define
  }

  adjustLableFor (item) {
    let label = item.label || [item.string, null];
    this.label = { value: label };
  }

  async toggleList () {
    await super.toggleList();
    this.listMorph.update();
    if (this.view.master.auto === GalyleoDropDownError) { // eslint-disable-line no-use-before-define
      this.view.master = GalyleoDropDown; // eslint-disable-line no-use-before-define
    }
  }
}

const GalyleoDropDownAuto = component(DropDownList, {
  name: 'galyleo/drop down/auto',
  defaultViewModel: GalyleoDropDownListModel,
  fill: Color.rgba(0, 0, 0, 0.15),
  borderWidth: 1,
  borderColor: Color.rgbHex('8E9B9B'),
  borderRadius: 30,
  layout: new TilingLayout({
    align: 'center',
    axisAlign: 'center',
    justifySubmorphs: 'spaced',
    orderByIndex: true,
    padding: rect(10, 0, 0, 0),
    spacing: 5,
    wrapSubmorphs: false
  }),
  extent: pt(160, 30),
  submorphs: [
    {
      name: 'label',
      fontWeight: 800,
      fontColor: Color.rgb(128, 128, 128)
    },
    add({
      type: Image,
      name: 'down caret',
      extent: pt(20, 20),
      reactsToPointer: false,
      imageUrl: projectAsset('list-icon.svg')
    }), add({
      type: Label,
      name: 'error icon',
      fontColor: Color.rgb(205, 0, 0),
      fontSize: 16,
      visible: false,
      textAndAttributes: Icon.textAttribute('exclamation-circle')
    })
  ]
});

const GalyleoDropDownClicked = component(GalyleoDropDownAuto, {
  name: 'galyleo/drop down/clicked',
  fill: Color.darkGray
});

const GalyleoDropDown = component(GalyleoDropDownAuto, {
  name: 'galyleo/drop down',
  master: { auto: GalyleoDropDownAuto, click: GalyleoDropDownClicked }
});

const GalyleoDropDownError = component(GalyleoDropDown, {
  name: 'galyleo/drop down/error',
  extent: pt(168, 34),
  borderColor: Color.rgb(205, 0, 0),
  borderWidth: 4,
  submorphs: [
    {
      name: 'label',
      fontColor: Color.rgb(205, 0, 0)
    },
    {
      name: 'down caret',
      visible: false
    }, {
      name: 'error icon', visible: true
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
  defaultViewModel: ButtonModel,
  borderColor: Color.rgb(23, 160, 251),
  borderRadius: 5,
  extent: pt(127.8, 38.2),
  fill: Color.rgba(0, 0, 0, 0),
  layout: new TilingLayout({
    align: 'center',
    axis: 'row',
    axisAlign: 'center',
    autoResize: false,
    direction: 'centered',
    orderByIndex: true,
    padding: {
      height: 0,
      width: 0,
      x: 10,
      y: 0
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
    fontFamily: galyleoFont,
    fontSize: 15,
    fontWeight: 'bold',
    reactsToPointer: false,
    textAndAttributes: ['Load Data', null]
  }, {
    type: Image,
    name: 'icon',
    extent: pt(19.8, 19.8),
    imageUrl: projectAsset('add-icon.svg'),
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
    imageUrl: projectAsset('add-icon-light.svg')
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

const CheckboxChecked = component({
  name: 'checkbox/checked',
  borderColor: Color.rgb(127, 140, 141),
  borderRadius: 2,
  borderWidth: 1,
  extent: pt(17, 17),
  fill: Color.rgba(0, 0, 0, 0),
  layout: new TilingLayout({
    autoResize: true,
    axis: 'column',
    align: 'center',
    axisAlign: 'center',
    hugsContentsVertically: true,
    // direction: 'topToBottom',
    orderByIndex: true,
    padding: rect(0, 2, 0, 0),
    resizePolicies: [['h floater', {
      height: 'fixed',
      width: 'fill'
    }], ['background fill input', {
      height: 'fixed',
      width: 'fill'
    }]],
    resizeSubmorphs: false,
    spacing: 2
  }),
  position: pt(354.1, 231.8),
  submorphs: [{
    name: 'checker',
    borderColor: Color.rgb(23, 160, 251),
    extent: pt(13.3, 12.9),
    fill: Color.rgb(241, 90, 36),
    nativeCursor: 'pointer'
  }]
});

// CheckboxUnchecked.openInWorld()
const CheckboxUnchecked = component({
  name: 'checkbox/unchecked',
  borderColor: Color.rgb(127, 140, 141),
  borderRadius: 2,
  borderWidth: 1,
  extent: pt(17, 17),
  fill: Color.rgba(0, 0, 0, 0),
  layout: new TilingLayout({
    autoResize: true,
    axis: 'column',
    hugsContentsVertically: true,
    // direction: 'topToBottom',
    orderByIndex: true,
    padding: rect(0, 2, 0, 0),
    resizePolicies: [['h floater', {
      height: 'fixed',
      width: 'fill'
    }], ['background fill input', {
      height: 'fixed',
      width: 'fill'
    }]],
    resizeSubmorphs: false,
    spacing: 2
  }),
  position: pt(388.9, 233.4),
  submorphs: [{
    name: 'checker',
    borderColor: Color.rgb(23, 160, 251),
    extent: pt(13.3, 12.9),
    fill: Color.rgb(241, 90, 36),
    nativeCursor: 'pointer',
    opacity: 0
  }]
});

// part(SelectableEntry).openInWorld()
const SelectableEntry = component({
  defaultViewModel: SelectableEntryModel,
  name: 'selectable entry',
  nativeCursor: 'grab',
  borderColor: Color.rgb(23, 160, 251),
  clipMode: 'hidden',
  extent: pt(163.9, 32.5),
  fill: Color.rgba(0, 0, 0, 0),
  isSelected: false,
  layout: new TilingLayout({
    align: 'left',
    axis: 'row',
    autoResize: false,
    direction: 'leftToRight',
    orderByIndex: true,
    padding: {
      height: 0,
      width: 0,
      x: 10,
      y: 10
    },
    reactToSubmorphAnimations: true,
    renderViaCSS: true,
    resizeSubmorphs: false,
    spacing: 10
  }),
  position: pt(344.3, 280.5),
  submorphs: [{
    type: Label,
    name: 'drag control',
    fontColor: Color.rgb(81, 90, 90),
    nativeCursor: 'grab',
    fill: Color.transparent,
    reactsToPointer: false,
    padding: rect(3, 5, 0, 0),
    textAndAttributes: Icon.textAttribute('bars')
  }, part(CheckboxChecked, { name: 'checkbox' }), {
    type: Label,
    name: 'entry name',
    reactsToPointer: false,
    fontFamily: galyleoFont,
    textAndAttributes: ['entry', null]
  }]
});

// SelectableEntryDragged.openInWorld()
const SelectableEntryDragged = component(SelectableEntry, {
  name: 'selectable entry/dragged',
  nativeCursor: 'grabbing',
  borderRadius: 5,
  fill: Color.rgba(0, 0, 0, 0.15)
});

// TableEntry.openInWorld()
const TableEntry = component({
  type: TableEntryMorph,
  name: 'table entry',
  layout: new TilingLayout({
    align: 'center',
    axisAlign: 'center',
    justifySubmorphs: 'spaced',
    orderByIndex: true,
    reactToSubmorphAnimations: true,
    padding: rect(5, 0, 0, 0),
    resizePolicies: [['buffer', {
      height: 'fixed',
      width: 'fill'
    }]],
    spacing: 5,
    wrapSubmorphs: false
  }),
  borderColor: Color.rgb(23, 160, 251),
  extent: pt(200, 32),
  fill: Color.rgba(0, 0, 0, 0),
  submorphs: [{
    type: Image,
    name: 'remove button',
    extent: pt(17.4, 27.9),
    imageUrl: projectAsset('delete-icon.png'),
    nativeCursor: 'pointer',
    naturalExtent: pt(226, 358),
    visible: true
  }, {
    type: Label,
    name: 'entry name',
    fontFamily: galyleoFont,
    textAndAttributes: ['A table entry', null]
  }, {
    name: 'buffer',
    borderColor: Color.rgb(23, 160, 251),
    extent: pt(79.9, 20.3),
    fill: Color.rgba(0, 0, 0, 0)
  }]
});

// TableEntryEdit.openInWorld()
const TableEntryEdit = component(TableEntry, {
  name: 'table entry/edit',
  submorphs: [
    add({
      type: Image,
      name: 'edit data button',
      extent: pt(15.2, 15.2),
      imageUrl: projectAsset('chart-gear.svg'),
      nativeCursor: 'pointer',
      naturalExtent: pt(133, 150)
    })
  ]
});

// TableEntryVisual.openInWorld()
const TableEntryVisual = component(TableEntryEdit, {
  name: 'table entry/visual',
  submorphs: [
    add({
      type: Image,
      name: 'edit config button',
      extent: pt(15.2, 15.2),
      imageUrl: projectAsset('preview-icon.svg'),
      nativeCursor: 'pointer',
      naturalExtent: pt(133, 150)
    }, 'edit data button')
  ]
});

// part(GalyleoConfirmPrompt).openInWorld().activate()
const GalyleoConfirmPrompt = component(GalyleoWindow, {
  name: 'galyleo/confirm prompt',
  defaultViewModel: ConfirmPromptModel,
  extent: pt(340.5, 248.4),
  layout: new TilingLayout({
    axis: 'column',
    orderByIndex: true,
    resizePolicies: [['window title', {
      height: 'fixed',
      width: 'fill'
    }], ['prompt content', {
      height: 'fixed',
      width: 'fill'
    }], ['button wrapper', {
      height: 'fixed',
      width: 'fill'
    }]],
    wrapSubmorphs: false
  }),
  submorphs: [add({
    type: Text,
    name: 'prompt title',
    fontSize: 15,
    borderColor: Color.rgb(23, 160, 251),
    borderWidth: 0,
    extent: pt(341, 142.8),
    padding: rect(20, 10, 0, 0),
    fill: Color.rgba(0, 0, 0, 0),
    fixedHeight: true,
    fixedWidth: true,
    lineWrapping: true,
    readOnly: true,
    textString: 'This is something to confirm or not....'
  }), add({
    name: 'button wrapper',
    layout: new TilingLayout({
      align: 'center',
      axisAlign: 'center',
      justifySubmorphs: 'spaced',
      orderByIndex: true,
      padding: rect(20, 0, 0, 0)
    }),
    borderColor: Color.rgb(23, 160, 251),
    borderWidth: 0,
    extent: pt(341, 72.4),
    fill: Color.rgba(0, 0, 0, 0),
    submorphs: [part(PromptButton, {
      name: 'cancel button',
      position: pt(18.1, 11.8),
      submorphs: [{
        name: 'label',
        textAndAttributes: ['Cancel', null]
      }, without('icon')]
    }), part(PromptButton, {
      name: 'ok button',
      position: pt(18.1, 11.8),
      submorphs: [{
        name: 'label',
        textAndAttributes: ['Accept', null]
      }, without('icon')]
    })]
  })]
});

const WindowHeader = component({
  name: 'window header',
  layout: new TilingLayout({
    align: 'center',
    axisAlign: 'center',
    orderByIndex: true,
    padding: rect(5, 0, 0, 0),
    wrapSubmorphs: false
  }),
  fill: Color.rgb(127, 140, 141),
  extent: pt(241, 26.3),
  submorphs: [
    {
      name: 'title',
      type: 'label',
      fontFamily: galyleoFont,
      fontWeight: 'bold',
      fontColor: Color.rgb(255, 255, 255)
    }
  ]
});

const CloseButtonFloat = component({
  name: 'close button float',
  layout: new TilingLayout({
    align: 'right',
    orderByIndex: true,
    padding: rect(0, 5, 10, -5)
  }),
  fill: Color.rgba(255, 255, 255, 0),
  submorphs: [
    part(MenuBarButton, {
      tooltip: 'Close this dialog without loading',
      name: 'close button',
      extent: pt(72.4, 21.3),
      submorphs: [{
        name: 'label',
        fontSize: 12,
        textAndAttributes: ['CLOSE', null]
      }, {
        name: 'icon',
        extent: pt(10, 10),
        imageUrl: projectAsset('close-button-icon-2.svg')
      }]
    })
  ]
});

export {
  GalyleoWindow, GalyleoList, MenuBarButton, PromptButton, CheckboxChecked,
  CheckboxUnchecked, SelectableEntry, SelectableEntryDragged, GalyleoDropDownList, GalyleoDropDownError, GalyleoTextInput,
  TableEntry, TableEntryEdit, TableEntryVisual, GalyleoDropDown, GalyleoNumberInput, GalyleoColorInput, GalyleoAddButtonActive, GalyleoDropDownAuto,
  GalyleoAddButton, GalyleoPropertyLabel, GalyleoPropertyLabelActive, GalyleoPropertyLabelHovered, GalyleoAddButtonDefault, GalyleoAddButtonHovered, GalyleoConfirmPrompt, WindowHeader, CloseButtonFloat, galyleoFont, GalyleoEnumSelector
};
