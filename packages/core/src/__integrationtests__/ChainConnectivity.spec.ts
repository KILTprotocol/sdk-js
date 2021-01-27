/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @packageDocumentation
 * @group integration/connectivity
 * @ignore
 */

import { Header } from '@polkadot/types/interfaces/types'
import { WS_ADDRESS } from './utils'
import { config, disconnect } from '../kilt'
import { getCached } from '../blockchainApiConnection'

beforeAll(async () => {
  config({ address: WS_ADDRESS })
})

describe('Blockchain', () => {
  it('should get stats', async () => {
    const blockchain = await getCached()
    expect(blockchain).not.toBeUndefined()
    const stats = await blockchain!.getStats()

    expect(stats).toMatchObject({
      chain: 'Development',
      nodeName: 'KILT Node',
      nodeVersion: expect.stringMatching(/.+\..+\..+/),
    })
  })

  it('should listen to blocks', async (done) => {
    const blockchain = await getCached()
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
  disconnect()
})
