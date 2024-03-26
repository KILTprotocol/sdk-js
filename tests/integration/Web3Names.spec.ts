/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'
import { randomAsHex } from '@polkadot/util-crypto'

import { disconnect } from '@kiltprotocol/chain-helpers'
import * as Did from '@kiltprotocol/did'
import type {
  DidDocument,
  KeyringPair,
  KiltKeyringPair,
} from '@kiltprotocol/types'

import {
  KeyTool,
  createFullDidFromSeed,
  makeSigningKeyTool,
} from '../testUtils/index.js'
import { createEndowedTestAccount, initializeApi, submitTx } from './utils.js'

let api: ApiPromise

beforeAll(async () => {
  api = await initializeApi()
}, 30_000)

describe('When there is an Web3NameCreator and a payer', () => {
  let w3nCreatorKey: KeyTool
  let otherW3NCreatorKey: KeyTool

  let w3nCreator: DidDocument
  let otherWeb3NameCreator: DidDocument
  let paymentAccount: KiltKeyringPair
  let otherPaymentAccount: KeyringPair
  let nick: string
  let differentNick: string

  beforeAll(async () => {
    nick = `nick_${randomAsHex(2)}`
    differentNick = `different_${randomAsHex(2)}`
    w3nCreatorKey = await makeSigningKeyTool()
    otherW3NCreatorKey = await makeSigningKeyTool()
    paymentAccount = await createEndowedTestAccount()
    otherPaymentAccount = await createEndowedTestAccount()
    w3nCreator = await createFullDidFromSeed(
      paymentAccount,
      w3nCreatorKey.keypair
    )
    otherWeb3NameCreator = await createFullDidFromSeed(
      paymentAccount,
      otherW3NCreatorKey.keypair
    )

    if (paymentAccount === otherPaymentAccount) {
      throw new Error('The payment accounts are the same')
    }
    if (w3nCreator === otherWeb3NameCreator) {
      throw new Error('The web3name creators are the same')
    }
  }, 60_000)

  it('should not be possible to create a w3n name w/o tokens', async () => {
    const tx = api.tx.web3Names.claim(nick)
    const bobbyBroke = (await makeSigningKeyTool()).keypair
    const authorizedTx = await Did.authorizeTx(
      w3nCreator.id,
      tx,
      await w3nCreatorKey.getSigners(w3nCreator),
      bobbyBroke.address
    )

    const p = submitTx(authorizedTx, bobbyBroke)

    await expect(p).rejects.toThrowError('Inability to pay some fees')
  }, 30_000)

  it('should be possible to create a w3n name with enough tokens', async () => {
    const tx = api.tx.web3Names.claim(nick)
    const authorizedTx = await Did.authorizeTx(
      w3nCreator.id,
      tx,
      await w3nCreatorKey.getSigners(w3nCreator),
      paymentAccount.address
    )

    await submitTx(authorizedTx, paymentAccount)
  }, 30_000)

  it('should be possible to lookup the DID with the given nick', async () => {
    const {
      document: { id },
    } = Did.linkedInfoFromChain(await api.call.did.queryByWeb3Name(nick))
    expect(id).toStrictEqual(w3nCreator.id)
  }, 30_000)

  it('should be possible to lookup the nick with the given DID', async () => {
    const encodedDidInfo = await api.call.did.query(Did.toChain(w3nCreator.id))
    const didInfo = Did.linkedInfoFromChain(encodedDidInfo)
    expect(didInfo.document.alsoKnownAs).toStrictEqual([`w3n:${nick}`])
  }, 30_000)

  it('should not be possible to create the same w3n twice', async () => {
    const tx = api.tx.web3Names.claim(nick)
    const authorizedTx = await Did.authorizeTx(
      otherWeb3NameCreator.id,
      tx,
      await otherW3NCreatorKey.getSigners(otherWeb3NameCreator),
      paymentAccount.address
    )

    const p = submitTx(authorizedTx, paymentAccount)

    await expect(p).rejects.toMatchObject({
      section: 'web3Names',
      name: expect.stringMatching(/^(Web3NameAlreadyClaimed|AlreadyExists)$/),
    })
  }, 30_000)

  it('should not be possible to create a second w3n for the same did', async () => {
    const tx = api.tx.web3Names.claim('nick2')
    const authorizedTx = await Did.authorizeTx(
      w3nCreator.id,
      tx,
      await w3nCreatorKey.getSigners(w3nCreator),
      paymentAccount.address
    )

    const p = submitTx(authorizedTx, paymentAccount)

    await expect(p).rejects.toMatchObject({
      section: 'web3Names',
      name: 'OwnerAlreadyExists',
    })
  }, 30_000)

  it('should not be possible to remove a w3n by another payment account', async () => {
    const tx = api.tx.web3Names.reclaimDeposit(nick)
    const p = submitTx(tx, otherPaymentAccount)
    await expect(p).rejects.toMatchObject({
      section: 'web3Names',
      name: 'NotAuthorized',
    })
  }, 30_000)

  it('should be possible to remove a w3n by the payment account', async () => {
    const tx = api.tx.web3Names.reclaimDeposit(nick)
    await submitTx(tx, paymentAccount)
  }, 30_000)

  it('should be possible to remove a w3n by the owner did', async () => {
    // prepare the w3n on chain
    const prepareTx = api.tx.web3Names.claim(differentNick)
    const prepareAuthorizedTx = await Did.authorizeTx(
      w3nCreator.id,
      prepareTx,
      await w3nCreatorKey.getSigners(w3nCreator),
      paymentAccount.address
    )
    await submitTx(prepareAuthorizedTx, paymentAccount)

    const tx = api.tx.web3Names.releaseByOwner()
    const authorizedTx = await Did.authorizeTx(
      w3nCreator.id,
      tx,
      await w3nCreatorKey.getSigners(w3nCreator),
      paymentAccount.address
    )
    await submitTx(authorizedTx, paymentAccount)
  }, 40_000)

  it('should be possible to reclaim a name after a w3n has been reclaimed by a payment account', async () => {
    const tx = api.tx.web3Names.claim(nick)
    const authorizedTx = await Did.authorizeTx(
      otherWeb3NameCreator.id,
      tx,
      await otherW3NCreatorKey.getSigners(otherWeb3NameCreator),
      paymentAccount.address
    )

    await submitTx(authorizedTx, paymentAccount)
    const encodedDidInfo = await api.call.did.query(
      Did.toChain(otherWeb3NameCreator.id)
    )
    const didInfo = Did.linkedInfoFromChain(encodedDidInfo)
    expect(didInfo.document.alsoKnownAs).toStrictEqual([`w3n:${nick}`])
  }, 40_000)
})

describe('Runtime constraints', () => {
  it('should not be possible to use a web3 name that is too short', async () => {
    const minNameLength = api.consts.web3Names.minNameLength.toNumber()
    const shortName = 'aa'
    expect(shortName.length).toBeLessThan(minNameLength)
  })

  it('should not be possible to use a web3 name that is too long', async () => {
    const maxNameLength = api.consts.web3Names.maxNameLength.toNumber()
    const longName = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    expect(longName.length).toBeGreaterThan(maxNameLength)
  })
})

afterAll(async () => {
  await disconnect()
})
