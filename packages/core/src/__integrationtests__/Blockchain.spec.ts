/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/blockchain
 */

import type { SignerPayload } from '@polkadot/types/interfaces/extrinsics/types'
import { BN } from '@polkadot/util'
import type { IBlockchainApi, KeyringPair } from '@kiltprotocol/types'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import { getTransferTx } from '../balance/Balance.chain'
import {
  devFaucet,
  devCharlie,
  keypairFromRandom,
  submitExtrinsicWithResign,
  initializeApi,
} from './utils'
import { connect, disconnect } from '../kilt'

let blockchain: IBlockchainApi
beforeAll(async () => {
  await initializeApi().then(async () => {
    blockchain = await connect()
  })
})

describe('Chain returns specific errors, that we check for', () => {
  let faucet: KeyringPair
  let testIdentity: KeyringPair
  let charlie: KeyringPair
  beforeAll(async () => {
    faucet = devFaucet
    testIdentity = keypairFromRandom()
    charlie = devCharlie
    await getTransferTx(testIdentity.address, new BN(10000), 0).then((tx) =>
      submitExtrinsicWithResign(tx, faucet)
    )
  }, 40000)

  it(`throws TxOutdated error if the nonce was already used for Tx in block`, async () => {
    const tx = blockchain.api.tx.balances.transfer(
      charlie.address,
      new BN('1000000000000001')
    )
    const errorTx = blockchain.api.tx.balances.transfer(
      charlie.address,
      new BN('1000000000000000')
    )

    const nonce = await blockchain.getNonce(testIdentity.address)

    const signer: SignerPayload = blockchain.api.createType('SignerPayload', {
      method: tx.method.toHex(),
      nonce,
      genesisHash: blockchain.api.genesisHash,
      blockHash: blockchain.api.genesisHash,
      runtimeVersion: blockchain.api.runtimeVersion,
      version: blockchain.api.extrinsicVersion,
    })
    const { signature } = blockchain.api
      .createType('ExtrinsicPayload', signer.toPayload(), {
        version: blockchain.api.extrinsicVersion,
      })
      .sign(testIdentity)
    tx.addSignature(testIdentity.address, signature, signer.toPayload())

    const errorSigner: SignerPayload = blockchain.api.createType(
      'SignerPayload',
      {
        method: errorTx.method.toHex(),
        nonce,
        genesisHash: blockchain.api.genesisHash,
        blockHash: blockchain.api.genesisHash,
        runtimeVersion: blockchain.api.runtimeVersion,
        version: blockchain.api.extrinsicVersion,
      }
    )
    await BlockchainUtils.dispatchTx(
      tx,
      BlockchainUtils.parseSubscriptionOptions({
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
      })
    )

    const { signature: errorSignature } = blockchain.api
      .createType('ExtrinsicPayload', errorSigner.toPayload(), {
        version: blockchain.api.extrinsicVersion,
      })
      .sign(testIdentity)
    errorTx.addSignature(
      testIdentity.address,
      errorSignature,
      errorSigner.toPayload()
    )

    await expect(
      BlockchainUtils.dispatchTx(
        errorTx,
        BlockchainUtils.parseSubscriptionOptions({
          resolveOn: BlockchainUtils.IS_IN_BLOCK,
        })
      )
    ).rejects.toThrow(BlockchainUtils.TxOutdated)
  }, 40000)

  it(`throws 'ERROR_TRANSACTION_USURPED' error if separate Tx was imported with identical nonce but higher priority while Tx is in pool`, async () => {
    const tx = blockchain.api.tx.balances.transfer(
      charlie.address,
      new BN('1000000000000000')
    )
    const errorTx = blockchain.api.tx.balances.transfer(
      charlie.address,
      new BN('1000000000000000')
    )

    const nonce = await blockchain.getNonce(testIdentity.address)

    const signer: SignerPayload = blockchain.api.createType('SignerPayload', {
      method: tx.method.toHex(),
      nonce,
      genesisHash: blockchain.api.genesisHash,
      blockHash: blockchain.api.genesisHash,
      runtimeVersion: blockchain.api.runtimeVersion,
      version: blockchain.api.extrinsicVersion,
    })
    const { signature } = blockchain.api
      .createType('ExtrinsicPayload', signer.toPayload(), {
        version: blockchain.api.extrinsicVersion,
      })
      .sign(testIdentity)
    tx.addSignature(testIdentity.address, signature, signer.toPayload())

    const errorSigner: SignerPayload = blockchain.api.createType(
      'SignerPayload',
      {
        method: errorTx.method.toHex(),
        nonce,
        genesisHash: blockchain.api.genesisHash,
        blockHash: blockchain.api.genesisHash,
        runtimeVersion: blockchain.api.runtimeVersion,
        version: blockchain.api.extrinsicVersion,
        tip: '0x00000000000000000000000000005678',
      }
    )
    expect(
      BlockchainUtils.dispatchTx(
        tx,
        BlockchainUtils.parseSubscriptionOptions({
          resolveOn: BlockchainUtils.IS_IN_BLOCK,
        })
      )
    ).rejects.toHaveProperty('status.isUsurped', true)

    const { signature: errorSignature } = blockchain.api
      .createType('ExtrinsicPayload', errorSigner.toPayload(), {
        version: blockchain.api.extrinsicVersion,
      })
      .sign(testIdentity)
    errorTx.addSignature(
      testIdentity.address,
      errorSignature,
      errorSigner.toPayload()
    )

    await BlockchainUtils.dispatchTx(
      errorTx,
      BlockchainUtils.parseSubscriptionOptions({
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
      })
    )
  }, 40000)
})

afterAll(() => {
  if (typeof blockchain !== 'undefined') disconnect()
})
