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
  devAlice,
  devFaucet,
  keypairFromRandom,
  initializeApi,
  createFullDidFromSeed,
  submitExtrinsicWithResign,
} from './utils'

beforeAll(async () => {
  await initializeApi()
}, 20_000)

describe('When there is an Web3NameCreator and a payer', () => {
  let w3nCreator: FullDidDetails
  let otherWeb3NameCreator: FullDidDetails
  let paymentAccount: KeyringPair
  let otherPaymentAccount: KeyringPair
  const keystore = new DemoKeystore()

  beforeAll(async () => {
    paymentAccount = devFaucet
    otherPaymentAccount = devAlice
    const w3nCreatorPromise = createFullDidFromSeed(
      paymentAccount,
      keystore,
      randomAsHex(32)
    )

    const otherWeb3NameCreatorPromise = createFullDidFromSeed(
      paymentAccount,
      keystore,
      randomAsHex(32)
    )

    ;[w3nCreator, otherWeb3NameCreator] = await Promise.all([
      w3nCreatorPromise,
      otherWeb3NameCreatorPromise,
    ])
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
  }, 20_000)

  it('should be possible to create a w3n name with enough tokens', async () => {
    const tx = await Web3Names.getClaimTx('nick1')
    const authorizedTx = await w3nCreator.authorizeExtrinsic(
      tx,
      keystore,
      paymentAccount.address
    )

    await submitExtrinsicWithResign(
      authorizedTx,
      paymentAccount,
      BlockchainUtils.IS_IN_BLOCK
    )
  }, 20_000)

  it('should be possible to lookup the DID with the given nick', async () => {
    const did = await Web3Names.queryDidForWeb3Name('nick1')
    expect(did).toBe(w3nCreator.did)
  }, 20_000)

  it('should be possible to lookup the nick with the given did', async () => {
    const nick = await Web3Names.queryWeb3NameForDid(w3nCreator.did)
    expect(nick).toBe('nick1')
  }, 20_000)

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
  }, 20_000)

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
  }, 20_000)

  it('should not be possible to remove a w3n by another payment account', async () => {
    const tx = await Web3Names.getReclaimDepositTx('nick1')
    const p = submitExtrinsicWithResign(
      tx,
      otherPaymentAccount,
      BlockchainUtils.IS_IN_BLOCK
    )
    await expect(p).rejects.toBeTruthy()
  }, 20_000)

  it('should be possible to remove a w3n by the payment account', async () => {
    const tx = await Web3Names.getReclaimDepositTx('nick1')
    await submitExtrinsicWithResign(
      tx,
      paymentAccount,
      BlockchainUtils.IS_IN_BLOCK
    )
  }, 20_000)

  it('should be possible to remove a w3n by the owner did', async () => {
    // prepare the w3n on chain
    const prepareTx = await Web3Names.getClaimTx('nick1')
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
    submitExtrinsicWithResign(
      authorizedTx,
      paymentAccount,
      BlockchainUtils.IS_IN_BLOCK
    )
  }, 40_000)
})

afterAll(() => {
  disconnect()
})
