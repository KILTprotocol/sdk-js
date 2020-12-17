// Inspiration from https://github.com/ipfs/jest-environment-aegir

'use strict'

const NodeEnvironment = require('jest-environment-node')

class CustomEnvironment extends NodeEnvironment {
  constructor (config, context) {
    super(Object.assign({}, config, {
      globals: Object.assign({}, config.globals, {
        Uint8Array: Uint8Array,
        ArrayBuffer: ArrayBuffer
      })
    }), context)
  }
}

module.exports = CustomEnvironment
