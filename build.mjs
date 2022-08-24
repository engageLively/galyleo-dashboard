/* global process */
import { rollup } from 'rollup';
import path from 'path';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import jsonPlugin from '@rollup/plugin-json';
import commonjs from '@rollup/plugin-commonjs';
import { lively } from 'lively.freezer/src/plugins/rollup';
import resolver from 'lively.freezer/src/resolvers/node.cjs';

const build = await rollup({
  input: './studio/index.js',
  shimMissingExports: true,  
  plugins: [
    lively({
      autoRun: { title: 'Galyleo Dashboard' },
      minify: false,
      asBrowserModule: true,
      excludedModules: [
	      'mocha-es6','mocha', // references old lgtg that breaks the build
	      'lively.freezer',
        'rollup', // has a dist file that cant be parsed by rollup
      ],
      resolver
    }),
    jsonPlugin(),
  ]
});

await build.write({
  format: 'system',
  dir: 'bin'
});
