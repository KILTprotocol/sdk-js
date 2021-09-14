/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')
const webpack = require('webpack')
const glob = require('glob')

const entry = glob.sync(
  `${path.resolve(__dirname, './src/__integrationtests__')}**/*spec.ts`
)

const outpath = path.resolve(__dirname, 'test-dist/')
module.exports = {
  mode: 'production',
  // build two different bundles from the transpiled js
  entry: {
    'test-bundle': entry,
  },
  output: {
    filename: '[name].umd.spec.js',
    path: outpath,
    libraryTarget: 'umd',
    library: 'kilt',
    umdNamedDefine: true,
  },
  resolve: {
    extensions: ['.ts', '.js', '.d.ts', '.mjs', '.json'],
    symlinks: false,
    // Explicit fallbacks to include these in bundle
    alias: {
      buffer: 'buffer',
      process: 'process',
    },
    fallback: {
      buffer: require.resolve('buffer'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      url: require.resolve('url'),
      util: require.resolve('util'),
    },
  },
  stats: {
    errorDetails: true,
  },
  module: {
    rules: [{ test: /\.ts/, loader: 'ts-loader' }],
  },
  optimization: {
    minimize: true,
    // only minimize the *.min* bundle output
    minimizer: [new TerserPlugin({ include: /\.min\.umd\.js$/ })],
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
}
