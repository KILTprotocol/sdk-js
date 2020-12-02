/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @packageDocumentation
 * @group integration/connectivity
 * @ignore
 */

import { Header } from '@polkadot/types/interfaces/types'
import { IBlockchainApi } from '../blockchain/Blockchain'
import { getCached } from '../blockchainApiConnection'
import { getNodeAddress } from '../config/ConfigService'

let blockchain: IBlockchainApi | undefined
beforeAll(async () => {
  blockchain = await getCached(getNodeAddress())
})

describe('Blockchain', () => {
  it('should get stats', async () => {
    expect(blockchain).not.toBeUndefined()
    const stats = await blockchain!.getStats()

    expect(stats).toMatchObject({
      chain: 'Development',
      nodeName: 'KILT Node',
      nodeVersion: expect.stringMatching(/.+\..+\..+/),
    })
  })

  it('should listen to blocks', async (done) => {
    const listener = (header: Header): void => {
      // console.log(`Best block number ${header.number}`)
      expect(Number(header.number)).toBeGreaterThanOrEqual(0)
      done()
    }
    expect(blockchain).not.toBeUndefined()
    await blockchain!.listenToBlocks(listener)
    // const subscriptionId = await blockchainSingleton.listenToBlocks(listener)
    // console.log(`Subscription Id: ${subscriptionId}`)
  }, 5000)
})

afterAll(() => {
  if (typeof blockchain !== 'undefined') blockchain.api.disconnect()
})
