/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'

import { CType, disconnect } from '@kiltprotocol/core'
import * as Did from '@kiltprotocol/did'
import type { DidDocument, ICType, KiltKeyringPair } from '@kiltprotocol/types'
import { Crypto, UUID } from '@kiltprotocol/utils'

import {
  KeyTool,
  createFullDidFromSeed,
  makeSigningKeyTool,
} from '../testUtils/index.js'
import { createEndowedTestAccount, initializeApi, submitTx } from './utils.js'

let api: ApiPromise
// we skip fetching CTypes from chain for the old pallet version, where the necessary information was not yet on chain.
let hasBlockNumbers: boolean
beforeAll(async () => {
  api = await initializeApi()
  // @ts-ignore Not augmented for some reason
  hasBlockNumbers = (await api.query.ctype.palletVersion()).toNumber() >= 2
  if (!hasBlockNumbers) {
    console.warn(
      'detected pallet version < 2, skipping CType fetching which is not yet supported'
    )
  }
}, 30_000)

describe('When there is an CtypeCreator and a verifier', () => {
  let ctypeCreator: DidDocument
  let paymentAccount: KiltKeyringPair
  let key: KeyTool

  function makeCType(): ICType {
    return CType.fromProperties(`Ctype ${UUID.generate()}`, {
      name: { type: 'string' },
    })
  }

  beforeAll(async () => {
    paymentAccount = await createEndowedTestAccount()
    key = makeSigningKeyTool()
    ctypeCreator = await createFullDidFromSeed(paymentAccount, key.keypair)
  }, 60_000)

  it('should not be possible to create a claim type w/o tokens', async () => {
    const cType = makeCType()
    const { keypair, getSignCallback } = makeSigningKeyTool()
    const storeTx = api.tx.ctype.add(CType.toChain(cType))
    const authorizedStoreTx = await Did.authorizeTx(
      ctypeCreator.uri,
      storeTx,
      getSignCallback(ctypeCreator),
      keypair.address
    )
    await expect(submitTx(authorizedStoreTx, keypair)).rejects.toThrowError()
    await expect(CType.verifyStored(cType)).rejects.toThrow()
    if (hasBlockNumbers) {
      await expect(CType.fetchFromChain(cType.$id)).rejects.toThrow()
    }
  }, 20_000)

  it('should be possible to create a claim type', async () => {
    const cType = makeCType()
    const storeTx = api.tx.ctype.add(CType.toChain(cType))
    const authorizedStoreTx = await Did.authorizeTx(
      ctypeCreator.uri,
      storeTx,
      key.getSignCallback(ctypeCreator),
      paymentAccount.address
    )
    await submitTx(authorizedStoreTx, paymentAccount)

    if (hasBlockNumbers) {
      const { cType: originalCtype, creator } = await CType.fetchFromChain(
        cType.$id
      )
      expect(originalCtype).toStrictEqual(cType)
      expect(creator).toBe(ctypeCreator.uri)
      await expect(CType.verifyStored(originalCtype)).resolves.not.toThrow()
    }
  }, 40_000)

  it('should fetch a ctype created with dispatchAs', async () => {
    if (typeof api.tx.did.dispatchAs !== 'function' || !hasBlockNumbers) {
      console.warn('skipping dispatchAs tests')
      return
    }

    const minBalance = 10n ** 16n

    const assertionMethodKey = key.keypair.address
    // assertionMethod keypair needs balance
    if (
      (
        await api.query.system.account(assertionMethodKey)
      ).data.free.toBigInt() < minBalance
    ) {
      console.log('sending funds to assertion method key account...')
      const fundsTx = api.tx.balances.transfer(assertionMethodKey, minBalance)
      await submitTx(fundsTx, paymentAccount)
      console.log('sending funds completed')
    }

    const cType = makeCType()
    // nest ctype call for extra complexity
    const storeTx = api.tx.utility.batchAll([
      api.tx.ctype.add(CType.toChain(cType)),
    ])
    // authorize via dispatchAs
    const authorizedStoreTx = api.tx.did.dispatchAs(
      Did.toChain(ctypeCreator.uri),
      storeTx
    )
    // sign with assertionMethod keypair
    await submitTx(authorizedStoreTx, key.keypair)

    const { cType: originalCtype, creator } = await CType.fetchFromChain(
      cType.$id
    )
    expect(originalCtype).toStrictEqual(cType)
    expect(creator).toBe(ctypeCreator.uri)
    await expect(CType.verifyStored(originalCtype)).resolves.not.toThrow()
  }, 40_000)

  it('should not be possible to create a claim type that exists', async () => {
    const cType = makeCType()
    const storeTx = api.tx.ctype.add(CType.toChain(cType))
    const authorizedStoreTx = await Did.authorizeTx(
      ctypeCreator.uri,
      storeTx,
      key.getSignCallback(ctypeCreator),
      paymentAccount.address
    )
    await submitTx(authorizedStoreTx, paymentAccount)

    const storeTx2 = api.tx.ctype.add(CType.toChain(cType))
    const authorizedStoreTx2 = await Did.authorizeTx(
      ctypeCreator.uri,
      storeTx2,
      key.getSignCallback(ctypeCreator),
      paymentAccount.address
    )
    await expect(
      submitTx(authorizedStoreTx2, paymentAccount)
    ).rejects.toMatchObject({
      section: 'ctype',
      name: expect.stringMatching(/^(CType)?AlreadyExists$/),
    })

    if (hasBlockNumbers) {
      const retrievedCType = await CType.fetchFromChain(cType.$id)
      expect(retrievedCType.creator).toBe(ctypeCreator.uri)
    }
  }, 45_000)

  it('should tell when a ctype is not on chain', async () => {
    const iAmNotThere = CType.fromProperties('ctype2', {
      game: { type: 'string' },
    })

    await expect(CType.verifyStored(iAmNotThere)).rejects.toThrow()
    if (hasBlockNumbers) {
      await expect(CType.fetchFromChain(iAmNotThere.$id)).rejects.toThrow()
    }
    const fakeHash = Crypto.hashStr('abcdefg')
    expect((await api.query.ctype.ctypes(fakeHash)).isNone).toBe(true)
  })
})

afterAll(async () => {
  await disconnect()
})
