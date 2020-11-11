/* eslint-disable dot-notation */
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { SubmittableResult } from '@polkadot/api/submittable'
import { Text } from '@polkadot/types'
import { SignerPayload } from '@polkadot/types/interfaces/types'
import { SignerPayloadJSON } from '@polkadot/types/types/extrinsic'
import BN from 'bn.js'
import getCached from '../blockchainApiConnection/BlockchainApiConnection'
import TYPE_REGISTRY from '../blockchainApiConnection/__mocks__/BlockchainQuery'
import Identity from '../identity/Identity'
import Blockchain, {
  EXTRINSIC_FAILED,
  IS_ERROR,
  IS_FINALIZED,
  IS_USURPED,
  parseSubscriptionOptions,
  ResultEvaluator,
  submitSignedTx,
} from './Blockchain'

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

describe('Tx logic', () => {
  let alice: Identity
  let bob: Identity
  const api = require('../blockchainApiConnection/BlockchainApiConnection')
    .__mocked_api
  const setDefault = require('../blockchainApiConnection/BlockchainApiConnection')
    .__setDefaultResult
  const dispatchNonceRetrieval = async (address: string): Promise<BN> => {
    const chain = await getCached()
    return chain.getNonce(address)
  }
  beforeAll(async () => {
    alice = await Identity.buildFromURI('//Alice')
    bob = await Identity.buildFromURI('//Bob')
  })
  describe('getNonce', () => {
    it('should increment nonce for account', async () => {
      const chain = new Blockchain(api)
      const initialNonce = await chain.getNonce(alice.address)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(chain['accountNonces'].get(alice.address)!.toNumber()).toEqual(
        initialNonce.toNumber() + 1
      )
    })
    it('should return incrementing nonces', async () => {
      const promisedNonces: Array<Promise<BN>> = []
      const chain = new Blockchain(api)
      for (let i = 0; i < 25; i += 1) {
        promisedNonces.push(chain.getNonce(alice.address))
      }
      const nonces = await Promise.all(promisedNonces)
      expect(nonces.length).toEqual(25)
      nonces.forEach((value, index) => {
        expect(value.toNumber()).toEqual(index)
      })
    })
    it('should return nonces from different closures', async () => {
      const promisedNonces: Array<Promise<BN>> = []
      for (let i = 0; i < 10; i += 1) {
        promisedNonces.push(dispatchNonceRetrieval(alice.address))
        promisedNonces.push(dispatchNonceRetrieval(alice.address))
      }
      const nonces = await Promise.all(promisedNonces)
      expect(nonces.length).toEqual(20)
      nonces.forEach((value, index) => {
        expect(value.toNumber()).toEqual(index)
      })
    })

    it('should return separate incrementing nonces per account', async () => {
      const alicePromisedNonces: Array<Promise<BN>> = []
      const bobPromisedNonces: Array<Promise<BN>> = []
      const chain = new Blockchain(api)
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
        expect(value.toNumber()).toEqual(index)
      })
      bobNonces.forEach((value, index) => {
        expect(value.toNumber()).toEqual(index)
      })
    })

    it('should return the highest read Nonce (mapped Index 1st read)', async () => {
      const chain = new Blockchain(api)
      const indexMap = jest
        .spyOn(chain['accountNonces'], 'get')
        .mockReturnValue(chain.api.registry.createType('Index', '1191220'))
      const nonce = await chain.getNonce(alice.address, true)

      expect(nonce.toNumber()).toEqual(1191220)
      indexMap.mockRestore()
    })

    it('should return the highest read Nonce (mapped Index 2nd read)', async () => {
      const chain = new Blockchain(api)
      const indexMap = jest
        .spyOn(chain['accountNonces'], 'get')
        .mockReturnValue(chain.api.registry.createType('Index', '11912201'))
        .mockReturnValueOnce(undefined)
      const nonce = await chain.getNonce(alice.address, true)

      expect(nonce.toNumber()).toEqual(11912201)
      indexMap.mockRestore()
    })
    it('should return the highest read Nonce (chain Index >= secondQuery)', async () => {
      const chain = new Blockchain(api)
      api.rpc.system.accountNextIndex.mockResolvedValue(
        chain.api.registry.createType('Index', '11912202')
      )

      const indexMap = jest
        .spyOn(chain['accountNonces'], 'get')
        .mockReturnValue(chain.api.registry.createType('Index', '11912201'))
        .mockReturnValueOnce(undefined)
      const nonce = await chain.getNonce(alice.address, true)

      expect(nonce.toNumber()).toEqual(11912202)
      indexMap.mockRestore()
    })
    it('should return the highest read Nonce (chain Index, !secondQuery)', async () => {
      const chain = new Blockchain(api)
      api.rpc.system.accountNextIndex.mockResolvedValue(
        chain.api.registry.createType('Index', '11912203')
      )

      const indexMap = jest
        .spyOn(chain['accountNonces'], 'get')
        .mockReturnValue(undefined)
      const nonce = await chain.getNonce(alice.address, true)

      expect(nonce.toNumber()).toEqual(11912203)
      indexMap.mockRestore()
    })
    it('should handle error when chain returns error', async () => {
      api.rpc.system.accountNextIndex.mockRejectedValue('Reason')
      const chain = new Blockchain(api)
      await expect(chain.getNonce(alice.address)).rejects.toThrow(
        Error(`Chain failed to retrieve nonce for : ${alice.address}`)
      )
    })
    it('should reset the mapped index', async () => {
      const chain = new Blockchain(api)
      chain['accountNonces'].set(
        alice.address,
        chain.api.registry.createType('Index', 100)
      )
      api.rpc.system.accountNextIndex.mockResolvedValue(
        chain.api.registry.createType('Index', 0)
      )

      const nonce = await chain.getNonce(alice.address, true)
      expect(nonce.toNumber()).toEqual(0)
    })
  })
  describe('reSignTx', () => {
    const submittable: SubmittableExtrinsic = ({
      signature: {
        toHuman: jest.fn(),
      },
      addSignature: jest.fn(),
      nonce: { toHuman: jest.fn() },
      method: { data: 'unchanged', toHex: jest.fn() },
    } as unknown) as SubmittableExtrinsic
    it('fetches updated Nonce and applies updated signature to Extrinsic', async () => {
      api.createType = jest
        .fn()
        .mockReturnValue({
          sign: jest.fn().mockReturnValue({ signature: 'signature' }),
        })
        .mockReturnValueOnce(({
          toPayload: jest
            .fn()
            .mockReturnValue(({} as unknown) as SignerPayloadJSON),
        } as unknown) as SignerPayload)
      const chain = new Blockchain(api)
      const getNonceSpy = jest
        .spyOn(chain, 'getNonce')
        .mockResolvedValue(chain.api.registry.createType('Index', 1))
      const reSigned = await chain.reSignTx(alice, submittable)
      expect(reSigned.method.data).toEqual(submittable.method.data)
      expect(getNonceSpy).toHaveBeenCalledWith(alice.address, true)
      expect(submittable.addSignature).toHaveBeenCalledWith(
        alice.address,
        expect.anything(),
        expect.anything()
      )
    })
  })
  describe('exported function submitSignedTx', () => {
    it('catches ERROR_TRANSACTION_USURPED and rejects Promise with Error Reason "Recoverable"', async () => {
      setDefault({ isUsurped: true })
      const chain = new Blockchain(api)
      const tx = chain.api.tx.balances.transfer(bob.address, 100)
      tx.signAsync(alice.signKeyringPair)
      await expect(
        submitSignedTx(tx, parseSubscriptionOptions())
      ).rejects.toThrow(Error('Recoverable'))
    }, 20_000)
    it('catches priority error and rejects Promise with Error Reason "Recoverable"', async () => {
      setDefault()
      const chain = new Blockchain(api)
      const tx = chain.api.tx.balances.transfer(bob.address, 100)
      tx.signAsync(alice.signKeyringPair)
      tx.send = jest.fn().mockRejectedValue(Error('Priority'))
      await expect(
        submitSignedTx(tx, parseSubscriptionOptions())
      ).rejects.toThrow(Error('Recoverable'))
    }, 20_000)
  })
})
describe('parseSubscriptionOptions', () => {
  it('takes incomplete SubscriptionPromiseOptions and sets default values where needed', async () => {
    const testfunction: ResultEvaluator = (result) => true
    expect(JSON.stringify(parseSubscriptionOptions())).toEqual(
      JSON.stringify({
        resolveOn: IS_FINALIZED,
        rejectOn: (result: SubmittableResult) =>
          IS_ERROR(result) || EXTRINSIC_FAILED(result) || IS_USURPED(result),
        timeout: undefined,
      })
    )
    expect(
      JSON.stringify(parseSubscriptionOptions({ resolveOn: testfunction }))
    ).toEqual(
      JSON.stringify({
        resolveOn: testfunction,
        rejectOn: (result: SubmittableResult) =>
          IS_ERROR(result) || EXTRINSIC_FAILED(result) || IS_USURPED(result),
        timeout: undefined,
      })
    )
    expect(
      JSON.stringify(
        parseSubscriptionOptions({
          resolveOn: testfunction,
          rejectOn: testfunction,
        })
      )
    ).toEqual(
      JSON.stringify({
        resolveOn: testfunction,
        rejectOn: testfunction,
        timeout: undefined,
      })
    )
    expect(
      JSON.stringify(
        parseSubscriptionOptions({
          resolveOn: testfunction,
          timeout: 10,
        })
      )
    ).toEqual(
      JSON.stringify({
        resolveOn: testfunction,
        rejectOn: (result: SubmittableResult) =>
          IS_ERROR(result) || EXTRINSIC_FAILED(result) || IS_USURPED(result),
        timeout: 10,
      })
    )
    expect(
      JSON.stringify(
        parseSubscriptionOptions({
          timeout: 10,
        })
      )
    ).toEqual(
      JSON.stringify({
        resolveOn: IS_FINALIZED,
        rejectOn: (result: SubmittableResult) =>
          IS_ERROR(result) || EXTRINSIC_FAILED(result) || IS_USURPED(result),
        timeout: 10,
      })
    )
  })
})
