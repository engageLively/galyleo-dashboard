import { Publisher, BugReporter } from '../../helpers.cp.js';
import { component, TilingLayout } from 'lively.morphic';
import { rect } from 'lively.graphics/geometry-2d.js';

export const BugReporterJP = component(BugReporter, {
  submorphs: [{
    name: 'window title',
    nativeCursor: 'text',
    textAndAttributes: ['バグを報告', null]

  }, {
    name: 'contents wrapper',
    submorphs: [
      {
        name: 'header',
        submorphs: [{
          name: 'close button',
          submorphs: [{
            name: 'label',
            value: ['閉じる', null]
          }]
        }]
      },
      {
        name: 'user name input',
        placeholder: 'ユーザー名'
      }, {
        name: 'file input',
        placeholder: 'ダッシュボードのファイル'
      }, {
        name: 'message label',
        textAndAttributes: ['メッセージ', {
          textDecoration: 'none'
        }]
      },
      {
        name: 'footer',
        submorphs: [{
          name: 'report button',
          submorphs: [{ name: 'label', textAndAttributes: ['報告する', null] }]
        }]
      }
    ]
  }]
});

export const PublisherJP = component(Publisher, {
  submorphs: [{
    name: 'window title',
    textAndAttributes: ['ダッシュボードを公開する', null]
  }, {
    name: 'contents wrapper',
    layout: new TilingLayout({
      axis: 'column',
      axisAlign: 'center',
      orderByIndex: true,
      padding: rect(15, 15, 0, 0),
      resizePolicies: [['header', {
        height: 'fixed',
        width: 'fill'
      }], ['dashboard list', {
        height: 'fixed',
        width: 'fill'
      }], ['error message', {
        height: 'fixed',
        width: 'fill'
      }], ['file input', {
        height: 'fixed',
        width: 'fill'
      }], ['dashboard label', {
        height: 'fixed',
        width: 'fill'
      }], ['footer', {
        height: 'fixed',
        width: 'fill'
      }]],
      spacing: 13
    }),
    submorphs: [
      {
        name: 'header',
        height: 12.53125,
        submorphs: [{
          name: 'close button',
          submorphs: [{
            name: 'label',
            value: ['閉じる', null]
          }]
        }]
      },
      {
        name: 'file input',
        placeholder: 'ダッシュボードのファイル'
      },
      {
        name: 'dashboard label',
        textAndAttributes: ['公開してったダッシュボード', {
          textDecoration: 'none'
        }]
      }, {
        name: 'footer',
        submorphs: [{
          name: 'report button',
          submorphs: [{ name: 'label', textAndAttributes: ['公開する', null] }]
        }]
      }
    ]
  }]
});
