import { cryptoWaitReady } from '@polkadot/util-crypto'
import './jestErrorCodeMatcher'
export {}

beforeAll(async () => {
  await cryptoWaitReady()
})
