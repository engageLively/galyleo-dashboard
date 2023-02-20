import { GalyleoSideBar } from '../../side-bar.cp.js';
import { pt } from 'lively.graphics';
import { component } from 'lively.morphic';

const GalyleoSideBarJp = component(GalyleoSideBar, {
  name: 'galyleo/side bar/jp',
  extent: pt(324.8, 668),
  submorphs: [
    {
      name: 'button wrapper',
      submorphs: [
        { name: 'close button', submorphs: [{ name: 'label', textAndAttributes: ['閉じる', null] }] }
      ]
    },
    {
      name: 'controls',
      submorphs: [{
        name: 'tab switcher',
        extent: pt(364, 32.7),
        submorphs: [{
          name: 'tables tab',
          submorphs: [{
            name: 'tab label',
            textAndAttributes: ['テーブル', null]
          }]
        }, {
          name: 'filters tab',
          submorphs: [{
            name: 'tab label',
            textAndAttributes: ['フィルル', null]
          }]
        }, {
          name: 'views tab',
          submorphs: [{
            name: 'tab label',
            textAndAttributes: ['ビュウー', null]
          }]
        }, {
          name: 'charts tab',
          submorphs: [{
            name: 'tab label',
            textAndAttributes: ['チャート', null]
          }]
        }]
      },
      {
        name: 'control container',
        submorphs: [
          {
            name: 'chart control',
            visible: true,
            submorphs: [
              {
                name: 'v wrapper',
                submorphs: [
                  { name: 'control label', textAndAttributes: ['チャート', null] }
                ]
              }, {
                name: 'add button',
                extent: pt(157, 35),
                submorphs: [
                  { name: 'label', textAndAttributes: ['チャートを追加', null] }
                ]
              }
            ]
          },
          {
            name: 'view control',
            visible: true,
            submorphs: [
              {
                name: 'v wrapper',
                submorphs: [
                  { name: 'control label', textAndAttributes: ['ビュー', null] }
                ]
              }, {
                name: 'add button',
                extent: pt(130, 35),
                submorphs: [
                  { name: 'label', textAndAttributes: ['ビューを追加', null] }
                ]
              }
            ]
          },
          {
            name: 'table control',
            visible: true,
            submorphs: [
              {
                name: 'v wrapper',
                submorphs: [
                  { name: 'control label', textAndAttributes: ['テーブル', null] }
                ]
              }, {
                name: 'add button',
                extent: pt(157, 35),
                submorphs: [
                  { name: 'label', textAndAttributes: ['テーブルを追加', null] }
                ]
              }
            ]
          },
          {
            name: 'filter control',
            submorphs: [
              {
                name: 'v wrapper',
                submorphs: [
                  { name: 'control label', textAndAttributes: ['フィルタとウィジェット', null] }
                ]
              }, {
                name: 'add button',
                extent: pt(157, 35),
                submorphs: [
                  { name: 'label', textAndAttributes: ['フィルタを追加', null] }
                ]
              }
            ]
          }
        ]
      },
      {
        name: 'style control',
        submorphs: [
          {
            name: 'background control',
            submorphs: [
              {
                name: 'h floater',
                submorphs: [
                  {
                    name: 'section headline',
                    textAndAttributes: ['背景', null]
                  }
                ]
              }
            ]
          },
          {
            name: 'text control',
            submorphs: [
              {
                name: 'h floater',
                submorphs: [
                  {
                    name: 'section headline',
                    textAndAttributes: ['リッチテキスト', null]
                  }
                ]
              }
            ]
          },
          {
            name: 'layout control',
            submorphs: [
              {
                name: 'h floater',
                submorphs: [
                  {
                    name: 'section headline',
                    textAndAttributes: ['レイアウト', null]
                  }
                ]
              },
              {
                name: 'wrap submorphs checkbox',
                submorphs: [
                  { name: 'prop label', textAndAttributes: ['副要素の折り返し', null] }
                ]
              }
            ]
          },
          {
            name: 'constraints control',
            submorphs: [
              {
                name: 'h floater',
                submorphs: [
                  {
                    name: 'section headline',
                    textAndAttributes: ['制約事項', null]
                  }
                ]
              }
            ]
          },
          {
            name: 'fill control',
            submorphs: [
              {
                name: 'h floater',
                submorphs: [
                  {
                    name: 'section headline',
                    textAndAttributes: ['フィル', null]
                  }
                ]
              }
            ]
          },
          {
            name: 'border control',
            submorphs: [
              {
                name: 'h floater',
                submorphs: [
                  {
                    name: 'section headline',
                    textAndAttributes: ['枠線', null]
                  }
                ]
              }
            ]
          },
          {
            name: 'effects control',
            submorphs: [
              {
                name: 'h floater',
                submorphs: [
                  {
                    name: 'section headline',
                    textAndAttributes: ['カスタム スタイル', null]
                  }
                ]
              }
            ]
          }
        ]
      }]
    }
  ]
});

export { GalyleoSideBarJp };
