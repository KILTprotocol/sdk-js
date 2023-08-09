/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'
import { BN } from '@polkadot/util'

import { Blockchain, BalanceUtils, disconnect } from '@kiltprotocol/sdk-js'
import type { KeyringPair } from '@kiltprotocol/types'

import { makeSigningKeyTool } from '../testUtils/index.js'
import { devCharlie, devFaucet, initializeApi, submitTx } from './utils.js'

let api: ApiPromise
beforeAll(async () => {
  api = await initializeApi()
}, 30_000)

describe('Chain returns specific errors, that we check for', () => {
  let faucet: KeyringPair
  let testIdentity: KeyringPair
  let charlie: KeyringPair
  beforeAll(async () => {
    faucet = devFaucet
    testIdentity = makeSigningKeyTool().keypair
    charlie = devCharlie

    const transferTx = api.tx.balances.transfer(
      testIdentity.address,
      BalanceUtils.toFemtoKilt(10000)
    )
    await submitTx(transferTx, faucet)
  }, 40000)

  it(`throws TxOutdated error if the nonce was already used for Tx in block`, async () => {
    const tx = api.tx.balances.transfer(
      charlie.address,
      new BN('1000000000000001')
    )
    const errorTx = api.tx.balances.transfer(
      charlie.address,
      new BN('1000000000000000')
    )

    const nonce = await api.rpc.system.accountNextIndex(testIdentity.address)

    const signer = api.createType('SignerPayload', {
      method: tx.method.toHex(),
      nonce,
      genesisHash: api.genesisHash,
      blockHash: api.genesisHash,
      runtimeVersion: api.runtimeVersion,
      version: api.extrinsicVersion,
    })
    const { signature } = api
      .createType('ExtrinsicPayload', signer.toPayload(), {
        version: api.extrinsicVersion,
      })
      .sign(testIdentity)
    tx.addSignature(testIdentity.address, signature, signer.toPayload())

    const errorSigner = api.createType('SignerPayload', {
      method: errorTx.method.toHex(),
      nonce,
      genesisHash: api.genesisHash,
      blockHash: api.genesisHash,
      runtimeVersion: api.runtimeVersion,
      version: api.extrinsicVersion,
    })
    await Blockchain.dispatchTx(tx)

    const { signature: errorSignature } = api
      .createType('ExtrinsicPayload', errorSigner.toPayload(), {
        version: api.extrinsicVersion,
      })
      .sign(testIdentity)
    errorTx.addSignature(
      testIdentity.address,
      errorSignature,
      errorSigner.toPayload()
    )

    await expect(Blockchain.dispatchTx(errorTx)).rejects.toThrow(
      Blockchain.TxOutdated
    )
  }, 40000)

  it(`throws 'ERROR_TRANSACTION_USURPED' error if separate Tx was imported with identical nonce but higher priority while Tx is in pool`, async () => {
    const tx = api.tx.balances.transfer(
      charlie.address,
      new BN('1000000000000000')
    )
    const errorTx = api.tx.balances.transfer(
      charlie.address,
      new BN('1000000000000000')
    )

    const nonce = await api.rpc.system.accountNextIndex(testIdentity.address)

    const signer = api.createType('SignerPayload', {
      method: tx.method.toHex(),
      nonce,
      genesisHash: api.genesisHash,
      blockHash: api.genesisHash,
      runtimeVersion: api.runtimeVersion,
      version: api.extrinsicVersion,
    })
    const { signature } = api
      .createType('ExtrinsicPayload', signer.toPayload(), {
        version: api.extrinsicVersion,
      })
      .sign(testIdentity)
    tx.addSignature(testIdentity.address, signature, signer.toPayload())

    const errorSigner = api.createType('SignerPayload', {
      method: errorTx.method.toHex(),
      nonce,
      genesisHash: api.genesisHash,
      blockHash: api.genesisHash,
      runtimeVersion: api.runtimeVersion,
      version: api.extrinsicVersion,
      tip: '0x00000000000000000000000000005678',
    })

    const { signature: errorSignature } = api
      .createType('ExtrinsicPayload', errorSigner.toPayload(), {
        version: api.extrinsicVersion,
      })
      .sign(testIdentity)
    errorTx.addSignature(
      testIdentity.address,
      errorSignature,
      errorSigner.toPayload()
    )

    const promiseToFail = Blockchain.dispatchTx(tx)
    const promiseToUsurp = new Promise((resolve) => {
      setTimeout(() => {
        resolve(Blockchain.dispatchTx(errorTx))
      }, 50)
    })
    await Promise.all([
      expect(promiseToFail).rejects.toHaveProperty('status.isUsurped', true),
      promiseToUsurp,
    ])
  }, 40000)
})

afterAll(async () => {
  if (typeof api !== 'undefined') await disconnect()
})
