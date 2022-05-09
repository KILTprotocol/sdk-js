/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/blockchain
 */

/* eslint-disable dot-notation */
import { Keyring } from '@kiltprotocol/utils'
import { Text } from '@polkadot/types'
import type { SignerPayload } from '@polkadot/types/interfaces/types'
import type { SignerPayloadJSON } from '@polkadot/types/types/extrinsic'
import { BN } from '@polkadot/util'
import type {
  IIdentity,
  ISubmittableResult,
  SubmittableExtrinsic,
  SubscriptionPromise,
} from '@kiltprotocol/types'
import { ApiMocks } from '@kiltprotocol/testing'
import {
  getConnectionOrConnect,
  setConnection,
} from '../blockchainApiConnection/BlockchainApiConnection'
import { Blockchain } from './Blockchain'
import {
  EXTRINSIC_FAILED,
  isRecoverableTxError,
  IS_ERROR,
  IS_FINALIZED,
  parseSubscriptionOptions,
  submitSignedTx,
} from './Blockchain.utils'

let api: any

beforeAll(() => {
  api = ApiMocks.getMockedApi()
  setConnection(Promise.resolve(new Blockchain(api)))
})

describe('queries', () => {
  beforeAll(() => {
    api.rpc.system.version.mockResolvedValue(new Text(api.registry, '1.0.0'))
    api.rpc.system.chain.mockResolvedValue(new Text(api.registry, 'mockchain'))
    api.rpc.system.name.mockResolvedValue(new Text(api.registry, 'KILT node'))

    api.rpc.chain.subscribeNewHeads = jest.fn(async (listener) => {
      listener('mockHead')
      return jest.fn()
    })
  })

  it('should get stats', async () => {
    const blockchain = await getConnectionOrConnect()

    await expect(blockchain.getStats()).resolves.toMatchObject({
      chain: 'mockchain',
      nodeName: 'KILT node',
      nodeVersion: '1.0.0',
    })
  })

  it('should listen to blocks', async () => {
    const listener = jest.fn()
    const blockchain = await getConnectionOrConnect()
    const unsubscribe = await blockchain.listenToBlocks(listener)
    expect(listener).toBeCalledWith('mockHead')
    expect(unsubscribe()).toBeUndefined()
  })
})

describe('Tx logic', () => {
  let alice: IIdentity
  let bob: IIdentity
  const dispatchNonceRetrieval = async (address: string): Promise<BN> => {
    const chain = await getConnectionOrConnect()
    return chain.getNonce(address)
  }
  beforeAll(async () => {
    const keyring = new Keyring({
      type: 'ed25519',
      // KILT has registered the ss58 prefix 38
      ss58Format: 38,
    })
    const alicePair = keyring.createFromUri('//Alice')
    alice = {
      signKeyringPair: alicePair,
      address: alicePair.address,
    } as IIdentity
    const bobPair = keyring.createFromUri('//Bob')
    bob = {
      signKeyringPair: bobPair,
      address: bobPair.address,
    } as IIdentity
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
        .mockReturnValue(new BN(1191220))
      const nonce = await chain.getNonce(alice.address)

      expect(nonce.toNumber()).toEqual(1191220)
      indexMap.mockRestore()
    })

    it('should return the highest read Nonce (mapped Index 2nd read)', async () => {
      const chain = new Blockchain(api)
      const indexMap = jest
        .spyOn(chain['accountNonces'], 'get')
        .mockReturnValue(new BN(11912201))
        .mockReturnValueOnce(undefined)
      const nonce = await chain.getNonce(alice.address)

      expect(nonce.toNumber()).toEqual(11912201)
      indexMap.mockRestore()
    })

    it('should return the highest read Nonce (chain Index > secondQuery)', async () => {
      const chain = new Blockchain(api)
      api.rpc.system.accountNextIndex.mockResolvedValue(new BN(11912202))

      const indexMap = jest
        .spyOn(chain['accountNonces'], 'get')
        .mockReturnValue(new BN(11912201))
        .mockReturnValueOnce(undefined)
      const nonce = await chain.getNonce(alice.address)

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
      const nonce = await chain.getNonce(alice.address)

      expect(nonce.toNumber()).toEqual(11912203)
      indexMap.mockRestore()
    })

    it('should reject when chain returns error', async () => {
      api.rpc.system.accountNextIndex.mockRejectedValue('Reason')
      const chain = new Blockchain(api)
      await expect(chain.getNonce(alice.address)).rejects.toThrow(
        Error(`Chain failed to retrieve nonce for : ${alice.address}`)
      )
    })
  })

  describe('reSignTx', () => {
    const submittable: SubmittableExtrinsic = {
      signature: {
        toHuman: jest.fn(),
      },
      addSignature: jest.fn(),
      nonce: { toHuman: jest.fn() },
      method: { data: 'unchanged', toHex: jest.fn() },
    } as unknown as SubmittableExtrinsic

    it('fetches updated Nonce and applies updated signature to Extrinsic', async () => {
      api.createType = jest
        .fn()
        .mockReturnValue({
          sign: jest.fn().mockReturnValue({ signature: 'signature' }),
        })
        .mockReturnValueOnce({
          toPayload: jest
            .fn()
            .mockReturnValue({} as unknown as SignerPayloadJSON),
        } as unknown as SignerPayload)
      const chain = new Blockchain(api)
      const getNonceSpy = jest
        .spyOn(chain, 'getNonce')
        .mockResolvedValue(new BN(1))
      const deleteEntrySpy = jest.spyOn(chain['accountNonces'], 'delete')
      const reSigned = await chain.reSignTx(alice, submittable)
      expect(deleteEntrySpy).toHaveBeenCalledWith(alice.address)
      expect(reSigned.method.data).toEqual(submittable.method.data)
      expect(getNonceSpy).toHaveBeenCalledWith(alice.address)
      expect(submittable.addSignature).toHaveBeenCalledWith(
        alice.address,
        expect.anything(),
        expect.anything()
      )
    })
  })

  describe('utils exported function submitSignedTx', () => {
    it('catches ERROR_TRANSACTION_USURPED and discovers as recoverable', async () => {
      api.__setDefaultResult({ isUsurped: true })
      const chain = new Blockchain(api)
      const tx = chain.api.tx.balances.transfer(bob.address, 100)
      tx.signAsync(alice.signKeyringPair)
      await expect(
        submitSignedTx(tx, parseSubscriptionOptions()).catch((e) =>
          isRecoverableTxError(e)
        )
      ).resolves.toBe(true)
    }, 20_000)

    it('catches priority error and discovers as recoverable', async () => {
      api.__setDefaultResult()
      const chain = new Blockchain(api)
      const tx = chain.api.tx.balances.transfer(bob.address, 100)
      tx.signAsync(alice.signKeyringPair)
      tx.send = jest.fn().mockRejectedValue(Error('1014: Priority is too low:'))
      await expect(
        submitSignedTx(tx, parseSubscriptionOptions()).catch((e) =>
          isRecoverableTxError(e)
        )
      ).resolves.toBe(true)
    }, 20_000)

    it('catches Already Imported error and discovers as recoverable', async () => {
      api.__setDefaultResult()
      const chain = new Blockchain(api)
      const tx = chain.api.tx.balances.transfer(bob.address, 100)
      tx.signAsync(alice.signKeyringPair)
      tx.send = jest
        .fn()
        .mockRejectedValue(Error('Transaction Already Imported'))
      await expect(
        submitSignedTx(tx, parseSubscriptionOptions()).catch((e) =>
          isRecoverableTxError(e)
        )
      ).resolves.toBe(true)
    }, 20_000)

    it('catches Outdated/Stale Tx error and discovers as recoverable', async () => {
      api.__setDefaultResult()
      const chain = new Blockchain(api)
      const tx = chain.api.tx.balances.transfer(bob.address, 100)
      tx.signAsync(alice.signKeyringPair)
      tx.send = jest
        .fn()
        .mockRejectedValue(
          Error('1010: Invalid Transaction: Transaction is outdated')
        )
      await expect(
        submitSignedTx(tx, parseSubscriptionOptions()).catch((e) =>
          isRecoverableTxError(e)
        )
      ).resolves.toBe(true)
    }, 20_000)
  })

  describe('Blockchain class method submitSignedTx', () => {
    it('Retries to send up to two times if recoverable error is caught', async () => {
      api.__setDefaultResult({ isUsurped: true })
      const chain = new Blockchain(api)
      const tx = chain.api.tx.balances.transfer(bob.address, 100)
      tx.signAsync(alice.signKeyringPair)
      const reSignSpy = jest
        .spyOn(chain, 'reSignTx')
        .mockImplementation(async (id, Tx) => {
          return Tx
        })
      await expect(
        chain
          .submitSignedTxWithReSign(tx, alice)
          .catch((e) => isRecoverableTxError(e))
      ).resolves.toBe(true)

      expect(reSignSpy).toHaveBeenCalledTimes(2)
    })
  })
})

describe('parseSubscriptionOptions', () => {
  it('takes incomplete SubscriptionPromiseOptions and sets default values where needed', async () => {
    const testfunction: SubscriptionPromise.ResultEvaluator = () => true
    expect(JSON.stringify(parseSubscriptionOptions())).toEqual(
      JSON.stringify({
        resolveOn: IS_FINALIZED,
        rejectOn: (result: ISubmittableResult) =>
          IS_ERROR(result) || EXTRINSIC_FAILED(result),
        timeout: undefined,
      })
    )
    expect(
      JSON.stringify(parseSubscriptionOptions({ resolveOn: testfunction }))
    ).toEqual(
      JSON.stringify({
        resolveOn: testfunction,
        rejectOn: (result: ISubmittableResult) =>
          IS_ERROR(result) || EXTRINSIC_FAILED(result),
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
        rejectOn: (result: ISubmittableResult) =>
          IS_ERROR(result) || EXTRINSIC_FAILED(result),
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
        rejectOn: (result: ISubmittableResult) =>
          IS_ERROR(result) || EXTRINSIC_FAILED(result),
        timeout: 10,
      })
    )
  })
})
