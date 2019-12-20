/**
 * @group integration
 */

import { Header } from '@polkadot/types/interfaces/types'
import { getCached } from '../blockchainApiConnection'

describe('Blockchain', async () => {
  it('should get stats', async () => {
    const blockchainSingleton = await getCached()
    const stats = await blockchainSingleton.getStats()
    expect(stats).toMatchInlineSnapshot(`
Object {
  "chain": "Development",
  "nodeName": "substrate-node",
  "nodeVersion": "0.21.0",
}
`)
  })

  it('should listen to blocks', async done => {
    const listener = (header: Header): void => {
      console.log(`Best block number ${header.number}`)
      expect(Number(header.number)).toBeGreaterThanOrEqual(0)
      done()
    }
    const blockchainSingleton = await getCached()

    const subscriptionId = await blockchainSingleton.listenToBlocks(listener)
    console.log(`Subscription Id: ${subscriptionId}`)
  }, 5000)
})
