/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/deposit
 */

import {
  DemoKeystore,
  DemoKeystoreUtils,
  Chain as DidChain,
  FullDidDetails,
  Web3Names,
} from '@kiltprotocol/did'
import {
  IRequestForAttestation,
  KeyringPair,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { DecoderUtils, Keyring } from '@kiltprotocol/utils'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import { mnemonicGenerate } from '@polkadot/util-crypto'
import { BN } from '@polkadot/util'
import {
  createFullDidFromLightDid,
  createFullDidFromSeed,
  devFaucet,
  driversLicenseCTypeForDeposit as driversLicenseCType,
  endowAccounts,
  initializeApi,
  isCtypeOnChain,
  submitExtrinsicWithResign,
} from './utils'
import { Balance } from '../balance'
import { Attestation } from '../attestation/Attestation'
import { Claim } from '../claim/Claim'
import { RequestForAttestation } from '../requestforattestation/RequestForAttestation'
import { disconnect } from '../kilt'
import { queryRaw } from '../attestation/Attestation.chain'

let tx: SubmittableExtrinsic
let authorizedTx: SubmittableExtrinsic
let attestation: Attestation
let storedEndpointsCount: BN

async function checkDeleteFullDid(
  identity: KeyringPair,
  fullDid: FullDidDetails,
  keystore: DemoKeystore
): Promise<boolean> {
  storedEndpointsCount = await DidChain.queryEndpointsCounts(fullDid.identifier)
  const deleteDid = await DidChain.getDeleteDidExtrinsic(storedEndpointsCount)

  tx = await fullDid.authorizeExtrinsic(deleteDid, keystore, identity.address)

  const balanceBeforeDeleting = await Balance.getBalances(identity.address)

  const didResult = await DidChain.queryDetails(fullDid.identifier)
  const didDeposit = didResult!.deposit

  await submitExtrinsicWithResign(tx, identity, BlockchainUtils.IS_FINALIZED)

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

  await submitExtrinsicWithResign(tx, identity, BlockchainUtils.IS_FINALIZED)

  const balanceAfterRevoking = await Balance.getBalances(identity.address)

  return balanceBeforeRevoking.reserved
    .sub(didDeposit.amount)
    .eq(balanceAfterRevoking.reserved)
}

async function checkRemoveFullDidAttestation(
  identity: KeyringPair,
  fullDid: FullDidDetails,
  keystore: DemoKeystore,
  requestForAttestation: IRequestForAttestation
): Promise<boolean> {
  attestation = Attestation.fromRequestAndDid(
    requestForAttestation,
    fullDid.uri
  )

  tx = await attestation.getStoreTx()
  authorizedTx = await fullDid.authorizeExtrinsic(
    tx,
    keystore,
    identity.address
  )

  await submitExtrinsicWithResign(
    authorizedTx,
    identity,
    BlockchainUtils.IS_FINALIZED
  )

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

  tx = await attestation.getRemoveTx(0)
  authorizedTx = await fullDid.authorizeExtrinsic(
    tx,
    keystore,
    identity.address
  )

  await submitExtrinsicWithResign(
    authorizedTx,
    identity,
    BlockchainUtils.IS_FINALIZED
  )

  const balanceAfterRemoving = await Balance.getBalances(identity.address)

  return balanceBeforeRemoving.reserved
    .sub(attestationDeposit)
    .eq(balanceAfterRemoving.reserved)
}

async function checkReclaimFullDidAttestation(
  identity: KeyringPair,
  fullDid: FullDidDetails,
  keystore: DemoKeystore,
  requestForAttestation: IRequestForAttestation
): Promise<boolean> {
  attestation = Attestation.fromRequestAndDid(
    requestForAttestation,
    fullDid.uri
  )

  tx = await attestation.getStoreTx()
  authorizedTx = await fullDid.authorizeExtrinsic(
    tx,
    keystore,
    identity.address
  )

  await submitExtrinsicWithResign(
    authorizedTx,
    identity,
    BlockchainUtils.IS_FINALIZED
  )

  const balanceBeforeReclaiming = await Balance.getBalances(identity.address)
  attestation = Attestation.fromRequestAndDid(
    requestForAttestation,
    fullDid.uri
  )

  tx = await attestation.getReclaimDepositTx()

  const attestationResult = await queryRaw(attestation.claimHash)
  DecoderUtils.assertCodecIsType(attestationResult, [
    'Option<AttestationAttestationsAttestationDetails>',
  ])

  const attestationDeposit = attestationResult.isSome
    ? attestationResult.unwrap().deposit.amount.toBn()
    : new BN(0)

  await submitExtrinsicWithResign(tx, identity, BlockchainUtils.IS_FINALIZED)

  const balanceAfterDeleting = await Balance.getBalances(identity.address)

  return balanceBeforeReclaiming.reserved
    .sub(attestationDeposit)
    .eq(balanceAfterDeleting.reserved)
}

async function checkDeletedDidReclaimAttestation(
  identity: KeyringPair,
  fullDid: FullDidDetails,
  keystore: DemoKeystore,
  requestForAttestation: IRequestForAttestation
): Promise<void> {
  attestation = Attestation.fromRequestAndDid(
    requestForAttestation,
    fullDid.uri
  )

  tx = await attestation.getStoreTx()
  authorizedTx = await fullDid.authorizeExtrinsic(
    tx,
    keystore,
    identity.address
  )

  await submitExtrinsicWithResign(
    authorizedTx,
    identity,
    BlockchainUtils.IS_FINALIZED
  )

  storedEndpointsCount = await DidChain.queryEndpointsCounts(fullDid.identifier)

  attestation = Attestation.fromRequestAndDid(
    requestForAttestation,
    fullDid.uri
  )

  const deleteDid = await DidChain.getDeleteDidExtrinsic(storedEndpointsCount)
  tx = await fullDid.authorizeExtrinsic(deleteDid, keystore, identity.address)

  await submitExtrinsicWithResign(tx, identity, BlockchainUtils.IS_FINALIZED)

  tx = await attestation.getReclaimDepositTx()

  await submitExtrinsicWithResign(tx, identity, BlockchainUtils.IS_FINALIZED)
}

async function checkWeb3Deposit(
  identity: KeyringPair,
  fullDid: FullDidDetails,
  keystore: DemoKeystore
): Promise<boolean> {
  const web3Name = 'test-web3name'
  const balanceBeforeClaiming = await Balance.getBalances(identity.address)
  const depositAmount = await Web3Names.queryDepositAmount()

  const claimTx = await Web3Names.getClaimTx(web3Name)
  let didAuthorisedTx = await fullDid.authorizeExtrinsic(
    claimTx,
    keystore,
    identity.address
  )
  await submitExtrinsicWithResign(
    didAuthorisedTx,
    identity,
    BlockchainUtils.IS_FINALIZED
  )
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
    keystore,
    identity.address
  )
  await submitExtrinsicWithResign(
    didAuthorisedTx,
    identity,
    BlockchainUtils.IS_FINALIZED
  )
  const balanceAfterReleasing = await Balance.getBalances(identity.address)

  if (!balanceAfterReleasing.reserved.eq(balanceBeforeClaiming.reserved)) {
    return false
  }

  return true
}

const testIdentities: KeyringPair[] = []
const testMnemonics: string[] = []
const keystore = new DemoKeystore()
let requestForAttestation: RequestForAttestation

beforeAll(async () => {
  await initializeApi()
}, 30_000)

beforeAll(async () => {
  const keyring: Keyring = new Keyring({ ss58Format: 38, type: 'sr25519' })

  for (let i = 0; i < 10; i += 1) {
    testMnemonics.push(mnemonicGenerate())
  }
  /* Generating all the identities from the keyring  */
  testMnemonics.forEach((val) =>
    testIdentities.push(keyring.addFromMnemonic(val, undefined, 'sr25519'))
  ) // Sending tokens to all accounts
  const testAddresses = testIdentities.map((val) => val.address)

  await endowAccounts(devFaucet, testAddresses)
  // Create the group of mnemonics for the script
  const claimerMnemonic = mnemonicGenerate()

  /* Generating the claimerLightDid and testOneLightDid from the demo keystore with the generated seed both with sr25519 */
  const claimerLightDid = await DemoKeystoreUtils.createMinimalLightDidFromSeed(
    keystore,
    claimerMnemonic
  )

  const attester = await createFullDidFromSeed(devFaucet, keystore)

  const ctypeExists = await isCtypeOnChain(driversLicenseCType)
  if (!ctypeExists) {
    await attester
      .authorizeExtrinsic(
        await driversLicenseCType.getStoreTx(),
        keystore,
        devFaucet.address
      )
      .then((val) =>
        submitExtrinsicWithResign(val, devFaucet, BlockchainUtils.IS_IN_BLOCK)
      )
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
  await requestForAttestation.signWithDidKey(
    keystore,
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
    const [testDidFive, testDidSix, testDidSeven, testDidEight, testDidNine] =
      await Promise.all([
        DemoKeystoreUtils.createMinimalLightDidFromSeed(
          keystore,
          testMnemonics[4]
        ),
        DemoKeystoreUtils.createMinimalLightDidFromSeed(
          keystore,
          testMnemonics[5]
        ),
        DemoKeystoreUtils.createMinimalLightDidFromSeed(
          keystore,
          testMnemonics[6]
        ),
        DemoKeystoreUtils.createMinimalLightDidFromSeed(
          keystore,
          testMnemonics[7]
        ),
        DemoKeystoreUtils.createMinimalLightDidFromSeed(
          keystore,
          testMnemonics[8]
        ),
      ])

    ;[
      testFullDidOne,
      testFullDidTwo,
      testFullDidThree,
      testFullDidFour,
      testFullDidFive,
      testFullDidSix,
      testFullDidSeven,
      testFullDidEight,
      testFullDidNine,
      testFullDidTen,
    ] = await Promise.all([
      createFullDidFromSeed(testIdentities[0], keystore, testMnemonics[0]),
      createFullDidFromSeed(testIdentities[1], keystore, testMnemonics[1]),
      createFullDidFromSeed(testIdentities[2], keystore, testMnemonics[2]),
      createFullDidFromSeed(testIdentities[3], keystore, testMnemonics[3]),
      createFullDidFromLightDid(testIdentities[4], testDidFive, keystore),
      createFullDidFromLightDid(testIdentities[5], testDidSix, keystore),
      createFullDidFromLightDid(testIdentities[6], testDidSeven, keystore),
      createFullDidFromLightDid(testIdentities[7], testDidEight, keystore),
      createFullDidFromLightDid(testIdentities[8], testDidNine, keystore),
      createFullDidFromSeed(testIdentities[9], keystore, testMnemonics[9]),
    ])
  }, 240_000)

  it('Check if deleting full DID returns deposit', async () => {
    await expect(
      checkDeleteFullDid(testIdentities[0], testFullDidOne, keystore)
    ).resolves.toBe(true)
  }, 45_000)
  it('Check if reclaiming full DID returns deposit', async () => {
    await expect(
      checkReclaimFullDid(testIdentities[1], testFullDidTwo)
    ).resolves.toBe(true)
  }, 45_000)
  it('Check if removing an attestation from a full DID returns deposit', async () => {
    await expect(
      checkRemoveFullDidAttestation(
        testIdentities[2],
        testFullDidThree,
        keystore,
        requestForAttestation
      )
    ).resolves.toBe(true)
  }, 90_000)
  it('Check if reclaiming an attestation from a full DID returns the deposit', async () => {
    await expect(
      checkReclaimFullDidAttestation(
        testIdentities[3],
        testFullDidFour,
        keystore,
        requestForAttestation
      )
    ).resolves.toBe(true)
  }, 90_000)
  it('Check if deleting from a migrated light DID to a full DID returns deposit', async () => {
    await expect(
      checkDeleteFullDid(testIdentities[4], testFullDidFive, keystore)
    ).resolves.toBe(true)
  }, 90_000)
  it('Check if reclaiming from a migrated light DID to a full DID returns deposit', async () => {
    await expect(
      checkReclaimFullDid(testIdentities[5], testFullDidSix)
    ).resolves.toBe(true)
  }, 90_000)
  it('Check if removing an attestation from a migrated light DID to a full DID returns the deposit', async () => {
    await expect(
      checkRemoveFullDidAttestation(
        testIdentities[6],
        testFullDidSeven,
        keystore,
        requestForAttestation
      )
    ).resolves.toBe(true)
  }, 90_000)
  it('Check if reclaiming an attestation from a migrated light DID to a full DID returns the deposit', async () => {
    await expect(
      checkReclaimFullDidAttestation(
        testIdentities[7],
        testFullDidEight,
        keystore,
        requestForAttestation
      )
    ).resolves.toBe(true)
  }, 90_000)
  it('Check if deleting a full DID and reclaiming an attestation returns the deposit', async () => {
    await expect(
      checkDeletedDidReclaimAttestation(
        testIdentities[8],
        testFullDidNine,
        keystore,
        requestForAttestation
      )
    ).resolves.not.toThrow()
  }, 120_000)
  it('Check if claiming and releasing a web3 name correctly handles deposits', async () => {
    await expect(
      checkWeb3Deposit(testIdentities[9], testFullDidTen, keystore)
    ).resolves.toBeTruthy()
  }, 120_000)
})

afterAll(() => {
  disconnect()
})
