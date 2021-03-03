import { cryptoWaitReady } from '@polkadot/util-crypto'

beforeAll(async () => {
  await cryptoWaitReady()
})
