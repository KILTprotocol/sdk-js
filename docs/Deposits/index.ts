/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-console */

import Kilt, {
  Did,
  KeystoreSigner,
  KeyRelationship,
  IRequestForAttestation,
  ISubmittableResult,
} from '@kiltprotocol/sdk-js'
import type { SubmittableExtrinsic } from '@kiltprotocol/sdk-js'

import { KeyringPair } from '@polkadot/keyring/types'

import {
  setup,
  ISetup,
  getBalance,
  ctypeCreator,
  createFullDid,
  getDidDeposit,
  createAttestation,
  getAttestationDeposit,
  createMinimalFullDidFromLightDid,
} from './utils'

let tx: SubmittableExtrinsic
let authorizedTx: SubmittableExtrinsic

async function checkDeleteFullDid(
  identity: KeyringPair,
  fullDid: Did.FullDidDetails,
  keystore: Did.DemoKeystore
): Promise<boolean> {
  const deleteDid = await Kilt.Did.DidChain.getDeleteDidExtrinsic()

  const balanceBeforeDeleting = await getBalance(identity.address)

  console.log(
    'free balance before deleting:',
    balanceBeforeDeleting.free.toString()
  )
  console.log(
    'reserved balance before deleting:',
    balanceBeforeDeleting.reserved.toString()
  )

  tx = await Kilt.Did.DidChain.generateDidAuthenticatedTx({
    didIdentifier: identity.address,
    txCounter: fullDid.getNextTxIndex(),
    call: deleteDid,
    signer: keystore as KeystoreSigner<string>,
    signingPublicKey: fullDid.getKeys(KeyRelationship.authentication)[0]
      .publicKeyHex,
    alg: fullDid.getKeys(KeyRelationship.authentication)[0].type,
    submitter: identity.address,
  })

  const didBeforeDepositRemoval = await getDidDeposit(identity.address)

  console.log('There should be deposit', didBeforeDepositRemoval.toString())

  await Kilt.BlockchainUtils.signAndSubmitTx(tx, identity, {
    resolveOn: Kilt.BlockchainUtils.IS_FINALIZED,
  })

  const didDeposit = await getDidDeposit(identity.address)

  console.log('There should be no deposit', didDeposit.toString())

  const balanceAfterDeleting = await getBalance(identity.address)

  console.log(
    'free balance After deleting:',
    balanceAfterDeleting.free.toString()
  )
  console.log(
    'reserved balance After deleting:',
    balanceAfterDeleting.reserved.toString()
  )

  if (balanceAfterDeleting.reserved.toNumber() === didDeposit.toNumber()) {
    return true
  }
  return false
}

async function checkReclaimFullDid(identity: KeyringPair): Promise<boolean> {
  tx = await Kilt.Did.DidChain.getReclaimDepositExtrinsic(identity.address)

  const balanceBeforeRevoking = await getBalance(identity.address)

  console.log('balance before Revoking', balanceBeforeRevoking.toString())

  const didDeposit = await getDidDeposit(identity.address)

  console.log('There should be deposit', didDeposit.toString())

  await Kilt.BlockchainUtils.signAndSubmitTx(tx, identity, {
    resolveOn: Kilt.BlockchainUtils.IS_FINALIZED,
  })

  const didAfterDepositRemoval = await getDidDeposit(identity.address)

  console.log('There should be no deposit', didAfterDepositRemoval.toString())
  const balanceAfterRevoking = await getBalance(identity.address)

  console.log('balance after Revoking', balanceAfterRevoking.toString())

  if (
    balanceAfterRevoking.reserved.toNumber() ===
    didAfterDepositRemoval.toNumber()
  ) {
    return true
  }
  return false
}

async function checkRemoveFullDidAttestation(
  identity: KeyringPair,
  fullDid: Did.FullDidDetails,
  keystore: Did.DemoKeystore,
  requestForAttestation: IRequestForAttestation
): Promise<boolean> {
  await createAttestation(identity, requestForAttestation, fullDid, keystore)
  const balanceBeforeRemoving = await getBalance(identity.address)
  const attestation = Kilt.Attestation.fromRequestAndDid(
    requestForAttestation,
    fullDid.did
  )
  console.log('balance before Removing', balanceBeforeRemoving.toString())

  tx = await attestation.remove(0)
  authorizedTx = await fullDid.authorizeExtrinsic(
    tx,
    keystore,
    identity.address
  )

  const attestationDepositBefore = await getAttestationDeposit(
    attestation.claimHash
  )

  console.log('There should be deposit', attestationDepositBefore.toString())

  await Kilt.BlockchainUtils.signAndSubmitTx(authorizedTx, identity, {
    resolveOn: Kilt.BlockchainUtils.IS_FINALIZED,
  })
  const attestationDepositAfter = await getAttestationDeposit(
    attestation.claimHash
  )

  console.log(
    'There should be less deposit',
    attestationDepositAfter.toString()
  )

  const balanceAfterRemoving = await getBalance(identity.address)

  console.log('balance after Removing', balanceAfterRemoving.toString())

  return true
}

async function checkReclaimFullDidAttestation(
  identity: KeyringPair,
  fullDid: Did.FullDidDetails,
  keystore: Did.DemoKeystore,
  requestForAttestation: IRequestForAttestation
): Promise<boolean> {
  await createAttestation(identity, requestForAttestation, fullDid, keystore)
  const balanceBeforeReclaiming = await getBalance(identity.address)
  const attestation = Kilt.Attestation.fromRequestAndDid(
    requestForAttestation,
    fullDid.did
  )
  console.log('balance before Reclaiming', balanceBeforeReclaiming.toString())

  tx = await attestation.reclaimDeposit()

  console.log('reclaim full attestation transaction fee:')

  const attestationDepositBefore = await getAttestationDeposit(
    attestation.claimHash
  )

  console.log('There should be deposit', attestationDepositBefore.toString())

  await Kilt.BlockchainUtils.signAndSubmitTx(tx, identity, {
    resolveOn: Kilt.BlockchainUtils.IS_FINALIZED,
  })
  const attestationDepositAfter = await getAttestationDeposit(
    attestation.claimHash
  )

  console.log('There should be deposit', attestationDepositAfter.toString())

  const balanceAfterDeleting = await getBalance(identity.address)

  console.log('balance after Deleting', balanceAfterDeleting.toString())

  return true
}

async function checkDeletedDidReclaimAttestation(
  identity: KeyringPair,
  fullDid: Did.FullDidDetails,
  keystore: Did.DemoKeystore,
  requestForAttestation: IRequestForAttestation
): Promise<ISubmittableResult> {
  await createAttestation(identity, requestForAttestation, fullDid, keystore)
  const balanceBeforeReclaiming = await getBalance(identity.address)
  const attestation = Kilt.Attestation.fromRequestAndDid(
    requestForAttestation,
    fullDid.did
  )

  const deleteDid = await Kilt.Did.DidChain.getDeleteDidExtrinsic()

  tx = await Kilt.Did.DidChain.generateDidAuthenticatedTx({
    didIdentifier: identity.address,
    txCounter: fullDid.getNextTxIndex(),
    call: deleteDid,
    signer: keystore as KeystoreSigner<string>,
    signingPublicKey: fullDid.getKeys(KeyRelationship.authentication)[0]
      .publicKeyHex,
    alg: fullDid.getKeys(KeyRelationship.authentication)[0].type,
    submitter: identity.address,
  })

  await Kilt.BlockchainUtils.signAndSubmitTx(tx, identity, {
    resolveOn: Kilt.BlockchainUtils.IS_FINALIZED,
  })

  console.log('balance before Reclaiming', balanceBeforeReclaiming.toString())

  tx = await attestation.reclaimDeposit()

  const attestationDepositBefore = await getAttestationDeposit(
    attestation.claimHash
  )

  console.log('There should be deposit', attestationDepositBefore.toString())

  return Kilt.BlockchainUtils.signAndSubmitTx(tx, identity, {
    resolveOn: Kilt.BlockchainUtils.IS_FINALIZED,
  })
}

async function main() {
  const {
    keystore,
    testIdentities,
    testMnemonics,
    claimer,
  }: ISetup = await setup()

  const testDidOne = await createFullDid(
    testIdentities[0],
    testMnemonics[0],
    keystore
  )
  if (!testDidOne) throw new Error('Creation of Test Full Did one failed')
  console.log('test case one begins')
  const testCaseOne = await checkDeleteFullDid(
    testIdentities[0],
    testDidOne,
    keystore
  )

  const ctype = await ctypeCreator(testDidOne, keystore, testIdentities[0])

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

  if (!testCaseOne) throw new Error('Test case one failed')
  console.log('test case one Ends')
  console.log('test case two begins')

  const testDidTwo = await createFullDid(
    testIdentities[1],
    testMnemonics[1],
    keystore
  )
  if (!testDidTwo) throw new Error('Creation of Test Full Did two failed')
  await checkReclaimFullDid(testIdentities[1])
  console.log('test case two ends')
  console.log('test case three begins')

  const testDidThree = await createFullDid(
    testIdentities[2],
    testMnemonics[2],
    keystore
  )
  if (!testDidThree) throw new Error('Creation of Test Full Did three failed')
  await checkRemoveFullDidAttestation(
    testIdentities[2],
    testDidThree,
    keystore,
    requestForAttestation
  )

  console.log('test case three ends')
  console.log('test case four begins')

  const testDidFour = await createFullDid(
    testIdentities[3],
    testMnemonics[3],
    keystore
  )
  if (!testDidFour) throw new Error('Creation of Test Full Did four failed')

  await checkReclaimFullDidAttestation(
    testIdentities[3],
    testDidFour,
    keystore,
    requestForAttestation
  )
  console.log('test case four ends')
  console.log('test case five begins')

  const testDidFive = await Kilt.Did.createLightDidFromSeed(
    keystore,
    testMnemonics[4]
  )

  if (!testDidFive) throw new Error('Creation of Test Light Did five failed')
  const testFullDidFive = await createMinimalFullDidFromLightDid(
    testIdentities[4],
    testDidFive,
    keystore
  )

  console.log('creation of the testFullDidFive')
  await checkDeleteFullDid(testIdentities[4], testFullDidFive, keystore)

  console.log('test case five ends')
  console.log('test case six begins')

  const testDidSix = await Kilt.Did.createLightDidFromSeed(
    keystore,
    testMnemonics[5]
  )
  if (!testDidSix) throw new Error('Creation of Test Light Did six failed')

  await createMinimalFullDidFromLightDid(
    testIdentities[5],
    testDidSix,
    keystore
  )

  await checkReclaimFullDid(testIdentities[5])

  console.log('test case six ends')
  console.log('test case seven begins')

  const testDidSeven = await Kilt.Did.createLightDidFromSeed(
    keystore,
    testMnemonics[6]
  )
  if (!testDidSeven) throw new Error('Creation of Test Light Did seven failed')
  const testFullDidSeven = await createMinimalFullDidFromLightDid(
    testIdentities[6],
    testDidSeven,
    keystore
  )

  await checkRemoveFullDidAttestation(
    testIdentities[6],
    testFullDidSeven,
    keystore,
    requestForAttestation
  )
  console.log('test case seven ends')
  console.log('test case eight begins')

  const testDidEight = await Kilt.Did.createLightDidFromSeed(
    keystore,
    testMnemonics[7]
  )
  if (!testDidEight) throw new Error('Creation of Test Light Did eight failed')

  const testFullDidEight = await createMinimalFullDidFromLightDid(
    testIdentities[7],
    testDidEight,
    keystore
  )

  await checkReclaimFullDidAttestation(
    testIdentities[7],
    testFullDidEight,
    keystore,
    requestForAttestation
  )

  console.log('test case eight ends')
  console.log('test case nice begins')

  const testDidNine = await Kilt.Did.createLightDidFromSeed(
    keystore,
    testMnemonics[8]
  )
  if (!testDidNine) throw new Error('Creation of Test Light Did Nine failed')

  const testFullDidNine = await createMinimalFullDidFromLightDid(
    testIdentities[8],
    testDidNine,
    keystore
  )

  await checkDeletedDidReclaimAttestation(
    testIdentities[8],
    testFullDidNine,
    keystore,
    requestForAttestation
  )

  console.log('test case Nine ends')
}

main().finally(() => Kilt.disconnect())
