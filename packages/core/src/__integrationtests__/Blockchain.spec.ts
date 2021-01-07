/**
 * @packageDocumentation
 * @group integration/blockchain
 * @ignore
 */

import { SignerPayload } from '@polkadot/types/interfaces/extrinsics/types'
import BN from 'bn.js/'
import { SubmittableExtrinsic } from '../../../../build'
import { BalanceUtils } from '../balance'
import {
  getBalance,
  listenToBalanceChanges,
  makeTransfer,
} from '../balance/Balance.chain'
import { IBlockchainApi } from '../blockchain/Blockchain'
import {
  IS_IN_BLOCK,
  IS_READY,
  submitSignedTxRaw,
  submitTxWithReSign,
} from '../blockchain/Blockchain.utils'
import getCached, { DEFAULT_WS_ADDRESS } from '../blockchainApiConnection'
import Identity from '../identity/Identity'
import { MIN_TRANSACTION, wannabeFaucet } from './utils'

let blockchain: IBlockchainApi
beforeAll(async () => {
  blockchain = await getCached(DEFAULT_WS_ADDRESS)
})

describe('submitSignedTx checks for specific recoverable errors that are thrown in submitSignedTxRaw', () => {
  let faucet: Identity
  let testIdentity: Identity

  beforeAll(async () => {
    faucet = await wannabeFaucet
    testIdentity = await Identity.buildFromMnemonic(Identity.generateMnemonic())
    makeTransfer(faucet, testIdentity.address, new BN(10000), 0).then(
      (val: SubmittableExtrinsic) => {
        submitTxWithReSign(val, faucet, { resolveOn: IS_IN_BLOCK })
      }
    )
  })

  it(`throws '1010: Invalid Transaction: Transaction is outdated' error if the nonce was already used for Tx in block`, async () => {
    const nonce = await blockchain.getNonce(testIdentity.address)

    const tx = blockchain.api.tx.balances.transfer(
      faucet.address,
      BalanceUtils.convertToTxUnit(new BN(10), 0)
    )
    const errorTx = blockchain.api.tx.balances.transfer(
      faucet.address,
      BalanceUtils.convertToTxUnit(new BN(10), 0)
    )
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
      .sign(testIdentity.signKeyringPair)
    tx.addSignature(testIdentity.address, signature, signer.toPayload())

    await blockchain.submitTxWithReSign(tx, testIdentity, {
      resolveOn: IS_IN_BLOCK,
    })
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
    const { signature: errorSignature } = blockchain.api
      .createType('ExtrinsicPayload', errorSigner.toPayload(), {
        version: blockchain.api.extrinsicVersion,
      })
      .sign(testIdentity.signKeyringPair)
    errorTx.addSignature(
      testIdentity.address,
      errorSignature,
      errorSigner.toPayload()
    )
    expect(() => submitSignedTxRaw(errorTx, { resolveOn: IS_IN_BLOCK })).rejects.toThrow()
  })
})
