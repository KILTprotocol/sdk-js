/**
 * @group integration/connectivity
 */

import { Header } from '@polkadot/types/interfaces/types'
import { Struct, Text, TypeRegistry } from '@polkadot/types'
import { getCached } from '../blockchainApiConnection'

describe('Blockchain', () => {
  const registry = new TypeRegistry()
  it('should get stats', async () => {
    const blockchainSingleton = await getCached()
    const stats = await blockchainSingleton.getStats()

    expect(
      new Struct(
        registry,
        { chain: Text, nodeName: Text, nodeVersion: Text },
        stats
      ).toJSON()
    ).toMatchObject({
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
    const blockchainSingleton = await getCached()
    await blockchainSingleton.listenToBlocks(listener)
    // const subscriptionId = await blockchainSingleton.listenToBlocks(listener)
    // console.log(`Subscription Id: ${subscriptionId}`)
  }, 5_000)
})

afterAll(() => {
  return getCached().then((bc) => bc.api.disconnect())
})
