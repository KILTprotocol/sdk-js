import { Header } from '@polkadot/types/interfaces/types'
import { getCached } from '../blockchainApiConnection'

describe('Blockchain', async () => {
  xit('should get stats', async () => {
    const blockchainSingleton = await getCached()
    const stats = await blockchainSingleton.getStats()
    expect(stats).toEqual({
      chain: 'KILT Testnet',
      nodeName: 'substrate-node',
      nodeVersion: '0.9.0',
    })
  })

  xit('should listen to blocks', async done => {
    const listener = (header: Header): void => {
      console.log(`Best block number ${header.number}`)
      done()
    }
    const blockchainSingleton = await getCached()

    const subscriptionId = await blockchainSingleton.listenToBlocks(listener)
    expect(subscriptionId).toBeGreaterThanOrEqual(0)
    console.log(`Subscription Id: ${subscriptionId}`)
  }, 20000)
})
