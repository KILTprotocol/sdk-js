const { cryptoWaitReady } = require('@polkadot/util-crypto')

beforeAll(async () => {
  await cryptoWaitReady()
})
