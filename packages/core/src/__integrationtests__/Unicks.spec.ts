/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/unicks
 */

import type { KeyringPair } from '@kiltprotocol/types'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import {
  FullDidDetails,
  DemoKeystore,
  createOnChainDidFromSeed,
} from '@kiltprotocol/did'
import { randomAsHex } from '@polkadot/util-crypto'
import { config, disconnect } from '../kilt'
import { devAlice, devFaucet, keypairFromRandom, WS_ADDRESS } from './utils'

import { Unicks } from '../../../did'

import '../../../../testingTools/jestErrorCodeMatcher'

beforeAll(async () => {
  config({ address: WS_ADDRESS })
})

describe('When there is an UnickCreator and a payer', () => {
  let unickCreator: FullDidDetails
  let otherUnickCreator: FullDidDetails
  let paymentAccount: KeyringPair
  let otherPaymentAccount: KeyringPair
  const keystore = new DemoKeystore()

  beforeAll(async () => {
    paymentAccount = devFaucet
    otherPaymentAccount = devAlice
    const unickCreatorPromise = createOnChainDidFromSeed(
      paymentAccount,
      keystore,
      randomAsHex(32)
    )

    const otherUnickCreatorPromise = createOnChainDidFromSeed(
      paymentAccount,
      keystore,
      randomAsHex(32)
    )

    ;[unickCreator, otherUnickCreator] = await Promise.all([
      unickCreatorPromise,
      otherUnickCreatorPromise,
    ])
  })

  it('should not be possible to create a unick type w/o tokens', async () => {
    const tx = await Unicks.getClaimTx('nick1')
    const bobbyBroke = keypairFromRandom()
    const authorizedTx = await unickCreator.authorizeExtrinsic(
      tx,
      keystore,
      bobbyBroke.address,
      false
    )

    const p = BlockchainUtils.signAndSubmitTx(authorizedTx, bobbyBroke, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })

    await expect(p).rejects.toBeTruthy()
  }, 20_000)

  it('should be possible to create a unick type with enough tokens', async () => {
    const tx = await Unicks.getClaimTx('nick1')
    const authorizedTx = await unickCreator.authorizeExtrinsic(
      tx,
      keystore,
      paymentAccount.address
    )

    const p = BlockchainUtils.signAndSubmitTx(authorizedTx, paymentAccount, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })

    await expect(p).resolves.toBeTruthy()
  }, 20_000)

  it('should be possible to lookup the DID with the given nick', async () => {
    const did = await Unicks.queryDidForUnick('nick1')
    expect(did).toBe(unickCreator.did)
  }, 20_000)

  it('should be possible to lookup the nick with the given did', async () => {
    const nick = await Unicks.queryUnickForDid(unickCreator.did)
    expect(nick).toBe('nick1')
  }, 20_000)

  it('should not be possible to create the same unick twice', async () => {
    const tx = await Unicks.getClaimTx('nick1')
    const authorizedTx = await otherUnickCreator.authorizeExtrinsic(
      tx,
      keystore,
      paymentAccount.address,
      false
    )

    const p = BlockchainUtils.signAndSubmitTx(authorizedTx, paymentAccount, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })

    await expect(p).rejects.toBeTruthy()
  }, 20_000)

  it('should not be possible to remove a unick by another did', async () => {
    const tx = await Unicks.getReleaseByOwnerTx('nick1')
    const authorizedTx = await otherUnickCreator.authorizeExtrinsic(
      tx,
      keystore,
      paymentAccount.address,
      false
    )

    const p = BlockchainUtils.signAndSubmitTx(authorizedTx, paymentAccount, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })

    await expect(p).rejects.toBeTruthy()
  }, 20_000)

  it('should not be possible to remove a unick by another payment account', async () => {
    const tx = await Unicks.getReleaseByPayerTx('nick1')
    const p = BlockchainUtils.signAndSubmitTx(tx, otherPaymentAccount, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })
    await expect(p).rejects.toBeTruthy()
  }, 20_000)

  it('should be possible to remove a unick by the payment account', async () => {
    const tx = await Unicks.getReleaseByPayerTx('nick1')
    const p = BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })
    await expect(p).resolves.toBeTruthy()
  }, 20_000)

  it('should be possible to remove a unick by the owner did', async () => {
    // prepare the unick on chain
    const prepareTx = await Unicks.getClaimTx('nick1')
    const prepareAuthorizedTx = await unickCreator.authorizeExtrinsic(
      prepareTx,
      keystore,
      paymentAccount.address
    )
    await BlockchainUtils.signAndSubmitTx(prepareAuthorizedTx, paymentAccount, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })

    const tx = await Unicks.getReleaseByOwnerTx('nick1')
    const authorizedTx = await unickCreator.authorizeExtrinsic(
      tx,
      keystore,
      paymentAccount.address,
      true
    )
    const p = BlockchainUtils.signAndSubmitTx(authorizedTx, paymentAccount, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })
    await expect(p).resolves.toBeTruthy()
  }, 40_000)
})

afterAll(() => {
  disconnect()
})
