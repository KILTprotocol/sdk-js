import { Text, UInt } from '@polkadot/types'
import { Index } from '@polkadot/types/interfaces/types'
import { ApiPromise } from '@polkadot/api'
import getCached from '../blockchainApiConnection/BlockchainApiConnection'
import TYPE_REGISTRY from '../blockchainApiConnection/__mocks__/BlockchainQuery'
import Identity from '../identity/Identity'
import Blockchain from './Blockchain'
import getCached from '../blockchainApiConnection'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

const errorSetupApi = ({
  query: {
    system: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      accountNonce: () => {
        return new Promise((res, rej) => {
          rej(new Error('Test Nonce Retrieval Error handling'))
        })
      },
    },
  },
} as any) as ApiPromise

describe('queries', () => {
  const alice = Identity.buildFromURI('//Alice')

  beforeAll(() => {
    const api = require('../blockchainApiConnection/BlockchainApiConnection')
      .__mocked_api
    api.rpc.system.version.mockResolvedValue(new Text(TYPE_REGISTRY, '1.0.0'))
    api.rpc.system.chain.mockResolvedValue(new Text(TYPE_REGISTRY, 'mockchain'))
    api.rpc.system.name.mockResolvedValue(new Text(TYPE_REGISTRY, 'KILT node'))

    api.rpc.chain.subscribeNewHeads = jest.fn(async listener => {
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

  it('should increment nonce for account', async () => {
    const blockchain = await getCached()
    const chain = new Blockchain(blockchain.api)
    // eslint-disable-next-line dot-notation
    const initialNonce = await chain['retrieveNonce'](alice.address)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(chain.accountNonces.get(alice.address)!.toNumber()).toEqual(
      initialNonce.toNumber() + 1
    )
  })

  it('should return incrementing nonces', async () => {
    const promisedNonces: Array<Promise<Index>> = []
    const blockchain = await getCached()
    const chain = new Blockchain(blockchain.api)
    for (let i = 0; i < 25; i += 1) {
      promisedNonces.push(chain.getNonce(alice.address))
    }
    const nonces = await Promise.all(promisedNonces)
    expect(nonces.length).toEqual(25)
    nonces.forEach((value, index) => {
      expect(value.toNumber()).toEqual(new UInt(index).toNumber())
    })
  })

  it('should return separate incrementing nonces per account', async () => {
    const bob = Identity.buildFromURI('//Bob')
    const alicePromisedNonces: Array<Promise<Index>> = []
    const bobPromisedNonces: Array<Promise<Index>> = []
    const blockchain = await getCached()
    const chain = new Blockchain(blockchain.api)
    for (let i = 0; i < 50; i += 1) {
      if (i % 2 === 0) {
        alicePromisedNonces.push(chain.getNonce(alice.address))
      } else bobPromisedNonces.push(chain.getNonce(bob.address))
    }
    const aliceNonces = await Promise.all(alicePromisedNonces)
    const bobNonces = await Promise.all(bobPromisedNonces)
    expect(aliceNonces.length).toEqual(25)
    expect(bobNonces.length).toEqual(25)
    aliceNonces.forEach((value, index) => {
      expect(value.toNumber()).toEqual(new UInt(index).toNumber())
    })
    bobNonces.forEach((value, index) => {
      expect(value.toNumber()).toEqual(new UInt(index).toNumber())
    })
  })

  it('should handle error when chain returns error', async () => {
    const chain = new Blockchain(errorSetupApi)
    // eslint-disable-next-line dot-notation
    await expect(chain['retrieveNonce'](alice.address)).rejects.toThrow(
      'Test Nonce Retrieval Error handling'
    )
  })

  // it('should handle errors when accessing account nonces', async () => {
  //   // For this test to run, TS diagnostics have to be disabled in [jest-config].globals.ts-jest.diagnostics
  //   const chain = new Blockchain(mockedApi)
  //   chain.accountNonces.set(alice.address, undefined)
  //   // eslint-disable-next-line dot-notation
  //   await expect(chain['retrieveNonce'](alice.address)).rejects.toThrow(
  //     `Nonce Retrieval Failed for : ${alice.address}`
  //   )
  // })
})
const errorSetupApi = ({
  query: {
    system: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      accountNonce: () => {
        return new Promise((res, rej) => {
          rej(new Error('Test Nonce Retrieval Error handling'))
        })
      },
    },
  },
} as any) as ApiPromise
describe('Blockchain', () => {
  const alice = Identity.buildFromURI('//Alice')
  it('should increment nonce for account', async () => {
    const chain = new Blockchain(mockedApi)
    // eslint-disable-next-line dot-notation
    const initialNonce = await chain['retrieveNonce'](alice.address)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(chain.accountNonces.get(alice.address)!.toNumber()).toEqual(
      initialNonce.toNumber() + 1
    )
  })

  it('should return incrementing nonces', async () => {
    const promisedNonces: Array<Promise<Index>> = []
    const chain = new Blockchain(mockedApi)
    for (let i = 0; i < 25; i += 1) {
      promisedNonces.push(chain.getNonce(alice.address))
    }
    const nonces = await Promise.all(promisedNonces)
    expect(nonces.length).toEqual(25)
    nonces.forEach((value, index) => {
      expect(value.toNumber()).toEqual(new UInt(index).toNumber())
    })
  })

  it('should return separate incrementing nonces per account', async () => {
    const bob = Identity.buildFromURI('//Bob')
    const alicePromisedNonces: Array<Promise<Index>> = []
    const bobPromisedNonces: Array<Promise<Index>> = []
    const chain = new Blockchain(mockedApi)
    for (let i = 0; i < 50; i += 1) {
      if (i % 2 === 0) {
        alicePromisedNonces.push(chain.getNonce(alice.address))
      } else bobPromisedNonces.push(chain.getNonce(bob.address))
    }
    const aliceNonces = await Promise.all(alicePromisedNonces)
    const bobNonces = await Promise.all(bobPromisedNonces)
    expect(aliceNonces.length).toEqual(25)
    expect(bobNonces.length).toEqual(25)
    aliceNonces.forEach((value, index) => {
      expect(value.toNumber()).toEqual(new UInt(index).toNumber())
    })
    bobNonces.forEach((value, index) => {
      expect(value.toNumber()).toEqual(new UInt(index).toNumber())
    })
  })

  it('should handle error when chain returns error', async () => {
    const chain = new Blockchain(errorSetupApi)
    // eslint-disable-next-line dot-notation
    await expect(chain['retrieveNonce'](alice.address)).rejects.toThrow(
      'Test Nonce Retrieval Error handling'
    )
  })

  // it('should handle errors when accessing account nonces', async () => {
  //   // For this test to run, TS diagnostics have to be disabled in [jest-config].globals.ts-jest.diagnostics
  //   const chain = new Blockchain(mockedApi)
  //   chain.accountNonces.set(alice.address, undefined)
  //   // eslint-disable-next-line dot-notation
  //   await expect(chain['retrieveNonce'](alice.address)).rejects.toThrow(
  //     `Nonce Retrieval Failed for : ${alice.address}`
  //   )
  // })
})
