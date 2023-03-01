/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/web3name
 */

import { randomAsHex } from '@polkadot/util-crypto'

import type {
  DidDocument,
  KeyringPair,
  KiltKeyringPair,
} from '@kiltprotocol/types'
import {
  createFullDidFromSeed,
  KeyTool,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import * as Did from '@kiltprotocol/did'
import type { ApiPromise } from '@polkadot/api'
import { disconnect } from '../kilt'
import { createEndowedTestAccount, initializeApi, submitTx } from './utils'

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
  let nick: Did.Web3Name
  let differentNick: Did.Web3Name

  beforeAll(async () => {
    nick = `nick_${randomAsHex(2)}`
    differentNick = `different_${randomAsHex(2)}`
    w3nCreatorKey = makeSigningKeyTool()
    otherW3NCreatorKey = makeSigningKeyTool()
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
    const bobbyBroke = makeSigningKeyTool().keypair
    const authorizedTx = await Did.authorizeTx(
      w3nCreator.uri,
      tx,
      w3nCreatorKey.getSignCallback(w3nCreator),
      bobbyBroke.address
    )

    const p = submitTx(authorizedTx, bobbyBroke)

    await expect(p).rejects.toThrowError('Inability to pay some fees')
  }, 30_000)

  it('should be possible to create a w3n name with enough tokens', async () => {
    const tx = api.tx.web3Names.claim(nick)
    const authorizedTx = await Did.authorizeTx(
      w3nCreator.uri,
      tx,
      w3nCreatorKey.getSignCallback(w3nCreator),
      paymentAccount.address
    )

    await submitTx(authorizedTx, paymentAccount)
  }, 30_000)

  it('should be possible to lookup the DID uri with the given nick', async () => {
    const {
      document: { uri },
    } = Did.linkedInfoFromChain(await api.call.did.queryByWeb3Name(nick))
    expect(uri).toStrictEqual(w3nCreator.uri)
  }, 30_000)

  it('should be possible to lookup the nick with the given DID uri', async () => {
    const encodedDidInfo = await api.call.did.query(Did.toChain(w3nCreator.uri))
    const didInfo = Did.linkedInfoFromChain(encodedDidInfo)
    expect(didInfo.web3Name).toBe(nick)
  }, 30_000)

  it('should not be possible to create the same w3n twice', async () => {
    const tx = api.tx.web3Names.claim(nick)
    const authorizedTx = await Did.authorizeTx(
      otherWeb3NameCreator.uri,
      tx,
      otherW3NCreatorKey.getSignCallback(otherWeb3NameCreator),
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
      w3nCreator.uri,
      tx,
      w3nCreatorKey.getSignCallback(w3nCreator),
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
      w3nCreator.uri,
      prepareTx,
      w3nCreatorKey.getSignCallback(w3nCreator),
      paymentAccount.address
    )
    await submitTx(prepareAuthorizedTx, paymentAccount)

    const tx = api.tx.web3Names.releaseByOwner()
    const authorizedTx = await Did.authorizeTx(
      w3nCreator.uri,
      tx,
      w3nCreatorKey.getSignCallback(w3nCreator),
      paymentAccount.address
    )
    await submitTx(authorizedTx, paymentAccount)
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
