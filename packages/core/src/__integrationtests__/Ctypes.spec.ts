/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
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
import { Crypto } from '@kiltprotocol/utils'
import { ApiPromise } from '@polkadot/api'
import * as CType from '../ctype'
import { disconnect } from '../kilt'
import {
  createEndowedTestAccount,
  initializeApi,
  submitExtrinsic,
} from './utils'

let api: ApiPromise
beforeAll(async () => {
  api = await initializeApi()
}, 30_000)

describe('When there is an CtypeCreator and a verifier', () => {
  let ctypeCreator: DidDocument
  let paymentAccount: KiltKeyringPair
  let ctypeCounter = 0
  let key: KeyTool

  function makeCType(): ICType {
    ctypeCounter += 1
    return {
      $id: `kilt:ctype:0x${ctypeCounter}`,
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: `ctype${ctypeCounter}`,
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }
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
    const authorizedStoreTx = await Did.authorizeExtrinsic(
      ctypeCreator.uri,
      storeTx,
      getSignCallback(ctypeCreator),
      keypair.address
    )
    await expect(
      submitExtrinsic(authorizedStoreTx, keypair)
    ).rejects.toThrowError()
    await expect(CType.verifyStored(ctype)).rejects.toThrow()
  }, 20_000)

  it('should be possible to create a claim type', async () => {
    const ctype = makeCType()
    const storeTx = api.tx.ctype.add(CType.toChain(ctype))
    const authorizedStoreTx = await Did.authorizeExtrinsic(
      ctypeCreator.uri,
      storeTx,
      key.getSignCallback(ctypeCreator),
      paymentAccount.address
    )
    await submitExtrinsic(authorizedStoreTx, paymentAccount)

    expect(
      CType.fromChain(
        await api.query.ctype.ctypes(CType.getCTypeHashFromId(ctype.$id))
      )
    ).toBe(ctypeCreator.uri)
    await expect(CType.verifyStored(ctype)).resolves.not.toThrow()
  }, 40_000)

  it('should not be possible to create a claim type that exists', async () => {
    const ctype = makeCType()
    const storeTx = api.tx.ctype.add(CType.toChain(ctype))
    const authorizedStoreTx = await Did.authorizeExtrinsic(
      ctypeCreator.uri,
      storeTx,
      key.getSignCallback(ctypeCreator),
      paymentAccount.address
    )
    await submitExtrinsic(authorizedStoreTx, paymentAccount)

    const storeTx2 = api.tx.ctype.add(CType.toChain(ctype))
    const authorizedStoreTx2 = await Did.authorizeExtrinsic(
      ctypeCreator.uri,
      storeTx2,
      key.getSignCallback(ctypeCreator),
      paymentAccount.address
    )
    await expect(
      submitExtrinsic(authorizedStoreTx2, paymentAccount)
    ).rejects.toMatchObject({ section: 'ctype', name: 'CTypeAlreadyExists' })

    expect(
      CType.fromChain(
        await api.query.ctype.ctypes(CType.getCTypeHashFromId(ctype.$id))
      )
    ).toBe(ctypeCreator.uri)
  }, 45_000)

  it('should tell when a ctype is not on chain', async () => {
    const iAmNotThere: ICType = {
      $id: 'kilt:ctype:0x2',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'ctype2',
      properties: {
        game: { type: 'string' },
      },
      type: 'object',
    }

    const iAmNotThereWithOwner: ICType = {
      $id: 'kilt:ctype:0x3',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'ctype2',
      properties: {
        game: { type: 'string' },
      },
      type: 'object',
    }

    await expect(CType.verifyStored(iAmNotThere)).rejects.toThrow()
    expect(
      (await api.query.ctype.ctypes(CType.getCTypeHashFromId(iAmNotThere.$id)))
        .isNone
    ).toBe(true)

    const fakeHash = Crypto.hashStr('abcdefg')
    expect((await api.query.ctype.ctypes(fakeHash)).isNone).toBe(true)

    await expect(CType.verifyStored(iAmNotThereWithOwner)).rejects.toThrow()
  })
})

afterAll(async () => {
  await disconnect()
})
