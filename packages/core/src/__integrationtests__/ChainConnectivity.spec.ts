/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Header } from '@polkadot/types/interfaces/types'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { WS_ADDRESS } from './utils'
import { config, disconnect } from '../kilt'

beforeAll(async () => {
  config({ address: WS_ADDRESS })
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
