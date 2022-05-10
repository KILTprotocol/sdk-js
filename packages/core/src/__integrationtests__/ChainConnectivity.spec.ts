/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
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
}, 30_000)

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

  it('should listen to blocks', (done) => {
    const listener = (header: Header): void => {
      // console.log(`Best block number ${header.number}`)
      expect(Number(header.number)).toBeGreaterThanOrEqual(0)
      done()
    }

    BlockchainApiConnection.getConnectionOrConnect().then((blockchain) => {
      expect(blockchain).not.toBeUndefined()
      blockchain!.listenToBlocks(listener)
    })
  }, 5000)
})

afterAll(() => {
  disconnect()
})
