/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/deposit
 */

import { Chain as DidChain, FullDidDetails, Web3Names } from '@kiltprotocol/did'
import {
  createFullDidFromLightDid,
  createFullDidFromSeed,
  createMinimalLightDidFromKeypair,
  KeyTool,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import {
  IAttestation,
  IRequestForAttestation,
  KeyringPair,
  SignCallback,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { DecoderUtils } from '@kiltprotocol/utils'
import { Blockchain } from '@kiltprotocol/chain-helpers'
import { BN } from '@polkadot/util'
import {
  devFaucet,
  driversLicenseCTypeForDeposit as driversLicenseCType,
  endowAccounts,
  initializeApi,
  isCtypeOnChain,
  submitExtrinsic,
} from './utils'
import { Balance } from '../balance'
import * as Attestation from '../attestation'
import * as Claim from '../claim'
import * as RequestForAttestation from '../requestforattestation'
import { disconnect } from '../kilt'
import { queryRaw } from '../attestation/Attestation.chain'
import * as CType from '../ctype'

let tx: SubmittableExtrinsic
let authorizedTx: SubmittableExtrinsic
let attestation: IAttestation
let storedEndpointsCount: BN

async function checkDeleteFullDid(
  identity: KeyringPair,
  fullDid: FullDidDetails,
  sign: SignCallback
): Promise<boolean> {
  storedEndpointsCount = await DidChain.queryEndpointsCounts(fullDid.identifier)
  const deleteDid = await DidChain.getDeleteDidExtrinsic(storedEndpointsCount)

  tx = await fullDid.authorizeExtrinsic(deleteDid, sign, identity.address)

  const balanceBeforeDeleting = await Balance.getBalances(identity.address)

  const didResult = await DidChain.queryDetails(fullDid.identifier)
  const didDeposit = didResult!.deposit

  await submitExtrinsic(tx, identity, Blockchain.IS_FINALIZED)

  const balanceAfterDeleting = await Balance.getBalances(identity.address)

  return balanceBeforeDeleting.reserved
    .sub(didDeposit.amount)
    .eq(balanceAfterDeleting.reserved)
}

async function checkReclaimFullDid(
  identity: KeyringPair,
  fullDid: FullDidDetails
): Promise<boolean> {
  storedEndpointsCount = await DidChain.queryEndpointsCounts(fullDid.identifier)
  tx = await DidChain.getReclaimDepositExtrinsic(
    fullDid.identifier,
    storedEndpointsCount
  )

  const balanceBeforeRevoking = await Balance.getBalances(identity.address)

  const didResult = await DidChain.queryDetails(fullDid.identifier)
  const didDeposit = didResult!.deposit

  await submitExtrinsic(tx, identity, Blockchain.IS_FINALIZED)

  const balanceAfterRevoking = await Balance.getBalances(identity.address)

  return balanceBeforeRevoking.reserved
    .sub(didDeposit.amount)
    .eq(balanceAfterRevoking.reserved)
}

async function checkRemoveFullDidAttestation(
  identity: KeyringPair,
  fullDid: FullDidDetails,
  sign: SignCallback,
  requestForAttestation: IRequestForAttestation
): Promise<boolean> {
  attestation = Attestation.fromRequestAndDid(
    requestForAttestation,
    fullDid.uri
  )

  tx = await Attestation.getStoreTx(attestation)
  authorizedTx = await fullDid.authorizeExtrinsic(tx, sign, identity.address)

  await submitExtrinsic(authorizedTx, identity, Blockchain.IS_FINALIZED)

  const attestationResult = await queryRaw(attestation.claimHash)
  DecoderUtils.assertCodecIsType(attestationResult, [
    'Option<AttestationAttestationsAttestationDetails>',
  ])

  const attestationDeposit = attestationResult.isSome
    ? attestationResult.unwrap().deposit.amount.toBn()
    : new BN(0)

  const balanceBeforeRemoving = await Balance.getBalances(identity.address)
  attestation = Attestation.fromRequestAndDid(
    requestForAttestation,
    fullDid.uri
  )

  tx = await Attestation.getRemoveTx(attestation.claimHash, 0)
  authorizedTx = await fullDid.authorizeExtrinsic(tx, sign, identity.address)

  await submitExtrinsic(authorizedTx, identity, Blockchain.IS_FINALIZED)

  const balanceAfterRemoving = await Balance.getBalances(identity.address)

  return balanceBeforeRemoving.reserved
    .sub(attestationDeposit)
    .eq(balanceAfterRemoving.reserved)
}

async function checkReclaimFullDidAttestation(
  identity: KeyringPair,
  fullDid: FullDidDetails,
  sign: SignCallback,
  requestForAttestation: IRequestForAttestation
): Promise<boolean> {
  attestation = Attestation.fromRequestAndDid(
    requestForAttestation,
    fullDid.uri
  )

  tx = await Attestation.getStoreTx(attestation)
  authorizedTx = await fullDid.authorizeExtrinsic(tx, sign, identity.address)

  await submitExtrinsic(authorizedTx, identity, Blockchain.IS_FINALIZED)

  const balanceBeforeReclaiming = await Balance.getBalances(identity.address)
  attestation = Attestation.fromRequestAndDid(
    requestForAttestation,
    fullDid.uri
  )

  tx = await Attestation.getReclaimDepositTx(attestation.claimHash)

  const attestationResult = await queryRaw(attestation.claimHash)
  DecoderUtils.assertCodecIsType(attestationResult, [
    'Option<AttestationAttestationsAttestationDetails>',
  ])

  const attestationDeposit = attestationResult.isSome
    ? attestationResult.unwrap().deposit.amount.toBn()
    : new BN(0)

  await submitExtrinsic(tx, identity, Blockchain.IS_FINALIZED)

  const balanceAfterDeleting = await Balance.getBalances(identity.address)

  return balanceBeforeReclaiming.reserved
    .sub(attestationDeposit)
    .eq(balanceAfterDeleting.reserved)
}

async function checkDeletedDidReclaimAttestation(
  identity: KeyringPair,
  fullDid: FullDidDetails,
  sign: SignCallback,
  requestForAttestation: IRequestForAttestation
): Promise<void> {
  attestation = Attestation.fromRequestAndDid(
    requestForAttestation,
    fullDid.uri
  )

  tx = await Attestation.getStoreTx(attestation)
  authorizedTx = await fullDid.authorizeExtrinsic(tx, sign, identity.address)

  await submitExtrinsic(authorizedTx, identity, Blockchain.IS_FINALIZED)

  storedEndpointsCount = await DidChain.queryEndpointsCounts(fullDid.identifier)

  attestation = Attestation.fromRequestAndDid(
    requestForAttestation,
    fullDid.uri
  )

  const deleteDid = await DidChain.getDeleteDidExtrinsic(storedEndpointsCount)
  tx = await fullDid.authorizeExtrinsic(deleteDid, sign, identity.address)

  await submitExtrinsic(tx, identity, Blockchain.IS_FINALIZED)

  tx = await Attestation.getReclaimDepositTx(attestation.claimHash)

  await submitExtrinsic(tx, identity, Blockchain.IS_FINALIZED)
}

async function checkWeb3Deposit(
  identity: KeyringPair,
  fullDid: FullDidDetails,
  sign: SignCallback
): Promise<boolean> {
  const web3Name = 'test-web3name'
  const balanceBeforeClaiming = await Balance.getBalances(identity.address)
  const depositAmount = await Web3Names.queryDepositAmount()

  const claimTx = await Web3Names.getClaimTx(web3Name)
  let didAuthorisedTx = await fullDid.authorizeExtrinsic(
    claimTx,
    sign,
    identity.address
  )
  await submitExtrinsic(didAuthorisedTx, identity, Blockchain.IS_FINALIZED)
  const balanceAfterClaiming = await Balance.getBalances(identity.address)
  if (
    !balanceAfterClaiming.reserved
      .sub(balanceBeforeClaiming.reserved)
      .eq(depositAmount)
  ) {
    return false
  }

  const releaseTx = await Web3Names.getReleaseByOwnerTx()
  didAuthorisedTx = await fullDid.authorizeExtrinsic(
    releaseTx,
    sign,
    identity.address
  )
  await submitExtrinsic(didAuthorisedTx, identity, Blockchain.IS_FINALIZED)
  const balanceAfterReleasing = await Balance.getBalances(identity.address)

  if (!balanceAfterReleasing.reserved.eq(balanceBeforeClaiming.reserved)) {
    return false
  }

  return true
}

let keys: KeyTool[]
let requestForAttestation: IRequestForAttestation

beforeAll(async () => {
  await initializeApi()
}, 30_000)

beforeAll(async () => {
  keys = new Array(10).fill(0).map(() => makeSigningKeyTool())

  const testAddresses = keys.map((val) => val.keypair.address)

  await endowAccounts(devFaucet, testAddresses)

  const claimer = makeSigningKeyTool()
  const claimerLightDid = await createMinimalLightDidFromKeypair(
    claimer.keypair
  )

  const attesterKey = makeSigningKeyTool()
  const attester = await createFullDidFromSeed(devFaucet, attesterKey.keypair)

  const ctypeExists = await isCtypeOnChain(driversLicenseCType)
  if (!ctypeExists) {
    const extrinsic = await attester.authorizeExtrinsic(
      await CType.getStoreTx(driversLicenseCType),
      attesterKey.sign,
      devFaucet.address
    )
    await submitExtrinsic(extrinsic, devFaucet, Blockchain.IS_IN_BLOCK)
  }

  const rawClaim = {
    name: 'claimer',
    age: 69,
  }

  const claim = Claim.fromCTypeAndClaimContents(
    driversLicenseCType,
    rawClaim,
    claimerLightDid.uri
  )

  requestForAttestation = RequestForAttestation.fromClaim(claim)
  await RequestForAttestation.signWithDidKey(
    requestForAttestation,
    claimer.sign,
    claimerLightDid,
    claimerLightDid.authenticationKey.id
  )
}, 120_000)

describe('Different deposits scenarios', () => {
  let testFullDidOne: FullDidDetails
  let testFullDidTwo: FullDidDetails
  let testFullDidThree: FullDidDetails
  let testFullDidFour: FullDidDetails
  let testFullDidFive: FullDidDetails
  let testFullDidSix: FullDidDetails
  let testFullDidSeven: FullDidDetails
  let testFullDidEight: FullDidDetails
  let testFullDidNine: FullDidDetails
  let testFullDidTen: FullDidDetails

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
      keys[4].sign
    )
    testFullDidSix = await createFullDidFromLightDid(
      keys[5].keypair,
      testDidSix,
      keys[5].sign
    )
    testFullDidSeven = await createFullDidFromLightDid(
      keys[6].keypair,
      testDidSeven,
      keys[6].sign
    )
    testFullDidEight = await createFullDidFromLightDid(
      keys[7].keypair,
      testDidEight,
      keys[7].sign
    )
    testFullDidNine = await createFullDidFromLightDid(
      keys[8].keypair,
      testDidNine,
      keys[8].sign
    )
    testFullDidTen = await createFullDidFromSeed(
      keys[9].keypair,
      keys[9].keypair
    )
  }, 240_000)

  it('Check if deleting full DID returns deposit', async () => {
    expect(
      await checkDeleteFullDid(keys[0].keypair, testFullDidOne, keys[0].sign)
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
        keys[2].sign,
        requestForAttestation
      )
    ).toBe(true)
  }, 90_000)
  it('Check if reclaiming an attestation from a full DID returns the deposit', async () => {
    expect(
      await checkReclaimFullDidAttestation(
        keys[3].keypair,
        testFullDidFour,
        keys[3].sign,
        requestForAttestation
      )
    ).toBe(true)
  }, 90_000)
  it('Check if deleting from a migrated light DID to a full DID returns deposit', async () => {
    expect(
      await checkDeleteFullDid(keys[4].keypair, testFullDidFive, keys[4].sign)
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
        keys[6].sign,
        requestForAttestation
      )
    ).toBe(true)
  }, 90_000)
  it('Check if reclaiming an attestation from a migrated light DID to a full DID returns the deposit', async () => {
    expect(
      await checkReclaimFullDidAttestation(
        keys[7].keypair,
        testFullDidEight,
        keys[7].sign,
        requestForAttestation
      )
    ).toBe(true)
  }, 90_000)
  it('Check if deleting a full DID and reclaiming an attestation returns the deposit', async () => {
    await checkDeletedDidReclaimAttestation(
      keys[8].keypair,
      testFullDidNine,
      keys[8].sign,
      requestForAttestation
    )
  }, 120_000)
  it('Check if claiming and releasing a web3 name correctly handles deposits', async () => {
    expect(
      await checkWeb3Deposit(keys[9].keypair, testFullDidTen, keys[9].sign)
    ).toBeTruthy()
  }, 120_000)
})

afterAll(async () => {
  await disconnect()
})
