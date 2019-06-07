import { Header } from '@polkadot/types'
import { IBlockchainApi } from './Blockchain'
import { getCached } from '../blockchainApiConnection'
// NB: see jest.config.js - include this dir to be tested for test coverage again
// to acquire a connection as singleton, async and without jest complaining about
// 'Jest: Coverage data for ./src/blockchain/ was not found.' I use this construct for now
let blockchainSingleton: IBlockchainApi

describe('Blockchain', async () => {
  blockchainSingleton = await getCached()

  xit('should get stats', async () => {
    const stats = await blockchainSingleton.getStats()
    expect(stats).toEqual({
      chain: 'KILT Testnet',
      nodeName: 'substrate-node',
      nodeVersion: '0.9.0',
    })
  })

  xit('should listen to blocks', async done => {
    const listener = (header: Header) => {
      console.log(`Best block number ${header.blockNumber}`)
      done()
    }

    const subscriptionId = await blockchainSingleton.listenToBlocks(listener)
    expect(subscriptionId).toBeGreaterThanOrEqual(0)
    console.log(`Subscription Id: ${subscriptionId}`)
  }, 20000)
})
