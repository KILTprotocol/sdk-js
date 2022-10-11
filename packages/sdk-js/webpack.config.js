/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')
const webpack = require('webpack')

module.exports = {
  mode: 'production',
  // build two different bundles from the transpiled js
  entry: {
    'sdk-js': './lib/cjs/index.js',
    'sdk-js.min': './lib/cjs/index.js',
  },
  output: {
    filename: '[name].umd.js',
    path: path.resolve(__dirname, 'dist/'),
    libraryTarget: 'umd',
    library: 'kilt',
    umdNamedDefine: true,
  },
  resolve: {
    extensions: ['.ts', '.js', '.d.ts', '.mjs', '.json'],
    symlinks: false,
    // Explicit fallbacks to include these in bundle
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
