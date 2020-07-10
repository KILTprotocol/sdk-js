import { Text } from '@polkadot/types'
import getCached from '../blockchainApiConnection/BlockchainApiConnection'
import TYPE_REGISTRY from '../blockchainApiConnection/__mocks__/BlockchainQuery'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('queries', () => {
  beforeAll(() => {
    const api = require('../blockchainApiConnection/BlockchainApiConnection')
      .__mocked_api
    api.rpc.system.version.mockResolvedValue(new Text(TYPE_REGISTRY, '1.0.0'))
    api.rpc.system.chain.mockResolvedValue(new Text(TYPE_REGISTRY, 'mockchain'))
    api.rpc.system.name.mockResolvedValue(new Text(TYPE_REGISTRY, 'KILT node'))

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
