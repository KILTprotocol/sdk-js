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
import { FullDidDetails, DemoKeystore } from '@kiltprotocol/did'
import { Crypto } from '@kiltprotocol/utils'
import { CType } from '../ctype/CType'
import { getOwner } from '../ctype/CType.chain'
import { disconnect } from '../kilt'
import {
  createEndowedTestAccount,
  createFullDidFromSeed,
  initializeApi,
  keypairFromRandom,
  submitExtrinsicWithResign,
} from './utils'

beforeAll(async () => {
  await initializeApi()
}, 30_000)

describe('When there is an CtypeCreator and a verifier', () => {
  let ctypeCreator: FullDidDetails
  let paymentAccount: KeyringPair
  let ctypeCounter = 0
  const keystore = new DemoKeystore()

  function makeCType(): CType {
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
    ctypeCreator = await createFullDidFromSeed(paymentAccount, keystore)
  }, 60_000)

  it('should not be possible to create a claim type w/o tokens', async () => {
    const ctype = makeCType()
    const bobbyBroke = keypairFromRandom()
    await expect(
      ctype
        .getStoreTx()
        .then((tx) =>
          ctypeCreator.authorizeExtrinsic(tx, keystore, bobbyBroke.address)
        )
        .then((tx) => submitExtrinsicWithResign(tx, bobbyBroke))
    ).rejects.toThrowError()
    await expect(ctype.verifyStored()).resolves.toBeFalsy()
  }, 20_000)

  it('should be possible to create a claim type', async () => {
    const ctype = makeCType()
    await ctype
      .getStoreTx()
      .then((tx) =>
        ctypeCreator.authorizeExtrinsic(tx, keystore, paymentAccount.address)
      )
      .then((tx) => submitExtrinsicWithResign(tx, paymentAccount))
    await Promise.all([
      expect(getOwner(ctype.hash)).resolves.toBe(ctypeCreator.uri),
      expect(ctype.verifyStored()).resolves.toBeTruthy(),
    ])
    ctype.owner = ctypeCreator.uri
    await expect(ctype.verifyStored()).resolves.toBeTruthy()
  }, 40_000)

  it('should not be possible to create a claim type that exists', async () => {
    const ctype = makeCType()
    await ctype
      .getStoreTx()
      .then((tx) =>
        ctypeCreator.authorizeExtrinsic(tx, keystore, paymentAccount.address)
      )
      .then((tx) => submitExtrinsicWithResign(tx, paymentAccount))
    await expect(
      ctype
        .getStoreTx()
        .then((tx) =>
          ctypeCreator.authorizeExtrinsic(tx, keystore, paymentAccount.address)
        )
        .then((tx) => submitExtrinsicWithResign(tx, paymentAccount))
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
      expect(iAmNotThere.verifyStored()).resolves.toBeFalsy(),
      expect(getOwner(iAmNotThere.hash)).resolves.toBeNull(),
      expect(getOwner(Crypto.hashStr('abcdefg'))).resolves.toBeNull(),
      expect(iAmNotThereWithOwner.verifyStored()).resolves.toBeFalsy(),
    ])
  })
})

afterAll(() => {
  disconnect()
})
