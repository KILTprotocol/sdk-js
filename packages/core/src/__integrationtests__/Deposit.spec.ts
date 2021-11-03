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
  ISubmittableResult,
  KeyRelationship,
  KeystoreSigner,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { KeyringPair } from '@polkadot/keyring/types'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import { randomAsHex } from '@polkadot/util-crypto'
import {
  setup,
  LightActor,
  getDidDeposit,
  createAttestation,
  getAttestationDeposit,
  createMinimalFullDidFromLightDid,
  WS_ADDRESS,
  devFaucet,
  DriversLicense,
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

  const balanceBeforeDeleting = await Balance.getBalances(
    identity.address
  ).then((balance) => balance)

  console.log(
    'free balance before deleting:',
    balanceBeforeDeleting.free.toString()
  )
  console.log(
    'reserved balance before deleting:',
    balanceBeforeDeleting.reserved.toString()
  )

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

  const didBeforeDepositRemoval = await getDidDeposit(identity.address)

  console.log('There should be deposit', didBeforeDepositRemoval.toString())

  await BlockchainUtils.signAndSubmitTx(tx, identity, {
    resolveOn: BlockchainUtils.IS_FINALIZED,
  })

  const didDeposit = await getDidDeposit(identity.address)

  console.log('There should be no deposit', didDeposit.toString())

  const balanceAfterDeleting = await Balance.getBalances(identity.address).then(
    (balance) => balance
  )

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
  tx = await DidChain.getReclaimDepositExtrinsic(identity.address, 0)

  const balanceBeforeRevoking = await Balance.getBalances(
    identity.address
  ).then((balance) => balance)

  console.log('balance before Revoking', balanceBeforeRevoking.toString())

  const didDeposit = await getDidDeposit(identity.address)

  console.log('There should be deposit', didDeposit.toString())

  await BlockchainUtils.signAndSubmitTx(tx, identity, {
    resolveOn: BlockchainUtils.IS_FINALIZED,
  })

  const didAfterDepositRemoval = await getDidDeposit(identity.address)

  console.log('There should be no deposit', didAfterDepositRemoval.toString())
  const balanceAfterRevoking = await Balance.getBalances(identity.address).then(
    (balance) => balance
  )

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

  await BlockchainUtils.signAndSubmitTx(authorizedTx, identity, {
    resolveOn: BlockchainUtils.IS_FINALIZED,
  })
  const attestationDepositAfter = await getAttestationDeposit(
    attestation.claimHash
  )

  console.log(
    'There should be less deposit',
    attestationDepositAfter.toString()
  )

  const balanceAfterRemoving = await Balance.getBalances(identity.address).then(
    (balance) => balance
  )

  console.log('balance after Removing', balanceAfterRemoving.toString())

  return true
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
  console.log('balance before Reclaiming', balanceBeforeReclaiming.toString())

  tx = await attestation.reclaimDeposit()

  console.log('reclaim full attestation transaction fee:')

  const attestationDepositBefore = await getAttestationDeposit(
    attestation.claimHash
  )

  console.log('There should be deposit', attestationDepositBefore.toString())

  await BlockchainUtils.signAndSubmitTx(tx, identity, {
    resolveOn: BlockchainUtils.IS_FINALIZED,
  })
  const attestationDepositAfter = await getAttestationDeposit(
    attestation.claimHash
  )

  console.log('There should be deposit', attestationDepositAfter.toString())

  const balanceAfterDeleting = await Balance.getBalances(identity.address).then(
    (balance) => balance
  )

  console.log('balance after Deleting', balanceAfterDeleting.toString())

  return true
}

async function checkDeletedDidReclaimAttestation(
  identity: KeyringPair,
  fullDid: FullDidDetails,
  keystore: DemoKeystore,
  requestForAttestation: IRequestForAttestation
): Promise<ISubmittableResult> {
  await createAttestation(identity, requestForAttestation, fullDid, keystore)
  const balanceBeforeReclaiming = await Balance.getBalances(
    identity.address
  ).then((balance) => balance)
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

  console.log('balance before Reclaiming', balanceBeforeReclaiming.toString())

  tx = await attestation.reclaimDeposit()

  const attestationDepositBefore = await getAttestationDeposit(
    attestation.claimHash
  )

  console.log('There should be deposit', attestationDepositBefore.toString())

  return BlockchainUtils.signAndSubmitTx(tx, identity, {
    resolveOn: BlockchainUtils.IS_FINALIZED,
  })
}
let keystore: DemoKeystore
let testIdentities: KeyringPair[]
let testMnemonics: string[]
let claimer: LightActor
let requestForAttestation: RequestForAttestation

beforeAll(async () => {
  /* Initialize KILT SDK and set up node endpoint */
  await init({ address: WS_ADDRESS })
  ;({ keystore, testIdentities, testMnemonics, claimer } = await setup())
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
    claimer.light.did
  )

  requestForAttestation = RequestForAttestation.fromClaim(claim)
  await requestForAttestation.signWithDid(keystore, claimer.light)
})

describe('checking the deposits', async () => {
  it('test case one', async () => {
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
  it('test case two', async () => {
    const testDidTwo = await createOnChainDidFromSeed(
      testIdentities[1],
      keystore,
      testMnemonics[1]
    )
    if (!testDidTwo) throw new Error('Creation of Test Full Did two failed')
    expect(await checkReclaimFullDid(testIdentities[1])).resolves.toBe(true)
  })
  it('test case three', async () => {
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
  it('test case four', async () => {
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
  it('test case five', async () => {
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
  it('test case six', async () => {
    const testDidSix = await createLightDidFromSeed(keystore, testMnemonics[5])
    if (!testDidSix) throw new Error('Creation of Test Light Did six failed')

    await createMinimalFullDidFromLightDid(
      testIdentities[5],
      testDidSix,
      keystore
    )

    expect(await checkReclaimFullDid(testIdentities[5])).resolves.toBe(true)
  })
  it('test case seven', async () => {
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
  it('test case eight', async () => {
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
  it('test case nine', async () => {
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
