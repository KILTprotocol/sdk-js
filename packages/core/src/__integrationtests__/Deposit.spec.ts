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
} from '@kiltprotocol/did'
import {
  IRequestForAttestation,
  KeyRelationship,
  KeystoreSigner,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { Keyring } from '@kiltprotocol/utils'
import { KeyringPair } from '@polkadot/keyring/types'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import { mnemonicGenerate, randomAsHex } from '@polkadot/util-crypto'
import {
  getDidDeposit,
  createAttestation,
  getAttestationDeposit,
  createMinimalFullDidFromLightDid,
  WS_ADDRESS,
  devFaucet,
  DriversLicense,
  initialTransfer,
} from './utils'
import { Balance } from '../balance'
import Attestation from '../attestation/Attestation'
import Claim from '../claim/Claim'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import { disconnect, init } from '../kilt'

let tx: SubmittableExtrinsic
let authorizedTx: SubmittableExtrinsic

async function checkDeleteFullDid(
  identity: KeyringPair,
  fullDid: FullDidDetails,
  keystore: DemoKeystore
): Promise<boolean> {
  const deleteDid = await DidChain.getDeleteDidExtrinsic(0)

  tx = await DidChain.generateDidAuthenticatedTx({
    didIdentifier: identity.address,
    txCounter: fullDid.getNextTxIndex(),
    call: deleteDid,
    signer: keystore as KeystoreSigner<string>,
    signingPublicKey: fullDid.getKeys(KeyRelationship.authentication)[0]
      .publicKeyHex,
    alg: fullDid.getKeys(KeyRelationship.authentication)[0].type,
    submitter: identity.address,
  })

  const balanceBeforeDeleting = await Balance.getBalances(
    identity.address
  ).then((balance) => balance)
  const didDeposit = await getDidDeposit(identity.address)

  await BlockchainUtils.signAndSubmitTx(tx, identity, {
    resolveOn: BlockchainUtils.IS_FINALIZED,
  })

  const balanceAfterDeleting = await Balance.getBalances(identity.address).then(
    (balance) => balance
  )

  if (
    balanceBeforeDeleting.reserved.toNumber() - didDeposit.toNumber() ===
    balanceAfterDeleting.reserved.toNumber()
  ) {
    return true
  }
  return false
}

async function checkReclaimFullDid(identity: KeyringPair): Promise<boolean> {
  tx = await DidChain.getReclaimDepositExtrinsic(identity.address, 0)

  const balanceBeforeRevoking = await Balance.getBalances(
    identity.address
  ).then((balance) => balance)

  const didDeposit = await getDidDeposit(identity.address)

  await BlockchainUtils.signAndSubmitTx(tx, identity, {
    resolveOn: BlockchainUtils.IS_FINALIZED,
  })

  const balanceAfterRevoking = await Balance.getBalances(identity.address).then(
    (balance) => balance
  )

  if (
    balanceBeforeRevoking.reserved.toNumber() - didDeposit.toNumber() ===
    balanceAfterRevoking.reserved.toNumber()
  ) {
    return true
  }
  return false
}

async function checkRemoveFullDidAttestation(
  identity: KeyringPair,
  fullDid: FullDidDetails,
  keystore: DemoKeystore,
  requestForAttestation: IRequestForAttestation
): Promise<boolean> {
  await createAttestation(identity, requestForAttestation, fullDid, keystore)
  const balanceBeforeRemoving = await Balance.getBalances(
    identity.address
  ).then((balance) => balance)
  const attestation = Attestation.fromRequestAndDid(
    requestForAttestation,
    fullDid.did
  )

  tx = await attestation.remove(0)
  authorizedTx = await fullDid.authorizeExtrinsic(
    tx,
    keystore,
    identity.address
  )

  const attestationDeposit = await getAttestationDeposit(attestation.claimHash)

  await BlockchainUtils.signAndSubmitTx(authorizedTx, identity, {
    resolveOn: BlockchainUtils.IS_FINALIZED,
  })

  const balanceAfterRemoving = await Balance.getBalances(identity.address).then(
    (balance) => balance
  )

  if (
    balanceBeforeRemoving.reserved.toNumber() -
      attestationDeposit.toNumber() ===
    balanceAfterRemoving.reserved.toNumber()
  ) {
    return true
  }
  return false
}

async function checkReclaimFullDidAttestation(
  identity: KeyringPair,
  fullDid: FullDidDetails,
  keystore: DemoKeystore,
  requestForAttestation: IRequestForAttestation
): Promise<boolean> {
  await createAttestation(identity, requestForAttestation, fullDid, keystore)
  const balanceBeforeReclaiming = await Balance.getBalances(
    identity.address
  ).then((balance) => balance)
  const attestation = Attestation.fromRequestAndDid(
    requestForAttestation,
    fullDid.did
  )

  tx = await attestation.reclaimDeposit()

  const attestationDeposit = await getAttestationDeposit(attestation.claimHash)

  await BlockchainUtils.signAndSubmitTx(tx, identity, {
    resolveOn: BlockchainUtils.IS_FINALIZED,
  })

  const balanceAfterDeleting = await Balance.getBalances(identity.address).then(
    (balance) => balance
  )

  if (
    balanceBeforeReclaiming.reserved.toNumber() -
      attestationDeposit.toNumber() ===
    balanceAfterDeleting.reserved.toNumber()
  ) {
    return true
  }
  return false
}

async function checkDeletedDidReclaimAttestation(
  identity: KeyringPair,
  fullDid: FullDidDetails,
  keystore: DemoKeystore,
  requestForAttestation: IRequestForAttestation
): Promise<boolean> {
  await createAttestation(identity, requestForAttestation, fullDid, keystore)
  const balanceBefore = await Balance.getBalances(identity.address).then(
    (balance) => balance
  )

  const attestation = Attestation.fromRequestAndDid(
    requestForAttestation,
    fullDid.did
  )

  const deleteDid = await DidChain.getDeleteDidExtrinsic(0)

  tx = await DidChain.generateDidAuthenticatedTx({
    didIdentifier: identity.address,
    txCounter: fullDid.getNextTxIndex(),
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

  tx = await attestation.reclaimDeposit()

  const attestationDeposit = await getAttestationDeposit(attestation.claimHash)

  await BlockchainUtils.signAndSubmitTx(tx, identity, {
    resolveOn: BlockchainUtils.IS_FINALIZED,
  })

  const balanceAfter = await Balance.getBalances(identity.address).then(
    (balance) => balance
  )

  if (
    balanceBefore.reserved.toNumber() - attestationDeposit.toNumber() ===
    balanceAfter.reserved.toNumber()
  ) {
    return true
  }
  return false
}

const testIdentities: KeyringPair[] = []
const testMnemonics: string[] = []
const keystore = new DemoKeystore()
let requestForAttestation: RequestForAttestation

beforeAll(async () => {
  /* Initialize KILT SDK and set up node endpoint */
  await init({ address: WS_ADDRESS })
  const keyring: Keyring = new Keyring({ ss58Format: 38, type: 'ed25519' })

  for (let i = 0; i < 9; i += 1) {
    testMnemonics.push(mnemonicGenerate())
  }
  /* Generating all the identities from the keyring  */
  testMnemonics.forEach((val) =>
    testIdentities.push(keyring.addFromMnemonic(val))
  ) // Sending tokens to all accounts
  const testAddresses = testIdentities.map((val) => val.address)

  await initialTransfer(devFaucet, testAddresses)
  // Initialize the demo keystore
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
  tx = await DriversLicense.store()
  authorizedTx = await attester.authorizeExtrinsic(
    tx,
    keystore,
    devFaucet.address
  )
  await BlockchainUtils.signAndSubmitTx(authorizedTx, devFaucet)
  await DriversLicense.verifyStored()

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
})

describe('checking the deposits', async () => {
  it('Check if deleting full DID returns deposit', async () => {
    const testDidOne = await createOnChainDidFromSeed(
      testIdentities[0],
      keystore,
      testMnemonics[0]
    )
    if (!testDidOne) throw new Error('Creation of Test Full Did one failed')

    expect(
      await checkDeleteFullDid(testIdentities[0], testDidOne, keystore)
    ).resolves.toBe(true)
  })
  it('Check if reclaiming full DID returns deposit', async () => {
    const testDidTwo = await createOnChainDidFromSeed(
      testIdentities[1],
      keystore,
      testMnemonics[1]
    )
    if (!testDidTwo) throw new Error('Creation of Test Full Did two failed')
    expect(await checkReclaimFullDid(testIdentities[1])).resolves.toBe(true)
  })
  it('Check if removing an attestation from a full DID returns deposit', async () => {
    const testDidThree = await createOnChainDidFromSeed(
      testIdentities[2],
      keystore,
      testMnemonics[2]
    )
    if (!testDidThree) throw new Error('Creation of Test Full Did three failed')

    expect(
      await checkRemoveFullDidAttestation(
        testIdentities[2],
        testDidThree,
        keystore,
        requestForAttestation
      )
    ).resolves.toBe(true)
  })
  it('Check if reclaiming an attestation from a full DID returns the deposit', async () => {
    const testDidFour = await createOnChainDidFromSeed(
      testIdentities[3],
      keystore,
      testMnemonics[3]
    )
    if (!testDidFour) throw new Error('Creation of Test Full Did four failed')

    expect(
      await checkReclaimFullDidAttestation(
        testIdentities[3],
        testDidFour,
        keystore,
        requestForAttestation
      )
    ).resolves.toBe(true)
  })
  it('Check if deleting from a migrated a light DID to a full DID returns deposit', async () => {
    const testDidFive = await createLightDidFromSeed(keystore, testMnemonics[4])

    if (!testDidFive) throw new Error('Creation of Test Light Did five failed')
    const testFullDidFive = await createMinimalFullDidFromLightDid(
      testIdentities[4],
      testDidFive,
      keystore
    )

    expect(
      await checkDeleteFullDid(testIdentities[4], testFullDidFive, keystore)
    ).resolves.toBe(true)
  })
  it('Check if reclaiming from a migrated a light DID to a full DID returns deposit', async () => {
    const testDidSix = await createLightDidFromSeed(keystore, testMnemonics[5])
    if (!testDidSix) throw new Error('Creation of Test Light Did six failed')

    await createMinimalFullDidFromLightDid(
      testIdentities[5],
      testDidSix,
      keystore
    )

    expect(await checkReclaimFullDid(testIdentities[5])).resolves.toBe(true)
  })
  it('Check if removing an attestation from a migrated a light DID to a full DID returns the deposit', async () => {
    const testDidSeven = await createLightDidFromSeed(
      keystore,
      testMnemonics[6]
    )
    if (!testDidSeven)
      throw new Error('Creation of Test Light Did seven failed')
    const testFullDidSeven = await createMinimalFullDidFromLightDid(
      testIdentities[6],
      testDidSeven,
      keystore
    )

    expect(
      await checkRemoveFullDidAttestation(
        testIdentities[6],
        testFullDidSeven,
        keystore,
        requestForAttestation
      )
    ).resolves.toBe(true)
  })
  it('Check if reclaiming an attestation from a migrated a light DID to a full DID returns the deposit', async () => {
    const testDidEight = await createLightDidFromSeed(
      keystore,
      testMnemonics[7]
    )
    if (!testDidEight)
      throw new Error('Creation of Test Light Did eight failed')

    const testFullDidEight = await createMinimalFullDidFromLightDid(
      testIdentities[7],
      testDidEight,
      keystore
    )

    expect(
      await checkReclaimFullDidAttestation(
        testIdentities[7],
        testFullDidEight,
        keystore,
        requestForAttestation
      )
    ).resolves.toBe(true)
  })
  it('Check if deleting a full DID and reclaiming an attestation returns the deposit', async () => {
    const testDidNine = await createLightDidFromSeed(keystore, testMnemonics[8])
    if (!testDidNine) throw new Error('Creation of Test Light Did Nine failed')

    const testFullDidNine = await createMinimalFullDidFromLightDid(
      testIdentities[8],
      testDidNine,
      keystore
    )
    expect(
      await checkDeletedDidReclaimAttestation(
        testIdentities[8],
        testFullDidNine,
        keystore,
        requestForAttestation
      )
    ).resolves.toBe(true)
  })
})

afterAll(() => {
  disconnect()
})
