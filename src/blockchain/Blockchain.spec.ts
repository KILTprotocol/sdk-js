import { Text, TypeRegistry } from '@polkadot/types'
import getCached from '../blockchainApiConnection/BlockchainApiConnection'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('queries', () => {
  beforeAll(() => {
    const api = require('../blockchainApiConnection/BlockchainApiConnection')
      .__mocked_api
    const registry = new TypeRegistry()
    api.rpc.system.version.mockResolvedValue(new Text(registry, '1.0.0'))
    api.rpc.system.chain.mockResolvedValue(new Text(registry, 'mockchain'))
    api.rpc.system.name.mockResolvedValue(new Text(registry, 'KILT node'))

    api.rpc.chain.subscribeNewHeads = jest.fn(async (listener) => {
      listener('mockHead')
      return jest.fn()
    })
  })

  it('should get stats', async () => {
    const blockchain = await getCached()

    await expect(blockchain.getStats()).resolves.toMatchObject({
      chain: 'mockchain',
      nodeName: 'KILT node',
      nodeVersion: '1.0.0',
    })
  })

  it('should listen to blocks', async () => {
    const listener = jest.fn()
    const blockchain = await getCached()
    const unsubscribe = await blockchain.listenToBlocks(listener)
    expect(listener).toBeCalledWith('mockHead')
    expect(unsubscribe()).toBeUndefined()
  })
})
