import { Text } from '@polkadot/types'
import { SubmittableResult } from '@polkadot/api'
import U64 from '@polkadot/types/primitive/U64'
import getCached from '../blockchainApiConnection/BlockchainApiConnection'
import Identity from '../identity/Identity'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

const alice = Identity.buildFromURI('//Alice')
const bob = Identity.buildFromURI('//Bob')

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

    api.query.system.accountNonce = jest.fn(account => {
      switch (account) {
        case alice.address:
          return new U64(10)
        case bob.address:
          return new U64(20)
        default:
          return new U64()
      }
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

  it('should get nonce', async () => {
    const blockchain = await getCached()
    await expect(
      blockchain.getNonce(alice.address).then(v => v.toJSON())
    ).resolves.toEqual(10)
    await expect(
      blockchain.getNonce(bob.address).then(v => v.toJSON())
    ).resolves.toEqual(20)
    await expect(
      blockchain.getNonce('5fisou3fj').then(v => v.toJSON())
    ).resolves.toEqual(0)
  })

  describe('tx mocks', () => {
    it('tx succeeds', async () => {
      require('../blockchainApiConnection/BlockchainApiConnection').__setDefaultResult(
        true
      )

      const blockchain = await getCached()
      const tx = blockchain.api.tx.ctype.add('hash', 'signature')
      expect(tx.send).toBeInstanceOf(Function)
      expect(tx.sign).toBeInstanceOf(Function)
      expect(tx.signAndSend).toBeInstanceOf(Function)
      const result = await blockchain.submitTx(bob, tx)
      expect(result).toBeInstanceOf(SubmittableResult)
      expect(result).toMatchObject({ isFinalized: true })
    })

    it('tx fails', async () => {
      require('../blockchainApiConnection/BlockchainApiConnection').__setDefaultResult(
        false
      )
      const blockchain = await getCached()
      const tx = blockchain.api.tx.ctype.add('hash', 'signature')
      await expect(blockchain.submitTx(bob, tx)).rejects.toThrow(
        'Transaction failed'
      )
    })

    it('tx succeeds then fails', async () => {
      require('../blockchainApiConnection/BlockchainApiConnection').__queueResults(
        [true, false]
      )
      const blockchain = await getCached()
      const tx = blockchain.api.tx.ctype.add('hash', 'signature')
      await expect(blockchain.submitTx(bob, tx)).resolves.toMatchObject({
        isFinalized: true,
      })
      const tx2 = blockchain.api.tx.ctype.add('hash', 'signature')
      await expect(blockchain.submitTx(alice, tx2)).rejects.toThrow(
        'Transaction failed'
      )
    })
  })
})
