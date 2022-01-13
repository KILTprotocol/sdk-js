/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/connectivity
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { Header } from '@polkadot/types/interfaces/types'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { disconnect } from '../kilt'
import { initializeApi } from './utils'

beforeAll(async () => {
  await initializeApi()
})

describe('Blockchain', () => {
  it('should get stats', async () => {
    const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
    expect(blockchain).not.toBeUndefined()
    const stats = await blockchain!.getStats()

    expect(stats).toMatchObject({
      chain: 'Development',
      nodeName: 'KILT Node',
      nodeVersion: expect.stringMatching(/.+\..+\..+/),
    })
  })

  it('should listen to blocks', async (done) => {
    const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
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
