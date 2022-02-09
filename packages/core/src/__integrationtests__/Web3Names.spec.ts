/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/web3name
 */

import { randomAsHex } from '@polkadot/util-crypto'

import type { KeyringPair } from '@kiltprotocol/types'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import { FullDidDetails, DemoKeystore, Web3Names } from '@kiltprotocol/did'
import { disconnect } from '../kilt'
import {
  keypairFromRandom,
  initializeApi,
  createFullDidFromSeed,
  submitExtrinsicWithResign,
  createEndowedTestAccount,
} from './utils'

beforeAll(async () => {
  await initializeApi()
}, 30_000)

describe('When there is an Web3NameCreator and a payer', () => {
  let w3nCreator: FullDidDetails
  let otherWeb3NameCreator: FullDidDetails
  let paymentAccount: KeyringPair
  let otherPaymentAccount: KeyringPair
  const keystore = new DemoKeystore()

  beforeAll(async () => {
    ;[paymentAccount, otherPaymentAccount] = await Promise.all([
      createEndowedTestAccount(),
      createEndowedTestAccount(),
    ])
    ;[w3nCreator, otherWeb3NameCreator] = await Promise.all([
      createFullDidFromSeed(paymentAccount, keystore, randomAsHex(32)),
      createFullDidFromSeed(paymentAccount, keystore, randomAsHex(32)),
    ])

    if (paymentAccount === otherPaymentAccount) {
      throw new Error('The payment accounts are the same.')
    }
    if (w3nCreator === otherWeb3NameCreator) {
      throw new Error('The web3name creators are the same.')
    }
  }, 60_000)

  it('should not be possible to create a w3n name w/o tokens', async () => {
    const tx = await Web3Names.getClaimTx('nick1')
    const bobbyBroke = keypairFromRandom()
    const authorizedTx = await w3nCreator.authorizeExtrinsic(
      tx,
      keystore,
      bobbyBroke.address
    )

    const p = submitExtrinsicWithResign(
      authorizedTx,
      bobbyBroke,
      BlockchainUtils.IS_IN_BLOCK
    )

    await expect(p).rejects.toBeTruthy()
  }, 30_000)

  it('should be possible to create a w3n name with enough tokens', async () => {
    const tx = await Web3Names.getClaimTx('nick1')
    const authorizedTx = await w3nCreator.authorizeExtrinsic(
      tx,
      keystore,
      paymentAccount.address
    )

    const p = submitExtrinsicWithResign(
      authorizedTx,
      paymentAccount,
      BlockchainUtils.IS_IN_BLOCK
    )

    expect(p).resolves.not.toThrow()
  }, 30_000)

  it('should be possible to lookup the DID with the given nick', async () => {
    const didId = await Web3Names.queryDidIdentifierForWeb3Name('nick1')
    expect(didId).toBe(w3nCreator.identifier)
  }, 30_000)

  it('should be possible to lookup the nick with the given did', async () => {
    const nick = await Web3Names.queryWeb3NameForDidIdentifier(
      w3nCreator.identifier
    )
    expect(nick).toBe('nick1')
  }, 30_000)

  it('should not be possible to create the same w3n twice', async () => {
    const tx = await Web3Names.getClaimTx('nick1')
    const authorizedTx = await otherWeb3NameCreator.authorizeExtrinsic(
      tx,
      keystore,
      paymentAccount.address
    )

    const p = submitExtrinsicWithResign(
      authorizedTx,
      paymentAccount,
      BlockchainUtils.IS_IN_BLOCK
    )

    await expect(p).rejects.toBeTruthy()
  }, 30_000)

  it('should not be possible to create a second w3n for the same did', async () => {
    const tx = await Web3Names.getClaimTx('nick2')
    const authorizedTx = await w3nCreator.authorizeExtrinsic(
      tx,
      keystore,
      paymentAccount.address
    )

    const p = submitExtrinsicWithResign(
      authorizedTx,
      paymentAccount,
      BlockchainUtils.IS_IN_BLOCK
    )

    await expect(p).rejects.toBeTruthy()
  }, 30_000)

  it('should not be possible to remove a w3n by another payment account', async () => {
    const tx = await Web3Names.getReclaimDepositTx('nick1')
    const p = submitExtrinsicWithResign(
      tx,
      otherPaymentAccount,
      BlockchainUtils.IS_IN_BLOCK
    )
    await expect(p).rejects.toBeTruthy()
  }, 30_000)

  it('should be possible to remove a w3n by the payment account', async () => {
    const tx = await Web3Names.getReclaimDepositTx('nick1')
    const p = submitExtrinsicWithResign(
      tx,
      paymentAccount,
      BlockchainUtils.IS_IN_BLOCK
    )

    expect(p).resolves.not.toThrow()
  }, 30_000)

  it('should be possible to remove a w3n by the owner did', async () => {
    // prepare the w3n on chain
    const prepareTx = await Web3Names.getClaimTx('different_name')
    const prepareAuthorizedTx = await w3nCreator.authorizeExtrinsic(
      prepareTx,
      keystore,
      paymentAccount.address
    )
    await submitExtrinsicWithResign(
      prepareAuthorizedTx,
      paymentAccount,
      BlockchainUtils.IS_IN_BLOCK
    )

    const tx = await Web3Names.getReleaseByOwnerTx()
    const authorizedTx = await w3nCreator.authorizeExtrinsic(
      tx,
      keystore,
      paymentAccount.address
    )
    const p = submitExtrinsicWithResign(
      authorizedTx,
      paymentAccount,
      BlockchainUtils.IS_IN_BLOCK
    )

    expect(p).resolves.not.toThrow()
  }, 40_000)
})

afterAll(() => {
  disconnect()
})
