/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import Kilt, { Did } from '@kiltprotocol/sdk-js'
import type { SubmittableExtrinsic } from '@kiltprotocol/sdk-js'

import { KeyringPair } from '@polkadot/keyring/types'
import { BN } from '@polkadot/util'

import {
  setup,
  ISetup,
  getBalance,
  ctypeCreator,
  buildDidAndTxFromSeed,
  queryDidTx,
  queryAttestationTx,
} from './utils'

let tx: SubmittableExtrinsic
let authorizedTx: SubmittableExtrinsic

interface ICheck {
  deposit: BN
  balanceBefore: BN
  balanceAfter: BN
  txFee: BN
}

async function checkRevokeFullDid(
  identity: KeyringPair,
  mnemonic: string,
  keystore: Did.DemoKeystore
): Promise<ICheck> {
  const {
    api,
  } = await Kilt.ChainHelpers.BlockchainApiConnection.getConnectionOrConnect()
  const testAccountBalanceBeforeDidCreation = await getBalance(identity.address)

  console.log(
    'balance before creating a DID on chain',
    testAccountBalanceBeforeDidCreation.toString()
  )

  /* Generating the attesterFullDid and faucetFullDid from the demo keystore with the generated seed both with sr25519 */
  const { extrinsic, did } = await buildDidAndTxFromSeed(
    identity,
    keystore,
    mnemonic
  )

  await Kilt.BlockchainUtils.signAndSubmitTx(extrinsic, identity, {
    reSign: true,
    resolveOn: Kilt.BlockchainUtils.IS_IN_BLOCK,
  })

  const queried = await Did.DefaultResolver.resolveDoc(did)
  if (!queried) throw Error(`failed to write Did${did}`)
  const { partialFee } = await api.rpc.payment.queryInfo(extrinsic.toHex())

  console.log(partialFee.toBn().toString())

  const result = await queryDidTx(extrinsic.toHex())

  Kilt.Utils.DecoderUtils.assertCodecIsType(result, [
    'Option<IDidChainRecordCodec>',
  ])

  console.log('The deposit amount: ', result.deposit.amount.toNumber())

  console.log(did)

  const testAccountBalanceAfterDidCreation = await getBalance(identity.address)

  console.log(
    'balance after creating a DID on chain',
    testAccountBalanceAfterDidCreation.toString()
  )

  return {
    deposit: result.deposit.amount,
    balanceBefore: testAccountBalanceBeforeDidCreation,
    balanceAfter: testAccountBalanceAfterDidCreation,
    txFee: partialFee.toBn(),
  }
}

async function checkReclaimFullDid(
  identity: KeyringPair,
  mnemonic: string,
  keystore: Did.DemoKeystore
): Promise<boolean> {
  return true
}

async function checkRevokeLightMigratedDid(
  identity: KeyringPair,
  mnemonic: string,
  keystore: Did.DemoKeystore
): Promise<boolean> {
  return true
}

async function checkReclaimLightMigratedDid(
  identity: KeyringPair,
  mnemonic: string,
  keystore: Did.DemoKeystore
): Promise<boolean> {
  return true
}

async function checkRevokeFullDidAttestation(
  identity: KeyringPair,
  mnemonic: string,
  keystore: Did.DemoKeystore
): Promise<boolean> {
  return true
}

async function checkReclaimFullDidAttestation(
  identity: KeyringPair,
  mnemonic: string,
  keystore: Did.DemoKeystore
): Promise<boolean> {
  return true
}

async function checkRevokeLightMigratedDidAttestation(
  identity: KeyringPair,
  mnemonic: string,
  keystore: Did.DemoKeystore
): Promise<boolean> {
  return true
}

async function checkReclaimLightMigratedDidAttestation(
  identity: KeyringPair,
  mnemonic: string,
  keystore: Did.DemoKeystore
): Promise<boolean> {
  return true
}

async function main() {
  const {
    keystore,
    testIdentites,
    testMnemonics,
    actors: { claimer, attester },
  }: ISetup = await setup()

  const ctype = await ctypeCreator(attester.full, keystore, attester.identity)

  const {
    api,
  } = await Kilt.ChainHelpers.BlockchainApiConnection.getConnectionOrConnect()

  await checkRevokeFullDid(testIdentites[0], testMnemonics[0], keystore)

  const rawClaim = {
    name: 'claimer',
    age: 69,
  }

  const claim = Kilt.Claim.fromCTypeAndClaimContents(
    ctype,
    rawClaim,
    claimer.light.did
  )

  const requestForAttestation = Kilt.RequestForAttestation.fromClaim(claim)
  await requestForAttestation.signWithDid(keystore, claimer.light)

  const attestation = Kilt.Attestation.fromRequestAndDid(
    requestForAttestation,
    attester.full.did
  )

  const attestationVerified = await attestation.checkValidity()
  console.log('The attestation is already on the chain', attestationVerified)

  console.log(
    'The attesters balance before making the attestation',
    attester.balance.toString()
  )

  if (!attestationVerified) {
    tx = await attestation.store()
    authorizedTx = await attester.full.authorizeExtrinsic(
      tx,
      keystore,
      attester.identity.address
    )

    await Kilt.BlockchainUtils.signAndSubmitTx(
      authorizedTx,
      attester.identity,
      {
        resolveOn: Kilt.BlockchainUtils.IS_FINALIZED,
      }
    )
    const { partialFee } = await api.rpc.payment.queryInfo(tx.toHex())

    console.log(partialFee.toBn().toString())
  }

  const newBalance = await getBalance(attester.identity.address)
  queryAttestationTx(attestation.claimHash)
  console.log(
    'The new balance of the attester after the attestation',
    newBalance.toString()
  )

  console.log('The complete attestation', attestation)

  const attestedClaim = Kilt.AttestedClaim.fromRequestAndAttestation(
    requestForAttestation,
    attestation
  )

  console.log('The complete attested claim', attestedClaim)

  const attestedClaimVerified = await attestedClaim.verify()

  console.log('The verified attested claim', attestedClaimVerified)
}

main().finally(() => Kilt.disconnect())
