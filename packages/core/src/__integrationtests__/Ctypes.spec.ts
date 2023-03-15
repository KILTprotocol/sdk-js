/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/ctype
 */

import type { DidDocument, ICType, KiltKeyringPair } from '@kiltprotocol/types'
import * as Did from '@kiltprotocol/did'
import {
  createFullDidFromSeed,
  KeyTool,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import { Crypto, UUID } from '@kiltprotocol/utils'
import { ApiPromise } from '@polkadot/api'
import * as CType from '../ctype'
import { disconnect } from '../kilt'
import { createEndowedTestAccount, initializeApi, submitTx } from './utils'

let api: ApiPromise
// we skip fetching CTypes from chain for the old pallet version, where the necessary information was not yet on chain.
let hasBlockNumbers: boolean
beforeAll(async () => {
  api = await initializeApi()
  // @ts-expect-error Not augmented for some reason
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
    const ctype = makeCType()
    const { keypair, getSignCallback } = makeSigningKeyTool()
    const storeTx = api.tx.ctype.add(CType.toChain(ctype))
    const authorizedStoreTx = await Did.authorizeTx(
      ctypeCreator.uri,
      storeTx,
      getSignCallback(ctypeCreator),
      keypair.address
    )
    await expect(submitTx(authorizedStoreTx, keypair)).rejects.toThrowError()
    await expect(CType.verifyStored(ctype)).rejects.toThrow()
    if (hasBlockNumbers) {
      await expect(CType.fetchFromChain(ctype.$id)).rejects.toThrow()
    }
  }, 20_000)

  it('should be possible to create a claim type', async () => {
    const ctype = makeCType()
    const storeTx = api.tx.ctype.add(CType.toChain(ctype))
    const authorizedStoreTx = await Did.authorizeTx(
      ctypeCreator.uri,
      storeTx,
      key.getSignCallback(ctypeCreator),
      paymentAccount.address
    )
    await submitTx(authorizedStoreTx, paymentAccount)

    if (hasBlockNumbers) {
      const retrievedCType = await CType.fetchFromChain(ctype.$id)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { createdAt, creator, ...originalCtype } = retrievedCType
      expect(originalCtype).toStrictEqual(ctype)
      expect(creator).toBe(ctypeCreator.uri)
      await expect(CType.verifyStored(retrievedCType)).resolves.not.toThrow()
    }
  }, 40_000)

  it('should not be possible to create a claim type that exists', async () => {
    const ctype = makeCType()
    const storeTx = api.tx.ctype.add(CType.toChain(ctype))
    const authorizedStoreTx = await Did.authorizeTx(
      ctypeCreator.uri,
      storeTx,
      key.getSignCallback(ctypeCreator),
      paymentAccount.address
    )
    await submitTx(authorizedStoreTx, paymentAccount)

    const storeTx2 = api.tx.ctype.add(CType.toChain(ctype))
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
      const retrievedCType = await CType.fetchFromChain(ctype.$id)
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
