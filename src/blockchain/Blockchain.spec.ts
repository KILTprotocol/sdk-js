import { Text } from '@polkadot/types'
import getCached from '../blockchainApiConnection/BlockchainApiConnection'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('queries', () => {
  beforeAll(() => {
    const api = require('../blockchainApiConnection/BlockchainApiConnection')
      .__mocked_api
    api.rpc.system.version.mockResolvedValue(new Text('1.0.0'))
    api.rpc.system.chain.mockResolvedValue(new Text('mockchain'))
    api.rpc.system.name.mockResolvedValue(new Text('substrate-node'))

    api.rpc.chain.subscribeNewHeads = jest.fn(async listener => {
      listener('mockHead')
      return jest.fn()
    })
  })

  it('should get stats', async () => {
    const blockchain = await getCached()

    await expect(blockchain.getStats()).resolves.toMatchObject({
      chain: 'mockchain',
      nodeName: 'substrate-node',
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
