import { Header } from '@polkadot/types'
import partial from 'lodash/partial'
import { buildConnection } from '../blockchainApiConnection'
import { IBlockchainApi } from './Blockchain'
// NB: see jest.config.js - include this dir to be tested for test coverage again
// to acquire a connection as singleton, async and without jest complaining about
// 'Jest: Coverage data for ./src/blockchain/ was not found.' I use this construct for now
let blockchainSingleton: IBlockchainApi
const getConnectionOnce = async () => {
  if (!blockchainSingleton) {
    blockchainSingleton = await buildConnection()
  }
  return blockchainSingleton
}

describe('Blockchain', async () => {
  xit('should get stats', async () => {
    const api = await getConnectionOnce()
    const stats = await partial(blockchainSingleton.getStats, api)()
    expect(stats).toEqual({
      chain: 'KILT Testnet',
      nodeName: 'substrate-node',
      nodeVersion: '0.9.0',
    })
  })

  xit('should listen to blocks', async done => {
    const api = await getConnectionOnce()

    const listener = (header: Header) => {
      console.log(`Best block number ${header.blockNumber}`)
      done()
    }

    const subscriptionId = await partial(
      blockchainSingleton.listenToBlocks,
      api
    )(listener)
    expect(subscriptionId).toBeGreaterThanOrEqual(0)
    console.log(`Subscription Id: ${subscriptionId}`)
  }, 20000)
})
