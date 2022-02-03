/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/web3name
 */

import type { KeyringPair } from '@kiltprotocol/types'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import { FullDidDetails, DemoKeystore, Web3Names } from '@kiltprotocol/did'
import * as Kilt from '@kiltprotocol/sdk-js'
import { randomAsHex } from '@polkadot/util-crypto'
import { disconnect } from '../kilt'
import { devAlice, devFaucet, keypairFromRandom, initializeApi } from './utils'

import '../../../../testingTools/jestErrorCodeMatcher'

async function createDid(
  paymentAccount: Kilt.KeyringPair,
  keystore: Kilt.Did.DemoKeystore
): Promise<FullDidDetails> {
  const didSr25519AuthenticationKeyDetails = await keystore.generateKeypair({
    alg: Kilt.Did.SigningAlgorithms.Sr25519,
  })
  const didEncryptionKeyDetails = await keystore.generateKeypair({
    alg: Kilt.Did.EncryptionAlgorithms.NaclBox,
  })
  const lightDid = Kilt.Did.LightDidDetails.fromDetails({
    authenticationKey: {
      publicKey: didSr25519AuthenticationKeyDetails.publicKey,
      type: didSr25519AuthenticationKeyDetails.alg,
    },
    encryptionKey: {
      publicKey: didEncryptionKeyDetails.publicKey,
      type: didEncryptionKeyDetails.alg,
    },
  })
  const did = await lightDid.migrate(
    paymentAccount.address,
    keystore,
    async (tx) => {
      await Kilt.BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
        resolveOn: Kilt.BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    }
  )

  return did
}

beforeAll(async () => {
  await initializeApi()
})

describe('When there is an Web3NameCreator and a payer', () => {
  let w3nCreator: FullDidDetails
  let otherWeb3NameCreator: FullDidDetails
  let paymentAccount: KeyringPair
  let otherPaymentAccount: KeyringPair
  const keystore = new DemoKeystore()

  beforeAll(async () => {
    paymentAccount = devFaucet
    otherPaymentAccount = devAlice
    const w3nCreatorPromise = createDid(paymentAccount, keystore)

    const otherWeb3NameCreatorPromise = createDid(paymentAccount, keystore)

    ;[w3nCreator, otherWeb3NameCreator] = await Promise.all([
      w3nCreatorPromise,
      otherWeb3NameCreatorPromise,
    ])
  })

  it('should not be possible to create a w3n type w/o tokens', async () => {
    const tx = await Web3Names.getClaimTx('nick1')
    const bobbyBroke = keypairFromRandom()
    const authorizedTx = await w3nCreator.authorizeExtrinsic(
      tx,
      keystore,
      bobbyBroke.address
    )

    const p = BlockchainUtils.signAndSubmitTx(authorizedTx, bobbyBroke, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })

    await expect(p).rejects.toBeTruthy()
  }, 20_000)

  it('should be possible to create a w3n type with enough tokens', async () => {
    const tx = await Web3Names.getClaimTx('nick1')
    const authorizedTx = await w3nCreator.authorizeExtrinsic(
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

    const p = BlockchainUtils.signAndSubmitTx(authorizedTx, paymentAccount, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })

    await expect(p).rejects.toBeTruthy()
  }, 20_000)

  it('should not be possible to create a second w3n for the same did', async () => {
    const tx = await Web3Names.getClaimTx('nick2')
    const authorizedTx = await w3nCreator.authorizeExtrinsic(
      tx,
      keystore,
      paymentAccount.address
    )

    const p = BlockchainUtils.signAndSubmitTx(authorizedTx, paymentAccount, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })

    await expect(p).rejects.toBeTruthy()
  }, 20_000)

  it('should not be possible to remove a w3n by another payment account', async () => {
    const tx = await Web3Names.getReclaimDepositTx('nick1')
    const p = BlockchainUtils.signAndSubmitTx(tx, otherPaymentAccount, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })
    await expect(p).rejects.toBeTruthy()
  }, 20_000)

  it('should be possible to remove a w3n by the payment account', async () => {
    const tx = await Web3Names.getReclaimDepositTx('nick1')
    const p = BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })
    await expect(p).resolves.toBeTruthy()
  }, 20_000)

  it('should be possible to remove a w3n by the owner did', async () => {
    // prepare the w3n on chain
    const prepareTx = await Web3Names.getClaimTx('nick1')
    const prepareAuthorizedTx = await w3nCreator.authorizeExtrinsic(
      prepareTx,
      keystore,
      paymentAccount.address
    )
    await BlockchainUtils.signAndSubmitTx(prepareAuthorizedTx, paymentAccount, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })

    const tx = await Web3Names.getReleaseByOwnerTx()
    const authorizedTx = await w3nCreator.authorizeExtrinsic(
      tx,
      keystore,
      paymentAccount.address
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
