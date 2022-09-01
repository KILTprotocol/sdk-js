/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/web3name
 */

import { randomAsHex } from '@polkadot/util-crypto'

import type {
  DidDetails,
  KeyringPair,
  KiltKeyringPair,
} from '@kiltprotocol/types'
import {
  createFullDidFromSeed,
  KeyTool,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import { Web3Names } from '@kiltprotocol/did'
import * as Did from '@kiltprotocol/did'
import { ApiPromise } from '@polkadot/api'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
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

describe('When there is an Web3NameCreator and a payer', () => {
  let w3nCreatorKey: KeyTool
  let otherW3NCreatorKey: KeyTool

  let w3nCreator: DidDetails
  let otherWeb3NameCreator: DidDetails
  let paymentAccount: KiltKeyringPair
  let otherPaymentAccount: KeyringPair
  let nick: Web3Names.Web3Name
  let differentNick: Web3Names.Web3Name

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
    const tx = await api.tx.web3Names.claim(nick)
    const bobbyBroke = makeSigningKeyTool().keypair
    const authorizedTx = await Did.authorizeExtrinsic(
      w3nCreator,
      tx,
      w3nCreatorKey.sign,
      bobbyBroke.address
    )

    const p = submitExtrinsic(authorizedTx, bobbyBroke)

    await expect(p).rejects.toThrowError('Inability to pay some fees')
  }, 30_000)

  it('should be possible to create a w3n name with enough tokens', async () => {
    const tx = await api.tx.web3Names.claim(nick)
    const authorizedTx = await Did.authorizeExtrinsic(
      w3nCreator,
      tx,
      w3nCreatorKey.sign,
      paymentAccount.address
    )

    await submitExtrinsic(authorizedTx, paymentAccount)
  }, 30_000)

  it('should be possible to lookup the DID uri with the given nick', async () => {
    const did = await Web3Names.queryDidForWeb3Name(nick)
    expect(did).toBe(w3nCreator.uri)
  }, 30_000)

  it('should be possible to lookup the nick with the given DID uri', async () => {
    const resolved = await Web3Names.queryWeb3NameForDid(w3nCreator.uri)
    expect(resolved).toBe(nick)
  }, 30_000)

  it('should not be possible to create the same w3n twice', async () => {
    const tx = await api.tx.web3Names.claim(nick)
    const authorizedTx = await Did.authorizeExtrinsic(
      otherWeb3NameCreator,
      tx,
      otherW3NCreatorKey.sign,
      paymentAccount.address
    )

    const p = submitExtrinsic(authorizedTx, paymentAccount)

    await expect(p).rejects.toMatchObject({
      section: 'web3Names',
      name: 'Web3NameAlreadyClaimed',
    })
  }, 30_000)

  it('should not be possible to create a second w3n for the same did', async () => {
    const tx = await api.tx.web3Names.claim('nick2')
    const authorizedTx = await Did.authorizeExtrinsic(
      w3nCreator,
      tx,
      w3nCreatorKey.sign,
      paymentAccount.address
    )

    const p = submitExtrinsic(authorizedTx, paymentAccount)

    await expect(p).rejects.toMatchObject({
      section: 'web3Names',
      name: 'OwnerAlreadyExists',
    })
  }, 30_000)

  it('should not be possible to remove a w3n by another payment account', async () => {
    const tx = await Web3Names.getReclaimDepositTx(nick)
    const p = submitExtrinsic(tx, otherPaymentAccount)
    await expect(p).rejects.toMatchObject({
      section: 'web3Names',
      name: 'NotAuthorized',
    })
  }, 30_000)

  it('should be possible to remove a w3n by the payment account', async () => {
    const tx = await Web3Names.getReclaimDepositTx(nick)
    await submitExtrinsic(tx, paymentAccount)
  }, 30_000)

  it('should be possible to remove a w3n by the owner did', async () => {
    // prepare the w3n on chain
    const prepareTx = await api.tx.web3Names.claim(differentNick)
    const prepareAuthorizedTx = await Did.authorizeExtrinsic(
      w3nCreator,
      prepareTx,
      w3nCreatorKey.sign,
      paymentAccount.address
    )
    await submitExtrinsic(prepareAuthorizedTx, paymentAccount)

    const tx = await api.tx.web3Names.releaseByOwner()
    const authorizedTx = await Did.authorizeExtrinsic(
      w3nCreator,
      tx,
      w3nCreatorKey.sign,
      paymentAccount.address
    )
    await submitExtrinsic(authorizedTx, paymentAccount)
  }, 40_000)
})

describe('Runtime constraints', () => {
  it('should not be possible to create a web3 name that is too short', async () => {
    expect(api.consts.web3Names.minNameLength.toNumber()).toEqual(2)
  })

  it('should not be possible to create a web3 name that is too long', async () => {
    expect(api.consts.web3Names.maxNameLength.toNumber()).toEqual(32)
  })

  it('should not be possible to claim deposit for a web3 name that is too short', async () => {
    // Minimum is 3
    await Web3Names.getReclaimDepositTx('aaa')
    // One less than the minimum
    await expect(
      Web3Names.getReclaimDepositTx('aa')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"The provided name \\"aa\\" is shorter than the minimum number of characters allowed, which is 3"`
    )
  }, 30_000)

  it('should not be possible to claim deposit for a web3 name that is too long', async () => {
    // Maximum is 32
    await Web3Names.getReclaimDepositTx('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
    // One more than the maximum
    await expect(
      Web3Names.getReclaimDepositTx('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"The provided name \\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\\" is longer than the maximum number of characters allowed, which is 32"`
    )
  }, 30_000)
})

afterAll(async () => {
  await disconnect()
})
