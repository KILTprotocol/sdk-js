import { cryptoWaitReady } from '@polkadot/util-crypto'
export {}

beforeAll(async () => {
  await cryptoWaitReady()
})
