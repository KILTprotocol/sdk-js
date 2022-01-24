/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/deposit
 */

import {
  createLightDidFromSeed,
  createOnChainDidFromSeed,
  DemoKeystore,
  DidChain,
  FullDidDetails,
  SigningAlgorithms,
} from '@kiltprotocol/did'
import {
  IRequestForAttestation,
  KeyRelationship,
  KeyringPair,
  KeystoreSigner,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { DecoderUtils, Keyring } from '@kiltprotocol/utils'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import { mnemonicGenerate, randomAsHex } from '@polkadot/util-crypto'
import { BN } from '@polkadot/util'
import {
  createMinimalFullDidFromLightDid,
  WS_ADDRESS,
  devFaucet,
  DriversLicense,
  endowAccounts,
  CtypeOnChain,
} from './utils'
import { Balance } from '../balance'
import { Attestation } from '../attestation/Attestation'
import { Claim } from '../claim/Claim'
import { RequestForAttestation } from '../requestforattestation/RequestForAttestation'
import { disconnect, init } from '../kilt'
import { queryRaw } from '../attestation/Attestation.chain'

let tx: SubmittableExtrinsic
let authorizedTx: SubmittableExtrinsic
let attestation: Attestation
let storedEndpointsCount: number

async function checkDeleteFullDid(
  identity: KeyringPair,
  fullDid: FullDidDetails,
  keystore: DemoKeystore
): Promise<boolean> {
  storedEndpointsCount = await DidChain.queryEndpointsCounts(fullDid.did)
  const deleteDid = await DidChain.getDeleteDidExtrinsic(storedEndpointsCount)

  const refreshedTxIndex = await fullDid.refreshTxIndex()

  tx = await DidChain.generateDidAuthenticatedTx({
    didIdentifier: identity.address,
    txCounter: refreshedTxIndex.getNextTxIndex(),
    call: deleteDid,
    signer: keystore as KeystoreSigner<string>,
    signingPublicKey: fullDid.getKeys(KeyRelationship.authentication)[0]
      .publicKeyHex,
    alg: fullDid.getKeys(KeyRelationship.authentication)[0].type,
    submitter: identity.address,
  })

  const balanceBeforeDeleting = await Balance.getBalances(identity.address)

  const didResult = await DidChain.queryDidEncoded(identity.address)
  DecoderUtils.assertCodecIsType(didResult, ['Option<DidDidDetails>'])
  const didDeposit = didResult.isSome
    ? didResult.unwrap().deposit.amount.toBn()
    : new BN(0)

  await BlockchainUtils.signAndSubmitTx(tx, identity, {
    resolveOn: BlockchainUtils.IS_FINALIZED,
  })

  const balanceAfterDeleting = await Balance.getBalances(identity.address)

  return balanceBeforeDeleting.reserved
    .sub(didDeposit)
    .eq(balanceAfterDeleting.reserved)
}

async function checkReclaimFullDid(
  identity: KeyringPair,
  fullDid: FullDidDetails
): Promise<boolean> {
  storedEndpointsCount = await DidChain.queryEndpointsCounts(fullDid.did)
  tx = await DidChain.getgetReclaimDepositTxExtrinsic(
    identity.address,
    storedEndpointsCount
  )

  const balanceBeforeRevoking = await Balance.getBalances(identity.address)

  const didResult = await DidChain.queryDidEncoded(identity.address)
  DecoderUtils.assertCodecIsType(didResult, ['Option<DidDidDetails>'])
  const didDeposit = didResult.isSome
    ? didResult.unwrap().deposit.amount.toBn()
    : new BN(0)

  await BlockchainUtils.signAndSubmitTx(tx, identity, {
    resolveOn: BlockchainUtils.IS_FINALIZED,
  })

  const balanceAfterRevoking = await Balance.getBalances(identity.address)

  return balanceBeforeRevoking.reserved
    .sub(didDeposit)
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
    fullDid.did
  )

  tx = await attestation.store()
  authorizedTx = await fullDid.authorizeExtrinsic(
    tx,
    keystore,
    identity.address
  )

  await BlockchainUtils.signAndSubmitTx(authorizedTx, identity, {
    resolveOn: BlockchainUtils.IS_FINALIZED,
  })

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
    fullDid.did
  )

  tx = await attestation.remove(0)
  authorizedTx = await fullDid.authorizeExtrinsic(
    tx,
    keystore,
    identity.address
  )

  await BlockchainUtils.signAndSubmitTx(authorizedTx, identity, {
    resolveOn: BlockchainUtils.IS_FINALIZED,
  })

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
    fullDid.did
  )

  tx = await attestation.store()
  authorizedTx = await fullDid.authorizeExtrinsic(
    tx,
    keystore,
    identity.address
  )

  await BlockchainUtils.signAndSubmitTx(authorizedTx, identity, {
    resolveOn: BlockchainUtils.IS_FINALIZED,
  })

  const balanceBeforeReclaiming = await Balance.getBalances(identity.address)
  attestation = Attestation.fromRequestAndDid(
    requestForAttestation,
    fullDid.did
  )

  tx = await attestation.getReclaimDepositTx()

  const attestationResult = await queryRaw(attestation.claimHash)
  DecoderUtils.assertCodecIsType(attestationResult, [
    'Option<AttestationAttestationsAttestationDetails>',
  ])

  const attestationDeposit = attestationResult.isSome
    ? attestationResult.unwrap().deposit.amount.toBn()
    : new BN(0)

  await BlockchainUtils.signAndSubmitTx(tx, identity, {
    resolveOn: BlockchainUtils.IS_FINALIZED,
  })

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
    fullDid.did
  )

  tx = await attestation.store()
  authorizedTx = await fullDid.authorizeExtrinsic(
    tx,
    keystore,
    identity.address
  )

  await BlockchainUtils.signAndSubmitTx(authorizedTx, identity, {
    resolveOn: BlockchainUtils.IS_FINALIZED,
  })

  storedEndpointsCount = await DidChain.queryEndpointsCounts(fullDid.did)

  attestation = Attestation.fromRequestAndDid(
    requestForAttestation,
    fullDid.did
  )

  const deleteDid = await DidChain.getDeleteDidExtrinsic(storedEndpointsCount)
  const refreshedTxIndex = await fullDid.refreshTxIndex()

  tx = await DidChain.generateDidAuthenticatedTx({
    didIdentifier: identity.address,
    txCounter: refreshedTxIndex.getNextTxIndex(),
    call: deleteDid,
    signer: keystore as KeystoreSigner<string>,
    signingPublicKey: fullDid.getKeys(KeyRelationship.authentication)[0]
      .publicKeyHex,
    alg: fullDid.getKeys(KeyRelationship.authentication)[0].type,
    submitter: identity.address,
  })

  await BlockchainUtils.signAndSubmitTx(tx, identity, {
    resolveOn: BlockchainUtils.IS_FINALIZED,
  })

  tx = await attestation.getReclaimDepositTx()

  await BlockchainUtils.signAndSubmitTx(tx, identity, {
    resolveOn: BlockchainUtils.IS_FINALIZED,
  })
}

const testIdentities: KeyringPair[] = []
const testMnemonics: string[] = []
const keystore = new DemoKeystore()
let requestForAttestation: RequestForAttestation

beforeAll(async () => {
  /* Initialize KILT SDK and set up node endpoint */
  await init({ address: WS_ADDRESS })
  const keyring: Keyring = new Keyring({ ss58Format: 38, type: 'sr25519' })

  for (let i = 0; i < 9; i += 1) {
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
  const claimerLightDid = await createLightDidFromSeed(
    keystore,
    claimerMnemonic
  )

  const attester = await createOnChainDidFromSeed(
    devFaucet,
    keystore,
    randomAsHex()
  )

  const ctypeExists = await CtypeOnChain(DriversLicense)
  if (!ctypeExists) {
    await attester
      .authorizeExtrinsic(
        await DriversLicense.store(),
        keystore,
        devFaucet.address
      )
      .then((val) =>
        BlockchainUtils.signAndSubmitTx(val, devFaucet, {
          resolveOn: BlockchainUtils.IS_IN_BLOCK,
          reSign: true,
        })
      )
  }

  const rawClaim = {
    name: 'claimer',
    age: 69,
  }

  const claim = Claim.fromCTypeAndClaimContents(
    DriversLicense,
    rawClaim,
    claimerLightDid.did
  )

  requestForAttestation = RequestForAttestation.fromClaim(claim)
  await requestForAttestation.signWithDid(keystore, claimerLightDid)
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
  beforeAll(async () => {
    const [testDidFive, testDidSix, testDidSeven, testDidEight, testDidNine] =
      await Promise.all([
        createLightDidFromSeed(
          keystore,
          testMnemonics[4],
          SigningAlgorithms.Sr25519
        ),
        createLightDidFromSeed(
          keystore,
          testMnemonics[5],
          SigningAlgorithms.Sr25519
        ),
        createLightDidFromSeed(
          keystore,
          testMnemonics[6],
          SigningAlgorithms.Sr25519
        ),
        createLightDidFromSeed(
          keystore,
          testMnemonics[7],
          SigningAlgorithms.Sr25519
        ),
        createLightDidFromSeed(
          keystore,
          testMnemonics[8],
          SigningAlgorithms.Sr25519
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
    ] = await Promise.all([
      createOnChainDidFromSeed(
        testIdentities[0],
        keystore,
        testMnemonics[0],
        SigningAlgorithms.Sr25519
      ),
      createOnChainDidFromSeed(
        testIdentities[1],
        keystore,
        testMnemonics[1],
        SigningAlgorithms.Sr25519
      ),
      createOnChainDidFromSeed(
        testIdentities[2],
        keystore,
        testMnemonics[2],
        SigningAlgorithms.Sr25519
      ),
      createOnChainDidFromSeed(
        testIdentities[3],
        keystore,
        testMnemonics[3],
        SigningAlgorithms.Sr25519
      ),
      createMinimalFullDidFromLightDid(
        testIdentities[4],
        testDidFive,
        keystore
      ),
      createMinimalFullDidFromLightDid(testIdentities[5], testDidSix, keystore),
      createMinimalFullDidFromLightDid(
        testIdentities[6],
        testDidSeven,
        keystore
      ),
      createMinimalFullDidFromLightDid(
        testIdentities[7],
        testDidEight,
        keystore
      ),
      createMinimalFullDidFromLightDid(
        testIdentities[8],
        testDidNine,
        keystore
      ),
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
})

afterAll(() => {
  disconnect()
})
