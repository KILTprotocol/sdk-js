/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'
import { BN } from '@polkadot/util'

import { Attestation, CType } from '@kiltprotocol/core'
import { disconnect } from '@kiltprotocol/chain-helpers'
import { Claim, Credential } from '@kiltprotocol/legacy-credentials'
import * as Did from '@kiltprotocol/did'
import type {
  DidDocument,
  IAttestation,
  ICredential,
  KeyringPair,
  KiltKeyringPair,
  SignerInterface,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import {
  createFullDidFromLightDid,
  createFullDidFromSeed,
  createMinimalLightDidFromKeypair,
  KeyTool,
  makeSigningKeyTool,
} from '../testUtils/index.js'
import {
  devFaucet,
  driversLicenseCTypeForDeposit as driversLicenseCType,
  endowAccounts,
  initializeApi,
  isCtypeOnChain,
  submitTx,
} from './utils.js'

let api: ApiPromise
let tx: SubmittableExtrinsic
let authorizedTx: SubmittableExtrinsic
let attestation: IAttestation
let storedEndpointsCount: BN

async function checkDeleteFullDid(
  identity: KiltKeyringPair,
  fullDid: DidDocument,
  sign: SignerInterface[]
): Promise<boolean> {
  storedEndpointsCount = await api.query.did.didEndpointsCount(
    Did.toChain(fullDid.id)
  )
  const deleteDid = api.tx.did.delete(storedEndpointsCount)

  tx = await Did.authorizeTx(fullDid.id, deleteDid, sign, identity.address)

  const balanceBeforeDeleting = (
    await api.query.system.account(identity.address)
  ).data

  const didResult = Did.documentFromChain(
    await api.query.did.did(Did.toChain(fullDid.id))
  )
  const didDeposit = didResult.deposit

  await submitTx(tx, identity)

  const balanceAfterDeleting = (
    await api.query.system.account(identity.address)
  ).data

  return balanceBeforeDeleting.reserved
    .sub(didDeposit.amount)
    .eq(balanceAfterDeleting.reserved)
}

async function checkReclaimFullDid(
  identity: KeyringPair,
  fullDid: DidDocument
): Promise<boolean> {
  storedEndpointsCount = await api.query.did.didEndpointsCount(
    Did.toChain(fullDid.id)
  )
  tx = api.tx.did.reclaimDeposit(Did.toChain(fullDid.id), storedEndpointsCount)

  const balanceBeforeRevoking = (
    await api.query.system.account(identity.address)
  ).data

  const didResult = Did.documentFromChain(
    await api.query.did.did(Did.toChain(fullDid.id))
  )
  const didDeposit = didResult.deposit

  await submitTx(tx, identity)

  const balanceAfterRevoking = (
    await api.query.system.account(identity.address)
  ).data

  return balanceBeforeRevoking.reserved
    .sub(didDeposit.amount)
    .eq(balanceAfterRevoking.reserved)
}

async function checkRemoveFullDidAttestation(
  identity: KiltKeyringPair,
  fullDid: DidDocument,
  sign: SignerInterface[],
  credential: ICredential
): Promise<boolean> {
  attestation = Attestation.fromCredentialAndDid(credential, fullDid.id)

  tx = api.tx.attestation.add(
    attestation.claimHash,
    attestation.cTypeHash,
    null
  )
  authorizedTx = await Did.authorizeTx(fullDid.id, tx, sign, identity.address)

  await submitTx(authorizedTx, identity)

  const attestationResult = await api.query.attestation.attestations(
    attestation.claimHash
  )
  const attestationDeposit = attestationResult.isSome
    ? attestationResult.unwrap().deposit.amount.toBn()
    : new BN(0)

  const balanceBeforeRemoving = (
    await api.query.system.account(identity.address)
  ).data
  attestation = Attestation.fromCredentialAndDid(credential, fullDid.id)

  tx = api.tx.attestation.remove(attestation.claimHash, null)
  authorizedTx = await Did.authorizeTx(fullDid.id, tx, sign, identity.address)

  await submitTx(authorizedTx, identity)

  const balanceAfterRemoving = (
    await api.query.system.account(identity.address)
  ).data

  return balanceBeforeRemoving.reserved
    .sub(attestationDeposit)
    .eq(balanceAfterRemoving.reserved)
}

async function checkReclaimFullDidAttestation(
  identity: KiltKeyringPair,
  fullDid: DidDocument,
  sign: SignerInterface[],
  credential: ICredential
): Promise<boolean> {
  attestation = Attestation.fromCredentialAndDid(credential, fullDid.id)

  tx = api.tx.attestation.add(
    attestation.claimHash,
    attestation.cTypeHash,
    null
  )
  authorizedTx = await Did.authorizeTx(fullDid.id, tx, sign, identity.address)

  await submitTx(authorizedTx, identity)

  const balanceBeforeReclaiming = (
    await api.query.system.account(identity.address)
  ).data
  attestation = Attestation.fromCredentialAndDid(credential, fullDid.id)

  tx = api.tx.attestation.reclaimDeposit(attestation.claimHash)

  const attestationResult = await api.query.attestation.attestations(
    attestation.claimHash
  )
  const attestationDeposit = attestationResult.isSome
    ? attestationResult.unwrap().deposit.amount.toBn()
    : new BN(0)

  await submitTx(tx, identity)

  const balanceAfterDeleting = (
    await api.query.system.account(identity.address)
  ).data

  return balanceBeforeReclaiming.reserved
    .sub(attestationDeposit)
    .eq(balanceAfterDeleting.reserved)
}

async function checkDeletedDidReclaimAttestation(
  identity: KiltKeyringPair,
  fullDid: DidDocument,
  sign: SignerInterface[],
  credential: ICredential
): Promise<void> {
  attestation = Attestation.fromCredentialAndDid(credential, fullDid.id)

  tx = api.tx.attestation.add(
    attestation.claimHash,
    attestation.cTypeHash,
    null
  )
  authorizedTx = await Did.authorizeTx(fullDid.id, tx, sign, identity.address)

  await submitTx(authorizedTx, identity)

  storedEndpointsCount = await api.query.did.didEndpointsCount(
    Did.toChain(fullDid.id)
  )

  attestation = Attestation.fromCredentialAndDid(credential, fullDid.id)

  const deleteDid = api.tx.did.delete(storedEndpointsCount)
  tx = await Did.authorizeTx(fullDid.id, deleteDid, sign, identity.address)

  await submitTx(tx, identity)

  tx = api.tx.attestation.reclaimDeposit(attestation.claimHash)

  await submitTx(tx, identity)
}

async function checkWeb3Deposit(
  identity: KiltKeyringPair,
  fullDid: DidDocument,
  sign: SignerInterface[]
): Promise<boolean> {
  const web3Name = 'test-web3name'
  const balanceBeforeClaiming = (
    await api.query.system.account(identity.address)
  ).data

  const depositAmount = api.consts.web3Names.deposit.toBn()
  const claimTx = api.tx.web3Names.claim(web3Name)
  let didAuthorizedTx = await Did.authorizeTx(
    fullDid.id,
    claimTx,
    sign,
    identity.address
  )
  await submitTx(didAuthorizedTx, identity)
  const balanceAfterClaiming = (
    await api.query.system.account(identity.address)
  ).data
  if (
    !balanceAfterClaiming.reserved
      .sub(balanceBeforeClaiming.reserved)
      .eq(depositAmount)
  ) {
    return false
  }

  const releaseTx = api.tx.web3Names.releaseByOwner()
  didAuthorizedTx = await Did.authorizeTx(
    fullDid.id,
    releaseTx,
    sign,
    identity.address
  )
  await submitTx(didAuthorizedTx, identity)
  const balanceAfterReleasing = (
    await api.query.system.account(identity.address)
  ).data

  if (!balanceAfterReleasing.reserved.eq(balanceBeforeClaiming.reserved)) {
    return false
  }

  return true
}

let keys: KeyTool[]
let credential: ICredential

beforeAll(async () => {
  api = await initializeApi()
}, 30_000)

beforeAll(async () => {
  keys = await Promise.all(
    new Array(10).fill(0).map(() => makeSigningKeyTool())
  )

  const testAddresses = keys.map((val) => val.keypair.address)

  await endowAccounts(devFaucet, testAddresses)

  const claimer = await makeSigningKeyTool()
  const claimerLightDid = await createMinimalLightDidFromKeypair(
    claimer.keypair
  )

  const attesterKey = await makeSigningKeyTool()
  const attester = await createFullDidFromSeed(devFaucet, attesterKey.keypair)

  const ctypeExists = await isCtypeOnChain(driversLicenseCType)
  if (!ctypeExists) {
    const extrinsic = await Did.authorizeTx(
      attester.id,
      api.tx.ctype.add(CType.toChain(driversLicenseCType)),
      await attesterKey.getSigners(attester),
      devFaucet.address
    )
    await submitTx(extrinsic, devFaucet)
  }

  const rawClaim = {
    name: 'claimer',
    age: 69,
  }

  const claim = Claim.fromCTypeAndClaimContents(
    driversLicenseCType,
    rawClaim,
    claimerLightDid.id
  )

  credential = Credential.fromClaim(claim)
  await Credential.createPresentation({
    credential,
    signers: await claimer.getSigners(claimerLightDid),
  })
}, 120_000)

describe('Different deposits scenarios', () => {
  let testFullDidOne: DidDocument
  let testFullDidTwo: DidDocument
  let testFullDidThree: DidDocument
  let testFullDidFour: DidDocument
  let testFullDidFive: DidDocument
  let testFullDidSix: DidDocument
  let testFullDidSeven: DidDocument
  let testFullDidEight: DidDocument
  let testFullDidNine: DidDocument
  let testFullDidTen: DidDocument

  beforeAll(async () => {
    const testDidFive = await createMinimalLightDidFromKeypair(keys[4].keypair)
    const testDidSix = await createMinimalLightDidFromKeypair(keys[5].keypair)
    const testDidSeven = await createMinimalLightDidFromKeypair(keys[6].keypair)
    const testDidEight = await createMinimalLightDidFromKeypair(keys[7].keypair)
    const testDidNine = await createMinimalLightDidFromKeypair(keys[8].keypair)

    testFullDidOne = await createFullDidFromSeed(
      keys[0].keypair,
      keys[0].keypair
    )
    testFullDidTwo = await createFullDidFromSeed(
      keys[1].keypair,
      keys[1].keypair
    )
    testFullDidThree = await createFullDidFromSeed(
      keys[2].keypair,
      keys[2].keypair
    )
    testFullDidFour = await createFullDidFromSeed(
      keys[3].keypair,
      keys[3].keypair
    )
    testFullDidFive = await createFullDidFromLightDid(
      keys[4].keypair,
      testDidFive,
      [keys[4].storeDidSigner]
    )
    testFullDidSix = await createFullDidFromLightDid(
      keys[5].keypair,
      testDidSix,
      [keys[5].storeDidSigner]
    )
    testFullDidSeven = await createFullDidFromLightDid(
      keys[6].keypair,
      testDidSeven,
      [keys[6].storeDidSigner]
    )
    testFullDidEight = await createFullDidFromLightDid(
      keys[7].keypair,
      testDidEight,
      [keys[7].storeDidSigner]
    )
    testFullDidNine = await createFullDidFromLightDid(
      keys[8].keypair,
      testDidNine,
      [keys[8].storeDidSigner]
    )
    testFullDidTen = await createFullDidFromSeed(
      keys[9].keypair,
      keys[9].keypair
    )
  }, 240_000)

  it('Check if deleting full DID returns deposit', async () => {
    expect(
      await checkDeleteFullDid(
        keys[0].keypair,
        testFullDidOne,
        await keys[0].getSigners(testFullDidOne)
      )
    ).toBe(true)
  }, 45_000)
  it('Check if reclaiming full DID returns deposit', async () => {
    expect(await checkReclaimFullDid(keys[1].keypair, testFullDidTwo)).toBe(
      true
    )
  }, 45_000)
  it('Check if removing an attestation from a full DID returns deposit', async () => {
    expect(
      await checkRemoveFullDidAttestation(
        keys[2].keypair,
        testFullDidThree,
        await keys[2].getSigners(testFullDidThree),
        credential
      )
    ).toBe(true)
  }, 90_000)
  it('Check if reclaiming an attestation from a full DID returns the deposit', async () => {
    expect(
      await checkReclaimFullDidAttestation(
        keys[3].keypair,
        testFullDidFour,
        await keys[3].getSigners(testFullDidFour),
        credential
      )
    ).toBe(true)
  }, 90_000)
  it('Check if deleting from a migrated light DID to a full DID returns deposit', async () => {
    expect(
      await checkDeleteFullDid(
        keys[4].keypair,
        testFullDidFive,
        await keys[4].getSigners(testFullDidFive)
      )
    ).toBe(true)
  }, 90_000)
  it('Check if reclaiming from a migrated light DID to a full DID returns deposit', async () => {
    expect(await checkReclaimFullDid(keys[5].keypair, testFullDidSix)).toBe(
      true
    )
  }, 90_000)
  it('Check if removing an attestation from a migrated light DID to a full DID returns the deposit', async () => {
    expect(
      await checkRemoveFullDidAttestation(
        keys[6].keypair,
        testFullDidSeven,
        await keys[6].getSigners(testFullDidSeven),
        credential
      )
    ).toBe(true)
  }, 90_000)
  it('Check if reclaiming an attestation from a migrated light DID to a full DID returns the deposit', async () => {
    expect(
      await checkReclaimFullDidAttestation(
        keys[7].keypair,
        testFullDidEight,
        await keys[7].getSigners(testFullDidEight),
        credential
      )
    ).toBe(true)
  }, 90_000)
  it('Check if deleting a full DID and reclaiming an attestation returns the deposit', async () => {
    await checkDeletedDidReclaimAttestation(
      keys[8].keypair,
      testFullDidNine,
      await keys[8].getSigners(testFullDidNine),
      credential
    )
  }, 120_000)
  it('Check if claiming and releasing a web3 name correctly handles deposits', async () => {
    expect(
      await checkWeb3Deposit(
        keys[9].keypair,
        testFullDidTen,
        await keys[9].getSigners(testFullDidTen)
      )
    ).toBe(true)
  }, 120_000)
})

afterAll(async () => {
  await disconnect()
})
