/**
 * @group integration/connectivity
 * @ignore
 * @packageDocumentation
 */

import { Header } from '@polkadot/types/interfaces/types'
import { getCached, DEFAULT_WS_ADDRESS } from '../blockchainApiConnection'
import { IBlockchainApi } from '../blockchain/Blockchain'

let blockchain: IBlockchainApi | undefined
beforeAll(async () => {
  blockchain = await getCached(DEFAULT_WS_ADDRESS)
})

describe('Blockchain', () => {
  it('should get stats', async () => {
    if (typeof blockchain !== 'undefined') {
      const stats = await blockchain.getStats()

      expect(stats).toMatchObject({
        chain: 'Development',
        nodeName: 'substrate-node',
        nodeVersion: expect.stringMatching(/.+\..+\..+/),
      })
    } else {
      expect(false).toBeTruthy()
    }
  })

  it('should listen to blocks', async done => {
    const listener = (header: Header): void => {
      // console.log(`Best block number ${header.number}`)
      expect(Number(header.number)).toBeGreaterThanOrEqual(0)
      done()
    }
    if (typeof blockchain !== 'undefined') {
      await blockchain.listenToBlocks(listener)
      // const subscriptionId = await blockchainSingleton.listenToBlocks(listener)
      // console.log(`Subscription Id: ${subscriptionId}`)
    } else {
      expect(false).toBeTruthy()
      done()
    }
  }, 5000)
})

afterAll(() => {
  if (typeof blockchain !== 'undefined') blockchain.api.disconnect()
})
