/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/ctype
 */

import { ICType, KeyringPair } from '@kiltprotocol/types'
import { FullDidDetails } from '@kiltprotocol/did'
import {
  createFullDidFromSeed,
  KeyTool,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import { Crypto } from '@kiltprotocol/utils'
import * as CType from '../ctype'
import { getOwner } from '../ctype/CType.chain'
import { disconnect } from '../kilt'
import {
  createEndowedTestAccount,
  initializeApi,
  submitExtrinsic,
} from './utils'

beforeAll(async () => {
  await initializeApi()
}, 30_000)

describe('When there is an CtypeCreator and a verifier', () => {
  let ctypeCreator: FullDidDetails
  let paymentAccount: KeyringPair
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
    await expect(
      CType.getStoreTx(ctype)
        .then((tx) =>
          ctypeCreator.authorizeExtrinsic(tx, sign, keypair.address)
        )
        .then((tx) => submitExtrinsic(tx, keypair))
    ).rejects.toThrowError()
    await expect(CType.verifyStored(ctype)).resolves.toBeFalsy()
  }, 20_000)

  it('should be possible to create a claim type', async () => {
    const ctype = makeCType()
    await CType.getStoreTx(ctype)
      .then((tx) =>
        ctypeCreator.authorizeExtrinsic(tx, key.sign, paymentAccount.address)
      )
      .then((tx) => submitExtrinsic(tx, paymentAccount))
    await Promise.all([
      expect(getOwner(ctype.hash)).resolves.toBe(ctypeCreator.uri),
      expect(CType.verifyStored(ctype)).resolves.toBeTruthy(),
    ])
    ctype.owner = ctypeCreator.uri
    await expect(CType.verifyStored(ctype)).resolves.toBeTruthy()
  }, 40_000)

  it('should not be possible to create a claim type that exists', async () => {
    const ctype = makeCType()
    await CType.getStoreTx(ctype)
      .then((tx) =>
        ctypeCreator.authorizeExtrinsic(tx, key.sign, paymentAccount.address)
      )
      .then((tx) => submitExtrinsic(tx, paymentAccount))
    await expect(
      CType.getStoreTx(ctype)
        .then((tx) =>
          ctypeCreator.authorizeExtrinsic(tx, key.sign, paymentAccount.address)
        )
        .then((tx) => submitExtrinsic(tx, paymentAccount))
    ).rejects.toMatchObject({ section: 'ctype', name: 'CTypeAlreadyExists' })
    // console.log('Triggered error on re-submit')
    await expect(getOwner(ctype.hash)).resolves.toBe(ctypeCreator.uri)
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

    await Promise.all([
      expect(CType.verifyStored(iAmNotThere)).resolves.toBeFalsy(),
      expect(getOwner(iAmNotThere.hash)).resolves.toBeNull(),
      expect(getOwner(Crypto.hashStr('abcdefg'))).resolves.toBeNull(),
      expect(CType.verifyStored(iAmNotThereWithOwner)).resolves.toBeFalsy(),
    ])
  })
})

afterAll(() => {
  disconnect()
})
