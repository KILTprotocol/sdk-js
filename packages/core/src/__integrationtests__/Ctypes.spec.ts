/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/ctype
 */

import type { DidDetails, ICType, KiltKeyringPair } from '@kiltprotocol/types'
import * as Did from '@kiltprotocol/did'
import {
  createFullDidFromSeed,
  KeyTool,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import { Crypto } from '@kiltprotocol/utils'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
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
  await initializeApi()
  api = await BlockchainApiConnection.getConnectionOrConnect()
}, 30_000)

describe('When there is an CtypeCreator and a verifier', () => {
  let ctypeCreator: DidDetails
  let paymentAccount: KiltKeyringPair
  let ctypeCounter = 0
  let key: KeyTool

  function makeCType(): ICType {
    ctypeCounter += 1
    return CType.fromSchema({
      $id: `kilt:ctype:0x${ctypeCounter}`,
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: `ctype${ctypeCounter}`,
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    } as ICType['schema'])
  }

  beforeAll(async () => {
    paymentAccount = await createEndowedTestAccount()
    key = makeSigningKeyTool()
    ctypeCreator = await createFullDidFromSeed(paymentAccount, key.keypair)
  }, 60_000)

  it('should not be possible to create a claim type w/o tokens', async () => {
    const ctype = makeCType()
    const { keypair, sign } = makeSigningKeyTool()
    const storeTx = api.tx.ctype.add(CType.encode(ctype))
    const authorizedStoreTx = await Did.authorizeExtrinsic(
      ctypeCreator,
      storeTx,
      sign,
      keypair.address
    )
    await expect(
      submitExtrinsic(authorizedStoreTx, keypair)
    ).rejects.toThrowError()
    expect(await CType.verifyStored(ctype)).toBe(false)
  }, 20_000)

  it('should be possible to create a claim type', async () => {
    const ctype = makeCType()
    const storeTx = api.tx.ctype.add(CType.encode(ctype))
    const authorizedStoreTx = await Did.authorizeExtrinsic(
      ctypeCreator,
      storeTx,
      key.sign,
      paymentAccount.address
    )
    await submitExtrinsic(authorizedStoreTx, paymentAccount)

    expect(CType.decode(await api.query.ctype.ctypes(ctype.hash))).toBe(
      ctypeCreator.uri
    )
    expect(await CType.verifyStored(ctype)).toBe(true)

    ctype.owner = ctypeCreator.uri
    expect(await CType.verifyStored(ctype)).toBe(true)
  }, 40_000)

  it('should not be possible to create a claim type that exists', async () => {
    const ctype = makeCType()
    const storeTx = api.tx.ctype.add(CType.encode(ctype))
    const authorizedStoreTx = await Did.authorizeExtrinsic(
      ctypeCreator,
      storeTx,
      key.sign,
      paymentAccount.address
    )
    await submitExtrinsic(authorizedStoreTx, paymentAccount)

    const storeTx2 = api.tx.ctype.add(CType.encode(ctype))
    const authorizedStoreTx2 = await Did.authorizeExtrinsic(
      ctypeCreator,
      storeTx2,
      key.sign,
      paymentAccount.address
    )
    await expect(
      submitExtrinsic(authorizedStoreTx2, paymentAccount)
    ).rejects.toMatchObject({ section: 'ctype', name: 'CTypeAlreadyExists' })

    expect(CType.decode(await api.query.ctype.ctypes(ctype.hash))).toBe(
      ctypeCreator.uri
    )
  }, 45_000)

  it('should tell when a ctype is not on chain', async () => {
    const iAmNotThere = CType.fromSchema({
      $id: 'kilt:ctype:0x2',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'ctype2',
      properties: {
        game: { type: 'string' },
      },
      type: 'object',
    } as ICType['schema'])

    const iAmNotThereWithOwner = CType.fromSchema(
      {
        $id: 'kilt:ctype:0x3',
        $schema: 'http://kilt-protocol.org/draft-01/ctype#',
        title: 'ctype2',
        properties: {
          game: { type: 'string' },
        },
        type: 'object',
      },
      ctypeCreator.uri
    )

    expect(await CType.verifyStored(iAmNotThere)).toBe(false)
    expect((await api.query.ctype.ctypes(iAmNotThere.hash)).isNone).toBe(true)

    const fakeHash = Crypto.hashStr('abcdefg')
    expect((await api.query.ctype.ctypes(fakeHash)).isNone).toBe(true)

    expect(await CType.verifyStored(iAmNotThereWithOwner)).toBe(false)
  })
})

afterAll(async () => {
  await disconnect()
})
