/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')
const webpack = require('webpack')

module.exports = {
  mode: 'production',
  // build two different bundles from the transpiled js
  entry: {
    'sdk-js': './lib/index.js',
    'sdk-js.min': './lib/index.js',
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
    alias: {
      buffer: 'buffer',
      process: 'process',
    },
    fallback: {
      buffer: require.resolve('buffer'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
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
